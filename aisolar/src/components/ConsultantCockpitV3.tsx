/**
 * Consultant Cockpit V3 — messaging app style.
 *
 * The user's feedback: "when you click one it should open up the chat and
 * see the conversation". So this is now a messaging app, not a dashboard.
 *
 * Layout (desktop):
 *   ┌─────────────┬──────────────────────────┐
 *   │ Lead list   │ Conversation thread      │
 *   │ (searchable)│ (all touchpoints + chat) │
 *   │             │                          │
 *   │             │ [Reply box at bottom]    │
 *   └─────────────┴──────────────────────────┘
 *
 * Layout (mobile):
 *   Lead list → tap → conversation (full screen) → back
 *
 * The conversation shows EVERYTHING in one thread:
 *   - Customer emails (inbound/outbound)
 *   - SMS
 *   - Portal views
 *   - Calls
 *   - AI chat history
 *   - Agent actions ("Proposal Drafter Agent drafted...")
 *   - Stage transitions
 *
 * Reply box at the bottom: type a message → sends as email (or SMS toggle).
 * Quick actions: Call, Book appointment, Open lead details (survey/proposal).
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search, Send, Phone, Mail, MessageSquare, Calendar, FileText,
  ArrowLeft, ArrowRight, Bot, User, Sparkles, ChevronRight,
  Zap, Sun, Clock, CheckCircle2, AlertCircle, Paperclip,
  MoreVertical, Star, MapPin, Video, Navigation,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import RoleBasedAICoach from '@/components/ai/RoleBasedAICoach';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface Message {
  id: string;
  channel: 'email' | 'sms' | 'portal' | 'phone' | 'chat' | 'agent' | 'stage';
  direction: 'inbound' | 'outbound';
  actor: 'customer' | 'consultant' | 'installer' | 'agent' | 'system';
  body: string;
  timestamp: string;
  subject?: string;
}

function leadToMessages(lead: DummyLead): Message[] {
  const messages: Message[] = [];

  // Stage transitions
  const stagesReached = PIPELINE_STAGES.filter(s => {
    const idx = PIPELINE_STAGES.findIndex(p => p.id === s.id);
    const currentIdx = PIPELINE_STAGES.findIndex(p => p.id === lead.workflow_stage);
    return idx <= currentIdx;
  });

  stagesReached.forEach(stage => {
    messages.push({
      id: `stage_${stage.id}`,
      channel: 'stage',
      direction: 'outbound',
      actor: 'system',
      body: `Lead moved to: ${stage.label}`,
      timestamp: lead.touchpoints.find(tp => tp.stage === stage.id)?.timestamp || new Date().toISOString(),
    });
  });

  // Touchpoints
  lead.touchpoints.forEach((tp, i) => {
    messages.push({
      id: `tp_${i}`,
      channel: tp.channel as Message['channel'],
      direction: tp.direction as Message['direction'],
      actor: tp.actor as Message['actor'],
      body: tp.summary,
      timestamp: tp.timestamp,
      subject: tp.channel === 'email' ? tp.summary.slice(0, 60) : undefined,
    });
  });

  // Add some AI chat history for leads with active proposals
  if (['proposal_sent', 'approved', 'deposit_paid'].includes(lead.workflow_stage)) {
    const lastTouch = lead.touchpoints[lead.touchpoints.length - 1];
    const chatTime = lastTouch ? lastTouch.timestamp : new Date().toISOString();
    messages.push({
      id: `chat_1`,
      channel: 'chat',
      direction: 'inbound',
      actor: 'customer',
      body: 'When will my installation happen?',
      timestamp: chatTime,
    });
    messages.push({
      id: `chat_2`,
      channel: 'chat',
      direction: 'outbound',
      actor: 'agent',
      body: `Your installation is scheduled based on your deposit payment. Once you pay the 30% deposit, the Install Coordinator Agent will book your install within 4-6 weeks, weather permitting. You'll get an SMS 7 days and 1 day before.`,
      timestamp: chatTime,
    });
  }

  // Sort by timestamp
  return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export default function ConsultantCockpitV3() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyChannel, setReplyChannel] = useState<'email' | 'sms'>('email');
  const [mobileShowConversation, setMobileShowConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedLead = leads.find(l => l.id === selectedLeadId);
  const messages = useMemo(() => selectedLead ? leadToMessages(selectedLead) : [], [selectedLead]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedLead) return;
    // In production: insert into touchpoints + send via Postmark/Twilio
    console.log('Sending reply:', { leadId: selectedLead.id, channel: replyChannel, body: replyText });
    setReplyText('');
    // For demo: just clear. In production: optimistically add to messages.
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-background border-b px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Sun className="h-6 w-6 text-blue-600" />
          <div>
            <span className="font-bold text-sm">{brand.name} Inbox</span>
            <span className="text-xs text-muted-foreground ml-2">{leads.length} leads</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')}>
            <Zap className="h-4 w-4 mr-1" /> Pipeline
          </Button>
          <DarkModeToggle />
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lead list (left) */}
        <div className={`${mobileShowConversation ? 'hidden' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r`}>
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          {/* Lead list */}
          <div className="flex-1 overflow-y-auto">
            {filteredLeads.map(lead => {
              const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');
              const lastTouch = lead.touchpoints[lead.touchpoints.length - 1];
              const isSelected = selectedLeadId === lead.id;
              return (
                <button
                  key={lead.id}
                  onClick={() => {
                    setSelectedLeadId(lead.id);
                    setMobileShowConversation(true);
                  }}
                  className={`w-full p-3 border-b flex items-start gap-3 text-left hover:bg-muted/30 transition-colors ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{lead.name}</span>
                      {lastTouch && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {new Date(lastTouch.timestamp).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {lastTouch?.summary || 'No messages yet'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className={`text-[9px] bg-${getStage(lead.workflow_stage).color}-50 text-${getStage(lead.workflow_stage).color}-700 border-${getStage(lead.workflow_stage).color}-200`}>
                        {getStage(lead.workflow_stage).label}
                      </Badge>
                      {lead.score > 80 && (
                        <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200">
                          <Star className="h-2 w-2 mr-0.5" /> Hot
                        </Badge>
                      )}
                      {lead.proposal && (
                        <span className="text-[10px] text-muted-foreground">{eur(lead.proposal.net_cost)}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation panel (right) */}
        <div className={`${mobileShowConversation ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}>
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
              <div className="p-3 border-b flex items-center gap-3 bg-background">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden p-2"
                  onClick={() => setMobileShowConversation(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {selectedLead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{selectedLead.name}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedLead.address.split(',').slice(-2).join(',').trim()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="p-2" asChild>
                    <a href={`tel:${selectedLead.phone}`}><Phone className="h-4 w-4" /></a>
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2" onClick={() => navigate('/lead-flow')}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Stage banner */}
              <div className={`px-3 py-2 border-b bg-${getStage(selectedLead.workflow_stage).color}-50 dark:bg-${getStage(selectedLead.workflow_stage).color}-950/20`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium text-${getStage(selectedLead.workflow_stage).color}-700 dark:text-${getStage(selectedLead.workflow_stage).color}-300`}>
                    {getStage(selectedLead.workflow_stage).label}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedLead.proposal && (
                      <span className="text-muted-foreground">{selectedLead.proposal.system_size_kw} kWp · {eur(selectedLead.proposal.net_cost)}</span>
                    )}
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => navigate('/lead-flow')}>
                      Open flow <ArrowRight className="h-2 w-2 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} leadName={selectedLead.name} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="border-t p-3 bg-background">
                {/* Quick actions */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setReplyChannel('email')}
                      className={`px-2 py-1 text-xs rounded ${replyChannel === 'email' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                    >
                      <Mail className="h-3 w-3 inline mr-1" /> Email
                    </button>
                    <button
                      onClick={() => setReplyChannel('sms')}
                      className={`px-2 py-1 text-xs rounded ${replyChannel === 'sms' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                    >
                      <MessageSquare className="h-3 w-3 inline mr-1" /> SMS
                    </button>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" /> AI suggest
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs">
                    <Paperclip className="h-3 w-3" /> Attach
                  </Button>
                </div>
                {/* Text input */}
                <div className="flex gap-2">
                  <Input
                    placeholder={replyChannel === 'email' ? 'Type an email reply…' : 'Type an SMS…'}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                    className="h-10"
                  />
                  <Button onClick={handleSendReply} disabled={!replyText.trim()} className="bg-blue-600 hover:bg-blue-700 h-10 px-4">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <RoleBasedAICoach />
    </div>
  );
}

function MessageBubble({ message, leadName }: { message: Message; leadName: string }) {
  const isInbound = message.direction === 'inbound';
  const isAgent = message.actor === 'agent';
  const isSystem = message.actor === 'system' || message.channel === 'stage';

  if (isSystem) {
    // System messages (stage transitions) — centered divider
    return (
      <div className="flex items-center justify-center my-2">
        <div className="px-3 py-1 bg-muted rounded-full text-[10px] text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-2.5 w-2.5" />
          {message.body}
        </div>
      </div>
    );
  }

  const channelIcon = {
    email: Mail,
    sms: MessageSquare,
    portal: FileText,
    phone: Phone,
    chat: Sparkles,
    agent: Bot,
  }[message.channel];

  const actorColor = {
    customer: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    consultant: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
    installer: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    agent: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
    system: 'bg-muted text-muted-foreground',
  }[message.actor];

  const Icon = channelIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`max-w-[80%] ${isInbound ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
        {/* Actor + channel label */}
        <div className={`flex items-center gap-1 text-[10px] ${isInbound ? 'justify-start' : 'justify-end'}`}>
          <span className={`px-1.5 py-0.5 rounded ${actorColor} font-medium`}>
            {message.actor === 'agent' ? 'AI Agent' : message.actor}
          </span>
          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-muted-foreground capitalize">{message.channel}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {new Date(message.timestamp).toLocaleString('en-IE', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        {/* Message body */}
        <div className={`rounded-2xl px-4 py-2 ${
          isInbound
            ? 'bg-muted text-foreground rounded-bl-sm'
            : isAgent
            ? 'bg-violet-100 dark:bg-violet-950/40 text-violet-900 dark:text-violet-100 rounded-br-sm'
            : 'bg-blue-600 text-white rounded-br-sm'
        }`}>
          {message.subject && (
            <div className="text-xs font-semibold mb-1 opacity-80">{message.subject}</div>
          )}
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        </div>
      </div>
    </motion.div>
  );
}
