import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, log, HttpError, errorResponse, requireRole, getCallerOrToken } from "../_shared/auth.ts";

const FN = "create-checkout";

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // v3: Auth required. Either a staff user (consultant/admin) or a customer
    // with a valid access_token (for the customer portal invoice payment flow).
    const caller = await getCallerOrToken(req);
    if (!caller) {
      throw new HttpError(401, "Authentication required");
    }

    const body = await req.json();
    log(FN, "info", "Request received", { callerType: caller.type, invoiceId: body.invoiceId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      throw new HttpError(500, "Stripe not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    const { invoiceId, paymentType, successUrl, cancelUrl, proposalId, leadId } = body;

    // v3: Removed the `amount` and `customerEmail` from accepted body params for
    // the direct-payment flow. Amount is now ALWAYS looked up server-side from
    // the invoice or proposal. This eliminates the "pay €0.01 for someone
    // else's invoice" attack vector.

    if (!invoiceId) {
      throw new HttpError(400, "Missing required parameter: invoiceId");
    }
    if (!paymentType || !["deposit", "final"].includes(paymentType)) {
      throw new HttpError(400, "Missing or invalid paymentType (must be 'deposit' or 'final')");
    }

    // Fetch invoice with lead details (server-side, service role)
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, leads(id, name, email, access_token)")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      log(FN, "warn", "Invoice not found", { invoiceId });
      throw new HttpError(404, "Invoice not found");
    }

    // v3: Authorization check
    if (caller.type === "customer") {
      // Customer must own this invoice's lead
      if (invoice.leads?.access_token !== caller.token) {
        log(FN, "warn", "Customer token mismatch for invoice", { invoiceId });
        throw new HttpError(403, "Not authorized to pay this invoice");
      }
    } else {
      // Staff — must be admin, consultant, or installer
      try {
        await requireRole(req, ["admin", "consultant", "installer"]);
      } catch (e) {
        // requireRole throws HttpError — re-throw
        throw e;
      }
    }

    // Determine amount based on payment type (server-side, never from client)
    let checkoutAmount: number;
    let description: string;

    if (paymentType === "deposit") {
      if (invoice.deposit_paid) {
        throw new HttpError(400, "Deposit has already been paid");
      }
      checkoutAmount = invoice.deposit_amount || (invoice.total_amount ?? 0) * 0.3;
      description = `Deposit for Invoice #${invoice.invoice_number}`;
    } else {
      // final
      if (!invoice.deposit_paid) {
        throw new HttpError(400, "Deposit must be paid first");
      }
      if (invoice.final_paid) {
        throw new HttpError(400, "Final payment has already been made");
      }
      checkoutAmount = invoice.final_amount || ((invoice.total_amount ?? 0) - (invoice.deposit_amount ?? 0));
      description = `Final Payment for Invoice #${invoice.invoice_number}`;
    }

    if (checkoutAmount <= 0) {
      throw new HttpError(400, "Invalid invoice amount");
    }

    const customerEmail = invoice.leads?.email ?? "";
    if (!customerEmail) {
      log(FN, "warn", "Invoice has no customer email", { invoiceId });
    }

    const metadata: Record<string, string> = {
      invoice_id: invoiceId,
      payment_type: paymentType,
      invoice_number: invoice.invoice_number ?? "",
      lead_id: invoice.lead_id ?? "",
    };

    log(FN, "info", "Creating Stripe checkout session", {
      amount: checkoutAmount,
      paymentType,
      callerType: caller.type,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Solar Installation - ${paymentType === "deposit" ? "Deposit" : "Final Payment"}`,
              description,
            },
            unit_amount: Math.round(checkoutAmount * 100), // euros → cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${req.headers.get("origin")}/customer/${invoice.leads?.access_token ?? ""}?payment=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/customer/${invoice.leads?.access_token ?? ""}?payment=cancelled`,
      customer_email: customerEmail,
      metadata,
    });

    log(FN, "info", "Checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return errorResponse(err, headers);
  }
});
