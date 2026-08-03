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
import ConversationInbox from '@/components/shared/ConversationInbox';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Wrench, Sun, MapPin, ArrowRight, Package, Cloud, CloudRain, Wind,
  Calendar, Camera, CheckCircle2, AlertTriangle, Navigation, Building2,
  Users, ChevronRight, ClipboardList, MessageSquare, Play, Phone,
  CalendarClock, X,
} from 'lucide-react';
import { type DummyLead } from '@/lib/dummyData';
import { useLeads } from '@/lib/realLeads';
import { getStage } from '@/lib/leadIntake';
import { useTenantBrand } from '@/lib/tenantBrand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import NotificationsBell from '@/components/notifications/NotificationsBell';
import { AppShell, type ShellNavItem } from '@/components/layout/AppShell';

type TabId = 'today' | 'schedule' | 'routing' | 'inbox';

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
  const { leads, setLeads } = useLeads();
  const [tab, setTab] = useState<TabId>('today');
  // The inbox selection is by id so the thread stays live as touchpoints append.
  const [threadLeadId, setThreadLeadId] = useState<string | null>(null);
  // Schedule → the client roster opens the client hub in a slide-over.
  const [rosterLeadId, setRosterLeadId] = useState<string | null>(null);

  /** Append a message to the client's ONE conversation (a touchpoint on the
   *  lead), so it shows in the consultant + customer threads too — same record.
   *  Real send (Postmark) + cross-device sync is the Sweep 8 wire-up. */
  const appendTouchpoint = (leadId: string, t: { actor: 'installer' | 'system'; summary: string; direction?: 'inbound' | 'outbound' }) => {
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      touchpoints: [...l.touchpoints, {
        stage: l.workflow_stage,
        channel: 'portal' as const,
        direction: t.direction ?? 'outbound',
        summary: t.summary,
        timestamp: new Date().toISOString(),
        actor: t.actor,
      }],
    } : l));
  };
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
    appendTouchpoint(lead.id, { actor: 'system', summary: msg });
    toast.success(`Moved to ${fmt(dst)}`, { description: `The reason is on ${lead.name.split(' ')[0]}'s conversation. Real send lands with messaging wire-up.` });
    setPendingMove(null); setMoveReason(null); setMoveNote('');
  };

  /** The installer's reply — an OUTBOUND installer touchpoint, i.e. part of the
   *  ONE centralised thread (same as the consultant's reply). No send claimed. */
  const sendReply = (lead: DummyLead, text: string) => {
    appendTouchpoint(lead.id, { actor: 'installer', summary: text });
  };

  const TABS: Array<{ id: TabId; label: string; icon: typeof Sun; count?: number }> = [
    { id: 'today', label: 'Today', icon: CalendarClock },
    { id: 'schedule', label: 'Schedule', icon: Calendar, count: displayActive.length },
    { id: 'routing', label: 'Routing', icon: MapPin },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare, count: inboxJobs.length },
  ];

  // ── ONE app shell (Cal, 3 Aug: the heart) — same frame as owner + consultant.
  // Installer keeps data-density="comfortable" via AppShell's persona (44px+
  // targets: gloves, one hand, outdoors).
  const shellNav: ShellNavItem[] = TABS.map(t => ({
    id: t.id,
    label: t.label,
    icon: <t.icon />,
    onSelect: () => { setTab(t.id); setThreadLeadId(null); },
    badge: t.count || undefined,
    primary: true, // 4 tabs → all ride the mobile bottom nav
  }));

  return (
    <AppShell
      persona="installer"
      brandName={tb.name}
      personaLabel="Installer"
      nav={shellNav}
      activeId={tab}
      title={TABS.find(t => t.id === tab)?.label ?? 'Today'}
      headerExtra={<>
        <NotificationsBell role="installer" />
        <Button variant="ghost" size="sm" className="p-2 h-8" title="Owner cockpit" aria-label="Switch to owner cockpit" onClick={() => navigate('/owner')}><Building2 className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="sm" className="p-2 h-8" title="Consultant view" aria-label="Switch to consultant view" onClick={() => navigate('/consultant')}><Users className="h-3.5 w-3.5" /></Button>
        <DarkModeToggle />
      </>}
      flush
    >
      <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 pb-24 lg:pb-6">
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
                    {/* the week ahead — just a little arrow (Cal, 29 Jul) */}
                    <button onClick={() => setTab('schedule')} className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors" aria-label="See the week ahead" title="See the week ahead">
                      the week ahead <ChevronRight className="size-3.5" />
                    </button>
                    {nextInstall && <button className="ml-auto text-xs font-medium text-tech hover:underline underline-offset-4" onClick={() => setTab('routing')}>View the week's routing <ArrowRight className="inline size-3" /></button>}
                  </div>
                  {nextInstall ? (
                    <div className="grid gap-3 lg:grid-cols-[3fr_7fr] lg:items-start">
                      <div className="lg:order-1"><ClientHub lead={nextInstall} dateLabel={isToday ? 'today' : dayLabel} onStart={() => navigate(`/job/${nextInstall.id}`)} onMessage={() => { setTab('inbox'); setThreadLeadId(nextInstall.id); }} /></div>
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
              const rShortAddr = (l: DummyLead) => l.address.split(',').slice(-2).join(',').trim();
              // The full client roster (every install, scheduled or done) + the
              // unscheduled queue: won jobs (deposit paid, no date) the agent
              // will place. Both open the client hub — the ONE client surface.
              const roster = [...new Map([...displayActive, ...completedJobs].map(l => [l.id, l])).values()]
                .sort((a, b) => +new Date(a.assignment?.scheduled_date ?? a.assignment?.completed_date ?? 0) - +new Date(b.assignment?.scheduled_date ?? b.assignment?.completed_date ?? 0));
              const unscheduledInstalls = leads.filter(l => ['approved', 'deposit_paid'].includes(l.workflow_stage) && !l.assignment);
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

                  {/* Unscheduled queue — won jobs awaiting an install date */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-sm font-semibold tracking-tight">Unscheduled</h3>
                      <span className="text-xs text-muted-foreground">won, awaiting a date</span>
                      <span className="ml-auto text-2xs tabular-nums text-muted-foreground">{unscheduledInstalls.length}</span>
                    </div>
                    {unscheduledInstalls.length ? (
                      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                        {unscheduledInstalls.map(l => (
                          <button key={l.id} onClick={() => setRosterLeadId(l.id)}
                            className="rounded-panel bg-card shadow-card p-3 text-left hover:bg-muted/50 transition-colors border-l-4 border-l-doc-deposit">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7"><AvatarFallback className="text-[11px]">{l.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                              <span className="text-sm font-medium truncate flex-1">{l.name}</span>
                              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                            </div>
                            <p className="mt-1 text-2xs text-muted-foreground truncate">{l.proposal?.system_size_kw}kWp · {getStage(l.workflow_stage)?.label} · {rShortAddr(l)}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-2xs text-muted-foreground">Nothing waiting — every won job has a date. The agent places new ones as deposits land.</p>
                    )}
                  </div>

                  {/* The full client roster — every install, tap to open the hub */}
                  <div className="pt-1 space-y-2">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-sm font-semibold tracking-tight">Client roster</h3>
                      <span className="text-xs text-muted-foreground">every install — tap to open the hub</span>
                      <span className="ml-auto text-2xs tabular-nums text-muted-foreground">{roster.length}</span>
                    </div>
                    <div className="rounded-panel bg-card shadow-card divide-y divide-border overflow-hidden">
                      {roster.map(l => (
                        <button key={l.id} onClick={() => setRosterLeadId(l.id)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors">
                          <Avatar className="h-8 w-8"><AvatarFallback className="text-[11px]">{l.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{l.name}</p>
                            <p className="text-2xs text-muted-foreground truncate">{l.proposal?.system_size_kw}kWp · {rShortAddr(l)}</p>
                          </div>
                          <Badge variant="outline" className="text-2xs shrink-0 hidden sm:inline-flex">{getStage(l.workflow_stage)?.label}</Badge>
                          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ═══ INBOX — the SAME component + the SAME centralised conversation
                 as the consultant (Cal, 28 Jul). One thread per client; a reply
                 here is an installer touchpoint on that one record. ═══ */}
            {tab === 'inbox' && (
              <ConversationInbox
                leads={inboxJobs}
                selectedId={threadLeadId}
                onSelect={l => setThreadLeadId(l.id)}
                onBack={() => setThreadLeadId(null)}
                onReply={(l, text) => sendReply(l, text)}
                audience="installer"
                emptyThreadHint="No messages yet — say hello before you arrive."
                onAction={l => navigate(`/job/${l.id}`)}
                headerActions={l => (
                  <>
                    <a href={`tel:${l.phone ?? ''}`} className="inline-grid place-items-center size-8 rounded-control hover:bg-muted" aria-label="Call"><Phone className="size-4" /></a>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(`/job/${l.id}`)}>Open job</Button>
                  </>
                )}
              />
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
      {/* client hub slide-over — the Schedule roster + unscheduled queue open the
          ONE client surface here (profile · BOM · message · Start) without
          leaving Schedule. Same hub Today uses. */}
      {rosterLeadId && (() => {
        const rl = leads.find(l => l.id === rosterLeadId);
        if (!rl) return null;
        const when = rl.assignment?.scheduled_date
          ? new Date(rl.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })
          : 'unscheduled';
        return (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${rl.name} — client hub`}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setRosterLeadId(null)} />
            <div className="absolute inset-y-0 right-0 w-full max-w-md bg-background shadow-card flex flex-col animate-in slide-in-from-right duration-200">
              <div className="flex items-center gap-2 px-4 h-12 border-b border-border shrink-0">
                <span className="text-sm font-semibold">Client hub</span>
                <span className="text-2xs text-muted-foreground">· {when}</span>
                <button className="ml-auto grid place-items-center size-8 rounded-control hover:bg-muted" onClick={() => setRosterLeadId(null)} aria-label="Close">
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <ClientHub
                  lead={rl}
                  dateLabel={when}
                  onStart={() => { setRosterLeadId(null); navigate(`/job/${rl.id}`); }}
                  onMessage={() => { setRosterLeadId(null); setTab('inbox'); setThreadLeadId(rl.id); }}
                />
              </div>
            </div>
          </div>
        );
      })()}
      {/* ONE install flow: every install card opens /job/:id (JobViewV2).
          InstallRunner retired 28 Jul — its moat (serials + triple check)
          lives in JobViewV2's commissioning tab now. */}
      {/* AI Coach mounted once globally in App.tsx — no local copy (double-mount). */}
    </AppShell>
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
