/**
 * inboxTriage — reads the last thing the customer said and tells the human what
 * it is + a first-draft reply (Cal / AI_WORTH #4: "every inbound classified…
 * with a drafted response waiting behind the human gate").
 *
 * Deterministic and honest: the class comes from the customer's actual words,
 * the draft is a STARTING POINT the consultant edits and sends — nothing here
 * ever sends on its own. When there's no inbound to read, it says "silence"
 * (the ball's with them or with us), never invents a message.
 */
import type { DummyLead } from './dummyData';
import { callPrep } from './dealIntel';
import { askBrain } from './customerBrain';

export type TriageKind = 'question' | 'objection' | 'booking' | 'complaint' | 'silence';

export interface Triage {
  kind: TriageKind;
  /** The customer's line we classified (empty for silence). */
  heard: string;
  /** A first-draft reply for the human to edit + send. */
  draft: string;
  /** Colour token for the list badge. */
  tone: 'tech' | 'pop' | 'doc-proposal' | 'doc-deposit' | 'muted';
}

const RX = {
  complaint: /unhappy|complaint|complain|wrong|delay|delayed|late|not working|doesn'?t work|fault|broken|issue|problem|disappoint|refund|angry|frustrat/i,
  booking: /\bbook|schedule|when can|what time|available|availabilit|come out|site visit|appointment|slot|arrange|pop out|call me/i,
  objection: /expensive|too much|cost|price|pricey|afford|cheaper|cheap|think about|thinking|need to think|wait|hold off|unsure|not sure|budget|competitor|another quote|shop around|dear\b|hesit/i,
  question: /\?|^(how|what|when|why|where|which|can i|could|do you|does it|will it|is there|are you)\b/i,
};

// System-generated events logged as customer touchpoints (opens, signatures,
// payments, reviews, uploads) are NOT messages to answer — they read as silence.
// Only genuine free-text the customer wrote gets triaged.
const SYSTEM_EVENT = /opened proposal|signed contract|payment received|deposit confirmed|stripe|uploaded|bill uploaded|left \d★|left \d+ ?star|review|marked .*on site|checklist|via landing page/i;

const LABEL: Record<TriageKind, string> = {
  question: 'Question', objection: 'Objection', booking: 'Booking', complaint: 'Complaint', silence: 'No reply',
};

export function triageLabel(k: TriageKind): string { return LABEL[k]; }

/** Strip an "Actor: " prefix some touchpoint summaries carry. */
const clean = (s: string) => s.replace(/^[A-Za-z][A-Za-z ]{1,20}:\s*/, '').trim();

export function triageInbound(lead: DummyLead): Triage {
  const first = lead.name.split(' ')[0].replace(/'s$/, '') || 'there';
  const tps = lead.touchpoints ?? [];
  const lastInbound = [...tps].reverse().find(t => t.direction === 'inbound' && t.actor === 'customer');
  const raw = lastInbound ? clean(lastInbound.summary ?? '') : '';
  // A system event (open/sign/pay/upload/review) is not a message to reply to.
  const heard = raw && !SYSTEM_EVENT.test(raw) ? raw : '';

  // No customer message to read → silence. Honest, not invented.
  if (!heard) {
    return {
      kind: 'silence', heard: '', tone: 'muted',
      draft: `Hi ${first}, just checking in — anything I can help with or any questions on your solar? Happy to jump on a quick call whenever suits.`,
    };
  }

  const prep = callPrep(lead); // gives us the number that answers an objection

  if (RX.complaint.test(heard)) {
    return {
      kind: 'complaint', heard, tone: 'pop',
      draft: `Hi ${first}, thanks for flagging this and apologies for the hassle — I'm on it personally. Let me look into exactly what's happened and I'll come straight back to you today with a clear answer and next step.`,
    };
  }
  if (RX.booking.test(heard)) {
    return {
      kind: 'booking', heard, tone: 'tech',
      draft: `Hi ${first}, happy to get that booked. I've a couple of slots that could work — what days generally suit you and I'll confirm one back that fits around you?`,
    };
  }
  if (RX.objection.test(heard)) {
    return {
      kind: 'objection', heard, tone: 'doc-proposal',
      draft: `Hi ${first}, completely fair to weigh it up. The quick version: ${prep.answer.toLowerCase()} — and the SEAI grant's already in the price. Happy to walk through the numbers on a short call so it's crystal clear before you decide anything.`,
    };
  }
  if (RX.question.test(heard)) {
    // The brain answers the question off the live record — the consultant's
    // draft arrives WITH the answer done, not an empty "let me check" (5 Aug
    // audit: the most common inbound kind got filler). Human edits + sends.
    // When the brain couldn't answer (it escalates), its copy says "I've told
    // your consultant" — nonsense in the consultant's own mouth, so fall back
    // to a plain opener for the human to finish.
    const brained = askBrain(lead, heard);
    return {
      kind: 'question', heard, tone: 'doc-deposit',
      draft: brained.escalation
        ? `Hi ${first}, good question — `
        : `Hi ${first}, ${brained.text.replace(/\*\*/g, '').replace(/\n+/g, ' ').trim()}`,
    };
  }
  // Understood inbound that isn't clearly any of the above → treat as a general reply.
  return {
    kind: 'question', heard, tone: 'doc-deposit',
    draft: `Hi ${first}, thanks for getting back to me. `,
  };
}
