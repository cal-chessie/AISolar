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

  try {
    const { invoiceId, paymentType, successUrl, cancelUrl } = await req.json();

    if (!invoiceId || !paymentType) {
      throw new Error("Missing required parameters: invoiceId and paymentType");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // Fetch invoice with lead details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, leads(name, email)")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice fetch error:", invoiceError);
      throw new Error("Invoice not found");
    }

    // Determine amount based on payment type
    let amount: number;
    let description: string;

    if (paymentType === "deposit") {
      if (invoice.deposit_paid) {
        throw new Error("Deposit has already been paid");
      }
      amount = invoice.deposit_amount || invoice.total_amount * 0.3;
      description = `Deposit for Invoice #${invoice.invoice_number}`;
    } else if (paymentType === "final") {
      if (!invoice.deposit_paid) {
        throw new Error("Deposit must be paid first");
      }
      if (invoice.final_paid) {
        throw new Error("Final payment has already been made");
      }
      amount = invoice.final_amount || (invoice.total_amount - (invoice.deposit_amount || 0));
      description = `Final Payment for Invoice #${invoice.invoice_number}`;
    } else {
      throw new Error("Invalid payment type. Must be 'deposit' or 'final'");
    }

    console.log(`Creating checkout for ${paymentType}: €${amount} for invoice ${invoice.invoice_number}`);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Solar Installation - ${paymentType === "deposit" ? "Deposit" : "Final Payment"}`,
              description: description,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${req.headers.get("origin")}/customer/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/customer/payment-cancelled`,
      customer_email: invoice.leads?.email,
      metadata: {
        invoice_id: invoiceId,
        payment_type: paymentType,
        invoice_number: invoice.invoice_number,
      },
    });

    console.log(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
