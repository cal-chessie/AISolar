/**
 * Installer Portal — the field cockpit, cal.com-grade (Cal's full lift).
 *
 * Tabs:
 *   1. Today     — the day, in order: jobs by time, start-job (messages the
 *                  customer), navigate, day summary. The landing view.
 *   2. Jobs      — every active + completed job (surveys / installs / handovers)
 *   3. Inbox     — see AND write to the customer (thread per job)
 *   4. Materials — per-job BOM checklists + depot stock
 *   5. Map       — today's ROUTE (Google directions chaining the stops) +
 *                  per-stop navigate. Useful, not decorative.
 *
 * Logic Cal asked for: START JOB → the system messages the client ("arriving,
 * looking forward, simple prep steps") and it lands on the job's thread.
 * Subtle red (today / act now) + blue (upcoming) throughout.
 */
import { useMemo, useState } from 'react';
import { AifieldWordmark } from '@/components/brand/AiosMark';
import { optimiseRoute, coordsForAddress, type GeoPoint } from '@/lib/routeOptimize';
import MapPanel from '@/components/field/MapPanel';
import ClientHub from '@/components/installer/ClientHub';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Wrench, Sun, MapPin, ArrowRight, Package, Cloud, CloudRain, Wind,
  Calendar, Camera, CheckCircle2, AlertTriangle, Navigation, Building2,
  Users, ChevronRight, ClipboardList, MessageSquare, Send, Play, Phone,
  CalendarClock,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { getStage } from '@/lib/leadIntake';
import { useTenantBrand } from '@/lib/tenantBrand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import NotificationsBell from '@/components/notifications/NotificationsBell';

type TabId = 'today' | 'schedule' | 'routing' | 'inbox';

interface Msg { from: 'customer' | 'installer' | 'system'; text: string; at: string }

const navUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

/** The Leinster wholesaler depot — the killer tie-in: jobs + supplier
 *  collection + compliance on ONE screen (Cal's deal, 27 Jul). Demo address;
 *  tenant-config at launch (each region gets its own depot). */
const WHOLESALER_DEPOT = {
  name: 'SolaX Distribution — Leinster depot',
  address: 'Citywest Business Campus, Dublin 24',
};

/** Family tone per weekday for the eagle view — jobs read by hue. */
const DAY_TONE = ['bg-tech', 'bg-doc-deposit', 'bg-doc-proposal', 'bg-pop', 'bg-tech', 'bg-doc-deposit', 'bg-doc-proposal'];

export default function InstallerPortalV5() {
  const tb = useTenantBrand();
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [tab, setTab] = useState<TabId>('today');
  const [threadLead, setThreadLead] = useState<DummyLead | null>(null);
  const [reply, setReply] = useState('');
  const [localMsgs, setLocalMsgs] = useState<Record<string, Msg[]>>({});
  // Week view: drag-and-drop reschedules live here (assignment table at launch)
  const [scheduleOverride, setScheduleOverride] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ lead: DummyLead; from: string; to: string } | null>(null);
  const [moveReason, setMoveReason] = useState<string | null>(null);
  const [moveNote, setMoveNote] = useState('');
  // Map: day route ↔ week eagle view · wholesaler pickup folded into the route
  const [mapView, setMapView] = useState<'day' | 'week'>('day');
  const [pickupStop, setPickupStop] = useState(false);

  // ── job pools ────────────────────────────────────────────────────────────
  const activeJobs = useMemo(() => leads.filter(l => l.assignment && ['install_scheduled', 'installing'].includes(l.workflow_stage)), [leads]);
  const completedJobs = useMemo(() => leads.filter(l => l.assignment && l.assignment.status === 'completed'), [leads]);
  const handoverJobs = useMemo(() => leads.filter(l => l.workflow_stage === 'installed'), [leads]);
  const displayActive = [...activeJobs, ...handoverJobs]; // installs only — surveys are the consultant's
  // Dedupe: a job can sit in two pools (e.g. installed + completed) — one thread each.
  const inboxJobs = [...new Map([...activeJobs, ...handoverJobs, ...completedJobs].map(l => [l.id, l])).values()];

  /** Scheduled date with any drag-and-drop move applied. */
  const effDate = (l: DummyLead): string | undefined =>
    scheduleOverride[l.id] ?? l.assignment?.scheduled_date ?? l.survey?.scheduled_date;

  // ── Today: jobs scheduled today, else the next scheduled day ────────────
  const { dayJobs, dayLabel, isToday } = useMemo(() => {
    const withDate = displayActive
      .map(l => ({ l, d: effDate(l) }))
      .filter((x): x is { l: DummyLead; d: string } => !!x.d)
      .sort((a, b) => +new Date(a.d) - +new Date(b.d));
    const todayStr = new Date().toDateString();
    const todays = withDate.filter(x => new Date(x.d).toDateString() === todayStr);
    if (todays.length) return { dayJobs: todays, dayLabel: 'Today', isToday: true };
    const next = withDate.find(x => +new Date(x.d) > Date.now());
    if (!next) return { dayJobs: [], dayLabel: 'Today', isToday: true };
    const nextDay = new Date(next.d).toDateString();
    return {
      dayJobs: withDate.filter(x => new Date(x.d).toDateString() === nextDay),
      dayLabel: new Date(next.d).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' }),
      isToday: false,
    };
  }, [displayActive, scheduleOverride]);


  const MOVE_REASONS = [
    'Weather warning on your original day — roofs and rain don\'t mix',
    'Materials arriving later than planned',
    'The job before yours is running over',
    'Crew availability changed',
    'A slot opened up — we can get to you sooner',
  ];

  const confirmMove = () => {
    if (!pendingMove || !moveReason) return;
    const { lead, from, to } = pendingMove;
    // keep the original time of day on the new date
    const src = new Date(from); const dst = new Date(to);
    dst.setHours(src.getHours(), src.getMinutes(), 0, 0);
    setScheduleOverride(prev => ({ ...prev, [lead.id]: dst.toISOString() }));
    const fmt = (d: Date) => d.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' });
    const msg = `Hi ${lead.name.split(' ')[0]} — we've moved your ${lead.workflow_stage.includes('survey') ? 'survey' : 'installation'} from ${fmt(src)} to ${fmt(dst)} at ${src.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}. Why: ${moveReason.toLowerCase()}.${moveNote.trim() ? ` ${moveNote.trim()}` : ''} Everything else stays the same — reply here if the new day doesn't suit and we'll sort it.`;
    setLocalMsgs(prev => ({ ...prev, [lead.id]: [...(prev[lead.id] ?? []), { from: 'system', text: msg, at: new Date().toISOString() }] }));
    toast.success(`${lead.name.split(' ')[0]} notified of the move`, { description: `Rescheduled to ${fmt(dst)} — reason sent to their portal + email.` });
    setPendingMove(null); setMoveReason(null); setMoveNote('');
  };

  const sendReply = (lead: DummyLead) => {
    if (!reply.trim()) return;
    setLocalMsgs(prev => ({
      ...prev,
      [lead.id]: [...(prev[lead.id] ?? []), { from: 'installer', text: reply.trim(), at: new Date().toISOString() }],
    }));
    setReply('');
    toast.success('Sent to the customer', { description: 'Delivered to their portal thread + email notification.' });
  };

  /** Thread = comms touchpoints + local messages. */
  const threadFor = (lead: DummyLead): Msg[] => {
    const fromTouchpoints: Msg[] = lead.touchpoints
      .filter(tp => ['email', 'portal', 'phone'].includes(tp.channel))
      .map(tp => ({
        from: tp.direction === 'inbound' ? 'customer' as const : 'system' as const,
        text: tp.summary ?? '',
        at: tp.timestamp,
      }));
    return [...fromTouchpoints, ...(localMsgs[lead.id] ?? [])];
  };

  const TABS: Array<{ id: TabId; label: string; icon: typeof Sun; count?: number }> = [
    { id: 'today', label: 'Today', icon: CalendarClock },
    { id: 'schedule', label: 'Schedule', icon: Calendar, count: displayActive.length },
    { id: 'routing', label: 'Routing', icon: MapPin },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare, count: inboxJobs.length },
  ];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" data-density="comfortable">
      {/* ── header: the SAME app-shell as the consultant cockpit (full-bleed,
           not a centred column) — matched 28 Jul so both apps read as one. ── */}
      <header className="bg-background border-b flex-shrink-0">
        <div className="px-4 py-2 flex items-center gap-2">
          <AifieldWordmark className="size-9" />
          <span className="font-bold text-sm">{tb.name}</span>
          <span className="text-xs text-muted-foreground">Installer</span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/owner')}><Building2 className="h-3.5 w-3.5 mr-1" /> Owner</Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/consultant')}><Users className="h-3.5 w-3.5 mr-1" /> Consultant</Button>
            <NotificationsBell role="installer" />
            <DarkModeToggle />
          </div>
        </div>
        {/* weather strip — real signal for roof work */}
        <div className="px-4 pb-2 flex items-center gap-4 text-xs overflow-x-auto scrollbar-hide">
          <span className="flex items-center gap-1 shrink-0"><Cloud className="h-3 w-3" /> 18°C Dublin</span>
          <span className="flex items-center gap-1 shrink-0 text-doc-proposal"><CloudRain className="h-3 w-3 text-doc-proposal" /> Yellow rain warning tomorrow</span>
          <span className="flex items-center gap-1 shrink-0"><Wind className="h-3 w-3" /> 12 km/h SW</span>
          <span className="flex items-center gap-1 shrink-0"><Sun className="h-3 w-3" /> Sunset 21:47</span>
        </div>
        {/* tabs — identical styling to the consultant cockpit */}
        <div className="flex gap-0.5 px-2 pb-1.5 overflow-x-auto scrollbar-hide">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setThreadLead(null); }}
                className={`flex items-center gap-1.5 px-4 h-control rounded-control text-[15px] font-semibold whitespace-nowrap cursor-pointer transition-colors duration-instant border ${active ? 'bg-muted text-foreground border-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border-transparent'}`}>
                <Icon className="size-4" /> {t.label}
                {!!t.count && <span className={`text-2xs px-1.5 rounded-full tabular-nums ${t.id === 'today' && isToday && t.count > 0 ? 'bg-pop/10 text-pop font-semibold' : 'bg-muted-foreground/15'}`}>{t.count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 pb-24">
        {/* No AnimatePresence here: its exit got stuck and froze tab content.
            An operator tool switches instantly; the fade earned nothing. */}
        <div key={tab} className="animate-in fade-in duration-150">

            {/* ═══ TODAY — the one install, in full (client hub + map) ═══ */}
            {tab === 'today' && (() => {
              const nextInstall = dayJobs[0]?.l;
              const embed = nextInstall
                ? `https://maps.google.com/maps?q=${encodeURIComponent(nextInstall.address)}&z=14&output=embed`
                : 'https://maps.google.com/maps?q=Dublin,Ireland&t=m&z=11&output=embed';
              return (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold tracking-tight">{isToday ? "Today's install" : `Next install · ${dayLabel}`}</h2>
                    {nextInstall && <button className="ml-auto text-xs font-medium text-tech hover:underline underline-offset-4" onClick={() => setTab('routing')}>View the week's routing <ArrowRight className="inline size-3" /></button>}
                  </div>
                  {nextInstall ? (
                    <div className="grid gap-3 lg:grid-cols-[3fr_7fr] lg:items-start">
                      <div className="lg:order-1"><ClientHub lead={nextInstall} dateLabel={isToday ? 'today' : dayLabel} onStart={() => navigate(`/job/${nextInstall.id}`)} onMessage={() => { setTab('inbox'); setThreadLead(nextInstall); }} /></div>
                      <MapPanel embedSrc={embed} fullRouteUrl={navUrl(nextInstall.address)} aspect="aspect-[4/3] lg:aspect-auto lg:h-[70vh]" className="lg:order-2 lg:sticky lg:top-4 lg:self-start" />
                    </div>
                  ) : (
                    <div className="rounded-panel bg-card shadow-card p-8 text-center text-sm text-muted-foreground">No install scheduled. The agent fills this as installs are booked.</div>
                  )}
                </div>
              );
            })()}

            {/* ═══ WEEK — drag a job to another day; the customer hears why ═══ */}
            {tab === 'schedule' && (() => {
              const days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0);
                return d;
              });
              const jobsFor = (day: Date) => displayActive
                .map(l => ({ l, d: effDate(l) }))
                .filter((x): x is { l: DummyLead; d: string } => !!x.d && new Date(x.d).toDateString() === day.toDateString())
                .sort((a, b) => +new Date(a.d) - +new Date(b.d));
              return (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold tracking-tight">This week</h2>
                    <p className="text-sm text-muted-foreground">Drag a job to another day — the customer gets told why.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
                    {days.map((day, di) => {
                      const dayJobsHere = jobsFor(day);
                      const isDayToday = di === 0;
                      return (
                        <div key={di}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => {
                            if (!dragId) return;
                            const lead = displayActive.find(l => l.id === dragId);
                            const from = lead ? effDate(lead) : undefined;
                            setDragId(null);
                            if (!lead || !from) return;
                            if (new Date(from).toDateString() === day.toDateString()) return;
                            setPendingMove({ lead, from, to: day.toISOString() });
                          }}
                          className={`rounded-panel bg-card shadow-card min-h-[9rem] flex flex-col ${isDayToday ? 'ring-1 ring-pop/40' : ''}`}>
                          <div className="px-2.5 py-1.5 border-b border-border flex items-baseline gap-1">
                            <span className={`text-xs font-semibold ${isDayToday ? 'text-pop' : ''}`}>{day.toLocaleDateString('en-IE', { weekday: 'short' })}</span>
                            <span className="text-2xs text-muted-foreground tabular-nums">{day.getDate()}</span>
                            {dayJobsHere.length > 0 && <span className="ml-auto text-2xs tabular-nums text-muted-foreground">{dayJobsHere.length}</span>}
                          </div>
                          <div className="flex-1 p-1.5 space-y-1.5">
                            {dayJobsHere.map(({ l, d }) => {
                              const isSurvey = l.workflow_stage.includes('survey');
                              return (
                                <div key={l.id}
                                  draggable
                                  onDragStart={() => setDragId(l.id)}
                                  onDragEnd={() => setDragId(null)}
                                  className={`rounded-control border-l-4 ${isSurvey ? 'border-l-tech' : 'border-l-primary'} bg-background shadow-card p-2 cursor-grab active:cursor-grabbing ${dragId === l.id ? 'opacity-40' : ''}`}>
                                  <p className="text-xs font-medium truncate">{l.name}</p>
                                  <p className="text-2xs text-muted-foreground tabular-nums">{new Date(d).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })} · {isSurvey ? 'Survey' : 'Install'}</p>
                                </div>
                              );
                            })}
                            {dayJobsHere.length === 0 && <p className="text-2xs text-muted-foreground/50 text-center pt-4">—</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-2xs text-muted-foreground">Sunday work needs the customer's OK — the message asks them to reply if it doesn't suit.</p>
                </div>
              );
            })()}

            {/* ═══ INBOX ═══ */}
            {tab === 'inbox' && (
              <div className="grid lg:grid-cols-[minmax(240px,1fr)_2fr] gap-3 items-start">
                {/* job list */}
                <div className={`space-y-1.5 ${threadLead ? 'hidden lg:block' : ''}`}>
                  {inboxJobs.map(l => {
                    const th = threadFor(l);
                    const last = th[th.length - 1];
                    return (
                      <button key={l.id} onClick={() => setThreadLead(l)}
                        className={`w-full rounded-panel p-3 text-left transition-colors ${threadLead?.id === l.id ? 'bg-primary/5 shadow-card' : 'bg-card shadow-card hover:bg-muted/50'}`}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback className="text-[11px]">{l.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                          <span className="text-sm font-medium truncate flex-1">{l.name}</span>
                          <span className="text-2xs text-muted-foreground">{getStage(l.workflow_stage)?.label}</span>
                        </div>
                        {last && <p className="mt-1 text-xs text-muted-foreground truncate">{last.text}</p>}
                      </button>
                    );
                  })}
                </div>

                {/* thread */}
                {threadLead ? (
                  <div className="rounded-panel bg-card shadow-card flex flex-col min-h-[24rem] max-h-[calc(100dvh-16rem)]">
                    <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border shrink-0">
                      <button className="lg:hidden text-muted-foreground" onClick={() => setThreadLead(null)} aria-label="Back">←</button>
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[11px]">{threadLead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                      <div className="leading-tight min-w-0">
                        <p className="text-sm font-semibold truncate">{threadLead.name}</p>
                        <p className="text-2xs text-muted-foreground truncate">{threadLead.address}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <a href={`tel:${threadLead.phone ?? ''}`} className="inline-grid place-items-center size-8 rounded-control hover:bg-muted" aria-label="Call"><Phone className="size-4" /></a>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(`/job/${threadLead.id}`)}>Open job</Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto scroll-slim p-4 space-y-2.5">
                      {threadFor(threadLead).map((m, i) => (
                        <div key={i} className={`max-w-[85%] rounded-panel px-3 py-2 text-sm leading-body ${m.from === 'customer' ? 'bg-muted mr-auto' : m.from === 'installer' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-tech/10 text-foreground ml-auto'}`}>
                          {m.from === 'system' && <p className="label-micro mb-0.5 text-tech">auto · {tb.name}</p>}
                          {m.text}
                        </div>
                      ))}
                      {threadFor(threadLead).length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No messages yet — say hello before you arrive.</p>}
                    </div>
                    <div className="border-t border-border p-3 flex items-center gap-2 shrink-0">
                      <input
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendReply(threadLead)}
                        placeholder={`Message ${threadLead.name.split(' ')[0]}…`}
                        className="flex-1 h-10 rounded-control border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                      />
                      <Button size="sm" className="h-10" onClick={() => sendReply(threadLead)} disabled={!reply.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="hidden lg:grid rounded-panel bg-card shadow-card min-h-[24rem] place-items-center text-sm text-muted-foreground">
                    Pick a customer to open the thread
                  </div>
                )}
              </div>
            )}

            {/* ═══ MAP — jobs + supplier collection + compliance, ONE screen.
                 Day = the route in time order (one loop, never back twice).
                 Week = the eagle view: every stop, colour-coded by day.
                 Pickup = the wholesaler depot folded in as stop 0 (the deal). ═══ */}
            {tab === 'routing' && (() => {
              const weekJobs = displayActive
                .map(l => ({ l, d: effDate(l) }))
                .filter((x): x is { l: DummyLead; d: string } => !!x.d && +new Date(x.d) < Date.now() + 7 * 864e5 && +new Date(x.d) > Date.now() - 864e5)
                .sort((a, b) => +new Date(a.d) - +new Date(b.d));
              const byDay = [...new Map(weekJobs.map(x => [new Date(x.d).toDateString(), true])).keys()];
              const listed = mapView === 'day' ? dayJobs : weekJobs;

              // THE REAL SOLVE — only for a single day's loop (a week isn't one
              // drive). Optimise the JOB order (depot pinned as the fixed start
              // when picking up). If any address is off-gazetteer we DON'T claim
              // optimisation — honest as-listed order, no invented saving.
              const depotPt = pickupStop ? coordsForAddress(WHOLESALER_DEPOT.address) : null;
              const stopPts = listed.map(({ l }) => coordsForAddress(l.address));
              const canSolve = mapView === 'day' && listed.length >= 2 && stopPts.every(Boolean) && (!pickupStop || depotPt);
              let stops = listed;
              let solve: ReturnType<typeof optimiseRoute> = null;
              if (canSolve) {
                const pts = [...(depotPt ? [depotPt] : []), ...(stopPts as GeoPoint[])];
                // pin the start only when it's the depot (gear collected first);
                // otherwise the crew leaves from home — no fixed start.
                solve = optimiseRoute(pts, !!depotPt);
                if (solve) {
                  const depotOffset = depotPt ? 1 : 0;
                  // drop the pinned depot slot, map remaining order back to jobs
                  stops = solve.order.filter(i => i >= depotOffset).map(i => listed[i - depotOffset]);
                }
              }

              const addrs = [...(pickupStop && stops.length ? [WHOLESALER_DEPOT.address] : []), ...stops.map(({ l }) => l.address)];
              const fullRouteUrl = `https://www.google.com/maps/dir/${addrs.map(encodeURIComponent).join('/')}`;
              const embedSrc = addrs.length >= 2
                ? `https://maps.google.com/maps?saddr=${encodeURIComponent(addrs[0])}&daddr=${addrs.slice(1).map(encodeURIComponent).join('+to:')}&output=embed`
                : addrs.length === 1
                  ? `https://maps.google.com/maps?q=${encodeURIComponent(addrs[0])}&z=13&output=embed`
                  : 'https://maps.google.com/maps?q=Dublin,Ireland&t=m&z=11&output=embed';
              const tmrw = new Date(Date.now() + 864e5).toDateString();
              const rainRisk = (d: string, l: DummyLead) =>
                new Date(d).toDateString() === tmrw && !l.workflow_stage.includes('survey');
              const first = stops[0]?.d, last = stops[stops.length - 1]?.d;
              const t = (d: string) => new Date(d).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Day ↔ Week eagle toggle */}
                    <div className="inline-flex rounded-control border border-border p-0.5">
                      {(['day', 'week'] as const).map(v => (
                        <button key={v} onClick={() => setMapView(v)}
                          className={`h-8 px-3 rounded-[7px] text-xs font-semibold transition-colors ${mapView === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                          {v === 'day' ? (isToday ? "Today's route" : dayLabel) : 'Week — eagle view'}
                        </button>
                      ))}
                    </div>
                    {/* The wholesaler pickup — the deal, on the route */}
                    <button onClick={() => setPickupStop(p => !p)}
                      className={`h-8 inline-flex items-center gap-1.5 rounded-control border px-3 text-xs font-semibold transition-colors ${pickupStop ? 'border-doc-proposal bg-doc-proposal/10 text-doc-proposal' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                      <Package className="h-3.5 w-3.5" /> Collect at the depot first
                    </button>
                    {stops.length > 0 && (
                      <a href={fullRouteUrl} target="_blank" rel="noreferrer"
                        className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-control bg-tech px-3 text-xs font-semibold text-white hover:bg-tech/90 transition-colors">
                        <Navigation className="h-3.5 w-3.5" /> Open full route
                      </a>
                    )}
                  </div>
                  {/* the insight line — a COMPUTED saving or honest neutral copy,
                       never a slogan the code doesn't back (Cal, 28 Jul). */}
                  {stops.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {solve && solve.savedKm >= 0.5 ? (
                        <>
                          <span className="text-doc-deposit font-semibold">Smart route · ~{solve.optimisedKm.toFixed(0)} km</span>
                          {' — saves ~'}{solve.savedKm.toFixed(0)} km{solve.savedMin >= 1 ? ` (${solve.savedMin} min)` : ''} vs the unplanned order. One loop home.
                        </>
                      ) : solve ? (
                        <><span className="text-doc-deposit font-semibold">Smart route · ~{solve.optimisedKm.toFixed(0)} km</span> — already the shortest loop.</>
                      ) : (
                        <>{stops.length} {stops.length === 1 ? 'stop' : 'stops'}{pickupStop ? ' + the depot' : ''}{mapView === 'week' ? ', across the week' : ', in appointment order'}.</>
                      )}
                    </p>
                  )}
                  {/* list 30% · map 70% (wide + 70vh) — the same shape as the
                       consultant Route, so both apps read as one. */}
                  <div className="grid gap-3 lg:grid-cols-[3fr_7fr]">
                    <div className="lg:order-1 space-y-2">
                  {/* depot card — what the shelf holds for this run */}
                  {pickupStop && stops.length > 0 && (
                    <div className="rounded-panel bg-card shadow-card p-3 flex items-center gap-3 border-l-2 border-doc-proposal">
                      <span className="size-6 rounded-full grid place-items-center text-xs font-bold text-white shrink-0 bg-doc-proposal">0</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{WHOLESALER_DEPOT.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{WHOLESALER_DEPOT.address} · SolaX gear for {stops.filter(({ l }) => !l.workflow_stage.includes('survey')).length} install{stops.filter(({ l }) => !l.workflow_stage.includes('survey')).length === 1 ? '' : 's'} on this run</div>
                      </div>
                      <a href={navUrl(WHOLESALER_DEPOT.address)} target="_blank" rel="noreferrer" className="inline-grid place-items-center size-9 rounded-control border border-border hover:bg-muted transition-colors" aria-label="Navigate to depot">
                        <Navigation className="h-4 w-4 text-doc-proposal" />
                      </a>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {stops.map(({ l, d }, i) => {
                      const dayIdx = byDay.indexOf(new Date(d).toDateString());
                      const risk = rainRisk(d, l);
                      return (
                        <div key={l.id} className="rounded-panel bg-card shadow-card p-3 flex items-center gap-3">
                          <span className={`size-6 rounded-full grid place-items-center text-xs font-bold text-white shrink-0 ${mapView === 'week' ? DAY_TONE[dayIdx % DAY_TONE.length] : i === 0 ? 'bg-pop' : 'bg-tech'}`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {l.name}
                              <span className="text-muted-foreground font-normal"> · {mapView === 'week' ? `${new Date(d).toLocaleDateString('en-IE', { weekday: 'short' })} ${t(d)}` : t(d)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{l.address}</div>
                            {risk && (
                              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-doc-proposal/10 text-doc-proposal px-2 py-0.5 text-2xs font-semibold">
                                ⚠ Rain warning tomorrow — roof job
                                <button className="underline underline-offset-2 hover:opacity-80"
                                  onClick={() => setPendingMove({ lead: l, from: d, to: new Date(+new Date(d) + 864e5).toISOString() })}>
                                  Move it
                                </button>
                              </span>
                            )}
                          </div>
                          <a href={navUrl(l.address)} target="_blank" rel="noreferrer" className="inline-grid place-items-center size-9 rounded-control border border-border hover:bg-muted transition-colors" aria-label={`Navigate to ${l.name}`}>
                            <Navigation className="h-4 w-4 text-tech" />
                          </a>
                          <button className="inline-grid place-items-center size-9 rounded-control border border-border hover:bg-muted transition-colors" onClick={() => navigate(`/job/${l.id}`)} aria-label={`Open ${l.name}`}>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    {stops.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No stops to route.</p>}
                  </div>
                    </div>
                    <MapPanel embedSrc={embedSrc} fullRouteUrl={fullRouteUrl} aspect="aspect-[4/3] lg:aspect-auto lg:h-[70vh]" className="lg:order-2 lg:sticky lg:top-4 lg:self-start" />
                  </div>
                </div>
              );
            })()}

          </div>
      </main>

      {/* move-reason modal: tell the customer WHY before the move lands */}
      {pendingMove && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Reschedule reason">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setPendingMove(null); setMoveReason(null); }} />
          <div className="absolute inset-x-3 bottom-3 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[26rem] rounded-panel bg-background shadow-card p-5">
            <h3 className="text-md font-semibold">Moving {pendingMove.lead.name.split(' ')[0]}'s job</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(pendingMove.from).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' })} → {new Date(pendingMove.to).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' })}. Pick the reason they'll be given:
            </p>
            <div className="mt-3 space-y-1.5">
              {MOVE_REASONS.map(r => (
                <button key={r} type="button" onClick={() => setMoveReason(r)}
                  className={`w-full text-left rounded-control border px-3 py-2 text-sm transition-colors ${moveReason === r ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
                  {r}
                </button>
              ))}
            </div>
            <input
              value={moveNote}
              onChange={e => setMoveNote(e.target.value)}
              placeholder="Optional personal note…"
              className="mt-3 w-full h-10 rounded-control border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            />
            <div className="mt-4 flex items-center gap-2">
              <Button className="flex-1 h-10" onClick={confirmMove} disabled={!moveReason}>
                Move + notify customer
              </Button>
              <Button variant="outline" className="h-10" onClick={() => { setPendingMove(null); setMoveReason(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ONE install flow: every install card opens /job/:id (JobViewV2).
          InstallRunner retired 28 Jul — its moat (serials + triple check)
          lives in JobViewV2's commissioning tab now. */}
      {/* AI Coach mounted once globally in App.tsx — no local copy (double-mount). */}
    </div>
  );
}

// ============= JOB CARD =============
function JobCard({ lead, variant, onClick }: { lead: DummyLead; variant: 'survey' | 'install' | 'handover' | 'completed'; onClick: () => void }) {
  const proposal = lead.proposal;
  const survey = lead.survey;
  const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  const isToday = !!lead.assignment?.scheduled_date &&
    new Date(lead.assignment.scheduled_date).toDateString() === new Date().toDateString();
  const edge = isToday ? 'border-l-pop' : (variant === 'survey' || variant === 'install') ? 'border-l-tech' : 'border-l-primary/40';

  return (
    <div className={`rounded-panel bg-card shadow-card cursor-pointer hover:shadow-md transition-shadow border-l-4 ${edge}`} onClick={onClick}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{lead.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.address.split(',').slice(-2).join(',').trim()}</span>
              </div>
              {variant === 'survey' && survey && <div className="text-xs text-tech mt-0.5">{survey.photo_count || 0}/8 photos · {survey.roof_type} roof</div>}
              {variant === 'install' && proposal && <div className="text-xs text-muted-foreground mt-0.5">{proposal.system_size_kw} kWp · {proposal.panel_count} panels{proposal.battery_model ? ' + battery' : ''}</div>}
              {variant === 'handover' && <div className="text-xs text-primary mt-0.5">Warranty sent · Final invoice pending</div>}
              {variant === 'completed' && <div className="text-xs text-doc-deposit mt-0.5">Completed · {lead.assignment?.completed_date ? new Date(lead.assignment.completed_date).toLocaleDateString('en-IE') : ''}</div>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xs tabular-nums ${isToday ? 'text-pop font-semibold' : 'text-muted-foreground'}`}>
              {lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) : 'TBD'}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
