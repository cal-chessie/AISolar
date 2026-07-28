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
import { selfConsumptionFromOccupancy, getStage } from './leadIntake';
import { getProduct } from '@/config/productCatalog';
import { computeBOM } from './bom';
import { optimiseRoute, coordsForAddress } from './routeOptimize';
import { monitoringAppForModel } from './monitoringHandoff';
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
  installer: ['What do I load?', 'What\'s my route?', 'Which serial do I record?', 'What\'s on handover?'],
  customer: ['What happens next?', 'When\'s my install?', 'What do you need from me?'],
};

/** The live one-line situation — used as the opening line of the coach. */
export function coachBriefing(role: CoachRole): CoachAnswer {
  if (role === 'installer') return installerBriefing();
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

  // The installer's world is installs, not the pipeline — its own brain.
  if (role === 'installer') return installerAnswer(q, leads);

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

/* ─────────────────────────── INSTALLER BRAIN ───────────────────────────────
 * The installer's day is INSTALLS, not the pipeline (surveys are the
 * consultant's — they never appear here). Grounded in the real jobs: today's
 * one install, the van BOM (bom.ts), the drive (routeOptimize), commissioning
 * serials + the NC6/NC7 flip, and handover/monitoring. Same truth-pass as the
 * rest — no fabricated stock/weather numbers, no "machine-verified" sign-off.
 * -------------------------------------------------------------------------- */

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return +d; };
const shortAddr = (l: DummyLead) => l.address.split(',').slice(-2).join(',').trim();
const fmtDay = (iso?: string) => iso
  ? new Date(iso).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' })
  : 'a day to be set';
const byDate = (a: DummyLead, b: DummyLead) =>
  +new Date(a.assignment?.scheduled_date ?? 0) - +new Date(b.assignment?.scheduled_date ?? 0);

/** The installer's job pools — mirrors InstallerPortalV5 so the coach and the
 *  app never disagree. Scheduled installs, fitted-awaiting-handover, and the
 *  won-but-undated queue (approved / deposit_paid, no install date yet). */
function installerJobs(leads: DummyLead[]) {
  const scheduled = leads.filter(l => l.assignment && ['install_scheduled', 'installing'].includes(l.workflow_stage));
  const handover = leads.filter(l => l.workflow_stage === 'installed');
  const unscheduled = leads.filter(l => ['approved', 'deposit_paid'].includes(l.workflow_stage) && !l.assignment);
  return { scheduled, handover, unscheduled };
}

/** The soonest upcoming install (today first), else the soonest on the books. */
function nextInstallOf(scheduled: DummyLead[]): DummyLead | undefined {
  const dated = scheduled.filter(l => l.assignment?.scheduled_date).sort(byDate);
  return dated.find(l => +new Date(l.assignment!.scheduled_date) >= startOfToday()) ?? dated[0];
}

function installerBriefing(): CoachAnswer {
  const leads = generateDummyLeads();
  const { scheduled, handover, unscheduled } = installerJobs(leads);
  const job = nextInstallOf(scheduled);
  if (!job) {
    return { text: 'No installs on the books yet. The moment a deposit lands, the agent schedules the install and I\'ll brief you here — what to load, the drive, and the serials to record.' };
  }
  const p = job.proposal;
  const critical = computeBOM(job).filter(b => b.critical).length;
  const bits = [
    `**${first(job)}** — ${p?.system_size_kw}kWp (${p?.panel_count} panels${p?.battery_model ? ' + battery' : ''}), ${shortAddr(job)}, ${fmtDay(job.assignment?.scheduled_date)}.`,
    `**${critical} critical items** to load — open ${first(job)} and tick them onto the van.`,
  ];
  if (handover.length) bits.push(`${handover.length} system${handover.length > 1 ? 's' : ''} fitted and waiting on commissioning serials + handover.`);
  if (unscheduled.length) bits.push(`${unscheduled.length} won job${unscheduled.length > 1 ? 's' : ''} in the unscheduled queue, awaiting a date.`);
  return {
    text: `Here's your day:\n\n${bits.map(b => `• ${b}`).join('\n')}\n\nAsk me what to load, the drive, or which serial to record.`,
    actions: [{ label: `Open ${first(job)}`, route: '/installer' }],
  };
}

function aboutJob(l: DummyLead): CoachAnswer {
  const p = l.proposal;
  const when = l.assignment?.scheduled_date ? fmtDay(l.assignment.scheduled_date)
    : ['approved', 'deposit_paid'].includes(l.workflow_stage) ? 'awaiting an install date' : '—';
  const critical = computeBOM(l).filter(b => b.critical).length;
  const tail = l.workflow_stage === 'installed'
    ? 'Fitted — needs commissioning serials + photos, then handover.'
    : 'Open the hub to load the van and start.';
  return {
    text: `**${l.name}** — ${getStage(l.workflow_stage)?.label}, ${when}.\n\n${p ? `${p.system_size_kw}kWp · ${p.panel_count} panels${p.battery_model ? ` · ${p.battery_model}` : ''}. ${critical} critical items to load.` : 'No design on file yet.'}\n\nAt ${shortAddr(l)}. ${tail}`,
    actions: [{ label: `Open ${first(l)}`, route: `/job/${l.id}` }],
  };
}

function installerAnswer(q: string, leads: DummyLead[]): CoachAnswer {
  const { scheduled, handover, unscheduled } = installerJobs(leads);
  const job = nextInstallOf(scheduled);

  // 1) A specific client the installer touches.
  const pool = [...scheduled, ...handover, ...unscheduled];
  const named = pool.find(l => {
    const fn = l.name.split(' ')[0].toLowerCase();
    const ln = l.name.split(' ').slice(-1)[0].toLowerCase();
    return q.includes(l.name.toLowerCase()) || (fn.length > 2 && q.includes(fn)) || (ln.length > 3 && q.includes(ln));
  });
  if (named) return aboutJob(named);

  // 2) What to load — the van BOM for today's install.
  if (/(load|material|bom|gear|van|pack|kit|equipment|bring|carry|tools?)/.test(q)) {
    if (!job) return { text: 'No install scheduled, so there\'s nothing to load yet.' };
    const lines = computeBOM(job).map(b => `• ${b.qty} × ${b.item}${b.critical ? ' — critical' : ''}`);
    return {
      text: `For **${first(job)}**'s ${job.proposal?.system_size_kw}kWp install, load:\n\n${lines.join('\n')}\n\nEvery line is critical — a missing one is a wasted trip back. Tick them off in ${first(job)}'s hub as they go in the van.`,
      actions: [{ label: `Open ${first(job)}`, route: '/installer' }],
    };
  }

  // 3) The route — the drive, and why you never double back.
  if (/(route|driv|road|way|traffic|order|sequence|depot|restock|reload|which.*first|fastest)/.test(q)) {
    const week = [...scheduled].filter(l => l.assignment?.scheduled_date).sort(byDate);
    const pts = week.map(l => coordsForAddress(l.address)).filter((p): p is NonNullable<typeof p> => !!p);
    const solve = pts.length >= 3 ? optimiseRoute(pts, false) : null;
    const savings = solve && solve.savedKm >= 0.5
      ? ` The planned order saves ~${solve.savedKm.toFixed(0)} km (${solve.savedMin} min) over booking order.`
      : '';
    return {
      text: `The agent sequences your installs so consecutive days sit beside each other and **you hit each job once — never doubling back**.${savings} A van holds ~2 days of gear, so a warehouse restock is woven in about every 2 days rather than a run home each night. **Routing** has today's drive, turn-by-turn, with the depot pickup folded in as stop 0.`,
      actions: [{ label: 'Open routing', route: '/installer' }],
    };
  }

  // 4) Serials / commissioning / the NC6↔NC7 flip.
  if (/(serial|commission|model|nc6|nc7|inverter|attest|fitted|register|form)/.test(q)) {
    return {
      text: `Record the **fitted** model + serial — what's actually on the wall, not what the proposal designed. If the fitted inverter's AC rating crosses the ESB band, the statutory form flips **NC6 ↔ NC7** on its own and I flag it before you file. The sign-off is attested by **you, the named installer** — never "machine-verified". Provisional values stay in the appendix; only your attested figures go in the statutory boxes.`,
      actions: [{ label: 'Open the job', route: job ? `/job/${job.id}` : '/installer' }],
    };
  }

  // 5) Handover / monitoring / closing a fitted system out.
  if (/(handover|hand over|monitor|finish|sign.?off|complete|close|photo|evidence|customer app|live)/.test(q)) {
    if (handover.length) {
      const h = handover[0];
      const app = monitoringAppForModel(h.proposal?.inverter_model ?? '').appName;
      return {
        text: `**${first(h)}**'s system is fitted and needs closing out: capture the commissioning serials + photos, then handover sets up **${app}** and sends the "your system is live" note. Clean handover is the review and the referral — it's the flywheel, not paperwork.`,
        actions: [{ label: `Open ${first(h)}`, route: `/job/${h.id}` }],
      };
    }
    return { text: 'Nothing waiting on handover right now. When a system\'s fitted: serials + photos → set up the inverter brand\'s monitoring app → the "your system is live" note to the customer. Clean handover = the review and the referral.' };
  }

  // 6) What's ahead / next / schedule.
  if (/(next|tomorrow|upcoming|when|schedule|week|ahead|after|coming)/.test(q)) {
    const week = [...scheduled].filter(l => l.assignment?.scheduled_date).sort(byDate);
    if (!week.length) return { text: 'No installs scheduled yet — the queue fills as deposits land.' };
    const lines = week.slice(0, 5).map(l => `• **${first(l)}** — ${l.proposal?.system_size_kw}kWp, ${fmtDay(l.assignment?.scheduled_date)}`);
    const extra = unscheduled.length ? `\n\nPlus ${unscheduled.length} won job${unscheduled.length > 1 ? 's' : ''} awaiting a date in the unscheduled queue.` : '';
    return {
      text: `Your installs ahead:\n\n${lines.join('\n')}${extra}\n\nDrag any to another day on **Schedule** — the customer's told why automatically.`,
      actions: [{ label: 'Open schedule', route: '/installer' }],
    };
  }

  // 7) Weather / rain.
  if (/(weather|rain|wind|storm|forecast|met)/.test(q)) {
    return { text: 'Roofs and rain don\'t mix. If Met Éireann flags orange or red on an install day, move it on **Schedule** — pick a reason and the customer\'s told automatically, with a line to reply if the new day doesn\'t suit. A yellow warning is a judgement call; either way the drag-to-reschedule is one tap.' };
  }

  // 8) Fallback — teach what the field coach can do.
  return {
    text: 'I read your real day, so I can be specific. Try:\n\n• "What do I load?" — the van BOM for today\'s install\n• "What\'s my route?" — the drive, and why you never double back\n• "Which serial do I record?" — commissioning + the NC6/NC7 flip\n• "What\'s on handover?" — closing a fitted system out\n• Or name a client — "what\'s the story with Anna?"',
  };
}
