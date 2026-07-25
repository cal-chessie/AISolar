/**
 * ConsultantInsights — the intel, read at a glance.
 *
 * Cal: "a full revamp on insights now we have all the intel." The old version
 * was four grey stat boxes and a bar chart. This is the consultant's book of
 * business on one screen, on the family palette:
 *   - the numbers that matter (value, win rate, avg deal, chasing)
 *   - where every deal sits (the funnel, in money)
 *   - who's warming up (proposal opens — the strongest buying signal)
 *   - what to act on now (hot + slipping, one click to the lead)
 */
import { useMemo } from 'react';
import { TrendingUp, DollarSign, Clock, Send, Flame, Eye, ArrowRight, Layers } from 'lucide-react';
import type { DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES, STAGE_GROUPS } from '@/lib/leadIntake';
import { leadEngagement } from '@/lib/engagement';
import { leadIntel } from '@/lib/consultantIntelligence';
import EngagementBadge from '@/components/consultant/EngagementBadge';
import { Kpi, eurCompact } from './cockpitUi';

const initials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('');

/** Funnel colour per phase — the family, so each stage reads by hue. */
const GROUP_TONE: Record<string, string> = {
  intake: 'bg-muted-foreground/50',
  survey: 'bg-tech',
  proposal: 'bg-doc-proposal',
  contract: 'bg-doc-contract',
  install: 'bg-primary',
  closeout: 'bg-doc-deposit',
};

export default function ConsultantInsights({ leads, onOpenLead }: {
  leads: DummyLead[];
  onOpenLead: (lead: DummyLead) => void;
}) {
  const m = useMemo(() => {
    const withProposal = leads.filter(l => l.proposal);
    const totalValue = withProposal.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0);
    const active = leads.filter(l => !['completed', 'final_paid'].includes(l.workflow_stage)).length;
    const signed = leads.filter(l => l.contract).length;
    const winRate = leads.length ? Math.round((signed / leads.length) * 100) : 0;
    const avgDeal = withProposal.length ? Math.round(totalValue / withProposal.length) : 0;
    const stale = leads.map(l => ({ l, i: leadIntel(l) })).filter(x => x.i.isStale)
      .sort((a, b) => b.i.daysSinceContact - a.i.daysSinceContact);
    const engaged = leads.map(l => ({ l, e: leadEngagement(l) })).filter(x => x.e.views > 0)
      .sort((a, b) => b.e.views - a.e.views);
    const hot = engaged.filter(x => x.e.warmth === 'hot');
    const groups = STAGE_GROUPS.map(g => {
      const gl = leads.filter(l => PIPELINE_STAGES.find(ps => ps.id === l.workflow_stage)?.group === g.id);
      return { ...g, count: gl.length, value: gl.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0) };
    });
    const maxCount = Math.max(1, ...groups.map(g => g.count));
    return { totalValue, active, winRate, avgDeal, stale, engaged, hot, groups, maxCount };
  }, [leads]);

  return (
    <div className="space-y-3">
      {/* The numbers that matter, on the family palette */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <Kpi tone="deposit" icon={<DollarSign />} value={eurCompact(m.totalValue)} label="Pipeline value" />
        <Kpi tone="tech" icon={<TrendingUp />} value={`${m.winRate}%`} label="Win rate" sub="signed ÷ all leads" />
        <Kpi tone="proposal" icon={<Send />} value={eurCompact(m.avgDeal)} label="Average deal" />
        <Kpi tone="neutral" icon={<Layers />} value={m.active} label="Active leads" />
        <Kpi tone="pop" icon={<Clock />} value={m.stale.length} label="Need chasing" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* The funnel, in money */}
        <section className="relative overflow-hidden rounded-panel border border-border/70 bg-card shadow-card">
          <span className="absolute left-0 top-0 h-full w-0.5 bg-tech" aria-hidden />
          <header className="flex items-center gap-2 pl-4 pr-3 h-11 border-b border-border">
            <TrendingUp className="size-4 text-tech" />
            <h2 className="text-sm font-semibold">Where the pipeline stands</h2>
          </header>
          <div className="p-3 space-y-2.5">
            {m.groups.map(g => (
              <div key={g.id} className="flex items-center gap-3">
                <div className="w-16 shrink-0 text-xs font-medium truncate">{g.label}</div>
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${GROUP_TONE[g.id] ?? 'bg-foreground/60'}`}
                    style={{ width: `${(g.count / m.maxCount) * 100}%` }} />
                </div>
                <span className="w-5 text-right text-xs font-semibold tabular-nums">{g.count}</span>
                <span className="w-14 text-right text-2xs text-muted-foreground tabular-nums">{g.value ? eurCompact(g.value) : '—'}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Warming up — proposal opens, the strongest buying signal */}
        <section className="relative overflow-hidden rounded-panel border border-border/70 bg-card shadow-card">
          <span className="absolute left-0 top-0 h-full w-0.5 bg-doc-proposal" aria-hidden />
          <header className="flex items-center gap-2 pl-4 pr-3 h-11 border-b border-border">
            <Eye className="size-4 text-doc-proposal" />
            <h2 className="text-sm font-semibold">Warming up</h2>
            <span className="ml-auto text-2xs text-muted-foreground">who's opening their proposal</span>
          </header>
          <div className="p-1.5">
            {m.engaged.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-muted-foreground">No opens yet. The moment a customer opens their proposal, they surface here — repeat opens are the signal to call.</p>
            ) : m.engaged.slice(0, 6).map(({ l, e }) => (
              <button key={l.id} onClick={() => onOpenLead(l)}
                className="group w-full flex items-center gap-3 rounded-control px-2.5 h-row text-left hover:bg-muted/50 transition-colors duration-instant">
                <span className="size-7 shrink-0 rounded-full bg-muted grid place-items-center text-2xs font-semibold">{initials(l.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{l.name}</span>
                    {e.warmth === 'hot' && <Flame className="size-3.5 text-pop shrink-0" aria-label="hot" />}
                    <EngagementBadge lead={l} compact />
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">opened {e.views}× · last {e.lastViewedLabel}</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-colors duration-instant" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Act on this — hot + slipping, one click to the lead */}
      <section className="relative overflow-hidden rounded-panel border border-border/70 bg-card shadow-card">
        <span className="absolute left-0 top-0 h-full w-0.5 bg-pop" aria-hidden />
        <header className="flex items-center gap-2 pl-4 pr-3 h-11 border-b border-border">
          <Flame className="size-4 text-pop" />
          <h2 className="text-sm font-semibold">Act on this</h2>
        </header>
        <div className="p-1.5">
          {m.hot.slice(0, 4).map(({ l, e }) => (
            <button key={`hot-${l.id}`} onClick={() => onOpenLead(l)}
              className="group w-full flex items-center gap-2 rounded-control px-2.5 h-row text-left hover:bg-muted/50 transition-colors duration-instant">
              <Flame className="size-3.5 text-pop shrink-0" />
              <span className="text-sm font-medium truncate">{l.name}</span>
              <span className="text-xs text-muted-foreground truncate">hot · {getStage(l.workflow_stage).label.toLowerCase()} · {e.views} opens</span>
              {l.proposal && <span className="ml-auto text-xs font-semibold tabular-nums">{eurCompact(l.proposal.net_cost)}</span>}
            </button>
          ))}
          {m.stale.slice(0, 3).map(({ l, i }) => (
            <button key={`stale-${l.id}`} onClick={() => onOpenLead(l)}
              className="group w-full flex items-center gap-2 rounded-control px-2.5 h-row text-left hover:bg-muted/50 transition-colors duration-instant">
              <Clock className="size-3.5 text-doc-proposal shrink-0" />
              <span className="text-sm font-medium truncate">{l.name}</span>
              <span className="text-xs text-muted-foreground truncate">quiet {i.daysSinceContact}d · {i.nextAction}</span>
            </button>
          ))}
          {m.hot.length === 0 && m.stale.length === 0 && (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">Nothing urgent. The pipeline is moving on its own.</p>
          )}
        </div>
      </section>
    </div>
  );
}
