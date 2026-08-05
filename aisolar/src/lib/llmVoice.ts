/**
 * llmVoice — the OPTIONAL voice layer on top of the deterministic brain
 * (Cal, 5 Aug: "this should be linked to the LLM and the owner's BYO keys —
 * and does it still work without AI?").
 *
 * The contract, in one line: THE FLOOR ANSWERS; THE MODEL ONLY REPHRASES.
 *
 * - WITHOUT AI: everything works. The brain's deterministic answer goes out
 *   verbatim. AI off in AI Config, no key, offline, fn not deployed, over the
 *   cost cap — all the same: the floor speaks. No feature depends on the model.
 * - WITH AI: the owner's BYO OpenRouter key lives in the `ai_config` table
 *   (admin-only RLS) and is read SERVER-SIDE by the `brain-voice` edge fn — the
 *   key never ships to a browser. The fn gets the floor's answer + the
 *   LLM_SCOPE_RULES and returns a warmer phrasing of the SAME content. Every
 *   number, date and claim comes from the floor; the model may not add facts.
 * - FAIL-SAFE: any error, timeout or odd-looking output → the floor's text,
 *   unchanged. polish() can only ever improve tone, never lose truth.
 */
import { supabase } from '@/integrations/supabase/client';

const TIMEOUT_MS = 3500;

/** Rephrase `text` in the tenant's voice via the brain-voice edge fn.
 *  Returns the input unchanged on ANY failure — the deterministic guarantee. */
export async function polish(text: string, opts: { pov: string; brandName?: string } = { pov: 'customer' }): Promise<string> {
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return text; // demo / signed out — floor only
    const result = await Promise.race([
      supabase.functions.invoke('brain-voice', { body: { text, pov: opts.pov, brandName: opts.brandName ?? null } }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS)),
    ]);
    const polished = (result as { data?: { text?: string } }).data?.text;
    // Guard the guard: a sane polish is non-empty, not wildly longer, and keeps
    // every € figure the floor stated (numbers are the floor's, full stop).
    if (!polished || typeof polished !== 'string') return text;
    if (polished.length > text.length * 2 + 200) return text;
    const eurs = text.match(/€[\d,.]+/g) ?? [];
    if (!eurs.every(v => polished.includes(v))) return text;
    return polished;
  } catch {
    return text;
  }
}
