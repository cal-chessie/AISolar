/**
 * coachBrain — what makes the AI Coach actually useful (Cal: "easily talk to
 * and prompt platform intelligence and actually teach with accurate help and
 * direction").
 *
 * This is NOT an LLM guessing. It answers off the real book of business — the
 * leads, their stage, the bottleneck (leadIntel) and the engagement signal
 * (leadEngagement, "opened 4×"). So when a consultant asks "who's my hottest
 * lead?" or "what's James doing?", the answer is grounded in what's actually
 * happening. At launch this same intent layer front-runs an LLM call (the
 * COACH_SYSTEM_PROMPTS give it voice); the deterministic answers below stay as
 * the trustworthy floor.
 */
import { generateDummyLeads, type DummyLead } from './dummyData';
import { leadIntel } from './consultantIntelligence';
import { leadEngagement } from './engagement';
import { selfConsumptionFromOccupancy } from './leadIntake';
import { getProduct } from '@/config/productCatalog';
import type { CoachRole } from './aiCoach';

export interface CoachAnswer {
  text: string;
  actions?: Array<{ label: string; route: string }>;
}

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const first = (l: DummyLead) => l.name.split(' ')[0];

/** Starter questions shown as chips — the fastest way in. */
export const COACH_PROMPTS: Record<CoachRole, string[]> = {
  consultant: ['Who\'s my hottest lead?', 'What\'s slipping?', 'What should I do next?', 'How\'s my pipeline?'],
  owner: ['How\'s the team doing?', 'Where\'s the bottleneck?', 'What\'s my pipeline worth?'],
  admin: ['What\'s broken?', 'Where\'s the drop-off?', 'Who\'s overloaded?'],
  installer: ['What\'s on today?', 'What needs photos?', 'Any ELS tests due?'],
  customer: ['What happens next?', 'When\'s my install?', 'What do you need from me?'],
};

/** The live one-line situation — used as the opening line of the coach. */
export function coachBriefing(role: CoachRole): CoachAnswer {
  if (role !== 'consultant' && role !== 'owner') {
    return { text: 'Ask me anything about your work — I read the live pipeline, so I can point you at exactly what needs you.' };
  }
  const leads = generateDummyLeads();
  const active = leads.filter(l => l.proposal || ['new', 'intake_complete', 'survey_scheduled', 'survey_complete', 'proposal_drafted'].includes(l.workflow_stage));
  const hot = leads.filter(l => leadEngagement(l).warmth === 'hot');
  const stale = leads.filter(l => leadIntel(l).isStale);
  const topHot = hot.sort((a, b) => leadEngagement(b).views - leadEngagement(a).views)[0];

  const bits: string[] = [];
  if (topHot) {
    const e = leadEngagement(topHot);
    bits.push(`**${first(topHot)}** has opened their proposal **${e.views}×** and hasn't signed — that's your next call.`);
  }
  if (stale.length) bits.push(`${stale.length} lead${stale.length > 1 ? 's are' : ' is'} going stale on your side.`);
  bits.push(`${active.length} active in the pipeline.`);

  return {
    text: `Here's where you stand right now:\n\n${bits.map(b => `• ${b}`).join('\n')}\n\nAsk me who to call, what's stuck, or about any client by name.`,
    actions: topHot ? [{ label: `Open ${first(topHot)}`, route: '/consultant' }] : undefined,
  };
}

/** Answer a free-text question, grounded in the real leads. */
export function coachAnswer(role: CoachRole, qRaw: string): CoachAnswer {
  const q = qRaw.toLowerCase().trim();
  const leads = generateDummyLeads();

  // 1) A specific client by name — the richest answer.
  const named = leads.find(l => {
    const fn = l.name.split(' ')[0].toLowerCase();
    const ln = l.name.split(' ').slice(-1)[0].toLowerCase();
    return q.includes(l.name.toLowerCase()) || (fn.length > 2 && q.includes(fn)) || (ln.length > 3 && q.includes(ln));
  });
  if (named) return aboutLead(named);

  // 2) Engagement — who's keen / opened / viewed / hot
  if (/(hot|keen|warm|engag|open|view|read|interest)/.test(q)) {
    const ranked = leads
      .map(l => ({ l, e: leadEngagement(l) }))
      .filter(x => x.e.views > 0)
      .sort((a, b) => b.e.views - a.e.views);
    if (!ranked.length) return { text: 'Nobody\'s opened a document yet. As soon as a customer opens their proposal, I\'ll flag it here — repeat opens are your strongest buying signal.' };
    const lines = ranked.slice(0, 4).map(({ l, e }) => `• **${l.name}** — opened ${e.views}× (last ${e.lastViewedLabel})`);
    const top = ranked[0];
    return {
      text: `Your most engaged customers:\n\n${lines.join('\n')}\n\n**${first(top.l)}** is the one to call — ${top.e.views} opens means they're weighing it up right now.`,
      actions: [{ label: `Open ${first(top.l)}`, route: '/consultant' }],
    };
  }

  // 3) Stale / slipping / chase / follow-up
  if (/(stale|slip|chase|follow|neglect|forgot|cold|behind|overdue)/.test(q)) {
    const stale = leads.map(l => ({ l, i: leadIntel(l) })).filter(x => x.i.isStale).sort((a, b) => b.i.daysSinceContact - a.i.daysSinceContact);
    if (!stale.length) return { text: 'Nothing\'s gone stale on your side — every ball in your court has moved in the last few days. Nice.' };
    const lines = stale.slice(0, 4).map(({ l, i }) => `• **${l.name}** — ${i.stageLabel}, ${i.daysSinceContact}d quiet. ${i.nextAction}`);
    return { text: `These are slipping — the ball's with you:\n\n${lines.join('\n')}`, actions: [{ label: 'Open pipeline', route: '/consultant' }] };
  }

  // 4) Bottleneck / stuck / holdup
  if (/(stuck|holdup|hold up|bottleneck|blocked|waiting|why.*not)/.test(q)) {
    const withHoldup = leads.filter(l => l.proposal || l.workflow_stage !== 'new');
    const lines = withHoldup.slice(0, 4).map(l => { const i = leadIntel(l); return `• **${first(l)}** — ${i.holdup}`; });
    return { text: `Where deals are sitting:\n\n${lines.join('\n')}\n\nAsk me about any of them by name for the next step.` };
  }

  // 5) Pipeline / value / forecast / how am I doing
  if (/(pipeline|worth|value|forecast|target|revenue|how.*doing|number|total)/.test(q)) {
    const withProposal = leads.filter(l => l.proposal);
    const value = withProposal.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0);
    const signed = leads.filter(l => l.contract).length;
    const awaiting = leads.filter(l => l.workflow_stage === 'proposal_sent').length;
    return { text: `Your pipeline:\n\n• ${eur(value)} across ${withProposal.length} live proposals\n• ${awaiting} sent, awaiting a decision\n• ${signed} signed\n\nThe fastest lift is the sent-but-unsigned ones — want me to rank them by how engaged they are?` };
  }

  // 5.5) Pitch / how to sell / angle / objection — the higher-level play.
  // The lead cards and proposal show the WHAT; this is the HOW, one level up.
  if (/(pitch|sell|angle|approach|objection|talk track|script|how.*win|how.*close)/.test(q)) {
    const generic = `**The play that's converting right now:**\n\n1. **Open on their roof, from above.** Their own house, so the quote stops being an average home's and starts being theirs.\n2. **Read their bill back.** Day/night split, their unit rate. Ask which other quote opened the bill.\n3. **Walk the gear as products.** Warranty and monitoring first, brand names second.\n4. **Tie the savings to how they live.** Occupancy sets self-consumption, which is why the number is theirs, not a default.\n5. **Price last.** After all that, the net cost reads as fair, not high.`;
    const hot = leads.map(l => ({ l, e: leadEngagement(l) })).filter(x => x.e.warmth === 'hot').sort((a, b) => b.e.views - a.e.views)[0];
    if (hot) return { text: `${generic}\n\nRun it on **${first(hot.l)}** first. ${hot.e.views} opens, warmest lead you've got.`, actions: [{ label: `Open ${first(hot.l)}`, route: '/consultant' }] };
    return { text: generic };
  }

  // 6) Next / focus / priority / what should I do
  if (/(next|focus|priority|prioritise|what.*do|where.*start|first)/.test(q)) {
    const hot = leads.map(l => ({ l, e: leadEngagement(l), i: leadIntel(l) })).filter(x => x.e.warmth === 'hot').sort((a, b) => b.e.views - a.e.views)[0];
    if (hot) return { text: `Call **${first(hot.l)}** first. They've opened their proposal ${hot.e.views}× and haven't signed — hottest lead you've got, and every day cools it. ${hot.i.nextAction}`, actions: [{ label: `Open ${first(hot.l)}`, route: '/consultant' }] };
    const stale = leads.map(l => ({ l, i: leadIntel(l) })).filter(x => x.i.isStale)[0];
    if (stale) return { text: `Start with **${first(stale.l)}** — ${stale.i.daysSinceContact}d quiet and the ball's with you. ${stale.i.nextAction}`, actions: [{ label: `Open ${first(stale.l)}`, route: '/consultant' }] };
    return { text: 'Nothing urgent is flashing — pipeline\'s healthy. Good moment to work your top-of-funnel or book surveys.' };
  }

  // 7) Fallback — teach what I can do
  return {
    text: 'I read the live pipeline, so I can be specific. Try:\n\n• "Who\'s my hottest lead?" — ranked by how often they\'ve opened their proposal\n• "What\'s slipping?" — deals going stale on your side\n• "What\'s stuck?" — the bottleneck on each\n• Or just name a client — "what\'s the story with James?"',
  };
}

/** The deep read on one client — stage, engagement, holdup, next step. */
function aboutLead(l: DummyLead): CoachAnswer {
  const i = leadIntel(l);
  const e = leadEngagement(l);
  const engLine = e.views > 0
    ? `They've opened their documents **${e.views}×** (last ${e.lastViewedLabel}) — ${e.warmth === 'hot' ? 'very warm' : 'engaged'}.`
    : e.warmth === 'cold' ? 'They haven\'t opened what you sent yet.' : '';
  const play = sellStrategy(l);
  return {
    text: `**${l.name}** — ${i.stageLabel}.\n\n${i.holdup}${engLine ? `\n\n${engLine}` : ''}${play ? `\n\n${play}` : ''}\n\n**Next:** ${i.nextAction}`,
    actions: [{ label: `Open ${first(l)}`, route: '/consultant' }],
  };
}

/**
 * sellStrategy — the higher-level angle for ONE lead. The proposal shows the
 * numbers; this tells the consultant how to walk them, read off the occupancy
 * (same self-consumption maths as the proposal, so they never contradict) and
 * the gear on file. The play, not the data.
 */
function sellStrategy(l: DummyLead): string | null {
  const p = l.proposal;
  if (!p) return null;
  const sc = selfConsumptionFromOccupancy({
    occupants: l.survey?.household_occupants,
    homeDuringDay: l.survey?.home_during_day,
    hasBattery: !!p.battery_model,
  });
  const pct = Math.round(sc * 100);
  const panel = getProduct(p.panel_model, 'panel');
  const monitoring = /solaredge/i.test(p.inverter_model ?? '') ? ' and per-panel monitoring' : '';
  const angle = l.survey?.home_during_day === 'out'
    ? 'they\'re out most of the day, so lead with the battery carrying the day\'s sun to the evening, not raw panel savings'
    : l.survey?.home_during_day === 'usually'
      ? 'someone\'s usually home, so lead with the yearly bill saving, because the roof replaces expensive daytime units'
      : 'day use is balanced, so lead with the yearly saving and offer the battery as evening cover, not the headline';
  return `**Your angle:** open on their roof from above, then walk the gear as products, leading with the ${panel?.warrantyYears ?? 25}-year panel warranty${monitoring}, brand second. On the money, ${angle} (about **${pct}%** used at home). Price last.`;
}
