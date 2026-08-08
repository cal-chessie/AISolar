import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders, log, HttpError, errorResponse, getCaller } from "../_shared/auth.ts";

const FN = "create-subscription-checkout";

/**
 * A1 SaaS billing — the installer adopts AISolar: 7-day free trial, card captured
 * up front (the card-payer becomes the tenant admin), then a monthly (or annual)
 * subscription. Mirrors src/pages/PricingPage.tsx: a base plan + €97 per EXTRA seat.
 * Hosted Stripe Checkout (mode:subscription) — the client just redirects to `url`,
 * so no publishable key ships to the browser. The stripe-webhook writes the
 * customer/subscription ids + trial end back onto `tenants`.
 */

// Base plans — keep in step with PricingPage.PRICES. The `yearly` figure is the
// per-month-equivalent (25% off); the annual charge is ×12.
const PLANS: Record<string, { monthly: number; yearly: number; seats: number; label: string }> = {
  solo:   { monthly: 197, yearly: 148, seats: 1, label: "Solo" },
  team:   { monthly: 497, yearly: 373, seats: 3, label: "Team" },
  aiteam: { monthly: 997, yearly: 748, seats: 5, label: "AITeam" },
};
const SEAT_MONTHLY = 97; // € per extra seat / month

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    // The signed-in installer becoming the admin (card-payer = first admin).
    const caller = await getCaller(req);
    if (!caller) throw new HttpError(401, "Authentication required");

    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan ?? "team");
    const yearly = body.billing === "yearly";
    const extraSeats = Math.max(0, Number(body.extraSeats) || 0);
    const tenantId = body.tenantId ? String(body.tenantId) : "";

    const p = PLANS[plan];
    if (!p) throw new HttpError(400, `Unknown plan: ${plan}`);

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new HttpError(500, "Stripe not configured");
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    const interval = yearly ? "year" : "month";
    const baseAmount = yearly ? p.yearly * 12 : p.monthly;
    const seatAmount = yearly ? SEAT_MONTHLY * 12 : SEAT_MONTHLY;

    // Base plan + (optional) extra-seat line — both recurring on the same interval.
    const line_items: any[] = [
      {
        price_data: {
          currency: "eur",
          recurring: { interval },
          unit_amount: Math.round(baseAmount * 100),
          product_data: { name: `AISolar — ${p.label}`, description: `${p.seats} seat${p.seats > 1 ? "s" : ""} included` },
        },
        quantity: 1,
      },
    ];
    if (extraSeats > 0) {
      line_items.push({
        price_data: {
          currency: "eur",
          recurring: { interval },
          unit_amount: Math.round(seatAmount * 100),
          product_data: { name: "AISolar — extra seat" },
        },
        quantity: extraSeats,
      });
    }

    const origin = req.headers.get("origin") ?? "";
    const meta: Record<string, string> = {
      tenant_id: tenantId,
      user_id: caller.id,
      plan,
      billing: yearly ? "yearly" : "monthly",
      extra_seats: String(extraSeats),
    };

    log(FN, "info", "Creating subscription checkout", { plan, yearly, extraSeats });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items,
      // 7-day free trial; card captured now, first charge only after the trial.
      subscription_data: { trial_period_days: 7, metadata: meta },
      customer_email: caller.email,
      success_url: body.successUrl || `${origin}/?welcome=1`,
      cancel_url: body.cancelUrl || `${origin}/get-started?billing=cancelled`,
      metadata: meta,
    });

    log(FN, "info", "Subscription checkout created", { sessionId: session.id });
    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    return errorResponse(err, headers);
  }
});
