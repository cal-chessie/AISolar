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
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Users, MessageSquare, Calculator, Camera, FileText, Wrench,
  Calendar, Clock, Package, FolderOpen, BarChart3, Search,
  Phone, Mail, ArrowRight, ChevronRight, Flame, Star, Zap,
  TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Bot,
  Building2, Sun, MapPin, Send, User, Sparkles, X,
} from 'lucide-react';
import { generateDummyLeads, computePipelineStats, type DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES, calculateSystemEstimate } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import RoleBasedAICoach from '@/components/ai/RoleBasedAICoach';

const EstimateView = lazy(() => import('./EstimateView'));
const ProposalView = lazy(() => import('./ProposalView'));
const UnifiedCalendar = lazy(() => import('./UnifiedCalendar'));
const ProfessionalProducts = lazy(() => import('./ProfessionalProducts'));

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type TabId = 'leads' | 'chats' | 'estimates' | 'surveys' | 'proposals' | 'installations' | 'calendar' | 'followups' | 'products' | 'documents' | 'analytics';

const TABS: Array<{ id: TabId; label: string; icon: typeof Users }> = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'estimates', label: 'Estimates', icon: Calculator },
  { id: 'surveys', label: 'Surveys', icon: Camera },
  { id: 'proposals', label: 'Proposals', icon: FileText },
  { id: 'installations', label: 'Installs', icon: Wrench },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'followups', label: 'Follow-ups', icon: Clock },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

interface Message {
  id: string;
  type: 'system' | 'agent' | 'company' | 'customer' | 'ai';
  body: string;
  timestamp: string;
}

function leadToMessages(lead: DummyLead): Message[] {
  const msgs: Message[] = [];
  lead.touchpoints.forEach((tp, i) => {
    if (tp.actor === 'agent') {
      msgs.push({ id: `tp_${i}`, type: 'agent', body: tp.summary, timestamp: tp.timestamp });
    } else if (tp.actor === 'consultant') {
      msgs.push({ id: `tp_${i}`, type: 'company', body: tp.summary, timestamp: tp.timestamp });
    } else if (tp.actor === 'customer') {
      msgs.push({ id: `tp_${i}`, type: 'customer', body: tp.summary, timestamp: tp.timestamp });
    } else {
      msgs.push({ id: `tp_${i}`, type: 'system', body: tp.summary, timestamp: tp.timestamp });
    }
  });
  if (['proposal_sent', 'approved', 'deposit_paid'].includes(lead.workflow_stage)) {
    const last = lead.touchpoints[lead.touchpoints.length - 1];
    const ts = last?.timestamp || new Date().toISOString();
    msgs.push({ id: 'chat_q', type: 'customer', body: 'When will my installation happen?', timestamp: ts });
    msgs.push({ id: 'chat_a', type: 'ai', body: 'Your installation is scheduled based on your deposit payment. Once you pay the 30% deposit, the Install Coordinator Agent will book your install within 4-6 weeks.', timestamp: ts });
  }
  return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export default function ConsultantCockpitV5() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [activeTab, setActiveTab] = useState<TabId>('chats');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<DummyLead | null>(null);
  const [slideOutView, setSlideOutView] = useState<'estimate' | 'proposal' | null>(null);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => computePipelineStats(leads), [leads]);
  const messages = useMemo(() => selectedLead ? leadToMessages(selectedLead) : [], [selectedLead]);

  const filteredLeads = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(l => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.address.toLowerCase().includes(q) || l.mprn.includes(q));
  }, [leads, search]);

  const surveyLeads = leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage));
  const proposalLeads = leads.filter(l => ['proposal_drafted', 'proposal_sent'].includes(l.workflow_stage));
  const installLeads = leads.filter(l => ['install_scheduled', 'installing', 'installed'].includes(l.workflow_stage));
  const staleLeads = leads.filter(l => {
    const last = l.touchpoints[l.touchpoints.length - 1];
    if (!last) return false;
    return (Date.now() - new Date(last.timestamp).getTime()) > 5 * 86400000 && !['completed', 'final_paid', 'installed', 'installing'].includes(l.workflow_stage);
  });
  const hotLeads = leads.filter(l => l.score > 80);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Auto-select first lead on Chats tab
  useEffect(() => {
    if (activeTab === 'chats' && !selectedLead && hotLeads.length > 0) {
      setSelectedLead(hotLeads[0]);
    }
  }, [activeTab]);

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
  };

  const isChatView = activeTab === 'chats' || activeTab === 'leads';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-background border-b flex-shrink-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-sm">{brand.name}</span>
            <span className="text-xs text-muted-foreground">Consultant</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/owner')}><Building2 className="h-3.5 w-3.5 mr-1" /> Owner</Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/installer')}><Wrench className="h-3.5 w-3.5 mr-1" /> Installer</Button>
            <DarkModeToggle />
          </div>
        </div>
        {/* 11 tabs */}
        <div className="flex gap-0.5 px-2 pb-1.5 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'leads' ? leads.length : tab.id === 'surveys' ? surveyLeads.length : tab.id === 'proposals' ? proposalLeads.length : tab.id === 'installations' ? installLeads.length : tab.id === 'followups' ? staleLeads.length : tab.id === 'chats' ? hotLeads.length : 0;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                <Icon className="h-3.5 w-3.5" /> {tab.label}
                {count > 0 && <span className={`text-[9px] px-1 rounded-full ${isActive ? 'bg-white/20' : 'bg-muted-foreground/15'}`}>{count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main content */}
      {isChatView ? (
        /* Chat layout: lead list + conversation thread */
        <div className="flex-1 flex overflow-hidden">
          {/* Lead list (left) */}
          <div className="w-72 lg:w-80 flex-shrink-0 border-r flex flex-col">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(activeTab === 'chats' ? hotLeads : filteredLeads).map(lead => {
                const last = lead.touchpoints[lead.touchpoints.length - 1];
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <button key={lead.id} onClick={() => setSelectedLead(lead)}
                    className={`w-full p-2.5 border-b flex items-start gap-2 text-left hover:bg-muted/30 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm truncate">{lead.name}</span>
                        {last && <span className="text-[9px] text-muted-foreground flex-shrink-0">{new Date(last.timestamp).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{last?.summary || 'No messages'}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className={`text-[8px] bg-${getStage(lead.workflow_stage).color}-50 text-${getStage(lead.workflow_stage).color}-700 border-${getStage(lead.workflow_stage).color}-200`}>{getStage(lead.workflow_stage).label}</Badge>
                        {lead.score > 80 && <Flame className="h-2.5 w-2.5 text-red-500" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation thread (right) */}
          <div className="flex-1 flex flex-col">
            {!selectedLead ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-semibold text-muted-foreground">Select a lead to view conversation</h3>
                  <p className="text-xs text-muted-foreground mt-1">All emails, SMS, calls, AI chat, and agent actions in one thread.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <div className="p-2.5 border-b flex items-center gap-2">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{selectedLead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{selectedLead.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{selectedLead.address.split(',').slice(-1)[0]?.trim()}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSlideOutView('estimate')}><Calculator className="h-3.5 w-3.5 mr-1" /> Estimate</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSlideOutView('proposal')}><FileText className="h-3.5 w-3.5 mr-1" /> Proposal</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" asChild><a href={`tel:${selectedLead.phone}`} aria-label="Call customer"><Phone className="h-3.5 w-3.5" /></a></Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate(`/lead-flow/${selectedLead.id}`)} aria-label="Open in LeadFlow"><ArrowRight className="h-3.5 w-3.5" /></Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
                  {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply box */}
                <div className="border-t p-2">
                  <div className="flex gap-2">
                    <Input placeholder="Type a reply…" value={replyText} onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }} className="h-9 text-xs" />
                    <Button onClick={handleSendReply} disabled={!replyText.trim()} className="bg-blue-600 hover:bg-blue-700 h-9 px-3">
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

              {activeTab === 'estimates' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Estimates — {leads.length} leads</h3>
                  {leads.map(lead => {
                    const est = calculateSystemEstimate({ monthlyBill: lead.monthly_bill, annualKwh: lead.annual_kwh });
                    return (
                      <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelectedLead(lead); setSlideOutView('estimate'); }}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0"><span className="font-medium text-sm">{lead.name}</span><div className="text-xs text-muted-foreground">€{lead.monthly_bill}/mo · {est.systemSizeKw}kWp · {eur(est.annualSavings)}/yr</div></div>
                          <Badge variant="outline" className="text-[9px] text-amber-600">{est.systemSizeKw} kWp</Badge>
                          <Badge variant="outline" className="text-[9px] text-emerald-600">{eur(est.annualSavings)}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}

              {activeTab === 'surveys' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Surveys — {surveyLeads.length} pending</h3>
                  {surveyLeads.map(lead => (
                    <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/lead-flow/${lead.id}`)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-950/40 rounded-lg"><Camera className="h-4 w-4 text-indigo-600" /></div>
                        <div className="flex-1 min-w-0"><span className="font-medium text-sm">{lead.name}</span><div className="text-xs text-muted-foreground">{lead.address.split(',').slice(-1)[0]?.trim()} · {lead.survey?.photo_count || 0}/8 photos</div></div>
                        <Progress value={((lead.survey?.photo_count || 0) / 8) * 100} className="h-1.5 w-16" />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                  {surveyLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No surveys pending.</p>}
                </>
              )}

              {activeTab === 'proposals' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Proposals — {proposalLeads.length} active</h3>
                  {proposalLeads.map(lead => (
                    <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelectedLead(lead); setSlideOutView('proposal'); }}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="p-2 bg-violet-100 dark:bg-violet-950/40 rounded-lg"><FileText className="h-4 w-4 text-violet-600" /></div>
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-medium text-sm">{lead.name}</span><Badge variant="outline" className="text-[9px]">{lead.proposal?.status}</Badge></div><div className="text-xs text-muted-foreground">{lead.proposal?.system_size_kw}kWp · {eur(lead.proposal?.net_cost || 0)} · {lead.proposal?.payback_years}yr</div></div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                  {proposalLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active proposals.</p>}
                </>
              )}

              {activeTab === 'installations' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Installations — {installLeads.length} active</h3>
                  {installLeads.map(lead => (
                    <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/job/${lead.id}`)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg"><Wrench className="h-4 w-4 text-amber-600" /></div>
                        <div className="flex-1 min-w-0"><span className="font-medium text-sm">{lead.name}</span><div className="text-xs text-muted-foreground">{lead.proposal?.system_size_kw}kWp · {lead.assignment?.installer_name} · {lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE') : 'TBD'}</div></div>
                        <Badge variant="outline" className="text-[9px] capitalize">{lead.assignment?.status}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                  {installLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active installations.</p>}
                </>
              )}

              {activeTab === 'calendar' && (
                <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></div>}>
                  <UnifiedCalendar filterRole="consultant" />
                </Suspense>
              )}

              {activeTab === 'followups' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" /> Follow-ups — {staleLeads.length} stale (5+ days)</h3>
                  {staleLeads.map(lead => {
                    const last = lead.touchpoints[lead.touchpoints.length - 1];
                    const days = last ? Math.round((Date.now() - new Date(last.timestamp).getTime()) / 86400000) : 0;
                    return (
                      <Card key={lead.id} className="cursor-pointer hover:shadow-md border-l-4 border-l-amber-500" onClick={() => { setSelectedLead(lead); setActiveTab('chats'); }}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0"><span className="font-medium text-sm">{lead.name}</span><div className="text-xs text-muted-foreground">{getStage(lead.workflow_stage).label} · {days}d since last contact</div></div>
                          <Button size="sm" variant="outline" className="h-7 text-xs" asChild><a href={`tel:${lead.phone}`}><Phone className="h-3 w-3 mr-1" /> Call</a></Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" asChild><a href={`mailto:${lead.email}`}><Mail className="h-3 w-3 mr-1" /> Email</a></Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {staleLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">All caught up — no stale leads!</p>}
                </>
              )}

              {activeTab === 'products' && (
                <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></div>}>
                  <ProfessionalProducts />
                </Suspense>
              )}

              {activeTab === 'documents' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documents — proposals, contracts, invoices</h3>
                  {leads.filter(l => l.proposal || l.contract || l.invoice).map(lead => (
                    <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelectedLead(lead); setSlideOutView('proposal'); }}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                        <div className="flex-1 min-w-0"><span className="font-medium text-sm">{lead.name}</span><div className="flex items-center gap-2 mt-0.5">{lead.proposal && <Badge variant="outline" className="text-[8px]">Proposal</Badge>}{lead.contract && <Badge variant="outline" className="text-[8px] bg-emerald-50 text-emerald-700">Contract</Badge>}{lead.invoice && <Badge variant="outline" className="text-[8px] bg-blue-50 text-blue-700">Invoice</Badge>}</div></div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {activeTab === 'analytics' && (
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
                            <div className="w-24 text-[10px] truncate">{s.label}</div>
                            <div className="flex-1 h-4 bg-muted rounded relative overflow-hidden"><div className={`h-full bg-${s.color}-500`} style={{ width: `${Math.max(2, (count / leads.length) * 100)}%` }} /></div>
                            <span className="text-[10px] font-bold w-6 text-right">{count}</span>
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
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-background border-l shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between z-10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                {slideOutView === 'estimate' ? <><Calculator className="h-4 w-4 text-blue-600" /> Estimate</> : <><FileText className="h-4 w-4 text-emerald-600" /> Proposal</>}
                <span className="text-muted-foreground font-normal">· {selectedLead.name}</span>
              </h3>
              <div className="flex items-center gap-1">
                {slideOutView === 'estimate' && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSlideOutView('proposal')}>Proposal →</Button>}
                {slideOutView === 'proposal' && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSlideOutView('estimate')}>← Estimate</Button>}
                <Button variant="ghost" size="sm" className="p-1.5" onClick={() => setSlideOutView(null)}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="p-3">
              <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></div>}>
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

function MessageBubble({ message }: { message: Message }) {
  if (message.type === 'system') {
    return <div className="flex justify-center"><div className="px-3 py-1 bg-muted/50 rounded-full text-[10px] text-muted-foreground text-center max-w-[85%]">{message.body}</div></div>;
  }
  const isCustomer = message.type === 'customer';
  const isAI = message.type === 'ai';
  const isAgent = message.type === 'agent';
  const bg = isCustomer ? 'bg-blue-600 text-white rounded-br-sm' : isAI ? 'bg-violet-100 dark:bg-violet-950/40 text-violet-900 dark:text-violet-100 rounded-bl-sm' : isAgent ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 rounded-bl-sm' : 'bg-muted text-foreground rounded-bl-sm';
  const label = isCustomer ? 'You' : isAI ? 'AI Assistant' : isAgent ? 'AI Agent' : 'Consultant';
  const Icon = isCustomer ? User : isAI ? Sparkles : isAgent ? Bot : MessageSquare;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isCustomer ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`flex items-center gap-1 text-[10px] ${isCustomer ? 'flex-row-reverse' : ''}`}>
          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-muted-foreground font-medium">{label}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{new Date(message.timestamp).toLocaleString('en-IE', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        <div className={`rounded-2xl px-4 py-2.5 ${bg}`}>
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Users; color: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-center gap-2 mb-1"><div className={`p-1 rounded bg-${color}-100 dark:bg-${color}-950/40`}><Icon className={`h-3 w-3 text-${color}-700 dark:text-${color}-300`} /></div><span className="text-[10px] text-muted-foreground">{label}</span></div>
      <div className="text-lg font-bold">{value}</div>
    </CardContent></Card>
  );
}
