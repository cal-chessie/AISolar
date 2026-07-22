/**
 * AISolarLanding — /
 *
 * The SaaS front, rebuilt to match cal.com's MARKETING site (not just the
 * pricing page): floating white cards on a grey canvas, a huge display hero
 * with a product visual beside it, a trust strip, a numbered "how it works",
 * alternating benefit blocks, a final CTA and an AIOS-family footer.
 *
 * Palette is AIOS: monochrome charcoal + white + grey, no colour accent. The
 * charcoal is the ink AND the button fill, the way cal.com uses black.
 *
 * Copy is held to what the product actually does (see the DO-NOT-CLAIM list in
 * the vault): bill extraction, the day/night split, agents that draft/schedule/
 * follow-up with approval, and one cockpit. No WhatsApp/SMS/roof-detection/
 * grant-submission claims.
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Bot, Check, FileText, Gauge, Menu,
  MoveRight, ShieldCheck, Sun, Zap,
} from 'lucide-react';
import { brand } from '@/config/brand';

/* ── Nav ─────────────────────────────────────────────────────────────────── */
function Nav() {
  const links = ['Product', 'Agents', 'Pricing', 'Docs'];
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="size-7 rounded-lg bg-primary grid place-items-center text-primary-foreground">
            <Sun className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">
            AISOLAR <span className="text-muted-foreground font-normal">by AIOS</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-2">
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-instant">
              {l}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth" className="hidden sm:inline-flex h-control items-center px-3 text-sm font-medium hover:bg-muted rounded-control transition-colors duration-instant">
            Sign in
          </Link>
          <Link to="/auth" className="inline-flex h-control items-center gap-1.5 rounded-control bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity duration-instant">
            Get started <ArrowRight className="size-4" />
          </Link>
          <button className="md:hidden inline-grid place-items-center size-control rounded-control hover:bg-muted" aria-label="Menu">
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ── The product visual beside the hero: the moat, in miniature ──────────── */
function HeroVisual() {
  return (
    <div className="rounded-panel border border-border/70 bg-card shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <FileText className="size-4 text-primary" />
        <span className="text-sm font-semibold">What your bill told us</span>
        <BadgeCheck className="size-4 text-primary ml-auto" />
      </div>
      <dl className="grid grid-cols-2 gap-px bg-border">
        {[
          ['Day rate', '€0.36/kWh'], ['Night rate', '€0.17/kWh'],
          ['Annual usage', '12,200 kWh'], ['MPRN', '100•••••595'],
        ].map(([k, v]) => (
          <div key={k} className="bg-card px-4 py-2.5">
            <dt className="label-micro">{k}</dt>
            <dd className="text-sm font-semibold tabular-nums mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="px-4 py-3.5 border-t border-border">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold">Day / night split</span>
          <span className="text-xs text-muted-foreground tabular-nums">77% day · 23% night</span>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
          <div className="bg-primary" style={{ width: '77%' }} />
          <div className="bg-primary/30" style={{ width: '23%' }} />
        </div>
      </div>
      <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/30">
        <div>
          <p className="label-micro">You pay</p>
          <p className="text-lg font-semibold tabular-nums">€9,340</p>
        </div>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-control bg-primary px-3.5 text-sm font-medium text-primary-foreground">
          Accept <ArrowRight className="size-4" />
        </span>
      </div>
    </div>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 pb-16 lg:pt-20 lg:pb-24">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
            <span className="size-1.5 rounded-full bg-primary" /> AISolar by AIOS
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
            The better way to run<br className="hidden sm:block" /> your solar business
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-body max-w-xl">
            Upload a homeowner's bill and the agents take it from there:
            proposals drafted, surveys scheduled, follow-ups sent on time. Your
            crews install. The platform runs the rest.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:max-w-md">
            <Link to="/auth" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity duration-instant">
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link to="/demo" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control border border-border bg-card px-5 text-sm font-medium shadow-card hover:bg-muted transition-colors duration-instant">
              See it live
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
            <Check className="size-3.5 text-primary" /> Built for Irish installers · SEAI &amp; RECI aware
          </p>
        </div>

        <div className="lg:pl-6">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

/* ── Trust strip ─────────────────────────────────────────────────────────── */
function Trust() {
  const marks = [
    ['SEAI Registered', ShieldCheck],
    ['RECI aware', BadgeCheck],
    ['MPRN-accurate', Gauge],
    ['One kernel of record', Zap],
  ] as const;
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <p className="text-center text-xs uppercase tracking-wide text-muted-foreground">
          Built for how Irish solar actually runs
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {marks.map(([label, Icon]) => (
            <span key={label} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="size-4" /> {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How it works: three numbered steps ──────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: '01', title: 'Upload the bill',
      body: 'We read 21 details off the homeowner\'s last bill — tariff, day/night split, MPRN, standing charge. Every proposal runs off their real numbers, not an average home.',
      icon: FileText,
    },
    {
      n: '02', title: 'Agents do the admin',
      body: 'Proposals draft themselves, surveys get scheduled, follow-ups go out on time. You approve the work; you never chase it. Get one wrong and one tap trains it.',
      icon: Bot,
    },
    {
      n: '03', title: 'You close and install',
      body: 'One cockpit shows every job and where it\'s stuck. Your crews install; the platform carries the paperwork and the customer updates.',
      icon: Gauge,
    },
  ];
  return (
    <section id="product" className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
      <div className="max-w-2xl">
        <p className="label-micro">How it works</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
          Half the admin, closed twice as fast
        </h2>
        <p className="mt-3 text-muted-foreground leading-body">
          The bill goes in the front door and the pipeline runs itself to a
          signed proposal. You stay in control at every step.
        </p>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-5">
        {steps.map(s => (
          <div key={s.n} className="rounded-panel border border-border/70 bg-card shadow-card p-6">
            <div className="flex items-center gap-3">
              <span className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <s.icon className="size-4.5" />
              </span>
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">{s.n}</span>
            </div>
            <h3 className="mt-4 text-md font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-body">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Benefits: alternating feature blocks ────────────────────────────────── */
function Benefit({ eyebrow, title, body, points, reverse, children }: {
  eyebrow: string; title: string; body: string; points: string[]; reverse?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-8 lg:gap-14 items-center ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      <div>
        <p className="label-micro">{eyebrow}</p>
        <h3 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-3 text-muted-foreground leading-body">{body}</p>
        <ul className="mt-5 space-y-2.5">
          {points.map(p => (
            <li key={p} className="flex items-start gap-2.5 text-sm">
              <Check className="size-4 text-primary mt-0.5 shrink-0" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Benefits() {
  return (
    <section id="agents" className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24 space-y-16 lg:space-y-24">
        <Benefit
          eyebrow="The moat"
          title="Read the bill no one else reads"
          body="Every installer quotes off an annual kWh figure. Almost none read the day/night split — the one number that decides whether a battery pays for itself. AISolar reads it, and the proposal argues the honest case in the homeowner's own numbers."
          points={[
            '21 fields pulled from the bill and kept on the record',
            'Battery case made from their real day/night split',
            'Estimated reads flagged, never hidden',
          ]}
        >
          <HeroVisual />
        </Benefit>

        <Benefit
          reverse
          eyebrow="Agents"
          title="Agents that move the pipeline, not a chatbot"
          body="Named agents draft proposals, schedule surveys and send follow-ups — each posting what it did in plain English. When one gets it wrong, the consultant taps once to correct it, and that correction is the training data."
          points={[
            'A clear window on every agent action',
            'Approve, never auto-send',
            'One-tap corrections from the people in the field',
          ]}
        >
          <div className="rounded-panel border border-border/70 bg-card shadow-card p-4 space-y-3">
            {[
              ['ProposalDrafter', 'drafted a 6.2kW + battery proposal', 'just now'],
              ['SurveyScheduler', 'booked the survey for Tue 10am', '2m ago'],
              ['FollowUpAgent', 'sent the T-7 reminder', '5m ago'],
            ].map(([a, s, t]) => (
              <div key={a} className="flex items-start gap-2.5">
                <span className="size-6 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Bot className="size-3.5" />
                </span>
                <p className="text-sm leading-ui">
                  <span className="font-medium">{a}</span>{' '}
                  <span className="text-muted-foreground">{s}</span>
                  <span className="block text-2xs text-muted-foreground mt-0.5">{t}</span>
                </p>
              </div>
            ))}
          </div>
        </Benefit>

        <Benefit
          eyebrow="One cockpit"
          title="The whole operation on one screen"
          body="Owner, consultant and installer each get the view built for them, off the same live data. The kernel keeps one immutable record of every job, so nothing is ever entered twice."
          points={[
            'Owner sees the fleet; the crew sees the job',
            'Hours-saved measured from real agent actions',
            'One record of truth, no double entry',
          ]}
        >
          <div className="rounded-panel border border-border/70 bg-card shadow-card p-5 grid grid-cols-2 gap-4">
            {[
              ['Hours saved', '21 hrs'], ['Avg job', '€16,560'],
              ['Agent actions', '148'], ['Biggest stall', 'Closeout'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="label-micro">{k}</p>
                <p className="figure mt-1">{v}</p>
              </div>
            ))}
          </div>
        </Benefit>
      </div>
    </section>
  );
}

/* ── Final CTA ───────────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
      <div className="rounded-panel bg-primary text-primary-foreground px-6 py-12 lg:px-14 lg:py-16 text-center shadow-card">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Ready to run on autopilot?
        </h2>
        <p className="mt-3 text-primary-foreground/70 leading-body max-w-lg mx-auto">
          Start free. Upload one bill and watch the pipeline draft the proposal.
          No card required.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth" className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-background text-foreground px-6 text-sm font-medium hover:opacity-90 transition-opacity duration-instant">
            Get started <ArrowRight className="size-4" />
          </Link>
          <Link to="/demo" className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-primary-foreground/25 px-6 text-sm font-medium hover:bg-primary-foreground/10 transition-colors duration-instant">
            See it live
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Footer: the AIOS family ─────────────────────────────────────────────── */
function Footer() {
  const cols: Array<[string, string[]]> = [
    ['Product', ['How it works', 'Agents', 'Pricing', 'Book a demo']],
    ['AIOS family', ['AISolar', 'AITeam', 'AIOS']],
    ['Company', ['About', 'Privacy', 'Terms']],
  ];
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary grid place-items-center text-primary-foreground">
              <Sun className="size-4" />
            </span>
            <span className="font-semibold tracking-tight">AISOLAR</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-body max-w-[15rem]">
            The solar installer operating system. An <span className="font-medium text-foreground">AIOS</span> product.
          </p>
        </div>
        {cols.map(([head, items]) => (
          <div key={head}>
            <p className="label-micro">{head}</p>
            <ul className="mt-3 space-y-2">
              {items.map(i => (
                <li key={i}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-instant">{i}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {brand.legal.registeredName}</span>
          <span className="ml-auto">AISolar by AIOS</span>
        </div>
      </div>
    </footer>
  );
}

export default function AISolarLanding() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Trust />
        <HowItWorks />
        <Benefits />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
