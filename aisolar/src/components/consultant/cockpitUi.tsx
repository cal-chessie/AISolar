/**
 * cockpitUi — the shared design language for the consultant cockpit.
 *
 * One place for the family-colour tones and the KPI tile, so Today, Insights
 * and Calendar all read as the same product (Cal: "same design touch"). The
 * palette is the family: blue (tech), red (pop), gold (doc-proposal), green
 * (doc-deposit) — never a grey wall.
 */

const eur = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/** Compact form for KPI tiles so big figures never clip on mobile. */
export const eurCompact = (n: number) => n >= 10000 ? `€${Math.round(n / 1000)}k` : eur(n);

export type Tone = 'tech' | 'pop' | 'proposal' | 'deposit' | 'neutral';

export const TONE: Record<Tone, { text: string; chip: string; edge: string; ring: string }> = {
  tech:     { text: 'text-tech',         chip: 'bg-tech-subtle text-tech',                 edge: 'bg-tech',         ring: 'group-hover:border-tech/40' },
  pop:      { text: 'text-pop',          chip: 'bg-pop/10 text-pop',                       edge: 'bg-pop',          ring: 'group-hover:border-pop/40' },
  proposal: { text: 'text-doc-proposal', chip: 'bg-doc-proposal-subtle text-doc-proposal', edge: 'bg-doc-proposal', ring: 'group-hover:border-doc-proposal/40' },
  deposit:  { text: 'text-doc-deposit',  chip: 'bg-doc-deposit/10 text-doc-deposit',       edge: 'bg-doc-deposit',  ring: 'group-hover:border-doc-deposit/40' },
  neutral:  { text: 'text-muted-foreground', chip: 'bg-muted text-muted-foreground',        edge: 'bg-muted-foreground/40', ring: 'group-hover:border-border' },
};

/**
 * Phase → family tone. A lead's pipeline group decides its badge colour, so the
 * Inbox reads by hue instead of one grey wall (intake grey, survey/contract
 * blue, proposal gold, install red, closeout green).
 */
export const PHASE_TONE: Record<string, Tone> = {
  intake: 'neutral',
  survey: 'tech',
  proposal: 'proposal',
  contract: 'tech',
  install: 'pop',
  closeout: 'deposit',
};

export function Kpi({ tone, icon, value, label, sub }: {
  tone: Tone; icon: React.ReactNode; value: string | number; label: string; sub?: string;
}) {
  const t = TONE[tone];
  return (
    <div className="rounded-panel border border-border/70 bg-card shadow-card px-3.5 py-3 flex items-center gap-3">
      <span className={`size-9 shrink-0 rounded-control grid place-items-center [&>svg]:size-4 ${t.chip}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-xl font-semibold tabular-nums leading-none">{value}</div>
        <div className="text-2xs text-muted-foreground mt-1 truncate">{label}</div>
        {sub && <div className="text-2xs text-muted-foreground/70 truncate">{sub}</div>}
      </div>
    </div>
  );
}
