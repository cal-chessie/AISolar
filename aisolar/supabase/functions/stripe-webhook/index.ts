import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, log, HttpError, errorResponse } from "../_shared/auth.ts";

const FN = "stripe-webhook";

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    // v3: Both keys are mandatory. No dev fallback.
    if (!stripeSecretKey) {
      throw new HttpError(500, "Server misconfigured: STRIPE_SECRET_KEY missing");
    }
    if (!webhookSecret) {
      throw new HttpError(500, "Server misconfigured: STRIPE_WEBHOOK_SECRET missing");
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!signature) {
      throw new HttpError(401, "Missing stripe-signature header");
    }

    let event: Stripe.Event;
    try {
      // v3: Signature verification is mandatory. No fallback to JSON.parse.
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      log(FN, "error", "Signature verification failed", { error: err.message });
      throw new HttpError(400, `Invalid signature: ${err.message}`);
    }

    log(FN, "info", "Processing event", { type: event.type, eventId: event.id });

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

          // Get proposal for SEAI application
          const { data: proposalData } = await supabase
            .from("proposals")
            .select("id, system_size_kw, property_type, seai_grant")
            .eq("lead_id", invoiceData.lead_id)
            .single();

          // Auto-initiate SEAI grant application
          if (proposalData) {
            const { data: existingSeai } = await supabase
              .from("seai_applications")
              .select("id")
              .eq("proposal_id", proposalData.id)
              .maybeSingle();

            if (!existingSeai) {
              const { error: seaiError } = await supabase
                .from("seai_applications")
                .insert({
                  proposal_id: proposalData.id,
                  lead_id: invoiceData.lead_id,
                  system_size_kw: proposalData.system_size_kw,
                  property_type: proposalData.property_type,
                  grant_amount: proposalData.seai_grant,
                  status: "draft",
                  requires_engineer_review: (proposalData.system_size_kw || 0) > 50,
                });

              if (seaiError) {
                console.error("Failed to create SEAI application:", seaiError);
              } else {
                console.log("SEAI application auto-initiated for proposal:", proposalData.id);
              }
            }
          }

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
        headers: { ...headers, "Content-Type": "application/json" },
      });
    } catch (error: any) {
      log(FN, "error", "Error updating invoice", { error: error.message });
      throw new HttpError(500, error.message);
    }
  }

  // Return success for unhandled events
  return new Response(JSON.stringify({ received: true }), {
    headers: { ...headers, "Content-Type": "application/json" },
  });
  } catch (err) {
    return errorResponse(err, headers);
  }
});
