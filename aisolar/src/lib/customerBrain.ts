/**
 * customerBrain — the customer-facing intelligence (Cal, 5 Aug: "read the
 * customer's concerns and answer them intelligently towards the outcome's
 * purpose"). The third brain: coachBrain covers consultant + installer; this
 * one speaks to the homeowner or business in their portal.
 *
 * THE MOAT: every answer is grounded in the live record and every answer moves
 * the project toward its next gate. Nothing is generic; nothing is invented.
 *
 * Grounding sources (all live, all shared with the surfaces around the chat, so
 * the AI can never disagree with the screen it sits on):
 *   - stage + STAGE_PURPOSE (what this stage is FOR)
 *   - proposal money + computeQuote (the SAME occupancy-real savings the header shows)
 *   - the SEAI grant lifecycle record (seaiGrant) + the verified scheme facts
 *   - the §D fork (domestic vs commercial — a business never hears €1,800)
 *   - invoice state (paid / due), install assignment (date, crew)
 *
 * Escalation is honest: when the brain can't resolve a concern, it flags it as
 * an `escalation` and the CALLER fires notify() — the closing line is only
 * "I've flagged this to the team" once the write actually landed (or the demo
 * queue took it). The AI never claims a human was told when nobody was.
 *
 * Skills: stop-slop (the copy), the truth-pass law throughout.
 */
import type { DummyLead } from './dummyData';
import { getStage, computeQuote, ratesFromIntake } from './leadIntake';
import { seaiPropertyType, seaiGrantEligibility, eur as seaiEur } from './seaiPipeline';
import { getGrant, offerClock, type SeaiGrantRecord } from './seaiGrant';
import type { NotifyEventType } from './notify';
import { customerScope, scrubForCustomer } from './brainGuardrails';
import { getKnowledge, matchFaq, logAsk, topAsked } from './brainKnowledge';

const eur = seaiEur;
const firstName = (l: DummyLead) => l.name.split(' ')[0].replace(/'s$/, '');

export type CustomerConcern =
  | 'greeting' | 'status' | 'install_timing' | 'savings' | 'grant' | 'ber'
  | 'payment' | 'warranty' | 'battery' | 'objection' | 'complaint' | 'booking' | 'other';

export interface BrainEscalation {
  type: NotifyEventType;
  /** Bell title for the staff side. */
  title: string;
  /** What the customer actually said — carried verbatim to the human. */
  message: string;
  urgent: boolean;
}

export interface BrainAnswer {
  text: string;
  concern: CustomerConcern;
  /** Present when a human should pick this up — the caller fires notify(). */
  escalation?: BrainEscalation;
}

/* ── Intent read — the customer's words, classified. Order matters: a complaint
   that contains a question is still a complaint. ─────────────────────────── */
const RX: Array<[CustomerConcern, RegExp]> = [
  ['complaint', /unhappy|complaint|complain|wrong|delay|late|not working|doesn'?t work|fault|broken|leak|damage|issue|problem|disappoint|refund|angry|frustrat/i],
  ['objection', /expensive|too much|too dear|pricey|afford|cheaper|another quote|other quote|shop around|think about it|need to think|hold off|not sure yet|second thoughts|cancel/i],
  ['booking', /\bbook|re.?schedule|change.*(date|day|time)|move.*(date|day|install|survey)|can'?t make|another day|different (day|date|time)|call me|ring me|callback/i],
  ['ber', /\bber\b|building energy|energy rating|assessor/i],
  ['grant', /grant|seai|ndmg|subsidy|government|rebate/i],
  ['install_timing', /when.*(install|fitted|panels|crew|start)|install.*when|how long.*(install|take)|what day|arriv/i],
  ['savings', /save|saving|bill|payback|worth it|return|export|sell.*back|fit tariff|earn/i],
  ['payment', /pay|deposit|price|cost|invoice|balance|owe|due|card|transfer|finance/i],
  ['warranty', /warrant|guarantee|breaks?( |$)|maintenance|service|lifespan|how long.*last/i],
  ['battery', /battery|storage|night ?rate|power cut|outage/i],
  ['status', /status|progress|where.*(project|things|we)|what.*(happening|next|stage)|update/i],
  ['greeting', /^(hi|hello|hey|howdy|good (morning|afternoon|evening))\b/i],
];

export function classifyConcern(q: string): CustomerConcern {
  for (const [kind, rx] of RX) if (rx.test(q)) return kind;
  if (/\?|^(how|what|when|why|where|which|can|could|do|does|will|is|are)\b/i.test(q.trim())) return 'other';
  return 'other';
}

/* ── The stage's PURPOSE — what the project needs next, said to the customer.
   Every relevant answer closes on this, so the chat always moves the job. ── */
const STAGE_NEXT: Record<string, string> = {
  new: 'Next for you: nothing yet. We\'re preparing your estimate and will be in touch to book your survey.',
  intake_complete: 'Next for you: pick a survey slot when we offer times. The four photos in this chat can shorten the visit.',
  survey_scheduled: 'Next for you: have someone home for the surveyor. That visit makes your design exact.',
  survey_complete: 'Next: your proposal, with the exact system and price. It\'s being designed from your survey now.',
  proposal_drafted: 'Next: your proposal lands shortly. Read it at your own pace.',
  proposal_sent: 'Next for you: read your proposal and approve it online when you\'re happy. Ask me anything in it first.',
  approved: 'Next for you: the deposit secures your install date. The link is on your proposal.',
  deposit_paid: 'Next: we confirm your install date. Nothing needed from you until then.',
  install_scheduled: 'Next for you: clear access to the roof and fuse board on install day.',
  installing: 'Next: the crew commissions your system today and walks you through it.',
  installed: 'Next for you: book your BER assessor. Your grant is paid after the BER is published.',
  final_paid: 'Next for you: your BER, if not done yet. Then the grant lands in your account.',
  completed: 'Nothing needed from you. Everything lives in this portal if you want it.',
};

function stageNext(lead: DummyLead): string {
  return STAGE_NEXT[lead.workflow_stage] ?? 'We\'ll tell you the moment anything needs you.';
}

/** The SAME savings number the portal header shows — one engine, no drift. */
function realSavings(lead: DummyLead): number {
  const p = lead.proposal;
  if (!p) return 0;
  try {
    return computeQuote({
      systemSizeKw: p.system_size_kw,
      batteryKwh: p.battery_model ? (((lead.survey as Record<string, unknown> | undefined)?.confirmed_battery_kwh as number) ?? 5) : 0,
      roof: {
        orientation: (lead.survey as Record<string, unknown> | undefined)?.roof_orientation as string,
        pitchDeg: (lead.survey as Record<string, unknown> | undefined)?.roof_pitch as number,
        shading: (lead.survey as Record<string, unknown> | undefined)?.shading as string,
      },
      occupancy: { occupants: lead.survey?.household_occupants, homeDuringDay: lead.survey?.home_during_day },
      rates: ratesFromIntake(lead.intake as Record<string, unknown>),
      annualUseKwh: lead.annual_kwh,
      netCostOverride: p.net_cost,
    }).annualSavings;
  } catch {
    return p.annual_savings ?? 0;
  }
}

/** The customer's grant, said honestly for where it ACTUALLY is. */
function grantLine(lead: DummyLead): string {
  const commercial = seaiPropertyType((lead.intake as Record<string, unknown>)?.property_type as string) === 'commercial';
  const p = lead.proposal;

  if (commercial) {
    return p?.seai_grant
      ? `As a business you're on the SEAI Non-Domestic Microgen grant: ${eur(p.seai_grant)} is already off your price. You also reclaim the VAT, and the Accelerated Capital Allowance gives you a year-one tax saving. Your accountant will like this one.`
      : 'As a business you qualify for the SEAI Non-Domestic Microgen grant, VAT reclaim, and Accelerated Capital Allowance. Your proposal will show all three against your numbers.';
  }

  const rec: SeaiGrantRecord = getGrant(lead.id);
  const clock = offerClock(rec);
  const amount = p?.seai_grant ? eur(p.seai_grant) : 'up to €1,800';

  // The verified scheme, per stage of THEIR grant — never a generic pamphlet.
  const stageLines: Record<string, string> = {
    not_started: `Your grant is ${amount} (€700 per kWp for the first 2kWp, then €200 to 4kWp, capped at €1,800). You apply on the SEAI portal naming us as your installer, and SEAI pays the grant to your bank account. Your grant card above has the exact steps.`,
    eligible: `You're set to apply: ${amount}, paid by SEAI straight to your bank account. Apply on the SEAI portal naming us as your installer. One rule that matters: the works can't start until your offer arrives.`,
    offer_applied: `Your application is in. SEAI issue an offer letter, and the works start after it arrives. The grant, ${amount}, is paid to your bank account at the end.`,
    offer_received: `Your grant offer is in hand${clock.daysLeft != null ? ` and valid for ${clock.daysLeft} more days` : ''}. ${amount} comes to your bank account once the install and your BER are done.`,
    installed: `Install done, so your grant is two steps from your account: book a BER assessor, and once the BER is published SEAI release your ${amount}.`,
    docs_shared: `Install done, and your BER pack (the Declaration of Works + system data sheet) is in your Documents. Book a BER assessor and hand them that pack — once your BER publishes, SEAI release your ${amount}.`,
    ber_booked: `Your BER is booked. Once the assessor publishes it, SEAI release your ${amount} to your bank account.`,
    ber_published: `Your BER is published. The claim is with SEAI now, and the ${amount} lands in your account when they process it, typically a few weeks.`,
    dow_submitted: `All your paperwork is with SEAI. The ${amount} lands in your bank account when they process the claim, typically a few weeks.`,
    paid: `Your grant is paid. ${amount}, in your account, done.`,
    ineligible: `The grant has conditions we should talk through for your home (it covers homes built and occupied before 2021, with no previous solar funding at the address). Your consultant can confirm exactly where you stand.`,
    offer_expired: `Your grant offer has passed its 8-month window. Talk to your consultant, reapplying is usually straightforward.`,
  };
  return stageLines[rec.status] ?? stageLines.not_started;
}

/** answerCustomer — the brain. Grounded answer + optional escalation. */
export function answerCustomer(lead: DummyLead, question: string): BrainAnswer {
  const q = question.trim();
  const concern = classifyConcern(q);
  const name = firstName(lead);
  const p = lead.proposal;
  const stage = lead.workflow_stage;
  const consultant = lead.assigned_consultant?.split(' ')[0] || 'your consultant';

  switch (concern) {
    case 'greeting':
      return { concern, text: `Hi ${name}! Ask me anything about your project: timing, money, the grant, the install itself. I read your live record, so the answers are yours, not averages.\n\n${stageNext(lead)}` };

    case 'status': {
      const s = getStage(stage);
      return { concern, text: `You're at **${s.label}**.\n\n${stageNext(lead)}` };
    }

    case 'install_timing': {
      if (lead.assignment?.scheduled_date) {
        const day = new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });
        return { concern, text: `Your install is booked for **${day}**. ${lead.assignment.installer_name} and crew arrive between 8 and 9am, and most systems are fitted in a day. Keep the roof access and fuse board clear and you're set.` };
      }
      if (['approved', 'proposal_sent', 'proposal_drafted'].includes(stage)) {
        return { concern, text: `Your install date is set once the deposit is in, usually 2 to 4 weeks out from payment, weather permitting. ${stageNext(lead)}` };
      }
      if (stage === 'deposit_paid') {
        return { concern, text: `Deposit's in, so you're in the diary. We confirm the exact date shortly, and you'll see it here the moment it's set.` };
      }
      return { concern, text: `The install date comes after your survey and proposal. ${stageNext(lead)}` };
    }

    case 'savings': {
      if (p) {
        const s = realSavings(lead);
        return { concern, text: `Your ${p.system_size_kw}kWp system saves about **${eur(s)} a year**, worked off your own bill and how your ${seaiPropertyType((lead.intake as Record<string, unknown>)?.property_type as string) === 'commercial' ? 'business runs' : 'home is used'} during the day. Payback is around ${p.payback_years} years, and after that the savings are simply yours. Anything you don't use exports to the grid at 14c a unit.` };
      }
      return { concern, text: lead.monthly_bill
        ? `Off a €${lead.monthly_bill}/month bill, most similar homes land between €800 and €1,400 a year in savings. Your survey makes that number exact for your roof and usage.\n\n${stageNext(lead)}`
        : `Once we've read your bill your savings are worked from your real numbers, not an average. ${stageNext(lead)}` };
    }

    case 'grant':
      return { concern, text: grantLine(lead) };

    case 'ber':
      return { concern, text: `The BER (Building Energy Rating) is the last gate on your grant: SEAI only release the money once a registered assessor publishes your post-works BER. You book the assessor, and everything they need — the Declaration of Works and your system data sheet — is in your Documents here to forward to them. Book it as soon as the install's done and the grant follows.` };

    case 'payment': {
      if (!p) return { concern, text: `Your exact price arrives with your proposal, after the survey. It'll show the full breakdown: system, grant, and what's actually yours to pay. ${stageNext(lead)}` };
      const inv = lead.invoice;
      const deposit = inv?.deposit_amount ?? Math.round(p.net_cost * 0.3);
      if (inv?.final_paid) return { concern, text: `You're fully paid: ${eur(p.net_cost)}, all square. The only money left to move is your grant, and that comes TO you from SEAI.` };
      if (inv?.deposit_paid) return { concern, text: `Your deposit (${eur(deposit)}) is in, thank you. The balance of ${eur(p.net_cost - deposit)} is due after the install is commissioned, and never before. You can pay by card or transfer from the invoice in your Documents.` };
      return { concern, text: `Your price after the grant is **${eur(p.net_cost)}**. The deposit of ${eur(deposit)} (30%) secures your install date; the balance is due only after the system is installed and commissioned. Card or bank transfer, whichever suits.` };
    }

    case 'warranty':
      return { concern, text: `You're covered three ways: 10 years on our workmanship, 25 years performance on the panels, 10 years on the inverter${p?.battery_model ? ', and 10 years on the battery' : ''}. The full documents live in your portal after install. If anything ever misbehaves, message here first and we'll take it from there.` };

    case 'battery': {
      if (p?.battery_model) {
        const out = lead.survey?.home_during_day === 'out';
        return { concern, text: `Your ${p.battery_model} stores the daytime sun you don't use and runs your ${out ? 'evenings, which is where your usage actually is,' : 'evenings'} instead of buying those units back from the grid. ${out ? 'With the house out most of the day, the battery is what makes your numbers work.' : 'It typically lifts self-use meaningfully.'}` };
      }
      return { concern, text: `Your current design doesn't include a battery. If your evenings are heavy or you're out all day, it can be worth adding — ask ${consultant} to run the with-battery numbers side by side, or just reply "add battery numbers" here and I'll flag it.` };
    }

    case 'objection':
      return {
        concern,
        text: p
          ? `Fair to weigh it up, ${name} — it's real money. The short version of your own numbers: ${eur(realSavings(lead))} a year saved, payback in about ${p.payback_years} years, and the ${eur(p.seai_grant)} grant is already in the price you saw. After payback, roughly two decades of the panels working for free.\n\nNo pressure from me. I've let ${consultant} know you're weighing it, so you'll get a human to talk it through properly.`
          : `Completely fair, ${name}. When your proposal arrives you'll see it worked off your own bill — and there's no obligation at any point. I've let ${consultant} know you'd like to talk it through.`,
        escalation: { type: 'callback_request', title: `${name} is weighing it up`, message: q, urgent: false },
      };

    case 'complaint':
      return {
        concern,
        text: `I'm sorry, ${name} — that's not how this should feel. I've flagged your message to ${consultant} as a priority, and you'll hear from a human today. Your message is in front of them exactly as you wrote it.`,
        escalation: { type: 'callback_request', title: `⚠ Complaint — ${lead.name}`, message: q, urgent: true },
      };

    case 'booking':
      return {
        concern,
        text: lead.assignment?.scheduled_date
          ? `Your current date is ${new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}. I've flagged your request to the team — they'll confirm the change with you here, and nothing moves without your say-so.`
          : `I've flagged this to ${consultant} to get you booked in — you'll get times to pick from right here in the chat.`,
        escalation: { type: 'reschedule', title: `Booking request — ${lead.name}`, message: q, urgent: false },
      };

    default:
      return {
        concern: 'other',
        text: `Good one to put to a human, ${name}. I've passed your question to ${consultant} word for word, and you'll hear back today. If it's urgent, tap "Call me back" below and we'll ring you.`,
        escalation: { type: 'customer_message', title: `Question from ${lead.name}`, message: q, urgent: false },
      };
  }
}

/** Per-stage suggested questions — the "exactly-timed prompts" (Cal). The chips
 *  the customer sees match what THIS stage makes them wonder. */
export function suggestedQuestions(lead: DummyLead): string[] {
  const s = lead.workflow_stage;
  if (['new', 'intake_complete'].includes(s)) return ['What happens next?', 'How much could I save?', 'What\'s the SEAI grant?', 'Do I need planning permission?'];
  if (['survey_scheduled', 'survey_complete'].includes(s)) return ['What happens at the survey?', 'How much will I save?', 'What\'s the SEAI grant?', 'When would my install be?'];
  if (['proposal_drafted', 'proposal_sent'].includes(s)) return ['How are my savings worked out?', 'What\'s my grant worth?', 'What warranty do I get?', 'What happens after I approve?'];
  if (s === 'approved') return ['How do I pay the deposit?', 'When will my install happen?', 'What\'s my grant worth?', 'What should I do before install day?'];
  if (['deposit_paid', 'install_scheduled'].includes(s)) return ['What happens on install day?', 'What do I need to prepare?', 'When do I pay the balance?', 'What about my grant?'];
  if (s === 'installing') return ['How long will today take?', 'What happens after commissioning?', 'When do I pay the balance?', 'When does my grant arrive?'];
  if (['installed', 'final_paid'].includes(s)) return ['How do I book my BER?', 'When does my grant arrive?', 'How do I read my monitoring app?', 'What warranty do I have?'];
  return ['How is my system performing?', 'Where\'s my grant?', 'What warranty do I have?', 'How do I refer a friend?'];
}

/** planning-permission is a real early-stage question — answered in `other`?
 *  No: catch it before the fallback so the chip works. */
const PLANNING_RX = /planning permission|planning\b/i;
const MONITORING_RX = /monitor|app\b|performance|generating|producing/i;
const REFER_RX = /refer|friend|neighbour|neighbor/i;

/**
 * askBrain — THE customer entry point. The full pipeline (Cal, 5 Aug):
 *   guardrails → taught FAQ → knowledge-woven grounded answer → scrub → learn.
 *
 * - GUARDRAIL first: out-of-scope questions (other customers, margins,
 *   pipeline, staff, system) get a polite scope refusal — the data layer is
 *   never touched.
 * - TAUGHT FAQ next: if the owner has taught this answer, it's given straight
 *   away, like an FAQ — the self-learning loop paying out.
 * - Then the grounded intents, with the owner's knowledge woven in softly
 *   (their edge on an objection, their story early on, the offer at most once).
 * - EVERY reply is scrubbed (no surveillance, no internals, no agent names)
 *   and EVERY ask is logged — misses surface in Settings for the owner to
 *   teach, closing the loop.
 */
export function askBrain(lead: DummyLead, question: string): BrainAnswer {
  const finish = (a: BrainAnswer): BrainAnswer => {
    logAsk(question, a.concern, !a.escalation);
    return { ...a, text: scrubForCustomer(a.text) };
  };

  // 1 · guardrail — scope before anything reads data.
  const scope = customerScope(question);
  if (!scope.ok) {
    return finish({ concern: 'other', text: scope.refusal! });
  }

  // 2 · taught FAQ — the owner answered this once; the brain knows it now.
  const taught = matchFaq(question);
  if (taught) {
    return finish({ concern: 'other', text: taught.a });
  }

  // 3 · the built-in leftover intents.
  if (PLANNING_RX.test(question)) {
    return finish({ concern: 'other', text: 'For almost every home, no planning permission is needed: rooftop solar has been exempt regardless of size since 2022 (the exceptions are protected structures and Solar Safeguarding Zones near airports). Your survey confirms yours is clear before anything is ordered.' });
  }
  if (MONITORING_RX.test(question) && ['installed', 'final_paid', 'completed'].includes(lead.workflow_stage)) {
    return finish({ concern: 'status', text: 'Your inverter\'s monitoring app shows live generation, what you\'re using, and what\'s exporting. The crew set it up with you at handover — if you need the login again or anything looks off in it, say the word here and we\'ll sort it.' });
  }
  if (REFER_RX.test(question)) {
    return finish({ concern: 'other', text: 'We\'d love that. Send them the same door you came through, or reply here with their name and number (with their OK) and we\'ll look after them properly. Word of mouth is how most of our work arrives.' });
  }

  // 4 · the grounded intents + the owner's knowledge, woven softly.
  const a = answerCustomer(lead, question);
  return finish(weaveKnowledge(a, lead));
}

/** Weave the owner-taught business intelligence into the answer — one line,
 *  where it naturally belongs, never pushed (Cal: "softly sells outcomes"). */
function weaveKnowledge(a: BrainAnswer, lead: DummyLead): BrainAnswer {
  const k = getKnowledge();
  const early = ['new', 'intake_complete', 'survey_scheduled', 'survey_complete'].includes(lead.workflow_stage);
  let text = a.text;
  if (a.concern === 'objection' && k.edge.trim()) {
    // Their edge answers "why you?" at exactly the moment it's being asked.
    text = text.replace('\n\nNo pressure from me.', `\n\nWorth knowing while you weigh it: ${k.edge.trim()}\n\nNo pressure from me.`);
    if (!text.includes(k.edge.trim())) text += `\n\nWorth knowing while you weigh it: ${k.edge.trim()}`;
  } else if ((a.concern === 'greeting' || a.concern === 'status') && early && k.businessStory.trim()) {
    text += `\n\n${k.businessStory.trim()}`;
  } else if (a.concern === 'savings' && k.offer.trim()) {
    text += `\n\nOne more thing worth knowing: ${k.offer.trim()}`;
  }
  return { ...a, text };
}

/** The prompt chips, demand-shaped: the most-asked real questions lead, the
 *  stage defaults fill the rest — the FAQ writing itself from usage. */
export function liveSuggestions(lead: DummyLead): string[] {
  const learned = topAsked(2).filter(q => q.length <= 48 && customerScope(q).ok);
  const defaults = suggestedQuestions(lead).filter(d => !learned.some(l => l.toLowerCase() === d.toLowerCase()));
  return [...learned, ...defaults].slice(0, 4);
}
