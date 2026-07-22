/**
 * PricingPage — /pricing
 *
 * LITERALLY cal.com/pricing's layout (measured off the live page: grey canvas,
 * eyebrow pill, huge display headline, two hero buttons, four floating tier
 * cards with ONE dark recommended card, yearly toggle + "Save 25%" badge, thin
 * tier names over 32px prices, CTA pill + microcopy + feature checklist) —
 * carrying Cal's offers: AISolar (Solo + Team), AITeam, AIOS.
 *
 * PRICES: single source of truth below — Cal edits one object, page updates.
 * Feature lists are held to what actually exists (DO-NOT-CLAIM).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';

/* ── Cal edits here (2026-07-23, Cal's numbers) ──────────────────────────── */
const PRICES = {
  solo:   { monthly: 99,  yearly: 83,  yearlyBilled: 997 }, // €997/yr = €83/mo
  team:   { monthly: 199, yearly: 79 },                     // € per user / month
  aiteam: { monthly: 399, yearly: 365 },                    // € per month
};
const CAL_LINK = 'https://cal.com/renewableireland/solar-consultation';
/** Honest save badge — computed from the real numbers, never hardcoded. */
const savePct = (p: { monthly: number; yearly: number }) =>
  `${Math.round((1 - p.yearly / p.monthly) * 100)}%`;
/* ────────────────────────────────────────────────────────────────────────── */

const eur = (n: number) => `€${n}`;

interface Tier {
  name: string;
  price: (yearly: boolean) => string;
  priceSub: string;
  blurb: string;
  cta: { label: string; to: string; external?: boolean };
  microcopy: string;
  featuresLead: string;
  features: string[];
  dark?: boolean;
  hasToggle?: boolean;
  savePct?: string;
  yearlyNote?: string;
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(true);

  const tiers: Tier[] = [
    {
      name: 'Solo',
      price: (y) => eur(y ? PRICES.solo.yearly : PRICES.solo.monthly),
      priceSub: 'per month',
      blurb: 'Everything one installer needs to run bill-to-proposal.',
      cta: { label: 'Try for free', to: '/get-started' },
      microcopy: 'Free for 7 days',
      featuresLead: 'Solo features:',
      hasToggle: true,
      savePct: savePct(PRICES.solo),
      yearlyNote: `€${PRICES.solo.yearlyBilled} billed yearly`,
      features: [
        '1 user',
        'Bill reader — 21 details per bill',
        'Instant estimate + booking front door',
        'Survey → design → proposal flow',
        'Customer portal with chat',
        'One cockpit for your whole pipeline',
      ],
    },
    {
      name: 'Team',
      price: (y) => eur(y ? PRICES.team.yearly : PRICES.team.monthly),
      priceSub: 'per month/user',
      blurb: 'For installer teams with consultants and crews on the road.',
      cta: { label: 'Try for free', to: '/get-started' },
      microcopy: '14 day free trial',
      featuresLead: 'Solo features, plus:',
      savePct: savePct(PRICES.team),
      features: [
        'Consultant + installer seats',
        'Shared pipeline board and calendar',
        'Documents — proposals, contracts, invoices',
        'Installer field app with job checklists',
        'Your branding on every proposal',
      ],
      hasToggle: true,
    },
    {
      name: 'AITeam',
      price: (y) => eur(y ? PRICES.aiteam.yearly : PRICES.aiteam.monthly),
      priceSub: 'per month',
      blurb: 'The AI workforce on top: agents that draft, schedule and chase.',
      cta: { label: 'Try for free', to: '/aiteam' },
      microcopy: '14 day free trial',
      featuresLead: 'Team features, plus:',
      savePct: savePct(PRICES.aiteam),
      features: [
        'Proposal drafts written for you',
        'Surveys booked, follow-ups sent on time',
        'Payment reminders and customer digests',
        'A clear window on every agent action',
        'One-tap corrections train your agents',
        'You approve — nothing sends itself',
      ],
      dark: true,
      hasToggle: true,
    },
    {
      name: 'AIOS',
      price: () => 'Custom',
      priceSub: '',
      blurb: 'The operating system underneath, for your own vertical or fleet.',
      cta: { label: 'Talk to us', to: CAL_LINK, external: true },
      microcopy: '*Annual pricing',
      featuresLead: 'AITeam features, plus:',
      features: [
        'Multi-tenant — many brands, one engine',
        'Immutable record of everything',
        'Your own agents, built with us',
        'Dedicated onboarding and support',
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav product="aisolar" />

      <main className="mx-auto max-w-6xl px-5 pt-12 pb-20 lg:pt-16 lg:pb-28">
        {/* eyebrow + headline + subtitle — cal.com hero */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
          <span className="size-1.5 rounded-full bg-primary" /> Pricing
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          Choose your AISolar subscription
        </h1>
        <p className="mt-4 max-w-xl text-base sm:text-lg text-muted-foreground leading-body">
          Every plan starts with a free trial. Add the team when your crew
          grows, and the AI workforce when you want the admin to run itself.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={CAL_LINK} target="_blank" rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Talk to us <ArrowRight className="size-4" />
          </a>
          <Link to="/#product"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium shadow-card hover:bg-muted transition-colors">
            See how it works <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* four tier cards */}
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
          {tiers.map(tier => (
            <div
              key={tier.name}
              className={`rounded-[16px] p-4 flex flex-col ${
                tier.dark
                  ? 'bg-primary text-primary-foreground shadow-card'
                  : 'bg-card shadow-card'
              }`}
            >
              {/* tier name (thin) + yearly toggle */}
              <div className="flex items-center justify-between gap-2 px-1">
                <h3 className="text-lg font-light">{tier.name}</h3>
                {tier.hasToggle && (
                  <button
                    type="button"
                    onClick={() => setYearly(v => !v)}
                    className="flex items-center gap-1.5 cursor-pointer"
                    aria-pressed={yearly}
                    aria-label="Toggle yearly billing"
                  >
                    <span className={`text-[10px] font-medium uppercase tracking-wide ${tier.dark ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>Yearly</span>
                    <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${yearly ? (tier.dark ? 'bg-primary-foreground/90' : 'bg-primary') : (tier.dark ? 'bg-primary-foreground/30' : 'bg-muted-foreground/30')}`}>
                      <span className={`inline-block size-4 rounded-full transition-transform ${tier.dark ? 'bg-primary' : 'bg-white'} ${yearly ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </span>
                  </button>
                )}
              </div>

              {/* price */}
              <div className="mt-4 px-1 flex items-baseline gap-2 min-h-10">
                <span className="text-[32px] leading-none font-semibold tabular-nums">{tier.price(yearly)}</span>
                {tier.priceSub && (
                  <span className={`text-sm ${tier.dark ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{tier.priceSub}</span>
                )}
                {tier.hasToggle && yearly && tier.savePct && (
                  <span className={`ml-auto text-xs rounded px-1.5 py-0.5 ${tier.dark ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-tech-subtle text-tech'}`}>
                    Save {tier.savePct}
                  </span>
                )}
              </div>

              {tier.yearlyNote && yearly && (
                <p className="mt-1 px-1 text-xs text-muted-foreground">{tier.yearlyNote}</p>
              )}
              <p className={`mt-3 px-1 text-sm leading-body min-h-16 ${tier.dark ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
                {tier.blurb}
              </p>

              {/* CTA + microcopy */}
              {tier.cta.external ? (
                <a href={tier.cta.to} target="_blank" rel="noreferrer"
                  className={`mt-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 ${
                    tier.dark ? 'bg-background text-foreground' : 'bg-primary text-primary-foreground'
                  }`}>
                  {tier.cta.label} <ArrowRight className="size-4" />
                </a>
              ) : (
                <Link to={tier.cta.to}
                  className={`mt-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 ${
                    tier.dark ? 'bg-background text-foreground' : 'bg-primary text-primary-foreground'
                  }`}>
                  {tier.cta.label} <ArrowRight className="size-4" />
                </Link>
              )}
              <p className={`mt-2 text-center text-xs ${tier.dark ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {tier.microcopy}
              </p>

              {/* features */}
              <p className={`mt-4 px-1 text-sm font-medium ${tier.dark ? 'text-primary-foreground/85' : ''}`}>{tier.featuresLead}</p>
              <ul className="mt-2 px-1 space-y-2">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`size-4 mt-0.5 shrink-0 ${tier.dark ? 'text-primary-foreground' : 'text-foreground'}`} />
                    <span className={tier.dark ? 'text-primary-foreground/85' : ''}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          All prices ex-VAT. AISolar and AITeam are AIOS products — one engine, three ways in.
        </p>
      </main>

      <MarketingFooter product="aisolar" />
    </div>
  );
}
