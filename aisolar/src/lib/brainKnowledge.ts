/**
 * brainKnowledge — what the OWNER teaches the brain, plus what the brain learns
 * from being asked (Cal, 5 Aug: "somewhere for us to feed the AI with business
 * intelligent information that softly sells outcomes… the brain needs a
 * self-learning loop, and when it has the answer it should give it like FAQ").
 *
 * Two halves:
 *  1. KNOWLEDGE (owner-taught, per tenant): the business story, the edge, the
 *     current offer, and taught FAQ answers. Stored like every owner setting —
 *     localStorage now, dual-written to tenant_settings ('ai_knowledge') and
 *     hydrated on sign-in, so it's per-tenant and white-label by construction.
 *  2. THE ASK LOG (self-learning): every question the brain is asked is logged
 *     with its concern + whether it was answered. Unanswered questions surface
 *     to the owner in Settings; the owner writes the answer ONCE; from then on
 *     the brain answers it instantly, like an FAQ. Ask → miss → teach → know.
 *
 * Nothing here is sent anywhere without the owner writing it; the log is local
 * per tenant (+ the notify() row that already carries escalations to the bell).
 */
import { pushTenantSetting } from '@/lib/serverStore';

const KEY = 'aisolar_ai_knowledge';
const LOG_KEY = 'aisolar_ai_asklog';
const LOG_MAX = 200;

export interface TaughtFaq { q: string; a: string; }

export interface BrainKnowledge {
  /** Who you are, in a line or two — woven into early-stage answers. */
  businessStory: string;
  /** Why you over the next quote — the soft-sell line for objections. */
  edge: string;
  /** The current offer/hook, if any — mentioned once, never pushed. */
  offer: string;
  /** Owner-taught Q&As — answered instantly, like an FAQ. */
  faqs: TaughtFaq[];
}

const DEFAULTS: BrainKnowledge = { businessStory: '', edge: '', offer: '', faqs: [] };

export function getKnowledge(): BrainKnowledge {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

export function saveKnowledge(patch: Partial<BrainKnowledge>): BrainKnowledge {
  const next = { ...getKnowledge(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  pushTenantSetting('ai_knowledge', next); // dual-write → tenant_settings
  window.dispatchEvent(new CustomEvent('ai-knowledge-changed'));
  return next;
}

/* ── FAQ matching — token overlap, deterministic, no fuzz theatre ─────────── */
const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'does', 'i', 'my', 'me', 'you', 'we', 'it', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'what', 'whats', 'how', 'when', 'why', 'can', 'could', 'will', 'would', 'get', 'have', 'has', 'be', 'with', 'about']);
const tokens = (s: string) => s.toLowerCase().replace(/[^\w\s€]/g, '').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));

/** The taught answer for a question, if the owner has one. ≥60% of the taught
 *  question's meaningful words must appear — a real match, not a vibe. */
export function matchFaq(question: string): TaughtFaq | null {
  const qt = new Set(tokens(question));
  if (!qt.size) return null;
  let best: { faq: TaughtFaq; score: number } | null = null;
  for (const faq of getKnowledge().faqs) {
    const ft = tokens(faq.q);
    if (!ft.length) continue;
    const hit = ft.filter(w => qt.has(w)).length / ft.length;
    if (hit >= 0.6 && (!best || hit > best.score)) best = { faq, score: hit };
  }
  return best?.faq ?? null;
}

/* ── The ask log — the learning half ─────────────────────────────────────── */
export interface AskEntry {
  q: string;
  concern: string;
  /** false = the brain escalated (didn't have the answer) — the teach queue. */
  answered: boolean;
  at: string;
  count: number;
}

function readLog(): AskEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]'); } catch { return []; }
}
function writeLog(log: AskEntry[]) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-LOG_MAX))); } catch { /* ignore */ }
}

/** Record an ask. Same-question repeats bump the count (dedupe on tokens). */
export function logAsk(q: string, concern: string, answered: boolean): void {
  const log = readLog();
  const qt = tokens(q).join(' ');
  const same = log.find(e => tokens(e.q).join(' ') === qt);
  if (same) { same.count += 1; same.at = new Date().toISOString(); same.answered = same.answered && answered; }
  else log.push({ q, concern, answered, at: new Date().toISOString(), count: 1 });
  writeLog(log);
  window.dispatchEvent(new CustomEvent('ai-asklog-changed'));
}

/** Questions the brain COULDN'T answer, most-asked first — the teach queue. */
export function unansweredQuestions(): AskEntry[] {
  const taught = getKnowledge().faqs;
  return readLog()
    .filter(e => !e.answered)
    .filter(e => !taught.some(f => tokens(f.q).join(' ') === tokens(e.q).join(' ')))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

/** Teach an answer: writes the FAQ + clears the question from the miss queue. */
export function teachAnswer(q: string, a: string): void {
  const k = getKnowledge();
  saveKnowledge({ faqs: [...k.faqs, { q: q.trim(), a: a.trim() }] });
}

/** Most-asked questions — feeds the FAQ chips so real demand shapes the UI. */
export function topAsked(limit = 4): string[] {
  return readLog().sort((a, b) => b.count - a.count).slice(0, limit).map(e => e.q);
}
