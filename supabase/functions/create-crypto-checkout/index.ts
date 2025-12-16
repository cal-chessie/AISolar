import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CryptoCheckoutRequest {
  invoiceId: string;
  paymentType: "deposit" | "final";
  amount: number;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("COINBASE_COMMERCE_API_KEY");
    if (!apiKey) {
      console.error("COINBASE_COMMERCE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Crypto payments not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { invoiceId, paymentType, amount, customerEmail, customerName, successUrl, cancelUrl }: CryptoCheckoutRequest = await req.json();

    console.log("Creating crypto checkout for invoice:", invoiceId, "type:", paymentType, "amount:", amount);

    // Create Coinbase Commerce charge
    const chargeResponse = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CC-Api-Key": apiKey,
        "X-CC-Version": "2018-03-22",
      },
      body: JSON.stringify({
        name: `Solar Dublin - ${paymentType === "deposit" ? "Deposit" : "Final Payment"}`,
        description: `Invoice ${invoiceId} - ${paymentType} payment`,
        pricing_type: "fixed_price",
        local_price: {
          amount: amount.toString(),
          currency: "EUR",
        },
        metadata: {
          invoice_id: invoiceId,
          payment_type: paymentType,
          customer_email: customerEmail,
          customer_name: customerName,
        },
        redirect_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });

    if (!chargeResponse.ok) {
      const errorData = await chargeResponse.text();
      console.error("Coinbase Commerce error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to create crypto checkout" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const chargeData = await chargeResponse.json();
    console.log("Coinbase charge created:", chargeData.data.id);

    return new Response(
      JSON.stringify({
        chargeId: chargeData.data.id,
        hostedUrl: chargeData.data.hosted_url,
        expiresAt: chargeData.data.expires_at,
        addresses: chargeData.data.addresses,
        pricing: chargeData.data.pricing,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-crypto-checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
