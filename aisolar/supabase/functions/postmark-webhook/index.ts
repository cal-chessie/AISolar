/**
 * postmark-webhook — receives Postmark Bounce + SpamComplaint webhooks and writes
 * the address to email_suppressions, so we never mail a dead/complaining address
 * again (protecting the shared sending domain's reputation → the cohort's inbox
 * placement). See migration 20260806_email_suppressions.
 *
 * SECURITY: Postmark can't send a JWT, so this is gated by a shared secret. Set
 * POSTMARK_WEBHOOK_SECRET, then in Postmark point the webhook at either
 *   https://<proj>.functions.supabase.co/postmark-webhook?secret=<SECRET>
 * or use HTTP Basic auth (any user, password = <SECRET>). Unauthed calls get 401.
 *
 * Deploy: supabase functions deploy postmark-webhook --no-verify-jwt
 *   (Postmark isn't a Supabase user; the shared secret is the auth.)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Permanent failure types worth suppressing. Transient/soft bounces do NOT
// suppress — the address may still be good.
const PERMANENT = new Set([
  "HardBounce",
  "BadEmailAddress",
  "ManuallyDeactivated",
  "Blocked",
  "SpamComplaint",
  "SpamNotification",
]);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // --- shared-secret auth (query param or HTTP Basic password) ---
  const secret = Deno.env.get("POSTMARK_WEBHOOK_SECRET") ?? "";
  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization") ?? "";
  let provided = url.searchParams.get("secret") ?? "";
  if (!provided && authHeader.startsWith("Basic ")) {
    try { provided = atob(authHeader.slice(6)).split(":").pop() ?? ""; } catch { /* ignore */ }
  }
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const recordType = String(payload?.RecordType ?? "");           // "Bounce" | "SpamComplaint"
  const email = String(payload?.Email ?? "").toLowerCase().trim();
  const type = String(payload?.Type ?? recordType);               // e.g. "HardBounce"
  const stream = payload?.MessageStream ? String(payload.MessageStream) : null;
  const isComplaint = recordType === "SpamComplaint";

  // Only act on permanent failures + complaints.
  if (!email || (!isComplaint && !PERMANENT.has(type))) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supabase.from("email_suppressions").upsert(
    {
      email,
      reason: isComplaint ? "SpamComplaint" : type,
      detail: (payload?.Description ?? payload?.Details ?? null) as string | null,
      message_stream: stream,
    },
    { onConflict: "email" },
  );
  if (error) {
    console.error("postmark-webhook: suppression upsert failed", error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, suppressed: email }), {
    headers: { "Content-Type": "application/json" },
  });
});
