/**
 * AboutUs — /about
 *
 * Rebuilt from the old gradient-heavy page to the family standard (cal.com
 * parity): MarketingShell, floating cards on the grey canvas, measured type.
 * Content held honest — the real story (built in Ireland, out of a working
 * solar operation), what we believe, the family. No invented team photos,
 * no fabricated numbers.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Eye, FileCheck, HandHeart, MapPin, Sun } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';

const CAL_LINK = 'https://cal.com/renewableireland/solar-consultation';

export default function AboutUs() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav product="aisolar" />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pt-12 pb-16 lg:pt-16 lg:pb-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
            <span className="size-1.5 rounded-full bg-primary" /> About us
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-[32px] leading-[38px] sm:text-[44px] sm:leading-[50px] font-semibold tracking-tight">
            Built on an Irish roof, not in a boardroom
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-muted-foreground leading-body">
            AISolar came out of running a real solar operation in Ireland — the
            quotes, the surveys, the SEAI paperwork, the chasing. We built the
            system we needed, then made it the product.
          </p>
        </section>

        {/* The story */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="label-micro">The story</p>
                <h2 className="mt-2 text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">
                  The admin was eating the business
                </h2>
                <div className="mt-4 space-y-4 text-muted-foreground leading-body">
                  <p>
                    Every solar job carries a chain of paperwork: the bill, the
                    estimate, the survey, the proposal, the grant, the deposit,
                    the install, the handover. Each link done by hand, each one
                    a place for a customer to go quiet or a grant to stall.
                  </p>
                  <p>
                    So we taught software to carry the chain. A bill goes in and
                    gets read properly — 21 details, not three. Agents draft the
                    proposal, book the survey, send the follow-up, chase the
                    deposit. A person approves every send. Nothing falls between
                    the cracks, because there are no cracks.
                  </p>
                  <p>
                    That system is AISolar. The engine underneath it is AIOS,
                    and the workforce that runs on it is AITeam.
                  </p>
                </div>
              </div>
              <div className="rounded-[16px] bg-card shadow-card p-6 space-y-4">
                {[
                  { icon: MapPin, title: 'Made in Ireland', body: 'Built for MPRNs, SEAI grants, RECI certs and Irish weather — because that is where we work.' },
                  { icon: Sun, title: 'Field-first', body: 'Every screen was shaped by consultants and crews using it on real jobs, not by mockups.' },
                  { icon: Bot, title: 'Agents with a window', body: 'Our agents post what they did in plain English, and one tap corrects them when they are wrong.' },
                ].map(i => (
                  <div key={i.title} className="flex items-start gap-3">
                    <span className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0"><i.icon className="size-4.5" /></span>
                    <div>
                      <h3 className="text-sm font-semibold">{i.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-body">{i.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What we believe */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="label-micro">What we believe</p>
            <h2 className="mt-2 text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] font-semibold tracking-tight">
              Three rules we don't break
            </h2>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              { icon: Eye, title: 'Show the work', body: 'If an agent did it, you can see it — attributed, timestamped, reversible. "Trust us" is not a feature.' },
              { icon: FileCheck, title: 'Never oversell', body: 'The proposal states what we actually read and actually know. If a number is not verified, it does not ship.' },
              { icon: HandHeart, title: 'People approve', body: 'Automation does the running; a named human owns every decision a customer sees. That line never moves.' },
            ].map(v => (
              <div key={v.title} className="rounded-[16px] bg-card shadow-card p-6">
                <span className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary"><v.icon className="size-4.5" /></span>
                <h3 className="mt-4 text-md font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-body">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-16 lg:pb-24">
          <div className="rounded-[16px] bg-primary text-primary-foreground px-6 py-12 lg:px-14 lg:py-16 text-center shadow-card">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Come see how it runs</h2>
            <p className="mt-3 text-primary-foreground/70 leading-body max-w-lg mx-auto">
              Try the bill analysis with your own electricity bill, or book a
              call and we'll walk you through the whole engine.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/start" className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-background text-foreground px-5 text-sm font-semibold hover:opacity-90 transition-opacity">
                Try the bill analysis <ArrowRight className="size-4" />
              </Link>
              <a href={CAL_LINK} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-primary-foreground/25 px-5 text-sm font-semibold hover:bg-primary-foreground/10 transition-colors">
                Talk to us
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter product="aisolar" />
    </div>
  );
}
