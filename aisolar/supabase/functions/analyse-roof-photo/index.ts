/**
 * analyse-roof-photo — SURVEY-PHOTO INTELLIGENCE (Cal / AI_WORTH #5).
 *
 * The AI as a second pair of eyes on the roof, at the survey — not the designer.
 * The surveyor points the model at a roof photo; it reads orientation, an
 * approximate pitch, the shading picture and any obstructions (chimney, vent,
 * rooflight, dormer) so the design isn't built for a roof that isn't there.
 *
 * Same law as verify-artefact: it SUGGESTS, the surveyor confirms. No AI key →
 * honest { status: "no_ai" }; unreadable image → "unreadable", never a
 * confident wrong read. Staff JWT only.
 *
 * Input:  { imageDataUrl: string }
 * Output: { status: 'ok'|'unreadable'|'no_ai'|'error',
 *           read: { orientation?, pitch_estimate?, shading?, obstructions?: string[], note? } }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders, log, errorResponse } from "../_shared/auth.ts";

const FN = "analyse-roof-photo";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const VISION_MODEL = "google/gemini-2.5-flash";

const PROMPT = `This is a photo of a house roof taken during a solar site survey in Ireland. Read ONLY what is visible and answer with a flat JSON object:
- orientation: the compass direction the main roof face points (e.g. "south", "south-west", "east") if it can be judged, else "unreadable"
- pitch_estimate: an approximate roof pitch in degrees as a string (e.g. "30", "35"), else "unreadable"
- shading: one of "none" | "light" | "moderate" | "heavy" — from trees, buildings or other obstructions casting on the roof
- obstructions: an array of what sits ON the roof face that a panel layout must avoid (e.g. ["chimney","vent pipe","rooflight","dormer"]) — empty array if none
- note: one short sentence flagging anything a designer should know (e.g. "large chimney mid-roof splits the usable area"), else ""
Never guess. If the image is not a usable roof photo, set every field to "unreadable" / [].`;

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  try {
    if (req.method !== "POST") return errorResponse(405, "Method not allowed", headers);

    // Staff JWT only.
    const authHeader = req.headers.get("Authorization") ?? "";
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return errorResponse(401, "Sign in required", headers);

    const { imageDataUrl } = await req.json();
    if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
      return errorResponse(400, "imageDataUrl must be an image data URL", headers);
    }
    if (imageDataUrl.length > 8_000_000) return errorResponse(413, "Image too large — retake at lower resolution", headers);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfgRows } = await service.from("ai_config").select("key, value");
    const cfg = Object.fromEntries((cfgRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const apiKey = cfg["openrouter_api_key"];
    const llmEnabled = cfg["llm_enabled"] !== "false";
    if (!apiKey || !llmEnabled) {
      return new Response(JSON.stringify({ status: "no_ai", read: {} }), { headers: { ...headers, "Content-Type": "application/json" } });
    }

    const resp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0,
        max_tokens: 300,
        messages: [
          { role: "system", content: "You read solar site-survey roof photos. Answer ONLY with the requested flat JSON. Never guess; use \"unreadable\" when unsure." },
          { role: "user", content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ] },
        ],
      }),
    });
    if (!resp.ok) {
      log(FN, "error", "OpenRouter error", { status: resp.status });
      return new Response(JSON.stringify({ status: "unreadable", read: {} }), { headers: { ...headers, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let read: Record<string, unknown> = {};
    try { read = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { /* fall through */ }
    const usable = Object.entries(read).some(([k, v]) => k !== "obstructions" && v && v !== "unreadable");
    if (!usable) {
      return new Response(JSON.stringify({ status: "unreadable", read }), { headers: { ...headers, "Content-Type": "application/json" } });
    }

    log(FN, "info", "Roof photo read", { user: user.id, orientation: read.orientation, shading: read.shading });
    return new Response(JSON.stringify({ status: "ok", read }), { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (e) {
    log(FN, "error", "Unhandled", { error: String(e) });
    return errorResponse(500, "Read failed — the survey still works by hand", headers);
  }
});
