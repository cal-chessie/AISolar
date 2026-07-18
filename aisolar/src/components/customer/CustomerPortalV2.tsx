/**
 * Customer Portal V2 — conversation-first.
 *
 * The customer sees their project as a chat thread with the company.
 * Not tabs. Not a dashboard. A conversation.
 *
 * Layout (mobile-first):
 *   ┌─────────────────────────┐
 *   │ Header (project status) │
 *   ├─────────────────────────┤
 *   │                         │
 *   │  Chat thread:           │
 *   │  - System update:       │
 *   │    "Your proposal is    │
 *   │     ready!"             │
 *   │  - AI: "You asked about │
 *   │    payback..."          │
 *   │  - Customer: "When can  │
 *   │    I get installed?"    │
 *   │  - AI: "Once you pay    │
 *   │    deposit..."          │
 *   │  - Agent: "Install      │
 *   │    scheduled for Jul 24"│
 *   │                         │
 *  ├─────────────────────────┤
 *  │ [Quick actions row]      │
 *  │ 📄 Docs  💬 Ask  📅 Book │
 *  ├─────────────────────────┤
 *  │ [Type a message...] [➤]  │
 *  └─────────────────────────┘
 *
 * The chat thread shows:
 *   - Stage transitions as system messages
 *   - Agent actions ("Proposal sent", "Install scheduled")
 *   - AI chat history (customer questions + AI answers)
 *   - Company messages (emails, SMS)
 *   - Customer can type questions → AI responds
 *
 * Quick actions give access to:
 *   - Documents (proposal PDF, contract, invoice, warranty)
 *   - AI assistant (suggested questions)
 *   - Book a call
 *
 * No tabs. Just the conversation.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sun, Send, Sparkles, FileText, Calendar, Phone, MapPin,
  CheckCircle2, Clock, Bot, User, ArrowRight, ArrowLeft,
  Download, CreditCard, Award, Zap, TrendingUp, AlertCircle,
  ChevronDown, ChevronUp, MessageSquare, Star, Shield,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { CookieConsentBanner, DataSubjectRightsPanel } from '@/lib/gdpr';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface ChatMessage {
  id: string;
  type: 'system' | 'agent' | 'company' | 'customer' | 'ai';
  body: string;
  timestamp: string;
  actionLabel?: string;
  actionIcon?: typeof FileText;
  actionData?: string;
}

function buildConversation(lead: DummyLead): ChatMessage[] {
  const msgs: ChatMessage[] = [];

  // Welcome
  msgs.push({
    id: 'welcome',
    type: 'system',
    body: `Welcome to ${brand.name}, ${lead.name.split(' ')[0]}! Your solar journey starts here.`,
    timestamp: lead.touchpoints[0]?.timestamp || new Date(Date.now() - 7 * 86400000).toISOString(),
  });

  // Bill uploaded
  msgs.push({
    id: 'bill_uploaded',
    type: 'system',
    body: `We received your electricity bill. Our AI analyzed your usage: ${lead.annual_kwh?.toLocaleString()} kWh/year, €${lead.monthly_bill}/month. Recommended system: ${lead.intake.estimated_system_size_kw}kWp.`,
    timestamp: lead.touchpoints[0]?.timestamp || new Date(Date.now() - 7 * 86400000).toISOString(),
    actionLabel: 'See your estimate',
    actionIcon: TrendingUp,
  });

  // Touchpoints as messages
  lead.touchpoints.forEach((tp, i) => {
    if (tp.actor === 'customer' && tp.channel === 'portal') {
      // Customer action (opened proposal etc)
      msgs.push({
        id: `tp_${i}`,
        type: 'system',
        body: tp.summary,
        timestamp: tp.timestamp,
      });
    } else if (tp.actor === 'agent') {
      // Agent action
      msgs.push({
        id: `tp_${i}`,
        type: 'agent',
        body: tp.summary,
        timestamp: tp.timestamp,
        actionLabel: tp.channel === 'email' ? 'View email' : undefined,
        actionIcon: tp.channel === 'email' ? FileText : undefined,
      });
    } else if (tp.actor === 'consultant') {
      // Company message
      msgs.push({
        id: `tp_${i}`,
        type: 'company',
        body: tp.summary,
        timestamp: tp.timestamp,
        actionLabel: tp.channel === 'email' ? 'View email' : undefined,
        actionIcon: tp.channel === 'email' ? FileText : undefined,
      });
    }
  });

  // AI chat history (for leads with active proposals)
  if (['proposal_sent', 'approved', 'deposit_paid'].includes(lead.workflow_stage)) {
    msgs.push({
      id: 'ai_chat_1',
      type: 'customer',
      body: 'When will my installation happen?',
      timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    });
    msgs.push({
      id: 'ai_chat_2',
      type: 'ai',
      body: `Your installation is scheduled based on your deposit payment. Once you pay the 30% deposit, the Install Coordinator Agent will book your install within 4-6 weeks, weather permitting. You'll get an SMS 7 days and 1 day before.`,
      timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    });
  }

  // Proposal ready
  if (lead.proposal && ['proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(lead.workflow_stage)) {
    msgs.push({
      id: 'proposal_ready',
      type: 'agent',
      body: `Your ${lead.proposal.system_size_kw}kWp solar proposal is ready! System size: ${lead.proposal.panel_count} panels. Net cost after SEAI grant: ${eur(lead.proposal.net_cost)}. Annual savings: ${eur(lead.proposal.annual_savings)}. Payback: ${lead.proposal.payback_years} years.`,
      timestamp: lead.proposal.sent_date || new Date(Date.now() - 5 * 86400000).toISOString(),
      actionLabel: 'View proposal',
      actionIcon: FileText,
    });
  }

  // Contract signed
  if (lead.contract) {
    msgs.push({
      id: 'contract_signed',
      type: 'system',
      body: 'Contract signed! Your SEAI grant paperwork has been auto-started. Invoice created.',
      timestamp: lead.contract.signed_date,
      actionLabel: 'View contract',
      actionIcon: FileText,
    });
  }

  // Install scheduled
  if (lead.assignment && ['install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(lead.workflow_stage)) {
    msgs.push({
      id: 'install_scheduled',
      type: 'agent',
      body: `Your installation is scheduled for ${new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}. Our crew will arrive between 8-9am. Please ensure roof access is clear.`,
      timestamp: lead.assignment.scheduled_date,
    });
  }

  // Install complete
  if (['installed', 'final_paid', 'completed'].includes(lead.workflow_stage)) {
    msgs.push({
      id: 'install_complete',
      type: 'agent',
      body: 'Your solar system is installed and commissioned! Warranty docs sent. Your system is now generating clean energy. 🌞',
      timestamp: lead.assignment?.completed_date || new Date().toISOString(),
      actionLabel: 'View warranty',
      actionIcon: Award,
    });
  }

  // Sort by timestamp
  return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function generateAIResponse(question: string, lead: DummyLead): string {
  const q = question.toLowerCase();
  if (q.includes('when') && (q.includes('install') || q.includes('date'))) {
    return lead.assignment?.scheduled_date
      ? `Your installation is scheduled for ${new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}. The crew will arrive between 8-9am. You'll get a reminder SMS the day before.`
      : `Your installation will be scheduled once you pay the deposit. Typically within 4-6 weeks of deposit payment, weather permitting.`;
  }
  if (q.includes('save') || q.includes('saving') || q.includes('bill')) {
    return lead.proposal
      ? `Based on your ${lead.proposal.system_size_kw}kWp system, you'll save approximately ${eur(lead.proposal.annual_savings)} per year. Over 20 years (accounting for inflation), that's ${eur(lead.proposal.twenty_year_savings)} net of installation cost. Your payback period is ${lead.proposal.payback_years} years.`
      : `Based on your bill of €${lead.monthly_bill}/month, you could save €800-1,400/year with solar.`;
  }
  if (q.includes('grant') || q.includes('seai')) {
    return lead.proposal
      ? `Your SEAI Solar Electricity Grant is ${eur(lead.proposal.seai_grant)} (€900/kWp, capped at €1,800). We handle all the paperwork — once your contract is signed, the SEAI Grant Agent auto-starts the application.`
      : `The SEAI grant is €900/kWp installed, capped at €1,800. For a typical 6kWp system, that's the full €1,800 off. We handle all paperwork.`;
  }
  if (q.includes('pay') || q.includes('deposit') || q.includes('cost') || q.includes('price')) {
    return lead.proposal
      ? `Your net cost after the SEAI grant is ${eur(lead.proposal.net_cost)}. The deposit is 30% (${eur(lead.proposal.net_cost * 0.3)}) due on contract signing, and the balance of 70% (${eur(lead.proposal.net_cost * 0.7)}) is due after installation. You can pay by card or bank transfer.`
      : `Once your proposal is ready, you'll see the full cost breakdown. Typically a 6kWp system costs €8,000-12,000 after the SEAI grant.`;
  }
  if (q.includes('warranty')) {
    return `Your solar system comes with: (1) 10-year workmanship warranty from us, (2) 25-year performance guarantee on panels, (3) 10-year inverter warranty${lead.proposal?.battery_model ? ', (4) 10-year battery warranty' : ''}. Full warranty docs are in your portal after installation.`;
  }
  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hi ${lead.name.split(' ')[0]}! I'm your solar assistant. Ask me anything about your project — timing, savings, grants, warranty, payments. I'm here 24/7.`;
  }
  if (q.includes('progress') || q.includes('status') || q.includes('where')) {
    return `Your project is currently at: ${getStage(lead.workflow_stage).label}. ${getStage(lead.workflow_stage).automation}. You can see the full timeline in our conversation below.`;
  }
  return `Great question! I've noted it and your consultant will follow up by email within 24 hours. For anything urgent, call ${brand.contact.phoneDisplay}. You can also review your documents using the 📄 button below.`;
}

export default function CustomerPortalV2() {
  const navigate = useNavigate();
  const [lead] = useState<DummyLead>(() => {
    const leads = generateDummyLeads();
    return leads.find(l => l.workflow_stage === 'approved') || leads[6];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => buildConversation(lead));
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showRights, setShowRights] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, thinking]);

  // Escape key closes whichever sheet is open
  useEffect(() => {
    if (!showDocs && !showRights) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDocs(false);
        setShowRights(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showDocs, showRights]);

  const handleSend = async () => {
    if (!input.trim() || thinking) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'customer',
      body: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    await new Promise(r => setTimeout(r, 800));

    const response = generateAIResponse(input, lead);
    setMessages(prev => [...prev, {
      id: `ai_${Date.now()}`,
      type: 'ai',
      body: response,
      timestamp: new Date().toISOString(),
    }]);
    setThinking(false);
  };

  const suggestedQuestions = [
    'When will my installation happen?',
    'How much will I save?',
    'What\'s the SEAI grant?',
    'What warranty do I get?',
  ];

  const stage = getStage(lead.workflow_stage);
  const progressPct = Math.round((PIPELINE_STAGES.findIndex(s => s.id === lead.workflow_stage) / (PIPELINE_STAGES.length - 1)) * 100);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/20 dark:via-background dark:to-blue-950/20 overflow-hidden">
      {/* Header — project status */}
      <header className="bg-background/95 backdrop-blur border-b flex-shrink-0">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="h-7 w-7 text-emerald-600" />
            <div>
              <div className="font-bold text-sm">{brand.name}</div>
              <div className="text-[10px] text-muted-foreground">My Solar Project</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs bg-${stage.color}-50 text-${stage.color}-700 border-${stage.color}-200`}>
              {stage.label}
            </Badge>
            <Button variant="ghost" size="sm" className="p-2" onClick={() => setShowRights(true)}>
              <Shield className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        {/* Project summary strip */}
        {lead.proposal && (
          <div className="px-4 py-1.5 flex items-center gap-4 text-xs text-muted-foreground overflow-x-auto">
            <span className="flex-shrink-0">{lead.proposal.system_size_kw} kWp</span>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0">{eur(lead.proposal.net_cost)}</span>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0">{lead.proposal.payback_years}yr payback</span>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0 text-emerald-600">{eur(lead.proposal.annual_savings)}/yr savings</span>
          </div>
        )}
      </header>

      {/* Chat thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} leadName={lead.name} />
        ))}

        {/* Thinking indicator */}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-violet-600 animate-pulse" />
              <span className="text-xs text-muted-foreground">AI is thinking…</span>
            </div>
          </div>
        )}

        {/* Suggested questions (show when conversation is short or after AI responds) */}
        {messages.length <= 4 && !thinking && (
          <div className="flex flex-wrap gap-2 justify-center py-2">
            {suggestedQuestions.map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); setTimeout(() => handleSend(), 100); }}
                className="text-xs px-3 py-1.5 rounded-full border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions row */}
      <div className="border-t bg-background px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9"
          onClick={() => setShowDocs(true)}
        >
          <FileText className="h-4 w-4 mr-1" /> Documents
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9"
          onClick={() => {
            setInput('What\'s the status of my project?');
            setTimeout(() => handleSend(), 100);
          }}
        >
          <Sparkles className="h-4 w-4 mr-1" /> Ask AI
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 transition-colors"
          onClick={() => {
            toast('Calendar booking coming soon', {
              description: `Your consultant will reach out to schedule a call. For now, reply in this chat and we'll get back to you within 1 business day.`,
            });
          }}
        >
          <Calendar className="h-4 w-4 mr-1" /> Book call
        </Button>
      </div>

      {/* Input bar */}
      <div className="border-t bg-background px-4 py-3 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about your project…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="h-11 rounded-full"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || thinking}
            className="bg-emerald-600 transition-colors hover:bg-emerald-700 rounded-full h-11 w-11 p-0 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Documents sheet */}
      <AnimatePresence>
        {showDocs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
            onClick={() => setShowDocs(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Your documents</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowDocs(false)}>Close</Button>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Solar Proposal', desc: `${lead.proposal?.system_size_kw}kWp · ${eur(lead.proposal?.net_cost || 0)}`, icon: FileText, available: !!lead.proposal, action: 'View' },
                    { label: 'Contract', desc: lead.contract ? 'Signed' : 'Not yet', icon: FileText, available: !!lead.contract, action: lead.contract ? 'View' : 'Sign' },
                    { label: 'Deposit Invoice', desc: lead.invoice ? `${eur(lead.invoice.deposit_amount)}` : 'Pending', icon: CreditCard, available: !!lead.invoice, action: lead.invoice?.deposit_paid ? 'Paid' : 'Pay' },
                    { label: 'Final Invoice', desc: lead.invoice ? `${eur(lead.invoice.final_amount)}` : 'Pending', icon: CreditCard, available: !!lead.invoice, action: lead.invoice?.final_paid ? 'Paid' : 'Pay' },
                    { label: 'Warranty', desc: ['installed','final_paid','completed'].includes(lead.workflow_stage) ? '10yr workmanship + 25yr panels' : 'After install', icon: Award, available: ['installed','final_paid','completed'].includes(lead.workflow_stage), action: 'View' },
                    { label: 'SEAI Application', desc: lead.workflow_stage === 'completed' ? 'Submitted' : 'In progress', icon: Zap, available: ['approved','deposit_paid','install_scheduled','installing','installed','final_paid','completed'].includes(lead.workflow_stage), action: 'View' },
                  ].map((doc, i) => {
                    const Icon = doc.icon;
                    return (
                      <Card key={i} className={`shadow-sm ${!doc.available ? 'opacity-50' : ''}`}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{doc.label}</div>
                            <div className="text-xs text-muted-foreground">{doc.desc}</div>
                          </div>
                          {doc.available && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs transition-colors"
                              onClick={() => {
                                if (doc.action === 'Pay') {
                                  toast('Payment link sent', {
                                    description: `We've emailed a secure payment link to ${lead.email}. Open it from your inbox to complete payment.`,
                                  });
                                } else {
                                  toast(`${doc.label} downloaded`, {
                                    description: `Saved to your device. You can also find it in this chat thread.`,
                                  });
                                }
                              }}
                            >
                              {doc.action === 'Pay' ? <CreditCard className="h-3 w-3 mr-1" /> : <Download className="h-3 w-3 mr-1" />}
                              {doc.action}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GDPR rights sheet */}
      <AnimatePresence>
        {showRights && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowRights(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-background w-full max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Your data rights</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowRights(false)}>Close</Button>
                </div>
                <DataSubjectRightsPanel userEmail={lead.email} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie consent */}
      <CookieConsentBanner />
    </div>
  );
}

function ChatBubble({ message, leadName }: { message: ChatMessage; leadName: string }) {
  // System messages — centered
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 bg-muted/50 rounded-full text-[10px] text-muted-foreground text-center max-w-[85%]">
          {message.body}
        </div>
      </div>
    );
  }

  const isCustomer = message.type === 'customer';
  const isAI = message.type === 'ai';
  const isAgent = message.type === 'agent';
  const isCompany = message.type === 'company';

  const bgClass = isCustomer
    ? 'bg-emerald-600 text-white rounded-br-sm'
    : isAI
    ? 'bg-violet-100 dark:bg-violet-950/40 text-violet-900 dark:text-violet-100 rounded-bl-sm'
    : isAgent
    ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 rounded-bl-sm'
    : 'bg-muted text-foreground rounded-bl-sm';

  const actorLabel = isCustomer ? 'You' : isAI ? 'AI Assistant' : isAgent ? 'AI Agent' : leadName.split(' ')[0] + '\'s Consultant';
  const actorIcon = isCustomer ? User : isAI ? Sparkles : isAgent ? Bot : MessageSquare;

  const Icon = actorIcon;
  const ActionIcon = message.actionIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isCustomer ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Actor label */}
        <div className={`flex items-center gap-1 text-[10px] ${isCustomer ? 'flex-row-reverse' : ''}`}>
          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-muted-foreground font-medium">{actorLabel}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {new Date(message.timestamp).toLocaleString('en-IE', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        {/* Message body */}
        <div className={`rounded-2xl px-4 py-2.5 ${bgClass}`}>
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
          {/* Action button */}
          {message.actionLabel && ActionIcon && (
            <button className={`mt-2 flex items-center gap-1 text-xs font-medium ${isCustomer ? 'text-white/90' : 'text-blue-700 dark:text-blue-300'} hover:underline`}>
              <ActionIcon className="h-3 w-3" />
              {message.actionLabel}
              <ArrowRight className="h-2 w-2" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
