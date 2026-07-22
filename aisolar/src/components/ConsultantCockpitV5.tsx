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
import { AiosMark } from "@/components/brand/AiosMark";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
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
  Building2, Sun, MapPin, Send, User, Sparkles, X, Award, CalendarClock } from 'lucide-react';
import { generateDummyLeads, computePipelineStats, type DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES, calculateSystemEstimate } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import ConsultantToday from '@/components/consultant/ConsultantToday';
import InsightsView from '@/components/InsightsView';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import RoleBasedAICoach from '@/components/ai/RoleBasedAICoach';
import { buildConversation, generateAIResponse, summarizeConversation, type ChatMessage } from '@/lib/conversation';

const EstimateView = lazy(() => import('./EstimateView'));
const ProposalView = lazy(() => import('./ProposalView'));
const UnifiedCalendar = lazy(() => import('./UnifiedCalendar'));
// #3: the consultant calendar must be the SAME as the owner's — the owner uses
// RealCalendar, so the consultant does too (one calendar, no divergence).
const RealCalendar = lazy(() => import('./RealCalendar'));
const ProfessionalProducts = lazy(() => import('./ProfessionalProducts'));

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
type TabId = 'today' | 'inbox' | 'pipeline' | 'calendar' | 'products' | 'documents' | 'insights';

const TABS: Array<{ id: TabId; label: string; icon: typeof Users }> = [
  { id: 'today', label: 'Today', icon: CalendarClock },
  { id: 'inbox', label: 'Inbox', icon: MessageSquare },
  { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<DummyLead[]>(() => generateDummyLeads());
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

  const stats = useMemo(() => computePipelineStats(leads), [leads]);
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
    // Phase 1 fix: optimistic local update so the message appears in the
    // thread. In production this would also insert into the `touchpoints`
    // table via Supabase and send via Postmark.
    const newTouchpoint = {
      id: `tp_${Date.now()}`,
      lead_id: selectedLead.id,
      stage: selectedLead.workflow_stage,
      channel: 'portal' as const,
      direction: 'outbound' as const,
      summary: replyText,
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

    // Simulate the customer typing back after a brief delay (demo only).
    // In production this would come from Supabase Realtime presence.
    setTimeout(() => {
      setCustomerTyping(true);
      setTimeout(() => {
        setCustomerTyping(false);
        // Append a simulated customer reply
        const customerReply = {
          id: `tp_${Date.now()}_c`,
          lead_id: updatedLead.id,
          stage: updatedLead.workflow_stage,
          channel: 'portal' as const,
          direction: 'inbound' as const,
          summary: 'Thanks for getting back to me. Let me think about it.',
          timestamp: new Date().toISOString(),
          actor: 'customer' as const,
        };
        const reUpdated: DummyLead = {
          ...updatedLead,
          touchpoints: [...updatedLead.touchpoints, customerReply],
        };
        setLeads(prev => prev.map(l => l.id === reUpdated.id ? reUpdated : l));
        setSelectedLead(reUpdated);
      }, 2200);
    }, 800);
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
    setLeads(prev => prev.map(l =>
      l.id === leadId ? { ...l, workflow_stage: targetStage } : l
    ));
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, workflow_stage: targetStage } : prev);
    }
    toast.success(`Moved to ${getStage(targetStage).label}`, {
      description: `${selectedLead?.name || 'Lead'} is now in the ${getStage(targetStage).label} stage.`,
    });
  };

  const isChatView = activeTab === 'inbox';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-background border-b flex-shrink-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AiosMark className="size-8" />
            <span className="font-bold text-sm">{brand.name}</span>
            <span className="text-xs text-muted-foreground">Consultant</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/owner')}><Building2 className="h-3.5 w-3.5 mr-1" /> Owner</Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/installer')}><Wrench className="h-3.5 w-3.5 mr-1" /> Installer</Button>
            <DarkModeToggle />
          </div>
        </div>
        {/* 6 tabs */}
        <div className="flex gap-0.5 px-2 pb-1.5 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'inbox'
              ? leads.length
              : tab.id === 'pipeline'
              ? leads.filter(l => !['completed', 'final_paid'].includes(l.workflow_stage)).length
              : tab.id === 'documents'
              ? leads.filter(l => l.proposal || l.contract || l.invoice).length
              : 0;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 h-control-sm rounded-control text-sm font-medium whitespace-nowrap cursor-pointer transition-colors duration-instant border ${isActive ? 'bg-muted text-foreground border-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border-transparent'}`}>
                <Icon className="size-3.5" /> {tab.label}
                {count > 0 && (
                  <span className={`text-2xs tabular-nums px-1.5 rounded-full ${tab.id === 'inbox' ? 'bg-pop/10 text-pop font-semibold' : 'bg-muted-foreground/15'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </header>

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
            <div className="w-72 lg:w-80 flex-shrink-0 border-r flex flex-col hidden lg:flex">
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
                  <p className="text-xs text-muted-foreground mt-1">All emails, SMS, calls, AI chat, and agent actions in one thread.</p>
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
                    <div className="font-semibold text-sm truncate">{selectedLead.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{selectedLead.address.split(',').slice(-1)[0]?.trim()}</div>
                  </div>
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

                {/* Reply box */}
                <div className="border-t p-2">
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
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-3 space-y-2">

              {activeTab === 'pipeline' && (
                <PipelineKanban
                  leads={leads}
                  onAdvance={advanceLeadStage}
                  onSelectLead={(lead) => { setSelectedLead(lead); setActiveTab('inbox'); }}
                />
              )}

              {activeTab === 'calendar' && (
                <Suspense fallback={<CardListSkeleton count={3} />}>
                  <RealCalendar />
                </Suspense>
              )}

              {activeTab === 'products' && (
                <Suspense fallback={<CardListSkeleton count={3} />}>
                  <ProfessionalProducts />
                </Suspense>
              )}

              {activeTab === 'documents' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documents — proposals, contracts, invoices</h3>
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
                          </div></div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    )})
                  )}
                </>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <StatBox label="Active leads" value={String(stats.activeLeads)} icon={Users} color="blue" />
                    <StatBox label="Pipeline" value={eur(stats.totalValue)} icon={DollarSign} color="emerald" />
                    <StatBox label="Conversion" value={`${Math.round((leads.filter(l => l.contract).length / leads.length) * 100)}%`} icon={TrendingUp} color="violet" />
                    <StatBox label="Stale" value={String(stats.staleLeads)} icon={Clock} color="amber" />
                  </div>
                  <Card><CardContent className="p-3">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Pipeline by stage</h4>
                    <div className="space-y-1">
                      {PIPELINE_STAGES.map(s => {
                        const count = leads.filter(l => l.workflow_stage === s.id).length;
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <div className="w-24 text-[11px] truncate">{s.label}</div>
                            <div className="flex-1 h-4 bg-muted rounded relative overflow-hidden"><div className={`h-full bg-primary`} style={{ width: `${Math.max(2, (count / leads.length) * 100)}%` }} /></div>
                            <span className="text-[11px] font-bold w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent></Card>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/owner')}>Full analytics <ArrowRight className="h-3 w-3 ml-1" /></Button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
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
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-background border-l shadow-2xl z-50 overflow-y-auto"
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
                {slideOutView === 'proposal' && <ProposalView lead={selectedLead} />}
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RoleBasedAICoach />
    </div>
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
                    ? 'bg-primary text-white'
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
                    <Badge variant="outline" className={`text-[11px] bg-primary/10 text-primary border-primary/40`}>{getStage(lead.workflow_stage).label}</Badge>
                    {lead.score > 80 && <Flame className="h-2.5 w-2.5 text-red-500" />}
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

function MessageBubble({ message, onAction }: { message: ChatMessage; onAction?: (data?: string) => void }) {
  if (message.type === 'system') {
    return <div className="flex justify-center"><div className="px-3 py-1 bg-muted/50 rounded-full text-[11px] text-muted-foreground text-center max-w-[85%]">{message.body}</div></div>;
  }
  const isCustomer = message.type === 'customer';
  const isAI = message.type === 'ai';
  const isAgent = message.type === 'agent';
  const bg = isCustomer ? 'bg-primary text-white rounded-br-sm' : isAI ? 'bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-bl-sm' : isAgent ? 'bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-bl-sm' : 'bg-muted text-foreground rounded-bl-sm';
  const label = isCustomer ? 'Customer' : isAI ? 'AI Assistant' : isAgent ? 'AI Agent' : 'Consultant';
  const Icon = isCustomer ? User : isAI ? Sparkles : isAgent ? Bot : MessageSquare;
  const ActionIcon = message.actionIcon;
  const CardIcon = message.card?.ctaIcon;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isCustomer ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`flex items-center gap-1 text-[11px] ${isCustomer ? 'flex-row-reverse' : ''}`}>
          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-muted-foreground font-medium">{label}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{new Date(message.timestamp).toLocaleString('en-IE', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        {/* Bubble body */}
        <div className={`rounded-2xl px-4 py-2.5 ${bg}`}>
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
          {/* Inline action button */}
          {message.actionLabel && ActionIcon && (
            <button
              onClick={() => onAction?.(message.actionData)}
              className={`mt-2 flex items-center gap-1 text-xs font-medium ${isCustomer ? 'text-white/90' : 'text-primary dark:text-primary'} hover:underline`}
            >
              <ActionIcon className="h-3 w-3" />
              {message.actionLabel}
              <ArrowRight className="h-2 w-2" />
            </button>
          )}
        </div>
        {/* Rich card (proposal / contract / install / warranty) */}
        {message.card && (
          <div className={`mt-1 rounded-xl border bg-background shadow-sm overflow-hidden ${isCustomer ? 'ml-auto' : ''}`}>
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
              {message.card.kind === 'proposal' && <FileText className="h-3.5 w-3.5 text-primary" />}
              {message.card.kind === 'contract' && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
              {message.card.kind === 'install' && <Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
              {message.card.kind === 'warranty' && <Award className="h-3.5 w-3.5 text-primary" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{message.card.title}</div>
                {message.card.subtitle && <div className="text-[11px] text-muted-foreground truncate">{message.card.subtitle}</div>}
              </div>
            </div>
            {message.card.rows && message.card.rows.length > 0 && (
              <div className="px-3 py-2 space-y-1">
                {message.card.rows.map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => onAction?.(message.card?.ctaData)}
              className="w-full px-3 py-2 text-xs font-medium text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors flex items-center justify-center gap-1 border-t"
            >
              {CardIcon && <CardIcon className="h-3 w-3" />}
              {message.card.ctaLabel}
              <ArrowRight className="h-2 w-2" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Users; color: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-center gap-2 mb-1"><div className={`p-1 rounded bg-primary/10 dark:bg-primary/10`}><Icon className={`h-3 w-3 text-primary dark:text-primary`} /></div><span className="text-[11px] text-muted-foreground">{label}</span></div>
      <div className="text-lg font-bold">{value}</div>
    </CardContent></Card>
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
  const [hoverStage, setHoverStage] = useState<string | null>(null);

  const handleDrop = (stageId: string) => {
    if (draggedId) {
      onAdvance(draggedId, stageId);
    }
    setDraggedId(null);
    setHoverStage(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Pipeline — {leads.filter(l => !['completed', 'final_paid'].includes(l.workflow_stage)).length} active
        </h3>
        <span className="text-[11px] text-muted-foreground">Drag a card to advance stage</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.workflow_stage === stage.id);
            const isHover = hoverStage === stage.id;
            return (
              <div
                key={stage.id}
                onDragOver={(e) => { e.preventDefault(); setHoverStage(stage.id); }}
                onDragLeave={() => setHoverStage(prev => prev === stage.id ? null : prev)}
                onDrop={() => handleDrop(stage.id)}
                className={`w-56 flex-shrink-0 rounded-lg border-2 transition-colors ${
                  isHover ? 'border-primary/40 bg-primary/10 dark:bg-primary/10' : 'border-border bg-muted/20'
                }`}
              >
                <div className="p-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full bg-primary`} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide">{stage.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">{stageLeads.length}</span>
                </div>
                <div className="p-1.5 space-y-1.5 max-h-96 overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground/60 text-center py-4">Drop here</div>
                  ) : (
                    stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggedId(lead.id)}
                        onDragEnd={() => { setDraggedId(null); setHoverStage(null); }}
                        onClick={() => onSelectLead(lead)}
                        className={`p-2 bg-background rounded-md border cursor-pointer transition-shadow hover:shadow-md ${
                          draggedId === lead.id ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5"><AvatarFallback className="text-[11px]">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                          <span className="text-xs font-medium truncate flex-1">{lead.name}</span>
                          {lead.score > 80 && <Flame className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />}
                        </div>
                        {lead.proposal && (
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {lead.proposal.system_size_kw}kWp · {eur(lead.proposal.net_cost)}
                          </div>
                        )}
                        {!lead.proposal && lead.intake && (
                          <div className="text-[11px] text-muted-foreground mt-1">
                            €{lead.monthly_bill}/mo · est. {lead.intake.estimated_system_size_kw}kWp
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
