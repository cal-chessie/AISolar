import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders, log, HttpError, errorResponse, getCallerOrToken } from "../_shared/auth.ts";

const FN = "create-crypto-checkout";
const BRAND_NAME = "AISOLAR";

const handler = async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // v3: Auth required — same as create-checkout
    const caller = await getCallerOrToken(req);
    if (!caller) {
      throw new HttpError(401, "Authentication required");
    }

    const apiKey = Deno.env.get("COINBASE_COMMERCE_API_KEY");
    if (!apiKey) {
      throw new HttpError(500, "Crypto payments not configured");
    }

    const { invoiceId, paymentType, successUrl, cancelUrl } = await req.json();

    if (!invoiceId) {
      throw new HttpError(400, "Missing required parameter: invoiceId");
    }
    if (!paymentType || !["deposit", "final"].includes(paymentType)) {
      throw new HttpError(400, "Missing or invalid paymentType");
    }

    // v3: Server-side invoice lookup + amount calculation
    // (was: amount came from client — attack vector for €0.01 payments)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, leads(id, name, email, access_token)")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new HttpError(404, "Invoice not found");
    }

    // Authorization
    if (caller.type === "customer") {
      if (invoice.leads?.access_token !== caller.token) {
        log(FN, "warn", "Customer token mismatch", { invoiceId });
        throw new HttpError(403, "Not authorized to pay this invoice");
      }
    }
    // Staff allowed (role check happens via JWT verify_jwt=true at gateway)

    // Server-side amount
    let amount: number;
    if (paymentType === "deposit") {
      if (invoice.deposit_paid) throw new HttpError(400, "Deposit already paid");
      amount = invoice.deposit_amount || (invoice.total_amount ?? 0) * 0.3;
    } else {
      if (!invoice.deposit_paid) throw new HttpError(400, "Deposit must be paid first");
      if (invoice.final_paid) throw new HttpError(400, "Final payment already made");
      amount = invoice.final_amount || ((invoice.total_amount ?? 0) - (invoice.deposit_amount ?? 0));
    }

    if (amount <= 0) {
      throw new HttpError(400, "Invalid invoice amount");
    }

    const customerEmail = invoice.leads?.email ?? "";
    const customerName = invoice.leads?.name ?? "";

    log(FN, "info", "Creating Coinbase charge", {
      invoiceId,
      paymentType,
      amount,
      callerType: caller.type,
    });

    const chargeResponse = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CC-Api-Key": apiKey,
        "X-CC-Version": "2018-03-22",
      },
      body: JSON.stringify({
        name: `${BRAND_NAME} - ${paymentType === "deposit" ? "Deposit" : "Final Payment"}`,
        description: `Invoice ${invoice.invoice_number} - ${paymentType} payment`,
        pricing_type: "fixed_price",
        local_price: {
          amount: amount.toString(),
          currency: "EUR",
        },
        metadata: {
          invoice_id: invoiceId,
          payment_type: paymentType,
          customer_email: customerEmail, // PII — kept in metadata for webhook reconciliation
          customer_name: customerName,
        },
        redirect_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });

    if (!chargeResponse.ok) {
      const errorData = await chargeResponse.text();
      log(FN, "error", "Coinbase API error", { status: chargeResponse.status, body: errorData });
      throw new HttpError(502, "Failed to create crypto checkout");
    }

    const chargeData = await chargeResponse.json();
    log(FN, "info", "Coinbase charge created", { chargeId: chargeData.data.id });

    return new Response(
      JSON.stringify({
        chargeId: chargeData.data.id,
        hostedUrl: chargeData.data.hosted_url,
        expiresAt: chargeData.data.expires_at,
        addresses: chargeData.data.addresses,
        pricing: chargeData.data.pricing,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...headers } }
    );
  } catch (err) {
    return errorResponse(err, headers);
  }
};

serve(handler);
