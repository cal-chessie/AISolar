/**
 * AgentWindow — the SAME transparency window the scheduling agents got, for EVERY
 * agent (Cal, 30 Jul: "each agent needs the same window as the scheduling agent").
 *
 * Consistent shape for all 10: HOW IT'S PROGRAMMED (the logic + guardrails) →
 * WHAT IT'S WORKING ON RIGHT NOW (grounded on the live book, not a black box) →
 * READS / WRITES. The two scheduling agents additionally embed the plan+savings
 * panel (SchedulingTransparency). View-first — writes nothing.
 *
 * Grounding note (honest): the "working on right now" snapshot is computed from
 * the demo leads by workflow stage. In production it reads agent_runs + the real
 * pipeline — see SWEEP8_DB_WIRING.md.
 *
 * Skills: ui-ux-pro-max (family tokens, one purpose), stop-slop.
 */
import { useMemo } from 'react';
import { X, Cpu, Activity, ArrowRightLeft, Shield, Zap } from 'lucide-react';
import type { AgentDefinition } from '@/lib/agents';
import type { DummyLead } from '@/lib/dummyData';
import { getStage } from '@/lib/leadIntake';
import SchedulingTransparency from '@/components/owner/SchedulingTransparency';

interface Snapshot { headline: string; items: Array<{ label: string; sub: string }>; }

/** What each agent is working on RIGHT NOW, grounded on the live book by stage. */
function agentLiveSnapshot(agentId: string, leads: DummyLead[]): Snapshot {
  const byStage = (stages: string[]) => leads.filter(l => stages.includes(l.workflow_stage));
  const rows = (ls: DummyLead[], sub: (l: DummyLead) => string) =>
    ls.slice(0, 4).map(l => ({ label: l.name, sub: sub(l) }));
  const stageSub = (l: DummyLead) => getStage(l.workflow_stage)?.label ?? l.workflow_stage;

  switch (agentId) {
    case 'lead_intake': {
      const ls = byStage(['new', 'intake_complete']);
      return { headline: `${ls.length} lead${ls.length === 1 ? '' : 's'} to score & normalise`, items: rows(ls, l => `score ${l.score} · ${stageSub(l)}`) };
    }
    case 'survey_scheduler': {
      const ls = byStage(['intake_complete', 'survey_scheduled']);
      return { headline: `${ls.length} awaiting / booked a survey`, items: rows(ls, stageSub) };
    }
    case 'proposal_drafter': {
      const ls = byStage(['survey_complete', 'proposal_drafted']);
      return { headline: `${ls.length} survey${ls.length === 1 ? '' : 's'} ready to draft a proposal from`, items: rows(ls, stageSub) };
    }
    case 'follow_up': {
      const ls = byStage(['proposal_sent']);
      return { headline: `${ls.length} sent proposal${ls.length === 1 ? '' : 's'} awaiting a decision`, items: rows(ls, l => `${l.score >= 80 ? 'hot · ' : ''}${stageSub(l)}`) };
    }
    case 'grant_submitter': {
      const ls = byStage(['approved', 'deposit_paid', 'install_scheduled']);
      return { headline: `${ls.length} signed job${ls.length === 1 ? '' : 's'} — SEAI grant tracked (never auto-submitted)`, items: rows(ls, stageSub) };
    }
    case 'install_coordinator': {
      const ls = byStage(['deposit_paid', 'install_scheduled', 'installing']);
      return { headline: `${ls.length} job${ls.length === 1 ? '' : 's'} to schedule / in flight`, items: rows(ls, stageSub) };
    }
    case 'post_install': {
      const ls = byStage(['installed', 'final_paid', 'completed']);
      return { headline: `${ls.length} fitted system${ls.length === 1 ? '' : 's'} — warranty + review`, items: rows(ls, stageSub) };
    }
    case 'customer_digest': {
      const ls = leads.filter(l => l.proposal);
      return { headline: `${ls.length} active customer${ls.length === 1 ? '' : 's'} on the weekly digest`, items: rows(ls, stageSub) };
    }
    case 'stale_lead_escalator': {
      const cutoff = Date.now() - 10 * 86400000;
      const ls = leads.filter(l => ['proposal_sent', 'survey_scheduled', 'intake_complete'].includes(l.workflow_stage) &&
        new Date(l.touchpoints[l.touchpoints.length - 1]?.timestamp ?? 0).getTime() < cutoff);
      return { headline: `${ls.length} lead${ls.length === 1 ? '' : 's'} going stale (10+ days quiet)`, items: rows(ls, stageSub) };
    }
    case 'payment_reminder': {
      const ls = byStage(['approved', 'installed', 'final_paid']);
      return { headline: `${ls.length} balance${ls.length === 1 ? '' : 's'} in the payment window`, items: rows(ls, stageSub) };
    }
    default:
      return { headline: 'Nothing queued right now.', items: [] };
  }
}

export default function AgentWindow({ agent, leads, onClose }: {
  agent: AgentDefinition;
  leads: DummyLead[];
  onClose: () => void;
}) {
  const snap = useMemo(() => agentLiveSnapshot(agent.id, leads), [agent.id, leads]);
  const isScheduler = agent.id === 'survey_scheduler' || agent.id === 'install_coordinator';

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${agent.name} — how it's programmed`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-lg bg-background shadow-card flex flex-col animate-in slide-in-from-right duration-200">
        {/* header */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0">
          <span className="grid place-items-center size-9 rounded-control bg-tech/10 text-tech shrink-0"><Cpu className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{agent.name}</p>
            <p className="text-2xs text-muted-foreground truncate">{agent.trigger === 'cron' ? agent.schedule : agent.trigger} · view-first, writes nothing</p>
          </div>
          <button className="grid place-items-center size-8 rounded-control hover:bg-muted" onClick={onClose} aria-label="Close"><X className="size-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* how it's programmed */}
          <section>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold mb-1.5"><Cpu className="size-3.5 text-tech" /> How it's programmed</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{agent.description}</p>
            <p className="mt-1.5 text-2xs text-muted-foreground"><span className="font-medium text-foreground">Triggered by:</span> <span className="font-mono">{agent.triggerDetails}</span></p>
            <div className="mt-2">
              <div className="flex items-center gap-1 text-2xs font-semibold text-muted-foreground mb-1"><Shield className="size-3" /> Guardrails</div>
              <ul className="space-y-0.5">
                {agent.guardrails.map((g, i) => <li key={i} className="text-2xs text-muted-foreground flex gap-1.5"><span className="text-doc-deposit mt-0.5">✓</span><span>{g}</span></li>)}
              </ul>
            </div>
          </section>

          {/* what it's working on right now */}
          <section className="rounded-panel border border-border p-3">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold mb-1.5"><Activity className="size-3.5 text-tech" /> What it's working on right now</h4>
            <p className="text-sm font-medium">{snap.headline}</p>
            {snap.items.length > 0 && (
              <div className="mt-2 space-y-1">
                {snap.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-2xs">
                    <span className="font-medium truncate">{it.label}</span>
                    <span className="text-muted-foreground shrink-0">{it.sub}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">Grounded on the live book. In production this reads `agent_runs` + the real pipeline (Sweep 8).</p>
          </section>

          {/* schedulers embed the plan + savings + approve */}
          {isScheduler && (
            <SchedulingTransparency leads={leads} only={agent.id === 'survey_scheduler' ? 'survey' : 'install'} />
          )}

          {/* reads / writes */}
          <section>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold mb-1.5"><ArrowRightLeft className="size-3.5 text-tech" /> Reads / writes</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xs font-semibold text-muted-foreground mb-1">Reads</div>
                <ul className="space-y-0.5">{agent.inputs.map((x, i) => <li key={i} className="text-2xs text-muted-foreground">• {x}</li>)}</ul>
              </div>
              <div>
                <div className="text-2xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Zap className="size-3" /> Writes / sends</div>
                <ul className="space-y-0.5">{agent.outputs.map((x, i) => <li key={i} className="text-2xs text-muted-foreground">• {x}</li>)}</ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
