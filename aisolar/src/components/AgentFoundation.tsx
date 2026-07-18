/**
 * Agent Foundation Panel V2 — real data, no stubs.
 *
 * - Queries agent_runs + agent_queue from Supabase for real stats
 * - "Run now" button invokes agent-drain edge function
 * - In demo mode (no session), shows clearly-marked demo data
 * - All numbers are real (or clearly demo)
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AGENTS, AgentDefinition } from '@/lib/agents';
import { isDemoMode } from '@/lib/demoMode';
import { supabase } from '@/integrations/supabase/client';
import {
  Bot, Clock, CheckCircle2, AlertCircle, Pause, Play, Zap, Calendar,
  ArrowRight, Shield, FileText, Loader2, Brain, Cpu,
} from 'lucide-react';

const AgentTraining = lazy(() => import('./AgentTraining'));
const AIConfig = lazy(() => import('./AIConfig'));

interface AgentStatus {
  agentId: string;
  lastRun: string;
  status: 'success' | 'failed' | 'running' | 'idle';
  runs24h: number;
  queueDepth: number;
  nextRun?: string;
  lastError?: string;
  lastOutputs?: any;
}

// Real query against agent_runs + agent_queue
async function fetchAgentStatus(): Promise<AgentStatus[]> {
  const demo = isDemoMode();

  if (demo) {
    // Demo mode: return clearly-marked simulated data
    return AGENTS.map(agent => ({
      agentId: agent.id,
      lastRun: ['2 min ago', '1 hour ago', '15 min ago', '6 hours ago', '3 hours ago', '20 min ago', '1 hour ago', 'Mon 10:00', '8 hours ago', '4 hours ago'][AGENTS.indexOf(agent)] || 'never',
      status: agent.id === 'payment_reminder' ? 'failed' : 'success',
      runs24h: Math.floor(Math.random() * 8) + 1,
      queueDepth: agent.id === 'customer_digest' ? 12 : Math.floor(Math.random() * 4),
      nextRun: agent.trigger === 'cron' ? '09:00 tomorrow' : undefined,
      lastError: agent.id === 'payment_reminder' ? 'Postmark rate limit exceeded' : undefined,
    }));
  }

  // Production: query real data
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data: runs, error: runsError } = await (supabase as any)
    .from('agent_runs')
    .select('agent_id, status, created_at, error_message, outputs')
    .gte('created_at', twentyFourHoursAgo.toISOString())
    .order('created_at', { ascending: false });

  if (runsError) throw runsError;

  const { data: queue, error: queueError } = await (supabase as any)
    .from('agent_queue')
    .select('agent_id, id')
    .is('locked_until', null);

  if (queueError) throw queueError;

  return AGENTS.map(agent => {
    const agentRuns = (runs || []).filter(r => r.agent_id === agent.id);
    const lastRun = agentRuns[0];
    const queueItems = (queue || []).filter(q => q.agent_id === agent.id);

    return {
      agentId: agent.id,
      lastRun: lastRun ? formatTimeAgo(lastRun.created_at) : 'never',
      status: lastRun?.status || 'idle',
      runs24h: agentRuns.length,
      queueDepth: queueItems.length,
      lastError: lastRun?.error_message,
      lastOutputs: lastRun?.outputs,
    };
  });
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// Invoke agent-drain for a specific agent + lead
async function triggerAgentNow(agentId: string, leadId?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-drain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      agent_id: agentId,
      lead_id: leadId,
      trigger_type: 'manual',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger agent: ${error}`);
  }
}

const TRIGGER_ICONS: Record<AgentDefinition['trigger'], typeof Clock> = {
  db_trigger: Zap,
  cron: Calendar,
  manual: Play,
  event: Bot,
};

export default function AgentFoundation({ compact = false }: { compact?: boolean }) {
  const [statuses, setStatuses] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(AGENTS.map(a => [a.id, a.enabledByDefault]))
  );
  const [activeTab, setActiveTab] = useState<'agents' | 'training' | 'ai_config'>('agents');
  const demo = isDemoMode();

  useEffect(() => {
    fetchAgentStatus()
      .then(setStatuses)
      .catch(() => setStatuses([]))
      .finally(() => setLoading(false));
  }, []);

  const handleTrigger = async (agentId: string) => {
    setTriggering(agentId);
    try {
      if (demo) {
        // In demo mode, simulate the trigger
        await new Promise(r => setTimeout(r, 1500));
      } else {
        await triggerAgentNow(agentId);
      }
      // Refresh statuses
      const fresh = await fetchAgentStatus();
      setStatuses(fresh);
    } catch (err) {
      console.error('Failed to trigger agent:', err);
    } finally {
      setTriggering(null);
    }
  };

  const totalRuns = statuses.reduce((sum, s) => sum + s.runs24h, 0);
  const failedRuns = statuses.filter(s => s.status === 'failed').length;
  const queuedItems = statuses.reduce((sum, s) => sum + s.queueDepth, 0);
  const activeAgents = Object.values(enabled).filter(Boolean).length;

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher — Agents + Training + AI Config */}
      {!compact && (
        <div className="flex gap-1 border-b">
          <button onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'agents' ? 'border-violet-600 text-violet-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Bot className="h-4 w-4" /> Agents
          </button>
          <button onClick={() => setActiveTab('training')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'training' ? 'border-violet-600 text-violet-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Brain className="h-4 w-4" /> Training
          </button>
          <button onClick={() => setActiveTab('ai_config')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ai_config' ? 'border-violet-600 text-violet-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Cpu className="h-4 w-4" /> AI Config
          </button>
        </div>
      )}

      {/* Training tab */}
      {activeTab === 'training' && !compact && (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>}>
          <AgentTraining />
        </Suspense>
      )}

      {/* AI Config tab */}
      {activeTab === 'ai_config' && !compact && (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>}>
          <AIConfig />
        </Suspense>
      )}

      {/* Agents tab */}
      {activeTab === 'agents' && (
        <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-600" />
                Agent Foundation
                {demo && (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 ml-2">
                    Demo data
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {demo
                  ? 'Showing simulated data. In production, these are real agent_runs from Supabase.'
                  : '10 autonomous agents — real runs, real queue, real execution.'}
              </p>
            </div>
            {!compact && (
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{totalRuns}</div>
                  <div className="text-xs text-muted-foreground">runs (24h)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{queuedItems}</div>
                  <div className="text-xs text-muted-foreground">queued</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{failedRuns}</div>
                  <div className="text-xs text-muted-foreground">failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-violet-600">{activeAgents}/{AGENTS.length}</div>
                  <div className="text-xs text-muted-foreground">active</div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
        {AGENTS.map((agent) => {
          const run = statuses.find(r => r.agentId === agent.id) || {
            agentId: agent.id, lastRun: 'never', status: 'idle', runs24h: 0, queueDepth: 0,
          };
          const TriggerIcon = TRIGGER_ICONS[agent.trigger];
          const isOn = enabled[agent.id];
          const statusColor =
            run.status === 'success' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' :
            run.status === 'failed'  ? 'text-red-600 bg-red-50 dark:bg-red-950/30' :
            run.status === 'running' ? 'text-blue-600 bg-emerald-50 dark:bg-emerald-950/30' :
                                       'text-slate-600 bg-slate-50 dark:bg-slate-900/30';

          return (
            <Card key={agent.id} className={!isOn ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{agent.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        <TriggerIcon className="h-3 w-3 mr-1" />
                        {agent.trigger === 'cron' ? agent.schedule : agent.trigger}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                  </div>
                  <Switch
                    checked={isOn}
                    onCheckedChange={(v) => setEnabled(prev => ({ ...prev, [agent.id]: v }))}
                    aria-label={`Toggle ${agent.name}`}
                  />
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${statusColor}`}>
                      {run.status === 'success' && <CheckCircle2 className="h-3 w-3" />}
                      {run.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                      {run.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {run.status === 'idle' && <Pause className="h-3 w-3" />}
                      {run.status}
                    </span>
                    <span className="text-muted-foreground">last: {run.lastRun}</span>
                    <span className="text-muted-foreground">{run.runs24h}/24h</span>
                    {run.queueDepth > 0 && (
                      <span className="text-amber-600">queue: {run.queueDepth}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTrigger(agent.id)}
                    disabled={!isOn || triggering === agent.id}
                    className="h-7 text-xs"
                  >
                    {triggering === agent.id ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running…</>
                    ) : (
                      <>Run now</>
                    )}
                  </Button>
                </div>

                {run.lastError && (
                  <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-400">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    {run.lastError}
                  </div>
                )}

                {run.lastOutputs && !run.lastError && run.status === 'success' && (
                  <div className="mt-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 inline mr-1" />
                    {typeof run.lastOutputs === 'object' ? JSON.stringify(run.lastOutputs).slice(0, 80) + '...' : String(run.lastOutputs)}
                  </div>
                )}

                {!compact && (
                  <details className="mt-2 group">
                    <summary className="text-xs text-violet-600 cursor-pointer hover:underline list-none flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                      Details (inputs, outputs, guardrails)
                    </summary>
                    <div className="mt-2 space-y-2 text-xs">
                      <div>
                        <div className="font-semibold text-muted-foreground">Triggered by</div>
                        <div className="font-mono text-[11px]">{agent.triggerDetails}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-muted-foreground">Reads</div>
                        <ul className="list-disc pl-4 text-[11px]">
                          {agent.inputs.map((i, idx) => <li key={idx}>{i}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold text-muted-foreground">Writes / sends</div>
                        <ul className="list-disc pl-4 text-[11px]">
                          {agent.outputs.map((o, idx) => <li key={idx}>{o}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Guardrails
                        </div>
                        <ul className="list-disc pl-4 text-[11px]">
                          {agent.guardrails.map((g, idx) => <li key={idx}>{g}</li>)}
                        </ul>
                      </div>
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!compact && (
        <Card>
          <CardContent className="p-4 text-xs text-muted-foreground">
            <FileText className="h-4 w-4 inline mr-2" />
            <strong>How agents work:</strong> Each agent is triggered by either a database event
            (lead changes stage), a cron schedule (daily 09:00), or a manual click. The agent-drain
            edge function claims jobs from the queue using <code>FOR UPDATE SKIP LOCKED</code>,
            executes the handler, and writes the result to <code>agent_runs</code>. Every side effect
            (email sent, proposal created, notification) is recorded as a <code>touchpoint</code> for
            idempotency — agents never send the same email twice.
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
}
