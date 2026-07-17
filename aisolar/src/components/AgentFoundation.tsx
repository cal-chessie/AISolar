/**
 * Agent Foundation Panel
 *
 * Shows all 10 autonomous agents, their last run, queue depth, and lets the user
 * manually trigger or pause them. This is the "kernel" of the autonomous foundation.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AGENTS, AgentDefinition } from '@/lib/agents';
import {
  Bot, Clock, CheckCircle2, AlertCircle, Pause, Play, Zap, Calendar,
  ArrowRight, Shield, FileText, Mail, Bell,
} from 'lucide-react';

interface AgentRun {
  agentId: string;
  lastRun: string;
  status: 'success' | 'failed' | 'running' | 'idle';
  runs24h: number;
  queueDepth: number;
  nextRun?: string;
  lastError?: string;
}

// Simulated run state — in production this comes from the agent_runs table
const SIMULATED_RUNS: AgentRun[] = [
  { agentId: 'lead_intake',           lastRun: '2 min ago',  status: 'success', runs24h: 7,  queueDepth: 0 },
  { agentId: 'survey_scheduler',      lastRun: '1 hour ago', status: 'success', runs24h: 3,  queueDepth: 1, nextRun: 'on next intake_complete' },
  { agentId: 'proposal_drafter',      lastRun: '15 min ago', status: 'success', runs24h: 4,  queueDepth: 0 },
  { agentId: 'follow_up',             lastRun: '6 hours ago',status: 'success', runs24h: 1,  queueDepth: 0, nextRun: '09:00 tomorrow' },
  { agentId: 'grant_submitter',       lastRun: '3 hours ago',status: 'success', runs24h: 2,  queueDepth: 0 },
  { agentId: 'install_coordinator',   lastRun: '20 min ago', status: 'success', runs24h: 5,  queueDepth: 0 },
  { agentId: 'post_install',          lastRun: '1 hour ago', status: 'success', runs24h: 2,  queueDepth: 0 },
  { agentId: 'customer_digest',       lastRun: 'Mon 10:00',  status: 'success', runs24h: 0,  queueDepth: 12, nextRun: 'Mon 10:00' },
  { agentId: 'stale_lead_escalator',  lastRun: '8 hours ago',status: 'success', runs24h: 1,  queueDepth: 3, nextRun: '08:00 tomorrow' },
  { agentId: 'payment_reminder',      lastRun: '4 hours ago',status: 'failed',  runs24h: 1,  queueDepth: 8, nextRun: '09:30 tomorrow', lastError: 'Postmark rate limit exceeded' },
];

const TRIGGER_ICONS: Record<AgentDefinition['trigger'], typeof Clock> = {
  db_trigger: Zap,
  cron: Calendar,
  manual: Play,
  event: Bell,
};

export default function AgentFoundation({ compact = false }: { compact?: boolean }) {
  const [runs, setRuns] = useState(SIMULATED_RUNS);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(AGENTS.map(a => [a.id, a.enabledByDefault]))
  );

  const handleTrigger = (agentId: string) => {
    setRuns(prev => prev.map(r => r.agentId === agentId ? { ...r, status: 'running' } : r));
    setTimeout(() => {
      setRuns(prev => prev.map(r => r.agentId === agentId ? { ...r, status: 'success', lastRun: 'just now', runs24h: r.runs24h + 1 } : r));
    }, 1500);
  };

  const totalRuns = runs.reduce((sum, r) => sum + r.runs24h, 0);
  const failedRuns = runs.filter(r => r.status === 'failed').length;
  const queuedItems = runs.reduce((sum, r) => sum + r.queueDepth, 0);
  const activeAgents = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-600" />
                Agent Foundation
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Autonomous agents that do the heavy lifting — survey scheduling, proposal drafting,
                follow-ups, grant paperwork, install coordination.
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
          const run = runs.find(r => r.agentId === agent.id)!;
          const TriggerIcon = TRIGGER_ICONS[agent.trigger];
          const isOn = enabled[agent.id];
          const statusColor =
            run.status === 'success' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' :
            run.status === 'failed'  ? 'text-red-600 bg-red-50 dark:bg-red-950/30' :
            run.status === 'running' ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' :
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
                      {run.status === 'running' && <Clock className="h-3 w-3 animate-spin" />}
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
                    disabled={!isOn || run.status === 'running'}
                    className="h-7 text-xs"
                  >
                    {run.status === 'running' ? 'Running…' : 'Run now'}
                  </Button>
                </div>

                {run.lastError && (
                  <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-400">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    {run.lastError}
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
            <strong>How agents work:</strong> Each agent is an autonomous function triggered by either
            a database event (e.g. lead changes stage), a cron schedule (e.g. daily 9am), or a
            manual click. Agents read from the lead_intake pipeline and write to proposals, invoices,
            notifications, emails, and SEAI paperwork. They never bypass RLS — they run with the
            service role but their guardrails prevent destructive actions. All runs are logged in
            the <code>agent_runs</code> table for audit.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
