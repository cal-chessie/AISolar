import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cc-webhook-signature",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("COINBASE_WEBHOOK_SECRET");
    const signature = req.headers.get("x-cc-webhook-signature");
    
    // In production, verify the webhook signature
    // For now, we'll process the webhook
    
    const payload = await req.json();
    console.log("Coinbase webhook received:", payload.event?.type);

    const event = payload.event;
    if (!event) {
      return new Response(JSON.stringify({ error: "No event in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const metadata = event.data?.metadata;
    const invoiceId = metadata?.invoice_id;
    const paymentType = metadata?.payment_type;

    if (!invoiceId) {
      console.log("No invoice_id in metadata, skipping");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    switch (event.type) {
      case "charge:confirmed":
        console.log("Payment confirmed for invoice:", invoiceId, "type:", paymentType);
        
        // Update invoice based on payment type
        if (paymentType === "deposit") {
          const { error } = await supabase
            .from("invoices")
            .update({
              deposit_paid: true,
              deposit_paid_at: new Date().toISOString(),
              status: "partial",
            })
            .eq("id", invoiceId);

          if (error) {
            console.error("Error updating invoice for deposit:", error);
          }
        } else if (paymentType === "final") {
          const { error } = await supabase
            .from("invoices")
            .update({
              final_paid: true,
              final_paid_at: new Date().toISOString(),
              status: "paid",
            })
            .eq("id", invoiceId);

          if (error) {
            console.error("Error updating invoice for final payment:", error);
          }
        }

        // Log activity
        const { data: invoice } = await supabase
          .from("invoices")
          .select("lead_id")
          .eq("id", invoiceId)
          .single();

        if (invoice?.lead_id) {
          await supabase.from("activity_logs").insert({
            lead_id: invoice.lead_id,
            action_type: "crypto_payment_received",
            description: `Crypto ${paymentType} payment confirmed for invoice ${invoiceId}`,
            metadata: {
              invoice_id: invoiceId,
              payment_type: paymentType,
              charge_id: event.data?.id,
            },
          });
        }
        break;

      case "charge:pending":
        console.log("Payment pending for invoice:", invoiceId);
        break;

      case "charge:failed":
        console.log("Payment failed for invoice:", invoiceId);
        break;

      case "charge:delayed":
        console.log("Payment delayed for invoice:", invoiceId);
        break;

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error processing Coinbase webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
