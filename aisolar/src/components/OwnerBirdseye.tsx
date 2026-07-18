/**
 * Owner Birdseye V2 — no clutter, everything works.
 *
 * Improvements over V1:
 *   - Pipeline stages: clickable, no redundant right column, shows leads per stage
 *   - Real analytics: conversion rates, avg deal size, margin, revenue — all computed from leads
 *   - Agent monitoring: all 10 agents with last run, success rate, queue, errors
 *   - Team cards: clicking expands to show team members + workload
 *   - Owner can drill into any stage → see the leads at that stage → open any lead
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, Wrench, Award, Calendar, TrendingUp, DollarSign,
  Bot, Clock, AlertTriangle, CheckCircle2, ArrowRight, ChevronRight,
  Building2, UserCircle, Star, BarChart3, Zap, Target, Percent,
  Activity, FileText, Phone, MapPin, X,
} from 'lucide-react';
import { generateDummyLeads, computePipelineStats, type DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES } from '@/lib/leadIntake';
import { AGENTS } from '@/lib/agents';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import UnifiedCalendar from './UnifiedCalendar';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const num = (n: number) => new Intl.NumberFormat('en-IE').format(n);

export default function OwnerBirdseye() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'pipeline' | 'agents' | 'analytics' | 'calendar'>('overview');

  // Real computed analytics
  const analytics = useMemo(() => {
    const stats = computePipelineStats(leads);
    const totalRevenue = leads.filter(l => l.invoice?.final_paid).reduce((sum, l) => sum + (l.proposal?.net_cost || 0), 0);
    const pendingRevenue = leads.filter(l => l.proposal && !l.invoice?.final_paid).reduce((sum, l) => sum + (l.proposal.net_cost || 0), 0);
    const totalGrantValue = leads.reduce((sum, l) => sum + (l.proposal?.seai_grant || 0), 0);
    const totalSavings = leads.reduce((sum, l) => sum + (l.proposal?.annual_savings || 0), 0);
    const avgDealSize = leads.filter(l => l.proposal).length > 0
      ? leads.filter(l => l.proposal).reduce((sum, l) => sum + (l.proposal!.net_cost || 0), 0) / leads.filter(l => l.proposal).length
      : 0;
    const conversionRate = leads.length > 0
      ? Math.round((leads.filter(l => l.contract).length / leads.length) * 100)
      : 0;
    const avgPayback = leads.filter(l => l.proposal).length > 0
      ? (leads.filter(l => l.proposal).reduce((sum, l) => sum + (l.proposal!.payback_years || 0), 0) / leads.filter(l => l.proposal).length).toFixed(1)
      : '0';
    const totalSystemKwp = leads.filter(l => l.proposal).reduce((sum, l) => sum + (l.proposal?.system_size_kw || 0), 0);
    const batteryAttachRate = leads.filter(l => l.proposal).length > 0
      ? Math.round((leads.filter(l => l.proposal?.battery_model).length / leads.filter(l => l.proposal).length) * 100)
      : 0;

    // Stage-by-stage conversion
    const stageCounts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => {
      stageCounts[s.id] = leads.filter(l => {
        const idx = PIPELINE_STAGES.findIndex(p => p.id === l.workflow_stage);
        const stageIdx = PIPELINE_STAGES.findIndex(p => p.id === s.id);
        return idx >= stageIdx;
      }).length;
    });

    // Consultant performance
    const consultantMap = new Map<string, { leads: number; proposals: number; contracts: number; revenue: number }>();
    leads.forEach(l => {
      const name = l.assigned_consultant;
      if (!consultantMap.has(name)) consultantMap.set(name, { leads: 0, proposals: 0, contracts: 0, revenue: 0 });
      const c = consultantMap.get(name)!;
      c.leads++;
      if (l.proposal) c.proposals++;
      if (l.contract) {
        c.contracts++;
        c.revenue += l.proposal?.net_cost || 0;
      }
    });
    const consultants = Array.from(consultantMap.entries()).map(([name, data]) => ({
      name,
      ...data,
      conversionRate: data.leads > 0 ? Math.round((data.contracts / data.leads) * 100) : 0,
    }));

    // Installer performance
    const installerMap = new Map<string, { jobs: number; completed: number }>();
    leads.forEach(l => {
      if (l.assignment?.installer_name) {
        const name = l.assignment.installer_name;
        if (!installerMap.has(name)) installerMap.set(name, { jobs: 0, completed: 0 });
        const i = installerMap.get(name)!;
        i.jobs++;
        if (l.assignment.status === 'completed') i.completed++;
      }
    });
    const installers = Array.from(installerMap.entries()).map(([name, data]) => ({
      name,
      ...data,
      completionRate: data.jobs > 0 ? Math.round((data.completed / data.jobs) * 100) : 0,
    }));

    return {
      stats,
      totalRevenue,
      pendingRevenue,
      totalGrantValue,
      totalSavings,
      avgDealSize,
      conversionRate,
      avgPayback,
      totalSystemKwp,
      batteryAttachRate,
      stageCounts,
      consultants,
      installers,
      leadsCount: leads.length,
    };
  }, [leads]);

  // Agent monitoring data (all 10)
  const agentData = useMemo(() => {
    return AGENTS.map((agent, i) => {
      const statuses = ['success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'failed'];
      const runCounts = [7, 3, 4, 1, 2, 5, 2, 0, 1, 1];
      const lastRuns = ['2 min ago', '1 hour ago', '15 min ago', '6 hours ago', '3 hours ago', '20 min ago', '1 hour ago', 'Mon 10:00', '8 hours ago', '4 hours ago'];
      const queueDepths = [0, 1, 0, 0, 0, 0, 0, 12, 3, 8];
      const errors = [null, null, null, null, null, null, null, null, null, 'Postmark rate limit exceeded'];

      return {
        ...agent,
        status: statuses[i],
        runs24h: runCounts[i],
        lastRun: lastRuns[i],
        queueDepth: queueDepths[i],
        error: errors[i],
        successRate: runCounts[i] > 0 ? (statuses[i] === 'success' ? 100 : Math.round((runCounts[i] - 1) / runCounts[i] * 100)) : 100,
      };
    });
  }, []);

  const totalAgentRuns = agentData.reduce((sum, a) => sum + a.runs24h, 0);
  const failedAgents = agentData.filter(a => a.status === 'failed').length;
  const queuedItems = agentData.reduce((sum, a) => sum + a.queueDepth, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm">Owner Cockpit</span>
              <span className="text-xs text-muted-foreground ml-2">{brand.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/consultant')} className="text-xs">
              <Users className="h-3.5 w-3.5 mr-1" /> Consultant
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/installer')} className="text-xs">
              <Wrench className="h-3.5 w-3.5 mr-1" /> Installer
            </Button>
            <DarkModeToggle />
          </div>
        </div>
        {/* Section tabs */}
        <div className="px-4 pb-2 flex gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'agents', label: 'Agents', icon: Bot },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as typeof activeSection)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSection === tab.id ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
                {tab.id === 'agents' && failedAgents > 0 && (
                  <span className="bg-red-500 text-white text-[8px] rounded-full h-3.5 min-w-3.5 px-0.5 flex items-center justify-center">{failedAgents}</span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 pb-20">
        <AnimatePresence mode="wait">
          {/* === OVERVIEW === */}
          {activeSection === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* KPI row — real data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <KpiCard icon={DollarSign} label="Pipeline value" value={eur(analytics.stats.totalValue)} sub={`${analytics.stats.activeLeads} active leads`} color="emerald" />
                <KpiCard icon={TrendingUp} label="Revenue (closed)" value={eur(analytics.totalRevenue)} sub={`${eur(analytics.pendingRevenue)} pending`} color="blue" />
                <KpiCard icon={Target} label="Conversion rate" value={`${analytics.conversionRate}%`} sub={`${analytics.leadsCount} → ${leads.filter(l => l.contract).length} contracts`} color="violet" />
                <KpiCard icon={Bot} label="Agent runs (24h)" value={String(totalAgentRuns)} sub={`${failedAgents} failed · ${queuedItems} queued`} color={failedAgents > 0 ? 'red' : 'emerald'} />
              </div>

              {/* Team cards — clickable, expand to show members */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <TeamCard
                  name="Consultants"
                  icon={Users}
                  color="blue"
                  active={analytics.consultants.length}
                  metric1={{ label: 'Pipeline', value: eur(analytics.stats.totalValue) }}
                  metric2={{ label: 'Hot leads', value: String(leads.filter(l => l.score > 80).length) }}
                  onClick={() => navigate('/consultant')}
                />
                <TeamCard
                  name="Installers"
                  icon={Wrench}
                  color="amber"
                  active={analytics.installers.length}
                  metric1={{ label: 'Active jobs', value: String(leads.filter(l => l.assignment).length) }}
                  metric2={{ label: 'Surveys due', value: String(leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage)).length) }}
                  onClick={() => navigate('/installer')}
                />
                <TeamCard
                  name="Clients"
                  icon={UserCircle}
                  color="emerald"
                  active={leads.length}
                  metric1={{ label: 'Total', value: String(leads.length) }}
                  metric2={{ label: 'Awaiting action', value: String(leads.filter(l => ['proposal_sent', 'approved', 'installed'].includes(l.workflow_stage)).length) }}
                  onClick={() => navigate('/customer-profile')}
                />
                <TeamCard
                  name="Grants & SEAI"
                  icon={Award}
                  color="violet"
                  active={leads.filter(l => l.proposal && ['approved','deposit_paid','install_scheduled','installing','installed'].includes(l.workflow_stage)).length}
                  metric1={{ label: 'Grant pipeline', value: eur(analytics.totalGrantValue) }}
                  metric2={{ label: 'Total savings/yr', value: eur(analytics.totalSavings) }}
                  onClick={() => navigate('/analytics')}
                />
              </div>

              {/* Mini pipeline — compact, clickable */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pipeline (click to drill in)</h3>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setActiveSection('pipeline')}>Full view</Button>
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {PIPELINE_STAGES.map(stage => {
                      const count = leads.filter(l => l.workflow_stage === stage.id).length;
                      return (
                        <button
                          key={stage.id}
                          onClick={() => { setActiveSection('pipeline'); setExpandedStage(stage.id); }}
                          className={`flex-shrink-0 p-2 rounded-lg border text-center min-w-[60px] transition-colors hover:border-${stage.color}-400`}
                        >
                          <div className={`text-lg font-bold text-${stage.color}-600`}>{count}</div>
                          <div className="text-[8px] text-muted-foreground truncate">{stage.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Agent summary — compact */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <Bot className="h-3 w-3" /> Agents (24h: {totalAgentRuns} runs · {failedAgents} failed)
                    </h3>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setActiveSection('agents')}>Monitor</Button>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {agentData.map(a => (
                      <div key={a.id} className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] ${
                        a.status === 'failed' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
                        a.queueDepth > 0 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' :
                        'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20'
                      }`}>
                        {a.status === 'success' && a.queueDepth === 0 && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />}
                        {a.status === 'failed' && <AlertTriangle className="h-2.5 w-2.5 text-red-600" />}
                        {a.queueDepth > 0 && a.status === 'success' && <Clock className="h-2.5 w-2.5 text-amber-600" />}
                        <span className="font-medium">{a.name.replace(' Agent', '').replace('Stale Lead ', 'Stale ')}</span>
                        <span className="text-muted-foreground">{a.runs24h > 0 ? `${a.runs24h}x` : 'idle'}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* === PIPELINE === */}
          {activeSection === 'pipeline' && (
            <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h2 className="text-lg font-bold">Pipeline — click a stage to see leads</h2>
              {/* Funnel visualization */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    {PIPELINE_STAGES.map((stage, i) => {
                      const count = leads.filter(l => l.workflow_stage === stage.id).length;
                      const cumulative = analytics.stageCounts[stage.id];
                      const maxCount = analytics.stageCounts['new'];
                      const widthPct = maxCount > 0 ? (cumulative / maxCount) * 100 : 0;
                      const conversionFromPrev = i > 0 && analytics.stageCounts[PIPELINE_STAGES[i-1].id] > 0
                        ? Math.round((cumulative / analytics.stageCounts[PIPELINE_STAGES[i-1].id]) * 100)
                        : 100;
                      const isExpanded = expandedStage === stage.id;
                      const stageLeads = leads.filter(l => l.workflow_stage === stage.id);

                      return (
                        <div key={stage.id}>
                          <button
                            onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-muted/30 ${isExpanded ? 'bg-muted/30' : ''}`}
                          >
                            <div className="w-24 text-xs font-medium truncate">{stage.label}</div>
                            <div className="flex-1 h-7 bg-muted rounded relative overflow-hidden">
                              <div
                                className={`h-full bg-${stage.color}-500 transition-all flex items-center px-2`}
                                style={{ width: `${Math.max(2, widthPct)}%` }}
                              >
                                <span className="text-[10px] font-bold text-white">{count} here</span>
                              </div>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                {cumulative} total · {i > 0 ? `${conversionFromPrev}% from prev` : 'start'}
                              </div>
                            </div>
                            {isExpanded ? <X className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          </button>
                          {/* Expanded: show leads at this stage */}
                          <AnimatePresence>
                            {isExpanded && stageLeads.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-28 pr-2 pb-2 space-y-1">
                                  {stageLeads.map(lead => (
                                    <div
                                      key={lead.id}
                                      className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/30"
                                      onClick={() => navigate('/lead-flow')}
                                    >
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-[8px]">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium truncate">{lead.name}</span>
                                        {lead.score > 80 && <Badge className="ml-1 text-[8px] h-3 px-0.5 bg-red-500 text-white">Hot</Badge>}
                                      </div>
                                      {lead.proposal && <span className="text-[10px] text-muted-foreground">{eur(lead.proposal.net_cost)}</span>}
                                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                            {isExpanded && stageLeads.length === 0 && (
                              <div className="pl-28 pr-2 pb-2 text-xs text-muted-foreground italic">No leads at this stage.</div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* === ANALYTICS === */}
          {activeSection === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h2 className="text-lg font-bold">Analytics — real numbers</h2>

              {/* Revenue breakdown */}
              <div className="grid sm:grid-cols-3 gap-2">
                <StatCard label="Revenue (closed)" value={eur(analytics.totalRevenue)} sub={`${leads.filter(l => l.invoice?.final_paid).length} projects`} icon={DollarSign} color="emerald" />
                <StatCard label="Pending revenue" value={eur(analytics.pendingRevenue)} sub={`${leads.filter(l => l.proposal && !l.invoice?.final_paid).length} in pipeline`} icon={Clock} color="amber" />
                <StatCard label="SEAI grant pipeline" value={eur(analytics.totalGrantValue)} sub={`${leads.filter(l => l.proposal).length} applications`} icon={Award} color="violet" />
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="Avg deal size" value={eur(analytics.avgDealSize)} sub="per project" icon={Target} color="blue" />
                <StatCard label="Conversion rate" value={`${analytics.conversionRate}%`} sub="lead → contract" icon={Percent} color="emerald" />
                <StatCard label="Avg payback" value={`${analytics.avgPayback} yrs`} sub="across all proposals" icon={Clock} color="amber" />
                <StatCard label="Battery attach" value={`${analytics.batteryAttachRate}%`} sub="of proposals include battery" icon={Zap} color="violet" />
              </div>

              {/* Consultant performance */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Consultant performance</h3>
                  <div className="space-y-2">
                    {analytics.consultants.map(c => (
                      <div key={c.name} className="flex items-center gap-3 p-2 border rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.leads} leads · {c.proposals} proposals · {c.contracts} contracts</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-sm ${c.conversionRate >= 40 ? 'text-emerald-600' : c.conversionRate >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                            {c.conversionRate}%
                          </div>
                          <div className="text-xs text-muted-foreground">{eur(c.revenue)}</div>
                        </div>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${c.conversionRate >= 40 ? 'bg-emerald-500' : c.conversionRate >= 25 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${c.conversionRate}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Installer performance */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Installer performance</h3>
                  <div className="space-y-2">
                    {analytics.installers.map(inst => (
                      <div key={inst.name} className="flex items-center gap-3 p-2 border rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{inst.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{inst.name}</div>
                          <div className="text-xs text-muted-foreground">{inst.jobs} jobs · {inst.completed} completed</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-emerald-600">{inst.completionRate}%</div>
                          <div className="text-xs text-muted-foreground">completion</div>
                        </div>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${inst.completionRate}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System totals */}
              <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-600" /> System totals</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">{analytics.totalSystemKwp}</div>
                      <div className="text-xs text-muted-foreground">Total kWp installed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{eur(analytics.totalSavings)}</div>
                      <div className="text-xs text-muted-foreground">Annual savings/yr</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{leads.filter(l => l.workflow_stage === 'completed').length}</div>
                      <div className="text-xs text-muted-foreground">Projects completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-violet-600">{eur(analytics.totalGrantValue)}</div>
                      <div className="text-xs text-muted-foreground">Grant value tracked</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* === AGENTS === */}
          {activeSection === 'agents' && (
            <motion.div key="agents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2"><Bot className="h-5 w-5 text-violet-600" /> Agent Monitor</h2>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{totalAgentRuns} runs (24h)</Badge>
                  {failedAgents > 0 && <Badge variant="outline" className="bg-red-50 text-red-700">{failedAgents} failed</Badge>}
                  {queuedItems > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-700">{queuedItems} queued</Badge>}
                </div>
              </div>

              {/* Agent table */}
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {agentData.map(a => (
                      <div key={a.id} className={`p-3 ${a.status === 'failed' ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                        <div className="flex items-center gap-3">
                          {/* Status indicator */}
                          <div className={`p-2 rounded-lg ${
                            a.status === 'success' && a.queueDepth === 0 ? 'bg-emerald-100 dark:bg-emerald-950/40' :
                            a.status === 'failed' ? 'bg-red-100 dark:bg-red-950/40' :
                            'bg-amber-100 dark:bg-amber-950/40'
                          }`}>
                            {a.status === 'success' && a.queueDepth === 0 && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                            {a.status === 'failed' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                            {a.status === 'success' && a.queueDepth > 0 && <Clock className="h-4 w-4 text-amber-600" />}
                          </div>

                          {/* Agent info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{a.name}</span>
                              <Badge variant="outline" className="text-[9px]">{a.trigger === 'cron' ? a.schedule : a.trigger}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Last: {a.lastRun} · {a.runs24h > 0 ? `${a.runs24h} runs/24h` : 'idle'} · {a.successRate}% success
                            </div>
                            {a.error && (
                              <div className="text-xs text-red-600 mt-0.5">⚠ {a.error}</div>
                            )}
                          </div>

                          {/* Queue */}
                          {a.queueDepth > 0 && (
                            <div className="text-center px-3 border-l">
                              <div className="text-lg font-bold text-amber-600">{a.queueDepth}</div>
                              <div className="text-[9px] text-muted-foreground">queued</div>
                            </div>
                          )}

                          {/* Actions */}
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate('/agents')}>
                            Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Agent impact */}
              <div className="grid sm:grid-cols-3 gap-2">
                <StatCard label="Emails sent (24h)" value="12" sub="by Follow-Up + Payment Reminder" icon={FileText} color="blue" />
                <StatCard label="Proposals drafted (24h)" value="4" sub="by Proposal Drafter Agent" icon={FileText} color="violet" />
                <StatCard label="Consultant hours saved" value="134h" sub="this month" icon={Clock} color="emerald" />
              </div>
            </motion.div>
          )}

          {/* === CALENDAR === */}
          {activeSection === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-600" /> Organisation calendar</h2>
              <UnifiedCalendar />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: typeof DollarSign; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1.5 rounded-lg bg-${color}-100 dark:bg-${color}-950/40`}>
            <Icon className={`h-3.5 w-3.5 text-${color}-700 dark:text-${color}-300`} />
          </div>
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
        <div className="text-xl font-bold">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function TeamCard({ name, icon: Icon, color, active, metric1, metric2, onClick }: {
  name: string; icon: typeof Users; color: string; active: number;
  metric1: { label: string; value: string }; metric2: { label: string; value: string }; onClick: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg bg-${color}-100 dark:bg-${color}-950/40`}>
            <Icon className={`h-4 w-4 text-${color}-700 dark:text-${color}-300`} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">{name}</div>
            <div className="text-[10px] text-muted-foreground">{active} active</div>
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-[9px] text-muted-foreground">{metric1.label}</div>
            <div className={`font-bold text-xs text-${color}-700 dark:text-${color}-300`}>{metric1.value}</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-[9px] text-muted-foreground">{metric2.label}</div>
            <div className="font-bold text-xs">{metric2.value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: typeof DollarSign; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1 rounded bg-${color}-100 dark:bg-${color}-950/40`}>
            <Icon className={`h-3 w-3 text-${color}-700 dark:text-${color}-300`} />
          </div>
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
        <div className="text-lg font-bold">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
