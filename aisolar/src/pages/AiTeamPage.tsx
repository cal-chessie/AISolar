/**
 * AiTeamPage — /aiteam (aiteam.ie later)
 *
 * The AI-workforce offer: hire the agents that do the back-office work. Cal:
 * "AITeam as a page until it's real." So this describes the offer and invites
 * early access — it does NOT pretend to be a live, buyable product. No
 * fabricated proof (DO-NOT-CLAIM). The agents it describes are the ones AISolar
 * already runs, generalised.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, CalendarClock, Bell, Receipt, BarChart3, Check } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';

const ROLES = [
  { icon: <FileText className="size-4.5" />, name: 'The drafter', body: 'Turns raw inputs into finished documents — proposals, quotes, summaries — ready for a human to approve, never auto-sent.' },
  { icon: <CalendarClock className="size-4.5" />, name: 'The scheduler', body: 'Books the surveys, the calls, the installs. Watches the calendar so nobody double-books or forgets.' },
  { icon: <Bell className="size-4.5" />, name: 'The chaser', body: 'Sends the follow-ups on time, every time. The polite nudge that turns a quiet lead into a signed job.' },
  { icon: <Receipt className="size-4.5" />, name: 'The bookkeeper', body: 'Raises invoices, tracks deposits, reconciles payments. Chases what is owed without being told.' },
  { icon: <BarChart3 className="size-4.5" />, name: 'The analyst', body: 'Reports what happened, where work stalled, and how many hours the team saved — from the record, not a spreadsheet.' },
];

export default function AiTeamPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav product="aiteam" />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 lg:pt-24 lg:pb-24 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
            <span className="size-1.5 rounded-full bg-primary" /> Early access · by AIOS
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.03]">
            Hire the team that never sleeps
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-muted-foreground leading-body">
            AITeam is a workforce of AI agents that run the back office — drafting,
            scheduling, chasing, invoicing, reporting. You approve the work; they
            do the running. Proven inside AISolar, opening up to more businesses.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth" className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              Get early access <ArrowRight className="size-4" />
            </Link>
            <Link to="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-card px-5 text-sm font-medium shadow-card hover:bg-muted transition-colors">
              See it working in AISolar
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Rolling out from the AISolar agent runtime. No card, no commitment.</p>
        </section>

        {/* Meet the team */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
            <div className="max-w-2xl">
              <p className="label-micro">Meet the team</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Five hires you don't have to onboard</h2>
              <p className="mt-3 text-muted-foreground leading-body">
                Each agent owns one job and does it every time. They post what
                they did in plain English, and a one-tap correction trains them.
              </p>
            </div>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ROLES.map(r => (
                <div key={r.name} className="rounded-panel border border-border/70 bg-card shadow-card p-6">
                  <span className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">{r.icon}</span>
                  <h3 className="mt-4 text-md font-semibold">{r.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-body">{r.body}</p>
                </div>
              ))}
              <div className="rounded-panel border border-primary/30 bg-primary/[0.03] p-6 flex flex-col justify-center">
                <p className="text-sm font-semibold">You, in the loop</p>
                <p className="mt-2 text-sm text-muted-foreground leading-body">
                  Nothing goes out without your say-so. The team drafts and
                  proposes; you approve. That line never moves.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it's honest */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div>
              <p className="label-micro">Why trust it</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">A workforce with a clear window</h2>
              <p className="mt-3 text-muted-foreground leading-body">
                The problem with "AI employees" is you can't see what they did.
                AITeam runs on the AIOS record, so every action is logged,
                attributed and reversible.
              </p>
              <ul className="mt-5 space-y-2.5">
                {['Every action posted in plain English', 'Approve before anything leaves the building', 'One-tap corrections become the training data', 'Cost-capped — never a runaway bill'].map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <Check className="size-4 text-primary mt-0.5 shrink-0" /><span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-panel border border-border/70 bg-card shadow-card p-4 space-y-3">
              {[
                ['The drafter', 'wrote a proposal, waiting on your approval', 'just now'],
                ['The scheduler', 'booked Tue 10am survey', '3m ago'],
                ['The chaser', 'sent the 7-day follow-up', '1h ago'],
              ].map(([a, s, t]) => (
                <div key={a} className="flex items-start gap-2.5">
                  <span className="size-6 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0"><Check className="size-3.5" /></span>
                  <p className="text-sm leading-ui">
                    <span className="font-medium">{a}</span> <span className="text-muted-foreground">{s}</span>
                    <span className="block text-2xs text-muted-foreground mt-0.5">{t}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-16 lg:pb-24">
          <div className="rounded-panel bg-primary text-primary-foreground px-6 py-12 lg:px-14 lg:py-16 text-center shadow-card">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Want the team first?</h2>
            <p className="mt-3 text-primary-foreground/70 leading-body max-w-lg mx-auto">
              We're opening AITeam to a handful of businesses beyond solar. Tell us
              what your back office does and we'll see if the team fits.
            </p>
            <div className="mt-7 flex justify-center">
              <Link to="/auth" className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-background text-foreground px-6 text-sm font-medium hover:opacity-90 transition-opacity">
                Request early access <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter product="aiteam" />
    </div>
  );
}
