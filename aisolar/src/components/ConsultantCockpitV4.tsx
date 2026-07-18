/**
 * Consultant Cockpit V4 — header tabs for everything the consultant does.
 *
 * 12 tabs across the header:
 *   Leads · Chats · Estimates · Surveys · Proposals · Installations ·
 *   Calendar · Follow-ups · Products · Documents · Analytics
 *
 * Each tab shows consultant-specific data filtered to their leads.
 * Clicking a lead anywhere opens the conversation or LeadFlow.
 */

import { useState, useMemo, lazy, Suspense } from 'react';
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
  Building2, Sun, MapPin, Navigation, Download, Send,
} from 'lucide-react';
import { generateDummyLeads, computePipelineStats, type DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES, calculateSystemEstimate } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import RoleBasedAICoach from '@/components/ai/RoleBasedAICoach';

const EstimateView = lazy(() => import('./EstimateView'));
const ProposalView = lazy(() => import('./ProposalView'));
const ProfessionalProducts = lazy(() => import('./ProfessionalProducts'));
const UnifiedCalendar = lazy(() => import('./UnifiedCalendar'));

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type TabId = 'leads' | 'chats' | 'estimates' | 'surveys' | 'proposals' | 'installations' | 'calendar' | 'followups' | 'products' | 'documents' | 'analytics';

const TABS: Array<{ id: TabId; label: string; icon: typeof Users }> = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'estimates', label: 'Estimates', icon: Calculator },
  { id: 'surveys', label: 'Surveys', icon: Camera },
  { id: 'proposals', label: 'Proposals', icon: FileText },
  { id: 'installations', label: 'Installations', icon: Wrench },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'followups', label: 'Follow-ups', icon: Clock },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function ConsultantCockpitV4() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [activeTab, setActiveTab] = useState<TabId>('leads');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<DummyLead | null>(null);
  const [slideOutView, setSlideOutView] = useState<'estimate' | 'proposal' | 'chat' | null>(null);

  const stats = useMemo(() => computePipelineStats(leads), [leads]);

  const filteredLeads = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) ||
      l.address.toLowerCase().includes(q) || l.mprn.includes(q)
    );
  }, [leads, search]);

  // Lead subsets per tab
  const surveyLeads = leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage));
  const proposalLeads = leads.filter(l => ['proposal_drafted', 'proposal_sent'].includes(l.workflow_stage));
  const installLeads = leads.filter(l => ['install_scheduled', 'installing', 'installed'].includes(l.workflow_stage));
  const staleLeads = leads.filter(l => {
    const last = l.touchpoints[l.touchpoints.length - 1];
    if (!last) return false;
    return (Date.now() - new Date(last.timestamp).getTime()) > 5 * 86400000
      && !['completed', 'final_paid', 'installed', 'installing'].includes(l.workflow_stage);
  });
  const hotLeads = leads.filter(l => l.score > 80);

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
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/owner')}>
              <Building2 className="h-3.5 w-3.5 mr-1" /> Owner
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/installer')}>
              <Wrench className="h-3.5 w-3.5 mr-1" /> Installer
            </Button>
            <DarkModeToggle />
          </div>
        </div>

        {/* 11 tabs */}
        <div className="flex gap-0.5 px-2 pb-1.5 overflow-x-auto scrollbar-thin">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count =
              tab.id === 'leads' ? leads.length :
              tab.id === 'surveys' ? surveyLeads.length :
              tab.id === 'proposals' ? proposalLeads.length :
              tab.id === 'installations' ? installLeads.length :
              tab.id === 'followups' ? staleLeads.length :
              tab.id === 'chats' ? hotLeads.length : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={`text-[9px] px-1 rounded-full ${isActive ? 'bg-white/20' : 'bg-muted-foreground/15'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* === LEADS === */}
            {activeTab === 'leads' && (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate('/lead-flow')}>
                    <Zap className="h-3 w-3 mr-1" /> New lead flow
                  </Button>
                </div>
                {filteredLeads.map(lead => <LeadRow key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setSlideOutView('chat'); }} />)}
              </div>
            )}

            {/* === CHATS === */}
            {activeTab === 'chats' && (
              <div className="p-3 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hot conversations — {hotLeads.length} leads needing attention</h3>
                {hotLeads.map(lead => (
                  <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelectedLead(lead); setSlideOutView('chat'); }}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{lead.name}</span>
                          <Flame className="h-3 w-3 text-red-500" />
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{lead.touchpoints[lead.touchpoints.length - 1]?.summary || 'No messages'}</div>
                      </div>
                      <Badge variant="outline" className="text-[9px]">{getStage(lead.workflow_stage).label}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
                {hotLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hot conversations right now.</p>}
              </div>
            )}

            {/* === ESTIMATES === */}
            {activeTab === 'estimates' && (
              <div className="p-3 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Estimates — {leads.length} leads</h3>
                {leads.map(lead => {
                  const estimate = calculateSystemEstimate({ monthlyBill: lead.monthly_bill, annualKwh: lead.annual_kwh });
                  return (
                    <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelectedLead(lead); setSlideOutView('estimate'); }}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{lead.name}</span>
                          <div className="text-xs text-muted-foreground">€{lead.monthly_bill}/mo · {estimate.systemSizeKw}kWp · {eur(estimate.annualSavings)}/yr</div>
                        </div>
                        <Badge variant="outline" className="text-[9px] text-amber-600">{estimate.systemSizeKw} kWp</Badge>
                        <Badge variant="outline" className="text-[9px] text-emerald-600">{eur(estimate.annualSavings)}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* === SURVEYS === */}
            {activeTab === 'surveys' && (
              <div className="p-3 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Surveys — {surveyLeads.length} pending</h3>
                {surveyLeads.map(lead => (
                  <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate('/lead-flow')}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-950/40 rounded-lg"><Camera className="h-4 w-4 text-indigo-600" /></div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{lead.name}</span>
                        <div className="text-xs text-muted-foreground">{lead.address.split(',').slice(-1)[0]?.trim()} · {lead.survey?.photo_count || 0}/8 photos</div>
                      </div>
                      <Badge variant="outline" className="text-[9px]">{getStage(lead.workflow_stage).label}</Badge>
                      <Progress value={((lead.survey?.photo_count || 0) / 8) * 100} className="h-1.5 w-16" />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
                {surveyLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No surveys pending.</p>}
              </div>
            )}

            {/* === PROPOSALS === */}
            {activeTab === 'proposals' && (
              <div className="p-3 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Proposals — {proposalLeads.length} active</h3>
                {proposalLeads.map(lead => (
                  <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelectedLead(lead); setSlideOutView('proposal'); }}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="p-2 bg-violet-100 dark:bg-violet-950/40 rounded-lg"><FileText className="h-4 w-4 text-violet-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{lead.name}</span>
                          <Badge variant="outline" className="text-[9px]">{lead.proposal?.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{lead.proposal?.system_size_kw}kWp · {eur(lead.proposal?.net_cost || 0)} · {lead.proposal?.payback_years}yr payback</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
                {proposalLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active proposals.</p>}
              </div>
            )}

            {/* === INSTALLATIONS === */}
            {activeTab === 'installations' && (
              <div className="p-3 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Installations — {installLeads.length} active</h3>
                {installLeads.map(lead => (
                  <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate('/job')}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg"><Wrench className="h-4 w-4 text-amber-600" /></div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{lead.name}</span>
                        <div className="text-xs text-muted-foreground">{lead.proposal?.system_size_kw}kWp · {lead.assignment?.installer_name} · {lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE') : 'TBD'}</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] capitalize">{lead.assignment?.status}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
                {installLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active installations.</p>}
              </div>
            )}

            {/* === CALENDAR === */}
            {activeTab === 'calendar' && (
              <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></div>}>
                <UnifiedCalendar filterRole="consultant" />
              </Suspense>
            )}

            {/* === FOLLOW-UPS === */}
            {activeTab === 'followups' && (
              <div className="p-3 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600" /> Follow-ups — {staleLeads.length} stale leads (5+ days)
                </h3>
                {staleLeads.map(lead => {
                  const last = lead.touchpoints[lead.touchpoints.length - 1];
                  const daysSince = last ? Math.round((Date.now() - new Date(last.timestamp).getTime()) / 86400000) : 0;
                  return (
                    <Card key={lead.id} className="cursor-pointer hover:shadow-md border-l-4 border-l-amber-500" onClick={() => { setSelectedLead(lead); setSlideOutView('chat'); }}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{lead.name}</span>
                          <div className="text-xs text-muted-foreground">{getStage(lead.workflow_stage).label} · {daysSince}d since last contact</div>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                          <a href={`tel:${lead.phone}`}><Phone className="h-3 w-3 mr-1" /> Call</a>
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                          <a href={`mailto:${lead.email}`}><Mail className="h-3 w-3 mr-1" /> Email</a>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
                {staleLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">All caught up — no stale leads!</p>}
              </div>
            )}

            {/* === PRODUCTS === */}
            {activeTab === 'products' && (
              <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></div>}>
                <ProfessionalProducts />
              </Suspense>
            )}

            {/* === DOCUMENTS === */}
            {activeTab === 'documents' && (
              <div className="p-3 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documents — proposals, contracts, invoices</h3>
                {leads.filter(l => l.proposal || l.contract || l.invoice).map(lead => (
                  <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelectedLead(lead); setSlideOutView('proposal'); }}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{lead.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lead.proposal && <Badge variant="outline" className="text-[8px]">Proposal</Badge>}
                          {lead.contract && <Badge variant="outline" className="text-[8px] bg-emerald-50 text-emerald-700">Contract</Badge>}
                          {lead.invoice && <Badge variant="outline" className="text-[8px] bg-blue-50 text-blue-700">Invoice</Badge>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* === ANALYTICS === */}
            {activeTab === 'analytics' && (
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatBox label="Active leads" value={String(stats.activeLeads)} icon={Users} color="blue" />
                  <StatBox label="Pipeline value" value={eur(stats.totalValue)} icon={DollarSign} color="emerald" />
                  <StatBox label="Conversion" value={`${Math.round((leads.filter(l => l.contract).length / leads.length) * 100)}%`} icon={TrendingUp} color="violet" />
                  <StatBox label="Stale" value={String(stats.staleLeads)} icon={Clock} color="amber" />
                </div>
                <Card>
                  <CardContent className="p-3">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Pipeline by stage</h4>
                    <div className="space-y-1">
                      {PIPELINE_STAGES.map(s => {
                        const count = leads.filter(l => l.workflow_stage === s.id).length;
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <div className="w-24 text-[10px] truncate">{s.label}</div>
                            <div className="flex-1 h-4 bg-muted rounded relative overflow-hidden">
                              <div className={`h-full bg-${s.color}-500`} style={{ width: `${Math.max(2, (count / leads.length) * 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-bold w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/analytics')}>
                  Full analytics <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide-out panel for estimate / proposal / chat */}
      <AnimatePresence>
        {slideOutView && selectedLead && (
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-background border-l shadow-2xl z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between z-10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                {slideOutView === 'estimate' && <><Calculator className="h-4 w-4 text-blue-600" /> Estimate</>}
                {slideOutView === 'proposal' && <><FileText className="h-4 w-4 text-emerald-600" /> Proposal</>}
                {slideOutView === 'chat' && <><MessageSquare className="h-4 w-4 text-violet-600" /> Conversation</>}
                <span className="text-muted-foreground font-normal">· {selectedLead.name}</span>
              </h3>
              <div className="flex items-center gap-1">
                {slideOutView === 'estimate' && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSlideOutView('proposal')}>Proposal →</Button>}
                {slideOutView === 'proposal' && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSlideOutView('estimate')}>← Estimate</Button>}
                {slideOutView !== 'chat' && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSlideOutView('chat')}>Chat</Button>}
                <Button variant="ghost" size="sm" className="p-1.5" onClick={() => setSlideOutView(null)}>✕</Button>
              </div>
            </div>
            <div className="p-3">
              <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></div>}>
                {slideOutView === 'estimate' && <EstimateView lead={selectedLead} onOpenProposal={() => setSlideOutView('proposal')} />}
                {slideOutView === 'proposal' && <ProposalView lead={selectedLead} />}
                {slideOutView === 'chat' && <ChatPreview lead={selectedLead} onOpenFlow={() => navigate('/lead-flow')} />}
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RoleBasedAICoach />
    </div>
  );
}

// ============= LEAD ROW =============
function LeadRow({ lead, onClick }: { lead: DummyLead; onClick: () => void }) {
  const stage = getStage(lead.workflow_stage);
  const lastTouch = lead.touchpoints[lead.touchpoints.length - 1];
  return (
    <Card className="cursor-pointer hover:shadow-sm" onClick={onClick}>
      <CardContent className="p-2.5 flex items-center gap-3">
        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{lead.name}</span>
            {lead.score > 80 && <Flame className="h-3 w-3 text-red-500" />}
          </div>
          <div className="text-xs text-muted-foreground truncate">{lastTouch?.summary || lead.address.split(',').slice(-1)[0]?.trim()}</div>
        </div>
        <Badge variant="outline" className={`text-[9px] bg-${stage.color}-50 text-${stage.color}-700 border-${stage.color}-200`}>{stage.label}</Badge>
        {lead.proposal && <span className="text-[10px] text-muted-foreground">{eur(lead.proposal.net_cost)}</span>}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

// ============= CHAT PREVIEW =============
function ChatPreview({ lead, onOpenFlow }: { lead: DummyLead; onOpenFlow: () => void }) {
  return (
    <div className="space-y-2">
      {/* Quick actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" asChild>
          <a href={`tel:${lead.phone}`}><Phone className="h-3 w-3 mr-1" /> Call</a>
        </Button>
        <Button size="sm" variant="outline" className="flex-1" asChild>
          <a href={`mailto:${lead.email}`}><Mail className="h-3 w-3 mr-1" /> Email</a>
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={onOpenFlow}>
          <Zap className="h-3 w-3 mr-1" /> Flow
        </Button>
      </div>

      {/* Touchpoint timeline */}
      <Card>
        <CardContent className="p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Touchpoints ({lead.touchpoints.length})</h4>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {lead.touchpoints.map((tp, i) => (
              <div key={i} className="flex items-start gap-2 p-2 border rounded text-xs">
                <Badge variant="outline" className="text-[8px] flex-shrink-0">{tp.channel}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground">{tp.summary}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    {tp.actor} · {new Date(tp.timestamp).toLocaleString('en-IE', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lead details */}
      <Card>
        <CardContent className="p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Phone:</span> {lead.phone}</div>
          <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> {lead.email}</div>
          <div className="flex justify-between"><span className="text-muted-foreground">Address:</span> {lead.address}</div>
          <div className="flex justify-between"><span className="text-muted-foreground">MPRN:</span> <span className="font-mono">{lead.mprn}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Score:</span> <span className="font-bold">{lead.score}/100</span></div>
          {lead.proposal && (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">System:</span> {lead.proposal.system_size_kw}kWp</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Net cost:</span> {eur(lead.proposal.net_cost)}</div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============= STAT BOX =============
function StatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Users; color: string }) {
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
      </CardContent>
    </Card>
  );
}
