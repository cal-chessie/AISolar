/**
 * Communication Hub — unified inbox for all customer touchpoints.
 *
 * One place where consultant/installer/admin can see EVERY communication
 * with a customer: emails, SMS, portal views, calls, AI chat history, and
 * agent-sent messages. Filterable by channel + direction. Searchable.
 *
 * This is the "clear communication channel so all POV can quick check all
 * communication points with the client and see their chat history with the AI."
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Mail, MessageSquare, Phone, FileText, Bot, User, Search,
  ArrowUpRight, ArrowDownLeft, Clock, Filter, Sparkles, Send,
  Calendar,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';

type Channel = 'email' | 'sms' | 'portal' | 'phone' | 'chat' | 'agent';
type Direction = 'inbound' | 'outbound';
type Actor = 'system' | 'consultant' | 'installer' | 'customer' | 'agent';

interface CommsItem {
  id: string;
  leadId: string;
  leadName: string;
  channel: Channel;
  direction: Direction;
  actor: Actor;
  subject?: string;
  body: string;
  timestamp: string;
  read: boolean;
  aiChat?: boolean;
}

const CHANNEL_META: Record<Channel, { label: string; icon: typeof Mail; color: string }> = {
  email: { label: 'Email', icon: Mail, color: 'blue' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'violet' },
  portal: { label: 'Portal', icon: FileText, color: 'slate' },
  phone: { label: 'Phone', icon: Phone, color: 'amber' },
  chat: { label: 'AI Chat', icon: Sparkles, color: 'emerald' },
  agent: { label: 'Agent', icon: Bot, color: 'violet' },
};

const ACTOR_META: Record<Actor, { label: string; color: string }> = {
  system: { label: 'System', color: 'slate' },
  consultant: { label: 'Consultant', color: 'blue' },
  installer: { label: 'Installer', color: 'amber' },
  customer: { label: 'Customer', color: 'emerald' },
  agent: { label: 'AI Agent', color: 'violet' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function generateCommsFeed(): CommsItem[] {
  const leads = generateDummyLeads();
  const items: CommsItem[] = [];

  leads.forEach(lead => {
    lead.touchpoints.forEach((tp, i) => {
      items.push({
        id: `${lead.id}_tp_${i}`,
        leadId: lead.id,
        leadName: lead.name,
        channel: tp.channel as Channel,
        direction: tp.direction as Direction,
        actor: tp.actor as Actor,
        subject: tp.channel === 'email' ? tp.summary.slice(0, 60) : undefined,
        body: tp.summary,
        timestamp: tp.timestamp,
        read: i < lead.touchpoints.length - 1,
      });
    });

    // Add some AI chat history for the leads with active proposals
    if (['proposal_sent', 'approved', 'deposit_paid'].includes(lead.workflow_stage)) {
      items.push({
        id: `${lead.id}_chat_1`,
        leadId: lead.id,
        leadName: lead.name,
        channel: 'chat',
        direction: 'inbound',
        actor: 'customer',
        body: 'When will my installation happen?',
        timestamp: lead.touchpoints[lead.touchpoints.length - 1]?.timestamp || new Date().toISOString(),
        read: true,
        aiChat: true,
      });
      items.push({
        id: `${lead.id}_chat_2`,
        leadId: lead.id,
        leadName: lead.name,
        channel: 'chat',
        direction: 'outbound',
        actor: 'agent',
        body: `Your installation is scheduled based on your deposit payment. Once you pay the 30% deposit, the Install Coordinator Agent will book your install within 4-6 weeks, weather permitting.`,
        timestamp: lead.touchpoints[lead.touchpoints.length - 1]?.timestamp || new Date().toISOString(),
        read: true,
        aiChat: true,
      });
    }
  });

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export default function CommunicationHub() {
  const [items] = useState<CommsItem[]>(() => generateCommsFeed());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [directionFilter, setDirectionFilter] = useState<Direction | 'all'>('all');

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (selectedLeadId && item.leadId !== selectedLeadId) return false;
      if (channelFilter !== 'all' && item.channel !== channelFilter) return false;
      if (directionFilter !== 'all' && item.direction !== directionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return item.body.toLowerCase().includes(q)
          || item.leadName.toLowerCase().includes(q)
          || (item.subject?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [items, selectedLeadId, channelFilter, directionFilter, search]);

  const leads = useMemo(() => {
    const map = new Map<string, { id: string; name: string; lastComms: string; unread: number }>();
    items.forEach(item => {
      if (!map.has(item.leadId)) {
        map.set(item.leadId, { id: item.leadId, name: item.leadName, lastComms: item.timestamp, unread: 0 });
      }
      const lead = map.get(item.leadId)!;
      if (new Date(item.timestamp) > new Date(lead.lastComms)) {
        lead.lastComms = item.timestamp;
      }
      if (!item.read) lead.unread++;
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.lastComms).getTime() - new Date(a.lastComms).getTime());
  }, [items]);

  const selectedLead = selectedLeadId ? leads.find(l => l.id === selectedLeadId) : null;
  const selectedThread = selectedLeadId ? filtered.filter(i => i.leadId === selectedLeadId) : filtered;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-violet-600" />
            Communication Hub
          </h2>
          <p className="text-sm text-muted-foreground">Every customer touchpoint in one place — emails, SMS, calls, AI chat history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="h-3 w-3 mr-1" /> Advanced</Button>
          <Button size="sm"><Mail className="h-3 w-3 mr-1" /> New email</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Lead list (left) */}
        <Card className="lg:max-h-[calc(100vh-220px)] overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <Input
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9"
            />
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <button
              onClick={() => setSelectedLeadId(null)}
              className={`w-full text-left p-3 border-b hover:bg-muted/30 ${!selectedLeadId ? 'bg-violet-50 dark:bg-violet-950/30' : ''}`}
            >
              <div className="font-medium text-sm">All conversations</div>
              <div className="text-xs text-muted-foreground">{items.length} total touchpoints</div>
            </button>
            {leads.map(lead => {
              const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');
              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/30 flex items-center gap-2 ${
                    selectedLeadId === lead.id ? 'bg-violet-50 dark:bg-violet-950/30' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{lead.name}</div>
                    <div className="text-xs text-muted-foreground">{timeAgo(lead.lastComms)}</div>
                  </div>
                  {lead.unread > 0 && (
                    <Badge className="bg-violet-600 text-white text-[10px] h-5 min-w-5 px-1 flex items-center justify-center">
                      {lead.unread}
                    </Badge>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Thread view (right) */}
        <Card className="lg:max-h-[calc(100vh-220px)] overflow-hidden flex flex-col">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedLead ? selectedLead.name : 'All conversations'}
              </CardTitle>
              <div className="flex gap-1">
                <select
                  value={channelFilter}
                  onChange={e => setChannelFilter(e.target.value as Channel | 'all')}
                  className="text-xs h-8 rounded-md border border-input bg-background px-2"
                >
                  <option value="all">All channels</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="portal">Portal</option>
                  <option value="phone">Phone</option>
                  <option value="chat">AI Chat</option>
                  <option value="agent">Agent</option>
                </select>
                <select
                  value={directionFilter}
                  onChange={e => setDirectionFilter(e.target.value as Direction | 'all')}
                  className="text-xs h-8 rounded-md border border-input bg-background px-2"
                >
                  <option value="all">All directions</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="divide-y">
              {selectedThread.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No messages match your filters.
                </div>
              ) : (
                selectedThread.map(item => {
                  const channelMeta = CHANNEL_META[item.channel];
                  const actorMeta = ACTOR_META[item.actor];
                  const Icon = channelMeta.icon;
                  const isInbound = item.direction === 'inbound';
                  return (
                    <div key={item.id} className={`p-4 hover:bg-muted/30 ${!item.read ? 'bg-violet-50/30 dark:bg-violet-950/10' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-${channelMeta.color}-100 dark:bg-${channelMeta.color}-950/40`}>
                          <Icon className={`h-4 w-4 text-${channelMeta.color}-700 dark:text-${channelMeta.color}-300`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{item.leadName}</span>
                              {item.aiChat && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI Chat
                                </Badge>
                              )}
                              <Badge variant="outline" className={`text-[10px] bg-${actorMeta.color}-50 text-${actorMeta.color}-700 border-${actorMeta.color}-200`}>
                                {actorMeta.label}
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] ${isInbound ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                {isInbound ? <ArrowDownLeft className="h-2.5 w-2.5 mr-0.5" /> : <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />}
                                {isInbound ? 'Inbound' : 'Outbound'}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{timeAgo(item.timestamp)}</span>
                          </div>
                          {item.subject && (
                            <div className="font-medium text-sm mt-1">{item.subject}</div>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              <Mail className="h-3 w-3 mr-1" /> Reply
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              <Phone className="h-3 w-3 mr-1" /> Call
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              <Calendar className="h-3 w-3 mr-1" /> Book
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>

          {/* Quick reply box */}
          {selectedLead && (
            <div className="border-t p-3 bg-muted/30">
              <div className="flex gap-2">
                <Input placeholder="Reply via email…" className="h-9" />
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" /> SMS
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Sparkles className="h-3 w-3 mr-1" /> AI suggest reply
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Bot className="h-3 w-3 mr-1" /> Hand to AI agent
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['email', 'sms', 'portal', 'phone', 'chat'] as Channel[]).map(ch => {
          const meta = CHANNEL_META[ch];
          const count = items.filter(i => i.channel === ch).length;
          const Icon = meta.icon;
          return (
            <Card key={ch}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className={`p-1.5 rounded bg-${meta.color}-100 dark:bg-${meta.color}-950/40`}>
                  <Icon className={`h-3 w-3 text-${meta.color}-700 dark:text-${meta.color}-300`} />
                </div>
                <div>
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">{meta.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
