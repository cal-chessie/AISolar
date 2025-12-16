import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecretKey) {
    console.error("Stripe secret key not configured");
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    // If webhook secret is configured, verify signature
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // For development, parse the event directly
      event = JSON.parse(body);
      console.log("Warning: Webhook signature not verified (development mode)");
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  console.log(`Processing webhook event: ${event.type}`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { invoice_id, payment_type } = session.metadata || {};

    if (!invoice_id || !payment_type) {
      console.error("Missing metadata in checkout session");
      return new Response(JSON.stringify({ error: "Missing metadata" }), { status: 400 });
    }

    console.log(`Payment completed: ${payment_type} for invoice ${invoice_id}`);

    try {
      // Get lead_id for email notification
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("lead_id, total_amount, deposit_amount")
        .eq("id", invoice_id)
        .single();

      if (payment_type === "deposit") {
        const { error } = await supabase
          .from("invoices")
          .update({
            deposit_paid: true,
            deposit_paid_at: new Date().toISOString(),
            status: "partial",
          })
          .eq("id", invoice_id);

        if (error) throw error;
        console.log(`Deposit marked as paid for invoice ${invoice_id}`);

        // Send deposit confirmation email
        if (invoiceData?.lead_id) {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                type: "deposit_paid",
                leadId: invoiceData.lead_id,
                invoiceId: invoice_id,
              }),
            });
            console.log("Deposit confirmation email sent");
          } catch (emailError) {
            console.error("Failed to send email:", emailError);
          }
        }
      } else if (payment_type === "final") {
        const finalAmount = invoiceData 
          ? invoiceData.total_amount - (invoiceData.deposit_amount || 0)
          : null;

        const { error } = await supabase
          .from("invoices")
          .update({
            final_paid: true,
            final_paid_at: new Date().toISOString(),
            final_amount: finalAmount,
            status: "paid",
          })
          .eq("id", invoice_id);

        if (error) throw error;
        console.log(`Final payment marked as paid for invoice ${invoice_id}`);

        // Update lead workflow stage to completed
        if (invoiceData?.lead_id) {
          await supabase
            .from("leads")
            .update({ workflow_stage: "completed" })
            .eq("id", invoiceData.lead_id);

          // Send final payment confirmation email
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                type: "final_paid",
                leadId: invoiceData.lead_id,
                invoiceId: invoice_id,
              }),
            });
            console.log("Final payment confirmation email sent");
            
            // Also send stage change notification
            await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                type: "stage_change",
                leadId: invoiceData.lead_id,
                previousStage: "installed",
                newStage: "completed",
              }),
            });
          } catch (emailError) {
            console.error("Failed to send email:", emailError);
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  // Return success for unhandled events
  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
