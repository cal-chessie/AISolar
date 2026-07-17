import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders, log, HttpError, errorResponse } from "../_shared/auth.ts";

const FN = "coinbase-webhook";

/** Verify Coinbase Commerce webhook signature using HMAC-SHA256.
 * See: https://docs.cloud.coinbase.com/commerce/docs/webhooks-security
 */
async function verifyCoinbaseSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  // Coinbase sends a hex-encoded HMAC-SHA256 of the raw body
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (expected.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return diff === 0;
}

const handler = async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const webhookSecret = Deno.env.get("COINBASE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new HttpError(500, "Server misconfigured: COINBASE_WEBHOOK_SECRET missing");
    }

    const signature = req.headers.get("x-cc-webhook-signature");
    if (!signature) {
      throw new HttpError(401, "Missing x-cc-webhook-signature header");
    }

    const rawBody = await req.text();

    // v3: Signature verification is now mandatory.
    const valid = await verifyCoinbaseSignature(rawBody, signature, webhookSecret);
    if (!valid) {
      log(FN, "error", "Signature verification failed");
      throw new HttpError(400, "Invalid signature");
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    if (!event) {
      throw new HttpError(400, "No event in payload");
    }

    log(FN, "info", "Webhook verified", { type: event.type, eventId: event.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const metadata = event.data?.metadata;
    const invoiceId = metadata?.invoice_id;
    const paymentType = metadata?.payment_type;

    if (!invoiceId) {
      log(FN, "info", "No invoice_id in metadata, skipping");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    switch (event.type) {
      case "charge:confirmed": {
        log(FN, "info", "Payment confirmed", { invoiceId, paymentType });

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
            log(FN, "error", "Failed to update invoice (deposit)", { error: error.message });
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
            log(FN, "error", "Failed to update invoice (final)", { error: error.message });
          }
        }

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
      }

      case "charge:pending":
        log(FN, "info", "Payment pending", { invoiceId });
        break;

      case "charge:failed":
        log(FN, "warn", "Payment failed", { invoiceId });
        break;

      case "charge:delayed":
        log(FN, "warn", "Payment delayed", { invoiceId });
        break;

      default:
        log(FN, "info", "Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...headers },
    });
  } catch (err) {
    return errorResponse(err, headers);
  }
};

serve(handler);
