/**
 * brain-voice — the LLM voice layer over the deterministic brain (5 Aug).
 *
 * Contract: THE FLOOR ANSWERS; THE MODEL ONLY REPHRASES. The client sends the
 * deterministic answer; this fn rephrases it warmer in the tenant's voice and
 * may not add facts, numbers or promises. Any failure → the client keeps the
 * floor's text (llmVoice.polish guards it again on the way back).
 *
 * BYO key: the owner's OpenRouter key + model + system prefix live in the
 * `ai_config` table (admin-only RLS) — read here with the service role, NEVER
 * shipped to a browser. AI off / no key / no row → 'disabled', floor speaks.
 *
 * Deploy: supabase functions deploy brain-voice
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The same scope law the client enforces (brainGuardrails.LLM_SCOPE_RULES).
const SCOPE_RULES = [
  "Answer ONLY about this customer's own project.",
  "Never reveal: other customers, anyone else's pricing, margins, pipeline, staff details, system internals.",
  "Never mention engagement tracking (proposal opens, lead scores).",
  "Speak as the business itself — never name internal agents or tools.",
  "You are REPHRASING a factual answer. Keep EVERY number, date, name and claim exactly as given. Add nothing. Remove nothing material. Warmer, human, professional; Irish English; concise.",
].join("\n");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Any authenticated tenant user may polish (staff coach + portal alike);
    // customers are token-based today, so in practice this is staff-invoked.
    await requireRole(req, ["admin", "consultant", "installer", "customer"]);

    const { text, pov, brandName } = await req.json();
    if (!text || typeof text !== "string") throw new Error("no text");

    // ai_config is KEY-VALUE (the same rows the AI Config page writes).
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rows } = await supabase.from("ai_config").select("key, value")
      .in("key", ["openrouter_api_key", "openrouter_default_model", "enable_llm_calls"]);
    const cfg: Record<string, string> = {};
    for (const r of rows ?? []) cfg[r.key as string] = r.value as string;
    const enabled = cfg.enable_llm_calls !== "false" && !!cfg.openrouter_api_key;
    if (!enabled) {
      return new Response(JSON.stringify({ text, voice: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = cfg.openrouter_default_model || "google/gemini-2.5-flash";
    const system = `You speak for ${brandName || "the business"} to a ${pov === "customer" ? "customer" : "team member"}.\n${SCOPE_RULES}`;

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${cfg.openrouter_api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Rephrase this reply. Same facts, same numbers, warmer voice:\n\n${text}` },
        ],
      }),
    });
    if (!r.ok) throw new Error(`openrouter ${r.status}`);
    const out = await r.json();
    const polished = out?.choices?.[0]?.message?.content?.trim();

    return new Response(JSON.stringify({ text: polished || text, voice: polished ? "llm" : "floor" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Fail-safe shape: the caller falls back to the floor's text on any error.
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
