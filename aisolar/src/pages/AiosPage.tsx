/**
 * AiosPage — /aios (aios.ie)
 *
 * The parent house. AIOS is the operating system the products run on — the
 * kernel, the agent runtime, the immutable record. The glue the customer never
 * sees. This page is credibility + the offer ladder, not a signup funnel.
 *
 * Copy held to what's real: the kernel exists (hash-chained immutable events,
 * multi-tenant, refs-only). No fabricated metrics.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, GitBranch, Lock, Bot, Sun, Users } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';

export default function AiosPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav product="aios" />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 lg:pt-24 lg:pb-24 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
            <span className="size-1.5 rounded-full bg-primary" /> The operating system underneath
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.03]">
            One kernel.<br />A business that runs itself.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-muted-foreground leading-body">
            AIOS is the engine our products run on: a single immutable record of
            everything that happens, and a fleet of agents that act on it. You
            see the product. AIOS is the part you don't.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              See AISolar, live <ArrowRight className="size-4" />
            </Link>
            <Link to="/auth" className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-card px-5 text-sm font-medium shadow-card hover:bg-muted transition-colors">
              Talk to us
            </Link>
          </div>
        </section>

        {/* The offer ladder */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
            <div className="max-w-2xl">
              <p className="label-micro">The family</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">One engine, three ways in</h2>
              <p className="mt-3 text-muted-foreground leading-body">
                Come in for the vertical product, grow into the workforce, and
                the kernel carries all of it underneath.
              </p>
            </div>
            <div className="mt-10 grid md:grid-cols-3 gap-5">
              <LadderCard
                icon={<Sun className="size-5" />} name="AISolar" tag="Live"
                body="The operating system for solar installers. Bill in, agent-drafted proposals out, one cockpit for the whole crew."
                to="/" cta="Explore AISolar" highlight
              />
              <LadderCard
                icon={<Users className="size-5" />} name="AITeam" tag="Early"
                body="The AI workforce layer. Hire the agents that draft, schedule, chase and report — across any business, not just solar."
                to="/aiteam" cta="See AITeam"
              />
              <LadderCard
                icon={<Boxes className="size-5" />} name="AIOS" tag="The kernel"
                body="The substrate the others run on. Immutable record, agent runtime, multi-tenant by design. The part you don't see."
                to="/aios" cta="You're here"
              />
            </div>
          </div>
        </section>

        {/* What the kernel actually is */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="max-w-2xl">
            <p className="label-micro">The kernel</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Built like an operating system, not an app</h2>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {[
              { icon: <GitBranch className="size-4.5" />, title: 'One immutable record', body: 'Every event is hash-chained and append-only. Nothing is edited or deleted — corrections are added. The truth is auditable end to end.' },
              { icon: <Bot className="size-4.5" />, title: 'An agent runtime', body: 'A fleet of agents watches the record and acts: drafting, scheduling, following up. Each run is logged, cost-capped, and reversible.' },
              { icon: <Lock className="size-4.5" />, title: 'Multi-tenant by design', body: "Each brand and region is isolated with its own keys. One copy runs many businesses; none can see another's data." },
            ].map(f => (
              <div key={f.title} className="rounded-panel border border-border/70 bg-card shadow-card p-6">
                <span className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">{f.icon}</span>
                <h3 className="mt-4 text-md font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-body">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-16 lg:pb-24">
          <div className="rounded-panel bg-primary text-primary-foreground px-6 py-12 lg:px-14 lg:py-16 text-center shadow-card">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">See it running</h2>
            <p className="mt-3 text-primary-foreground/70 leading-body max-w-lg mx-auto">
              AISolar is the kernel in production today. Watch a bill turn into a
              proposal without anyone touching a keyboard.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-background text-foreground px-6 text-sm font-medium hover:opacity-90 transition-opacity">
                Explore AISolar <ArrowRight className="size-4" />
              </Link>
              <Link to="/start" className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-primary-foreground/25 px-6 text-sm font-medium hover:bg-primary-foreground/10 transition-colors">
                Try the bill analysis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter product="aios" />
    </div>
  );
}

function LadderCard({ icon, name, tag, body, to, cta, highlight }: {
  icon: React.ReactNode; name: string; tag: string; body: string; to: string; cta: string; highlight?: boolean;
}) {
  return (
    <Link to={to} className={`group rounded-panel border bg-card shadow-card p-6 flex flex-col transition-colors ${highlight ? 'border-primary/40' : 'border-border/70 hover:border-primary/30'}`}>
      <div className="flex items-center justify-between">
        <span className="size-11 rounded-lg bg-primary text-primary-foreground grid place-items-center">{icon}</span>
        <span className="text-2xs font-medium rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{tag}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{name}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-body flex-1">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium group-hover:gap-2.5 transition-all">
        {cta} <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
