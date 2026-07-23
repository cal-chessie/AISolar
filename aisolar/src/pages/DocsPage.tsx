/**
 * DocsPage — /docs. The documentation hub (Cal: "docs in the header").
 * Honest scope: quick starts that exist today, per-product guides that link to
 * the real surfaces, and the agent-facing llms.txt note. Grows at launch.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Rocket, Bot, Calculator, Shield, Compass } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';

const SECTIONS = [
  {
    head: 'Get started', icon: Rocket,
    items: [
      { label: 'Run a free bill analysis', desc: 'Upload a bill, get the 21-point estimate, book the call.', to: '/start' },
      { label: 'Create your workspace', desc: 'Google or email. Owner, sales or field role.', to: '/get-started' },
      { label: 'Take the tour', desc: 'Every view, guided, on demo data — nothing breaks.', to: '/onboarding' },
    ],
  },
  {
    head: 'The products', icon: Compass,
    items: [
      { label: 'AISolar — the installer OS', desc: 'Bill to proposal to install, one pipeline.', to: '/aisolar' },
      { label: 'AITeam — the AI workforce', desc: 'Ten agents, approval-gated, with a clear window.', to: '/aiteam' },
      { label: 'AIOS — the kernel', desc: 'The immutable record and agent runtime underneath.', to: '/' },
    ],
  },
  {
    head: 'Tools', icon: Calculator,
    items: [
      { label: 'ROI calculator', desc: 'Savings, payback and grant maths for any home.', to: '/calculator' },
      { label: 'Browse every view', desc: 'The full route index of the platform.', to: '/demo' },
    ],
  },
  {
    head: 'Trust & legal', icon: Shield,
    items: [
      { label: 'Privacy', desc: 'EU-hosted, GDPR tooling, right to erasure.', to: '/privacy' },
      { label: 'Terms of service', desc: 'The plain-English agreement.', to: '/terms' },
      { label: 'About', desc: 'Who builds this and why.', to: '/about' },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav product="aios" />
      <main className="mx-auto max-w-6xl px-5 pt-12 pb-20 lg:pt-16 lg:pb-28">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
          <span className="size-1.5 rounded-full bg-primary" /> Documentation
        </span>
        <h1 className="mt-5 max-w-3xl text-[32px] leading-[38px] sm:text-[40px] sm:leading-[44px] font-semibold tracking-tight">
          Everything, explained
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground leading-body">
          Quick starts, the product guides, and the tools — all of it live, none
          of it theoretical. Full developer docs land with the public API.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {SECTIONS.map(s => (
            <section key={s.head} className="rounded-[16px] bg-card shadow-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><s.icon className="size-4 text-primary" /> {s.head}</h2>
              <div className="mt-3 divide-y divide-border">
                {s.items.map(i => (
                  <Link key={i.label} to={i.to} className="group flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium group-hover:text-tech transition-colors">{i.label}</span>
                      <span className="block text-xs text-muted-foreground truncate">{i.desc}</span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground/40 group-hover:text-tech shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="size-3.5" /> AI agents: a machine-readable llms.txt index ships with the public docs at launch.
        </p>
      </main>
      <MarketingFooter product="aios" />
    </div>
  );
}
