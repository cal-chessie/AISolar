/**
 * Customer Mobile Portal
 *
 * Mobile-first customer experience with:
 *   - Vertical timeline of all stages (intake → survey → proposal → contract → install → closeout)
 *   - All touchpoints (emails, SMS, portal views, calls) in one feed
 *   - Downloadable paperwork (proposal PDF, contract, invoice, warranty, SEAI docs)
 *   - AI chat widget for instant answers
 *   - Clear "what happens next" + "what you need to do" CTAs
 *
 * Designed mobile-first (320px → 768px), tablet-friendly (768px → 1024px).
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sun, FileText, CreditCard, Award, Calendar, CheckCircle2, Clock,
  AlertCircle, ArrowRight, ArrowLeft, Download, MessageSquare, Send,
  Phone, Mail, MapPin, ChevronDown, ChevronUp, Sparkles, Loader2, Zap,
  Shield,
} from 'lucide-react';
import { calculateSystemEstimate, PIPELINE_STAGES, getStage } from '@/lib/leadIntake';
import { calculateSEAI, eur } from '@/lib/seaiPipeline';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { brand } from '@/config/brand';
import WorkflowOrchestrator from '@/components/WorkflowOrchestrator';
import { CookieConsentBanner, DataSubjectRightsPanel } from '@/lib/gdpr';

export default function CustomerMobilePortal() {
  const [lead] = useState<DummyLead>(() => {
    const leads = generateDummyLeads();
    // Use the "approved" lead (signed contract, invoice pending) — best demo
    return leads.find(l => l.workflow_stage === 'approved') || leads[0];
  });
  const [activeTab, setActiveTab] = useState<'timeline' | 'paperwork' | 'chat' | 'action' | 'rights'>('timeline');
  const [showBooking, setShowBooking] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/20 dark:via-background dark:to-blue-950/20">
      {/* Mobile-optimised header */}
      <header className="bg-background/95 backdrop-blur border-b sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-7 w-7 text-emerald-600" />
              <div>
                <div className="font-bold text-base leading-tight">{brand.name}</div>
                <div className="text-[10px] text-muted-foreground">My Solar Project</div>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              {getStage(lead.workflow_stage).label}
            </Badge>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${getStageProgress(lead.workflow_stage)}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </header>

      <main className="pb-24">
        {/* Hero card: your project at a glance */}
        <section className="px-4 py-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-xl font-bold leading-tight">{lead.name}'s Solar</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {lead.address.split(',').slice(-2).join(',').trim()}
                  </p>
                </div>
                {lead.proposal && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      {lead.proposal.system_size_kw} kWp
                    </div>
                    <div className="text-[10px] text-muted-foreground">{lead.proposal.panel_count} panels</div>
                  </div>
                )}
              </div>

              {lead.proposal && (
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div className="p-2 bg-background/60 rounded-lg">
                    <div className="text-xs text-muted-foreground">Annual savings</div>
                    <div className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      {eur(lead.proposal.annual_savings)}
                    </div>
                  </div>
                  <div className="p-2 bg-background/60 rounded-lg">
                    <div className="text-xs text-muted-foreground">Net cost</div>
                    <div className="font-bold text-sm">{eur(lead.proposal.net_cost)}</div>
                  </div>
                  <div className="p-2 bg-background/60 rounded-lg">
                    <div className="text-xs text-muted-foreground">Payback</div>
                    <div className="font-bold text-sm">{lead.proposal.payback_years} yrs</div>
                  </div>
                </div>
              )}

              {/* SEAI grant badge */}
              {lead.proposal && (
                <div className="mt-3 p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg flex items-center gap-2 text-xs">
                  <Award className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  <span className="text-emerald-800 dark:text-emerald-200">
                    <strong>{eur(lead.proposal.seai_grant)}</strong> SEAI grant included · paperwork in progress
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* What happens next — sticky CTA */}
        <section className="px-4 mb-4">
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">What we need from you</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getNextAction(lead)}
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 bg-amber-600 hover:bg-amber-700 text-white h-9"
                    onClick={() => setShowBooking(true)}
                  >
                    {getNextActionCta(lead)} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tab navigation — mobile bottom nav style */}
        <nav className="sticky top-[57px] z-20 bg-background/95 backdrop-blur border-b">
          <div className="grid grid-cols-5 gap-1 p-2">
            {[
              { id: 'timeline' as const, label: 'Timeline', icon: Calendar },
              { id: 'paperwork' as const, label: 'Docs', icon: FileText },
              { id: 'action' as const, label: 'Action', icon: ArrowRight },
              { id: 'chat' as const, label: 'Ask AI', icon: Sparkles },
              { id: 'rights' as const, label: 'My data', icon: Shield },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors min-h-[48px] ${
                    isActive ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <TimelineTab lead={lead} />
            </motion.div>
          )}
          {activeTab === 'paperwork' && (
            <motion.div
              key="paperwork"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PaperworkTab lead={lead} />
            </motion.div>
          )}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ChatTab lead={lead} />
            </motion.div>
          )}
          {activeTab === 'action' && (
            <motion.div
              key="action"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 py-4"
            >
              <h2 className="text-lg font-bold mb-1">Your next step</h2>
              <p className="text-xs text-muted-foreground mb-4">
                The workflow orchestrator shows what you need to do right now and what happens next.
              </p>
              <WorkflowOrchestrator
                lead={lead}
                viewer="customer"
                onStepComplete={(step, data) => {
                  console.log('Customer step complete:', step, data);
                }}
              />
            </motion.div>
          )}
          {activeTab === 'rights' && (
            <motion.div
              key="rights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 py-4"
            >
              <h2 className="text-lg font-bold mb-1">Your data, your rights</h2>
              <p className="text-xs text-muted-foreground mb-4">
                GDPR-compliant. Access, export, or erase your data anytime.
              </p>
              <DataSubjectRightsPanel userEmail={lead.email} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* GDPR cookie consent banner — shows on first visit */}
      <CookieConsentBanner />

      {showBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowBooking(false)}>
          <div className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Book a call</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowBooking(false)}>Close</Button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Talk to your solar consultant about your project. 30-minute video call.
            </p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Calendar className="h-4 w-4 mr-2" /> Pick a time
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function getStageProgress(stage: string): number {
  const idx = PIPELINE_STAGES.findIndex(s => s.id === stage);
  if (idx === -1) return 0;
  return Math.round((idx / (PIPELINE_STAGES.length - 1)) * 100);
}

function getNextAction(lead: DummyLead): string {
  switch (lead.workflow_stage) {
    case 'new':
    case 'intake_complete':
      return "We've received your bill analysis. Book a 30-min consultation to design your system.";
    case 'survey_scheduled':
      return `Your site survey is scheduled for ${lead.survey?.scheduled_date ? new Date(lead.survey.scheduled_date).toLocaleDateString('en-IE') : 'soon'}. Please ensure roof access is clear.`;
    case 'survey_complete':
    case 'proposal_drafted':
      return "Your proposal is being prepared. We'll email you when it's ready to review.";
    case 'proposal_sent':
      return "Review your proposal and sign the contract to lock in your SEAI grant.";
    case 'approved':
      return "Pay your 30% deposit to schedule installation. SEAI grant paperwork is auto-started.";
    case 'deposit_paid':
    case 'install_scheduled':
      return `Install scheduled for ${lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE') : 'soon'}. Please ensure someone over 18 is home.`;
    case 'installing':
      return "Installation in progress today. The crew will update photos as they go.";
    case 'installed':
      return "Final invoice is ready. Pay to complete the project and trigger SEAI submission.";
    case 'final_paid':
      return "SEAI grant submission in progress. Warranty docs sent. Review request coming in 7 days.";
    case 'completed':
      return "Project complete! Your system is generating solar energy. Leave us a review?";
    default:
      return "Check back soon for updates on your project.";
  }
}

function getNextActionCta(lead: DummyLead): string {
  switch (lead.workflow_stage) {
    case 'new':
    case 'intake_complete': return 'Book consultation';
    case 'proposal_sent': return 'Review proposal';
    case 'approved': return 'Pay deposit';
    case 'installed': return 'Pay final invoice';
    case 'completed': return 'Leave a review';
    default: return 'View details';
  }
}

// ============= TIMELINE TAB =============
function TimelineTab({ lead }: { lead: DummyLead }) {
  const stagesReached = PIPELINE_STAGES.filter(s => {
    const idx = PIPELINE_STAGES.findIndex(p => p.id === s.id);
    const currentIdx = PIPELINE_STAGES.findIndex(p => p.id === lead.workflow_stage);
    return idx <= currentIdx;
  });

  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold mb-4">Project Timeline</h2>
      <div className="space-y-3">
        {stagesReached.map((stage, i) => {
          const isLast = i === stagesReached.length - 1;
          const isCurrent = stage.id === lead.workflow_stage;
          const touchpointsForStage = lead.touchpoints.filter(tp => tp.stage === stage.id);

          return (
            <div key={stage.id} className="relative pl-8">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-3 top-7 bottom-0 w-0.5 bg-border" />
              )}

              {/* Stage dot */}
              <div className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center ${
                isCurrent ? 'bg-emerald-500' : 'bg-emerald-200 dark:bg-emerald-900'
              }`}>
                {isCurrent ? (
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                )}
              </div>

              <div className="pb-4">
                <div className="flex items-baseline justify-between">
                  <h3 className={`font-semibold text-sm ${isCurrent ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                    {stage.label}
                  </h3>
                  {isCurrent && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{stage.automation}</p>

                {/* Touchpoints for this stage */}
                {touchpointsForStage.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {touchpointsForStage.map((tp, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted/40 rounded flex items-start gap-2">
                        {tp.channel === 'email' && <Mail className="h-3 w-3 mt-0.5 text-muted-foreground" />}
                        {tp.channel === 'sms' && <Phone className="h-3 w-3 mt-0.5 text-muted-foreground" />}
                        {tp.channel === 'portal' && <FileText className="h-3 w-3 mt-0.5 text-muted-foreground" />}
                        <div className="flex-1">
                          <div className="text-foreground">{tp.summary}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(tp.timestamp).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming stages */}
      {(() => {
        const currentIdx = PIPELINE_STAGES.findIndex(s => s.id === lead.workflow_stage);
        const upcoming = PIPELINE_STAGES.slice(currentIdx + 1, currentIdx + 4);
        if (upcoming.length === 0) return null;
        return (
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Upcoming</h3>
            <div className="space-y-2">
              {upcoming.map(stage => (
                <div key={stage.id} className="flex items-center gap-2 text-sm opacity-60">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{stage.automation.split(' ').slice(0, 3).join(' ')}…</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ============= PAPERWORK TAB =============
function PaperworkTab({ lead }: { lead: DummyLead }) {
  const docs = [
    {
      id: 'proposal',
      title: 'Solar Proposal',
      desc: 'System design, costs, savings, 20-year cashflow',
      icon: FileText,
      available: !!lead.proposal,
      status: lead.proposal?.status === 'approved' ? 'signed' : 'ready',
      type: 'proposal',
    },
    {
      id: 'contract',
      title: 'Installation Contract',
      desc: 'Terms, payment schedule, warranty',
      icon: FileText,
      available: !!lead.contract,
      status: lead.contract ? 'signed' : 'pending',
      type: 'contract',
    },
    {
      id: 'invoice_deposit',
      title: 'Deposit Invoice (30%)',
      desc: lead.invoice ? `${eur(lead.invoice.deposit_amount)} · ${lead.invoice.invoice_number}` : 'Not yet generated',
      icon: CreditCard,
      available: !!lead.invoice,
      status: lead.invoice?.deposit_paid ? 'paid' : 'pending',
      type: 'invoice',
    },
    {
      id: 'invoice_final',
      title: 'Final Invoice (70%)',
      desc: lead.invoice ? `${eur(lead.invoice.final_amount)} · due after install` : 'Not yet generated',
      icon: CreditCard,
      available: !!lead.invoice,
      status: lead.invoice?.final_paid ? 'paid' : 'pending',
      type: 'invoice',
    },
    {
      id: 'warranty',
      title: 'Warranty Certificate',
      desc: '10-year workmanship + 25-year panel performance',
      icon: Award,
      available: ['installed', 'final_paid', 'completed'].includes(lead.workflow_stage),
      status: ['installed', 'final_paid', 'completed'].includes(lead.workflow_stage) ? 'ready' : 'pending',
      type: 'warranty',
    },
    {
      id: 'seai_pack',
      title: 'SEAI Grant Application',
      desc: 'Full application pack with all required documents',
      icon: Award,
      available: ['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(lead.workflow_stage),
      status: lead.workflow_stage === 'completed' ? 'submitted' : 'in_progress',
      type: 'seai',
    },
  ];

  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold mb-1">Your Paperwork</h2>
      <p className="text-xs text-muted-foreground mb-4">Download, sign, and pay — all in one place.</p>

      <div className="space-y-2">
        {docs.map(doc => {
          const Icon = doc.icon;
          const isAvailable = doc.available;
          return (
            <Card key={doc.id} className={!isAvailable ? 'opacity-60' : ''}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    isAvailable ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-muted'
                  }`}>
                    <Icon className={`h-4 w-4 ${isAvailable ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm">{doc.title}</h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] flex-shrink-0 ${
                          doc.status === 'paid' || doc.status === 'signed' || doc.status === 'submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          doc.status === 'ready' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          doc.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {doc.status === 'paid' ? 'Paid' :
                         doc.status === 'signed' ? 'Signed' :
                         doc.status === 'submitted' ? 'Submitted' :
                         doc.status === 'ready' ? 'Ready' :
                         doc.status === 'in_progress' ? 'In progress' :
                         'Pending'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.desc}</p>
                    {isAvailable && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Download className="h-3 w-3 mr-1" /> Download
                        </Button>
                        {(doc.type === 'invoice' && doc.status === 'pending') && (
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            <CreditCard className="h-3 w-3 mr-1" /> Pay now
                          </Button>
                        )}
                        {(doc.type === 'contract' && doc.status === 'pending') && (
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            Review & sign
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============= AI CHAT TAB =============
function ChatTab({ lead }: { lead: DummyLead }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>>([
    {
      role: 'assistant',
      content: `Hi ${lead.name.split(' ')[0]}! I'm your solar assistant. I can answer questions about your project, the proposal, the grant, or anything else. What would you like to know?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSend = async () => {
    if (!input.trim() || thinking) return;
    const userMsg = { role: 'user' as const, content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // Simulate AI response (would call expert-chat edge function)
    await new Promise(r => setTimeout(r, 800));
    const response = generateAIResponse(input, lead);
    setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date().toISOString() }]);
    setThinking(false);
  };

  const suggestedQuestions = [
    "When will my installation happen?",
    "How much will I save on my bills?",
    "What's the SEAI grant and how do I get it?",
    "What warranty do I get?",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="px-4 py-3 border-b bg-background">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          Ask AI
        </h2>
        <p className="text-xs text-muted-foreground">Instant answers about your solar project</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-sm'
                : 'bg-muted text-foreground rounded-bl-sm'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> AI Assistant
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </motion.div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions (only when conversation is short) */}
      {messages.length <= 2 && !thinking && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestedQuestions.map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); setTimeout(handleSend, 100); }}
              className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-3 border-t bg-background">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Ask about your project…"
            className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:border-emerald-500 min-h-[44px]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || thinking}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-11 w-11 p-0 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function generateAIResponse(question: string, lead: DummyLead): string {
  const q = question.toLowerCase();
  if (q.includes('when') && q.includes('install')) {
    return `Your installation is scheduled based on your deposit payment. Once you pay the 30% deposit (${lead.invoice ? eur(lead.invoice.deposit_amount) : '~€3,000'}), the Install Coordinator Agent will book your install within 4-6 weeks, weather permitting. You'll get an SMS 7 days and 1 day before.`;
  }
  if (q.includes('save') || q.includes('saving') || q.includes('bill')) {
    return lead.proposal
      ? `Based on your ${lead.proposal.system_size_kw} kWp system, you'll save approximately ${eur(lead.proposal.annual_savings)} per year on electricity bills. Over 20 years (accounting for inflation), that's ${eur(lead.proposal.twenty_year_savings)} net of installation cost. Your payback period is ${lead.proposal.payback_years} years.`
      : `We're still preparing your proposal. Based on your bill of €${lead.monthly_bill}/month, you could save €800-1,400/year with solar.`;
  }
  if (q.includes('seai') || q.includes('grant')) {
    return lead.proposal
      ? `Your SEAI Solar Electricity Grant is ${eur(lead.proposal.seai_grant)} (€900/kWp, capped at €1,800). We handle all the paperwork — once your contract is signed, the SEAI Grant Agent auto-starts the application. You don't need to do anything except keep your MPRN handy.`
      : `The SEAI Solar Electricity Grant is €900 per kWp installed, capped at €1,800. For a typical 6kWp system, that's the full €1,800 off. We handle all the paperwork.`;
  }
  if (q.includes('warranty')) {
    return `Your solar system comes with: (1) 10-year workmanship warranty from us, (2) 25-year performance guarantee on the panels (Longi Hi-MO 6), (3) 10-year manufacturer warranty on the inverter (SolarEdge)${lead.proposal?.battery_model ? ', and (4) 10-year warranty on the battery' : ''}. Full warranty docs are in the Paperwork tab after installation.`;
  }
  if (q.includes('pay') || q.includes('deposit')) {
    return lead.invoice
      ? `Your deposit is ${eur(lead.invoice.deposit_amount)} (30% of total). You can pay by card or bank transfer in the Paperwork tab. The remaining ${eur(lead.invoice.final_amount)} (70%) is due after installation is complete.`
      : `Once your contract is signed, you'll get a deposit invoice for 30% of the total. The remaining 70% is due after installation.`;
  }
  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hello! How can I help with your solar project today? You can ask about timing, savings, grants, warranty, or anything else.`;
  }
  return `Great question! I've noted it and a human consultant will follow up by email within 24 hours. For anything urgent, call ${brand.contact.phoneDisplay}. In the meantime, you can review your proposal and paperwork in the other tabs.`;
}
