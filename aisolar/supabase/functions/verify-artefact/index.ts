/**
 * verify-artefact — COMPLIANCE VISION (Cal, 3 Aug: "the one nobody can copy").
 *
 * The AI as compliance officer, not copywriter: point a vision model at the
 * artefacts the crew already captures at the commissioning gate — the inverter
 * type-test cert, the serial/rating plate photo, the RECI cert — and CROSS-CHECK
 * what the document says against what the human typed. A mismatch (wrong AC
 * rating, transposed serial, cert for a different model) is flagged BEFORE the
 * NC6 is filed, which is the only moment it's cheap.
 *
 * TRUTH RULES (non-negotiable):
 *  - The AI FLAGS; the human DECIDES. Nothing here blocks, signs or submits.
 *  - No AI key configured → honest `{ status: "no_ai" }` — never a fake pass.
 *  - Model unsure → `unreadable`, surfaced as "check it yourself", never "ok".
 *  - Every response carries what the model READ, so the human can verify the
 *    verifier in one glance.
 *
 * Auth: staff JWT (same bar as extract-bill-data — anonymous callers rejected).
 * Input:  { artefact: 'type_test'|'plate'|'reci'|'sld',
 *           imageDataUrl: string,            // the captured cert/photo
 *           typed: { fittedModel?, acRatingKw?, ratedCurrentA?, typeTestCertRef?, serial?, reciNumber? } }
 * Output: { status: 'ok'|'mismatch'|'unreadable'|'no_ai',
 *           extracted: Record<string,string>, mismatches: Array<{field, typed, read}> }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders, log, errorResponse } from "../_shared/auth.ts";

const FN = "verify-artefact";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Vision-capable + cheap; ai_config's default model may not do images.
const VISION_MODEL = "google/gemini-2.5-flash";

const PROMPTS: Record<string, string> = {
  type_test: "This is an inverter type-test certificate (EN 50549-1 / G10 family). Extract exactly: manufacturer, model, ac_rating_kw (the rated AC output in kW), rated_current_a (rated current in amps), cert_ref (the certificate reference number).",
  plate: "This is a photo of an inverter rating plate / serial label. Extract exactly: manufacturer, model, serial, ac_rating_kw (rated AC output in kW), rated_current_a (rated current in amps).",
  reci: "This is a Safe Electric (RECI) certificate from Ireland. Extract exactly: reci_number (the registration number), contractor_name, date.",
  sld: "This is a single-line diagram (SLD) for a solar PV installation. Extract exactly: inverter_model (if labelled), ac_rating_kw (if labelled), export_limitation (if shown).",
};

/** Numeric fields compare with tolerance (a 5.0 vs 5 plate is not a mismatch). */
const NUMERIC = new Set(["ac_rating_kw", "rated_current_a"]);
const closeEnough = (a: string, b: string) => {
  const na = parseFloat(a), nb = parseFloat(b);
  if (isFinite(na) && isFinite(nb)) return Math.abs(na - nb) < 0.05 * Math.max(na, nb, 1);
  return a.trim().toLowerCase() === b.trim().toLowerCase();
};
/** Text fields compare loosely: case/space/dash-insensitive containment. */
const softMatch = (typed: string, read: string) => {
  const n = (x: string) => x.toLowerCase().replace(/[\s\-_./]/g, "");
  const t = n(typed), r = n(read);
  return t.length > 0 && r.length > 0 && (t.includes(r) || r.includes(t));
};

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  try {
    if (req.method !== "POST") return errorResponse(405, "Method not allowed", headers);

    // ── Staff JWT only — the gate is an internal instrument ──
    const authHeader = req.headers.get("Authorization") ?? "";
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return errorResponse(401, "Sign in required", headers);

    const body = await req.json();
    const artefact = String(body.artefact ?? "");
    const imageDataUrl = String(body.imageDataUrl ?? "");
    const typed: Record<string, string> = body.typed ?? {};
    if (!PROMPTS[artefact]) return errorResponse(400, "Unknown artefact type", headers);
    if (!imageDataUrl.startsWith("data:image/")) return errorResponse(400, "imageDataUrl must be an image data URL", headers);
    if (imageDataUrl.length > 8_000_000) return errorResponse(413, "Image too large — retake at lower resolution", headers);

    // ── AI key from ai_config (service role — same source the agents use) ──
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfgRows } = await service.from("ai_config").select("key, value");
    const cfg = Object.fromEntries((cfgRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const apiKey = cfg["openrouter_api_key"];
    const llmEnabled = cfg["llm_enabled"] !== "false";
    if (!apiKey || !llmEnabled) {
      // HONEST: no silent fake pass, ever.
      return new Response(JSON.stringify({ status: "no_ai", extracted: {}, mismatches: [] }), { headers: { ...headers, "Content-Type": "application/json" } });
    }

    // ── The vision read ──
    const resp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0,
        max_tokens: 400,
        messages: [
          { role: "system", content: "You read electrical compliance documents for an Irish solar installer. Answer ONLY with a flat JSON object of the requested fields as strings. If a field is not clearly legible, use the literal string \"unreadable\". Never guess." },
          { role: "user", content: [
            { type: "text", text: PROMPTS[artefact] },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ] },
        ],
      }),
    });
    if (!resp.ok) {
      log(FN, "error", "OpenRouter error", { status: resp.status });
      return new Response(JSON.stringify({ status: "unreadable", extracted: {}, mismatches: [] }), { headers: { ...headers, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let extracted: Record<string, string> = {};
    try { extracted = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { /* fall through */ }
    const readable = Object.values(extracted).some(v => v && v !== "unreadable");
    if (!readable) {
      return new Response(JSON.stringify({ status: "unreadable", extracted, mismatches: [] }), { headers: { ...headers, "Content-Type": "application/json" } });
    }

    // ── The cross-check: document vs human ──
    const FIELD_MAP: Record<string, string> = {
      fittedModel: "model", acRatingKw: "ac_rating_kw", ratedCurrentA: "rated_current_a",
      typeTestCertRef: "cert_ref", serial: "serial", reciNumber: "reci_number",
    };
    const mismatches: Array<{ field: string; typed: string; read: string }> = [];
    for (const [typedKey, readKey] of Object.entries(FIELD_MAP)) {
      const t = (typed[typedKey] ?? "").trim();
      const r = (extracted[readKey] ?? "").trim();
      if (!t || !r || r === "unreadable") continue;
      const ok = NUMERIC.has(readKey) ? closeEnough(t, r) : softMatch(t, r);
      if (!ok) mismatches.push({ field: typedKey, typed: t, read: r });
    }

    log(FN, "info", "Artefact verified", { artefact, user: user.id, mismatches: mismatches.length });
    return new Response(JSON.stringify({ status: mismatches.length ? "mismatch" : "ok", extracted, mismatches }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    log(FN, "error", "Unhandled", { error: String(e) });
    return errorResponse(500, "Verification failed — the gate still works by hand", headers);
  }
});
