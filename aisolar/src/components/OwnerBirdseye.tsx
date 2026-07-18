/**
 * Owner Birdseye Dashboard — the organisational cockpit.
 *
 * Shows the whole org at a glance with team controls, then takes you
 * into each team's individual view. Every view has a calendar. Every
 * view has quick actions to jump to the other POVs.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────┐
 *   │ Header: AISOLAR Owner Cockpit                  │
 *   │ KPI bar: Revenue · Pipeline · Active jobs ·    │
 *   │          Stale leads · Agent runs               │
 *   ├────────────────────────────────────────────────┤
 *   │ Team cards (4):                                │
 *   │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐ │
 *   │ │Consultants│ │Installers│ │ Clients  │ │Grants│
 *   │ │ 3 active  │ │ 2 on road │ │ 47 total │ │ 12  │
 *   │ │ €248k pip │ │ 6 jobs   │ │ 8 hot    │ │pending│
 *   │ │[Enter]    │ │[Enter]   │ │[Enter]   │ │[Enter]│
 *   │ └──────────┘ └──────────┘ └──────────┘ └────┘ │
 *   ├────────────────────────────────────────────────┤
 *   │ Calendar (shared view across all teams)        │
 *   │ Shows: consultations, site visits, installs,   │
 *   │ deadlines, agent runs                          │
 *   ├────────────────────────────────────────────────┤
 *   │ Agent status strip (10 agents, 24h summary)    │
 *   └────────────────────────────────────────────────┘
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, Wrench, Sun, Award, Calendar, TrendingUp, DollarSign,
  Bot, Clock, AlertTriangle, CheckCircle2, ArrowRight, Phone,
  MapPin, Zap, FileText, Star, ChevronRight, BarChart3,
  Building2, UserCircle, MessageSquare, Camera, Navigation,
} from 'lucide-react';
import { generateDummyLeads, computePipelineStats, type DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import UnifiedCalendar from './UnifiedCalendar';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface TeamCard {
  id: string;
  name: string;
  icon: typeof Users;
  color: string;
  memberCount: number;
  activeCount: number;
  primaryMetric: { label: string; value: string };
  secondaryMetric: { label: string; value: string };
  route: string;
  description: string;
}

export default function OwnerBirdseye() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);

  const stats = useMemo(() => computePipelineStats(leads), [leads]);
  const installers = leads.filter(l => l.assignment).length;
  const hotLeads = leads.filter(l => l.score > 80).length;
  const seaiPending = leads.filter(l => l.proposal && ['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed'].includes(l.workflow_stage)).length;

  const teams: TeamCard[] = [
    {
      id: 'consultants',
      name: 'Consultants',
      icon: Users,
      color: 'blue',
      memberCount: 2,
      activeCount: leads.filter(l => !['completed', 'final_paid'].includes(l.workflow_stage)).length,
      primaryMetric: { label: 'Pipeline value', value: eur(stats.totalValue) },
      secondaryMetric: { label: 'Hot leads', value: String(hotLeads) },
      route: '/consultant',
      description: 'Lead pipeline, proposals, customer comms, follow-ups',
    },
    {
      id: 'installers',
      name: 'Installers',
      icon: Wrench,
      color: 'amber',
      memberCount: 3,
      activeCount: installers,
      primaryMetric: { label: 'Active jobs', value: String(installers) },
      secondaryMetric: { label: 'Surveys due', value: String(leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage)).length) },
      route: '/installer',
      description: 'Today\'s jobs, BOM, install checklist, handovers',
    },
    {
      id: 'clients',
      name: 'Clients',
      icon: UserCircle,
      color: 'emerald',
      memberCount: leads.length,
      activeCount: leads.filter(l => !['completed'].includes(l.workflow_stage)).length,
      primaryMetric: { label: 'Total clients', value: String(leads.length) },
      secondaryMetric: { label: 'Awaiting action', value: String(leads.filter(l => ['proposal_sent', 'approved', 'installed'].includes(l.workflow_stage)).length) },
      route: '/customer-profile',
      description: 'Customer 360° profiles, communication history, project status',
    },
    {
      id: 'grants',
      name: 'Grants & SEAI',
      icon: Award,
      color: 'violet',
      memberCount: 1,
      activeCount: seaiPending,
      primaryMetric: { label: 'Pending submission', value: String(seaiPending) },
      secondaryMetric: { label: 'Grant value', value: eur(leads.reduce((sum, l) => sum + (l.proposal?.seai_grant || 0), 0)) },
      route: '/analytics',
      description: 'SEAI applications, grant tracking, compliance docs',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20 dark:from-slate-950 dark:via-background dark:to-violet-950/10">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur border-b sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-base">Owner Cockpit</span>
              <p className="text-xs text-muted-foreground">{brand.name} · Birdseye view</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/consultant')}>
              <Users className="h-4 w-4 mr-1" /> Consultant view
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/installer')}>
              <Wrench className="h-4 w-4 mr-1" /> Installer view
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
              <BarChart3 className="h-4 w-4 mr-1" /> Analytics
            </Button>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={DollarSign} label="Pipeline value" value={eur(stats.totalValue)} color="emerald" delta="+12%" />
          <KpiCard icon={Users} label="Active leads" value={String(stats.activeLeads)} color="blue" delta="+3" />
          <KpiCard icon={Wrench} label="Active jobs" value={String(installers)} color="amber" />
          <KpiCard icon={Clock} label="Stale leads" value={String(stats.staleLeads)} color="red" delta="Needs attention" />
          <KpiCard icon={Bot} label="Agent runs (24h)" value="47" color="violet" delta="+8" />
        </div>

        {/* Team cards */}
        <div>
          <h2 className="text-lg font-bold mb-3">Teams</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {teams.map((team, i) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-${team.color}-400"
                  onClick={() => setSelectedTeam(team.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2.5 rounded-xl bg-${team.color}-100 dark:bg-${team.color}-950/40`}>
                        <team.icon className={`h-5 w-5 text-${team.color}-700 dark:text-${team.color}-300`} />
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {team.activeCount} active
                      </Badge>
                    </div>
                    <h3 className="font-bold text-base">{team.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{team.description}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="p-2 bg-muted/30 rounded text-center">
                        <div className="text-[10px] text-muted-foreground">{team.primaryMetric.label}</div>
                        <div className={`font-bold text-sm text-${team.color}-700 dark:text-${team.color}-300`}>{team.primaryMetric.value}</div>
                      </div>
                      <div className="p-2 bg-muted/30 rounded text-center">
                        <div className="text-[10px] text-muted-foreground">{team.secondaryMetric.label}</div>
                        <div className="font-bold text-sm">{team.secondaryMetric.value}</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className={`w-full mt-3 bg-${team.color}-600 hover:bg-${team.color}-700 text-white`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(team.route);
                      }}
                    >
                      Enter {team.name} view <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Unified Calendar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" /> Organisation calendar
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowCalendar(!showCalendar)}>
              {showCalendar ? 'Hide' : 'Show'} calendar
            </Button>
          </div>
          {showCalendar && <UnifiedCalendar />}
        </div>

        {/* Pipeline overview */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" /> Pipeline by stage
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                {PIPELINE_STAGES.map(stage => {
                  const count = leads.filter(l => l.workflow_stage === stage.id).length;
                  const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                  return (
                    <div key={stage.id} className="flex items-center gap-3">
                      <div className="w-32 text-xs truncate">{stage.label}</div>
                      <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                        <div
                          className={`h-full bg-${stage.color}-500 transition-all flex items-center px-2`}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        >
                          {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                        </div>
                      </div>
                      <div className="w-16 text-right text-xs text-muted-foreground">{stage.automation.split(' ').slice(0, 3).join(' ')}…</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent status strip */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-600" /> Agent status (24h)
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { name: 'Lead Intake', runs: 7, status: 'success' },
                  { name: 'Survey Scheduler', runs: 3, status: 'success' },
                  { name: 'Proposal Drafter', runs: 4, status: 'success' },
                  { name: 'Follow-Up', runs: 1, status: 'success' },
                  { name: 'Payment Reminder', runs: 1, status: 'failed' },
                ].map(agent => (
                  <div key={agent.name} className="text-center p-2 border rounded-lg">
                    <div className={`p-1.5 rounded-full w-fit mx-auto mb-1 ${agent.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {agent.status === 'success' ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <AlertTriangle className="h-3 w-3 text-red-600" />}
                    </div>
                    <div className="text-xs font-medium">{agent.name}</div>
                    <div className="text-[10px] text-muted-foreground">{agent.runs} runs</div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => navigate('/agents')}>
                View all 10 agents <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions to other POVs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAction icon={MessageSquare} label="Communication Hub" desc="All customer touchpoints" route="/comms" color="violet" onClick={() => navigate('/comms')} />
          <QuickAction icon={BarChart3} label="Analytics" desc="Funnel, team, agents, SEAI" route="/analytics" color="emerald" onClick={() => navigate('/analytics')} />
          <QuickAction icon={FileText} label="LeadFlow" desc="Survey → Proposal → Send" route="/lead-flow" color="blue" onClick={() => navigate('/lead-flow')} />
          <QuickAction icon={Bot} label="Agent Foundation" desc="10 agents + manual trigger" route="/agents" color="violet" onClick={() => navigate('/agents')} />
        </div>
      </main>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, delta }: { icon: typeof DollarSign; label: string; value: string; color: string; delta?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <div className={`p-1.5 rounded-lg bg-${color}-100 dark:bg-${color}-950/40`}>
            <Icon className={`h-3.5 w-3.5 text-${color}-700 dark:text-${color}-300`} />
          </div>
          {delta && <span className="text-[10px] text-muted-foreground">{delta}</span>}
        </div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ icon: Icon, label, desc, color, onClick }: { icon: typeof MessageSquare; label: string; desc: string; color: string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-950/40`}>
          <Icon className={`h-4 w-4 text-${color}-700 dark:text-${color}-300`} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
