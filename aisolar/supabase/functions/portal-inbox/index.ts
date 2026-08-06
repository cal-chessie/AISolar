/**
 * portal-inbox — the magic-link customer's write path (M4, closed 5 Aug).
 *
 * A portal customer has NO session — their lead's 64-char access_token IS their
 * auth (same pattern as create-checkout / extract-bill-data). Without this fn,
 * a production customer's messages, callbacks and complaints were browser-only
 * theatre. Now: token → verified against the lead → the notifications row lands
 * for the tenant's staff, with the customer's words verbatim.
 *
 * Writes ONLY notifications rows for the token's own lead. The token grants a
 * customer a voice on THEIR project — nothing else. Rate-limited by shape:
 * one row per call, message capped, type allow-listed.
 *
 * Deploy: supabase functions deploy portal-inbox --no-verify-jwt
 * (token-authenticated by design — no JWT exists for these users)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The only event kinds a customer can raise from the portal.
const ALLOWED = new Set(["customer_message", "callback_request", "reschedule"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { accessToken, type, title, message, metadata } = await req.json();
    if (!accessToken || typeof accessToken !== "string" || accessToken.length < 32) throw new Error("bad token");
    if (!ALLOWED.has(type)) throw new Error("type not allowed");
    if (!message || typeof message !== "string") throw new Error("no message");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // The token IS the auth: it must match exactly one lead.
    const { data: lead, error } = await supabase
      .from("leads").select("id, tenant_id, name").eq("access_token", accessToken).single();
    if (error || !lead) throw new Error("token not recognised");

    // Bell every staff member of the lead's tenant.
    let userIds: string[] = [];
    if (lead.tenant_id) {
      const { data: staff } = await supabase
        .from("user_roles").select("user_id")
        .eq("tenant_id", lead.tenant_id)
        .in("role", ["admin", "consultant", "installer", "owner"]);
      userIds = [...new Set((staff ?? []).map((r: { user_id: string }) => r.user_id))];
    }
    if (userIds.length === 0) {
      // No tenant staff resolvable — still record the message against the lead
      // (user_id null) so the thread holds it and nothing is lost.
      userIds = [null as unknown as string];
    }

    // Idempotency: a retry (flaky signal) or a double-tap must not double-post.
    // If an identical message (same lead + type + text) already landed in the last
    // 30s, treat it as the same request and return OK without inserting again.
    const { data: dupe } = await supabase
      .from("notifications")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("type", type)
      .eq("message", message.slice(0, 2000))
      .gte("created_at", new Date(Date.now() - 30_000).toISOString())
      .limit(1);
    if (dupe && dupe.length > 0) {
      return new Response(JSON.stringify({ ok: true, deduped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = userIds.map((user_id) => ({
      user_id, lead_id: lead.id, tenant_id: lead.tenant_id ?? null,
      type, title: String(title ?? `Message from ${lead.name}`).slice(0, 140),
      message: message.slice(0, 2000),
      metadata: { ...(metadata ?? {}), from: "portal-token" },
      read: false,
    }));
    const { error: insErr } = await supabase.from("notifications").insert(rows);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, bells: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
