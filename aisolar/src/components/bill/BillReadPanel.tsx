/**
 * BillReadPanel — THE canonical 21-point bill read.
 *
 * Cal: the bill reader, estimate and proposal are the best things on the
 * platform. This is the bill reader's ONE face, used everywhere it appears —
 * the /start front door, the in-app estimate, the LeadFlow, the customer
 * proposal. One source of truth means the moat never shows up watered down
 * (the old in-app view showed 5 fields while marketing said 21).
 *
 * Honesty is structural: the count is computed from what's actually held,
 * estimated reads get a caveat, and the day/night split argues the battery
 * case even when that argues AGAINST the upsell.
 */
import { FileText, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BillRead {
  mprn?: string | null;
  monthlyBill?: number | null;
  annualKwh?: number | null;
  billingPeriodKwh?: number | null;
  accountName?: string | null;
  address?: string | null;
  eircode?: string | null;
  provider?: string | null;
  tariffName?: string | null;
  billingPeriod?: string | null;
  unitRate?: number | null;
  nightRate?: number | null;
  standingCharge?: number | null;
  standingChargeUnit?: string | null;
  vatRate?: number | null;
  dayNightMeter?: boolean | null;
  dayUsageKwh?: number | null;
  nightUsageKwh?: number | null;
  estimatedReading?: boolean | null;
  notes?: string | null;
}

/** Map a lead's intake row (extracted_* columns) into a BillRead. */
export function billReadFromIntake(intake: Record<string, unknown> | null | undefined, fallback?: Partial<BillRead>): BillRead {
  const i = intake ?? {};
  const g = <T,>(k: string) => (i[k] ?? null) as T | null;
  return {
    mprn: g<string>('extracted_mprn') ?? fallback?.mprn ?? null,
    monthlyBill: g<number>('extracted_monthly_bill') ?? fallback?.monthlyBill ?? null,
    annualKwh: g<number>('extracted_annual_kwh') ?? fallback?.annualKwh ?? null,
    billingPeriodKwh: g<number>('extracted_billing_period_kwh'),
    accountName: g<string>('extracted_account_name') ?? fallback?.accountName ?? null,
    address: g<string>('extracted_address') ?? fallback?.address ?? null,
    eircode: g<string>('extracted_eircode') ?? fallback?.eircode ?? null,
    provider: g<string>('extracted_provider'),
    tariffName: g<string>('extracted_tariff_name'),
    billingPeriod: g<string>('extracted_billing_period'),
    unitRate: g<number>('extracted_unit_rate'),
    nightRate: g<number>('extracted_night_rate'),
    standingCharge: g<number>('extracted_standing_charge'),
    standingChargeUnit: g<string>('extracted_standing_charge_unit'),
    vatRate: g<number>('extracted_vat_rate'),
    dayNightMeter: g<boolean>('extracted_day_night_meter'),
    dayUsageKwh: g<number>('extracted_day_usage_kwh'),
    nightUsageKwh: g<number>('extracted_night_usage_kwh'),
    estimatedReading: g<boolean>('extracted_estimated_reading'),
    notes: g<string>('extracted_notes'),
  };
}

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const maskMprn = (m?: string | null) => (m ? `${m.slice(0, 3)}•••••${m.slice(-3)}` : undefined);

export function billReadCells(b: BillRead) {
  const rate = (n?: number | null) => (n == null ? undefined : `€${Number(n).toFixed(2)}/kWh`);
  const rows: Array<{ label: string; value?: string }> = [
    { label: 'Supplier', value: b.provider ?? undefined },
    { label: 'Tariff', value: b.tariffName ?? undefined },
    { label: 'MPRN', value: maskMprn(b.mprn) },
    { label: 'Account', value: b.accountName ?? undefined },
    { label: 'Monthly bill', value: b.monthlyBill != null ? eur(b.monthlyBill) : undefined },
    { label: 'Annual usage', value: b.annualKwh != null ? `${b.annualKwh.toLocaleString()} kWh` : undefined },
    { label: 'Billed usage', value: b.billingPeriodKwh != null ? `${b.billingPeriodKwh.toLocaleString()} kWh` : undefined },
    { label: 'Day rate', value: rate(b.unitRate) },
    { label: 'Night rate', value: rate(b.nightRate) },
    { label: 'Standing charge', value: b.standingCharge != null ? `€${b.standingCharge.toFixed(2)}${b.standingChargeUnit ? ` ${b.standingChargeUnit}` : ''}` : undefined },
    { label: 'VAT', value: b.vatRate != null ? `${b.vatRate}%` : undefined },
    { label: 'Meter', value: b.dayNightMeter == null ? undefined : b.dayNightMeter ? 'Day / night' : 'Single rate' },
    { label: 'Day usage', value: b.dayUsageKwh != null ? `${b.dayUsageKwh.toLocaleString()} kWh` : undefined },
    { label: 'Night usage', value: b.nightUsageKwh != null ? `${b.nightUsageKwh.toLocaleString()} kWh` : undefined },
    { label: 'Billing period', value: b.billingPeriod ?? undefined },
    { label: 'Reading', value: b.estimatedReading == null ? undefined : b.estimatedReading ? 'Estimated' : 'Actual read' },
    { label: 'Eircode', value: b.eircode ?? undefined },
    { label: 'Supply address', value: b.address ? b.address.split(',').slice(0, 2).join(',') : undefined },
  ];
  return rows.filter(r => r.value);
}

export function daySplit(b: BillRead): { dayPct: number; nightPct: number } | null {
  if (b.dayUsageKwh == null || b.nightUsageKwh == null) return null;
  const total = b.dayUsageKwh + b.nightUsageKwh;
  if (total <= 0) return null;
  const nightPct = Math.round((b.nightUsageKwh / total) * 100);
  return { dayPct: 100 - nightPct, nightPct };
}

export default function BillReadPanel({ bill, dense, className, showSplit = true }: {
  bill: BillRead;
  /** dense = in-app quick views (4-col, tighter); default = customer-facing */
  dense?: boolean;
  showSplit?: boolean;
  className?: string;
}) {
  const cells = billReadCells(bill);
  const split = daySplit(bill);
  const cols = dense ? 4 : 4;
  const pad = (cols - (cells.length % cols)) % cols;

  return (
    <div className={cn('rounded-[16px] bg-card shadow-card overflow-hidden', className)}>
      <div className={cn('px-4 border-b border-border', dense ? 'py-2.5' : 'py-3')}>
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <span className="text-sm font-semibold">What the bill told us</span>
          <span className="ml-auto inline-flex items-center gap-1 text-2xs font-medium rounded-full bg-doc-deposit/10 text-doc-deposit px-2 py-0.5">
            <BadgeCheck className="size-3" /> {cells.length} details read
          </span>
        </div>
        {!dense && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-body">
            Every figure runs off these. Ask the other quotes which of them opened the bill.
          </p>
        )}
      </div>

      <dl className={cn('grid gap-px bg-border', 'grid-cols-2 md:grid-cols-4')}>
        {cells.map(c => (
          <div key={c.label} className={cn('bg-card px-3', dense ? 'py-2' : 'py-2.5')}>
            <dt className="label-micro">{c.label}</dt>
            <dd className="text-sm font-semibold tabular-nums truncate mt-0.5">{c.value}</dd>
          </div>
        ))}
        {Array.from({ length: pad }).map((_, k) => <div key={`p${k}`} className="bg-card hidden md:block" aria-hidden />)}
      </dl>

      {showSplit && split && (
        <div className={cn('px-4 border-t border-border', dense ? 'py-2.5' : 'py-3.5')}>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold">Day / night split</span>
            <span className="text-xs text-muted-foreground tabular-nums">{split.dayPct}% day · {split.nightPct}% night</span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted" role="img"
            aria-label={`${split.dayPct} percent day usage, ${split.nightPct} percent night usage`}>
            <div className="bg-tech" style={{ width: `${split.dayPct}%` }} />
            <div className="bg-tech/30" style={{ width: `${split.nightPct}%` }} />
          </div>
          {!dense && (
            <p className="mt-2 text-xs text-muted-foreground leading-body">
              {split.nightPct >= 40
                ? `${split.nightPct}% of usage is on the cheap night rate — solar carries the day, and we'll be honest about whether a battery earns its keep.`
                : `${split.dayPct}% of usage is at the expensive day rate — exactly the half solar replaces. That's where the savings come from.`}
            </p>
          )}
        </div>
      )}

      {bill.estimatedReading && (
        <p className={cn('px-4 text-xs text-muted-foreground border-t border-border leading-body', dense ? 'py-2' : 'py-2.5')}>
          Heads up: the last reading was estimated, not measured. The shape is right; totals may move on the next actual read.
        </p>
      )}
    </div>
  );
}
