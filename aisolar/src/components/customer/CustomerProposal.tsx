/**
 * CustomerProposal — the artifact the homeowner keeps.
 *
 * This is the thing they forward to their spouse and hold against two other
 * quotes. Design intent (the moat, per the brief):
 *
 *   1. EVIDENCE FIRST — "read from YOUR bill": their real usage, tariff and
 *      MPRN. OpenSolar models an average home; this proposal is provably
 *      about THEIR home. That framing sells.
 *   2. The gear as real products — image, spec, warranty — not model codes.
 *   3. One money story: gross → SEAI grant → net, then what it saves per
 *      year at THEIR rates.
 *   4. Accept + pay deposit in ONE flow (the pipeline stalls where cash
 *      matters, so the artifact ends in the money moment).
 *
 * Kernel: onAccept/onPayDeposit are the emit points (ProposalAccepted,
 * DepositPaid — refs only, no PII on the chain).
 * Print-friendly: it's also the PDF they save.
 */
import { useMemo, useState } from 'react';
import {
  BadgeCheck, Battery, CalendarCheck, Check, CircleHelp, FileText,
  Landmark, PanelsTopLeft, Printer, ShieldCheck, Sun, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getProduct, CatalogProduct } from '@/config/productCatalog';
import type { DummyLead } from '@/lib/dummyData';

const eur = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const num = (n: number | null | undefined, unit = '') =>
  n == null ? '—' : `${new Intl.NumberFormat('en-IE').format(n)}${unit}`;
const maskMprn = (m?: string | null) => (m ? `${m.slice(0, 3)}•••••${m.slice(-3)}` : '—');

/* ── The moat: what we read from THEIR bill ────────────────────────────── */
function BillEvidence({ lead }: { lead: DummyLead }) {
  const i = lead.intake ?? {};
  const cells: Array<{ label: string; value: string; hint?: string }> = [
    { label: 'Monthly bill', value: eur(i.extracted_monthly_bill ?? lead.monthly_bill) },
    { label: 'Annual usage', value: num(i.extracted_annual_kwh ?? lead.annual_kwh, ' kWh') },
    { label: 'MPRN', value: maskMprn(i.extracted_mprn ?? lead.mprn), hint: 'Your unique meter point — masked for privacy' },
    { label: 'Account name', value: i.extracted_account_name ?? lead.name },
    { label: 'Supply address', value: (i.extracted_address ?? lead.address).split(',').slice(0, 2).join(',') },
  ];
  return (
    <section className="rounded-panel border border-border bg-card overflow-hidden">
      <header className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/40">
        <FileText className="size-4 text-primary" />
        <div>
          <h2 className="text-md font-semibold leading-tight">Read from your electricity bill</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every number below came off the bill you uploaded — this proposal is
            calculated on <span className="font-medium text-foreground">your actual usage</span>, not an average home.
          </p>
        </div>
        <BadgeCheck className="size-5 text-primary ml-auto shrink-0" aria-hidden />
      </header>
      <dl className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border">
        {cells.map(c => (
          <div key={c.label} className="bg-card px-4 py-3">
            <dt className="label-micro">{c.label}</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums truncate" title={c.hint}>{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ── Product card with image slot ──────────────────────────────────────── */
const KIND_ICON = { panel: Sun, inverter: Zap, battery: Battery } as const;

function ProductCard({ product, qty }: { product: CatalogProduct; qty?: number }) {
  const Icon = KIND_ICON[product.kind];
  return (
    <article className="flex gap-4 rounded-lg border border-border bg-card p-4">
      <div className="size-20 shrink-0 rounded-md border border-border bg-muted/50 grid place-items-center overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.model} className="size-full object-contain" loading="lazy" />
        ) : (
          <Icon className="size-8 text-muted-foreground/60" aria-label={product.kind} />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold truncate">
          {qty ? `${qty} × ` : ''}{product.model}
        </h3>
        <p className="text-xs text-muted-foreground">{product.spec} · {product.warrantyYears}-yr warranty</p>
        <p className="text-xs text-muted-foreground mt-1.5 leading-ui">{product.blurb}</p>
      </div>
    </article>
  );
}

/* ── The artifact ──────────────────────────────────────────────────────── */
interface CustomerProposalProps {
  lead: DummyLead;
  onAccept?: () => void;      // kernel: ProposalAccepted (ref only)
  onPayDeposit?: () => void;  // kernel: DepositPaid (ref only)
  onQuestion?: () => void;
}

export default function CustomerProposal({ lead, onAccept, onPayDeposit, onQuestion }: CustomerProposalProps) {
  const p = lead.proposal;
  const [accepted, setAccepted] = useState(
    ['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(lead.workflow_stage),
  );
  const depositPaid = !!lead.invoice?.deposit_paid;
  const deposit = lead.invoice?.deposit_amount ?? (p ? Math.round(p.net_cost * 0.3) : 0);

  const products = useMemo(() => p ? [
    { product: getProduct(p.panel_model, 'panel')!, qty: p.panel_count },
    { product: getProduct(p.inverter_model, 'inverter')! },
    ...(p.battery_model ? [{ product: getProduct(p.battery_model, 'battery')! }] : []),
  ] : [], [p]);

  if (!p) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-sm text-muted-foreground">
        Your proposal is being prepared — we'll email you the moment it's ready.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5 print:p-0">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-micro">Solar proposal · {p.id}</p>
          <h1 className="text-xl font-semibold mt-1">{lead.name}</h1>
          <p className="text-sm text-muted-foreground">{lead.address}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer /> Save as PDF
          </Button>
        </div>
      </header>

      {/* 1 — Evidence (the moat) */}
      <BillEvidence lead={lead} />

      {/* 2 — The system */}
      <section className="rounded-panel border border-border bg-card overflow-hidden">
        <header className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <PanelsTopLeft className="size-4 text-primary" />
          <h2 className="text-md font-semibold">Your system — {p.system_size_kw} kWp</h2>
          {lead.survey && (
            <span className="ml-auto text-xs text-muted-foreground">
              sized from your {lead.survey.roof_orientation.toLowerCase()} roof · {lead.survey.available_area_m2} m²
            </span>
          )}
        </header>
        <div className="p-4 grid gap-3 sm:grid-cols-1">
          {products.map(({ product, qty }) => (
            <ProductCard key={product.model} product={product} qty={qty} />
          ))}
        </div>
      </section>

      {/* 3 — The money */}
      <section className="rounded-panel border border-border bg-card overflow-hidden">
        <header className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <Landmark className="size-4 text-primary" />
          <h2 className="text-md font-semibold">The numbers — at your rates</h2>
        </header>
        <div className="px-5 py-4 space-y-2.5">
          <div className="flex justify-between text-sm"><span>System cost</span><span className="tabular-nums">{eur(p.gross_cost)}</span></div>
          <div className="flex justify-between text-sm text-primary">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> SEAI grant (we handle the paperwork)</span>
            <span className="tabular-nums">−{eur(p.seai_grant)}</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-border pt-2.5">
            <span className="text-sm font-semibold">You pay</span>
            <span className="figure text-primary">{eur(p.net_cost)}</span>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-px bg-border border-t border-border">
          {[
            { l: 'Saves per year', v: eur(p.annual_savings), h: 'at your unit rates, from your usage pattern' },
            { l: 'Pays for itself in', v: `${p.payback_years} yrs` },
            { l: '20-year benefit', v: eur(p.twenty_year_savings) },
          ].map(x => (
            <div key={x.l} className="bg-card px-4 py-3 text-center" title={x.h}>
              <dt className="label-micro">{x.l}</dt>
              <dd className="mt-1 text-md font-semibold tabular-nums">{x.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 4 — Accept + deposit: ONE flow, status-aware */}
      <section className="rounded-panel border border-border bg-card p-5 print:hidden">
        {depositPaid ? (
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CalendarCheck className="size-4" /> Deposit received — your install is being scheduled. Nothing more to do today.
          </p>
        ) : accepted ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-sm font-medium"><Check className="size-4 text-primary" /> Proposal accepted.</p>
            <Button size="lg" className="ml-auto" onClick={() => onPayDeposit?.()}>
              Pay deposit · {eur(deposit)}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Happy with this? Accepting reserves your install slot — deposit of {eur(deposit)} confirms it.
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="default" onClick={() => onQuestion?.()}>
                <CircleHelp /> Ask a question
              </Button>
              <Button size="lg" onClick={() => { setAccepted(true); onAccept?.(); }}>
                Accept proposal
              </Button>
            </div>
          </div>
        )}
      </section>

      <p className="text-2xs text-muted-foreground text-center pb-6">
        Prices valid 30 days · SEAI grant subject to eligibility · RECI-certified installation
      </p>
    </div>
  );
}
