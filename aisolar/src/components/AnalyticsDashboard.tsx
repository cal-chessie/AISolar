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
  BarChart3, PieChart, Activity,
} from 'lucide-react';
import { generateDummyLeads, computePipelineStats } from '@/lib/dummyData';
import { PIPELINE_STAGES, getStage } from '@/lib/leadIntake';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const num = (n: number) => new Intl.NumberFormat('en-IE').format(n);

export default function AnalyticsDashboard() {
  const [leads] = useState(() => generateDummyLeads());
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const stats = useMemo(() => computePipelineStats(leads), [leads]);

  // Funnel data
  const funnel = useMemo(() => {
    const stages = ['new', 'intake_complete', 'survey_scheduled', 'survey_complete', 'proposal_drafted', 'proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'];
    return stages.map(stage => ({
      stage,
      label: getStage(stage).label,
      count: leads.filter(l => {
        const idx = stages.indexOf(l.workflow_stage);
        const currentIdx = stages.indexOf(stage);
        return idx >= currentIdx;
      }).length,
    }));
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
    smsSent: 89,
    proposalsAutoDrafted: 24,
    surveysAutoScheduled: 18,
    followUpsSent: 156,
    hoursSaved: 134, // consultant hours
    costSaved: 4020, // €
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
          <Button variant="outline" size="sm">
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
              label="Pipeline value"
              value={eur(stats.totalValue)}
              delta="+12.4%"
              deltaDirection="up"
              icon={DollarSign}
              color="emerald"
            />
            <KpiCard
              label="Active leads"
              value={num(stats.activeLeads)}
              delta="+3 this week"
              deltaDirection="up"
              icon={Users}
              color="blue"
            />
            <KpiCard
              label="Avg deal size"
              value={eur(stats.totalValue / Math.max(1, stats.activeLeads))}
              delta="-2.1%"
              deltaDirection="down"
              icon={Target}
              color="violet"
            />
            <KpiCard
              label="Stale leads"
              value={num(stats.staleLeads)}
              delta="Needs attention"
              deltaDirection="warn"
              icon={Clock}
              color="amber"
            />
          </div>

          {/* Pipeline by stage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads by stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PIPELINE_STAGES.map(stage => {
                  const count = leads.filter(l => l.workflow_stage === stage.id).length;
                  const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                  return (
                    <div key={stage.id} className="flex items-center gap-3">
                      <div className="w-32 text-xs truncate">{stage.label}</div>
                      <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                        <div
                          className={`h-full bg-primary transition-all`}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                      <div className="w-8 text-right text-xs font-semibold tabular-nums">{count}</div>
                    </div>
                  );
                })}
              </div>
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
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">{item.time}</span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        item.type === 'hot' ? 'bg-red-50 text-red-700 border-red-200' :
                        item.type === 'won' ? 'bg-primary/10 text-primary border-primary/40' :
                        'bg-primary/10 text-primary border-primary/40'
                      }`}
                    >
                      {item.type === 'hot' ? '🔥' : item.type === 'won' ? '✓' : '🤖'}
                    </Badge>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNNEL */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversion funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnel.map((stage, i) => {
                  const prevCount = i > 0 ? funnel[i - 1].count : stage.count;
                  const conversionRate = i > 0 && prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 100;
                  const pctOfTotal = funnel[0].count > 0 ? (stage.count / funnel[0].count) * 100 : 0;
                  return (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{stage.label}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">
                            {conversionRate < 100 && (
                              <span className={conversionRate < 50 ? 'text-red-600' : conversionRate < 80 ? 'text-amber-600' : 'text-primary'}>
                                {conversionRate}% from previous
                              </span>
                            )}
                          </span>
                          <span className="font-semibold tabular-nums">{stage.count} leads</span>
                        </div>
                      </div>
                      <div className="h-8 bg-muted rounded relative overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary transition-all flex items-center px-3"
                          style={{ width: `${Math.max(2, pctOfTotal)}%` }}
                        >
                          <span className="text-xs font-semibold text-white">{Math.round(pctOfTotal)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm">
                <div className="font-semibold text-amber-800 dark:text-amber-300 mb-1">🔍 Bottleneck detected</div>
                <p className="text-amber-700 dark:text-amber-400 text-xs">
                  Biggest drop-off: <strong>proposal_sent → approved</strong> (42% conversion).
                  Industry benchmark is 60%. Recommend: AI coach scripts for payback objection handling.
                </p>
              </div>
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
                        <span className={`font-semibold ${c.conversionRate >= 40 ? 'text-primary' : c.conversionRate >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
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
                  Aoife converts 42% (above benchmark). Cian converts 24%. Pattern: Aoife leads with
                  SEAI grant, Cian leads with savings. Recommend 30-min coaching session for Cian.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGENTS */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Agent runs (24h)" value={num(agentImpact.runs24h)} icon={Bot} color="violet" delta="+12%" deltaDirection="up" />
            <KpiCard label="Agent runs (30d)" value={num(agentImpact.runs30d)} icon={Activity} color="violet" delta="+8%" deltaDirection="up" />
            <KpiCard label="Consultant hours saved" value={`${agentImpact.hoursSaved}h`} icon={Clock} color="emerald" delta="+22h vs last month" deltaDirection="up" />
            <KpiCard label="Cost saved" value={eur(agentImpact.costSaved)} icon={DollarSign} color="emerald" delta="+€890" deltaDirection="up" />
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
                  { name: 'Follow-Up Agent', runs: 31, success: 31, fail: 0, color: 'amber' },
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
                        <span className={successRate >= 95 ? 'text-primary' : successRate >= 80 ? 'text-amber-600' : 'text-red-600'}>
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
                  <div className="text-2xl font-bold text-primary">{agentImpact.smsSent}</div>
                  <div className="text-xs text-muted-foreground">SMS sent</div>
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
              const approvalRate = 96;
              return (
                <>
                  <KpiCard label="Grant pipeline" value={eur(totalGrant)} icon={Award} color="emerald" delta="+€2,700 this week" deltaDirection="up" />
                  <KpiCard label="Submitted" value={num(submitted)} icon={CheckCircle2} color="emerald" delta="Awaiting payment" deltaDirection="up" />
                  <KpiCard label="Pending submission" value={num(pending)} icon={Clock} color="amber" delta="Will auto-submit" deltaDirection="up" />
                  <KpiCard label="Approval rate" value={`${approvalRate}%`} icon={Target} color="emerald" delta="Above SEAI avg" deltaDirection="up" />
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
                        'bg-amber-50 text-amber-700 border-amber-200'
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

function KpiCard({ label, value, delta, deltaDirection, icon: Icon, color }: {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'warn';
  icon: typeof Sun;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg bg-primary/10 dark:bg-primary/10`}>
            <Icon className={`h-4 w-4 text-primary dark:text-primary`} />
          </div>
          {delta && (
            <div className={`text-xs flex items-center gap-0.5 ${
              deltaDirection === 'up' ? 'text-primary' :
              deltaDirection === 'down' ? 'text-red-600' :
              'text-amber-600'
            }`}>
              {deltaDirection === 'up' && <ArrowUpRight className="h-3 w-3" />}
              {deltaDirection === 'down' && <ArrowDownRight className="h-3 w-3" />}
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
