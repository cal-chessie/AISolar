/**
 * ConversationInbox — the ONE inbox, shared by the consultant and the installer.
 *
 * Cal, 28 Jul: "I want the installer's inbox to be the same as the consultant's
 * — and carry the same centralised conversation." So there is ONE thread per
 * client (buildConversation), ONE bubble renderer (MessageBubble), and ONE
 * two-pane shell. Whoever opens a customer — sales or field — sees the same
 * record and writes into the same thread. A reply here is a touchpoint on the
 * lead (the parent owns lead state and persists it), so it shows up everywhere
 * the client appears.
 *
 * Real cross-device sync (Supabase Realtime on the touchpoints table) is the
 * Sweep 8 wire-up; today the thread is the shared in-memory record — no
 * "delivered / email sent" claim is made here (truth-pass).
 *
 * Skills: ui-ux-pro-max (one component per purpose, family tokens), stop-slop.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Search, ArrowLeft } from 'lucide-react';
import { buildConversation } from '@/lib/conversation';
import type { DummyLead } from '@/lib/dummyData';
import { getStage } from '@/lib/leadIntake';
import MessageBubble from '@/components/shared/MessageBubble';

export default function ConversationInbox({
  leads,
  selectedId,
  onSelect,
  onReply,
  onBack,
  audience = 'consultant',
  headerActions,
  onAction,
  emptyThreadHint,
}: {
  leads: DummyLead[];
  selectedId: string | null;
  onSelect: (lead: DummyLead) => void;
  /** Append the reply to the lead's touchpoints (parent persists it). */
  onReply: (lead: DummyLead, text: string) => void;
  /** Mobile: deselect and return to the list. */
  onBack?: () => void;
  audience?: 'consultant' | 'installer';
  /** Right-side header buttons (Call, Open job, Proposal…) per app. */
  headerActions?: (lead: DummyLead) => ReactNode;
  /** Inline card/action clicks inside a bubble. */
  onAction?: (lead: DummyLead, data?: string) => void;
  emptyThreadHint?: string;
}) {
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => leads.find(l => l.id === selectedId) ?? null, [leads, selectedId]);
  const messages = useMemo(() => (selected ? buildConversation(selected, { audience }) : []), [selected, audience]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? leads.filter(l => l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)) : leads;
  }, [leads, search]);

  const send = () => {
    if (!reply.trim() || !selected) return;
    onReply(selected, reply.trim());
    setReply('');
  };

  return (
    <div className="grid lg:grid-cols-[minmax(240px,1fr)_2fr] gap-3 items-start">
      {/* ── list ── */}
      <div className={`space-y-2 ${selected ? 'hidden lg:block' : ''}`}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full h-control rounded-control border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </div>
        <div className="space-y-1.5">
          {filtered.map(l => {
            const th = buildConversation(l, { audience });
            const last = th[th.length - 1];
            return (
              <button
                key={l.id}
                onClick={() => onSelect(l)}
                className={`w-full rounded-panel p-3 text-left transition-colors ${selectedId === l.id ? 'bg-primary/5 shadow-card' : 'bg-card shadow-card hover:bg-muted/50'}`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-[11px]">{l.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                  <span className="text-sm font-medium truncate flex-1">{l.name}</span>
                  <span className="text-2xs text-muted-foreground shrink-0">{getStage(l.workflow_stage)?.label}</span>
                </div>
                {last && <p className="mt-1 text-xs text-muted-foreground truncate">{last.body}</p>}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No customers match “{search}”.</p>
          )}
        </div>
      </div>

      {/* ── thread ── */}
      {selected ? (
        <div className="rounded-panel bg-card shadow-card flex flex-col min-h-[24rem] max-h-[calc(100dvh-16rem)]">
          <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border shrink-0">
            {onBack && (
              <button className="lg:hidden text-muted-foreground grid place-items-center size-8 -ml-1.5 rounded-control hover:bg-muted" onClick={onBack} aria-label="Back to list">
                <ArrowLeft className="size-4" />
              </button>
            )}
            <Avatar className="h-7 w-7"><AvatarFallback className="text-[11px]">{selected.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
            <div className="leading-tight min-w-0">
              <p className="text-sm font-semibold truncate">{selected.name}</p>
              <p className="text-2xs text-muted-foreground truncate">{selected.address}</p>
            </div>
            {headerActions && <div className="ml-auto flex items-center gap-1">{headerActions(selected)}</div>}
          </div>

          <div className="flex-1 overflow-y-auto scroll-slim p-4 space-y-2.5 bg-muted/10">
            {messages.map(m => <MessageBubble key={m.id} message={m} onAction={d => onAction?.(selected, d)} />)}
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">{emptyThreadHint ?? 'No messages yet — say hello.'}</p>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-3 flex items-center gap-2 shrink-0">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={`Message ${selected.name.split(' ')[0]}…`}
              className="flex-1 h-10 rounded-control border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            />
            <Button size="sm" className="h-10" onClick={send} disabled={!reply.trim()} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="hidden lg:grid rounded-panel bg-card shadow-card min-h-[24rem] place-items-center text-center text-sm text-muted-foreground p-8">
          <div>
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-medium">Pick a customer to open the conversation.</p>
            <p className="text-xs mt-1">Emails, calls, AI chat and agent actions — one shared thread.</p>
          </div>
        </div>
      )}
    </div>
  );
}
