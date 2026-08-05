/**
 * brain — ONE front door to the platform's intelligence (Cal, 5 Aug: "is the
 * brain actually a brain for the whole system, tied to the coach and all POVs?").
 *
 * Yes — through here. One call, any point of view:
 *
 *   ask('customer',   { lead, question })   → customerBrain (guardrails → taught
 *                                             FAQ → grounded answer → scrub → learn)
 *   ask('consultant', { question })         → coachBrain (pipeline intelligence)
 *   ask('installer',  { question })         → coachBrain (jobs/BOM/route/serials)
 *   ask('owner'|'admin', { question })      → coachBrain (book-level reads)
 *
 * Every POV stands on the SAME grounding: dealIntel signals, the ONE quote
 * engine, the live SEAI grant record, the tenant's taught knowledge. The same
 * knowledge the customer hears softly is what the coach cites to staff — one
 * truth, different voices.
 *
 * WORKS WITHOUT AI — this whole layer is deterministic (the trustworthy floor).
 * The optional LLM voice (owner's BYO key via AI Config) sits ON TOP through
 * llmVoice.polish(): it rephrases, it never invents facts, and when it's off,
 * unpaid, or unreachable the floor answers verbatim. See llmVoice.ts.
 */
import type { DummyLead } from './dummyData';
import { askBrain, liveSuggestions, type BrainAnswer } from './customerBrain';
import { coachAnswer, coachBriefing, COACH_PROMPTS } from './coachBrain';
import type { CoachRole } from './aiCoach';
import { getKnowledge } from './brainKnowledge';

export type BrainPOV = CoachRole; // 'customer' | 'consultant' | 'installer' | 'owner' | 'admin'

export interface BrainRequest {
  question: string;
  /** The one lead in scope — REQUIRED for the customer POV (their project IS the scope). */
  lead?: DummyLead;
}

export interface BrainReply {
  text: string;
  /** Customer-side only: the escalation the caller should notify() on. */
  escalation?: BrainAnswer['escalation'];
  actions?: Array<{ label: string; route: string }>;
}

/** The one ask. */
export function ask(pov: BrainPOV, req: BrainRequest): BrainReply {
  if (pov === 'customer') {
    if (!req.lead) return { text: 'Once your project is set up I can answer anything about it here.' };
    const a = askBrain(req.lead, req.question);
    return { text: a.text, escalation: a.escalation };
  }
  // Staff POVs: the coach, with the tenant's taught knowledge available to cite.
  const a = coachAnswer(pov, req.question);
  return { text: a.text, actions: a.actions };
}

/** The opening line per POV (the coach panel's greeting). */
export function briefing(pov: BrainPOV): BrainReply {
  const b = coachBriefing(pov);
  return { text: b.text, actions: b.actions };
}

/** Prompt chips per POV — customer chips are demand-shaped (most-asked first). */
export function prompts(pov: BrainPOV, lead?: DummyLead): string[] {
  if (pov === 'customer' && lead) return liveSuggestions(lead);
  return COACH_PROMPTS[pov] ?? [];
}

/** The taught knowledge, for any surface that wants to cite it. */
export { getKnowledge };
