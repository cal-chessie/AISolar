/**
 * consultantIntelligence — the "what's the holdup?" engine (Cal: the documents
 * section should tell the consultant the bottleneck for THIS client and offer
 * to update them, instead of a redundant Print/Download).
 *
 * Accurate, not vibes: everything is derived from the lead's real workflow_stage,
 * its proposal/invoice/assignment state and the age of the last touchpoint. No
 * LLM guess — this is direction the consultant can trust at a glance.
 */
import type { DummyLead } from './dummyData';

export type WaitingParty = 'customer' | 'consultant' | 'installer' | 'agent' | 'authority';


export interface LeadIntel {
  stageLabel: string;        // human name for the stage
  holdup: string;            // what's actually blocking, in plain words
  waitingOn: WaitingParty;   // who the ball is with
  daysSinceContact: number;  // staleness from the last touchpoint
  isStale: boolean;          // >4 days and the ball is on our side
  nextAction: string;        // the single next thing to do
  customerUpdate: string;    // a ready-to-send snapshot of where they are
}

const WAITING_LABEL: Record<WaitingParty, string> = {
  customer: 'the customer',
  consultant: 'you',
  installer: 'the installer',
  agent: 'an agent',
  authority: 'SEAI / ESB',
};

type StageMeta = {
  label: string;
  waitingOn: WaitingParty;
  holdup: string;
  next: string;
  /** update template — {name} is filled with the customer's first name */
  update: string;
};

// The full pipeline, stage → meaning. Order matches dummyData's progression.
const STAGE: Record<string, StageMeta> = {
  new: {
    label: 'Bill received', waitingOn: 'agent',
    holdup: 'The bill just landed — the intake agent is reading it.',
    next: 'Check the intake read looks right, then book the survey.',
    update: 'Hi {name}, we\'ve received your bill and we\'re analysing it now — I\'ll be back to you shortly with next steps.',
  },
  intake_complete: {
    label: 'Analysis done', waitingOn: 'consultant',
    holdup: 'Analysis is done but the site survey isn\'t booked.',
    next: 'Book the site survey.',
    update: 'Hi {name}, your bill analysis is complete — the next step is to book your site survey. What days suit you?',
  },
  survey_scheduled: {
    label: 'Survey booked', waitingOn: 'installer',
    holdup: 'Survey is booked but not yet done.',
    next: 'Nothing needed — the surveyor attends. Chase only if the date has passed.',
    update: 'Hi {name}, your survey is booked in — our surveyor will confirm the timing and see you then.',
  },
  survey_complete: {
    label: 'Survey complete', waitingOn: 'consultant',
    holdup: 'Survey is in but the proposal hasn\'t been drafted.',
    next: 'Draft the proposal, or let the agent draft it for your review.',
    update: 'Hi {name}, your survey\'s complete — we\'re building your custom proposal now and it\'ll be with you soon.',
  },
  proposal_drafted: {
    label: 'Proposal drafted', waitingOn: 'consultant',
    holdup: 'A draft is ready for your review but hasn\'t been sent.',
    next: 'Review the draft and send it to the customer.',
    update: 'Hi {name}, your proposal is ready — I\'ll send it over for you to look through shortly.',
  },
  proposal_sent: {
    label: 'Proposal sent', waitingOn: 'customer',
    holdup: 'Proposal is with the customer — awaiting their decision.',
    next: 'Follow up and answer any questions.',
    update: 'Hi {name}, just checking in on your solar proposal — happy to walk through any part of it or answer questions.',
  },
  approved: {
    label: 'Contract signed', waitingOn: 'customer',
    holdup: 'Signed, but the deposit isn\'t paid yet. The grant application has started.',
    next: 'Send or confirm the deposit link to lock the install slot.',
    update: 'Hi {name}, thanks for signing! The next step is the deposit — that locks in your installation slot and we take it from there.',
  },
  deposit_paid: {
    label: 'Deposit paid', waitingOn: 'agent',
    holdup: 'Deposit is in but the install isn\'t scheduled.',
    next: 'Schedule the installation.',
    update: 'Hi {name}, your deposit is received — we\'re scheduling your installation now and will confirm the date.',
  },
  install_scheduled: {
    label: 'Install booked', waitingOn: 'installer',
    holdup: 'Install is scheduled — not yet done.',
    next: 'Nothing needed — the crew attends on the day.',
    update: 'Hi {name}, your install is booked in — the crew will be in touch before the day with everything you need.',
  },
  installing: {
    label: 'Installing', waitingOn: 'installer',
    holdup: 'Crew is on site.',
    next: 'Await completion, photos and certs.',
    update: 'Hi {name}, your system is being installed today — nearly there!',
  },
  installed: {
    label: 'Installed', waitingOn: 'authority',
    holdup: 'Installed — grant/ESB paperwork and final invoice still to close.',
    next: 'File the certs, submit the grant, send the final invoice.',
    update: 'Hi {name}, your system is in! We\'re finishing the grant paperwork and ESB registration now — nothing needed from you.',
  },
  final_paid: {
    label: 'Complete', waitingOn: 'authority',
    holdup: 'Paid in full — grant finalising.',
    next: 'Close out once the grant lands.',
    update: 'Hi {name}, all done and paid — your grant is being finalised. Welcome to solar!',
  },
  completed: {
    label: 'Closed', waitingOn: 'authority',
    holdup: 'Nothing outstanding.',
    next: 'Closed — no action.',
    update: 'Hi {name}, everything\'s wrapped up. Thanks for going solar with us — reach out any time.',
  },
};

const FALLBACK: StageMeta = {
  label: 'In progress', waitingOn: 'consultant',
  holdup: 'This lead is mid-pipeline.',
  next: 'Open the client in LeadFlow to see the next step.',
  update: 'Hi {name}, quick update — your project is progressing and I\'ll be in touch with the next step.',
};

function firstName(lead: DummyLead): string {
  return lead.name.split(' ')[0] || 'there';
}

/** Days since the most recent touchpoint (either direction). */
function daysSinceContact(lead: DummyLead): number {
  const times = (lead.touchpoints ?? []).map(t => new Date(t.timestamp).getTime()).filter(n => !isNaN(n));
  if (times.length === 0) return 0;
  const last = Math.max(...times);
  return Math.max(0, Math.round((Date.now() - last) / 86_400_000));
}

/** The full read on a single lead — what's the holdup and what to do. */
export function leadIntel(lead: DummyLead): LeadIntel {
  const meta = STAGE[lead.workflow_stage] ?? FALLBACK;
  const days = daysSinceContact(lead);
  const name = firstName(lead);

  // Enrich the two stages where the customer's behaviour changes the read.
  let holdup = meta.holdup;
  let next = meta.next;
  if (lead.workflow_stage === 'proposal_sent') {
    const opens = (lead.touchpoints ?? []).filter(t => t.direction === 'inbound' && /open/i.test(t.summary)).length;
    if (opens >= 2) {
      holdup = `Proposal opened ${opens}× but not signed — warm, needs a nudge.`;
      next = `Call ${name} while it's hot — they're clearly weighing it up.`;
    }
  }
  if (lead.workflow_stage === 'approved' && lead.invoice && !lead.invoice.deposit_paid) {
    holdup = 'Contract signed but deposit unpaid — the install can\'t be scheduled until it clears.';
  }

  // Stale only counts when the ball is on OUR side of the net.
  const oursToMove = meta.waitingOn === 'consultant' || meta.waitingOn === 'agent';
  const isStale = oursToMove && days > 4;

  // NOTE (reverted 4 Aug): an earlier attempt overrode next/holdup with
  // dealIntel.nextMove here. It made the guidance IRRATIONAL — nextMove's
  // staleness rule fired "chase them" even when the ball was with the surveyor
  // or the customer, contradicting this stage's real waitingOn. The careful
  // per-stage read below is the trustworthy source; dealIntel drives the COACH
  // + owner gates, not this per-lead document intelligence.

  return {
    stageLabel: meta.label,
    holdup,
    waitingOn: meta.waitingOn,
    daysSinceContact: days,
    isStale,
    nextAction: next,
    customerUpdate: meta.update.replace('{name}', name),
  };
}

export function waitingLabel(w: WaitingParty): string {
  return WAITING_LABEL[w];
}
