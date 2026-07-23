/**
 * Owner Cockpit V2 — sidebar nav + single-screen cockpit.
 *
 * Left sidebar: quick links to every section (like a real OS).
 * Main area: the cockpit (vital signs, pipeline, activity, alerts, schedule).
 *
 * Sidebar links:
 *   Overview (cockpit) — what's visible by default
 *   Calendar — full month view
 *   Consultants — pick a consultant → see their customer chats
 *   Installers — pick an installer → see their jobs
 *   Clients — client list → 360° profile
 *   Products — product catalogue
 *   Settings — system settings
 *   Agents — agent monitor
 *   Analytics — full analytics
 *   CRM — (placeholder for your CRM add-on)
 */

import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { AiosMark } from "@/components/brand/AiosMark";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Users, Wrench, Calendar, TrendingUp, DollarSign, Bot, Clock,
  AlertTriangle, CheckCircle2, ArrowRight, Building2, UserCircle,
  Star, Phone, Video, MapPin, FileText, Zap, Award, Activity,
  ChevronRight, Flame, Target, Percent, Navigation, Package,
  Settings, BarChart3, MessageSquare, Home, ChevronLeft, X,
  Search, Calculator, Shield,
} from 'lucide-react';
import { generateDummyLeads, computePipelineStats, type DummyLead } from '@/lib/dummyData';
import { PIPELINE_STAGES, getStage } from '@/lib/leadIntake';
import { PipelineBar } from '@/components/layout/PipelineBar';
import InsightsView from '@/components/InsightsView';
import { AppShell, type ShellNavItem } from '@/components/layout/AppShell';
import { brand } from '@/config/brand';
import { useTenantBrand } from '@/lib/tenantBrand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { EmptyState } from '@/components/ui/EmptyState';
import { CockpitSkeleton, CardListSkeleton } from '@/components/ui/SuspenseFallbacks';
import { staggerContainer, listItem } from '@/lib/motionPresets';
import { useIsMobile } from '@/hooks/use-mobile';
import UnifiedCalendar from './UnifiedCalendar';

// Lazy-load heavy components only when their sidebar item is clicked
const ProfessionalProducts = lazy(() => import('./ProfessionalProducts'));
const SystemSettings = lazy(() => import('./SystemSettingsV2'));
const AgentFoundation = lazy(() => import('./AgentFoundation'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
const CustomerIntelligenceProfile = lazy(() => import('./CustomerIntelligenceProfile'));
const RealCalendar = lazy(() => import('./RealCalendar'));
const EstimateView = lazy(() => import('./EstimateView'));
const ProposalView = lazy(() => import('./ProposalView'));
const AgentTraining = lazy(() => import('./AgentTraining'));
const SEAIDashboard = lazy(() => import('./SEAIDashboard'));
const EstimatesView = lazy(() => import('./EstimatesView'));
const CeoWindow = lazy(() => import('./CeoWindow'));

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type SidebarView = 'overview' | 'calendar' | 'consultants' | 'installers' | 'clients' | 'feedback' | 'products' | 'settings' | 'agents' | 'analytics' | 'crm' | 'lead_detail' | 'seai' | 'estimates';

const SIDEBAR_ITEMS: Array<{ id: SidebarView; label: string; icon: typeof Home; badge?: string }> = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'estimates', label: 'Estimates', icon: Calculator },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'consultants', label: 'Consultants', icon: Users },
  { id: 'installers', label: 'Installers', icon: Wrench },
  { id: 'clients', label: 'Clients', icon: UserCircle },
  { id: 'feedback', label: 'Help us improve', icon: Star },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'seai', label: 'SEAI & Compliance', icon: Award },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'crm', label: 'CRM', icon: MessageSquare },
];

export default function OwnerCockpit() {
  const tb = useTenantBrand();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [activeView, setActiveView] = useState<SidebarView>('overview');
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  // On mobile: sidebar is a drawer, closed by default. On desktop: collapsible, open by default.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<DummyLead | null>(null);

  // On desktop, auto-open the sidebar on first mount
  useEffect(() => {
    if (!isMobile) setSidebarOpen(true);
    else setSidebarOpen(false);
  }, [isMobile]);

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!sidebarOpen || !isMobile) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sidebarOpen, isMobile]);

  /** Navigate to a sidebar view. On mobile, close the drawer after selecting. */
  const selectView = (view: SidebarView) => {
    setActiveView(view);
    if (isMobile) setSidebarOpen(false);
  };

  // Compute everything from real lead data
  const data = useMemo(() => {
    const stats = computePipelineStats(leads);
    const revenueClosed = leads.filter(l => l.invoice?.final_paid).reduce((s, l) => s + (l.proposal?.net_cost || 0), 0);
    const revenuePending = leads.filter(l => l.proposal && !l.invoice?.final_paid).reduce((s, l) => s + (l.proposal.net_cost || 0), 0);

    const stageCounts = PIPELINE_STAGES.map(s => ({
      ...s,
      count: leads.filter(l => l.workflow_stage === s.id).length,
      cumulative: leads.filter(l => {
        const idx = PIPELINE_STAGES.findIndex(p => p.id === l.workflow_stage);
        const sIdx = PIPELINE_STAGES.findIndex(p => p.id === s.id);
        return idx >= sIdx;
      }).length,
    }));

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

    const activity = leads
      .flatMap(l => l.touchpoints.map(tp => ({ ...tp, leadName: l.name, leadId: l.id })))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    const staleLeads = leads.filter(l => {
      const last = l.touchpoints[l.touchpoints.length - 1];
      if (!last) return false;
      return (Date.now() - new Date(last.timestamp).getTime()) > 5 * 86400000
        && !['completed', 'final_paid', 'installed', 'installing'].includes(l.workflow_stage);
    });

    const todayEvents: Array<{ id: string; time: string; type: 'install' | 'follow_up'; title: string; assignee: string }> = [
      ...leads
        .filter(l => l.assignment?.scheduled_date)
        .map(l => ({
          id: l.id, time: '08:00', type: 'install' as const,
          title: `${l.name} — ${l.proposal?.system_size_kw}kWp`,
          assignee: l.assignment?.installer_name || 'Unassigned',
        })),
      ...leads
        .filter(l => ['proposal_sent'].includes(l.workflow_stage))
        .map(l => ({
          id: l.id, time: '14:00', type: 'follow_up' as const,
          title: `${l.name} — follow-up`, assignee: l.assigned_consultant,
        })),
    ].slice(0, 6);

    const conversionRate = leads.length > 0 ? Math.round((leads.filter(l => l.contract).length / leads.length) * 100) : 0;
    const totalAgentRuns = 47;
    const agentFailures = 1;
    const agentHealth = 90;

    // Consultant list with workload
    const consultantMap = new Map<string, { name: string; leads: DummyLead[] }>();
    leads.forEach(l => {
      if (!consultantMap.has(l.assigned_consultant)) {
        consultantMap.set(l.assigned_consultant, { name: l.assigned_consultant, leads: [] });
      }
      consultantMap.get(l.assigned_consultant)!.leads.push(l);
    });
    const consultants = Array.from(consultantMap.values()).map(c => ({
      ...c,
      activeLeads: c.leads.filter(l => !['completed', 'final_paid'].includes(l.workflow_stage)).length,
      hotLeads: c.leads.filter(l => l.score > 80).length,
      pipelineValue: c.leads.reduce((s, l) => s + (l.proposal?.net_cost || 0), 0),
    }));

    // Installer list with workload
    const installerMap = new Map<string, { name: string; jobs: DummyLead[] }>();
    leads.forEach(l => {
      if (l.assignment?.installer_name) {
        if (!installerMap.has(l.assignment.installer_name)) {
          installerMap.set(l.assignment.installer_name, { name: l.assignment.installer_name, jobs: [] });
        }
        installerMap.get(l.assignment.installer_name)!.jobs.push(l);
      }
    });
    const installers = Array.from(installerMap.values()).map(i => ({
      ...i,
      activeJobs: i.jobs.filter(l => !['completed', 'final_paid'].includes(l.workflow_stage)).length,
      completedJobs: i.jobs.filter(l => l.assignment?.status === 'completed').length,
    }));

    return {
      stats, revenueClosed, revenuePending, stageCounts, bottleneck,
      activity, staleLeads, todayEvents, conversionRate,
      totalAgentRuns, agentFailures, agentHealth,
      consultants, installers,
    };
  }, [leads]);

  const shellNav: ShellNavItem[] = [
    ...SIDEBAR_ITEMS.map(it => ({
      id: it.id as string,
      label: it.label,
      icon: <it.icon />,
      onSelect: () => selectView(it.id),
      badge: it.id === 'agents' && data.agentFailures ? data.agentFailures : undefined,
      primary: ['overview', 'calendar', 'agents', 'analytics'].includes(it.id),
    })),
    { id: 'switch-consultant', label: 'Consultant view', icon: <Users />, onSelect: () => navigate('/consultant') },
    { id: 'switch-installer', label: 'Installer view', icon: <Wrench />, onSelect: () => navigate('/installer') },
  ];

  return (
    <AppShell
      persona="owner"
      brandName={tb.name}
      personaLabel="Owner Cockpit"
      nav={shellNav}
      activeId={activeView}
      title={SIDEBAR_ITEMS.find(it => it.id === activeView)?.label ?? 'Overview'}
      headerExtra={<DarkModeToggle />}
    >
        <Suspense fallback={<CockpitSkeleton />}>
          {activeView === 'overview' && (
            <OverviewView data={data} leads={leads} expandedStage={expandedStage} setExpandedStage={setExpandedStage} navigate={navigate} setSelectedLead={setSelectedLead} setActiveView={setActiveView} />
          )}
          {activeView === 'calendar' && <RealCalendar />}
          {activeView === 'consultants' && (
            <ConsultantsView consultants={data.consultants} navigate={navigate} />
          )}
          {activeView === 'installers' && (
            <InstallersView installers={data.installers} navigate={navigate} />
          )}
          {activeView === 'clients' && (
            <ClientsView leads={leads} navigate={navigate} />
          )}
          {activeView === 'products' && <ProfessionalProducts />}
          {activeView === 'settings' && <SystemSettings />}
          {activeView === 'agents' && <AgentFoundation />}
          {activeView === 'analytics' && <Suspense fallback={<CockpitSkeleton />}><CeoWindow /></Suspense>}
          {activeView === 'crm' && <CrmPlaceholder />}
          {activeView === 'feedback' && <HelpUsImprove />}
          {activeView === 'seai' && <SEAIDashboard leads={leads} />}
          {activeView === 'estimates' && <EstimatesView leads={leads} onSelectLead={(lead) => { setSelectedLead(lead); setActiveView('lead_detail'); }} />}
          {activeView === 'lead_detail' && selectedLead && (
            <LeadDetailView lead={selectedLead} onBack={() => { setActiveView('overview'); setSelectedLead(null); }} navigate={navigate} />
          )}
        </Suspense>
    </AppShell>
  );
}

// ============= SIDEBAR CONTENT (shared between desktop + mobile drawer) =============
function SidebarContent({
  activeView,
  onSelectView,
  agentFailures,
  staleLeadsCount,
  onNavigate,
}: {
  activeView: SidebarView;
  onSelectView: (view: SidebarView) => void;
  agentFailures: number;
  staleLeadsCount: number;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="w-56 h-full flex flex-col">
      {/* Logo */}
      <div className="p-3 flex items-center gap-2 border-b">
        <AiosMark className="size-8" />
        <div>
          <div className="font-bold text-xs">{tb.name}</div>
          <div className="text-[11px] text-muted-foreground">Owner Cockpit</div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {SIDEBAR_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'agents' && agentFailures > 0 && (
                <span className="bg-red-500 text-white text-[11px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{agentFailures}</span>
              )}
              {item.id === 'clients' && staleLeadsCount > 0 && (
                <span className="bg-amber-500 text-white text-[11px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{staleLeadsCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom: cross-view + dark mode */}
      <div className="p-2 border-t space-y-0.5">
        <button onClick={() => onNavigate('/consultant')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
          <Users className="h-3.5 w-3.5" /> Consultant view
        </button>
        <button onClick={() => onNavigate('/installer')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
          <Wrench className="h-3.5 w-3.5" /> Installer view
        </button>
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-[11px] text-muted-foreground">Theme</span>
          <DarkModeToggle />
        </div>
      </div>
    </div>
  );
}

// ============= OVERVIEW (the cockpit) =============
function OverviewView({ data, leads, expandedStage, setExpandedStage, navigate, setSelectedLead, setActiveView }: any) {
  return (
    <div className="p-3 space-y-3">
      {/* Vital signs */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-2"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={listItem}>
        <Card className="border-primary/40 dark:border-primary/40">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Revenue</span>
              <TrendingUp className="h-3 w-3 text-primary" />
            </div>
            <div className="text-xl font-bold text-primary dark:text-primary">{eur(data.revenueClosed)}</div>
            <div className="text-[11px] text-muted-foreground">{eur(data.revenuePending)} pending</div>
            <div className="flex items-end gap-0.5 mt-1.5 h-6">
              {[40, 55, 48, 62, 70, 65, 78, 85, 72, 90, 88, 95].map((h, i) => (
                <div key={i} className="flex-1 bg-primary rounded-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div variants={listItem}>
        <Card className="border-primary/40 dark:border-primary/40">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Pipeline</span>
              <Activity className="h-3 w-3 text-primary" />
            </div>
            <div className="text-xl font-bold text-primary dark:text-primary">{eur(data.stats.totalValue)}</div>
            <div className="text-[11px] text-muted-foreground">{data.stats.activeLeads} active · {leads.filter((l: DummyLead) => l.score > 80).length} hot</div>
            <div className="flex gap-0.5 mt-1.5">
              {data.stageCounts.slice(0, 8).map((s: any) => (
                <div key={s.id} className={`flex-1 h-1.5 rounded-full bg-primary`} />
              ))}
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div variants={listItem}>
        <Card className="border-tech/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Jobs</span>
              <Wrench className="h-3 w-3 text-tech" />
            </div>
            <div className="text-xl font-bold text-tech">{leads.filter((l: DummyLead) => l.assignment).length}</div>
            <div className="text-[11px] text-muted-foreground">{leads.filter((l: DummyLead) => ['survey_scheduled','survey_complete'].includes(l.workflow_stage)).length} surveys due</div>
            <div className="flex gap-0.5 mt-1.5">
              {leads.filter((l: DummyLead) => l.assignment).slice(0, 6).map((l: DummyLead, i: number) => (
                <div key={i} className={`h-1.5 w-4 rounded-sm ${l.assignment?.status === 'completed' ? 'bg-primary' : 'bg-tech'}`} />
              ))}
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div variants={listItem}>
        <Card className={data.agentFailures > 0 ? 'border-red-200 dark:border-red-800' : 'border-primary/40 dark:border-primary/40'}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Agents</span>
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="text-xl font-bold text-primary dark:text-primary">{data.totalAgentRuns}</div>
            <div className="text-[11px] text-muted-foreground">
              {data.agentFailures > 0 ? <span className="text-red-600">⚠ {data.agentFailures} failed</span> : 'all healthy'} · runs/24h
            </div>
            <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${data.agentFailures > 0 ? 'bg-pop' : 'bg-primary'}`} style={{ width: `${data.agentHealth}%` }} />
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </motion.div>

      {/* Pipeline — compact 6-phase bar; raw stages via progressive disclosure */}
      <Card>
        <CardContent className="p-0">
          <PipelineBar
            counts={Object.fromEntries(data.stageCounts.map((s: any) => [s.id, s.count]))}
            onStageClick={(id) => setExpandedStage(expandedStage === id ? null : id)}
            onGroupToggle={() => setExpandedStage(null)}
            className="border-0"
          />
          {/* Expanded leads */}
          {expandedStage && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden mx-4 mb-4 pt-3 border-t">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                {getStage(expandedStage).label} — {leads.filter((l: DummyLead) => l.workflow_stage === expandedStage).length} leads (click to open)
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {leads.filter((l: DummyLead) => l.workflow_stage === expandedStage).map((lead: DummyLead) => (
                  <div key={lead.id} className="p-3 border rounded-lg transition-colors hover:bg-muted/30 cursor-pointer" onClick={() => { setSelectedLead(lead); setActiveView('lead_detail'); }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[11px]">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium truncate">{lead.name}</span>
                          {lead.score > 80 && <Flame className="h-3 w-3 text-red-500" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{lead.address.split(',').slice(-1)[0]?.trim()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {lead.proposal && <span className="text-[11px] font-semibold text-primary">{eur(lead.proposal.net_cost)}</span>}
                      <button className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
                        <Calculator className="h-2.5 w-2.5 inline mr-0.5" />Estimate
                      </button>
                      {lead.proposal && (
                        <button className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
                          <FileText className="h-2.5 w-2.5 inline mr-0.5" />Proposal
                        </button>
                      )}
                      <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
                    </div>
                  </div>
                ))}
                {leads.filter((l: DummyLead) => l.workflow_stage === expandedStage).length === 0 && (
                  <p className="text-xs text-muted-foreground italic p-2">No leads at this stage.</p>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Cal's layout: Today's schedule ABOVE live activity, BESIDE needs attention */}
      <div className="grid lg:grid-cols-2 gap-2">
      <Card>
        <CardContent className="p-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Calendar className="h-3 w-3" /> Today's schedule</h3>
          <div className="space-y-1">
            {data.todayEvents.map((event: any, i: number) => {
              const target = event.leadId
                ? (event.type === 'install' ? `/job/${event.leadId}` : `/lead-flow/${event.leadId}`)
                : (event.type === 'install' ? '/job' : '/lead-flow');
              return (
                <div key={i} className="flex items-center gap-2 p-1.5 border rounded-lg cursor-pointer transition-colors hover:bg-muted/30" onClick={() => navigate(target)}>
                  <span className="text-[11px] font-mono text-muted-foreground w-10">{event.time}</span>
                  <div className={`p-1 rounded ${event.type === 'install' ? 'bg-tech/10' : 'bg-primary/10'}`}>
                    {event.type === 'install' ? <Wrench className="h-2.5 w-2.5 text-tech" /> : <Phone className="h-2.5 w-2.5 text-primary" />}
                  </div>
                  <span className="text-xs flex-1 truncate">{event.title}</span>
                  <span className="text-[11px] text-muted-foreground">{event.assignee}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Needs attention</h3>
            <div className="space-y-2">
              {data.staleLeads.length > 0 && <AlertItem icon={Clock} color="amber" title={`${data.staleLeads.length} stale leads`} desc="5+ days no contact" cta="Review" onClick={() => navigate('/consultant')} />}
              {data.agentFailures > 0 && <AlertItem icon={Bot} color="red" title="Payment Reminder Agent failed" desc="Postmark rate limit" cta="View" onClick={() => setActiveView('agents')} />}
              <AlertItem icon={TrendingUp} color="blue" title={`Conversion: ${data.conversionRate}%`} desc={data.bottleneck ? `Bottleneck at ${getStage(data.bottleneck.stage).label}` : 'Healthy'} cta="Analytics" onClick={() => setActiveView('analytics')} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live activity — full width, below */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Activity className="h-3 w-3" /> Live activity</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {data.activity.map((item: any, i: number) => {
                const isAgent = item.actor === 'agent';
                const isCustomer = item.actor === 'customer';
                return (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0 mt-0.5 w-10">{new Date(item.timestamp).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className={`p-0.5 rounded ${isAgent ? 'bg-primary/10 dark:bg-primary/10' : isCustomer ? 'bg-primary/10 dark:bg-primary/10' : 'bg-muted'}`}>
                      {isAgent && <Bot className="h-2.5 w-2.5 text-primary" />}
                      {isCustomer && <UserCircle className="h-2.5 w-2.5 text-primary" />}
                      {!isAgent && !isCustomer && <Users className="h-2.5 w-2.5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0"><span className="font-medium">{item.leadName}</span><span className="text-muted-foreground"> — {item.summary}</span></div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}

// ============= CONSULTANTS VIEW =============
function ConsultantsView({ consultants, navigate }: { consultants: any[]; navigate: (path: string) => void }) {
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null);

  if (selectedConsultant) {
    const consultant = consultants.find(c => c.name === selectedConsultant);
    if (!consultant) return null;
    return (
      <div className="p-4 space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedConsultant(null)}><ChevronLeft className="h-4 w-4 mr-1" /> Back to consultants</Button>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12"><AvatarFallback>{consultant.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
          <div>
            <h2 className="text-xl font-bold">{consultant.name}</h2>
            <p className="text-xs text-muted-foreground">{consultant.activeLeads} active leads · {consultant.hotLeads} hot · {eur(consultant.pipelineValue)} pipeline</p>
          </div>
        </div>
        <h3 className="text-sm font-bold mt-4">Their customer chats</h3>
        <div className="space-y-2">
          {consultant.leads.map((lead: DummyLead) => {
            const lastTouch = lead.touchpoints[lead.touchpoints.length - 1];
            return (
              <div key={lead.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/30" onClick={() => navigate(`/consultant?lead=${lead.id}`)}>
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{lead.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{lastTouch?.summary || 'No messages'}</div>
                </div>
                <Badge variant="outline" className="text-[11px]">{getStage(lead.workflow_stage).label}</Badge>
                {lead.score > 80 && <Flame className="h-3 w-3 text-red-500" />}
                {lead.proposal && <span className="text-xs text-muted-foreground">{eur(lead.proposal.net_cost)}</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-bold">Consultants — click to see their customers</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {consultants.map(c => (
          <Card key={c.name} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelectedConsultant(c.name)}>
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="h-12 w-12"><AvatarFallback>{c.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="font-bold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.activeLeads} active · {c.hotLeads} hot</div>
                <div className="text-sm font-bold text-primary mt-1">{eur(c.pipelineValue)}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============= INSTALLERS VIEW =============
function InstallersView({ installers, navigate }: { installers: any[]; navigate: (path: string) => void }) {
  const [selectedInstaller, setSelectedInstaller] = useState<string | null>(null);

  if (selectedInstaller) {
    const installer = installers.find(i => i.name === selectedInstaller);
    if (!installer) return null;
    return (
      <div className="p-4 space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedInstaller(null)}><ChevronLeft className="h-4 w-4 mr-1" /> Back to installers</Button>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12"><AvatarFallback>{installer.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
          <div>
            <h2 className="text-xl font-bold">{installer.name}</h2>
            <p className="text-xs text-muted-foreground">{installer.activeJobs} active · {installer.completedJobs} completed</p>
          </div>
        </div>
        <h3 className="text-sm font-bold mt-4">Their jobs</h3>
        <div className="space-y-2">
          {installer.jobs.map((lead: DummyLead) => (
            <div key={lead.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/30" onClick={() => navigate(`/job/${lead.id}`)}>
              <div className={`p-2 rounded-lg ${lead.assignment?.status === 'completed' ? 'bg-primary/10' : 'bg-tech/10'}`}>
                <Wrench className={`h-4 w-4 ${lead.assignment?.status === 'completed' ? 'text-primary' : 'text-tech'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{lead.name}</div>
                <div className="text-xs text-muted-foreground">{lead.proposal?.system_size_kw}kWp · {lead.address.split(',').slice(-1)[0]?.trim()}</div>
              </div>
              <Badge variant="outline" className="text-[11px] capitalize">{lead.assignment?.status}</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-bold">Installers — click to see their jobs</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {installers.map(i => (
          <Card key={i.name} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelectedInstaller(i.name)}>
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="h-12 w-12"><AvatarFallback>{i.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="font-bold">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.activeJobs} active · {i.completedJobs} completed</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============= CLIENTS VIEW (360° — cockpit style) =============
function ClientsView({ leads, navigate }: { leads: DummyLead[]; navigate: (path: string) => void }) {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<DummyLead | null>(null);

  const filtered = leads.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    l.address.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedClient) {
    const lead = selectedClient;
    const stage = getStage(lead.workflow_stage);
    return (
      <div className="p-4 space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}><ChevronLeft className="h-4 w-4 mr-1" /> Back to clients</Button>

        {/* Client header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16"><AvatarFallback className="text-lg">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{lead.name}</h1>
                  <Badge className={`bg-primary text-white text-[11px]`}>{stage.label}</Badge>
                  {lead.score > 80 && <Badge className="bg-red-500 text-white text-[11px]"><Flame className="h-2 w-2 mr-0.5" /> Hot</Badge>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                  <div><span className="text-muted-foreground">Phone:</span> {lead.phone}</div>
                  <div><span className="text-muted-foreground">Email:</span> {lead.email}</div>
                  <div><span className="text-muted-foreground">MPRN:</span> <span className="font-mono">{lead.mprn}</span></div>
                  <div><span className="text-muted-foreground">Consultant:</span> {lead.assigned_consultant}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="outline" onClick={() => navigate(`/consultant?lead=${lead.id}`)}><MessageSquare className="h-3 w-3 mr-1" /> Chat</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/lead-flow/${lead.id}`)}><FileText className="h-3 w-3 mr-1" /> Flow</Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/my-projects')}><UserCircle className="h-3 w-3 mr-1" /> Portal</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {lead.proposal ? (
            <>
              <StatBox label="System" value={`${lead.proposal.system_size_kw}kWp`} sub={`${lead.proposal.panel_count} panels`} color="amber" icon={Zap} />
              <StatBox label="Net cost" value={eur(lead.proposal.net_cost)} sub={`Grant: ${eur(lead.proposal.seai_grant)}`} color="emerald" icon={DollarSign} />
              <StatBox label="Annual savings" value={eur(lead.proposal.annual_savings)} sub={`${lead.proposal.payback_years}yr payback`} color="blue" icon={TrendingUp} />
              <StatBox label="Touchpoints" value={String(lead.touchpoints.length)} sub={`Last: ${new Date(lead.touchpoints[lead.touchpoints.length-1]?.timestamp || Date.now()).toLocaleDateString('en-IE')}`} color="violet" icon={MessageSquare} />
            </>
          ) : (
            <>
              <StatBox label="Monthly bill" value={`€${lead.monthly_bill}`} sub={`${lead.annual_kwh?.toLocaleString()} kWh/yr`} color="blue" icon={FileText} />
              <StatBox label="Est. system" value={`${lead.intake.estimated_system_size_kw}kWp`} sub="from bill" color="amber" icon={Zap} />
              <StatBox label="Est. savings" value={eur(lead.intake.estimated_annual_savings || 0)} sub="per year" color="emerald" icon={TrendingUp} />
              <StatBox label="Touchpoints" value={String(lead.touchpoints.length)} sub="communications" color="violet" icon={MessageSquare} />
            </>
          )}
        </div>

        {/* Touchpoint timeline */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Communication history</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {lead.touchpoints.map((tp, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 border rounded text-xs">
                  <Badge variant="outline" className="text-[11px] flex-shrink-0">{tp.channel}</Badge>
                  <span className="text-muted-foreground flex-shrink-0 w-16">{new Date(tp.timestamp).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}</span>
                  <span className="flex-1 truncate">{tp.summary}</span>
                  <Badge variant="outline" className="text-[11px] flex-shrink-0">{tp.actor}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Clients — {leads.length} total</h2>
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search name, email, address…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
        </div>
      </div>
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No clients match your search"
            description="Try a different name, email, or address — or clear the search to see all clients."
            variant="compact"
          />
        ) : (
          filtered.map(lead => {
            const stage = getStage(lead.workflow_stage);
            return (
              <div key={lead.id} className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setSelectedClient(lead)}>
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{lead.name}</span>
                    {lead.score > 80 && <Flame className="h-2.5 w-2.5 text-red-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{lead.address}</div>
                </div>
                <Badge variant="outline" className={`text-[11px] bg-primary/10 text-primary border-primary/40`}>{stage.label}</Badge>
                {lead.proposal && <span className="text-xs text-muted-foreground hidden sm:inline">{eur(lead.proposal.net_cost)}</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============= CRM PLACEHOLDER =============
function CrmPlaceholder() {
  return (
    <div className="p-8 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
      <h2 className="text-xl font-bold mb-2">CRM</h2>
      <p className="text-sm text-muted-foreground">Your CRM add-on connects here. Share the CRM details and I'll integrate it into the owner cockpit.</p>
    </div>
  );
}

// ============= LEAD DETAIL (owner walks through pipeline without blocks) =============
function LeadDetailView({ lead, onBack, navigate }: { lead: DummyLead; onBack: () => void; navigate: (path: string) => void }) {
  const [tab, setTab] = useState<'estimate' | 'proposal' | 'compliance' | 'timeline'>('estimate');

  return (
    <div className="p-3 space-y-3">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
        <div className="flex-1">
          <div className="font-bold text-sm">{lead.name}</div>
          <div className="text-xs text-muted-foreground">{getStage(lead.workflow_stage).label} · {lead.address.split(',').slice(-1)[0]?.trim()}</div>
        </div>
      </div>

      {/* Tabs — no blocks, owner can view all */}
      <div className="flex gap-1 border-b">
        {[
          { id: 'estimate' as const, label: 'Estimate', icon: FileText },
          { id: 'proposal' as const, label: 'Proposal', icon: FileText },
          { id: 'compliance' as const, label: 'Compliance', icon: Shield },
          { id: 'timeline' as const, label: 'Timeline', icon: Clock },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary/40 text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="h-3 w-3" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <Suspense fallback={<CardListSkeleton count={4} />}>
        {tab === 'estimate' && <EstimateView lead={lead} onOpenProposal={() => setTab('proposal')} />}
        {tab === 'proposal' && <ProposalView lead={lead} />}
        {tab === 'compliance' && <ProposalView lead={lead} />}
        {tab === 'timeline' && (
          <Card>
            <CardContent className="p-3">
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {lead.touchpoints.map((tp, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded text-xs">
                    <Badge variant="outline" className="text-[11px] flex-shrink-0">{tp.channel}</Badge>
                    <span className="text-muted-foreground flex-shrink-0 w-20">{new Date(tp.timestamp).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}</span>
                    <span className="flex-1 truncate">{tp.summary}</span>
                    <Badge variant="outline" className="text-[11px] flex-shrink-0">{tp.actor}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </Suspense>

      {/* Quick actions — jump to any view */}
      <div className="flex gap-2 pt-2 border-t">
        <Button size="sm" variant="outline" onClick={() => navigate(`/lead-flow/${lead.id}`)}><FileText className="h-3 w-3 mr-1" /> Open in LeadFlow</Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/consultant?lead=${lead.id}`)}><MessageSquare className="h-3 w-3 mr-1" /> Open chat</Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/job/${lead.id}`)}><Wrench className="h-3 w-3 mr-1" /> Open job</Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/my-projects')}><UserCircle className="h-3 w-3 mr-1" /> Customer portal</Button>
      </div>
    </div>
  );
}

// ============= SHARED COMPONENTS =============
function AlertItem({ icon: Icon, color, title, desc, cta, onClick }: any) {
  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg">
      <div className={`p-1.5 rounded-lg bg-primary/10 dark:bg-primary/10 flex-shrink-0`}>
        <Icon className={`h-3 w-3 text-primary`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium">{title}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={onClick}>{cta}</Button>
    </div>
  );
}

function StatBox({ label, value, sub, color, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="p-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`p-0.5 rounded bg-primary/10 dark:bg-primary/10`}>
            <Icon className={`h-2.5 w-2.5 text-primary`} />
          </div>
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
        <div className="text-sm font-bold">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}


// ============= HELP US IMPROVE (Cal's #23) =============
function HelpUsImprove() {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const submit = () => {
    if (!text.trim()) return;
    try {
      const KEY = 'aisolar_feedback';
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      list.push({ at: new Date().toISOString(), text: text.trim() });
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch { /* ignore */ }
    setSent(true);
    setText('');
  };
  return (
    <div className="p-4 lg:p-6 max-w-xl">
      <h2 className="text-lg font-semibold">Help us improve</h2>
      <p className="mt-2 text-sm text-muted-foreground leading-body">
        What would you like to see next with AISolar? Tell us your
        recommendations. Help us build more agents — and give you back even
        more time while they look after your clients and help build your company.
      </p>
      {sent ? (
        <div className="mt-5 rounded-panel border border-doc-deposit/30 bg-doc-deposit/5 p-4 text-sm">
          <p className="font-medium text-doc-deposit">Thank you — we read every one.</p>
          <button className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4" onClick={() => setSent(false)}>
            Send another
          </button>
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="e.g. an agent that rebooks cancelled surveys automatically…"
            className="mt-5 w-full min-h-28 rounded-control border border-input bg-background px-3 py-2 text-sm leading-body placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
          />
          <Button className="mt-3" onClick={submit} disabled={!text.trim()}>Send recommendation</Button>
        </>
      )}
    </div>
  );
}
