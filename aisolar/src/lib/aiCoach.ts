/**
 * Role-aware AI Coach — distinct intelligence per role.
 *
 * The old PersistentAICoach.tsx served the same generic sales tips to installers
 * and consultants. They are very different jobs:
 *   - INSTALLER cares about: today's jobs, materials, route, safety, handover
 *   - CONSULTANT cares about: pipeline health, follow-ups, conversion, objections
 *   - ADMIN cares about: team performance, stale leads, RLS integrity, costs
 *   - OWNER cares about: revenue, margin, capacity, strategic moves
 *
 * Each role gets its own:
 *   - Context provider (what data the coach sees)
 *   - Tip library (role-specific, not generic)
 *   - Suggested actions (one-click, role-appropriate)
 *   - Voice (installer = practical, consultant = persuasive, admin = analytical)
 */

import { Sun, Calendar, MapPin, AlertTriangle, TrendingUp, Phone, FileText, CheckCircle2, Truck, Clock, Zap, Users, DollarSign, Shield, Target } from 'lucide-react';

export type CoachRole = 'installer' | 'consultant' | 'admin' | 'owner' | 'customer';

export interface CoachTip {
  id: string;
  role: CoachRole;
  priority: 'high' | 'medium' | 'low';
  type: 'action' | 'warning' | 'opportunity' | 'info';
  icon: typeof Sun;
  title: string;
  body: string;
  /** One-click action — navigates to a route or triggers a function */
  cta?: { label: string; route?: string; action?: string };
  /** Copy-to-clipboard text (e.g. SMS script for the consultant) */
  copyText?: string;
}

/**
 * INSTALLER tips — practical, job-focused, safety-aware.
 * Voice: "Here's what you need to do today, here's the gotcha on this job."
 */
export const INSTALLER_TIPS: CoachTip[] = [
  {
    id: 'ins-1',
    role: 'installer',
    priority: 'high',
    type: 'action',
    icon: Calendar,
    title: 'Today\'s first install: 4.2kWp south-facing in Dundrum',
    body: 'Roof access via rear garden — customer has been asked to clear the side passage. Materials picked up yesterday (6x Longi Hi-MO 6, 1x SE5K inverter, 1x 5kWh battery). Estimated 6 hours on site.',
    cta: { label: 'Open job sheet', route: '/installer?job=today' },
  },
  {
    id: 'ins-2',
    role: 'installer',
    priority: 'high',
    type: 'warning',
    icon: AlertTriangle,
    title: 'Met Éireann yellow rain warning for tomorrow',
    body: 'Your 2 scheduled installs tomorrow (Howth + Clontarf) are exterior roof work. Recommend rescheduling both — auto-reschedule will run if warning goes orange.',
    cta: { label: 'Review + reschedule', route: '/installer?tab=schedule' },
  },
  {
    id: 'ins-3',
    role: 'installer',
    priority: 'medium',
    type: 'opportunity',
    icon: Truck,
    title: 'Stock alert: 12x Longi panels low at Dublin depot',
    body: 'Your Thursday install (8.1kWp, 18 panels) needs 18 — we have 12 in stock. Order placed, ETA Wednesday AM. No action needed; flagging so you can re-sequence if it slips.',
  },
  {
    id: 'ins-4',
    role: 'installer',
    priority: 'medium',
    type: 'action',
    icon: FileText,
    title: '3 site surveys due this week — photos incomplete',
    body: 'Surveys for Mary O\'Brien (Raheny), Pat Kelly (Sandymount), and the Brennan job (Donnybrook) each need 2+ more photos (utility meter + fuse board). Mobile companion lets you snap and upload on site.',
    cta: { label: 'Open mobile companion', route: '/installer?tab=mobile' },
  },
  {
    id: 'ins-5',
    role: 'installer',
    priority: 'low',
    type: 'info',
    icon: CheckCircle2,
    title: 'Route optimization: 22 minutes saved today',
    body: 'Today\'s 3 jobs sequenced Dundrum → Stillorgan → Blackrock (vs original Dundrum → Blackrock → Stillorgan). Avoids M50 southbound at school pickup. GPS link sent to your phone.',
  },
];

/**
 * CONSULTANT tips — pipeline-focused, persuasive, conversion-minded.
 * Voice: "Here's your hottest lead, here's the objection you'll get, here's the script."
 */
export const CONSULTANT_TIPS: CoachTip[] = [
  {
    id: 'con-1',
    role: 'consultant',
    priority: 'high',
    type: 'action',
    icon: Phone,
    title: 'Call Sarah McDonald now — proposal open 4x in 48h',
    body: 'She\'s opened the proposal link 4 times since you sent it Tuesday. That\'s a buying signal. Objection likely: payback period. Here\'s a 30-second script that re-frames payback as monthly cashflow positive.',
    cta: { label: 'Open lead', route: '/consultant?lead=sarah-mcdonald' },
    copyText: 'Hi Sarah, I noticed you\'ve been reviewing the proposal. Most of my customers ask about payback period — can I reframe it? With the new SEAI grant, your monthly finance payment is €89, but you save €127/month on bills. So you\'re cashflow positive from month one. Worth a 5-min call? I\'m free until 1pm.',
  },
  {
    id: 'con-2',
    role: 'consultant',
    priority: 'high',
    type: 'warning',
    icon: Clock,
    title: '3 leads past follow-up threshold',
    body: 'Tom Brennan (survey stage, 5 days stale), Linda O\'Sullivan (proposal sent, 7 days stale), and the Murphy referral (intake, 4 days stale). Follow-Up Agent has emailed them, but they\'ve not replied. Manual call needed.',
    cta: { label: 'Open stale leads', route: '/consultant?filter=stale' },
  },
  {
    id: 'con-3',
    role: 'consultant',
    priority: 'medium',
    type: 'opportunity',
    icon: TrendingUp,
    title: 'Your conversion rate is up 14% this month',
    body: 'Proposals you\'ve sent in the last 30 days have a 42% acceptance rate (vs 28% last month). Pattern: you\'re leading with the SEAI grant earlier in the call. Keep doing that.',
  },
  {
    id: 'con-4',
    role: 'consultant',
    priority: 'medium',
    type: 'action',
    icon: FileText,
    title: 'Auto-drafted proposal ready for review: the Kelly job',
    body: 'Proposal Drafter Agent built this from yesterday\'s survey. 6.4kWp south-facing, 14 panels, 5kWh battery, €11,840 net of €1,800 SEAI grant. Payback 7.2 years. Review + send in 2 minutes.',
    cta: { label: 'Review draft', route: '/consultant?proposal=kelly-draft' },
  },
  {
    id: 'con-5',
    role: 'consultant',
    priority: 'low',
    type: 'info',
    icon: Zap,
    title: 'New micro-gen export tariff confirmed at €0.14/kWh',
    body: 'ESB Networks announced the 2026 rate. All draft proposals should be re-calculated. There are 4 in your queue — one-click update available.',
    cta: { label: 'Update 4 drafts', route: '/consultant?action=recalc-tariff' },
  },
];

/**
 * ADMIN tips — system integrity, team performance, exceptions.
 * Voice: "Here's what's broken, here's who's slipping, here's the bottleneck."
 */
export const ADMIN_TIPS: CoachTip[] = [
  {
    id: 'adm-1',
    role: 'admin',
    priority: 'high',
    type: 'warning',
    icon: Shield,
    title: 'RLS policy on leads.leaves anon SELECT — fix urgently',
    body: 'Audit found `USING (access_token IS NOT NULL)` with no token comparison. Anonymous users can enumerate all leads. Patch the migration and redeploy.',
    cta: { label: 'View audit', route: '/admin/audit' },
  },
  {
    id: 'adm-2',
    role: 'admin',
    priority: 'high',
    type: 'warning',
    icon: Users,
    title: 'Consultant Aoife has 3 stale leads (14+ days)',
    body: 'Stale Lead Escalator flagged her. She may be overloaded — she took 8 new leads last week. Consider reassigning 2 to Cian.',
    cta: { label: 'Reassign leads', route: '/admin/settings?tab=leads' },
  },
  {
    id: 'adm-3',
    role: 'admin',
    priority: 'medium',
    type: 'opportunity',
    icon: Target,
    title: 'Conversion bottleneck: survey → proposal (58%)',
    body: 'Of 50 surveys completed in June, 29 became proposals. Industry benchmark is 70%. Common cause: installer photos incomplete. Suggested action: add photo completeness check to installer checklist.',
  },
  {
    id: 'adm-4',
    role: 'admin',
    priority: 'medium',
    type: 'info',
    icon: DollarSign,
    title: 'Pipeline value: €248k across 31 active leads',
    body: '12 in proposal, 8 in contract, 6 installing, 5 in closeout. Average deal size €8k. Forecast: €178k recognized revenue in next 60 days.',
  },
  {
    id: 'adm-5',
    role: 'admin',
    priority: 'low',
    type: 'info',
    icon: CheckCircle2,
    title: 'All 10 agents operational',
    body: 'Last 24h: 47 runs, 0 failures. Survey Scheduler ran 6x, Proposal Drafter 4x, Follow-Up 31x (sent 12 emails). No agent is paused.',
    cta: { label: 'View agent runs', route: '/admin/audit?tab=agents' },
  },
];

/**
 * OWNER tips — blended strategic view. Owner sees the consultant's hottest leads,
 * the admin's exceptions, AND the installer's capacity, all framed as decisions.
 */
export const OWNER_TIPS: CoachTip[] = [
  {
    id: 'own-1',
    role: 'owner',
    priority: 'high',
    type: 'opportunity',
    icon: TrendingUp,
    title: 'Revenue run-rate: €84k/month — pacing 22% above target',
    body: 'Q3 target was €230k, you\'re at €84k with 12 days left in July. 8 deals in contract stage worth €67k. If half close this month, you\'ll hit 110% of target.',
  },
  {
    id: 'own-2',
    role: 'owner',
    priority: 'high',
    type: 'warning',
    icon: AlertTriangle,
    title: 'Installer capacity maxed for week of July 28',
    body: 'You have 11 installs scheduled that week; max capacity is 9. Either hire a contractor for 2 days or push 2 into August. August has slack.',
    cta: { label: 'Open install calendar', route: '/installer?tab=calendar' },
  },
  {
    id: 'own-3',
    role: 'owner',
    priority: 'medium',
    type: 'action',
    icon: Users,
    title: 'Strategic move: bring Cian\'s conversion up to Aoife\'s level',
    body: 'Aoife converts 42%, Cian 24%. Pattern: Aoife leads with grant, Cian leads with savings. Worth a 30-min coaching session this week.',
    cta: { label: 'Compare consultants', route: '/admin/audit?tab=team' },
  },
  {
    id: 'own-4',
    role: 'owner',
    priority: 'medium',
    type: 'opportunity',
    icon: Zap,
    title: 'Margins: battery attach rate up to 61% (was 38%)',
    body: 'The new proposal template bundles battery + solar by default. Margin on batteries is 32% vs 18% on panels. Keep the default.',
  },
  {
    id: 'own-5',
    role: 'owner',
    priority: 'low',
    type: 'info',
    icon: CheckCircle2,
    title: 'All 10 autonomous agents healthy',
    body: 'Agents handled 47 actions in 24h. Manual workload per consultant down ~3 hours/day vs pre-agent baseline.',
    cta: { label: 'Open agent foundation', route: '/consultant?tab=agents' },
  },
];

/** Customer-facing coach — only used inside the customer portal. */
export const CUSTOMER_TIPS: CoachTip[] = [
  {
    id: 'cus-1',
    role: 'customer',
    priority: 'medium',
    type: 'info',
    icon: Calendar,
    title: 'Your installation is scheduled for July 24',
    body: 'Our installer team will arrive between 8-9am. Please ensure roof access is clear and someone over 18 is home all day. You\'ll get a reminder SMS the day before.',
  },
  {
    id: 'cus-2',
    role: 'customer',
    priority: 'medium',
    type: 'action',
    icon: FileText,
    title: 'Sign your contract to lock in your SEAI grant',
    body: 'The €1,800 SEAI grant is reserved for 30 days from proposal. Sign your contract in the portal to lock it in before July 22.',
    cta: { label: 'Sign contract', route: '/customer/:token?action=sign' },
  },
  {
    id: 'cus-3',
    role: 'customer',
    priority: 'low',
    type: 'info',
    icon: Sun,
    title: 'Solar forecast: your system will generate ~32 kWh today',
    body: 'Based on Met Éireann forecast, your 4.2kWp system should generate ~32 kWh today (typical July day). That\'s about €11 of electricity at current rates.',
  },
];

/** Get the right tips for the role. */
export function getTipsForRole(role: CoachRole): CoachTip[] {
  switch (role) {
    case 'installer':  return INSTALLER_TIPS;
    case 'consultant': return CONSULTANT_TIPS;
    case 'admin':      return ADMIN_TIPS;
    case 'owner':      return OWNER_TIPS;
    case 'customer':   return CUSTOMER_TIPS;
    default:           return CONSULTANT_TIPS;
  }
}

/** Get a one-line "coach summary" for the role to display in the header pill. */
export function getCoachSummary(role: CoachRole): { headline: string; subtext: string } {
  switch (role) {
    case 'installer':
      return {
        headline: '3 jobs today, 1 weather risk tomorrow',
        subtext: 'Coach focused on today\'s work, materials, and safety',
      };
    case 'consultant':
      return {
        headline: '1 hot lead to call now, 3 stale, 1 draft to review',
        subtext: 'Coach focused on pipeline, conversion, and scripts',
      };
    case 'admin':
      return {
        headline: '1 critical RLS bug, 1 overloaded consultant, 1 bottleneck',
        subtext: 'Coach focused on system integrity and exceptions',
      };
    case 'owner':
      return {
        headline: 'Pacing 122% of target, capacity maxed in 2 weeks',
        subtext: 'Coach focused on revenue, margin, and strategic moves',
      };
    case 'customer':
      return {
        headline: 'Install scheduled July 24, contract awaiting signature',
        subtext: 'Coach focused on your project and next steps',
      };
  }
}

/** The role-specific suggestion engine prompt — for the LLM-backed coach. */
export const COACH_SYSTEM_PROMPTS: Record<CoachRole, string> = {
  installer: `You are the installer's assistant. Focus on:
- TODAY'S jobs: arrival time, materials list, roof access, safety concerns
- THIS WEEK's surveys: what photos to capture, what to verify on site
- STOCK: what's in the van, what's at the depot, what's on order
- WEATHER: reschedule triggers (Met Éireann orange/red)
- COMPLIANCE: RECI sign-off, photo evidence requirements, SEAI doc upload

Voice: practical, job-site fluent. Never generic. Reference real customer names and addresses.
NEVER give the installer sales tips. NEVER talk about pipeline value. They install solar — they don't sell it.`,

  consultant: `You are the consultant's sales coach. Focus on:
- HOT LEADS: who's opening the proposal, who's opening 3+ times, who replied to follow-up
- OBJECTIONS: pre-empt the objection this lead will raise, with a 2-sentence script
- STALE LEADS: who's past threshold, with a one-click call CTA
- DRAFTS: which auto-drafted proposals need a 2-minute review before sending
- CONVERSION: what's working this week, what pattern to repeat

Voice: persuasive but not pushy. Sound like a senior closer coaching a junior. Always include a copyable script.
NEVER give the consultant installer logistics. They sell — they don't install.`,

  admin: `You are the admin's operations monitor. Focus on:
- EXCEPTIONS: what's broken (RLS gaps, failed agent runs, missing data)
- TEAM LOAD: who's overloaded, who's underperforming, who needs reassignment
- BOTTLENECKS: which stage has the worst conversion, with a suggested fix
- COSTS: where margin is leaking (discounts, expedited materials, rework)
- COMPLIANCE: GDPR, RLS, audit log integrity

Voice: analytical, fact-dense. Cite specific numbers and file:line refs.
NEVER give the admin sales scripts. They run operations — they don't sell.`,

  owner: `You are the owner's strategic advisor. Focus on:
- REVENUE: run-rate vs target, forecast for next 30/60/90 days
- MARGIN: gross margin trend, product mix (battery attach rate), discount leakage
- CAPACITY: installer utilization, consultant pipeline coverage, hire/fire signals
- STRATEGIC MOVES: what 1 thing to do this week for biggest impact
- RISKS: concentration risk (1 big customer), supplier risk, regulatory change

Voice: like a COO briefing a CEO. Always end with a clear recommendation.
Blend admin + consultant + installer signals into one decision-grade view.
NEVER mention tactical bugs. Surface patterns and decisions, not incidents.`,

  customer: `You are the customer's solar guide. Focus on:
- THEIR PROJECT: current stage, what happens next, what they need to do
- THEIR SAVINGS: how much their system is generating today/this week
- THEIR PAPERWORK: what's signed, what's pending, what's the deadline
- THEIR WARRANTY: how to invoke it, who to call, what's covered

Voice: warm, plain-English, never salesy. They already bought — they need a guide.
NEVER mention pipeline or other customers. This is THEIR project page.`,
};
