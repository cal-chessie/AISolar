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
 *   - Company messages (email)
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
  ChevronDown, ChevronUp, MessageSquare, Star, Shield, Euro,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES, computeQuote, ratesFromIntake } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { AichatWordmark } from '@/components/brand/AiosMark';
import PreSurveySnaps from './PreSurveySnaps';
import SurveyBooking from './SurveyBooking';
import CustomerGrantCard from './CustomerGrantCard';
import { DataSubjectRightsPanel } from '@/lib/gdpr';
import { isDemoMode, isDemoAvailable } from '@/lib/demoMode';
import { buildConversation, type ChatMessage } from '@/lib/conversation';
import { askBrain, liveSuggestions } from '@/lib/customerBrain';
import { notify } from '@/lib/notify';
import { getGrant } from '@/lib/seaiGrant';
import { getTenantBrand } from '@/lib/tenantBrand';

// The staging DemoBanner renders a 28px in-flow spacer that pushes full-height
// (h-dvh) routes down, so 100dvh overflows and the chat input drops below the
// fold. Subtract that offset when the banner is present (never in production).
const DEMO_BANNER_OFFSET = 28;

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/** `lead` prop = the REAL record from the magic-link route (/customer/:token).
 *  Without it (the /my-projects demo path) the portal seeds from demo data. */
export default function CustomerPortalV2({ lead: realLead }: { lead?: DummyLead } = {}) {
  const navigate = useNavigate();
  const [lead] = useState<DummyLead>(() => {
    if (realLead) return realLead;
    const leads = generateDummyLeads();
    // ?stage=early shows the pre-survey journey (photo snaps + survey booking);
    // prefer an intake_complete lead so both cards are in play, not a raw 'new'.
    if (new URLSearchParams(window.location.search).get('stage') === 'early') {
      const order = ['intake_complete', 'survey_scheduled', 'new'];
      return [...leads].sort((a, b) => order.indexOf(a.workflow_stage) - order.indexOf(b.workflow_stage))
        .find(l => order.includes(l.workflow_stage)) || leads[0];
    }
    return leads.find(l => l.workflow_stage === 'approved') || leads[6];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => buildConversation(lead, { audience: 'customer' }));
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showRights, setShowRights] = useState(false);
  // All four pre-survey photos in → the booking card offers a shorter visit.
  const [snapsComplete, setSnapsComplete] = useState(false);
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
    const question = input.trim();

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'customer',
      body: question,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // The brain answers off the live record (stage, money, the real grant),
    // and tells us when a human should pick this up.
    const answer = askBrain(lead, question);

    // BOTH-ENDS LAW: every portal message reaches the team. Escalations bell as
    // their own kind (complaint/callback/booking); answered questions land as a
    // quiet customer_message so the consultant's thread stays complete. The
    // write also PERSISTS the message for real leads (notifications → thread).
    let text = answer.text;
    if (answer.escalation) {
      const r = await notify({
        type: answer.escalation.type, leadId: lead.id, bothEnds: false, accessToken: lead.access_token,
        title: answer.escalation.title, message: answer.escalation.message,
        // The AI's own reply rides along — the team sees exactly what the
        // customer was told before they pick up (oversight, not guesswork).
        metadata: { concern: answer.concern, urgent: answer.escalation.urgent, from: 'portal', aiAnswer: answer.text.slice(0, 500) },
      });
      // Truth-pass: the answer claims a human was told. If the flag genuinely
      // failed (signed-in, write error), swap the claim for a direct route.
      if (!r.ok && r.reason !== 'demo') {
        text += `\n\nActually — that flag didn't go through just now. Tap "Call me back" below or ring ${brand.contact.phoneDisplay} and we'll pick it up directly.`;
      }
    } else {
      void notify({
        type: 'customer_message', leadId: lead.id, bothEnds: false, accessToken: lead.access_token,
        title: `${lead.name.split(' ')[0]} asked (AI answered)`, message: question,
        metadata: { concern: answer.concern, answered: true, from: 'portal', aiAnswer: answer.text.slice(0, 500) },
      });
    }

    // Optional LLM voice (owner's BYO key, server-side): rephrases the floor's
    // answer warmer — same facts, same numbers. Any failure = the floor speaks.
    const { polish } = await import('@/lib/llmVoice');
    text = await polish(text, { pov: 'customer', brandName: getTenantBrand().name });

    await new Promise(r => setTimeout(r, 500));
    setMessages(prev => [...prev, {
      id: `ai_${Date.now()}`,
      type: 'ai',
      body: text,
      timestamp: new Date().toISOString(),
    }]);
    setThinking(false);
  };

  // Cal: "book call" is a CALL BACK, not a consultation booking — and it happens
  // IN the chat, like the survey booking does. Drops the request into the thread
  // and confirms a callback on their number; no detour to an external calendar.
  const requestCallback = async () => {
    if (thinking) return;
    const now = new Date().toISOString();
    setMessages(prev => [...prev, {
      id: `cb_${Date.now()}`, type: 'customer', body: 'Could someone give me a call back?', timestamp: now,
    }]);
    setThinking(true);
    // THE trigger that must never be silent: a customer asking to be called.
    // Bells the whole tenant team; the reply only promises what actually landed.
    const r = await notify({
      type: 'callback_request', leadId: lead.id, bothEnds: false, accessToken: lead.access_token,
      title: `📞 Callback — ${lead.name}`, message: `Wants a call back on ${lead.phone}.`,
      metadata: { phone: lead.phone, from: 'portal', urgent: true },
    });
    const ok = r.ok || r.reason === 'demo';
    setTimeout(() => {
      const who = lead.assigned_consultant?.split(' ')[0] || 'Your consultant';
      setMessages(prev => [...prev, {
        id: `cbr_${Date.now()}`, type: 'agent',
        body: ok
          ? `Of course — ${who} has been pinged and will call you back today on ${lead.phone}. If another number suits you better, just reply here with it.`
          : `That request didn't go through just now — please ring us directly on ${brand.contact.phoneDisplay} and we'll pick straight up.`,
        timestamp: new Date().toISOString(),
      }]);
      setThinking(false);
    }, 500);
    if (ok) toast.success('Callback requested', { description: `We'll ring you on ${lead.phone}.` });
  };

  // Exactly-timed prompts (Cal): the chips match what THIS stage makes the
  // customer wonder — a proposal-stage home asks different questions to a
  // just-installed one. One source: the customer brain.
  const promptChips = liveSuggestions(lead);

  const stage = getStage(lead.workflow_stage);
  const progressPct = Math.round((PIPELINE_STAGES.findIndex(s => s.id === lead.workflow_stage) / (PIPELINE_STAGES.length - 1)) * 100);
  // Occupancy-driven savings — the same maths as the customer proposal, so the
  // header and the proposal never show two different numbers.
  const savings = useMemo(() => {
    if (!lead.proposal) return 0;
    // ONE quote engine — identical inputs to the proposal views, so the header
    // never shows a different number to the document underneath it.
    return computeQuote({
      systemSizeKw: lead.proposal.system_size_kw,
      batteryKwh: lead.proposal.battery_model ? (((lead.survey as Record<string, unknown> | undefined)?.confirmed_battery_kwh as number) ?? 5) : 0,
      roof: {
        orientation: (lead.survey as Record<string, unknown> | undefined)?.roof_orientation as string,
        pitchDeg: (lead.survey as Record<string, unknown> | undefined)?.roof_pitch as number,
        shading: (lead.survey as Record<string, unknown> | undefined)?.shading as string,
      },
      occupancy: { occupants: lead.survey?.household_occupants, homeDuringDay: lead.survey?.home_during_day },
      rates: ratesFromIntake(lead.intake as Record<string, unknown>),
      annualUseKwh: lead.annual_kwh,
      netCostOverride: lead.proposal.net_cost,
    }).annualSavings;
  }, [lead]);

  return (
    <div
      className="flex flex-col overflow-hidden bg-background w-full"
      style={{ height: `calc(100dvh - ${(isDemoAvailable() && isDemoMode()) ? DEMO_BANNER_OFFSET : 0}px)` }}
    >
      {/* Header — project status, progress, and the numbers that matter */}
      <header className="bg-background/95 backdrop-blur border-b flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AichatWordmark className="size-9 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">AIChat <span className="font-normal text-muted-foreground">by {brand.name}</span></div>
                <div className="text-[11px] text-muted-foreground truncate">Hi {lead.name.split(' ')[0]}, here's your solar project</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs bg-doc-deposit/10 text-doc-deposit border-doc-deposit/30">{stage.label}</Badge>
              <Button variant="ghost" size="sm" className="p-2" onClick={() => setShowRights(true)} aria-label="Your data rights">
                <Shield className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Progress to solar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Your journey to solar</span>
              <span className="font-semibold tabular-nums text-doc-deposit">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-doc-deposit transition-all duration-500" style={{ width: `${Math.max(6, progressPct)}%` }} />
            </div>
          </div>
          {/* The numbers, family-coloured */}
          {lead.proposal && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                { label: 'System', value: `${lead.proposal.system_size_kw} kWp`, tone: 'text-tech' },
                { label: 'You pay', value: eur(lead.proposal.net_cost), tone: 'text-foreground' },
                { label: 'Payback', value: `${lead.proposal.payback_years} yr`, tone: 'text-foreground' },
                { label: 'Saves / yr', value: eur(savings), tone: 'text-doc-deposit' },
              ].map(s => (
                <div key={s.label} className="rounded-control bg-muted/40 px-2 py-1.5 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{s.label}</div>
                  <div className={`text-sm font-semibold tabular-nums ${s.tone}`}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Chat thread — full-width, fills the screen */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3 bg-card">
        {/* YOUR MONEY — the customer's own view of the money (Cal, 3 Aug):
            what it costs, what the grant covers, what's paid, what's still due,
            and what happens next. Honest: the grant is TRACKED for them (we do
            the paperwork), never claimed as submitted-by-them. */}
        {lead.proposal && <MoneyView lead={lead} />}

        {/* The customer's live SEAI grant — status + the one thing to do now
            (apply → book BER → paid). The grant is net + paid to them. */}
        {lead.proposal && <CustomerGrantCard lead={lead} />}

        {/* REFERRAL — asked once, at the moment goodwill peaks (system live,
            money settled). One tap notifies the team; the thread confirms. */}
        {['final_paid', 'completed'].includes(lead.workflow_stage) && (
          <ReferralCard lead={lead} onSent={(friend) => {
            setMessages(prev => [...prev,
              { id: `ref_${Date.now()}`, type: 'customer', body: `I'd like to refer ${friend} for solar.`, timestamp: new Date().toISOString() },
              { id: `refr_${Date.now()}`, type: 'agent', body: `Brilliant — thank you! We'll look after ${friend.split(' ')[0]} the way we looked after you, and we'll let you know when they're booked in.`, timestamp: new Date().toISOString() },
            ]);
          }} />
        )}

        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} leadName={lead.name} />
        ))}

        {/* Cal: prompt the customer IN CHAT to take the surveyor's four
            photos before the visit — may shorten or save the survey. */}
        {['new', 'intake_complete', 'survey_scheduled'].includes(lead.workflow_stage) && (
          <div className="flex justify-start">
            <PreSurveySnaps onAllDone={() => setSnapsComplete(true)} />
          </div>
        )}

        {/* Cal (Sweep 3): the customer picks or counters the survey window in
            chat — the other half of LeadFlow's "Let them choose". */}
        {['intake_complete', 'survey_scheduled'].includes(lead.workflow_stage) && (
          <div className="flex justify-start">
            <SurveyBooking
              surveyorName={lead.survey?.surveyor?.split(' ')[0] || lead.assigned_consultant?.split(' ')[0] || 'your surveyor'}
              photosIn={snapsComplete}
            />
          </div>
        )}

        {/* Thinking indicator */}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">AI is thinking…</span>
            </div>
          </div>
        )}

        {/* Suggested questions (show when conversation is short or after AI responds) */}
        {messages.length <= 4 && !thinking && (
          <div className="flex flex-wrap gap-2 justify-center py-2">
            {promptChips.map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); setTimeout(() => handleSend(), 100); }}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:bg-muted transition-colors"
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
          <FileText className="h-4 w-4 mr-1 text-doc-contract" /> Documents
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
          <Sparkles className="h-4 w-4 mr-1 text-tech" /> Ask AI
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 transition-colors"
          onClick={requestCallback}
          disabled={thinking}
        >
          <Phone className="h-4 w-4 mr-1 text-doc-deposit" /> Call me back
        </Button>
      </div>

      {/* Input bar */}
      <div className="border-t bg-background px-4 py-3 pb-safe flex-shrink-0">
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
            className="bg-primary transition-colors hover:bg-primary rounded-full h-11 w-11 p-0 flex-shrink-0"
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
                    { label: 'Solar Proposal', desc: lead.proposal ? `${lead.proposal.system_size_kw}kWp · ${eur(lead.proposal.net_cost)}` : 'Ready after your survey', icon: FileText, available: !!lead.proposal, action: 'View', edge: 'border-l-doc-proposal', chip: 'bg-doc-proposal/10 text-doc-proposal' },
                    { label: 'Contract', desc: lead.contract ? 'Signed' : 'Not yet', icon: FileText, available: !!lead.contract, action: lead.contract ? 'View' : 'Sign', edge: 'border-l-doc-contract', chip: 'bg-doc-contract/10 text-doc-contract' },
                    { label: 'Deposit Invoice', desc: lead.invoice ? `${eur(lead.invoice.deposit_amount)}` : 'Pending', icon: CreditCard, available: !!lead.invoice, action: lead.invoice?.deposit_paid ? 'Paid' : 'Pay', edge: 'border-l-doc-deposit', chip: 'bg-doc-deposit/10 text-doc-deposit' },
                    { label: 'Final Invoice', desc: lead.invoice ? `${eur(lead.invoice.final_amount)}` : 'Pending', icon: CreditCard, available: !!lead.invoice, action: lead.invoice?.final_paid ? 'Paid' : 'Pay', edge: 'border-l-doc-invoice', chip: 'bg-doc-invoice/10 text-doc-invoice' },
                    { label: 'Warranty', desc: ['installed','final_paid','completed'].includes(lead.workflow_stage) ? '10yr workmanship + 25yr panels' : 'After install', icon: Award, available: ['installed','final_paid','completed'].includes(lead.workflow_stage), action: 'View', edge: 'border-l-tech', chip: 'bg-tech-subtle text-tech' },
                    { label: 'SEAI Grant', desc: (() => { const s = getGrant(lead.id).status; return s === 'paid' ? 'Paid to you' : ['ber_published','dow_submitted'].includes(s) ? 'Claim with SEAI' : ['installed','docs_shared','ber_booked'].includes(s) ? 'BER next — pack in here' : ['offer_applied','offer_received'].includes(s) ? 'Offer stage' : 'Tracked for you'; })(), icon: Zap, available: ['approved','deposit_paid','install_scheduled','installing','installed','final_paid','completed'].includes(lead.workflow_stage), action: 'View', edge: 'border-l-tech', chip: 'bg-tech-subtle text-tech' },
                  ].map((doc, i) => {
                    const Icon = doc.icon;
                    return (
                      <Card key={i} className={`shadow-sm border-l-4 ${doc.edge} ${!doc.available ? 'opacity-50' : ''}`}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${doc.chip}`}>
                            <Icon className="h-4 w-4" />
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

      {/* Cookie consent renders ONCE, globally, from App.tsx — a second mount
          here stacked two identical banners and they fought over dismissal
          (found on the 5 Aug portal audit). */}
    </div>
  );
}

function ChatBubble({ message, leadName }: { message: ChatMessage; leadName: string }) {
  // System messages — centered
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 bg-muted/50 rounded-full text-[11px] text-muted-foreground text-center max-w-[85%]">
          {message.body}
        </div>
      </div>
    );
  }

  const isCustomer = message.type === 'customer';
  const isAI = message.type === 'ai';
  const isAgent = message.type === 'agent';
  const isCompany = message.type === 'company';

  // Cal: customer's own messages GREEN; everyone else a neutral bubble that
  // reads in both themes (the old bg-primary/10 + text-primary vanished in dark).
  const bgClass = isCustomer
    ? 'bg-doc-deposit text-white rounded-br-sm'
    : isAI
    ? 'bg-muted text-foreground rounded-bl-sm'
    : isAgent
    ? 'bg-tech/10 text-foreground rounded-bl-sm'
    : 'bg-muted text-foreground rounded-bl-sm';

  // WHITE-LABEL (Cal, 5 Aug): the customer hears the BUSINESS, never an
  // internal agent name. Automated + AI voices carry the tenant's brand;
  // humans are 'Your consultant' / 'Your installer'.
  const tenantName = getTenantBrand().name;
  const actorLabel = isCustomer ? 'You' : (isAI || isAgent) ? tenantName : message.sender === 'installer' ? 'Your installer' : 'Your consultant';
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
        <div className={`flex items-center gap-1 text-[11px] ${isCustomer ? 'flex-row-reverse' : ''}`}>
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
            <button className={`mt-2 flex items-center gap-1 text-xs font-medium ${isCustomer ? 'text-white/90' : 'text-primary dark:text-primary'} hover:underline`}>
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

/**
 * MoneyView — the customer's own money story, in plain words. Cal (3 Aug):
 * "grant status, what's paid, what's next, in their portal." Reads the real
 * proposal + invoice + stage, so it never disagrees with the header or the
 * proposal. Truth-pass: the SEAI grant is TRACKED for them (we do the
 * paperwork) — never claimed as submitted-by-them or already banked.
 */
function MoneyView({ lead }: { lead: DummyLead }) {
  const p = lead.proposal!;
  const inv = lead.invoice;
  const stage = lead.workflow_stage;

  const gross = p.net_cost + (p.seai_grant ?? 0);
  const depositPaid = !!inv?.deposit_paid;
  const finalPaid = !!inv?.final_paid;
  const deposit = inv?.deposit_amount ?? Math.round(p.net_cost * 0.3);
  const paid = (depositPaid ? deposit : 0) + (finalPaid ? (inv?.final_amount ?? (p.net_cost - deposit)) : 0);
  const due = Math.max(0, p.net_cost - paid);

  // Grant status — read from the SAME live grant record as the grant card
  // above, so this screen can never carry two different grant stories (found
  // 5 Aug: this line said "we'll file it after install" while the card said
  // "apply now, before the install" — direct contradiction, fixed).
  const grantRec = getGrant(lead.id);
  const GRANT_SUB: Record<string, string> = {
    not_started: 'yours to claim — steps in your grant card',
    eligible: 'yours to claim — steps in your grant card',
    offer_applied: 'application in — awaiting your offer',
    offer_received: 'offer in hand — paid to you at the end',
    installed: 'book your BER — the grant follows it',
    docs_shared: 'BER pack in your Documents — book your assessor',
    ber_booked: 'BER booked — the grant follows it',
    ber_published: 'claim with SEAI — paid to your account',
    dow_submitted: 'claim with SEAI — paid to your account',
    paid: 'paid to your account',
    ineligible: 'talk to your consultant about eligibility',
    offer_expired: 'offer expired — talk to your consultant',
  };
  const grantStatus = { label: GRANT_SUB[grantRec.status] ?? GRANT_SUB.not_started, tone: 'text-tech' };

  // What happens next, money-wise — one honest line off the stage.
  const nextLine =
    !depositPaid && ['proposal_sent', 'approved', 'proposal_drafted'].includes(stage) ? 'Your deposit secures the install date — the link is on your proposal.'
    : depositPaid && !finalPaid ? 'The balance is due once your system is installed and commissioned.'
    : finalPaid ? 'All paid — your grant paperwork is the last thing we close out for you.'
    : 'Nothing due right now — we\'ll tell you in good time before anything is.';

  const rows: Array<{ label: string; value: string; sub?: string; tone?: string; icon: typeof Euro }> = [
    { label: 'Total system cost', value: eur(gross), sub: 'before your grant', icon: TrendingUp },
    { label: 'SEAI grant', value: `− ${eur(p.seai_grant ?? 0)}`, sub: grantStatus.label, tone: 'text-tech', icon: Award },
    { label: 'Your price', value: eur(p.net_cost), sub: 'after the grant', tone: 'text-foreground', icon: Euro },
    { label: 'Paid so far', value: eur(paid), sub: depositPaid ? (finalPaid ? 'paid in full — thank you' : 'deposit received') : 'nothing yet', tone: 'text-doc-deposit', icon: CheckCircle2 },
    { label: 'Still to pay', value: eur(due), sub: due === 0 ? 'you\'re all square' : 'not due yet', tone: due === 0 ? 'text-doc-deposit' : 'text-foreground', icon: Clock },
  ];

  return (
    <div className="rounded-panel border border-border bg-background shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 h-11 border-b border-border">
        <Euro className="size-4 text-doc-deposit" />
        <h3 className="text-sm font-semibold">Your money</h3>
        <span className="ml-auto text-2xs text-muted-foreground">the full picture, no surprises</span>
      </div>
      <div className="divide-y divide-border/60">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-3 px-4 py-2.5">
            <span className="grid size-6 place-items-center rounded-md bg-muted shrink-0"><r.icon className="size-3.5 text-muted-foreground" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{r.label}</div>
              {r.sub && <div className="text-2xs text-muted-foreground">{r.sub}</div>}
            </div>
            <div className={`text-sm font-semibold tabular-nums shrink-0 ${r.tone ?? 'text-foreground'}`}>{r.value}</div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 bg-muted/30 border-t border-border">
        <div className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">What's next</div>
        <p className="text-xs text-foreground leading-body">{nextLine}</p>
      </div>
    </div>
  );
}


/**
 * ReferralCard — the referral ask, once, at the happy end (Cal's flywheel:
 * clean handover = the review and the referral). One field, one tap; the team
 * is notified with the friend's details and the customer sees a warm confirm.
 */
function ReferralCard({ lead, onSent }: { lead: DummyLead; onSent: (friend: string) => void }) {
  const [friend, setFriend] = useState('');
  const [sent, setSent] = useState(false);
  if (sent) return null;
  return (
    <div className="rounded-panel border border-doc-deposit/30 bg-doc-deposit/5 p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Star className="size-4 text-doc-deposit" /> Know someone thinking about solar?</h3>
      <p className="mt-1 text-xs text-muted-foreground">Pass us a name (with their OK) and we'll look after them the way we looked after you.</p>
      <div className="mt-2.5 flex items-center gap-2">
        <Input value={friend} onChange={e => setFriend(e.target.value)} placeholder="Their name — and a number if you have it" className="h-9 text-sm flex-1" />
        <Button size="sm" className="h-9 shrink-0" disabled={!friend.trim()} onClick={async () => {
          const r = await notify({
            type: 'referral', leadId: lead.id, bothEnds: false, accessToken: lead.access_token,
            title: `⭐ Referral from ${lead.name}`, message: `Referred: ${friend.trim()}`,
            metadata: { from: 'portal', referredBy: lead.name },
          });
          setSent(true); onSent(friend.trim());
          if (r.ok || r.reason === 'demo') toast.success('Referral sent — thank you!');
        }}>
          Send
        </Button>
      </div>
    </div>
  );
}
