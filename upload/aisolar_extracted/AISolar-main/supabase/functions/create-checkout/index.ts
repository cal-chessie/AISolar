import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    logStep("Request received", body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // Determine if this is an invoice-based or direct proposal payment
    const { invoiceId, paymentType, successUrl, cancelUrl, amount, customerEmail, customerName, proposalId, leadId } = body;

    let checkoutAmount: number;
    let description: string;
    let customerEmailToUse: string;
    let metadata: Record<string, string> = {};

    if (invoiceId) {
      // Invoice-based payment flow
      logStep("Processing invoice-based payment", { invoiceId, paymentType });

      if (!paymentType) {
        throw new Error("Missing required parameter: paymentType");
      }

      // Fetch invoice with lead details
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*, leads(name, email)")
        .eq("id", invoiceId)
        .single();

      if (invoiceError || !invoice) {
        logStep("Invoice fetch error", invoiceError);
        throw new Error("Invoice not found");
      }

      // Determine amount based on payment type
      if (paymentType === "deposit") {
        if (invoice.deposit_paid) {
          throw new Error("Deposit has already been paid");
        }
        checkoutAmount = invoice.deposit_amount || invoice.total_amount * 0.3;
        description = `Deposit for Invoice #${invoice.invoice_number}`;
      } else if (paymentType === "final") {
        if (!invoice.deposit_paid) {
          throw new Error("Deposit must be paid first");
        }
        if (invoice.final_paid) {
          throw new Error("Final payment has already been made");
        }
        checkoutAmount = invoice.final_amount || (invoice.total_amount - (invoice.deposit_amount || 0));
        description = `Final Payment for Invoice #${invoice.invoice_number}`;
      } else {
        throw new Error("Invalid payment type. Must be 'deposit' or 'final'");
      }

      customerEmailToUse = invoice.leads?.email || "";
      metadata = {
        invoice_id: invoiceId,
        payment_type: paymentType,
        invoice_number: invoice.invoice_number,
      };

      logStep("Invoice payment details", { amount: checkoutAmount, description });

    } else if (proposalId || amount) {
      // Direct proposal payment flow (in-person deposit collection)
      logStep("Processing direct proposal payment", { proposalId, amount, customerEmail });

      if (!amount || !customerEmail) {
        throw new Error("Missing required parameters for direct payment: amount, customerEmail");
      }

      // Amount is already in cents from frontend
      checkoutAmount = amount / 100; // Convert back to euros for display
      description = proposalId 
        ? `Deposit for Solar Installation Proposal`
        : `Solar Installation Payment`;
      customerEmailToUse = customerEmail;
      
      metadata = {
        payment_type: "deposit",
        ...(proposalId && { proposal_id: proposalId }),
        ...(leadId && { lead_id: leadId }),
      };

      logStep("Direct payment details", { amount: checkoutAmount, description });

    } else {
      throw new Error("Missing required parameters: either invoiceId or (amount + customerEmail)");
    }

    logStep("Creating Stripe checkout session", { 
      amount: checkoutAmount, 
      email: customerEmailToUse 
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Solar Installation - ${metadata.payment_type === "deposit" ? "Deposit" : "Final Payment"}`,
              description: description,
            },
            unit_amount: Math.round(checkoutAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${req.headers.get("origin")}/customer/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/customer/payment-cancelled`,
      customer_email: customerEmailToUse,
      metadata: metadata,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
