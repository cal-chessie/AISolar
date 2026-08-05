/**
 * NotificationsBell — the one notification surface for every cockpit header.
 *
 * TRUTH RULE: channels tell the truth. In-app and email are live; WhatsApp and
 * Telegram are labelled "coming soon" per role — never claimed working.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Bot, CheckCheck, FileText, Calendar, Euro, Mail, MessageCircle, Send, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type CockpitRole = 'owner' | 'consultant' | 'installer';

interface Notice {
  id: string;
  icon: typeof Bot;
  tone: string;         // icon colour class
  text: string;
  time: string;
  /** Live rows carry the DB read flag; demo rows use local readIds. */
  read?: boolean;
}

/* Demo feeds per role — replaced by kernel events at launch. */
const FEED: Record<CockpitRole, Notice[]> = {
  consultant: [
    { id: 'c0', icon: Award, tone: 'text-doc-contract', text: 'SEAI grant OFFER received for Siobhán Murphy — install can now be booked', time: 'just now' },
    { id: 'c1', icon: FileText, tone: 'text-doc-proposal', text: 'Sarah McDonald's proposal is drafted — waiting on your review', time: '9 min ago' },
    { id: 'c2', icon: Bot, tone: 'text-tech', text: 'James Wilson opened his proposal a 4th time — worth a call today', time: '1 hr ago' },
    { id: 'c3', icon: Calendar, tone: 'text-muted-foreground', text: 'Survey booked for Linda O\'Sullivan, Thursday 10:00', time: '3 hrs ago' },
  ],
  owner: [
    { id: 'o0', icon: Mail, tone: 'text-doc-deposit', text: 'BER cert emailed in for Michael Byrne — filed to his pack, handover ready to review', time: '5 min ago' },
    { id: 'o1', icon: Euro, tone: 'text-doc-deposit', text: 'Deposit received — David Walsh, €2,430', time: '22 min ago' },
    { id: 'o2', icon: Bot, tone: 'text-pop', text: 'One lead has gone 6 days without contact', time: '1 hr ago' },
    { id: 'o3', icon: FileText, tone: 'text-doc-invoice', text: '2 invoices drafted for your approval', time: 'yesterday' },
  ],
  installer: [
    { id: 'i0', icon: Bell, tone: 'text-pop', text: "Emma Ryan's job can't be closed — RECI cert + signed DOW still to upload", time: '30 min ago' },
    { id: 'i1', icon: Calendar, tone: 'text-tech', text: 'Tomorrow: 2 jobs — first on site 08:30, Clontarf', time: '1 hr ago' },
    { id: 'i2', icon: Bot, tone: 'text-muted-foreground', text: 'Materials for the Kowalski install confirmed for Wednesday', time: '4 hrs ago' },
  ],
};

/* Icon + tone per real notify() event type — the bell speaks the spine's language. */
const TYPE_META: Record<string, { icon: typeof Bot; tone: string }> = {
  callback_request: { icon: MessageCircle, tone: 'text-pop' },
  customer_message: { icon: MessageCircle, tone: 'text-doc-deposit' },
  reply: { icon: Send, tone: 'text-muted-foreground' },
  deposit_link: { icon: Euro, tone: 'text-doc-deposit' },
  proposal_sent: { icon: FileText, tone: 'text-doc-proposal' },
  photo_request: { icon: Calendar, tone: 'text-tech' },
  handover_pack: { icon: Award, tone: 'text-doc-contract' },
  team_invite: { icon: Mail, tone: 'text-tech' },
  stage_change: { icon: Bot, tone: 'text-tech' },
  reschedule: { icon: Calendar, tone: 'text-pop' },
  survey_options: { icon: Calendar, tone: 'text-tech' },
  seai_offer_reminder: { icon: Award, tone: 'text-pop' },
  seai_ber_overdue: { icon: Award, tone: 'text-pop' },
};

const relTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
};

/** Signed in → the REAL notifications table (RLS scopes to you + your leads);
 *  demo → the role feed. The 5 Aug audit found notify() writing rows nothing
 *  displayed — this closes the loop. */
function useLiveFeed(role: CockpitRole): { feed: Notice[]; live: boolean; markAllRead: () => void } {
  const demoFeed = useMemo(() => FEED[role], [role]);
  const [rows, setRows] = useState<Notice[] | null>(null);
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: auth } = await supabase.auth.getSession();
        if (!auth.session) return; // demo / signed out — keep the role feed
        const { data } = await supabase
          .from('notifications')
          .select('id, type, title, message, read, created_at')
          .order('created_at', { ascending: false })
          .limit(20);
        if (on && data) {
          setRows(data.map(n => {
            const meta = TYPE_META[n.type as string] ?? { icon: Bot, tone: 'text-muted-foreground' };
            return { id: n.id as string, icon: meta.icon, tone: meta.tone,
              text: n.title ? `${n.title}${n.message ? ` — ${n.message}` : ''}` : (n.message as string ?? ''),
              time: relTime(n.created_at as string), read: !!n.read };
          }));
        }
      } catch { /* stays on the demo feed */ }
    })();
    return () => { on = false; };
  }, [role]);
  const markAllRead = () => {
    void (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.from('notifications').update({ read: true }).eq('read', false);
      } catch { /* best-effort */ }
    })();
  };
  return { feed: rows ?? demoFeed, live: rows != null, markAllRead };
}

export default function NotificationsBell({ role }: { role: CockpitRole }) {
  const { feed, live, markAllRead } = useLiveFeed(role);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isRead = (n: Notice) => n.read === true || readIds.includes(n.id);
  const unread = feed.filter(n => !isRead(n)).length;

  // No popover primitive in this repo — self-contained dropdown with
  // click-outside + Escape close.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0" onClick={() => setOpen(o => !o)}
        aria-expanded={open} aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-pop text-white text-[9px] font-bold grid place-items-center tabular-nums">
            {unread}
          </span>
        )}
      </Button>
      {open && (
      <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-panel border border-border bg-popover text-popover-foreground shadow-md">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button onClick={() => { setReadIds(feed.map(n => n.id)); if (live) markAllRead(); }}
              className="text-2xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
              <CheckCheck className="size-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {feed.map(n => (
            <button key={n.id} onClick={() => setReadIds(ids => ids.includes(n.id) ? ids : [...ids, n.id])}
              className={`w-full text-left px-3 py-2.5 flex gap-2.5 hover:bg-muted/50 transition-colors ${isRead(n) ? 'opacity-60' : ''}`}>
              <n.icon className={`size-4 mt-0.5 shrink-0 ${n.tone}`} />
              <span className="min-w-0">
                <span className="block text-xs leading-snug">{n.text}</span>
                <span className="block text-2xs text-muted-foreground mt-0.5">{n.time}</span>
              </span>
              {!isRead(n) && <span className="size-1.5 rounded-full bg-tech shrink-0 mt-1.5 ml-auto" />}
            </button>
          ))}
        </div>
        {/* Channels — honest labels only */}
        <div className="px-3 py-2.5 border-t border-border bg-muted/30">
          <p className="label-micro mb-1.5">Where you get these</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 text-2xs rounded-full bg-doc-deposit/10 text-doc-deposit px-2 py-0.5 font-medium"><Bell className="size-2.5" /> In-app</span>
            <span className="inline-flex items-center gap-1 text-2xs rounded-full bg-doc-deposit/10 text-doc-deposit px-2 py-0.5 font-medium"><Mail className="size-2.5" /> Email</span>
            <span className="inline-flex items-center gap-1 text-2xs rounded-full bg-muted text-muted-foreground px-2 py-0.5"><MessageCircle className="size-2.5" /> WhatsApp — coming soon</span>
            <span className="inline-flex items-center gap-1 text-2xs rounded-full bg-muted text-muted-foreground px-2 py-0.5"><Send className="size-2.5" /> Telegram — coming soon</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
