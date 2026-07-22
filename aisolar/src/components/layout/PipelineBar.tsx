/**
 * PipelineBar — the compact pipeline.
 *
 * Cal's verdict on the old one: "far too long, doesn't do what I expected,
 * but the flow is correct." It rendered all 13 raw stages as equal boxes and
 * overflowed the screen. The data model already had the answer: STAGE_GROUPS
 * (6 phases). So:
 *
 *   Level 1 (always visible): six phase segments — count, label, conversion —
 *   in one calm row that always fits.
 *   Level 2 (progressive disclosure): click a phase → its raw stages expand
 *   below with counts + the agent automation attached to each stage.
 *
 * A bottleneck (worst phase→phase conversion) is flagged inline, not as a
 * separate alert card.
 */
import { useMemo, useState } from 'react';
import { AlertTriangle, Bot, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PIPELINE_STAGES, STAGE_GROUPS } from '@/lib/leadIntake';

interface PipelineBarProps {
  /** stage id → lead count */
  counts: Record<string, number>;
  /** called with a raw stage id when the user drills to leads */
  onStageClick?: (stageId: string) => void;
  /** called when a phase opens/closes — parents should clear stale drill-downs */
  onGroupToggle?: () => void;
  className?: string;
}

const GROUP_ACCENT: Record<string, string> = {
  intake:   'bg-primary',
  survey:   'bg-primary',
  proposal: 'bg-primary',
  contract: 'bg-primary',
  install:  'bg-primary',
  closeout: 'bg-primary',
};

export function PipelineBar({ counts, onStageClick, onGroupToggle, className }: PipelineBarProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    let runningUpstream = total;
    return STAGE_GROUPS.map(g => {
      const stages = PIPELINE_STAGES.filter(s => s.group === g.id);
      const count = stages.reduce((a, s) => a + (counts[s.id] ?? 0), 0);
      // conversion into this phase = share of everything that reached it or beyond
      const reached = runningUpstream;
      runningUpstream -= count;
      const conversion = Math.round((reached / total) * 100);
      return { ...g, stages, count, conversion };
    });
  }, [counts]);

  // Bottleneck = biggest drop between consecutive phases' reach
  const bottleneck = useMemo(() => {
    let worst: { label: string; drop: number } | null = null;
    for (let i = 1; i < groups.length; i++) {
      const drop = groups[i - 1].conversion - groups[i].conversion;
      if (!worst || drop > worst.drop) worst = { label: groups[i].label, drop };
    }
    return worst && worst.drop > 25 ? worst : null;
  }, [groups]);

  const open = groups.find(g => g.id === openGroup);

  return (
    <section className={cn('rounded-panel border border-border/70 bg-card shadow-card', className)}>
      <header className="flex items-center gap-2 px-4 h-11 border-b border-border">
        <h2 className="text-sm font-semibold">Pipeline</h2>
        <span className="text-xs text-muted-foreground">click a phase for its stages</span>
        {bottleneck && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-3.5" />
            Bottleneck: {bottleneck.label} (−{bottleneck.drop}%)
          </span>
        )}
      </header>

      {/* Level 1 — six segments, one row, always fits */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border">
        {groups.map(g => {
          const active = openGroup === g.id;
          return (
            <button
              key={g.id}
              onClick={() => { setOpenGroup(active ? null : g.id); onGroupToggle?.(); }}
              aria-expanded={active}
              className={cn(
                'group bg-card px-3 py-2.5 text-left cursor-pointer transition-colors duration-instant',
                'hover:bg-muted/60 focus-visible:relative',
                active && 'bg-muted/80',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn('size-1.5 rounded-full shrink-0', GROUP_ACCENT[g.id])} />
                <span className="text-xs font-medium text-muted-foreground truncate">{g.label}</span>
                <ChevronDown className={cn(
                  'size-3 ml-auto text-muted-foreground/50 transition-transform duration-fast',
                  active && 'rotate-180',
                )} />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums leading-none">{g.count}</span>
                <span className="text-2xs text-muted-foreground tabular-nums">{g.conversion}% reach</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Level 2 — the raw stages of the open phase, with their agent */}
      {open && (
        <div className="border-t border-border px-3 py-2.5 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {open.stages.map(s => (
            <button
              key={s.id}
              onClick={() => onStageClick?.(s.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-md border border-transparent px-2.5 h-control text-left',
                'hover:border-border hover:bg-muted/60 cursor-pointer transition-colors duration-instant',
              )}
            >
              <span className="text-sm font-semibold tabular-nums w-6 text-right shrink-0">
                {counts[s.id] ?? 0}
              </span>
              <span className="min-w-0">
                <span className="block text-sm truncate">{s.label}</span>
                <span className="flex items-center gap-1 text-2xs text-muted-foreground truncate">
                  <Bot className="size-3 shrink-0" />
                  <span className="truncate">{s.automation}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
