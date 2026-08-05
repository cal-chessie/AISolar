/**
 * brainGuardrails — the walls around the brain (Cal, 5 Aug: "guardrails on the
 * customer side and the consultant's side so no business or personal data can
 * leak").
 *
 * Three walls:
 *  1. CUSTOMER INPUT SCOPE — the portal AI answers about THEIR project only.
 *     Questions fishing for business internals (margins, other customers, what
 *     someone else paid, staff details, pipeline) get a polite scope refusal and
 *     never touch the data layer. This is L4 from the sprint law, deterministic.
 *  2. CUSTOMER OUTPUT SCRUB — belt-and-braces on everything the customer-facing
 *     AI says: engagement surveillance ("opened 4×"), lead scores, margins and
 *     internal agent names must never surface, even if a future data path leaks
 *     one into a template.
 *  3. OUTBOUND DRAFT SCRUB — a suggested reply the consultant sends TO a
 *     customer is cleaned the same way: the human can type what they like, but
 *     the machine never DRAFTS surveillance or internals into their mouth.
 *
 * The same scope rules are exported as SYSTEM RULES for the LLM voice layer at
 * deploy — one law for the deterministic floor and the model on top.
 */
import { getTenantBrand } from '@/lib/tenantBrand';

/* ── 1 · customer input scope ────────────────────────────────────────────── */
const OUT_OF_SCOPE: Array<{ rx: RegExp; why: string }> = [
  { rx: /other (customer|client|people|home)|someone else|neighbour.*(paid|price|quote)|what.*(did|do).*(they|others|other people).*(pay|get)/i, why: 'other-customers' },
  { rx: /\b(margin|markup|mark-up|profit|wholesale|cost price|trade price|buy.*(panels|inverter).*for)\b/i, why: 'margins' },
  { rx: /\b(pipeline|leads?\b|conversion|close rate|how many (customers|sales|installs))\b/i, why: 'pipeline' },
  { rx: /(staff|employee|installer|consultant).*(salary|wage|paid|earn|phone|address|email)/i, why: 'staff-pii' },
  { rx: /\b(discount|deal|price).*(other|else|neighbour|friend|different)/i, why: 'other-pricing' },
  { rx: /(password|login|credential|api key|database|admin)/i, why: 'system' },
];

export interface ScopeCheck { ok: boolean; refusal?: string; why?: string; }

/** Is this question inside the customer's own project? */
export function customerScope(question: string): ScopeCheck {
  for (const { rx, why } of OUT_OF_SCOPE) {
    if (rx.test(question)) {
      return {
        ok: false, why,
        refusal: `That one's outside what I can share — I only talk about your own project here. On anything about your system, your money, your grant or your dates, ask away.`,
      };
    }
  }
  return { ok: true };
}

/* ── 2 + 3 · output scrubbing ────────────────────────────────────────────── */
/** Internal phrases that must never reach a customer, drafted OR generated. */
const INTERNAL_RX: Array<[RegExp, string]> = [
  [/\bopened (their |the |your )?proposal \d+×?\s*/gi, ''],           // engagement surveillance
  [/\bopened \d+×\s*/gi, ''],
  [/\b(lead )?score[:\s]+\d+\s*/gi, ''],
  [/\b(hot|warm|cold) lead\b/gi, ''],
  [/\b(margin|markup|cost price|trade price)\b[^.]*\./gi, ''],
  [/\b[A-Z][a-zA-Z]*Agent\b/g, '__BRAND__'],                          // GrantAgent, LeadIntakeAgent…
  [/\b(Drafter|Watchdog|Bookkeeper|Chaser|SurveyScheduler|InstallCoordinator)\b/g, '__BRAND__'],
];

/** Scrub text bound for a customer. White-labels internal agent names to the
 *  business name and strips surveillance/economics. Idempotent. */
export function scrubForCustomer(text: string): string {
  let out = text;
  for (const [rx, sub] of INTERNAL_RX) out = out.replace(rx, sub);
  const brandName = getTenantBrand().name;
  out = out.replace(/__BRAND__/g, brandName);
  return out.replace(/ {2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
}

/** Alias with intent: suggested replies drafted into the consultant's mouth. */
export const scrubOutboundDraft = scrubForCustomer;

/* ── The same law, written for the LLM layer (deploy-time system prompt) ── */
export const LLM_SCOPE_RULES = [
  'Answer ONLY about this customer\'s own project: their system, money, grant, dates, documents.',
  'Never reveal or discuss: other customers, anyone else\'s pricing, margins or cost prices, pipeline or sales data, staff personal details, system internals.',
  'Never mention engagement tracking (proposal opens, lead scores, hot/cold) to the customer.',
  'Speak as the business itself — never name internal agents or tools.',
  'Numbers come from the provided record only. If the record lacks it, say a human will confirm — never estimate money, dates or grant amounts.',
  'If asked something out of scope, decline briefly and return to their project.',
].join('\n');
