/**
 * engagement — how the customer is actually behaving (Cal: "how many times the
 * estimate and proposal was viewed by the customer… add that sort of thing
 * everywhere on everything you can").
 *
 * A sent document that the customer keeps re-opening is the strongest buying
 * signal a consultant has. We read it off the real touchpoints (portal opens),
 * so it's true, not a guess. One helper, one badge, dropped on every surface
 * where a lead appears.
 */
import type { DummyLead } from './dummyData';

export type Warmth = 'hot' | 'warm' | 'cold' | 'none';

export interface LeadEngagement {
  views: number;             // total customer opens of their documents
  proposalViews: number;
  estimateViews: number;
  lastViewed: Date | null;
  lastViewedLabel: string;   // "6h ago" · "yesterday" · "3d ago" · ''
  warmth: Warmth;            // hot 3+ · warm 1–2 · cold sent-but-unopened · none not-sent
  signal: string;            // "Opened 4× · last 6h ago"
}

/** Relative time, short and human. */
export function ago(d: Date | null): string {
  if (!d) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  const wks = Math.round(days / 7);
  return `${wks}w ago`;
}

// Matches opened/opens/viewed/views/read — the word plus any suffix.
const OPEN_RE = /\b(open|view|read)\w*/i;

/** Has a document actually gone out to this customer yet? */
function documentSent(lead: DummyLead): boolean {
  const sentStages = ['proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'];
  return sentStages.includes(lead.workflow_stage) || lead.proposal?.status === 'presented' || lead.proposal?.status === 'approved';
}

export function leadEngagement(lead: DummyLead): LeadEngagement {
  const opens = (lead.touchpoints ?? []).filter(t =>
    t.direction === 'inbound' && (t.channel === 'portal' || t.channel === 'email') && OPEN_RE.test(t.summary),
  );
  const proposalViews = opens.filter(t => /proposal/i.test(t.summary)).length;
  const estimateViews = opens.filter(t => /estimate|analysis/i.test(t.summary)).length;
  const views = opens.length;

  const times = opens.map(t => new Date(t.timestamp).getTime()).filter(n => !isNaN(n));
  const lastViewed = times.length ? new Date(Math.max(...times)) : null;

  // "Sent but unopened" is only worth flagging while the deal is still waiting on
  // the customer's decision — past that (deposit paid, installing…) it's noise.
  const awaitingDecision = ['proposal_sent', 'approved'].includes(lead.workflow_stage);
  const sent = documentSent(lead);
  const warmth: Warmth = views >= 3 ? 'hot' : views >= 1 ? 'warm' : (sent && awaitingDecision) ? 'cold' : 'none';

  const signal =
    views > 0 ? `Opened ${views}×${lastViewed ? ` · last ${ago(lastViewed)}` : ''}`
    : sent ? 'Sent — not opened yet'
    : '';

  return { views, proposalViews, estimateViews, lastViewed, lastViewedLabel: ago(lastViewed), warmth, signal };
}
