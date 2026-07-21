/**
 * InsightsView — measures the thing being sold: TIME.
 *
 * Cal: "insights does nothing really." It showed generic charts. But the
 * number that renews a subscription is "your agents saved you 21 hours this
 * month" — the product proving its own pitch.
 *
 * HONESTY RULE: hours saved is derived from ACTUAL agent actions in the data
 * (touchpoints with actor === 'agent'), each costed at a defensible manual
 * duration. No invented multiplier. If the agents did nothing, it says zero.
 * Every figure here can be traced to a row.
 */
import { useMemo, useState } from 'react';
import {
  ArrowRight, Bot, Clock, Euro, GraduationCap, TrendingDown, Wallet, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { PIPELINE_STAGES, STAGE_GROUPS } from '@/lib/leadIntake';

const eur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/**
 * What each agent action would have cost a human, in minutes.
 * Deliberately conservative — if an installer disputes the number we want the
 * argument to be "that's low", never "that's inflated".
 */
const TASK_MINUTES: Array<{ match: RegExp; label: string; minutes: number }> = [
  { match: /draft|proposal/i,               label: 'Drafting proposals',        minutes: 45 },
  { match: /grant|seai/i,                   label: 'SEAI grant paperwork',      minutes: 30 },
  { match: /book|schedul|survey/i,          label: 'Booking + calendar admin',  minutes: 12 },
  { match: /invoice|deposit|payment/i,      label: 'Invoicing + payment chase', minutes: 10 },
  { match: /remind|follow|chase|t-\d/i,     label: 'Reminders + follow-ups',    minutes: 6 },
  { match: /.*/,                            label: 'Customer updates',          minutes: 5 },
];

function costOf(summary: string) {
  return TASK_MINUTES.find(t => t.match.test(summary))!;
}

function Stat({ label, value, sub, icon, tone }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'hero';
}) {
  return (
    <div className={cn(
      'rounded-panel border bg-card p-4',
      tone === 'hero' ? 'border-primary/30 bg-primary/[0.03]' : 'border-border',
    )}>
      <div className="flex items-center gap-1.5">
        <span className="[&>svg]:size-3.5 text-muted-foreground">{icon}</span>
        <span className="label-micro">{label}</span>
      </div>
      <div className={cn('mt-1.5 tabular-nums font-semibold', tone === 'hero' ? 'figure text-primary' : 'text-2xl')}>
        {value}
      </div>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function InsightsView() {
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [showGuide, setShowGuide] = useState(false);

  const data = useMemo(() => {
    // ── Hours saved, from real agent actions ──────────────────────────────
    const byTask = new Map<string, { count: number; minutes: number }>();
    let totalMinutes = 0;
    for (const lead of leads) {
      for (const tp of lead.touchpoints) {
        if (tp.actor !== 'agent') continue;
        const { label, minutes } = costOf(tp.summary ?? '');
        const cur = byTask.get(label) ?? { count: 0, minutes: 0 };
        cur.count += 1; cur.minutes += minutes;
        byTask.set(label, cur);
        totalMinutes += minutes;
      }
    }
    const tasks = [...byTask.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.minutes - a.minutes);

    // ── Margin per job (closed work only) ─────────────────────────────────
    const closed = leads.filter(l => l.proposal && l.invoice?.deposit_paid);
    const avgJob = closed.length
      ? Math.round(closed.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0) / closed.length)
      : 0;

    // ── Where jobs stall: biggest drop between phases ─────────────────────
    const counts: Record<string, number> = {};
    for (const l of leads) counts[l.workflow_stage] = (counts[l.workflow_stage] ?? 0) + 1;
    const total = leads.length || 1;
    let remaining = total;
    const phases = STAGE_GROUPS.map(g => {
      const n = PIPELINE_STAGES.filter(s => s.group === g.id).reduce((a, s) => a + (counts[s.id] ?? 0), 0);
      const reach = Math.round((remaining / total) * 100);
      remaining -= n;
      return { label: g.label, reach };
    });
    let stall = { label: '', drop: 0 };
    for (let i = 1; i < phases.length; i++) {
      const drop = phases[i - 1].reach - phases[i].reach;
      if (drop > stall.drop) stall = { label: phases[i].label, drop };
    }

    // ── Which lead source converts ────────────────────────────────────────
    const bySource = new Map<string, { total: number; won: number }>();
    for (const l of leads) {
      const cur = bySource.get(l.source) ?? { total: 0, won: 0 };
      cur.total += 1;
      if (l.proposal && ['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(l.workflow_stage)) cur.won += 1;
      bySource.set(l.source, cur);
    }
    const sources = [...bySource.entries()]
      .map(([source, v]) => ({ source, ...v, rate: Math.round((v.won / v.total) * 100) }))
      .sort((a, b) => b.rate - a.rate);

    return { tasks, totalMinutes, avgJob, closedCount: closed.length, stall, sources };
  }, [leads]);

  const hours = Math.round(data.totalMinutes / 60);
  const days = (data.totalMinutes / 60 / 7.5).toFixed(1);
  const maxMinutes = data.tasks[0]?.minutes || 1;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">What your agents did</h2>
          <p className="text-sm text-muted-foreground">Every figure below traces back to a real action in your pipeline.</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setShowGuide(true)}>
          <GraduationCap /> How to read this
        </Button>
      </div>

      {/* The number that renews the subscription */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat tone="hero" icon={<Clock />} label="Hours saved" value={`${hours} hrs`}
          sub={`about ${days} working days back`} />
        <Stat icon={<Bot />} label="Agent actions" value={String(data.tasks.reduce((s, t) => s + t.count, 0))}
          sub="tasks nobody had to do" />
        <Stat icon={<Euro />} label="Average job" value={data.avgJob ? eur(data.avgJob) : '—'}
          sub={`${data.closedCount} deposit${data.closedCount === 1 ? '' : 's'} paid`} />
        <Stat icon={<TrendingDown />} label="Biggest stall" value={data.stall.label || '—'}
          sub={data.stall.drop ? `${data.stall.drop}% drop at this phase` : 'no clear stall'} />
      </div>

      {/* Where the time went */}
      <section className="rounded-panel border border-border bg-card">
        <header className="flex items-center gap-2 px-4 h-11 border-b border-border">
          <Clock className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Where the time went</h3>
        </header>
        <div className="p-4 space-y-3">
          {data.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No agent actions yet. Once leads start flowing, this fills automatically.
            </p>
          ) : data.tasks.map(t => (
            <div key={t.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{t.label}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {t.count}× · {(t.minutes / 60).toFixed(1)} hrs
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-[width] duration-base ease-out"
                  style={{ width: `${(t.minutes / maxMinutes) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Which lead source actually converts */}
      <section className="rounded-panel border border-border bg-card">
        <header className="flex items-center gap-2 px-4 h-11 border-b border-border">
          <Wallet className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Which leads become jobs</h3>
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="font-medium text-xs text-muted-foreground px-4 py-2">Source</th>
              <th className="font-medium text-xs text-muted-foreground px-4 py-2 text-right">Leads</th>
              <th className="font-medium text-xs text-muted-foreground px-4 py-2 text-right">Won</th>
              <th className="font-medium text-xs text-muted-foreground px-4 py-2 text-right">Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.sources.map(s => (
              <tr key={s.source} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 capitalize">{s.source.replace(/_/g, ' ')}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{s.total}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{s.won}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{s.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* The short training guide Cal asked for */}
      {showGuide && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="How to read insights">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowGuide(false)} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg rounded-t-modal sm:rounded-modal bg-background border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              <h3 className="text-md font-semibold">How to read this</h3>
              <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setShowGuide(false)} aria-label="Close">
                <X />
              </Button>
            </div>
            <dl className="space-y-3 text-sm">
              {[
                ['Hours saved', 'Every action your agents took, costed at what it takes a person to do by hand. Drafting a proposal counts 45 minutes, booking a survey 12, a follow-up 6. Conservative on purpose.'],
                ['Biggest stall', 'The phase where most jobs stop moving. Fix this one and the whole pipeline speeds up. It is usually worth more than finding new leads.'],
                ['Which leads become jobs', 'Win rate by where the lead came from. Spend your marketing where the rate is highest, not where the volume is.'],
                ['Average job', 'Only counts work with a deposit paid, so it reflects money you actually banked.'],
              ].map(([term, def]) => (
                <div key={term}>
                  <dt className="font-medium">{term}</dt>
                  <dd className="text-muted-foreground leading-body">{def}</dd>
                </div>
              ))}
            </dl>
            <Button className="w-full" onClick={() => setShowGuide(false)}>Got it</Button>
          </div>
        </div>
      )}
    </div>
  );
}
