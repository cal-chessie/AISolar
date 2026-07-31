/**
 * Analytics Dashboard v2 — total overhaul
 *
 * Replaces the basic AnalyticsPanel with a proper BI view:
 *   - Revenue funnel (leads → surveys → proposals → contracts → installs → paid)
 *   - Conversion rates at each stage
 *   - Consultant performance comparison
 *   - Average deal size + payback
 *   - Cohort analysis (leads by month)
 *   - Agent impact (hours saved, automations run)
 *   - SEAI grant pipeline value
 *   - Export to CSV
 *
 * Mobile responsive. Real Supabase queries in production; demo data for now.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, Users, DollarSign, Target, Zap, Award, Bot,
  Clock, CheckCircle2, ArrowUpRight, ArrowDownRight, Download, RefreshCw,
  BarChart3, PieChart, Activity, Flame,
} from 'lucide-react';
import { computeOwnerStats } from '@/lib/ownerStats';
import { computePipelineStats } from '@/lib/dummyData';
import { useLeads } from '@/lib/realLeads';
import { PIPELINE_STAGES, getStage } from '@/lib/leadIntake';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const num = (n: number) => new Intl.NumberFormat('en-IE').format(n);

export default function AnalyticsDashboard() {
  const { leads } = useLeads();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const stats = useMemo(() => computePipelineStats(leads), [leads]);
  // ONE set of owner money definitions (src/lib/ownerStats.ts) — same numbers
  // as the cockpit vitals and the CEO window. No third opinion.
  const owner = useMemo(() => computeOwnerStats(leads), [leads]);

  // Funnel data — the seven gates an owner actually asks about, not 13 micro-stages.
  // Each count = leads at or past that gate, so a bar can never grow down-funnel.
  const funnel = useMemo(() => {
    const order = ['new', 'intake_complete', 'survey_scheduled', 'survey_complete', 'proposal_drafted', 'proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'];
    const atOrPast = (s: string) => leads.filter(l => order.indexOf(l.workflow_stage) >= order.indexOf(s)).length;
    return [
      { stage: 'new', label: 'Leads in', count: leads.length },
      { stage: 'survey_complete', label: 'Survey completed', count: atOrPast('survey_complete') },
      { stage: 'proposal_sent', label: 'Proposal sent', count: atOrPast('proposal_sent') },
      { stage: 'approved', label: 'Signed', count: atOrPast('approved') },
      { stage: 'deposit_paid', label: 'Deposit paid', count: atOrPast('deposit_paid') },
      { stage: 'installed', label: 'Installed', count: atOrPast('installed') },
      { stage: 'final_paid', label: 'Paid in full', count: atOrPast('final_paid') },
    ];
  }, [leads]);

  // Consultant performance
  const consultants = useMemo(() => {
    const map = new Map<string, { leads: number; proposals: number; contracts: number; revenue: number; conversionRate: number }>();
    leads.forEach(l => {
      const name = l.assigned_consultant;
      if (!map.has(name)) map.set(name, { leads: 0, proposals: 0, contracts: 0, revenue: 0, conversionRate: 0 });
      const c = map.get(name)!;
      c.leads++;
      if (l.proposal) c.proposals++;
      if (l.contract) {
        c.contracts++;
        c.revenue += l.proposal?.net_cost || 0;
      }
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      conversionRate: data.leads > 0 ? Math.round((data.contracts / data.leads) * 100) : 0,
    }));
  }, [leads]);

  // Agent impact (simulated)
  const agentImpact = {
    runs24h: 47,
    runs30d: 1342,
    emailsSent: 312,
    portalAlerts: 89,   // in-app/portal notifications (live). SMS joins at launch.
    proposalsAutoDrafted: 24,
    surveysAutoScheduled: 18,
    followUpsSent: 156,
    hoursSaved: 134, // consultant hours
    costSaved: 4020, // €
  };

  // Real CSV export of what's on screen — funnel, team, agent impact (no backend).
  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows: string[] = [];
    rows.push(`AISOLAR analytics export,${new Date().toISOString().slice(0, 10)},range ${timeRange}`);
    rows.push('');
    rows.push('Funnel stage,Leads at or past');
    funnel.forEach(f => rows.push(`${esc(f.label)},${f.count}`));
    rows.push('');
    rows.push('Consultant,Leads,Proposals,Contracts,Revenue (EUR),Conversion %');
    consultants.forEach(c => rows.push([esc(c.name), c.leads, c.proposals, c.contracts, c.revenue, c.conversionRate].join(',')));
    rows.push('');
    rows.push('Agent impact,Value');
    Object.entries(agentImpact).forEach(([k, v]) => rows.push(`${esc(k)},${v}`));

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aisolar-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Pipeline health, team performance, agent impact</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {(['7d', '30d', '90d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs rounded ${timeRange === range ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'}`}
              >
                {range === 'all' ? 'All time' : `Last ${range}`}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-3 w-3 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="funnel" className="text-xs sm:text-sm">Funnel</TabsTrigger>
          <TabsTrigger value="team" className="text-xs sm:text-sm">Team</TabsTrigger>
          <TabsTrigger value="agents" className="text-xs sm:text-sm">Agents</TabsTrigger>
          <TabsTrigger value="seai" className="text-xs sm:text-sm">SEAI</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Open pipeline"
              value={eur(owner.openPipeline)}
              delta={`${owner.openDeals} deals in play`}
              icon={DollarSign}
              tone="tech"
            />
            <KpiCard
              label="Revenue banked"
              value={eur(owner.revenueBanked)}
              delta={`${eur(owner.depositsHeld)} deposits held`}
              icon={Users}
              tone="deposit"
            />
            <KpiCard
              label="Avg job (won)"
              value={owner.avgJob ? eur(owner.avgJob) : '—'}
              delta={`${owner.conversion}% proposal → win`}
              icon={Target}
              tone="proposal"
            />
            <KpiCard
              label="Stale leads"
              value={num(stats.staleLeads)}
              delta="No touch in 5+ days"
              deltaDirection="warn"
              icon={Clock}
              tone="pop"
            />
          </div>

          {/* Pipeline by stage — one flat distribution bar in the four phases the
              business talks in, then the per-stage counts underneath. */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Where every lead sits</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const PHASES = [
                  { id: 'intake', label: 'Intake & survey', bar: 'bg-tech', dot: 'bg-tech', stages: ['new', 'intake_complete', 'survey_scheduled', 'survey_complete'] },
                  { id: 'proposal', label: 'Proposal out', bar: 'bg-doc-proposal', dot: 'bg-doc-proposal', stages: ['proposal_drafted', 'proposal_sent'] },
                  { id: 'signed', label: 'Signed & deposit', bar: 'bg-doc-deposit/60', dot: 'bg-doc-deposit/60', stages: ['approved', 'deposit_paid'] },
                  { id: 'done', label: 'Installing & paid', bar: 'bg-doc-deposit', dot: 'bg-doc-deposit', stages: ['install_scheduled', 'installing', 'installed', 'final_paid', 'completed'] },
                ];
                const counts = PHASES.map(p => ({ ...p, count: leads.filter(l => p.stages.includes(l.workflow_stage)).length }));
                const total = Math.max(1, leads.length);
                return (
                  <div>
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                      {counts.map(p => p.count > 0 && (
                        <div key={p.id} className={p.bar} style={{ width: `${(p.count / total) * 100}%` }} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
                      {counts.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5 text-xs">
                          <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                          <span className="text-muted-foreground">{p.label}</span>
                          <span className="font-semibold tabular-nums">{p.count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-8 mt-4">
                      {PIPELINE_STAGES.map(stage => {
                        const count = leads.filter(l => l.workflow_stage === stage.id).length;
                        const phase = counts.find(p => p.stages.includes(stage.id));
                        return (
                          <div key={stage.id} className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0 sm:[&:nth-last-child(2)]:border-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`h-1.5 w-1.5 rounded-full ${count > 0 && phase ? phase.dot : 'bg-muted-foreground/30'}`} />
                              <span className={count > 0 ? '' : 'text-muted-foreground'}>{stage.label}</span>
                            </div>
                            <span className={`text-xs font-semibold tabular-nums ${count > 0 ? '' : 'text-muted-foreground/60'}`}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent activity (last 24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  { time: '14:23', text: 'Sarah McDonald opened proposal (4th time)', type: 'hot' },
                  { time: '13:51', text: 'Proposal Drafter Agent drafted proposal for Tom Brennan', type: 'agent' },
                  { time: '12:14', text: 'Siobhán Murphy signed contract — €8,460', type: 'won' },
                  { time: '11:30', text: 'InstallCoordinator Agent scheduled install for David Walsh', type: 'agent' },
                  { time: '09:00', text: 'Follow-Up Agent sent 8 emails to stale leads', type: 'agent' },
                  { time: '08:00', text: 'Stale Lead Escalator flagged 3 leads to Aoife', type: 'agent' },
                ].map((item, i) => {
                  const Icon = item.type === 'hot' ? Flame : item.type === 'won' ? CheckCircle2 : Bot;
                  const chip = item.type === 'hot' ? 'bg-pop-subtle text-pop' :
                    item.type === 'won' ? 'bg-doc-deposit/10 text-doc-deposit' : 'bg-tech/10 text-tech';
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0">{item.time}</span>
                      <span className={`p-1 rounded-md shrink-0 ${chip}`}><Icon className="h-3.5 w-3.5" /></span>
                      <span className="text-sm">{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNNEL */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conversion funnel</CardTitle>
              <p className="text-xs text-muted-foreground">
                {funnel[0].count} in · {funnel[funnel.length - 1].count} paid in full ·{' '}
                <span className="font-semibold text-foreground">
                  {funnel[0].count > 0 ? Math.round((funnel[funnel.length - 1].count / funnel[0].count) * 100) : 0}% end to end
                </span>
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnel.map((stage, i) => {
                  const prevCount = i > 0 ? funnel[i - 1].count : stage.count;
                  const conversionRate = i > 0 && prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 100;
                  const pctOfTotal = funnel[0].count > 0 ? (stage.count / funnel[0].count) * 100 : 0;
                  const chip = conversionRate < 50 ? 'bg-pop-subtle text-pop' : conversionRate < 80 ? 'bg-doc-proposal/10 text-doc-proposal' : 'bg-doc-deposit/10 text-doc-deposit';
                  return (
                    <div key={stage.stage} className="flex items-center gap-3">
                      <div className="w-36 shrink-0 text-sm font-medium">{stage.label}</div>
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-tech transition-all" style={{ width: `${Math.max(1.5, pctOfTotal)}%` }} />
                      </div>
                      <div className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{stage.count}</div>
                      <div className="w-16 shrink-0 text-right">
                        {i > 0 ? (
                          <span className={`inline-block text-2xs font-semibold rounded-full px-2 py-0.5 tabular-nums ${chip}`}>{conversionRate}%</span>
                        ) : (
                          <span className="text-2xs text-muted-foreground">100%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-2xs text-muted-foreground mt-3">Each gate counts leads at or past it. The chip is carry-through from the gate above.</p>

              {(() => {
                // Computed from the funnel above — never a hardcoded claim.
                let worst: { from: string; to: string; rate: number } | null = null;
                for (let i = 1; i < funnel.length; i++) {
                  const prev = funnel[i - 1];
                  if (prev.count < 2) continue;
                  const rate = Math.round((funnel[i].count / prev.count) * 100);
                  if (!worst || rate < worst.rate) worst = { from: prev.label, to: funnel[i].label, rate };
                }
                if (!worst || worst.rate >= 85) return null;
                return (
                  <div className="mt-6 p-3 rounded-panel border border-pop/30 bg-pop-subtle/50 text-sm">
                    <div className="font-semibold text-pop mb-1">Bottleneck</div>
                    <p className="text-xs text-muted-foreground leading-body">
                      Biggest drop-off: <strong className="text-foreground">{worst.from} → {worst.to}</strong> ({worst.rate}% carry through).
                      Fix this stage before spending on more leads.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultant performance</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-left py-2">Consultant</th>
                    <th className="text-right">Leads</th>
                    <th className="text-right">Proposals</th>
                    <th className="text-right">Contracts</th>
                    <th className="text-right">Conv. rate</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {consultants.map(c => (
                    <tr key={c.name} className="border-b last:border-0">
                      <td className="py-3 font-medium">{c.name}</td>
                      <td className="text-right tabular-nums">{c.leads}</td>
                      <td className="text-right tabular-nums">{c.proposals}</td>
                      <td className="text-right tabular-nums">{c.contracts}</td>
                      <td className="text-right tabular-nums">
                        <span className={`font-semibold ${c.conversionRate >= 40 ? 'text-doc-deposit' : c.conversionRate >= 25 ? 'text-doc-proposal' : 'text-pop'}`}>
                          {c.conversionRate}%
                        </span>
                      </td>
                      <td className="text-right tabular-nums font-semibold">{eur(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 p-3 bg-primary/10 dark:bg-primary/10 rounded-lg text-sm">
                <div className="font-semibold text-primary dark:text-primary mb-1 flex items-center gap-1">
                  <Bot className="h-3 w-3" /> AI Coach insight
                </div>
                <p className="text-primary dark:text-primary text-xs">
                  {(() => {
                    const ranked = [...consultants].sort((a, b) => b.conversionRate - a.conversionRate);
                    const top = ranked[0]; const low = ranked[ranked.length - 1];
                    if (!top || !low || top.name === low.name) return 'Not enough team data yet — insights build as proposals go out.';
                    return `${top.name.split(' ')[0]} converts ${top.conversionRate}%, ${low.name.split(' ')[0]} converts ${low.conversionRate}%. Pair them on the next two calls and close the gap.`;
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGENTS */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Agent runs (24h)" value={num(agentImpact.runs24h)} icon={Bot} tone="tech" delta={`${num(agentImpact.runs30d)} in 30d`} />
            <KpiCard label="Emails sent (30d)" value={num(agentImpact.emailsSent)} icon={Activity} tone="tech" delta={`${num(agentImpact.followUpsSent)} follow-ups`} />
            <KpiCard label="Consultant hours saved" value={`${agentImpact.hoursSaved}h`} icon={Clock} tone="deposit" delta="from runs × avg handling time" />
            <KpiCard label="Cost saved" value={eur(agentImpact.costSaved)} icon={DollarSign} tone="deposit" delta="hours saved × €30/h" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent breakdown (last 30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Lead Intake Agent', runs: 312, success: 311, fail: 1, color: 'blue' },
                  { name: 'Survey Scheduler Agent', runs: 89, success: 87, fail: 2, color: 'indigo' },
                  { name: 'Proposal Drafter Agent', runs: 67, success: 65, fail: 2, color: 'violet' },
                  { name: 'Follow-Up Agent', runs: 31, success: 31, fail: 0, color: 'pending' },
                  { name: 'SEAI Grant Agent', runs: 24, success: 22, fail: 2, color: 'emerald' },
                  { name: 'Install Coordinator Agent', runs: 28, success: 27, fail: 1, color: 'orange' },
                  { name: 'PostInstall Agent', runs: 18, success: 18, fail: 0, color: 'green' },
                  { name: 'Payment Reminder Agent', runs: 31, success: 30, fail: 1, color: 'red' },
                  { name: 'Stale Lead Escalator', runs: 31, success: 31, fail: 0, color: 'slate' },
                  { name: 'Customer Digest Agent', runs: 4, success: 4, fail: 0, color: 'pink' },
                ].map(agent => {
                  const successRate = agent.runs > 0 ? Math.round((agent.success / agent.runs) * 100) : 0;
                  return (
                    <div key={agent.name} className="flex items-center gap-3 text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {agent.runs} runs · {agent.success} success · {agent.fail} failed
                        </div>
                      </div>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full bg-primary`} style={{ width: `${successRate}%` }} />
                      </div>
                      <div className="w-12 text-right text-xs font-semibold tabular-nums">
                        <span className={successRate >= 95 ? 'text-primary' : successRate >= 80 ? 'text-doc-proposal' : 'text-red-600'}>
                          {successRate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Automation impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{agentImpact.emailsSent}</div>
                  <div className="text-xs text-muted-foreground">Emails sent</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{agentImpact.portalAlerts}</div>
                  <div className="text-xs text-muted-foreground">Portal alerts</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{agentImpact.proposalsAutoDrafted}</div>
                  <div className="text-xs text-muted-foreground">Proposals auto-drafted</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{agentImpact.surveysAutoScheduled}</div>
                  <div className="text-xs text-muted-foreground">Surveys auto-scheduled</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEAI */}
        <TabsContent value="seai" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(() => {
              const totalGrant = leads.filter(l => l.proposal).reduce((sum, l) => sum + (l.proposal?.seai_grant || 0), 0);
              const submitted = leads.filter(l => ['final_paid', 'completed'].includes(l.workflow_stage)).length;
              const pending = leads.filter(l => l.proposal && !['final_paid', 'completed'].includes(l.workflow_stage)).length;
              const avgGrant = (submitted + pending) > 0 ? Math.round(totalGrant / (submitted + pending)) : 0;
              return (
                <>
                  <KpiCard label="Grant pipeline" value={eur(totalGrant)} icon={Award} tone="proposal" delta={`${submitted + pending} grants tracked`} />
                  <KpiCard label="Submitted" value={num(submitted)} icon={CheckCircle2} tone="deposit" delta="Awaiting SEAI payment" />
                  <KpiCard label="Pending submission" value={num(pending)} icon={Clock} tone="tech" delta="Agent compiles the pack" />
                  <KpiCard label="Avg grant" value={avgGrant ? eur(avgGrant) : '—'} icon={Target} tone="proposal" delta="Per tracked job" />
                </>
              );
            })()}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEAI grant pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leads.filter(l => l.proposal).map(lead => (
                  <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.proposal?.system_size_kw} kWp · {eur(lead.proposal?.net_cost || 0)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{eur(lead.proposal?.seai_grant || 0)}</div>
                      <Badge variant="outline" className={`text-[11px] mt-1 ${
                        lead.workflow_stage === 'completed' ? 'bg-primary/10 text-primary border-primary/40' :
                        ['final_paid'].includes(lead.workflow_stage) ? 'bg-primary/10 text-primary border-primary/40' :
                        'bg-doc-proposal-subtle text-doc-proposal border-doc-proposal/30'
                      }`}>
                        {lead.workflow_stage === 'completed' ? 'Paid' :
                         ['final_paid'].includes(lead.workflow_stage) ? 'Submitted' :
                         'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const KPI_TONES: Record<string, { chip: string; icon: string }> = {
  tech:     { chip: 'bg-tech-subtle',      icon: 'text-tech' },
  deposit:  { chip: 'bg-doc-deposit/10',   icon: 'text-doc-deposit' },
  proposal: { chip: 'bg-doc-proposal/10',  icon: 'text-doc-proposal' },
  pop:      { chip: 'bg-pop-subtle',       icon: 'text-pop' },
};
function KpiCard({ label, value, delta, deltaDirection, icon: Icon, tone }: {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'warn';
  icon: typeof Sun;
  tone?: string;
}) {
  const t = KPI_TONES[tone ?? ''] ?? { chip: 'bg-muted', icon: 'text-muted-foreground' };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${t.chip}`}>
            <Icon className={`h-4 w-4 ${t.icon}`} />
          </div>
          {delta && (
            <div className={`text-xs flex items-center gap-0.5 ${
              deltaDirection === 'warn' ? 'text-pop' : 'text-muted-foreground'
            }`}>
              {delta}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

// Need to import Sun for the icon type
import { Sun } from 'lucide-react';
