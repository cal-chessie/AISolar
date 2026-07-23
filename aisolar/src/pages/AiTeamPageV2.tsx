/**
 * AiTeamPageV2 — /aiteam (aiteam.ie later)
 *
 * Built on cal.com's HOMEPAGE skeleton (studied live): hero with eyebrow pill,
 * display headline, stacked CTAs and a product visual → trust strip → numbered
 * "How it works" (01–03) → the full team roster → alternating benefit blocks
 * with product mocks → dark final CTA.
 *
 * THE ROSTER IS THE REAL ONE: all 10 agents registered in the agent-drain
 * runtime. Honest framing: early access, proven inside AISolar, approval-gated.
 * (V2 filename: the original AiTeamPage.tsx is OS-locked on disk.)
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bot, Check, ThumbsDown, FileText, CalendarClock, Bell,
  Receipt, Award, Wrench, PackageCheck, AlarmClock, Inbox, Mail,
} from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';

const CAL_LINK = 'https://cal.com/renewableireland/solar-consultation';

/* The real 10 — one card per registered agent in the runtime. */
const ROSTER = [
  { icon: Inbox,         name: 'The greeter',       job: 'Scores and acknowledges every new lead the moment it lands.' },
  { icon: CalendarClock, name: 'The scheduler',     job: 'Books the site surveys and keeps the calendar honest.' },
  { icon: FileText,      name: 'The drafter',       job: 'Writes the proposal from the bill and the survey — ready to approve.' },
  { icon: Bell,          name: 'The chaser',        job: 'Sends the follow-ups on time, every time, until there is an answer.' },
  { icon: Award,         name: 'The grants clerk',  job: 'Opens and tracks the SEAI grant application for every approved job.' },
  { icon: Wrench,        name: 'The coordinator',   job: 'Schedules the install the moment the deposit clears.' },
  { icon: PackageCheck,  name: 'The closer',        job: 'Sends the warranty pack and handover email when the job completes.' },
  { icon: Mail,          name: 'The correspondent', job: 'Keeps every customer updated with a weekly plain-English digest.' },
  { icon: AlarmClock,    name: 'The watchdog',      job: 'Spots stalled leads and escalates them to a human before they go cold.' },
  { icon: Receipt,       name: 'The bookkeeper',    job: 'Raises invoices and chases deposits and final payments politely.' },
];

function AgentFeed() {
  return (
    <div className="rounded-[16px] bg-card shadow-card overflow-hidden text-left">
      <div className="flex items-center gap-2 px-4 h-11 border-b border-border">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-doc-deposit opacity-60 animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-doc-deposit" />
        </span>
        <span className="text-sm font-semibold">Your team, working</span>
        <span className="ml-auto text-2xs text-muted-foreground">10 agents · live</span>
      </div>
      <div className="p-4 space-y-3">
        {[
          ['The drafter', 'wrote the Kelly proposal — waiting on your approval', 'just now'],
          ['The scheduler', 'booked Tuesday 10:00 survey with Mrs. Murphy', '2m ago'],
          ['The watchdog', 'flagged the Byrne lead — quiet for 6 days', '9m ago'],
          ['The bookkeeper', 'deposit reminder sent to J. Wilson', '31m ago'],
        ].map(([a, s, t]) => (
          <div key={a} className="flex items-start gap-2.5">
            <span className="size-6 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0"><Bot className="size-3.5" /></span>
            <p className="text-sm leading-ui">
              <span className="font-medium">{a}</span> <span className="text-muted-foreground">{s}</span>
              <span className="block text-2xs text-muted-foreground mt-0.5">{t}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/30">
        <span className="text-xs text-muted-foreground">You approve — nothing sends itself</span>
        <Check className="size-4 text-doc-deposit" />
      </div>
    </div>
  );
}

export default function AiTeamPageV2() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav product="aiteam" />

      <main>
        {/* Hero — cal.com homepage pattern */}
        <section className="mx-auto max-w-6xl px-5 pt-12 pb-16 lg:pt-16 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
                <span className="size-1.5 rounded-full bg-primary" /> Early access · by AIOS
              </span>
              <h1 className="mt-5 text-[32px] leading-[38px] sm:text-[44px] sm:leading-[50px] font-semibold tracking-tight">
                The better way to run your back office
              </h1>
              <p className="mt-4 max-w-xl text-base sm:text-lg text-muted-foreground leading-body">
                AITeam is ten AI agents that do the running — drafting,
                scheduling, chasing, invoicing, reporting — while you approve
                the work. Proven inside AISolar, opening up to more businesses.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:max-w-sm">
                <Link to="/get-started" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                  Get early access <ArrowRight className="size-4" />
                </Link>
                <Link to="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-card px-5 text-sm font-semibold shadow-card hover:bg-muted transition-colors">
                  See it working in AISolar
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">No card, no commitment. Rolling out from the AISolar runtime.</p>
            </div>
            <AgentFeed />
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-6">
            <p className="text-center text-xs uppercase tracking-wide text-muted-foreground">
              Ten agents · one immutable record · you approve every send
            </p>
          </div>
        </section>

        {/* How it works — numbered 01–03 */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="max-w-2xl">
            <p className="label-micro">How it works</p>
            <h2 className="mt-2 text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">
              With us, hiring is easy
            </h2>
            <p className="mt-3 text-muted-foreground leading-body">
              No onboarding, no HR, no Mondays. Your team is working the minute
              you turn it on.
            </p>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              { n: '01', title: 'Hire your team', body: 'Turn on the agents you want. Each one owns a single job — intake, surveys, proposals, payments — and does it every time.' },
              { n: '02', title: 'Set the guardrails', body: 'Approval gates on everything customer-facing, a daily AI cost cap, and your working hours. The team runs inside the lines you draw.' },
              { n: '03', title: 'Watch the window', body: 'Every action posts in plain English as it happens. If one gets it wrong, one tap corrects it — and the correction trains them.' },
            ].map(s => (
              <div key={s.n} className="rounded-[16px] bg-card shadow-card p-6">
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">{s.n}</span>
                <h3 className="mt-3 text-md font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-body">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Meet the team — the REAL roster of 10 */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
            <div className="max-w-2xl">
              <p className="label-micro">Meet the team</p>
              <h2 className="mt-2 text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">
                Ten hires you don't have to onboard
              </h2>
              <p className="mt-3 text-muted-foreground leading-body">
                The exact ten agents running inside AISolar today. Each owns one
                job, posts what it did, and gets better every time you correct it.
              </p>
            </div>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {ROSTER.map(r => (
                <div key={r.name} className="rounded-[16px] bg-card shadow-card p-5">
                  <span className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary"><r.icon className="size-4.5" /></span>
                  <h3 className="mt-3 text-sm font-semibold">{r.name}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-body">{r.job}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefit blocks — alternating, cal.com homepage style */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24 space-y-16 lg:space-y-24">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div>
              <p className="label-micro">Trust</p>
              <h2 className="mt-2 text-[26px] leading-[32px] sm:text-[32px] sm:leading-[38px] font-semibold tracking-tight">A workforce with a clear window</h2>
              <p className="mt-3 text-muted-foreground leading-body">
                The problem with "AI employees" is you can't see what they did.
                AITeam runs on the AIOS record: every action is logged,
                attributed, and reversible.
              </p>
              <ul className="mt-5 space-y-2.5">
                {['Every action posted in plain English', 'Attributed to a named agent and customer', 'Hash-chained record — nothing rewritten', 'Cost-capped, with deterministic fallbacks'].map(x => (
                  <li key={x} className="flex items-start gap-2.5 text-sm"><Check className="size-4 text-doc-deposit mt-0.5 shrink-0" /><span>{x}</span></li>
                ))}
              </ul>
            </div>
            <AgentFeed />
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div className="lg:order-2">
              <p className="label-micro">Improvement</p>
              <h2 className="mt-2 text-[26px] leading-[32px] sm:text-[32px] sm:leading-[38px] font-semibold tracking-tight">Corrections are the training</h2>
              <p className="mt-3 text-muted-foreground leading-body">
                Your team learns your business from you. When an agent gets
                something wrong, one tap flags it, you say what it should have
                done, and that becomes how it works from then on.
              </p>
              <ul className="mt-5 space-y-2.5">
                {['One-tap "Wrong" on any action', 'Corrections come from the people in the field', 'Upload documents and prompts to teach each agent', 'Nothing customer-facing sends without approval'].map(x => (
                  <li key={x} className="flex items-start gap-2.5 text-sm"><Check className="size-4 text-doc-deposit mt-0.5 shrink-0" /><span>{x}</span></li>
                ))}
              </ul>
            </div>
            <div className="lg:order-1 rounded-[16px] bg-card shadow-card p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="size-6 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0"><Bot className="size-3.5" /></span>
                <div className="flex-1">
                  <p className="text-sm leading-ui"><span className="font-medium">The scheduler</span> <span className="text-muted-foreground">booked the survey for Sunday 09:00</span></p>
                  <p className="text-2xs text-muted-foreground mt-0.5">Mrs. Doyle · just now</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-pop font-medium shrink-0"><ThumbsDown className="size-3.5" /> Wrong</span>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs font-medium">What should it have done?</p>
                <p className="mt-1.5 text-xs text-muted-foreground italic">"Never book weekends for this customer — weekdays after 10am only."</p>
                <div className="mt-2 inline-flex h-8 items-center rounded-[10px] bg-primary px-3 text-xs font-semibold text-primary-foreground">Send correction</div>
              </div>
              <p className="text-2xs text-muted-foreground text-center">This trains the scheduler. It won't happen twice.</p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-16 lg:pb-24">
          <div className="rounded-[16px] bg-primary text-primary-foreground px-6 py-12 lg:px-14 lg:py-16 text-center shadow-card">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Want the team first?</h2>
            <p className="mt-3 text-primary-foreground/70 leading-body max-w-lg mx-auto">
              We're opening AITeam to a handful of businesses beyond solar.
              Tell us what your back office does, and we'll see if the ten fit.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/get-started" className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-background text-foreground px-5 text-sm font-semibold hover:opacity-90 transition-opacity">
                Request early access <ArrowRight className="size-4" />
              </Link>
              <a href={CAL_LINK} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-primary-foreground/25 px-5 text-sm font-semibold hover:bg-primary-foreground/10 transition-colors">
                Talk to us
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter product="aiteam" />
    </div>
  );
}
