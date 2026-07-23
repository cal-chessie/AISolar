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

/* ── Cal edits here (2026-07-23, Cal's numbers: base + €97/seat) ─────────── */
const PRICES = {
  solo:   { monthly: 197, yearly: 148 },  // € base per month
  team:   { monthly: 397, yearly: 298 },
  aiteam: { monthly: 799, yearly: 599 },
  seat: 97,                               // € per additional seat / month
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
      yearlyNote: `+ €${PRICES.seat} per extra seat`,
      features: [
        '1 seat included',
        'Bill reader — 21 details off every bill',
        'Day/night split + battery case, from their real usage',
        'Instant estimate with satellite view of the roof',
        'Booking front door wired to your calendar',
        'Guided site survey with photo checklist',
        'Proposal builder with SEAI grant calculated',
        'Customer portal with live chat + documents',
        'Unlimited leads and proposals',
      ],
    },
    {
      name: 'AISolar',
      price: (y) => eur(y ? PRICES.team.yearly : PRICES.team.monthly),
      priceSub: 'per month',
      yearlyNote: `+ €${PRICES.seat} per extra seat`,
      blurb: 'The full installer OS — your whole company on one engine.',
      cta: { label: 'Try for free', to: '/get-started' },
      microcopy: '14 day free trial',
      featuresLead: 'Solo features, plus:',
      savePct: savePct(PRICES.team),
      features: [
        '3 seats included, then €97 per seat',
        'Consultant cockpit — pipeline board, calendar, inbox',
        'Installer field app — job tabs, materials, map',
        'Owner cockpit — analytics, agents, SEAI tracking',
        'Documents hub — proposals, contracts, invoices',
        'Your logo + branding on every customer page',
        'Team scheduling with cal.com booking links',
        'Role-based access for the whole crew',
      ],
      hasToggle: true,
    },
    {
      name: 'AITeam',
      price: (y) => eur(y ? PRICES.aiteam.yearly : PRICES.aiteam.monthly),
      priceSub: 'per month',
      yearlyNote: `+ €${PRICES.seat} per extra seat`,
      blurb: 'Your AI workforce on top: agents that draft, schedule and chase.',
      cta: { label: 'Try for free', to: '/aiteam' },
      microcopy: '14 day free trial',
      featuresLead: 'AISolar features, plus:',
      savePct: savePct(PRICES.aiteam),
      features: [
        'The drafter — proposals written from bill + survey',
        'The scheduler — surveys + installs booked for you',
        'The chaser — follow-ups sent on time, every time',
        'The bookkeeper — invoices raised, deposits chased',
        'The analyst — weekly digest of your whole pipeline',
        'Clear window: every action logged in plain English',
        'One-tap corrections train each agent',
        'Approval gates — nothing sends without you',
        'Daily AI cost cap with automatic fallback',
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
        'Multi-tenant — every brand + region isolated',
        'Immutable, hash-chained record of everything',
        'Custom agents built around your workflows',
        'Bring-your-own keys — email, AI, payments',
        'EU data residency + GDPR tooling built in',
        'Dedicated onboarding and rollout support',
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
        <h1 className="mt-5 max-w-3xl text-[32px] leading-[38px] sm:text-[40px] sm:leading-[44px] font-semibold tracking-tight">
          Choose your AISolar subscription
        </h1>
        <p className="mt-4 max-w-xl text-base sm:text-lg text-muted-foreground leading-body">
          Every plan starts with a free trial. Add the team when your crew
          grows, and the AI workforce when you want the admin to run itself.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={CAL_LINK} target="_blank" rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            Talk to us <ArrowRight className="size-4" />
          </a>
          <a href="#features"
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-card px-4 text-sm font-semibold shadow-card hover:bg-muted transition-colors">
            See feature breakdown <ArrowRight className="size-4" />
          </a>
        </div>

        {/* four tier cards */}
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-stretch">
          {tiers.map(tier => (
            <div
              key={tier.name}
              className={`rounded-[16px] p-4 flex flex-col h-full ${
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
              <div className="mt-4 px-1 flex items-baseline gap-2 min-h-9">
                <span className="text-[32px] leading-none font-semibold tabular-nums">{tier.price(yearly)}</span>
                {tier.priceSub && (
                  <span className={`text-sm ${tier.dark ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{tier.priceSub}</span>
                )}
                {tier.hasToggle && yearly && tier.savePct && (
                  <span className={`ml-auto text-xs rounded-[4px] px-1 py-0.5 ${tier.dark ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-tech-subtle text-tech'}`}>
                    Save {tier.savePct}
                  </span>
                )}
              </div>

              {tier.yearlyNote && (
                <p className={`mt-1 px-1 text-xs ${tier.dark ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{tier.yearlyNote}</p>
              )}
              <p className={`mt-3 px-1 text-sm leading-body min-h-16 ${tier.dark ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
                {tier.blurb}
              </p>

              {/* CTA + microcopy */}
              {tier.cta.external ? (
                <a href={tier.cta.to} target="_blank" rel="noreferrer"
                  className={`mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] text-sm font-semibold transition-opacity hover:opacity-90 ${
                    tier.dark ? 'bg-background text-foreground' : 'bg-primary text-primary-foreground'
                  }`}>
                  {tier.cta.label} <ArrowRight className="size-4" />
                </a>
              ) : (
                <Link to={tier.cta.to}
                  className={`mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] text-sm font-semibold transition-opacity hover:opacity-90 ${
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
              <ul className="mt-2 px-1 space-y-2 flex-1">
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

        {/* ── Feature breakdown — cal.com's grouped comparison table ────────── */}
        <section id="features" className="mt-20 scroll-mt-24">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Compare plans</h2>
          <p className="mt-2 text-muted-foreground leading-body max-w-xl">
            Everything in every plan, side by side. Each tier includes everything
            below it.
          </p>

          <div className="mt-8 overflow-x-auto rounded-[16px] bg-card shadow-card">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 w-[40%]">Features</th>
                  {['Solo', 'AISolar', 'AITeam', 'AIOS'].map(n => (
                    <th key={n} className={`px-4 py-3 text-center font-semibold ${n === 'AITeam' ? 'text-foreground' : ''}`}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_GROUPS.map(group => (
                  <FeatureGroupRows key={group.name} group={group} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          All prices ex-VAT. Every plan adds seats at €{PRICES.seat} per month. AISolar and AITeam are AIOS products — one engine, three ways in.
        </p>
      </main>

      <MarketingFooter product="aisolar" />
    </div>
  );
}


/* ── Feature breakdown data — held to what exists (DO-NOT-CLAIM) ─────────── */
type Avail = boolean | string;
interface FeatureRow { label: string; solo: Avail; team: Avail; aiteam: Avail; aios: Avail }
interface FeatureGroup { name: string; rows: FeatureRow[] }

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    name: 'Sell',
    rows: [
      { label: 'Bill reader — 21 details per bill', solo: true, team: true, aiteam: true, aios: true },
      { label: 'Instant estimate + booking front door', solo: true, team: true, aiteam: true, aios: true },
      { label: 'Satellite view of every property (Eircode)', solo: true, team: true, aiteam: true, aios: true },
      { label: 'Survey → design → proposal flow', solo: true, team: true, aiteam: true, aios: true },
      { label: 'Customer portal with chat', solo: true, team: true, aiteam: true, aios: true },
      { label: 'SEAI grant calculated on every proposal', solo: true, team: true, aiteam: true, aios: true },
    ],
  },
  {
    name: 'Run the company',
    rows: [
      { label: 'Seats included', solo: '1', team: '3', aiteam: '3', aios: 'Custom' },
      { label: 'Consultant cockpit — pipeline, calendar, documents', solo: false, team: true, aiteam: true, aios: true },
      { label: 'Installer field app with job checklists', solo: false, team: true, aiteam: true, aios: true },
      { label: 'Your branding on every proposal', solo: false, team: true, aiteam: true, aios: true },
      { label: 'Owner cockpit with analytics', solo: false, team: true, aiteam: true, aios: true },
    ],
  },
  {
    name: 'The AI workforce',
    rows: [
      { label: 'Proposal drafts written for you', solo: false, team: false, aiteam: true, aios: true },
      { label: 'Surveys booked, follow-ups sent on time', solo: false, team: false, aiteam: true, aios: true },
      { label: 'Payment reminders + customer digests', solo: false, team: false, aiteam: true, aios: true },
      { label: 'Clear window on every agent action', solo: false, team: false, aiteam: true, aios: true },
      { label: 'One-tap corrections train your agents', solo: false, team: false, aiteam: true, aios: true },
      { label: 'Approval gates — nothing sends itself', solo: false, team: false, aiteam: true, aios: true },
    ],
  },
  {
    name: 'The platform',
    rows: [
      { label: 'Multi-tenant — many brands, one engine', solo: false, team: false, aiteam: false, aios: true },
      { label: 'Immutable record of everything', solo: false, team: false, aiteam: false, aios: true },
      { label: 'Custom agents, built with us', solo: false, team: false, aiteam: false, aios: true },
      { label: 'Dedicated onboarding and support', solo: false, team: false, aiteam: false, aios: true },
    ],
  },
];

function Cell({ v }: { v: Avail }) {
  if (typeof v === 'string') return <span className="text-sm font-medium tabular-nums">{v}</span>;
  return v
    ? <Check className="size-4 mx-auto text-foreground" aria-label="Included" />
    : <span className="text-muted-foreground/40" aria-label="Not included">—</span>;
}

function FeatureGroupRows({ group }: { group: FeatureGroup }) {
  return (
    <>
      <tr className="border-b border-border bg-muted/40">
        <td colSpan={5} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</td>
      </tr>
      {group.rows.map(row => (
        <tr key={row.label} className="border-b border-border last:border-0">
          <td className="px-4 py-2.5">{row.label}</td>
          <td className="px-4 py-2.5 text-center"><Cell v={row.solo} /></td>
          <td className="px-4 py-2.5 text-center"><Cell v={row.team} /></td>
          <td className="px-4 py-2.5 text-center bg-primary/[0.03]"><Cell v={row.aiteam} /></td>
          <td className="px-4 py-2.5 text-center"><Cell v={row.aios} /></td>
        </tr>
      ))}
    </>
  );
}
