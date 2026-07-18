/**
 * Owner Cockpit — single screen, everything visible.
 *
 * Not tabs. Not a dashboard. A cockpit.
 *
 * Layout (one scroll, no tab-hopping):
 *   ┌──────────┬──────────┬──────────┬──────────┐
 *   │ Revenue  │ Pipeline │ Jobs     │ Agents   │
 *   │ sparkline│ funnel   │ on road  │ health   │
 *   ├──────────┴──────────┴──────────┴──────────┤
 *   │ PIPELINE FLOW (visual left-to-right)      │
 *   │ boxes with counts, bottleneck highlighted │
 *   ├─────────────────────┬────────────────────┤
 *   │ LIVE ACTIVITY FEED   │ ALERTS             │
 *   │ what's happening now  │ what needs you    │
 *   ├─────────────────────┴────────────────────┤
 *   │ TODAY'S SCHEDULE (compact calendar)       │
 *   └───────────────────────────────────────────┘
 *
 * Click anything → drill in.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, Wrench, Calendar, TrendingUp, DollarSign, Bot, Clock,
  AlertTriangle, CheckCircle2, ArrowRight, Building2, UserCircle,
  Star, Phone, Video, MapPin, FileText, Zap, Award, Activity,
  ChevronRight, Flame, Target, Percent, Navigation,
} from 'lucide-react';
import { generateDummyLeads, computePipelineStats, type DummyLead } from '@/lib/dummyData';
import { PIPELINE_STAGES, getStage } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function OwnerCockpit() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  // Compute everything from real lead data
  const data = useMemo(() => {
    const stats = computePipelineStats(leads);

    // Revenue
    const revenueClosed = leads.filter(l => l.invoice?.final_paid).reduce((s, l) => s + (l.proposal?.net_cost || 0), 0);
    const revenuePending = leads.filter(l => l.proposal && !l.invoice?.final_paid).reduce((s, l) => s + (l.proposal.net_cost || 0), 0);

    // Pipeline stage counts
    const stageCounts = PIPELINE_STAGES.map(s => ({
      ...s,
      count: leads.filter(l => l.workflow_stage === s.id).length,
      cumulative: leads.filter(l => {
        const idx = PIPELINE_STAGES.findIndex(p => p.id === l.workflow_stage);
        const sIdx = PIPELINE_STAGES.findIndex(p => p.id === s.id);
        return idx >= sIdx;
      }).length,
    }));

    // Find bottleneck (biggest drop between stages)
    let bottleneck: { stage: string; rate: number } | null = null;
    for (let i = 1; i < stageCounts.length; i++) {
      const prev = stageCounts[i - 1].cumulative;
      const curr = stageCounts[i].cumulative;
      if (prev > 0) {
        const rate = (curr / prev) * 100;
        if (!bottleneck || rate < bottleneck.rate) {
          bottleneck = { stage: stageCounts[i].id, rate };
        }
      }
    }

    // Team activity (generate from touchpoints)
    const activity = leads
      .flatMap(l => l.touchpoints.map(tp => ({ ...tp, leadName: l.name, leadId: l.id })))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    // Alerts
    const staleLeads = leads.filter(l => {
      const last = l.touchpoints[l.touchpoints.length - 1];
      if (!last) return false;
      return (Date.now() - new Date(last.timestamp).getTime()) > 5 * 86400000
        && !['completed', 'final_paid', 'installed', 'installing'].includes(l.workflow_stage);
    });
    const incompleteSurveys = leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage) && (l.survey?.photo_count || 0) < 8);
    const agentFailures = 1; // Payment Reminder agent

    // Today's schedule
    const todayEvents = leads
      .filter(l => l.assignment?.scheduled_date)
      .map(l => ({
        id: l.id,
        time: '08:00',
        type: 'install' as const,
        title: `${l.name} — ${l.proposal?.system_size_kw}kWp`,
        assignee: l.assignment?.installer_name || 'Unassigned',
      }))
      .concat(leads.filter(l => ['proposal_sent'].includes(l.workflow_stage)).map(l => ({
        id: l.id, time: '14:00', type: 'follow_up' as const,
        title: `${l.name} — follow-up call`, assignee: l.assigned_consultant,
      })))
      .slice(0, 6);

    // Agent stats
    const totalAgentRuns = 47;
    const agentHealth = 90; // %

    // Conversion
    const conversionRate = leads.length > 0 ? Math.round((leads.filter(l => l.contract).length / leads.length) * 100) : 0;
    const avgDealSize = leads.filter(l => l.proposal).length > 0
      ? leads.filter(l => l.proposal).reduce((s, l) => s + l.proposal!.net_cost, 0) / leads.filter(l => l.proposal).length : 0;

    return {
      stats, revenueClosed, revenuePending, stageCounts, bottleneck,
      activity, staleLeads, incompleteSurveys, agentFailures,
      todayEvents, totalAgentRuns, agentHealth, conversionRate, avgDealSize,
    };
  }, [leads]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-violet-50/10 dark:from-slate-950 dark:via-background dark:to-violet-950/5">
      {/* Header — minimal */}
      <header className="bg-background/95 backdrop-blur border-b sticky top-0 z-30">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm">{brand.name}</span>
              <span className="text-xs text-muted-foreground ml-1.5">Owner Cockpit</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/consultant')}>
              <Users className="h-3.5 w-3.5 mr-1" /> Consultant
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/installer')}>
              <Wrench className="h-3.5 w-3.5 mr-1" /> Installer
            </Button>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-3 space-y-3">
        {/* === ROW 1: Vital signs (4 cards) === */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Revenue with sparkline */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-uppercase tracking-wide">Revenue</span>
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{eur(data.revenueClosed)}</div>
              <div className="text-[10px] text-muted-foreground">{eur(data.revenuePending)} pending</div>
              {/* Mini sparkline */}
              <div className="flex items-end gap-0.5 mt-1.5 h-6">
                {[40, 55, 48, 62, 70, 65, 78, 85, 72, 90, 88, 95].map((h, i) => (
                  <div key={i} className="flex-1 bg-emerald-400/60 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pipeline */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Pipeline</span>
                <Activity className="h-3 w-3 text-blue-600" />
              </div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{eur(data.stats.totalValue)}</div>
              <div className="text-[10px] text-muted-foreground">{data.stats.activeLeads} active · {leads.filter(l => l.score > 80).length} hot</div>
              <div className="flex gap-0.5 mt-1.5">
                {data.stageCounts.slice(0, 8).map(s => (
                  <div key={s.id} className={`flex-1 h-1.5 rounded-full bg-${s.color}-400`} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Jobs */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Jobs</span>
                <Wrench className="h-3 w-3 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{leads.filter(l => l.assignment).length}</div>
              <div className="text-[10px] text-muted-foreground">{leads.filter(l => ['survey_scheduled','survey_complete'].includes(l.workflow_stage)).length} surveys due</div>
              <div className="flex gap-0.5 mt-1.5">
                {leads.filter(l => l.assignment).slice(0, 6).map((l, i) => (
                  <div key={i} className={`h-1.5 w-4 rounded-sm ${l.assignment?.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agent health */}
          <Card className={data.agentFailures > 0 ? 'border-red-200 dark:border-red-800' : 'border-violet-200 dark:border-violet-800'}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Agents</span>
                <Bot className="h-3 w-3 text-violet-600" />
              </div>
              <div className="text-xl font-bold text-violet-700 dark:text-violet-400">{data.totalAgentRuns}</div>
              <div className="text-[10px] text-muted-foreground">
                {data.agentFailures > 0
                  ? <span className="text-red-600">⚠ {data.agentFailures} failed</span>
                  : 'all healthy'}
                {' · '}runs/24h
              </div>
              {/* Health bar */}
              <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${data.agentFailures > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${data.agentHealth}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === ROW 2: Pipeline flow (visual, left to right) === */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pipeline flow — click to drill in</h3>
              {data.bottleneck && (
                <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                  Bottleneck: {getStage(data.bottleneck.stage).label} ({data.bottleneck.rate}%)
                </Badge>
              )}
            </div>
            {/* Horizontal flow */}
            <div className="flex gap-1 overflow-x-auto pb-2">
              {data.stageCounts.map((stage, i) => {
                const isBottleneck = data.bottleneck?.stage === stage.id;
                const isExpanded = expandedStage === stage.id;
                const stageLeads = leads.filter(l => l.workflow_stage === stage.id);
                return (
                  <div key={stage.id} className="flex items-center flex-shrink-0">
                    <button
                      onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                      className={`p-2 rounded-lg border-2 text-center min-w-[70px] transition-all ${
                        isBottleneck ? 'border-red-400 bg-red-50 dark:bg-red-950/20' :
                        isExpanded ? `border-${stage.color}-500 bg-${stage.color}-50 dark:bg-${stage.color}-950/20` :
                        `border-${stage.color}-200 hover:border-${stage.color}-400`
                      }`}
                    >
                      <div className={`text-xl font-bold ${isBottleneck ? 'text-red-600' : `text-${stage.color}-600`}`}>
                        {stage.count}
                      </div>
                      <div className="text-[8px] text-muted-foreground leading-tight">{stage.label}</div>
                      {i > 0 && stage.cumulative > 0 && (
                        <div className="text-[7px] text-muted-foreground mt-0.5">
                          {Math.round((stage.cumulative / data.stageCounts[0].cumulative) * 100)}%
                        </div>
                      )}
                    </button>
                    {i < data.stageCounts.length - 1 && (
                      <div className={`h-0.5 w-3 ${isBottleneck ? 'bg-red-300' : 'bg-muted-foreground/20'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Expanded leads */}
            {expandedStage && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="overflow-hidden mt-2 pt-2 border-t"
              >
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {leads.filter(l => l.workflow_stage === expandedStage).map(lead => (
                    <div
                      key={lead.id}
                      className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate('/lead-flow')}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[8px]">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate block">{lead.name}</span>
                        {lead.score > 80 && <Flame className="h-2.5 w-2.5 text-red-500 inline" />}
                      </div>
                      {lead.proposal && <span className="text-[10px] text-muted-foreground">{eur(lead.proposal.net_cost)}</span>}
                    </div>
                  ))}
                  {leads.filter(l => l.workflow_stage === expandedStage).length === 0 && (
                    <p className="text-xs text-muted-foreground italic p-2">No leads at this stage.</p>
                  )}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* === ROW 3: Activity feed (left) + Alerts (right) === */}
        <div className="grid lg:grid-cols-2 gap-2">
          {/* Live activity */}
          <Card>
            <CardContent className="p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Live activity
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {data.activity.map((item, i) => {
                  const isAgent = item.actor === 'agent';
                  const isCustomer = item.actor === 'customer';
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-[9px] text-muted-foreground tabular-nums flex-shrink-0 mt-0.5 w-10">
                        {new Date(item.timestamp).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className={`p-0.5 rounded ${isAgent ? 'bg-violet-100 dark:bg-violet-950/30' : isCustomer ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-muted'}`}>
                        {isAgent && <Bot className="h-2.5 w-2.5 text-violet-600" />}
                        {isCustomer && <UserCircle className="h-2.5 w-2.5 text-emerald-600" />}
                        {!isAgent && !isCustomer && <Users className="h-2.5 w-2.5 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{item.leadName}</span>
                        <span className="text-muted-foreground"> — {item.summary}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardContent className="p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Needs your attention
              </h3>
              <div className="space-y-2">
                {data.staleLeads.length > 0 && (
                  <AlertItem
                    icon={Clock}
                    color="amber"
                    title={`${data.staleLeads.length} stale leads`}
                    desc="Not contacted in 5+ days"
                    cta="Review"
                    onClick={() => navigate('/consultant')}
                  />
                )}
                {data.agentFailures > 0 && (
                  <AlertItem
                    icon={Bot}
                    color="red"
                    title="Payment Reminder Agent failed"
                    desc="Postmark rate limit exceeded"
                    cta="View"
                    onClick={() => navigate('/agents')}
                  />
                )}
                {data.incompleteSurveys.length > 0 && (
                  <AlertItem
                    icon={FileText}
                    color="amber"
                    title={`${data.incompleteSurveys.length} surveys incomplete`}
                    desc="Missing photos or roof data"
                    cta="Review"
                    onClick={() => navigate('/installer')}
                  />
                )}
                <AlertItem
                  icon={TrendingUp}
                  color="blue"
                  title={`Conversion rate: ${data.conversionRate}%`}
                  desc={data.bottleneck ? `Bottleneck at ${getStage(data.bottleneck.stage).label}` : 'Healthy pipeline'}
                  cta="Analytics"
                  onClick={() => navigate('/analytics')}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === ROW 4: Today's schedule + Team quick-access === */}
        <div className="grid lg:grid-cols-3 gap-2">
          {/* Today's schedule */}
          <Card className="lg:col-span-2">
            <CardContent className="p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Today's schedule
              </h3>
              <div className="space-y-1">
                {data.todayEvents.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-1.5 border rounded-lg cursor-pointer hover:bg-muted/30"
                    onClick={() => navigate(event.type === 'install' ? '/job' : '/lead-flow')}
                  >
                    <span className="text-[10px] font-mono text-muted-foreground w-10">{event.time}</span>
                    <div className={`p-1 rounded ${event.type === 'install' ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-emerald-100 dark:bg-emerald-950/30'}`}>
                      {event.type === 'install' ? <Wrench className="h-2.5 w-2.5 text-amber-600" /> : <Phone className="h-2.5 w-2.5 text-emerald-600" />}
                    </div>
                    <span className="text-xs flex-1 truncate">{event.title}</span>
                    <span className="text-[10px] text-muted-foreground">{event.assignee}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                ))}
                {data.todayEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2">Nothing scheduled today.</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-7" onClick={() => navigate('/owner')}>
                Full calendar <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Team quick-access */}
          <Card>
            <CardContent className="p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Jump to team</h3>
              <div className="space-y-1.5">
                <TeamButton icon={Users} label="Consultants" count={data.stats.activeLeads} color="blue" onClick={() => navigate('/consultant')} />
                <TeamButton icon={Wrench} label="Installers" count={leads.filter(l => l.assignment).length} color="amber" onClick={() => navigate('/installer')} />
                <TeamButton icon={UserCircle} label="Clients" count={leads.length} color="emerald" onClick={() => navigate('/customer-profile')} />
                <TeamButton icon={Bot} label="Agents" count={data.totalAgentRuns} color="violet" onClick={() => navigate('/agents')} />
                <TeamButton icon={FileText} label="LeadFlow" count={0} color="blue" onClick={() => navigate('/lead-flow')} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function AlertItem({ icon: Icon, color, title, desc, cta, onClick }: {
  icon: typeof AlertTriangle; color: string; title: string; desc: string; cta: string; onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg">
      <div className={`p-1.5 rounded-lg bg-${color}-100 dark:bg-${color}-950/40 flex-shrink-0`}>
        <Icon className={`h-3 w-3 text-${color}-600`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium">{title}</div>
        <div className="text-[10px] text-muted-foreground">{desc}</div>
      </div>
      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={onClick}>{cta}</Button>
    </div>
  );
}

function TeamButton({ icon: Icon, label, count, color, onClick }: {
  icon: typeof Users; label: string; count: number; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/30 transition-colors"
    >
      <div className={`p-1.5 rounded-lg bg-${color}-100 dark:bg-${color}-950/40`}>
        <Icon className={`h-3.5 w-3.5 text-${color}-700 dark:text-${color}-300`} />
      </div>
      <span className="text-xs font-medium flex-1 text-left">{label}</span>
      {count > 0 && <Badge variant="outline" className="text-[9px]">{count}</Badge>}
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}

// Need Button import
import { Button } from '@/components/ui/button';
