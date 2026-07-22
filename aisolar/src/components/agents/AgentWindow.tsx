/**
 * AgentWindow — the "clear window" onto the agents.
 *
 * Cal's principle #1: "agents need a clear window" / "we could see tiny
 * updates of the agents doing their thing and a better visual".
 *
 * Two jobs, and the second is the one that makes "self-improving" real:
 *
 *   1. SHOW: a live, plain-English feed of what agents just did, attributed
 *      to the named agent and the customer it affected. Not logs — sentences.
 *
 *   2. CORRECT: one tap to say "that was wrong". Cal's gap #3 — the
 *      correction signal comes from the CONSULTANT and INSTALLER in the
 *      field, not the owner. Without this, "self-improving" is decoration.
 *      Corrections are the training data.
 *
 * Drops into any view. `compact` renders the rail version for a cockpit
 * sidebar; default renders the full panel.
 */
import { useMemo, useState } from 'react';
import { Bot, Check, CircleAlert, ThumbsDown, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { DummyLead } from '@/lib/dummyData';

export interface AgentAction {
  id: string;
  agent: string;          // the named agent, e.g. "ProposalDrafter"
  summary: string;        // plain English, customer-facing language
  customer: string;
  at: string;             // ISO
  stage: string;
}

/** Map a touchpoint summary to the agent that owns it. */
function agentFor(summary: string): string {
  const s = summary.toLowerCase();
  if (/draft|proposal/.test(s)) return 'ProposalDrafter';
  if (/grant|seai/.test(s)) return 'GrantAgent';
  if (/book|schedul|survey/.test(s)) return 'SurveyScheduler';
  if (/invoice|deposit|payment/.test(s)) return 'PaymentAgent';
  if (/remind|follow|chase|t-\d/.test(s)) return 'FollowUpAgent';
  if (/intake|acknowledge|score/.test(s)) return 'LeadIntake';
  return 'AISolar';
}

const rel = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

export function useAgentActions(leads: DummyLead[], limit = 12): AgentAction[] {
  return useMemo(() => {
    const out: AgentAction[] = [];
    for (const lead of leads) {
      lead.touchpoints.forEach((tp, i) => {
        if (tp.actor !== 'agent') return;
        out.push({
          // Index is required: two agents can act on the same lead in the same
          // second, and a colliding key opened several correction forms at once.
          id: tp.id ?? `${lead.id}-${i}-${tp.timestamp}`,
          agent: agentFor(tp.summary ?? ''),
          summary: tp.summary ?? '',
          customer: lead.name,
          at: tp.timestamp,
          stage: tp.stage,
        });
      });
    }
    return out.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, limit);
  }, [leads, limit]);
}

export default function AgentWindow({
  actions, compact, onCorrect,
}: {
  actions: AgentAction[];
  compact?: boolean;
  /** Correction handler — this is the training signal. */
  onCorrect?: (action: AgentAction, note: string) => void;
}) {
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [corrected, setCorrected] = useState<Set<string>>(new Set());

  const submit = (a: AgentAction) => {
    onCorrect?.(a, note.trim());
    setCorrected(prev => new Set(prev).add(a.id));
    setCorrecting(null);
    setNote('');
  };

  return (
    <section className={cn('rounded-panel border border-border/70 bg-card shadow-card', compact && 'text-sm')}>
      <header className="flex items-center gap-2 px-4 h-11 border-b border-border">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <h3 className="text-sm font-semibold">Agents at work</h3>
        <span className="ml-auto text-2xs text-muted-foreground">
          {actions.length} recent {actions.length === 1 ? 'action' : 'actions'}
        </span>
      </header>

      <ul className="divide-y divide-border">
        {actions.length === 0 && (
          <li className="px-4 py-6 text-xs text-muted-foreground">
            Nothing yet. As leads move through the pipeline your agents post here.
          </li>
        )}
        {actions.map(a => {
          const isCorrecting = correcting === a.id;
          const wasCorrected = corrected.has(a.id);
          return (
            <li key={a.id} className="px-4 py-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 size-6 shrink-0 rounded-md bg-primary/10 text-primary grid place-items-center">
                  <Bot className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-ui">
                    <span className="font-medium">{a.agent}</span>{' '}
                    <span className="text-muted-foreground">{a.summary}</span>
                  </p>
                  <p className="text-2xs text-muted-foreground mt-0.5">
                    {a.customer} · {rel(a.at)}
                  </p>
                </div>

                {/* The correction loop — one tap, in the field */}
                {!compact && (
                  wasCorrected ? (
                    <span className="flex items-center gap-1 text-2xs text-primary shrink-0">
                      <Check className="size-3.5" /> Noted
                    </span>
                  ) : (
                    <Button
                      variant="ghost" size="sm"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => { setCorrecting(isCorrecting ? null : a.id); setNote(''); }}
                      aria-label={`Flag ${a.agent} action as wrong`}
                    >
                      <ThumbsDown className="size-3.5" /> Wrong
                    </Button>
                  )
                )}
              </div>

              {isCorrecting && (
                <div className="mt-2.5 ml-8.5 space-y-2">
                  <label className="block text-xs font-medium" htmlFor={`fix-${a.id}`}>
                    What should it have done?
                  </label>
                  <textarea
                    id={`fix-${a.id}`}
                    autoFocus
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. booked the survey for a Sunday — never book weekends for this customer"
                    className="w-full min-h-16 rounded-control border border-input bg-background px-3 py-2 text-sm leading-body placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => submit(a)} disabled={!note.trim()}>
                      Send correction
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCorrecting(null)}>
                      <Undo2 /> Cancel
                    </Button>
                    <span className="text-2xs text-muted-foreground ml-auto flex items-center gap-1">
                      <CircleAlert className="size-3" /> Trains this agent
                    </span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
