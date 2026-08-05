/**
 * Consultant Cockpit V5 — logical, with REAL chat.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │ Header: logo + Owner/Installer + dark mode   │
 *   │ 11 header tabs (scrollable)                   │
 *   ├──────────────┬──────────────────────────────┤
 *   │ Lead list     │ Chat thread (real messages)  │
 *   │ (searchable)  │ + slide-out estimate/proposal│
 *   │               │ Reply box at bottom          │
 *   └──────────────┴──────────────────────────────┘
 *
 * The Chats tab IS the conversation view — not a lead list.
 * Clicking any lead in any tab opens the chat thread.
 */

import { useState, useMemo, lazy, Suspense, useRef, useEffect } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { AisalesWordmark } from "@/components/brand/AiosMark";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { notify } from '@/lib/notify';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardListSkeleton } from '@/components/ui/SuspenseFallbacks';
import { staggerContainer, listItemFade, slideInRight } from '@/lib/motionPresets';
import { useIsMobile } from '@/hooks/use-mobile';
import { Progress } from '@/components/ui/progress';
import {
  Users, MessageSquare, Calculator, Camera, FileText, Wrench,
  Calendar, Clock, Package, FolderOpen, BarChart3, Search,
  Phone, Mail, ArrowRight, ChevronRight, Flame, Star, Zap,
  TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Bot,
  Building2, Sun, MapPin, Send, User, Sparkles, X, Award, CalendarClock, UserPlus, Pencil } from 'lucide-react';
import NotificationsBell from '@/components/notifications/NotificationsBell';
import LeadFormDialog, { type LeadFormValues } from '@/components/leads/LeadFormDialog';
import { type DummyLead } from '@/lib/dummyData';
import { useLeads } from '@/lib/realLeads';
import { createLead, updateLead, advanceLeadStage as persistLeadStage, addTouchpoint } from '@/lib/leadWrites';
import DayRoute from '@/components/field/DayRoute';
import { getStage, PIPELINE_STAGES, STAGE_GROUPS, calculateSystemEstimate } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { useTenantBrand } from '@/lib/tenantBrand';
import { AppShell, type ShellNavItem } from '@/components/layout/AppShell';
import ConsultantToday from '@/components/consultant/ConsultantToday';
import ConsultantInsights from '@/components/consultant/ConsultantInsights';
import { TONE, PHASE_TONE } from '@/components/consultant/cockpitUi';
import EngagementBadge from '@/components/consultant/EngagementBadge';
import InsightsView from '@/components/InsightsView';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { buildConversation, generateAIResponse, summarizeConversation, type ChatMessage } from '@/lib/conversation';
import { triageInbound, triageLabel } from '@/lib/inboxTriage';
import MessageBubble from '@/components/shared/MessageBubble';

// Static class strings so Tailwind's purge keeps them (no runtime interpolation).
const TRIAGE_TAG: Record<string, string> = {
  tech: 'bg-tech/10 text-tech',
  pop: 'bg-pop/10 text-pop',
  'doc-proposal': 'bg-doc-proposal/10 text-doc-proposal',
  'doc-deposit': 'bg-doc-deposit/10 text-doc-deposit',
  muted: 'bg-muted text-muted-foreground',
};

const EstimateView = lazyWithRetry(() => import('./EstimateView'));
const ProposalView = lazyWithRetry(() => import('./ProposalView'));
// #3: the consultant calendar must be the SAME as the owner's — the owner uses
// RealCalendar, so the consultant does too (one calendar, no divergence).
const RealCalendar = lazyWithRetry(() => import('./RealCalendar'));
const ProfessionalProducts = lazyWithRetry(() => import('./ProfessionalProducts'));

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/**
 * Phase 3 refactor: collapsed 11 tabs → 6.
 *
 *   Inbox     — merged Leads + Chats + Follow-ups, with stage filter chips
 *   Pipeline  — Kanban by stage (drag-to-advance)
 *   Calendar  — full month/week/day
 *   Products  — product catalogue
 *   Documents — real document manager (proposals/contracts/invoices as rows)
 *   Insights  — stripped-down analytics (full version in Owner Cockpit)
 *
 * The old Estimates/Surveys/Proposals/Installs/Follow-ups tabs were all the
 * same surface (lead list) with different `leads.filter(...)` predicates.
 * They're now filter chips inside Inbox.
 */
type TabId = 'today' | 'inbox' | 'pipeline' | 'calendar' | 'route' | 'products' | 'documents' | 'insights';

/* Family tint on the ICON only — same vocabulary as the owner rail, so the
   three cockpits read as one product (Cal, 3 Aug: "I need the colour family on
   the side bar icons on the consultant and installer"). Tints map to MEANING:
   tech=work/day · pop=calendar/products · doc-proposal=sell/analyse ·
   doc-deposit=people/money · doc-contract=field/paperwork. */
const TABS: Array<{ id: TabId; label: string; icon: typeof Users; tint: string }> = [
  { id: 'today', label: 'Today', icon: CalendarClock, tint: 'text-tech' },
  { id: 'inbox', label: 'Inbox', icon: MessageSquare, tint: 'text-doc-deposit' },
  { id: 'pipeline', label: 'Pipeline', icon: TrendingUp, tint: 'text-doc-proposal' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, tint: 'text-pop' },
  { id: 'route', label: 'Route', icon: MapPin, tint: 'text-doc-contract' },
  { id: 'products', label: 'Products', icon: Package, tint: 'text-pop' },
  { id: 'documents', label: 'Documents', icon: FolderOpen, tint: 'text-doc-contract' },
  { id: 'insights', label: 'Insights', icon: BarChart3, tint: 'text-doc-proposal' },
];

/** Stage filter chips shown inside the Inbox tab. */
type InboxFilter = 'all' | 'hot' | 'stale' | 'survey' | 'proposal' | 'install';

const INBOX_FILTERS: Array<{ id: InboxFilter; label: string; emoji?: string }> = [
  { id: 'all', label: 'All' },
  { id: 'hot', label: 'Hot', emoji: '🔥' },
  { id: 'stale', label: 'Stale (5+ days)' },
  { id: 'survey', label: 'Survey' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'install', label: 'Install' },
];

export default function ConsultantCockpitV5() {
  const tb = useTenantBrand();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { leads, setLeads, refetch } = useLeads();
  // Add/edit lead (Cal: "cant we add a lead too right? and edit a lead?")
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<DummyLead | null>(null);
  const saveLeadForm = async (v: LeadFormValues) => {
    const patch = { name: v.name, email: v.email, phone: v.phone, address: v.address, eircode: v.eircode, mprn: v.mprn, monthly_bill: v.monthly_bill, annual_kwh: v.annual_kwh };
    if (editingLead) {
      setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, ...patch } : l));
      setSelectedLead(prev => prev?.id === editingLead.id ? { ...prev, ...patch } : prev);
      try {
        await updateLead(editingLead.id, patch);
        toast.success(`${v.name.split(' ')[0]}'s details updated`);
      } catch (e) {
        toast.error(`Couldn't save changes — ${(e as Error).message}`);
        refetch();
      }
    } else {
      try {
        await createLead(patch);
        await refetch();
        toast.success(v.billFile
          ? `${v.name.split(' ')[0]} added — bill captured, extraction queued`
          : `${v.name.split(' ')[0]} added to the pipeline`);
      } catch (e) {
        toast.error(`Couldn't add ${v.name.split(' ')[0]} — ${(e as Error).message}`);
      }
    }
  };
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<DummyLead | null>(null);
  const [slideOutView, setSlideOutView] = useState<'estimate' | 'proposal' | null>(null);
  const [replyText, setReplyText] = useState('');
  const [customerTyping, setCustomerTyping] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string[] | null>(null);
  // On mobile, the lead list is a drawer (closed by default). On desktop, always visible.
  const [leadListOpen, setLeadListOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => selectedLead ? buildConversation(selectedLead) : [], [selectedLead]);

  // Stale + hot lead detection (used by Inbox filters + auto-select)
  const staleLeads = useMemo(() => leads.filter(l => {
    const last = l.touchpoints[l.touchpoints.length - 1];
    if (!last) return false;
    return (Date.now() - new Date(last.timestamp).getTime()) > 5 * 86400000
      && !['completed', 'final_paid', 'installed', 'installing'].includes(l.workflow_stage);
  }), [leads]);
  const hotLeads = useMemo(() => leads.filter(l => l.score > 80), [leads]);

  // Inbox filter logic — replaces the old Estimates/Surveys/Proposals/Installs/Follow-ups tabs
  const inboxLeads = useMemo(() => {
    let pool = leads;
    switch (inboxFilter) {
      case 'hot':
        pool = hotLeads;
        break;
      case 'stale':
        pool = staleLeads;
        break;
      case 'survey':
        pool = leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage));
        break;
      case 'proposal':
        pool = leads.filter(l => ['proposal_drafted', 'proposal_sent'].includes(l.workflow_stage));
        break;
      case 'install':
        pool = leads.filter(l => ['install_scheduled', 'installing', 'installed'].includes(l.workflow_stage));
        break;
      default:
        pool = leads;
    }
    if (!search) return pool;
    const q = search.toLowerCase();
    return pool.filter(l => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.address.toLowerCase().includes(q) || l.mprn.includes(q));
  }, [leads, inboxFilter, search, hotLeads, staleLeads]);

  const filteredLeads = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(l => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.address.toLowerCase().includes(q) || l.mprn.includes(q));
  }, [leads, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, customerTyping]);

  // Auto-select first lead on Inbox tab — hot leads first, else first lead
  useEffect(() => {
    if (activeTab === 'inbox' && !selectedLead && inboxLeads.length > 0) {
      setSelectedLead(inboxLeads[0]);
    }
  }, [activeTab, inboxLeads]);

  // Reset summary when switching leads
  useEffect(() => {
    setSummary(null);
  }, [selectedLead]);

  // Escape key closes slide-out panel OR mobile lead-list drawer
  useEffect(() => {
    if (!slideOutView && !leadListOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSlideOutView(null);
        setLeadListOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slideOutView, leadListOpen]);

  /** Select a lead and close the mobile drawer. */
  const selectLead = (lead: DummyLead) => {
    setSelectedLead(lead);
    if (isMobile) setLeadListOpen(false);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedLead) return;
    const message = replyText;
    const newTouchpoint = {
      id: `tp_${Date.now()}`,
      lead_id: selectedLead.id,
      stage: selectedLead.workflow_stage,
      channel: 'portal' as const,
      direction: 'outbound' as const,
      summary: message,
      timestamp: new Date().toISOString(),
      actor: 'consultant' as const,
    };
    const updatedLead: DummyLead = {
      ...selectedLead,
      touchpoints: [...selectedLead.touchpoints, newTouchpoint],
    };
    setLeads((prev: DummyLead[]) => prev.map(l =>
      l.id === selectedLead.id ? updatedLead : l
    ));
    setSelectedLead(updatedLead);
    setReplyText('');
    // Persist the outbound touchpoint. No fake customer auto-reply — a real
    // reply comes from the customer via the portal, never simulated.
    addTouchpoint(selectedLead.id, message).catch((e) => {
      toast.error(`Reply didn't save — ${(e as Error).message}`);
    });
  };

  /** Ask AI to summarize the conversation — Phase 3 feature. */
  const handleSummarize = () => {
    if (!selectedLead) return;
    setSummarizing(true);
    setSummary(null);
    // Phase 4 will replace this with a real LLM call via OpenRouter.
    setTimeout(() => {
      setSummary(summarizeConversation(messages, selectedLead));
      setSummarizing(false);
    }, 900);
  };

  /** Move a lead to the next pipeline stage (used by Kanban drag-to-advance). */
  const advanceLeadStage = (leadId: string, targetStage: string) => {
    const moved = leads.find(l => l.id === leadId);
    setLeads(prev => prev.map(l =>
      l.id === leadId ? { ...l, workflow_stage: targetStage } : l
    ));
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, workflow_stage: targetStage } : prev);
    }
    persistLeadStage(leadId, targetStage).catch((e) => {
      toast.error(`Stage change didn't save — ${(e as Error).message}`);
      refetch();
    });
    // BOTH-ENDS LAW (5 Aug audit: stage moves were silent — the single most
    // common event in the pipeline notified nobody). Bell for the team; the
    // customer email rides send-notification's built-in stage_change type.
    void notify({
      type: 'stage_change', leadId,
      title: `${moved?.name || 'Lead'} → ${getStage(targetStage).label}`,
      message: `Moved from ${moved ? getStage(moved.workflow_stage).label : '—'} to ${getStage(targetStage).label}.`,
      metadata: { from: moved?.workflow_stage, to: targetStage },
    });
    toast.success(`Moved to ${getStage(targetStage).label}`, {
      description: `${selectedLead?.name || 'Lead'} is now in the ${getStage(targetStage).label} stage.`,
    });
  };

  const isChatView = activeTab === 'inbox';

  // ── ONE app shell (Cal, 3 Aug: "headers aren't conforming — the heart") ──
  // The 8 tabs become shell nav; live counts ride as badges. Same frame as the
  // owner cockpit: cal.com sidebar, 48px header, bottom tabs on mobile.
  const badgeFor = (id: TabId): number | undefined => {
    if (id === 'inbox') return leads.length || undefined;
    if (id === 'pipeline') return leads.filter(l => !['completed', 'final_paid'].includes(l.workflow_stage)).length || undefined;
    if (id === 'documents') return leads.filter(l => l.proposal || l.contract || l.invoice).length || undefined;
    return undefined;
  };
  const shellNav: ShellNavItem[] = TABS.map(t => ({
    id: t.id,
    label: t.label,
    icon: <t.icon className={t.tint} />,
    onSelect: () => setActiveTab(t.id),
    badge: badgeFor(t.id),
    primary: ['today', 'inbox', 'pipeline', 'calendar'].includes(t.id),
  }));

  return (
    <AppShell
      persona="consultant"
      brandName={tb.name}
      personaLabel="Consultant"
      nav={shellNav}
      activeId={activeTab}
      title={TABS.find(t => t.id === activeTab)?.label ?? 'Today'}
      primaryAction={
        <Button size="sm" className="text-xs h-8" onClick={() => { setEditingLead(null); setLeadFormOpen(true); }}>
          <UserPlus className="h-3.5 w-3.5 mr-1" /> Add lead
        </Button>
      }
      headerExtra={<>
        <NotificationsBell role="consultant" />
        <Button variant="ghost" size="sm" className="p-2 h-8" title="Owner cockpit" aria-label="Switch to owner cockpit" onClick={() => navigate('/owner')}><Building2 className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="sm" className="p-2 h-8" title="Installer view" aria-label="Switch to installer view" onClick={() => navigate('/installer')}><Wrench className="h-3.5 w-3.5" /></Button>
        <DarkModeToggle />
      </>}
      flush
    >
      <LeadFormDialog open={leadFormOpen} onOpenChange={setLeadFormOpen} initial={editingLead} onSave={saveLeadForm} />

      {/* Main content */}
      {activeTab === 'today' ? (
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <ConsultantToday
            leads={leads}
            onOpenLead={(lead) => { selectLead(lead); setActiveTab('inbox'); }}
            onGoCalendar={() => setActiveTab('calendar')}
          />
        </div>
      ) : isChatView ? (
        /* Chat layout: lead list + conversation thread */
        <div className="flex-1 flex overflow-hidden">
          {/* ====== Lead list ======
              Desktop: inline w-72 lg:w-80 column
              Mobile: drawer overlay (toggled by leadListOpen) */}
          {isMobile ? (
            <AnimatePresence>
              {leadListOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setLeadListOpen(false)}
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                  />
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-background border-r flex flex-col lg:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Lead list"
                  >
                    <LeadListContent
                      search={search} setSearch={setSearch}
                      inboxFilter={inboxFilter} setInboxFilter={setInboxFilter}
                      inboxLeads={inboxLeads}
                      selectedLead={selectedLead}
                      onSelectLead={selectLead}
                      activeTab={activeTab}
                      hotLeadsCount={hotLeads.length}
                      staleLeadsCount={staleLeads.length}
                      leads={leads}
                      onClose={() => setLeadListOpen(false)}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          ) : (
            <div className="w-64 lg:w-80 flex-shrink-0 border-r hidden md:flex flex-col">
              <LeadListContent
                search={search} setSearch={setSearch}
                inboxFilter={inboxFilter} setInboxFilter={setInboxFilter}
                inboxLeads={inboxLeads}
                selectedLead={selectedLead}
                onSelectLead={selectLead}
                activeTab={activeTab}
                hotLeadsCount={hotLeads.length}
                staleLeadsCount={staleLeads.length}
                leads={leads}
              />
            </div>
          )}

          {/* Conversation thread (right) */}
          <div className="flex-1 flex flex-col">
            {!selectedLead ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-semibold text-muted-foreground">Select a lead to view conversation</h3>
                  <p className="text-xs text-muted-foreground mt-1">All emails, calls, AI chat, and agent actions in one thread.</p>
                  {isMobile && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 lg:hidden"
                      onClick={() => setLeadListOpen(true)}
                    >
                      <Users className="h-4 w-4 mr-2" /> Open lead list
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <div className="p-2.5 border-b flex items-center gap-2">
                  {/* Mobile: open lead list drawer */}
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 lg:hidden"
                      onClick={() => setLeadListOpen(true)}
                      aria-label="Open lead list"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  )}
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{selectedLead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{selectedLead.name}</span>
                      <EngagementBadge lead={selectedLead} compact />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{selectedLead.address.split(',').slice(-1)[0]?.trim()}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Edit lead"
                    onClick={() => { setEditingLead(selectedLead); setLeadFormOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 hidden sm:inline-flex" onClick={() => setSlideOutView('estimate')}><Calculator className="h-3.5 w-3.5 mr-1" /> Estimate</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 hidden sm:inline-flex" onClick={() => setSlideOutView('proposal')}><FileText className="h-3.5 w-3.5 mr-1" /> Proposal</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={handleSummarize}
                    disabled={summarizing || messages.length === 0}
                    aria-label="Ask AI to summarize conversation"
                    title="Ask AI to summarize"
                  >
                    <Sparkles className={`h-3.5 w-3.5 mr-1 ${summarizing ? 'animate-pulse text-primary' : 'text-primary'}`} />
                    {summarizing ? 'Summarizing…' : 'Summarize'}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" asChild><a href={`tel:${selectedLead.phone}`} aria-label="Call customer"><Phone className="h-3.5 w-3.5" /></a></Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate(`/lead-flow/${selectedLead.id}`)} aria-label="Open in LeadFlow"><ArrowRight className="h-3.5 w-3.5" /></Button>
                </div>

                {/* AI summary card (shown when summary is ready) */}
                {summary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b bg-primary/10 dark:bg-primary/10 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/10 flex-shrink-0">
                        <Sparkles className="h-3 w-3 text-primary dark:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-primary dark:text-primary mb-1">AI Summary</div>
                        <ul className="space-y-1">
                          {summary.map((bullet, i) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSummary(null)} aria-label="Dismiss summary">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
                  {messages.map(msg => <MessageBubble key={msg.id} message={msg} onAction={(data) => {
                    if (data === 'estimate') setSlideOutView('estimate');
                    else if (data === 'proposal') setSlideOutView('proposal');
                    else toast(`Opening ${data}…`);
                  }} />)}
                  {/* Customer typing indicator */}
                  {customerTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                        <Avatar className="h-5 w-5"><AvatarFallback className="text-[11px]">{selectedLead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                        <span className="text-xs text-muted-foreground">{selectedLead.name.split(' ')[0]} is typing</span>
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply box + chat TRIGGERS (Last List 17): fire the next
                    action from inside the conversation — where the decision
                    actually happens. Draft-first, never auto-send. */}
                <div className="border-t p-2 space-y-1.5">
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {!selectedLead.proposal && ['new','intake_complete','survey_scheduled','survey_complete'].includes(selectedLead.workflow_stage) && (
                      <button onClick={() => navigate(`/lead-flow/${selectedLead.id}`)}
                        className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-muted text-xs font-medium hover:bg-muted/70 transition-colors">
                        <Calendar className="size-3" /> Book survey
                      </button>
                    )}
                    {['new','intake_complete','survey_scheduled'].includes(selectedLead.workflow_stage) && (
                      <button onClick={async () => { const r = await notify({ type: 'photo_request', leadId: selectedLead.id, email: selectedLead.email, title: `Photo request — ${selectedLead.name}`, message: 'Please send the four survey photos in your portal — it may shorten or even save the visit.', portalPath: '/customer' }); toast.success(r.ok ? `Photo request sent to ${selectedLead.name.split(' ')[0]}` : `Photo request queued for ${selectedLead.name.split(' ')[0]}`, { description: 'The four survey shots, prompted right in their chat — may shorten or save the visit.' }); }}
                        className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-tech-subtle text-tech text-xs font-medium hover:opacity-80 transition-opacity">
                        <Camera className="size-3" /> Request photos
                      </button>
                    )}
                    {(selectedLead.proposal || ['survey_complete','proposal_drafted'].includes(selectedLead.workflow_stage)) && (
                      <button onClick={() => navigate(`/lead-flow/${selectedLead.id}`)}
                        className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-doc-proposal-subtle text-doc-proposal text-xs font-medium hover:opacity-80 transition-opacity">
                        <FileText className="size-3" /> {selectedLead.proposal?.status === 'presented' ? 'Re-send proposal' : 'Send proposal'}
                      </button>
                    )}
                    {selectedLead.proposal && !selectedLead.invoice?.deposit_paid && ['approved','proposal_sent'].includes(selectedLead.workflow_stage) && (
                      <button onClick={async () => { const r = await notify({ type: 'deposit_link', leadId: selectedLead.id, email: selectedLead.email, title: `Deposit link — ${selectedLead.name}`, message: 'Your deposit link for the solar install is ready in your portal.', portalPath: '/customer' }); toast.success(r.ok ? `Deposit link sent to ${selectedLead.name.split(' ')[0]}` : `Deposit link queued for ${selectedLead.name.split(' ')[0]} — goes out with your approval`); }}
                        className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-doc-deposit/10 text-doc-deposit text-xs font-medium hover:opacity-80 transition-opacity">
                        <DollarSign className="size-3" /> Send deposit link
                      </button>
                    )}
                    <button onClick={() => setSlideOutView('estimate')}
                      className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-muted text-xs font-medium hover:bg-muted/70 transition-colors sm:hidden">
                      <Calculator className="size-3" /> Estimate
                    </button>
                  </div>
                  {/* SUGGESTED REPLY (inbox triage) — reads the customer's last
                      message, names it, and drafts a first reply. Fills the box
                      only; the consultant edits + sends. Human gate intact. */}
                  {!replyText.trim() && (() => {
                    const t = triageInbound(selectedLead);
                    if (t.kind === 'silence') return null;
                    return (
                      <button onClick={() => setReplyText(t.draft)}
                        className="mb-2 w-full text-left rounded-control border border-doc-proposal/30 bg-doc-proposal/5 p-2 hover:bg-doc-proposal/10 transition-colors">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Sparkles className="size-3 text-doc-proposal" />
                          <span className="text-2xs font-semibold text-doc-proposal">Suggested reply · {triageLabel(t.kind).toLowerCase()}</span>
                          <span className="ml-auto text-2xs text-muted-foreground">tap to edit + send</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{t.draft}</p>
                      </button>
                    );
                  })()}
                  <div className="flex gap-2">
                    <Input placeholder="Type a reply…" value={replyText} onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }} className="h-9 text-xs" />
                    <Button onClick={handleSendReply} disabled={!replyText.trim()} className="bg-primary transition-colors hover:bg-primary h-9 px-3">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Tab content (non-chat views) */
        <div className="flex-1 overflow-y-auto">
          {/* AnimatePresence removed — FOURTH freeze site of this bug (installer
              tabs, LeadFlow steps, route level, now here): tab highlighted but
              content never swapped. Operator tools switch instantly. */}
            <div key={activeTab} className="p-3 space-y-2">

              {activeTab === 'pipeline' && (
                <PipelineKanban
                  leads={leads}
                  onAdvance={advanceLeadStage}
                  onSelectLead={(lead) => { setSelectedLead(lead); setActiveTab('inbox'); }}
                />
              )}

              {activeTab === 'calendar' && (
                <Suspense fallback={<CardListSkeleton count={3} />}>
                  <RealCalendar onOpenClient={(id) => { const l = leads.find(x => x.id === id); if (l) { setSelectedLead(l); setActiveTab('inbox'); } }} />
                </Suspense>
              )}

              {activeTab === 'route' && (() => {
                // Where routing earns its weight: the consultant does 3+ surveys
                // a day, so the drive between them is worth optimising. Take the
                // next day that has booked surveys, sequence them into the
                // shortest loop. (Installs are one-a-day — that view becomes
                // month-ahead scheduling, next.)
                const booked = leads
                  .filter(l => l.workflow_stage === 'survey_scheduled' && l.survey?.scheduled_date)
                  .map(l => ({ l, d: l.survey!.scheduled_date }))
                  .sort((a, b) => +new Date(a.d) - +new Date(b.d));
                const nextDay = booked.find(x => +new Date(x.d) > Date.now() - 864e5);
                const dayStops = nextDay
                  ? booked.filter(x => new Date(x.d).toDateString() === new Date(nextDay.d).toDateString())
                  : [];
                const label = nextDay
                  ? new Date(nextDay.d).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' })
                  : '';
                return (
                  <DayRoute
                    title={dayStops.length ? `Survey run — ${label}` : 'Survey run'}
                    subtitle={dayStops.length
                      ? `${dayStops.length} ${dayStops.length === 1 ? 'survey' : 'surveys'} booked · sequenced to cut the drive`
                      : 'Your booked surveys, sequenced into the shortest loop when there are three or more in a day.'}
                    stops={dayStops.map(({ l, d }) => ({ id: l.id, name: l.name, address: l.address, date: d, kindLabel: 'Survey' }))}
                    onOpen={(id) => { const l = leads.find(x => x.id === id); if (l) { setSelectedLead(l); setActiveTab('inbox'); } }}
                  />
                );
              })()}

              {activeTab === 'products' && (
                <Suspense fallback={<CardListSkeleton count={3} />}>
                  <ProfessionalProducts />
                </Suspense>
              )}

              {activeTab === 'documents' && (
                <>
                  <p className="text-xs text-muted-foreground">Proposals, contracts and invoices — colour-edged by document, click through to the client</p>
                  {leads.filter(l => l.proposal || l.contract || l.invoice).length === 0 ? (
                    <EmptyState
                      icon={FolderOpen}
                      title="No documents yet"
                      description="Proposals, contracts, and invoices will appear here once leads progress through the pipeline."
                      variant="compact"
                    />
                  ) : (
                    leads.filter(l => l.proposal || l.contract || l.invoice).map(lead => {
                      // Left-edge accent = the furthest-along document on this lead.
                      // Colour logic (used app-wide): proposal=yellow, contract=blue,
                      // invoice=red, deposit=green.
                      const edge = lead.invoice?.deposit_paid ? 'border-l-doc-deposit'
                        : lead.invoice ? 'border-l-doc-invoice'
                        : lead.contract ? 'border-l-doc-contract'
                        : 'border-l-doc-proposal';
                      return (
                      <Card key={lead.id} className={`cursor-pointer transition-shadow hover:shadow-md border-l-4 ${edge}`} onClick={() => { setSelectedLead(lead); setSlideOutView('proposal'); }}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                          <div className="flex-1 min-w-0"><span className="font-medium text-sm">{lead.name}</span><div className="flex items-center gap-2 mt-0.5">
                            {lead.proposal && <Badge variant="outline" className="text-[11px] bg-doc-proposal/10 text-doc-proposal border-doc-proposal/30">Proposal</Badge>}
                            {lead.contract && <Badge variant="outline" className="text-[11px] bg-doc-contract/10 text-doc-contract border-doc-contract/30">Contract</Badge>}
                            {lead.invoice && <Badge variant="outline" className="text-[11px] bg-doc-invoice/10 text-doc-invoice border-doc-invoice/30">Invoice</Badge>}
                            {lead.invoice?.deposit_paid && <Badge variant="outline" className="text-[11px] bg-doc-deposit/10 text-doc-deposit border-doc-deposit/30">Deposit paid</Badge>}
                            <EngagementBadge lead={lead} compact />
                          </div></div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    )})
                  )}
                </>
              )}

              {activeTab === 'insights' && (
                <ConsultantInsights
                  leads={leads}
                  onOpenLead={(lead) => { setSelectedLead(lead); setActiveTab('inbox'); }}
                />
              )}

            </div>
        </div>
      )}

      {/* Slide-out panel */}
      <AnimatePresence>
        {slideOutView && selectedLead && (
          <motion.div
            variants={slideInRight}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[560px] lg:w-[58vw] lg:max-w-[900px] bg-background border-l shadow-2xl z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={`${slideOutView} panel for ${selectedLead.name}`}
          >
            <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between z-10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                {slideOutView === 'estimate' ? <><Calculator className="h-4 w-4 text-primary" /> Estimate</> : <><FileText className="h-4 w-4 text-primary" /> Proposal</>}
                <span className="text-muted-foreground font-normal">· {selectedLead.name}</span>
              </h3>
              <div className="flex items-center gap-1">
                {slideOutView === 'estimate' && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSlideOutView('proposal')}>Proposal →</Button>}
                {slideOutView === 'proposal' && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSlideOutView('estimate')}>← Estimate</Button>}
                <Button variant="ghost" size="sm" className="p-1.5" onClick={() => setSlideOutView(null)}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="p-3">
              <Suspense fallback={<CardListSkeleton count={3} />}>
                {slideOutView === 'estimate' && <EstimateView lead={selectedLead} onOpenProposal={() => setSlideOutView('proposal')} />}
                {slideOutView === 'proposal' && <ProposalView key={selectedLead?.id} lead={selectedLead} />}
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* AI Coach is mounted once globally in App.tsx for these routes — no
          local copy here or it double-mounts (one visible, one swallowing clicks). */}
    </AppShell>
  );
}

/**
 * Lead list content — shared between desktop inline column + mobile drawer.
 * Phase 6 refactor: extracted so the same UI renders in both layouts.
 */
function LeadListContent({
  search, setSearch,
  inboxFilter, setInboxFilter,
  inboxLeads,
  selectedLead,
  onSelectLead,
  activeTab,
  hotLeadsCount,
  staleLeadsCount,
  leads,
  onClose,
}: {
  search: string;
  setSearch: (s: string) => void;
  inboxFilter: InboxFilter;
  setInboxFilter: (f: InboxFilter) => void;
  inboxLeads: DummyLead[];
  selectedLead: DummyLead | null;
  onSelectLead: (lead: DummyLead) => void;
  activeTab: TabId;
  hotLeadsCount: number;
  staleLeadsCount: number;
  leads: DummyLead[];
  onClose?: () => void;
}) {
  return (
    <>
      <div className="p-2 border-b space-y-2">
        {onClose && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Leads</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 lg:hidden" onClick={onClose} aria-label="Close lead list">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" aria-label="Search leads" />
        </div>
        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {INBOX_FILTERS.map(f => {
            const isActive = inboxFilter === f.id;
            const chipCount = f.id === 'hot' ? hotLeadsCount
              : f.id === 'stale' ? staleLeadsCount
              : f.id === 'survey' ? leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage)).length
              : f.id === 'proposal' ? leads.filter(l => ['proposal_drafted', 'proposal_sent'].includes(l.workflow_stage)).length
              : f.id === 'install' ? leads.filter(l => ['install_scheduled', 'installing', 'installed'].includes(l.workflow_stage)).length
              : leads.length;
            return (
              <button
                key={f.id}
                onClick={() => setInboxFilter(f.id)}
                className={`text-[11px] px-2 py-1 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {f.emoji ? `${f.emoji} ` : ''}{f.label}
                {chipCount > 0 && <span className={`ml-1 ${isActive ? 'opacity-80' : 'opacity-60'}`}>{chipCount}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <motion.div
        className="flex-1 overflow-y-auto"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        key={activeTab + inboxFilter + search}
      >
        {inboxLeads.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No leads match this filter.
          </div>
        ) : (
          inboxLeads.map(lead => {
            const last = lead.touchpoints[lead.touchpoints.length - 1];
            const isSelected = selectedLead?.id === lead.id;
            return (
              <motion.button
                key={lead.id}
                variants={listItemFade}
                onClick={() => onSelectLead(lead)}
                className={`w-full p-2.5 border-b flex items-start gap-2 text-left transition-colors hover:bg-muted/30 ${isSelected ? 'bg-primary/10 dark:bg-primary/10' : ''}`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-sm truncate">{lead.name}</span>
                    {last && <span className="text-[11px] text-muted-foreground flex-shrink-0">{new Date(last.timestamp).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{last?.summary || 'No messages'}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {(() => {
                      const group = PIPELINE_STAGES.find(s => s.id === lead.workflow_stage)?.group ?? 'intake';
                      const t = TONE[PHASE_TONE[group] ?? 'neutral'];
                      return <Badge variant="outline" className={`text-[11px] ${t.chip} border-transparent`}>{getStage(lead.workflow_stage).label}</Badge>;
                    })()}
                    {lead.score > 80 && <Flame className="h-2.5 w-2.5 text-pop" />}
                    <EngagementBadge lead={lead} compact />
                    {(() => {
                      // Inbox triage tag — what the customer's last message IS,
                      // so a full list can be scanned for the ones needing a reply.
                      const tr = triageInbound(lead);
                      if (tr.kind === 'silence') return null;
                      return <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${TRIAGE_TAG[tr.tone]}`}>{triageLabel(tr.kind)}</span>;
                    })()}
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </motion.div>
    </>
  );
}

/**
 * Kanban Pipeline — drag a lead card to the next stage column.
 * Phase 3 feature: replaces the old "Estimates/Surveys/Proposals/Installs" tab
 * soup with one visual workflow surface.
 *
 * Uses native HTML5 drag-and-drop. Each column maps to a PIPELINE_STAGES entry.
 * Drop a card on a column → onAdvance(leadId, targetStageId) is called.
 */
// Colour emblem per phase (Cal's "little emblems follow the primary-colour logic").
const GROUP_DOT: Record<string, string> = {
  intake: 'bg-muted-foreground', survey: 'bg-tech', proposal: 'bg-doc-proposal',
  contract: 'bg-doc-contract', install: 'bg-primary', closeout: 'bg-doc-deposit',
};

function PipelineKanban({
  leads,
  onAdvance,
  onSelectLead,
}: {
  leads: DummyLead[];
  onAdvance: (leadId: string, targetStage: string) => void;
  onSelectLead: (lead: DummyLead) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoverGroup, setHoverGroup] = useState<string | null>(null);

  const active = leads.filter(l => !['completed', 'final_paid'].includes(l.workflow_stage));
  const totalValue = leads.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0);
  const hot = leads.filter(l => l.score > 80).length;

  // 6 phase columns (not 13 raw stages) — fills the width, no runaway strip.
  const columns = STAGE_GROUPS.map(g => {
    const stageIds = PIPELINE_STAGES.filter(s => s.group === g.id).map(s => s.id);
    const firstStage = stageIds[0];
    const groupLeads = leads
      .filter(l => stageIds.includes(l.workflow_stage))
      .sort((a, b) => b.score - a.score);
    const value = groupLeads.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0);
    return { ...g, firstStage, leads: groupLeads, value };
  });

  return (
    <div className="flex flex-col h-full min-h-[calc(100dvh-11rem)]">
      {/* stat header */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pb-3">
        <div>
          <span className="text-lg font-semibold tracking-tight">{eur(totalValue)}</span>
          <span className="text-xs text-muted-foreground ml-1.5">pipeline value</span>
        </div>
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">{active.length}</strong> active
          {hot > 0 && <> · <strong className="text-pop">{hot}</strong> hot</>}
        </div>
        <span className="ml-auto text-2xs text-muted-foreground">Drag a card to advance a phase</span>
      </div>

      {/* full-height board: 6 columns on xl, wraps on smaller. No blank void. */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 min-h-0">
        {columns.map(col => {
          const isHover = hoverGroup === col.id;
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setHoverGroup(col.id); }}
              onDragLeave={() => setHoverGroup(prev => prev === col.id ? null : prev)}
              onDrop={() => { if (draggedId && col.firstStage) onAdvance(draggedId, col.firstStage); setDraggedId(null); setHoverGroup(null); }}
              className={`flex flex-col rounded-panel border bg-card min-h-[16rem] transition-colors ${isHover ? 'border-primary/50 bg-primary/[0.04]' : 'border-border'}`}
            >
              <div className="flex items-center gap-1.5 px-3 h-10 border-b border-border shrink-0">
                <span className={`size-2 rounded-full ${GROUP_DOT[col.id] ?? 'bg-primary'}`} />
                <span className="text-2xs font-semibold uppercase tracking-wide truncate">{col.label}</span>
                <span className="ml-auto text-2xs tabular-nums text-muted-foreground">{col.leads.length}</span>
              </div>
              {col.value > 0 && (
                <div className="px-3 py-1.5 text-2xs tabular-nums text-muted-foreground border-b border-border/60">{eur(col.value)}</div>
              )}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto scroll-slim">
                {col.leads.length === 0 ? (
                  <div className="text-2xs text-muted-foreground/50 text-center py-6">—</div>
                ) : col.leads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedId(lead.id)}
                    onDragEnd={() => { setDraggedId(null); setHoverGroup(null); }}
                    onClick={() => onSelectLead(lead)}
                    className={`rounded-md border border-border bg-background p-2 cursor-pointer hover:shadow-md transition-shadow ${draggedId === lead.id ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5"><AvatarFallback className="text-[10px]">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                      <span className="text-xs font-medium truncate flex-1">{lead.name}</span>
                      {lead.score > 80 && <Flame className="h-3 w-3 text-pop shrink-0" />}
                      <EngagementBadge lead={lead} compact />
                    </div>
                    <div className="text-2xs text-muted-foreground mt-1 truncate">{getStage(lead.workflow_stage).label}</div>
                    <div className="text-2xs font-medium tabular-nums mt-0.5">
                      {lead.proposal ? `${lead.proposal.system_size_kw}kWp · ${eur(lead.proposal.net_cost)}`
                        : lead.intake ? `€${lead.monthly_bill}/mo · est. ${lead.intake.estimated_system_size_kw}kWp`
                        : `€${lead.monthly_bill}/mo`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
