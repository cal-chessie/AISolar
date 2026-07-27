/**
 * ownerStats — the ONE set of owner-level money definitions.
 *
 * OwnerCockpit's vitals and CeoWindow's analytics were each computing their own
 * versions (two different "conversion" formulas; "pipeline" that still counted
 * already-won jobs; "pending revenue" that counted unsent drafts). One module,
 * one definition per figure, both surfaces read it.
 *
 * Definitions (each traces to lead rows):
 * - revenueBanked:      net cost of jobs with the FINAL invoice paid. Cash in.
 * - depositsHeld:       deposits collected on jobs not yet final-paid.
 * - contractedBacklog:  the rest of the money on SIGNED jobs (won, not final-
 *                       paid, minus any deposit already held). Work sold, cash
 *                       still to collect — NOT pipeline.
 * - openPipeline:       net cost of proposals still IN PLAY (drafted/sent, not
 *                       yet won). The number sales can still win or lose.
 * - conversion:         won ÷ leads that got as far as a SENT proposal. A lead
 *                       created yesterday hasn't "failed to convert" yet, so it
 *                       is not in the denominator ("proposal → win").
 * - avgJob:             mean net cost of won jobs.
 * - outstandingAR:      invoiced money not yet in: balance on deposit-paid jobs.
 * - grantsInFlight:     SEAI grant € tracked on signed jobs not yet closed out.
 */
import type { DummyLead } from './dummyData';

export const WON_STAGES = ['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'] as const;
const PROPOSAL_OUT_STAGES = ['proposal_sent', ...WON_STAGES] as const;

export interface OwnerStats {
  revenueBanked: number;
  depositsHeld: number;
  contractedBacklog: number;
  openPipeline: number;
  openDeals: number;
  wonCount: number;
  proposalsOut: number;
  conversion: number;      // % — won / proposals sent (or beyond)
  avgJob: number;
  outstandingAR: number;
  grantsInFlight: number;
}

const depositOf = (l: DummyLead) =>
  l.invoice?.deposit_paid ? (l.invoice?.deposit_amount ?? Math.round((l.proposal?.net_cost ?? 0) * 0.3)) : 0;

export function computeOwnerStats(leads: DummyLead[]): OwnerStats {
  const isWon = (l: DummyLead) => (WON_STAGES as readonly string[]).includes(l.workflow_stage);
  const won = leads.filter(isWon);
  const finalPaid = leads.filter(l => l.invoice?.final_paid);

  const revenueBanked = finalPaid.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0);
  const depositsHeld = leads.filter(l => l.invoice?.deposit_paid && !l.invoice?.final_paid)
    .reduce((s, l) => s + (l.invoice?.deposit_amount ?? 0), 0);
  const contractedBacklog = won.filter(l => !l.invoice?.final_paid)
    .reduce((s, l) => s + Math.max(0, (l.proposal?.net_cost ?? 0) - depositOf(l)), 0);
  const openDealsList = leads.filter(l => l.proposal && !isWon(l));
  const openPipeline = openDealsList.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0);

  const proposalsOut = leads.filter(l => (PROPOSAL_OUT_STAGES as readonly string[]).includes(l.workflow_stage)).length;
  const conversion = proposalsOut ? Math.round((won.length / proposalsOut) * 100) : 0;
  const avgJob = won.length ? Math.round(won.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0) / won.length) : 0;

  const outstandingAR = leads.filter(l => l.invoice?.deposit_paid && !l.invoice?.final_paid)
    .reduce((s, l) => s + Math.max(0, (l.proposal?.net_cost ?? 0) - depositOf(l)), 0);
  const grantsInFlight = leads.filter(l => isWon(l) && !['final_paid', 'completed'].includes(l.workflow_stage))
    .reduce((s, l) => s + (l.proposal?.seai_grant ?? 0), 0);

  return {
    revenueBanked, depositsHeld, contractedBacklog, openPipeline,
    openDeals: openDealsList.length, wonCount: won.length, proposalsOut,
    conversion, avgJob, outstandingAR, grantsInFlight,
  };
}
