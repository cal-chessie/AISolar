/**
 * ingest-lead — public lead-ingestion endpoint for the marketing websites.
 *
 * Solar Ireland, Renewable Ireland (and later the county sites) POST leads
 * here. Auth is a shared secret: the caller must send `x-ingest-key` matching
 * the INGEST_API_KEY secret (set via `supabase secrets set INGEST_API_KEY=...`).
 *
 * What it does:
 *   1. Validates payload (name + email or phone required).
 *   2. Dedupes: same email + brand within 24h returns the existing lead
 *      (idempotent against double-submits) and logs an inbound touchpoint.
 *   3. Inserts into `leads` (+ `lead_intake` when bill data is present).
 *   4. Logs an inbound touchpoint.
 *   5. The DB trigger trg_enqueue_lead_intake enqueues the lead_intake agent —
 *      from there the normal stage-trigger chain drives everything.
 *
 * Expected JSON body:
 * {
 *   "brand": "solar-ireland" | "renewable-ireland" | "<county-site>",
 *   "source": "website_contact" | "website_chat" | "website_survey" |
 *             "website_qualified" | "exit_intent" | "bill_analyser",
 *   "name": "…", "email": "…", "phone": "…",
 *   "county": "…", "address": "…", "eircode": "…",
 *   "message": "…",
 *   "monthlyBill": 180, "annualKwh": 4800,   // optional bill data
 *   "meta": { … }                             // anything else, stored on touchpoint
 * }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders, log, errorResponse } from "../_shared/auth.ts";

const FN = "ingest-lead";

const ALLOWED_SOURCES = new Set([
  "website_contact",
  "website_chat",
  "website_survey",
  "website_qualified",
  "exit_intent",
  "bill_analyser",
]);

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    if (req.method !== "POST") {
      return errorResponse(405, "Method not allowed", headers);
    }

    // ─── Shared-secret auth ───
    const expectedKey = Deno.env.get("INGEST_API_KEY");
    if (!expectedKey) {
      log(FN, "error", "INGEST_API_KEY secret not configured");
      return errorResponse(500, "Ingestion not configured", headers);
    }

    // ─── Tenant binding (kernel FIX 3 philosophy: no tenant → crash, never
    // silent misfile). Each AISOLAR deployment IS one tenant; the tenant UUID
    // is deployment config, not caller-claimed. Set via:
    //   supabase secrets set AISOLAR_TENANT_ID=<this installation's tenant uuid>
    const tenantId = Deno.env.get("AISOLAR_TENANT_ID");
    if (!tenantId) {
      log(FN, "error", "AISOLAR_TENANT_ID not configured — refusing to birth tenantless leads");
      return errorResponse(500, "Tenant not configured", headers);
    }
    if (req.headers.get("x-ingest-key") !== expectedKey) {
      return errorResponse(401, "Invalid ingest key", headers);
    }

    const body = await req.json();

    // ─── Validation ───
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";
    const brand = typeof body.brand === "string" ? body.brand.trim().slice(0, 60) : "unknown";
    const source = ALLOWED_SOURCES.has(body.source) ? body.source : "website_contact";

    if (!name || (!email && !phone)) {
      return errorResponse(400, "name plus email or phone required", headers);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse(400, "invalid email", headers);
    }

    const county = typeof body.county === "string" ? body.county.trim().slice(0, 60) : "";
    const eircode = typeof body.eircode === "string" ? body.eircode.trim().slice(0, 12) : "";
    const addressParts = [
      typeof body.address === "string" ? body.address.trim().slice(0, 300) : "",
      eircode,
      county ? `Co. ${county}` : "",
    ].filter(Boolean);
    const address = addressParts.join(", ") || null;

    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    const monthlyBill = Number.isFinite(Number(body.monthlyBill)) && Number(body.monthlyBill) > 0
      ? Number(body.monthlyBill) : null;
    const annualKwh = Number.isFinite(Number(body.annualKwh)) && Number(body.annualKwh) > 0
      ? Math.round(Number(body.annualKwh)) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ─── Dedupe: same email + brand in the last 24h ───
    if (email) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("brand", brand)
        .ilike("email", email)
        .gte("created_at", since)
        .limit(1);

      if (existing && existing.length > 0) {
        const leadId = existing[0].id;
        await supabase.from("touchpoints").insert({
          lead_id: leadId,
          stage: "new",
          channel: "portal",
          direction: "inbound",
          actor: "customer",
          summary: `Repeat submission from ${brand} (${source})${message ? `: ${message.slice(0, 140)}` : ""}`,
          metadata: { brand, source, meta: body.meta ?? null },
        });
        log(FN, "info", `Deduped lead ${leadId} (${brand}/${source})`);
        return new Response(JSON.stringify({ ok: true, leadId, deduped: true }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Insert lead — DB trigger enqueues the lead_intake agent ───
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        name,
        email: email || `no-email-${crypto.randomUUID().slice(0, 8)}@placeholder.invalid`,
        phone: phone || null,
        address,
        monthly_bill: monthlyBill,
        notes: message || null,
        status: "new",
        workflow_stage: "new",
        tenant_id: tenantId,
        brand,
        source,
      })
      .select("id")
      .single();

    if (leadError || !lead) {
      log(FN, "error", `Lead insert failed: ${leadError?.message}`);
      return errorResponse(500, "Could not create lead", headers);
    }

    // NOTE: we deliberately do NOT insert into lead_intake here — the
    // lead_intake agent (enqueued by trg_enqueue_lead_intake) owns that row.
    // It scores the lead, estimates the system, then advances workflow_stage
    // to 'intake_complete', which cascades into survey_scheduler and onward.
    // Bill data travels on the lead row (monthly_bill) + touchpoint metadata.

    // ─── Inbound touchpoint ───
    await supabase.from("touchpoints").insert({
      lead_id: lead.id,
      stage: "new",
      channel: "portal",
      direction: "inbound",
      actor: "customer",
      summary: `New lead from ${brand} (${source})${county ? ` — Co. ${county}` : ""}${message ? `: ${message.slice(0, 140)}` : ""}`,
      metadata: { brand, source, county: county || null, eircode: eircode || null, meta: body.meta ?? null },
    });

    log(FN, "info", `Lead ${lead.id} ingested (${brand}/${source})`);
    return new Response(JSON.stringify({ ok: true, leadId: lead.id }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    log(FN, "error", `Unhandled: ${err instanceof Error ? err.message : String(err)}`);
    return errorResponse(500, "Internal error", headers);
  }
});
