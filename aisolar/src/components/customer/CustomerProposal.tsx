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
import { brand } from '@/config/brand';
import { useTenantBrand } from '@/lib/tenantBrand';
import { getProposalTerms } from '@/lib/proposalTerms';
import type { DummyLead } from '@/lib/dummyData';

const eur = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const num = (n: number | null | undefined, unit = '') =>
  n == null ? '—' : `${new Intl.NumberFormat('en-IE').format(n)}${unit}`;
const maskMprn = (m?: string | null) => (m ? `${m.slice(0, 3)}•••••${m.slice(-3)}` : '—');

/* ── The moat: what we read from THEIR bill ────────────────────────────── */
/**
 * TRUTH RULE: the headline count is computed from the fields we actually
 * hold, never hardcoded. The extractor can return 21 fields, but until the
 * bill-upload front door is wired and persisting, a given lead may only carry
 * a handful. Claiming 21 when we show 5 is the kind of overselling on Cal's
 * own DO-NOT-CLAIM list, and a homeowner can count the boxes.
 */
function BillEvidence({ lead }: { lead: DummyLead }) {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const pick = <T,>(k: string, fallback?: T) => (i[k] ?? fallback) as T | undefined;

  const rate = (n?: number | null) => (n == null ? undefined : `€${Number(n).toFixed(2)}/kWh`);

  const all: Array<{ label: string; value?: string; hint?: string }> = [
    { label: 'Monthly bill',    value: pick<number>('extracted_monthly_bill', lead.monthly_bill) != null ? eur(pick<number>('extracted_monthly_bill', lead.monthly_bill)) : undefined },
    { label: 'Annual usage',    value: pick<number>('extracted_annual_kwh', lead.annual_kwh) != null ? num(pick<number>('extracted_annual_kwh', lead.annual_kwh), ' kWh') : undefined },
    { label: 'MPRN',            value: maskMprn(pick<string>('extracted_mprn', lead.mprn)), hint: 'Your meter point, masked here for privacy' },
    { label: 'Supplier',        value: pick<string>('extracted_provider') },
    { label: 'Tariff',          value: pick<string>('extracted_tariff_name') },
    { label: 'Day rate',        value: rate(pick<number>('extracted_unit_rate')) },
    { label: 'Night rate',      value: rate(pick<number>('extracted_night_rate')) },
    { label: 'Standing charge', value: pick<number>('extracted_standing_charge') != null ? `€${Number(pick<number>('extracted_standing_charge')).toFixed(2)}${pick<string>('extracted_standing_charge_unit') ? ` ${pick<string>('extracted_standing_charge_unit')}` : ''}` : undefined },
    { label: 'Meter type',      value: pick<boolean>('extracted_day_night_meter') == null ? undefined : (pick<boolean>('extracted_day_night_meter') ? 'Day/night' : 'Single rate') },
    { label: 'Billing period',  value: pick<string>('extracted_billing_period') },
    { label: 'Eircode',         value: pick<string>('extracted_eircode') },
    { label: 'Billed usage',    value: pick<number>('extracted_billing_period_kwh') != null ? num(pick<number>('extracted_billing_period_kwh'), ' kWh') : undefined },
    { label: 'Day usage',       value: pick<number>('extracted_day_usage_kwh') != null ? num(pick<number>('extracted_day_usage_kwh'), ' kWh') : undefined },
    { label: 'Night usage',     value: pick<number>('extracted_night_usage_kwh') != null ? num(pick<number>('extracted_night_usage_kwh'), ' kWh') : undefined },
    { label: 'VAT rate',        value: pick<number>('extracted_vat_rate') != null ? `${pick<number>('extracted_vat_rate')}%` : undefined },
    { label: 'Reading type',    value: pick<boolean>('extracted_estimated_reading') == null ? undefined : (pick<boolean>('extracted_estimated_reading') ? 'Estimated' : 'Actual meter read') },
    { label: 'Account name',    value: pick<string>('extracted_account_name', lead.name) },
    { label: 'Supply address',  value: (pick<string>('extracted_address', lead.address) ?? '').split(',').slice(0, 2).join(',') || undefined },
  ];
  const cells = all.filter(c => c.value && c.value !== '—');

  return (
    <section className="rounded-panel border border-border bg-card overflow-hidden">
      <header className="flex items-start gap-2.5 px-5 py-4 border-b border-border bg-muted/40">
        <FileText className="size-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-md font-semibold leading-tight">What your bill told us</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-body">
            We read {cells.length} {cells.length === 1 ? 'detail' : 'details'} off your last bill
            {cells.some(c => /rate|Tariff|Standing/.test(c.label)) ? ', down to your tariff and unit rates' : ''}.
            Every figure in this proposal runs off those numbers. Ask the other
            quotes you get which of them opened your bill.
          </p>
        </div>
        <BadgeCheck className="size-5 text-primary ml-auto shrink-0" aria-hidden />
      </header>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {cells.map(c => (
          <div key={c.label} className="bg-card px-4 py-3">
            <dt className="label-micro">{c.label}</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums truncate" title={c.hint}>{c.value}</dd>
          </div>
        ))}
        {/* Fill trailing cells so no bare border track shows. The grid is
            2-col on mobile and 4-col from md, so the two need different pad
            counts: pad to even for mobile, to a multiple of four for desktop.
            The extra desktop-only pads are hidden on mobile, where they would
            otherwise add a whole empty row. */}
        {Array.from({ length: (4 - (cells.length % 4)) % 4 }).map((_, k) => (
          <div
            key={`pad-${k}`}
            aria-hidden
            className={cn('bg-card', k >= (2 - (cells.length % 2)) % 2 && 'hidden md:block')}
          />
        ))}
      </dl>
      <SplitInsight lead={lead} />
    </section>
  );
}

/**
 * The thing a generic quote tool cannot print.
 *
 * Every installer can quote panels off an annual kWh figure. Almost none read
 * the DAY/NIGHT SPLIT, and that split is what decides whether a battery pays
 * back. A night-heavy household is already buying cheap units and gains far
 * less from storage; a day-heavy one is paying peak rates for power the roof
 * could have made. Saying which one they are, using their own numbers, is the
 * moat — and it is honest, because it sometimes argues AGAINST the upsell.
 *
 * Renders only when both halves are present. No split, no claim.
 */
function SplitInsight({ lead }: { lead: DummyLead }) {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const day = i.extracted_day_usage_kwh as number | undefined;
  const night = i.extracted_night_usage_kwh as number | undefined;
  const estimated = i.extracted_estimated_reading as boolean | undefined;

  if (day == null || night == null || day + night <= 0) return null;

  const total = day + night;
  const nightPct = Math.round((night / total) * 100);
  const dayPct = 100 - nightPct;
  const nightHeavy = nightPct >= 40;

  return (
    <div className="px-5 py-4 border-t border-border bg-muted/20">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Your day/night split</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {dayPct}% day · {nightPct}% night
        </span>
      </div>

      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted" role="img"
        aria-label={`${dayPct} percent day usage, ${nightPct} percent night usage`}>
        <div className="bg-primary" style={{ width: `${dayPct}%` }} />
        <div className="bg-primary/35" style={{ width: `${nightPct}%` }} />
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground leading-body">
        {nightHeavy ? (
          <>You use {nightPct}% of your power at night, on the cheaper rate. Solar
          covers daytime use, so your panels do the heavy lifting here and a battery
          adds less than it would for most homes. We have sized this proposal around
          that rather than selling you storage you would wait a long time to earn back.</>
        ) : (
          <>You use {dayPct}% of your power during the day, at the expensive rate.
          That is the half solar replaces directly, which is why the savings below
          land where they do. A battery then carries the evening on stored sunshine
          instead of peak-rate units.</>
        )}
      </p>

      {estimated && (
        <p className="mt-2 text-xs text-muted-foreground leading-body">
          One caveat we would rather state than hide: your last bill was an
          estimated reading, not a meter read. The shape is right, the totals may
          move. Send us an actual read and we will rerun these figures.
        </p>
      )}
    </div>
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
        {product.datasheet && (
          <a href={product.datasheet} target="_blank" rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline print:hidden">
            <FileText className="size-3" /> Data sheet (PDF)
          </a>
        )}
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
  // The letterhead follows the OWNER's brand settings (tenantBrand), not the
  // static config — brand edits reach the customer's legal document too.
  const tb = useTenantBrand();
  const tradingName = tb.proposalCompanyName || brand.legal.tradingName;
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
        We are still putting your proposal together. It lands in your inbox the moment it is ready.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5 print:p-0">
      {/* Letterhead — this is a commercial document, so it carries the
          installer's trading identity, not an app header. */}
      <header className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          {brand.logo.image ? (
            <img src={brand.logo.image} alt={tradingName} className="h-9 w-auto" />
          ) : (
            <span className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Sun className="size-5" />
            </span>
          )}
          <div className="leading-tight">
            <div className="text-md font-semibold">{tradingName}</div>
            <div className="text-2xs text-muted-foreground">
              {[brand.legal.registeredName, brand.contact.phoneDisplay].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="label-micro">Solar proposal</p>
          <p className="text-sm font-medium tabular-nums">{p.id}</p>
          <p className="text-2xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Who it's for */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-micro">Prepared for</p>
          <h1 className="text-xl font-semibold mt-1">{lead.name}</h1>
          <p className="text-sm text-muted-foreground">{lead.address}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer /> Save as PDF
        </Button>
      </div>

      {/* 1 — Evidence (the moat) */}
      <BillEvidence lead={lead} />

      {/* 1b — THEIR roof (Cal: the proposal should carry the customer's roof).
          Keyed to the eircode from their own bill; imagery only, measured at
          survey. Print keeps it — the PDF shows their house, not clip-art. */}
      {(() => {
        const i = (lead.intake ?? {}) as Record<string, unknown>;
        const eircode = (i.extracted_eircode as string) ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0];
        // no eircode -> the address geocodes fine; every proposal shows the roof
        const query = eircode ?? lead.address;
        if (!query) return null;
        return (
          <section className="rounded-panel border border-border bg-card overflow-hidden">
            <header className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
              <Sun className="size-4 text-primary" />
              <h2 className="text-md font-semibold">Your roof</h2>
              <span className="ml-auto text-xs text-muted-foreground">{eircode ?? lead.address.split(',').slice(-1)[0]?.trim()}</span>
            </header>
            <iframe
              title="Your roof from above"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=k&z=19&output=embed`}
              className="w-full h-56 border-0"
              loading="lazy"
            />
            <p className="px-5 py-2 text-2xs text-muted-foreground">Satellite imagery of your property — panel positions are confirmed at the site survey.</p>
          </section>
        );
      })()}

      {/* 1c — What the survey CONFIRMED (Cal: lock in that wealth of data).
          Measured on site, not assumed — the block that separates this
          proposal from a desk quote. Renders only when a survey exists. */}
      {lead.survey && (
        <section className="rounded-panel border border-border bg-card overflow-hidden">
          <header className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
            <BadgeCheck className="size-4 text-doc-contract" />
            <h2 className="text-md font-semibold">What our surveyor confirmed at your home</h2>
            {lead.survey.completed_date && (
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(lead.survey.completed_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </header>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            {[
              { l: 'Roof type', v: lead.survey.roof_type },
              { l: 'Orientation', v: lead.survey.roof_orientation },
              { l: 'Pitch', v: `${lead.survey.roof_pitch}°` },
              { l: 'Shading', v: lead.survey.shading },
              { l: 'Usable area', v: `${lead.survey.available_area_m2} m²` },
              { l: 'Confirmed system', v: `${lead.survey.confirmed_system_size_kw} kWp` },
              { l: 'Panels that fit', v: String(lead.survey.confirmed_panel_count) },
              { l: 'Photos on file', v: String(lead.survey.photo_count) },
            ].filter(x => x.v && x.v !== 'undefined' && !x.v.startsWith('undefined')).map(x => (
              <div key={x.l} className="bg-card px-4 py-3">
                <dt className="label-micro">{x.l}</dt>
                <dd className="mt-1 text-sm font-semibold capitalize">{x.v}</dd>
              </div>
            ))}
          </dl>
          <p className="px-5 py-2 text-2xs text-muted-foreground border-t border-border">
            Every figure below is built on these measurements — not a desk estimate of your roof.
          </p>
        </section>
      )}

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
            <CalendarCheck className="size-4" /> Deposit received. We are booking your install now, so there is nothing else for you to do today.
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
              Accepting reserves your install slot. The {eur(deposit)} deposit confirms it.
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

      <footer className="border-t border-border pt-4 pb-8 space-y-1.5">
        <p className="text-2xs text-muted-foreground">
          {[
            brand.legal.registeredName && `${brand.legal.registeredName}${brand.legal.tradingName && brand.legal.registeredName !== brand.legal.tradingName ? ` trading as ${brand.legal.tradingName}` : ''}`,
            brand.legal.registeredAddress,
            brand.legal.companyNumber && `Company no. ${brand.legal.companyNumber}`,
            brand.legal.vatNumber && `VAT ${brand.legal.vatNumber}`,
            brand.legal.reciNumber && `RECI ${brand.legal.reciNumber}`,
            brand.legal.seaiRegistered && 'SEAI registered installer',
          ].filter(Boolean).join(' · ')}
        </p>
        {(() => {
          const t = getProposalTerms();
          return (
            <>
              <p className="text-2xs text-muted-foreground">
                Prices hold for {t.validityDays} days · {t.coolingOffDays}-day cooling-off period ·{' '}
                {t.workmanshipYears}-year workmanship warranty. The SEAI grant depends on your
                eligibility and we confirm it before you pay anything.
              </p>
              {t.customTerms && <p className="text-2xs text-muted-foreground whitespace-pre-line">{t.customTerms}</p>}
              {t.termsUrl && (
                <a href={t.termsUrl} target="_blank" rel="noopener noreferrer" className="text-2xs text-primary hover:underline print:hidden">
                  Full terms & conditions
                </a>
              )}
            </>
          );
        })()}
      </footer>
    </div>
  );
}
