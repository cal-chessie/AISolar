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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
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
  Search, Calculator, Shield, Landmark, UserPlus,
} from 'lucide-react';
import { generateDummyLeads, computePipelineStats, type DummyLead } from '@/lib/dummyData';
import { PIPELINE_STAGES, getStage } from '@/lib/leadIntake';
import { agentFor, agentsInvolved } from '@/lib/agentAttribution';
import { PipelineBar } from '@/components/layout/PipelineBar';
import InsightsView from '@/components/InsightsView';
import { AppShell, type ShellNavItem } from '@/components/layout/AppShell';
import { brand } from '@/config/brand';
import { useTenantBrand } from '@/lib/tenantBrand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import NotificationsBell from '@/components/notifications/NotificationsBell';
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
const FinanceWindow = lazy(() => import('./owner/FinanceWindow'));

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type SidebarView = 'financials' | 'overview' | 'calendar' | 'consultants' | 'installers' | 'clients' | 'feedback' | 'products' | 'settings' | 'agents' | 'analytics' | 'lead_detail' | 'seai' | 'estimates';

/* Ordered as the owner thinks: run the day -> sell -> the team -> the money
   -> compliance -> the machine -> config. Each domain carries its family
   tint on the ICON only — a little lift and no more. */
const SIDEBAR_ITEMS: Array<{ id: SidebarView; label: string; icon: typeof Home; tint?: string; badge?: string }> = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'estimates', label: 'Estimates', icon: Calculator, tint: 'text-doc-proposal' },
  { id: 'clients', label: 'Clients', icon: UserCircle },
  { id: 'consultants', label: 'Consultants', icon: Users },
  { id: 'installers', label: 'Installers', icon: Wrench },
  { id: 'financials', label: 'Financials', icon: Landmark, tint: 'text-doc-deposit' },
  { id: 'seai', label: 'SEAI & Compliance', icon: Award, tint: 'text-doc-contract' },
  { id: 'agents', label: 'Agents', icon: Bot, tint: 'text-tech' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'feedback', label: 'Help us improve', icon: Star },
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
      icon: <it.icon className={it.tint} />,
      onSelect: () => selectView(it.id),
      badge: it.id === 'agents' && data.agentFailures ? data.agentFailures : undefined,
      primary: ['overview', 'calendar', 'agents', 'analytics', 'financials'].includes(it.id),
    })),
    // Cal: the two POV-switch rows were redundant with the Consultants /
    // Installers tabs — the jump now lives inside those views instead.
  ];

  return (
    <AppShell
      persona="owner"
      brandName={tb.name}
      personaLabel="Owner Cockpit"
      nav={shellNav}
      activeId={activeView}
      title={SIDEBAR_ITEMS.find(it => it.id === activeView)?.label ?? 'Overview'}
      headerExtra={<><NotificationsBell role="owner" /><DarkModeToggle /></>}
    >
        <Suspense fallback={<CockpitSkeleton />}>
          {activeView === 'overview' && (
            <OverviewView data={data} leads={leads} expandedStage={expandedStage} setExpandedStage={setExpandedStage} navigate={navigate} setSelectedLead={setSelectedLead} setActiveView={setActiveView} />
          )}
          {activeView === 'calendar' && <RealCalendar onOpenClient={(id) => { const l = leads.find(x => x.id === id); if (l) { setSelectedLead(l); setActiveView('lead_detail'); } }} />}
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
          {activeView === 'analytics' && <Suspense fallback={<CockpitSkeleton />}><CeoWindow onOpenFinancials={() => setActiveView('financials')} /></Suspense>}
          {activeView === 'financials' && <Suspense fallback={<CockpitSkeleton />}><FinanceWindow /></Suspense>}
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
                <span className="bg-doc-proposal-subtle0 text-white text-[11px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{staleLeadsCount}</span>
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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const hotCount = leads.filter((l: DummyLead) => l.score > 80).length;
  const jobCount = leads.filter((l: DummyLead) => l.assignment).length;
  const needsYou = data.staleLeads.length + (data.agentFailures > 0 ? 1 : 0);
  const maxStage = Math.max(1, ...data.stageCounts.map((s: any) => s.count));

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-6xl">
      {/* The morning read — one line that says how the company is doing */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}
          <span className="text-muted-foreground font-normal"> · {new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-semibold text-doc-deposit tabular-nums">{eur(data.revenueClosed)}</span> collected ·{' '}
          <span className="font-medium text-foreground tabular-nums">{eur(data.stats.totalValue)}</span> in the pipeline
          {needsYou > 0 && <> · <span className="font-medium text-pop">{needsYou} {needsYou === 1 ? 'thing needs' : 'things need'} you</span></>}
        </p>
      </div>

      {/* Vital signs — family cards, one accent each, nothing fake */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => setActiveView('financials')} className="text-left rounded-[16px] bg-card shadow-card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="label-micro">Revenue</span>
            <TrendingUp className="size-3.5 text-doc-deposit" />
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-doc-deposit">{eur(data.revenueClosed)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{eur(data.revenuePending)} pending</div>
        </button>

        <button onClick={() => setExpandedStage(null)} className="text-left rounded-[16px] bg-card shadow-card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="label-micro">Pipeline</span>
            <Activity className="size-3.5 text-muted-foreground" />
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums">{eur(data.stats.totalValue)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{data.stats.activeLeads} active · {hotCount} hot</div>
          {/* real stage distribution, widths from real counts */}
          <div className="flex gap-0.5 mt-2 h-1.5">
            {data.stageCounts.slice(0, 8).map((s: any) => (
              <div key={s.id} className="rounded-full bg-foreground/70" style={{ flexGrow: Math.max(s.count, 0.15), opacity: s.count ? 1 : 0.15 }} />
            ))}
          </div>
        </button>

        <button onClick={() => navigate('/installer')} className="text-left rounded-[16px] bg-card shadow-card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="label-micro">Jobs on site</span>
            <Wrench className="size-3.5 text-tech" />
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-tech">{jobCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {leads.filter((l: DummyLead) => ['survey_scheduled','survey_complete'].includes(l.workflow_stage)).length} surveys due
          </div>
        </button>

        <button onClick={() => setActiveView('agents')} className="text-left rounded-[16px] bg-card shadow-card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="label-micro">Agents</span>
            <Bot className={`size-3.5 ${data.agentFailures > 0 ? 'text-pop' : 'text-doc-deposit'}`} />
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums">{data.totalAgentRuns}<span className="text-sm font-normal text-muted-foreground"> runs/24h</span></div>
          <div className={`text-xs mt-0.5 ${data.agentFailures > 0 ? 'text-pop font-medium' : 'text-muted-foreground'}`}>
            {data.agentFailures > 0 ? `${data.agentFailures} failed — look` : 'all healthy'}
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${data.agentFailures > 0 ? 'bg-pop' : 'bg-doc-deposit'}`} style={{ width: `${data.agentHealth}%` }} />
          </div>
        </button>
      </div>

      {/* Pipeline — the 6-phase bar in a family card */}
      <div className="rounded-[16px] bg-card shadow-card overflow-hidden">
        <PipelineBar
          counts={Object.fromEntries(data.stageCounts.map((s: any) => [s.id, s.count]))}
          onStageClick={(id) => setExpandedStage(expandedStage === id ? null : id)}
          onGroupToggle={() => setExpandedStage(null)}
          className="border-0"
        />
        {expandedStage && (
          <div className="mx-4 mb-4 pt-3 border-t border-border">
            <div className="label-micro mb-2">
              {getStage(expandedStage).label} — {leads.filter((l: DummyLead) => l.workflow_stage === expandedStage).length} leads
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {leads.filter((l: DummyLead) => l.workflow_stage === expandedStage).map((lead: DummyLead) => (
                <button key={lead.id} className="text-left p-3 rounded-[12px] bg-muted/30 hover:bg-muted/60 transition-colors" onClick={() => { setSelectedLead(lead); setActiveView('lead_detail'); }}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-[11px]">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium truncate">{lead.name}</span>
                        {lead.score > 80 && <Flame className="h-3 w-3 text-pop" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{lead.address.split(',').slice(-1)[0]?.trim()}</div>
                    </div>
                    {lead.proposal && <span className="text-xs font-semibold tabular-nums">{eur(lead.proposal.net_cost)}</span>}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
              {leads.filter((l: DummyLead) => l.workflow_stage === expandedStage).length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No leads at this stage.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Today beside what needs you */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="rounded-[16px] bg-card shadow-card p-4">
          <h3 className="label-micro mb-3 flex items-center gap-1.5"><Calendar className="size-3.5" /> Today's schedule</h3>
          <div className="space-y-1">
            {data.todayEvents.map((event: any, i: number) => {
              const target = event.leadId
                ? (event.type === 'install' ? `/job/${event.leadId}` : `/lead-flow/${event.leadId}`)
                : (event.type === 'install' ? '/job' : '/lead-flow');
              return (
                <button key={i} className="w-full flex items-center gap-2.5 p-2 rounded-[10px] hover:bg-muted/50 transition-colors text-left" onClick={() => navigate(target)}>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground w-11 shrink-0">{event.time}</span>
                  <span className={`p-1.5 rounded-[8px] shrink-0 ${event.type === 'install' ? 'bg-tech-subtle' : 'bg-muted'}`}>
                    {event.type === 'install' ? <Wrench className="size-3 text-tech" /> : <Phone className="size-3 text-foreground" />}
                  </span>
                  <span className="text-sm flex-1 truncate">{event.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{event.assignee}</span>
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                </button>
              );
            })}
            {data.todayEvents.length === 0 && <p className="text-sm text-muted-foreground p-2">Nothing booked today.</p>}
          </div>
        </div>

        <div className="rounded-[16px] bg-card shadow-card p-4">
          <h3 className="label-micro mb-3 flex items-center gap-1.5"><AlertTriangle className="size-3.5" /> Needs you</h3>
          <div className="space-y-2">
            {data.staleLeads.length > 0 && <AlertItem icon={Clock} color="pending" title={`${data.staleLeads.length} stale leads`} desc="5+ days no contact" cta="Review" onClick={() => navigate('/consultant')} />}
            {data.agentFailures > 0 && <AlertItem icon={Bot} color="red" title="Payment Reminder Agent failed" desc="Postmark rate limit" cta="View" onClick={() => setActiveView('agents')} />}
            <AlertItem icon={TrendingUp} color="blue" title={`Conversion: ${data.conversionRate}%`} desc={data.bottleneck ? `Bottleneck at ${getStage(data.bottleneck.stage).label}` : 'Healthy'} cta="Analytics" onClick={() => setActiveView('analytics')} />
          </div>
        </div>
      </div>

      {/* Live activity */}
      <div className="rounded-[16px] bg-card shadow-card p-4">
        <h3 className="label-micro mb-3 flex items-center gap-1.5"><Activity className="size-3.5" /> Live activity</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.activity.map((item: any, i: number) => {
            const isAgent = item.actor === 'agent';
            const isCustomer = item.actor === 'customer';
            return (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 mt-0.5 w-11">{new Date(item.timestamp).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className={`p-1 rounded-[6px] shrink-0 ${isAgent ? 'bg-tech-subtle' : 'bg-muted'}`}>
                  {isAgent ? <Bot className="size-3 text-tech" /> : isCustomer ? <UserCircle className="size-3 text-foreground" /> : <Users className="size-3 text-foreground" />}
                </span>
                <div className="flex-1 min-w-0 leading-snug"><span className="font-medium">{item.leadName}</span><span className="text-muted-foreground"> — {item.summary}</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============= CONSULTANTS VIEW =============
/* Cal: "we need to be able to add a consultant and installers in the both
   tabs." One dialog for both — name + email invites them; role decides the
   extra field. Local state in demo; role-gated invite email at launch. */
function AddPersonDialog({ open, onOpenChange, role, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  role: 'consultant' | 'installer';
  onAdd: (p: { name: string; email: string; phone: string; extra: string }) => void;
}) {
  const [p, setP] = useState({ name: '', email: '', phone: '', extra: '' });
  useEffect(() => { if (open) setP({ name: '', email: '', phone: '', extra: '' }); }, [open]);
  const valid = p.name.trim().length > 1 && p.email.includes('@');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[16px]">
        <DialogHeader>
          <DialogTitle>Add {role === 'consultant' ? 'a consultant' : 'an installer'}</DialogTitle>
          <DialogDescription>They get a sign-in invite by email — {role === 'consultant' ? 'consultant' : 'installer'} access only, nothing else.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="ap-name">Full name *</Label>
            <Input id="ap-name" value={p.name} onChange={e => setP(s => ({ ...s, name: e.target.value }))} placeholder={role === 'consultant' ? 'Emma Ryan' : 'Mike Doyle'} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ap-email">Email *</Label>
              <Input id="ap-email" type="email" value={p.email} onChange={e => setP(s => ({ ...s, email: e.target.value }))} placeholder="emma@yourcompany.ie" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ap-phone">Phone</Label>
              <Input id="ap-phone" type="tel" value={p.phone} onChange={e => setP(s => ({ ...s, phone: e.target.value }))} placeholder="+353 87 123 4567" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="ap-extra">{role === 'consultant' ? 'Patch / territory' : 'Skills'}</Label>
            <Input id="ap-extra" value={p.extra} onChange={e => setP(s => ({ ...s, extra: e.target.value }))}
              placeholder={role === 'consultant' ? 'Dublin South' : 'roof-mount, battery'} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid} onClick={() => { onAdd(p); onOpenChange(false); }}>Send invite & add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConsultantsView({ consultants, navigate }: { consultants: any[]; navigate: (path: string) => void }) {
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [added, setAdded] = useState<any[]>([]);
  const all = [...consultants, ...added];

  if (selectedConsultant) {
    const consultant = all.find(c => c.name === selectedConsultant);
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
      <AddPersonDialog open={addOpen} onOpenChange={setAddOpen} role="consultant"
        onAdd={p => { setAdded(a => [...a, { name: p.name, email: p.email, phone: p.phone, territory: p.extra, activeLeads: 0, hotLeads: 0, pipelineValue: 0, leads: [], invited: true }]); toast.success(`Invite sent to ${p.email}`); }} />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Click a consultant to see their customers</span>
        <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" onClick={() => navigate('/consultant')}>
          <Users className="h-3.5 w-3.5 mr-1" /> Open consultant view
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1" /> Add consultant
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {all.map(c => (
          <Card key={c.name} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelectedConsultant(c.name)}>
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="h-12 w-12"><AvatarFallback>{c.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="font-bold flex items-center gap-2">{c.name}
                  {c.invited && <span className="text-2xs font-medium rounded-full bg-tech-subtle text-tech px-2 py-0.5">Invite sent</span>}
                </div>
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
  const [addOpen, setAddOpen] = useState(false);
  const [added, setAdded] = useState<any[]>([]);
  const all = [...installers, ...added];

  if (selectedInstaller) {
    const installer = all.find(i => i.name === selectedInstaller);
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
      <AddPersonDialog open={addOpen} onOpenChange={setAddOpen} role="installer"
        onAdd={p => { setAdded(a => [...a, { name: p.name, email: p.email, phone: p.phone, skills: p.extra.split(',').map(s => s.trim()).filter(Boolean), activeJobs: 0, completedJobs: 0, jobs: [], invited: true }]); toast.success(`Invite sent to ${p.email}`); }} />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Click an installer to see their jobs</span>
        <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" onClick={() => navigate('/installer')}>
          <Wrench className="h-3.5 w-3.5 mr-1" /> Open installer view
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1" /> Add installer
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {all.map(i => (
          <Card key={i.name} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelectedInstaller(i.name)}>
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="h-12 w-12"><AvatarFallback>{i.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="font-bold flex items-center gap-2">{i.name}
                  {i.invited && <span className="text-2xs font-medium rounded-full bg-tech-subtle text-tech px-2 py-0.5">Invite sent</span>}
                </div>
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
        <div className="rounded-[16px] bg-card shadow-card p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16"><AvatarFallback className="text-lg">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{lead.name}</h1>
                  <Badge className={`bg-primary text-white text-[11px]`}>{stage.label}</Badge>
                  {lead.score > 80 && <Badge className="bg-pop text-white text-[11px]"><Flame className="h-2 w-2 mr-0.5" /> Hot</Badge>}
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
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {lead.proposal ? (
            <>
              <StatBox label="System" value={`${lead.proposal.system_size_kw}kWp`} sub={`${lead.proposal.panel_count} panels`} color="pending" icon={Zap} />
              <StatBox label="Net cost" value={eur(lead.proposal.net_cost)} sub={`Grant: ${eur(lead.proposal.seai_grant)}`} color="emerald" icon={DollarSign} />
              <StatBox label="Annual savings" value={eur(lead.proposal.annual_savings)} sub={`${lead.proposal.payback_years}yr payback`} color="blue" icon={TrendingUp} />
              <StatBox label="Touchpoints" value={String(lead.touchpoints.length)} sub={`Last: ${new Date(lead.touchpoints[lead.touchpoints.length-1]?.timestamp || Date.now()).toLocaleDateString('en-IE')}`} color="violet" icon={MessageSquare} />
            </>
          ) : (
            <>
              <StatBox label="Monthly bill" value={`€${lead.monthly_bill}`} sub={`${lead.annual_kwh?.toLocaleString()} kWh/yr`} color="blue" icon={FileText} />
              <StatBox label="Est. system" value={`${lead.intake.estimated_system_size_kw}kWp`} sub="from bill" color="pending" icon={Zap} />
              <StatBox label="Est. savings" value={eur(lead.intake.estimated_annual_savings || 0)} sub="per year" color="emerald" icon={TrendingUp} />
              <StatBox label="Touchpoints" value={String(lead.touchpoints.length)} sub="communications" color="violet" icon={MessageSquare} />
            </>
          )}
        </div>

        {/* SEAI & Compliance — per customer (Cal: "wheres the SEAI & Compliance
            window for every customer?"). Status derives from the stage; the
            grants clerk TRACKS, never submits. */}
        <div className="rounded-[16px] bg-card shadow-card p-4">
          <h3 className="label-micro mb-3 flex items-center gap-1.5"><Award className="size-3.5 text-doc-contract" /> SEAI & Compliance</h3>
          <div className="grid sm:grid-cols-3 gap-2">
            {[
              { org: 'SEAI', what: 'Solar Electricity Grant', done: lead.workflow_stage === 'completed', busy: ['approved','deposit_paid','install_scheduled','installing','installed','final_paid'].includes(lead.workflow_stage), detail: lead.proposal ? eur(lead.proposal.seai_grant) : 'sized at proposal' },
              { org: 'ESB', what: 'NC6 microgen export', done: ['installed','final_paid','completed'].includes(lead.workflow_stage), busy: ['install_scheduled','installing'].includes(lead.workflow_stage), detail: 'export tariff €0.14/kWh' },
              { org: 'RECI', what: 'Electrical sign-off', done: ['installed','final_paid','completed'].includes(lead.workflow_stage), busy: lead.workflow_stage === 'installing', detail: 'required for commissioning' },
            ].map(c => (
              <div key={c.org} className="p-3 rounded-[10px] bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{c.org}</span>
                  <span className={`ml-auto text-2xs rounded-full px-2 py-0.5 font-medium ${c.done ? 'bg-doc-deposit/10 text-doc-deposit' : c.busy ? 'bg-tech-subtle text-tech' : 'bg-muted text-muted-foreground'}`}>
                    {c.done ? 'Done' : c.busy ? 'Tracking' : 'Not started'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{c.what}</div>
                <div className="text-2xs text-muted-foreground mt-0.5">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Touchpoint timeline */}
        <div className="rounded-[16px] bg-card shadow-card p-4">
            <h3 className="label-micro mb-2">Communication history</h3>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {agentsInvolved(lead.touchpoints).map(name => (
                <span key={name} className="inline-flex items-center gap-1 text-2xs font-medium rounded-full bg-tech-subtle text-tech px-2 py-0.5">
                  <Bot className="size-2.5" /> {name}
                </span>
              ))}
              {lead.assigned_consultant && (
                <span className="inline-flex items-center gap-1 text-2xs font-medium rounded-full bg-muted text-foreground px-2 py-0.5">
                  <Users className="size-2.5" /> {lead.assigned_consultant}
                </span>
              )}
              {lead.assignment?.installer_name && (
                <span className="inline-flex items-center gap-1 text-2xs font-medium rounded-full bg-muted text-foreground px-2 py-0.5">
                  <Wrench className="size-2.5" /> {lead.assignment.installer_name}
                </span>
              )}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {lead.touchpoints.map((tp, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-[8px] bg-muted/30 text-xs">
                  <Badge variant="outline" className="text-[11px] flex-shrink-0">{tp.channel}</Badge>
                  <span className="text-muted-foreground flex-shrink-0 w-16 tabular-nums">{new Date(tp.timestamp).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}</span>
                  <span className="flex-1 truncate">{tp.summary}</span>
                  {tp.actor === 'agent' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-tech flex-shrink-0"><Bot className="size-3" /> {agentFor(tp.summary ?? '')}</span>
                  ) : (() => { const a = actorName(tp.actor, lead); return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground flex-shrink-0">
                      {a.icon === 'consultant' && <Users className="size-3" />}
                      {a.icon === 'installer' && <Wrench className="size-3" />}
                      {a.icon === 'customer' && <UserCircle className="size-3" />}
                      {a.name}
                    </span>
                  ); })()}
                </div>
              ))}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{leads.length} clients</span>
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
              <div key={lead.id} className="flex items-center gap-3 p-2.5 rounded-[10px] cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setSelectedClient(lead)}>
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{lead.name}</span>
                    {lead.score > 80 && <Flame className="h-2.5 w-2.5 text-pop" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{lead.address}</div>
                </div>
                <Badge variant="outline" className="text-[11px]">{stage.label}</Badge>
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

/** Who a touchpoint's human actor actually is, for the owner's log. */
function actorName(actor: string | undefined, lead: DummyLead): { name: string; icon: 'consultant' | 'installer' | 'customer' | null } {
  if (actor === 'consultant') return { name: lead.assigned_consultant || 'Consultant', icon: 'consultant' };
  if (actor === 'installer') return { name: lead.assignment?.installer_name || 'Installer', icon: 'installer' };
  if (actor === 'customer') return { name: lead.name.split(' ')[0], icon: 'customer' };
  return { name: actor ?? '—', icon: null };
}

// ============= LEAD DETAIL (owner walks through pipeline without blocks) =============
function LeadDetailView({ lead, onBack, navigate }: { lead: DummyLead; onBack: () => void; navigate: (path: string) => void }) {
  const [tab, setTab] = useState<'estimate' | 'proposal' | 'timeline'>('estimate');

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
        {/* Compliance tab removed — it rendered a full duplicate ProposalView;
            the papertrail lives in Proposal (one home per concept) */}
        {[
          { id: 'estimate' as const, label: 'Estimate', icon: FileText },
          { id: 'proposal' as const, label: 'Proposal', icon: FileText },
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
        {tab === 'timeline' && (
          <div className="rounded-[16px] bg-card shadow-card p-4">
              {/* Cal: ALL agents involved + ALL touchpoints — the complete log */}
              {/* The full crew on this client — agents AND the humans (Cal) */}
              <div className="flex flex-wrap items-center gap-1.5 pb-3 mb-3 border-b border-border">
                <span className="label-micro mr-1">Who's on this client</span>
                {agentsInvolved(lead.touchpoints).map(name => (
                  <span key={name} className="inline-flex items-center gap-1 text-2xs font-medium rounded-full bg-tech-subtle text-tech px-2 py-0.5">
                    <Bot className="size-2.5" /> {name}
                  </span>
                ))}
                {lead.assigned_consultant && (
                  <span className="inline-flex items-center gap-1 text-2xs font-medium rounded-full bg-muted text-foreground px-2 py-0.5">
                    <Users className="size-2.5" /> {lead.assigned_consultant}
                  </span>
                )}
                {lead.assignment?.installer_name && (
                  <span className="inline-flex items-center gap-1 text-2xs font-medium rounded-full bg-muted text-foreground px-2 py-0.5">
                    <Wrench className="size-2.5" /> {lead.assignment.installer_name}
                  </span>
                )}
                <span className="ml-auto text-2xs text-muted-foreground tabular-nums">{lead.touchpoints.length} touchpoint{lead.touchpoints.length === 1 ? '' : 's'} · {lead.touchpoints.filter(t => t.actor === 'agent').length} by agents</span>
              </div>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {lead.touchpoints.map((tp, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-[8px] bg-muted/30 text-xs">
                    <Badge variant="outline" className="text-[11px] flex-shrink-0">{tp.channel}</Badge>
                    <span className="text-muted-foreground flex-shrink-0 w-20 tabular-nums">{new Date(tp.timestamp).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}</span>
                    <span className="flex-1 truncate">{tp.summary}</span>
                    {tp.actor === 'agent' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-tech flex-shrink-0"><Bot className="size-3" /> {agentFor(tp.summary ?? '')}</span>
                    ) : (() => { const a = actorName(tp.actor, lead); return (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground flex-shrink-0">
                        {a.icon === 'consultant' && <Users className="size-3" />}
                        {a.icon === 'installer' && <Wrench className="size-3" />}
                        {a.icon === 'customer' && <UserCircle className="size-3" />}
                        {a.name}
                      </span>
                    ); })()}
                  </div>
                ))}
              </div>
          </div>
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
