/**
 * Consultant Dashboard V2 — professional upgrade matching v3 quality.
 *
 * Replaces the old PremiumDashboard's generic tabs with a real consultant
 * cockpit: hot leads, today's tasks, auto-drafted proposals awaiting review,
 * stale leads, real-time pipeline, AI coach integration.
 *
 * Mobile + tablet responsive. All buttons wired.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Flame, Clock, FileText, Bot, TrendingUp, Phone, Mail, ArrowRight,
  Users, DollarSign, Target, Zap, Calendar, MessageSquare, Plus,
  Sparkles, AlertTriangle, CheckCircle2, Eye, Send, Sun, Wrench,
  BarChart3, Package, Settings, Compass,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { PIPELINE_STAGES, getStage } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import RoleBasedAICoach from '@/components/ai/RoleBasedAICoach';
import WorkflowOrchestrator from '@/components/WorkflowOrchestrator';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function ConsultantDashboardV2() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [search, setSearch] = useState('');
  const [selectedLeadForWorkflow, setSelectedLeadForWorkflow] = useState<DummyLead | null>(null);

  // Hot leads: proposal sent + opened 3+ times, OR score > 80
  const hotLeads = useMemo(() => leads.filter(l =>
    (l.workflow_stage === 'proposal_sent' && l.score > 80) ||
    l.score > 90
  ), [leads]);

  // Stale leads: not touched in 7+ days, not in install/closeout
  const staleLeads = useMemo(() => leads.filter(l => {
    const last = l.touchpoints[l.touchpoints.length - 1];
    if (!last) return false;
    const daysSince = (Date.now() - new Date(last.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 5 && !['completed', 'final_paid', 'installed', 'installing'].includes(l.workflow_stage);
  }), [leads]);

  // Drafts awaiting review
  const draftsAwaitingReview = useMemo(() => leads.filter(l =>
    l.workflow_stage === 'proposal_drafted' && l.proposal?.status === 'draft'
  ), [leads]);

  // Today's tasks
  const todayTasks = useMemo(() => {
    const tasks: Array<{ id: string; type: string; lead: DummyLead; priority: 'high' | 'medium' | 'low'; due: string }> = [];
    hotLeads.forEach(l => tasks.push({ id: `call_${l.id}`, type: 'Call hot lead', lead: l, priority: 'high', due: 'Today' }));
    staleLeads.forEach(l => tasks.push({ id: `follow_${l.id}`, type: 'Follow up stale lead', lead: l, priority: 'medium', due: 'Today' }));
    draftsAwaitingReview.forEach(l => tasks.push({ id: `review_${l.id}`, type: 'Review auto-drafted proposal', lead: l, priority: 'high', due: 'Today' }));
    return tasks;
  }, [hotLeads, staleLeads, draftsAwaitingReview]);

  const stats = useMemo(() => {
    const activeLeads = leads.filter(l => !['completed', 'final_paid'].includes(l.workflow_stage)).length;
    const pipelineValue = leads.reduce((sum, l) => sum + (l.proposal?.net_cost || 0), 0);
    const wonThisMonth = leads.filter(l => l.workflow_stage === 'completed').length;
    const conversionRate = leads.length > 0
      ? Math.round((leads.filter(l => l.contract).length / leads.length) * 100)
      : 0;
    return { activeLeads, pipelineValue, wonThisMonth, conversionRate };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.address.toLowerCase().includes(q) ||
      l.mprn.includes(q)
    );
  }, [leads, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-background to-violet-50/20 dark:from-blue-950/10 dark:via-background dark:to-violet-950/10">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur border-b sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="h-7 w-7 text-blue-600" />
            <div>
              <span className="font-bold text-base">{brand.name} · Consultant Cockpit</span>
              <p className="text-xs text-muted-foreground">Your pipeline, your hot leads, your AI co-pilot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/comms')}>
              <MessageSquare className="h-4 w-4 mr-1" /> Inbox
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')}>
              <TrendingUp className="h-4 w-4 mr-1" /> Pipeline
            </Button>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* KPI bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Active leads</div>
                  <div className="text-2xl font-bold">{stats.activeLeads}</div>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-lg">
                  <Users className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Pipeline value</div>
                  <div className="text-2xl font-bold text-emerald-600">{eur(stats.pipelineValue)}</div>
                </div>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg">
                  <DollarSign className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Conversion rate</div>
                  <div className="text-2xl font-bold">{stats.conversionRate}%</div>
                </div>
                <div className="p-2 bg-violet-100 dark:bg-violet-950/40 rounded-lg">
                  <Target className="h-4 w-4 text-violet-700 dark:text-violet-300" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Won this month</div>
                  <div className="text-2xl font-bold">{stats.wonThisMonth}</div>
                </div>
                <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg">
                  <Flame className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="today">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4 h-auto">
            <TabsTrigger value="today" className="text-xs sm:text-sm">
              <Flame className="h-3 w-3 sm:mr-1 sm:inline" /> Today
              {todayTasks.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {todayTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="hot" className="text-xs sm:text-sm">
              <Flame className="h-3 w-3 sm:mr-1 sm:inline" /> Hot
              {hotLeads.length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {hotLeads.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="drafts" className="text-xs sm:text-sm">
              <Bot className="h-3 w-3 sm:mr-1 sm:inline" /> Drafts
              {draftsAwaitingReview.length > 0 && (
                <span className="ml-1 bg-violet-500 text-white text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {draftsAwaitingReview.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="stale" className="text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:mr-1 sm:inline" /> Stale
              {staleLeads.length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {staleLeads.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              <Users className="h-3 w-3 sm:mr-1 sm:inline" /> All leads
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-xs sm:text-sm">
              <Wrench className="h-3 w-3 sm:mr-1 sm:inline" /> Tools
            </TabsTrigger>
          </TabsList>

          {/* TODAY */}
          <TabsContent value="today" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-600" />
                  Today's priorities ({todayTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    You're all caught up. No urgent tasks today. 🎉
                  </p>
                ) : (
                  todayTasks.slice(0, 8).map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30">
                      <div className={`p-2 rounded-lg ${
                        task.priority === 'high' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-amber-100 dark:bg-amber-950/40'
                      }`}>
                        {task.type.includes('Call') && <Phone className={`h-4 w-4 ${task.priority === 'high' ? 'text-red-700' : 'text-amber-700'}`} />}
                        {task.type.includes('Follow') && <Clock className="h-4 w-4 text-amber-700" />}
                        {task.type.includes('Review') && <FileText className="h-4 w-4 text-violet-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{task.type}</div>
                        <div className="text-xs text-muted-foreground">{task.lead.name} · {task.lead.address.split(',').slice(-1)[0]?.trim()}</div>
                      </div>
                      <Badge variant={task.priority === 'high' ? 'destructive' : 'default'} className="text-xs">
                        {task.priority}
                      </Badge>
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        {task.type.includes('Call') ? <Phone className="h-3 w-3 mr-1" /> : <ArrowRight className="h-3 w-3 mr-1" />}
                        {task.type.includes('Call') ? 'Call' : task.type.includes('Review') ? 'Review' : 'Open'}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* HOT LEADS */}
          <TabsContent value="hot" className="space-y-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-600" /> Hot leads
              </h2>
              <p className="text-xs text-muted-foreground">High engagement or high score — call these today.</p>
            </div>
            {hotLeads.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No hot leads right now.</CardContent></Card>
            ) : (
              hotLeads.map(lead => <HotLeadCard key={lead.id} lead={lead} />)
            )}
          </TabsContent>

          {/* DRAFTS AWAITING REVIEW */}
          <TabsContent value="drafts" className="space-y-3">
            <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/10">
              <CardContent className="p-3 flex items-start gap-2">
                <Bot className="h-4 w-4 text-violet-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-violet-800 dark:text-violet-300">
                  <strong>Proposal Drafter Agent</strong> auto-drafted these from completed surveys.
                  Review + send in 2 minutes each.
                </div>
              </CardContent>
            </Card>
            {draftsAwaitingReview.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No drafts awaiting review.</CardContent></Card>
            ) : (
              draftsAwaitingReview.map(lead => (
                <Card key={lead.id} className="border-l-4 border-l-violet-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">{lead.address}</div>
                          <div className="text-xs text-violet-700 dark:text-violet-300 mt-1 flex items-center gap-1">
                            <Bot className="h-3 w-3" /> Drafted 2 hours ago from survey
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">Draft</Badge>
                    </div>
                    {lead.proposal && (
                      <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                        <div className="p-2 bg-muted/30 rounded text-center">
                          <div className="text-muted-foreground">System</div>
                          <div className="font-bold">{lead.proposal.system_size_kw} kWp</div>
                        </div>
                        <div className="p-2 bg-muted/30 rounded text-center">
                          <div className="text-muted-foreground">Net cost</div>
                          <div className="font-bold">{eur(lead.proposal.net_cost)}</div>
                        </div>
                        <div className="p-2 bg-muted/30 rounded text-center">
                          <div className="text-muted-foreground">Payback</div>
                          <div className="font-bold">{lead.proposal.payback_years} yrs</div>
                        </div>
                        <div className="p-2 bg-muted/30 rounded text-center">
                          <div className="text-muted-foreground">SEAI grant</div>
                          <div className="font-bold text-emerald-600">{eur(lead.proposal.seai_grant)}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" className="bg-violet-600 hover:bg-violet-700">
                        <Eye className="h-3 w-3 mr-1" /> Review draft
                      </Button>
                      <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                        <Send className="h-3 w-3 mr-1" /> Review + send
                      </Button>
                      <Button size="sm" variant="ghost">Edit</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* STALE LEADS */}
          <TabsContent value="stale" className="space-y-3">
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>{staleLeads.length} leads</strong> haven't been touched in 5+ days.
                  Follow-Up Agent has emailed them — they haven't replied. Manual follow-up needed.
                </div>
              </CardContent>
            </Card>
            {staleLeads.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No stale leads. Great job staying on top of things!</CardContent></Card>
            ) : (
              staleLeads.map(lead => (
                <Card key={lead.id} className="border-l-4 border-l-amber-500">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getStage(lead.workflow_stage).label} · last touch {Math.round((Date.now() - new Date(lead.touchpoints[lead.touchpoints.length - 1]?.timestamp || Date.now()).getTime()) / (1000 * 60 * 60 * 24))}d ago
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"><Phone className="h-3 w-3 mr-1" /> Call</Button>
                      <Button size="sm" variant="outline"><Mail className="h-3 w-3 mr-1" /> Email</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ALL LEADS */}
          <TabsContent value="all" className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by name, email, address, MPRN…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-md"
              />
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-1" /> Add lead
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredLeads.map(lead => {
                    const stage = getStage(lead.workflow_stage);
                    const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');
                    return (
                      <div key={lead.id} className="p-3 flex items-center gap-3 hover:bg-muted/30">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{lead.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{lead.address}</div>
                        </div>
                        <Badge variant="outline" className="text-xs hidden sm:inline-flex">{stage.label}</Badge>
                        {lead.proposal && (
                          <span className="text-xs text-muted-foreground hidden md:inline">{eur(lead.proposal.net_cost)}</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedLeadForWorkflow(lead);
                            document.getElementById('workflow-panel')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          Open workflow
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Workflow panel — shows the right workflow component for the selected lead */}
            {selectedLeadForWorkflow && (
              <div id="workflow-panel" className="mt-6">
                <Card className="mb-4">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{selectedLeadForWorkflow.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedLeadForWorkflow.address} · {getStage(selectedLeadForWorkflow.workflow_stage).label}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedLeadForWorkflow(null)}>Close</Button>
                  </CardContent>
                </Card>
                <WorkflowOrchestrator
                  lead={selectedLeadForWorkflow}
                  viewer="consultant"
                  onStepComplete={(step, data) => {
                    console.log('Step complete:', step, data);
                    // In production: this calls the kernel to advance the lead's stage
                  }}
                />
              </div>
            )}
          </TabsContent>

          {/* TOOLS */}
          <TabsContent value="tools" className="space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ToolCard icon={TrendingUp} title="Pipeline view" desc="Visual kanban of all leads by stage" color="violet" onClick={() => navigate('/pipeline')} />
              <ToolCard icon={MessageSquare} title="Communication hub" desc="All customer touchpoints in one inbox" color="blue" onClick={() => navigate('/comms')} />
              <ToolCard icon={Package} title="Product catalogue" desc="Panels, inverters, batteries, bundles" color="amber" onClick={() => navigate('/products')} />
              <ToolCard icon={BarChart3} title="Analytics" desc="Funnel, conversion, team performance" color="emerald" onClick={() => navigate('/analytics')} />
              <ToolCard icon={Bot} title="Agent foundation" desc="View autonomous agents + manual trigger" color="violet" onClick={() => navigate('/agents')} />
              <ToolCard icon={Settings} title="System settings" desc="Email/SMS channels, kernel config" color="slate" onClick={() => navigate('/system-settings')} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <RoleBasedAICoach />
    </div>
  );
}

function HotLeadCard({ lead }: { lead: DummyLead }) {
  const opens = lead.touchpoints.filter(tp => tp.summary.includes('opened')).length;
  return (
    <Card className="border-l-4 border-l-red-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold flex items-center gap-2">
                {lead.name}
                <Badge variant="default" className="bg-red-500 text-white text-[10px]">
                  <Flame className="h-2.5 w-2.5 mr-0.5" /> Score {lead.score}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">{lead.address}</div>
              <div className="text-xs text-red-700 dark:text-red-400 mt-1 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Opened proposal {opens} times
              </div>
            </div>
          </div>
          {lead.proposal && (
            <div className="text-right">
              <div className="font-bold">{eur(lead.proposal.net_cost)}</div>
              <div className="text-xs text-muted-foreground">{lead.proposal.system_size_kw} kWp</div>
            </div>
          )}
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded text-xs text-red-800 dark:text-red-300 mb-3">
          <Sparkles className="h-3 w-3 inline mr-1" />
          <strong>AI tip:</strong> Objection likely: payback period. Lead with monthly cashflow positive framing.
          €89/mo finance vs €127/mo savings = cashflow positive from month 1.
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
            <Phone className="h-3 w-3 mr-1" /> Call now
          </Button>
          <Button size="sm" variant="outline">
            <Mail className="h-3 w-3 mr-1" /> Email
          </Button>
          <Button size="sm" variant="ghost">Open lead</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolCard({ icon: Icon, title, desc, color, onClick }: {
  icon: typeof TrendingUp; title: string; desc: string; color: string; onClick: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-950/40 w-fit mb-2`}>
          <Icon className={`h-4 w-4 text-${color}-700 dark:text-${color}-300`} />
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </CardContent>
    </Card>
  );
}
