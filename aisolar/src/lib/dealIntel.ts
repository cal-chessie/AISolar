/**
 * dealIntel — the coach that actually KNOWS the deal (Cal, 3 Aug: "reads this
 * lead's value, days-in-stage, opens, thread tone, what's blocking the pack,
 * and gives the human the ONE next move in their POV's voice").
 *
 * Deterministic-first, like everything here: every signal is computed from the
 * lead's real record — touchpoints, stage timestamps, proposal money, the NC6
 * completeness gate — so the coach's claims are checkable, not vibes. The LLM
 * (when enabled in AI Config) gets these signals as grounding and adds voice;
 * it never invents the facts.
 *
 * Three exports, three jobs:
 *   dealSignals(lead)      → the raw read of ONE deal
 *   nextMove(lead, role)   → THE one next move for this POV (ranked rules)
 *   aiReports(leads, role) → the live insight feed (coach bottom + owner gates)
 */
import type { DummyLead } from './dummyData';
import { getStage } from './leadIntake';
import { nc6Completeness } from './pdfFill';

export type CoachPOV = 'owner' | 'consultant' | 'installer' | 'customer' | 'admin';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
// Business names like "Ryan's SuperValu" would double-possess ("Ryan's's") — strip the trailing 's.
const first = (l: DummyLead) => l.name.split(' ')[0].replace(/'s$/, '');
const daysSince = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null);

export interface DealSignals {
  /** € on the table — proposal net, else the intake estimate's implied value. */
  value: number;
  stageLabel: string;
  /** Days since the last touchpoint (any direction). */
  lastTouchDays: number | null;
  /** Days the deal has sat at the CURRENT stage (best available: last stage-tagged touch). */
  daysInStage: number | null;
  /** How many times the customer opened the proposal. */
  proposalOpens: number;
  /** Did the customer ever write/act back, and how recently? */
  lastInboundDays: number | null;
  /** Crude but honest thread tone off the record: engaged / quiet / gone-cold. */
  tone: 'engaged' | 'quiet' | 'cold';
  /** What still blocks a filable NC6 for this job (install-phase only). */
  packBlockers: string[];
  hot: boolean;
}

export function dealSignals(lead: DummyLead): DealSignals {
  const tps = lead.touchpoints ?? [];
  const last = tps[tps.length - 1];
  const lastInbound = [...tps].reverse().find(t => t.direction === 'inbound');
  const stageTps = tps.filter(t => t.stage === lead.workflow_stage);
  const stageAnchor = stageTps[0] ?? last;

  const proposalOpens = tps.filter(t => /opened proposal/i.test(t.summary ?? '')).length;
  const lastTouchDays = daysSince(last?.timestamp);
  const lastInboundDays = daysSince(lastInbound?.timestamp);

  const tone: DealSignals['tone'] =
    lastInboundDays != null && lastInboundDays <= 2 ? 'engaged'
    : lastInboundDays != null && lastInboundDays <= 6 ? 'quiet'
    : 'cold';

  const installPhase = ['install_scheduled', 'installing', 'installed', 'final_paid'].includes(lead.workflow_stage);
  const packBlockers = installPhase ? nc6Completeness(lead).missing : [];

  return {
    value: lead.proposal?.net_cost ?? 0,
    stageLabel: getStage(lead.workflow_stage).label,
    lastTouchDays,
    daysInStage: daysSince(stageAnchor?.timestamp),
    proposalOpens,
    lastInboundDays,
    tone,
    packBlockers,
    hot: lead.score > 80,
  };
}

export interface Move {
  /** One sentence: do THIS. In the POV's voice. */
  action: string;
  /** One sentence: WHY — always citing the real signal it rests on. */
  reason: string;
  route: string;
  severity: 'now' | 'today' | 'soon';
  leadId: string;
  leadName: string;
}

/** THE one next move on a deal, for a POV. Ranked rules — first hit wins. */
export function nextMove(lead: DummyLead, role: CoachPOV): Move | null {
  const s = dealSignals(lead);
  const base = { leadId: lead.id, leadName: lead.name };

  // 1 · A blocked NC pack outranks everything — the paper trail is the business.
  if (s.packBlockers.length > 0 && role !== 'customer') {
    const item = s.packBlockers[0];
    return {
      // Straight to the commissioning gate — the tab where that field lives.
      ...base, severity: 'now', route: `/job/${lead.id}?tab=commissioning`,
      action: role === 'installer'
        ? `Close out ${first(lead)}'s NC6 gate — ${item.toLowerCase()} is still open.`
        : `${first(lead)}'s NC6 pack is blocked: ${item.toLowerCase()}.`,
      reason: `${s.packBlockers.length} item${s.packBlockers.length === 1 ? '' : 's'} still block a filable NC6 — nothing submits until they're closed.`,
    };
  }

  // 2 · Hot proposal being read RIGHT NOW — strike while they're looking.
  if (lead.workflow_stage === 'proposal_sent' && s.proposalOpens >= 2 && (s.lastTouchDays ?? 99) <= 1) {
    return {
      // Straight to the SEND step — the proposal, its opens, and the call button.
      ...base, severity: 'now', route: `/lead-flow/${lead.id}?step=send`,
      action: `Call ${first(lead)} now — the proposal's been opened ${s.proposalOpens}× and the last look was ${s.lastTouchDays === 0 ? 'today' : 'yesterday'}.`,
      reason: `${eur(s.value)} on the table and they're actively reading. This is the window.`,
    };
  }

  // 3 · Signed but no deposit — money agreed, not collected.
  if (lead.workflow_stage === 'approved' && (s.daysInStage ?? 0) >= 1) {
    return {
      // Straight to SEND — where the deposit link is issued.
      ...base, severity: 'today', route: `/lead-flow/${lead.id}?step=send`,
      action: `Send ${first(lead)} the deposit link again — signed ${s.daysInStage} day${s.daysInStage === 1 ? '' : 's'} ago, nothing paid.`,
      reason: `A signed job with no deposit is the easiest ${eur(Math.round(s.value * 0.3))} you'll collect today.`,
    };
  }

  // 4 · Proposal sent, gone quiet — the polite chase.
  if (lead.workflow_stage === 'proposal_sent' && s.tone !== 'engaged' && (s.lastTouchDays ?? 0) >= 3) {
    return {
      // Straight to SEND — the proposal + its engagement record.
      ...base, severity: 'today', route: `/lead-flow/${lead.id}?step=send`,
      action: `Follow up ${first(lead)} — ${s.lastTouchDays} days of silence on a ${eur(s.value)} proposal.`,
      reason: s.proposalOpens > 0
        ? `They opened it ${s.proposalOpens}× then went quiet — something in it needs talking through.`
        : `No opens recorded — it may never have landed. A call beats a resend.`,
    };
  }

  // 5 · Survey never booked on a live lead.
  if (['new', 'intake_complete'].includes(lead.workflow_stage) && (s.daysInStage ?? 0) >= 2) {
    return {
      // Straight to ESTIMATE — where "Book site survey" lives.
      ...base, severity: 'today', route: `/lead-flow/${lead.id}?step=estimate`,
      action: `Get ${first(lead)}'s survey booked — the lead is ${s.daysInStage} days old and nothing's scheduled.`,
      reason: 'Every day before the survey is a day another installer can knock.',
    };
  }

  // 6 · General staleness — keep the book warm.
  if ((s.lastTouchDays ?? 0) >= 5 && !['completed', 'final_paid'].includes(lead.workflow_stage)) {
    return {
      // Straight to the conversation — a stale lead needs a message, not a form.
      ...base, severity: 'soon', route: `/consultant?lead=${lead.id}`,
      action: `Touch base with ${first(lead)} — ${s.lastTouchDays} days without contact at ${s.stageLabel}.`,
      reason: 'Five quiet days is where deals start dying politely.',
    };
  }

  return null;
}

/**
 * callPrep — the 20-seconds-before-the-call read (Cal, 3 Aug / AI_WORTH #3).
 * Three lines a consultant can glance at as the phone rings: where the deal is,
 * the customer's own words on what's holding them, and the ONE number that
 * answers it. Deterministic — mined from the record, LLM only adds polish later.
 */
export interface CallPrep {
  where: string;      // situation, in €-and-days terms
  objection: string;  // their concern — their words where we have them
  answer: string;     // the number/fact that meets it
  fromTheir: boolean; // true = "objection" is the customer's actual message
}

const OBJECTION_HINTS = /expensive|cost|price|afford|cheaper|think|thinking|wait|unsure|not sure|hold|budget|quote|compare|competitor|another|dear|too much/i;

export function callPrep(lead: DummyLead): CallPrep {
  const s = dealSignals(lead);
  const tps = lead.touchpoints ?? [];
  // Their voice: the most recent inbound message that reads like a concern,
  // else the most recent inbound at all.
  const inbound = [...tps].reverse().filter(t => t.direction === 'inbound');
  const objectionTp = inbound.find(t => OBJECTION_HINTS.test(t.summary ?? '')) ?? inbound[0];
  const fromTheir = !!objectionTp && OBJECTION_HINTS.test(objectionTp.summary ?? '');

  const where = s.value
    ? `${s.stageLabel} · ${eur(s.value)} on the table${s.daysInStage != null ? ` · ${s.daysInStage} day${s.daysInStage === 1 ? '' : 's'} here` : ''}${s.proposalOpens ? ` · opened ${s.proposalOpens}×` : ''}.`
    : `${s.stageLabel}${s.daysInStage != null ? ` · ${s.daysInStage} day${s.daysInStage === 1 ? '' : 's'} here` : ''}.`;

  // Objection: their words if we have them; else the concern this stage usually carries.
  const STAGE_CONCERN: Record<string, string> = {
    proposal_sent: 'Price vs payback — is it worth it, and how soon does it pay back?',
    approved: 'Cold feet after signing — reassure on the install and the grant.',
    survey_complete: 'Will it actually suit my roof and my usage?',
    proposal_drafted: 'Wants the numbers before committing any time.',
  };
  const objection = fromTheir
    ? `"${(objectionTp!.summary ?? '').replace(/^[A-Za-z ]+:\s*/, '')}"`
    : (STAGE_CONCERN[lead.workflow_stage] ?? 'Keep it moving — confirm the next step and a date.');

  // The number that answers it — payback, saving, or grant, whichever lands.
  const p = lead.proposal;
  const answer = p
    ? [
        p.payback_years ? `${p.payback_years}-yr payback` : null,
        p.annual_savings ? `${eur(p.annual_savings)}/yr saved` : null,
        p.seai_grant ? `${eur(p.seai_grant)} SEAI grant already in the price` : null,
      ].filter(Boolean).slice(0, 2).join(' · ') || 'Their design is priced and grant-inclusive — lead with the net cost.'
    : 'No design on file yet — the call is to book the survey that makes the numbers real.';

  return { where, objection, answer, fromTheir };
}

export interface AIReport {
  severity: 'now' | 'today' | 'soon' | 'info';
  text: string;
  route?: string;
  leadId?: string;
}

/**
 * The live insight feed — every real thing the intelligence can currently see,
 * ranked. Powers the coach's "AI reports" section and the owner's NEEDS-YOU
 * gates. Pure function of the book; refreshes with every render of real data.
 */
export function aiReports(leads: DummyLead[], role: CoachPOV): AIReport[] {
  const reports: AIReport[] = [];

  // Per-deal moves (deduped: one per lead, already ranked inside nextMove)
  for (const lead of leads) {
    const m = nextMove(lead, role);
    if (m) reports.push({ severity: m.severity, text: `${m.action} ${m.reason}`, route: m.route, leadId: m.leadId });
  }

  // Book-level reads (owner/admin get the wide lens)
  if (role === 'owner' || role === 'admin') {
    const sent = leads.filter(l => l.workflow_stage === 'proposal_sent');
    const opened = sent.filter(l => dealSignals(l).proposalOpens > 0);
    if (sent.length > 0) {
      reports.push({
        severity: 'info',
        text: `${opened.length} of ${sent.length} live proposal${sent.length === 1 ? '' : 's'} ${sent.length === 1 ? 'has' : 'have'} been opened — ${eur(sent.reduce((t, l) => t + (l.proposal?.net_cost ?? 0), 0))} is out for decision.`,
      });
    }
    const blocked = leads.filter(l => dealSignals(l).packBlockers.length > 0);
    if (blocked.length > 0) {
      reports.push({
        severity: 'now',
        text: `${blocked.length} install${blocked.length === 1 ? '' : 's'} carry an incomplete NC6 pack — the paper trail closes before anything files.`,
        route: '/owner',
      });
    }
  }

  const rank = { now: 0, today: 1, soon: 2, info: 3 };
  return reports.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 12);
}
