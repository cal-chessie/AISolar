/**
 * slack-approve — Cal's veto, made autonomous.
 *
 * THE POINT (docs/SLACK_OPS.md · Doctrine: "agents draft, humans approve"):
 * the Hardening Amendment abolished the power to act alone and RETAINED the
 * power to stop alone. Until now that veto lived in a Claude session — which
 * means it only existed while a session was open. This endpoint moves it onto a
 * surface that works at 3am with nobody watching:
 *
 *   agent writes kernel.commands (pending) → posts buttons to #decisions
 *     → Cal taps → Slack POSTs here → signature verified → command resolved
 *       → the 0012 trigger emits CommandResolved onto the hash chain.
 *
 * The tap becomes a permanent, attributable receipt. No Claude in the loop.
 *
 * SECURITY — this is a PUBLIC endpoint (Slack cannot send a JWT), so the
 * signature IS the authentication:
 *   • HMAC-SHA256 over `v0:{timestamp}:{rawBody}` with SLACK_SIGNING_SECRET
 *   • constant-time comparison (no early-exit leak)
 *   • 5-minute replay window
 *   • raw body read BEFORE parsing — parsing first would break verification
 * Deploy with --no-verify-jwt (Slack has no JWT) — the signature replaces it.
 *
 * Secrets: SLACK_SIGNING_SECRET · KERNEL_URL · KERNEL_SERVICE_ROLE_KEY
 * Slack app → Interactivity & Shortcuts → Request URL = this function's URL.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, log, HttpError, errorResponse } from "../_shared/auth.ts";

const FN = "slack-approve";
const REPLAY_WINDOW_SECONDS = 60 * 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Constant-time compare — never leak position of first mismatch. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySlackSignature(rawBody: string, timestamp: string, signature: string, secret: string): Promise<boolean> {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  // Replay protection: an old, valid signature must not be re-usable.
  if (Math.abs(Date.now() / 1000 - ts) > REPLAY_WINDOW_SECONDS) {
    log(FN, "warn", "rejected: timestamp outside replay window");
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`v0:${timestamp}:${rawBody}`));
  const expected = "v0=" + Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(expected, signature);
}

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");

    const signingSecret = Deno.env.get("SLACK_SIGNING_SECRET");
    const kernelUrl = Deno.env.get("KERNEL_URL");
    const kernelKey = Deno.env.get("KERNEL_SERVICE_ROLE_KEY");
    if (!signingSecret) throw new HttpError(500, "Server misconfigured: SLACK_SIGNING_SECRET missing");
    if (!kernelUrl || !kernelKey) throw new HttpError(500, "Server misconfigured: kernel credentials missing");

    // RAW body first — required for the signature, and consumed only once.
    const rawBody = await req.text();
    const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
    const signature = req.headers.get("x-slack-signature") ?? "";
    if (!timestamp || !signature) throw new HttpError(401, "Missing Slack signature headers");

    if (!(await verifySlackSignature(rawBody, timestamp, signature, signingSecret))) {
      log(FN, "error", "invalid Slack signature — request rejected");
      throw new HttpError(401, "Invalid signature");
    }

    // Slack interactivity arrives form-encoded with a JSON `payload` field.
    const payloadRaw = new URLSearchParams(rawBody).get("payload");
    if (!payloadRaw) throw new HttpError(400, "Missing payload");
    const payload = JSON.parse(payloadRaw);

    if (payload.type !== "block_actions") {
      return new Response(JSON.stringify({ ok: true, ignored: payload.type }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const action = payload.actions?.[0];
    const commandId = String(action?.value ?? "");
    const decision = action?.action_id === "approve" ? "approved"
                   : action?.action_id === "reject" ? "rejected" : null;

    if (!decision) throw new HttpError(400, "Unknown action");
    if (!UUID_RE.test(commandId)) throw new HttpError(400, "Invalid command id");

    // Who pressed it — recorded on the receipt. Attestation names its actor.
    const actor = payload.user?.username || payload.user?.name || payload.user?.id || "unknown";

    // Resolve through a narrow RPC: the kernel schema is never exposed wholesale.
    const kernel = createClient(kernelUrl, kernelKey, { auth: { persistSession: false } });
    const { data, error } = await kernel.rpc("resolve_kernel_command", {
      p_command_id: commandId,
      p_status: decision,
      p_actor_label: `slack:${actor}`,
    });

    if (error) {
      log(FN, "error", "kernel resolve failed", { commandId, decision, error: error.message });
      throw new HttpError(502, `Kernel refused: ${error.message}`);
    }

    log(FN, "info", "command resolved", { commandId, decision, actor });

    // Replace the original message so the record in Slack matches the chain.
    const mark = decision === "approved" ? ":white_check_mark:" : ":x:";
    return new Response(JSON.stringify({
      replace_original: true,
      text: `${mark} *${decision.toUpperCase()}* by ${actor} · command \`${commandId.slice(0, 8)}…\`\n` +
            `_Receipted to the chain as CommandResolved. This record is permanent._`,
    }), { headers: { ...headers, "Content-Type": "application/json" } });

  } catch (err) {
    return errorResponse(err, headers);
  }
});
