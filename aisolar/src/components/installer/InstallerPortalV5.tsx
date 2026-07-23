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
import { AiosMark } from '@/components/brand/AiosMark';
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
import RoleBasedAICoach from '@/components/ai/RoleBasedAICoach';

type TabId = 'today' | 'week' | 'jobs' | 'inbox' | 'materials' | 'map';

interface Msg { from: 'customer' | 'installer' | 'system'; text: string; at: string }

const navUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

export default function InstallerPortalV5() {
  const tb = useTenantBrand();
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [tab, setTab] = useState<TabId>('today');
  const [jobSubTab, setJobSubTab] = useState<'active' | 'completed'>('active');
  const [matSubTab, setMatSubTab] = useState<'per_customer' | 'stock'>('per_customer');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [startedJobs, setStartedJobs] = useState<Set<string>>(new Set());
  const [threadLead, setThreadLead] = useState<DummyLead | null>(null);
  const [reply, setReply] = useState('');
  const [localMsgs, setLocalMsgs] = useState<Record<string, Msg[]>>({});
  // Week view: drag-and-drop reschedules live here (assignment table at launch)
  const [scheduleOverride, setScheduleOverride] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ lead: DummyLead; from: string; to: string } | null>(null);
  const [moveReason, setMoveReason] = useState<string | null>(null);
  const [moveNote, setMoveNote] = useState('');

  // ── job pools ────────────────────────────────────────────────────────────
  const activeJobs = useMemo(() => leads.filter(l => l.assignment && ['install_scheduled', 'installing'].includes(l.workflow_stage)), [leads]);
  const completedJobs = useMemo(() => leads.filter(l => l.assignment && l.assignment.status === 'completed'), [leads]);
  const surveyJobs = useMemo(() => leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage)), [leads]);
  const handoverJobs = useMemo(() => leads.filter(l => l.workflow_stage === 'installed'), [leads]);
  const displayActive = [...surveyJobs, ...activeJobs, ...handoverJobs];
  const inboxJobs = [...surveyJobs, ...activeJobs, ...handoverJobs, ...completedJobs];

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

  // ── start job → the system messages the client ──────────────────────────
  const startJob = (lead: DummyLead) => {
    setStartedJobs(prev => new Set(prev).add(lead.id));
    const msg = `Hi ${lead.name.split(' ')[0]} — great news, your ${lead.workflow_stage.includes('survey') ? 'survey' : 'installation'} team is on the way. Before we arrive: please keep driveway access clear, unlock attic access if you have it, and keep pets indoors while we work. Looking forward to getting your system ${lead.workflow_stage.includes('survey') ? 'measured up' : 'live'}!`;
    setLocalMsgs(prev => ({
      ...prev,
      [lead.id]: [...(prev[lead.id] ?? []), { from: 'system', text: msg, at: new Date().toISOString() }],
    }));
    toast.success(`${lead.name.split(' ')[0]} has been messaged`, {
      description: 'Arrival notice + prep steps sent to their portal and email.',
    });
  };

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
      .filter(tp => ['email', 'sms', 'portal', 'phone'].includes(tp.channel))
      .map(tp => ({
        from: tp.direction === 'inbound' ? 'customer' as const : 'system' as const,
        text: tp.summary ?? '',
        at: tp.timestamp,
      }));
    return [...fromTouchpoints, ...(localMsgs[lead.id] ?? [])];
  };

  const TABS: Array<{ id: TabId; label: string; icon: typeof Sun; count?: number }> = [
    { id: 'today', label: 'Today', icon: CalendarClock, count: dayJobs.length },
    { id: 'week', label: 'Week', icon: Calendar },
    { id: 'jobs', label: 'Jobs', icon: Wrench, count: displayActive.length },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare, count: inboxJobs.length },
    { id: 'materials', label: 'Materials', icon: Package },
    { id: 'map', label: 'Map', icon: MapPin, count: dayJobs.length },
  ];

  return (
    <div className="min-h-dvh bg-background" data-density="comfortable">
      {/* ── header: slim, cal.com ─────────────────────────────────────────── */}
      <header className="bg-background/90 backdrop-blur border-b border-border/60 sticky top-0 z-30">
        <div className="px-4 h-14 flex items-center gap-3">
          <AiosMark className="size-8" />
          <div className="leading-tight">
            <span className="font-semibold text-sm">{tb.name} Field</span>
            <span className="block text-2xs text-muted-foreground">{new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-8 hidden sm:inline-flex" onClick={() => navigate('/owner')}><Building2 className="h-3.5 w-3.5 mr-1" /> Owner</Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 hidden sm:inline-flex" onClick={() => navigate('/consultant')}><Users className="h-3.5 w-3.5 mr-1" /> Consultant</Button>
            <DarkModeToggle />
          </div>
        </div>
        {/* weather strip — real signal for roof work */}
        <div className="px-4 pb-2 flex items-center gap-4 text-xs overflow-x-auto scrollbar-hide">
          <span className="flex items-center gap-1 shrink-0"><Cloud className="h-3 w-3" /> 18°C Dublin</span>
          <span className="flex items-center gap-1 shrink-0 text-amber-700"><CloudRain className="h-3 w-3 text-amber-600" /> Yellow rain warning tomorrow</span>
          <span className="flex items-center gap-1 shrink-0"><Wind className="h-3 w-3" /> 12 km/h SW</span>
          <span className="flex items-center gap-1 shrink-0"><Sun className="h-3 w-3" /> Sunset 21:47</span>
        </div>
        {/* tabs */}
        <div className="px-2 pb-1.5 flex gap-0.5 overflow-x-auto scrollbar-hide">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setThreadLead(null); }}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-xs font-medium shrink-0 transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                <Icon className="h-3.5 w-3.5" /> {t.label}
                {!!t.count && <span className={`text-[11px] px-1.5 rounded-full tabular-nums ${active ? 'bg-white/20' : t.id === 'today' && isToday && t.count > 0 ? 'bg-pop/10 text-pop font-semibold' : 'bg-muted-foreground/15'}`}>{t.count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-4 pb-24 sm:px-4">
        {/* No AnimatePresence here: its exit got stuck and froze tab content.
            An operator tool switches instantly; the fade earned nothing. */}
        <div key={tab} className="animate-in fade-in duration-150">

            {/* ═══ TODAY ═══ */}
            {tab === 'today' && (
              <div className="space-y-4">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="text-lg font-semibold tracking-tight">{isToday ? 'Your day' : `Next out: ${dayLabel}`}</h2>
                  <p className="text-sm text-muted-foreground">
                    {dayJobs.length === 0 ? 'Nothing scheduled — check Jobs for open work.' :
                      <><strong className="text-foreground">{dayJobs.length}</strong> {dayJobs.length === 1 ? 'stop' : 'stops'}{isToday ? ' today' : ''} · first at <strong className="text-foreground">{new Date(dayJobs[0].d).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}</strong></>}
                  </p>
                  {dayJobs.length > 1 && (
                    <a className="ml-auto text-xs font-medium text-tech hover:underline underline-offset-4 cursor-pointer" onClick={() => setTab('map')}>
                      View route <ArrowRight className="inline size-3" />
                    </a>
                  )}
                </div>

                {dayJobs.map(({ l, d }, i) => {
                  const started = startedJobs.has(l.id);
                  const isSurvey = l.workflow_stage.includes('survey');
                  return (
                    <div key={l.id} className={`rounded-[16px] bg-card shadow-card border-l-4 ${isToday ? 'border-l-pop' : 'border-l-tech'} p-4`}>
                      <div className="flex items-start gap-3">
                        <div className="text-center shrink-0 w-12">
                          <p className="text-sm font-semibold tabular-nums">{new Date(d).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="label-micro mt-0.5">stop {i + 1}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{l.name}</span>
                            <Badge variant="outline" className={`text-[11px] ${isSurvey ? 'bg-tech/10 text-tech border-tech/30' : 'bg-primary/10 text-primary border-primary/30'}`}>
                              {isSurvey ? <><Camera className="h-3 w-3 mr-0.5" /> Survey</> : <><Wrench className="h-3 w-3 mr-0.5" /> Install</>}
                            </Badge>
                            {l.proposal && <span className="text-xs text-muted-foreground">{l.proposal.system_size_kw} kWp · {l.proposal.panel_count} panels{l.proposal.battery_model ? ' + battery' : ''}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /> {l.address}</p>
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            {started ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-doc-deposit"><CheckCircle2 className="size-4" /> Started — customer notified</span>
                            ) : (
                              <Button size="sm" className="h-9 bg-pop text-pop-foreground hover:bg-pop/90" onClick={() => startJob(l)}>
                                <Play className="h-3.5 w-3.5 mr-1" /> Start job
                              </Button>
                            )}
                            <a href={navUrl(l.address)} target="_blank" rel="noreferrer"
                              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors">
                              <Navigation className="h-3.5 w-3.5 text-tech" /> Navigate
                            </a>
                            <Button variant="outline" size="sm" className="h-9" onClick={() => { setTab('inbox'); setThreadLead(l); }}>
                              <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message
                            </Button>
                            <Button variant="outline" size="sm" className="h-9" onClick={() => navigate(`/job/${l.id}`)}>
                              <ClipboardList className="h-3.5 w-3.5 mr-1" /> Open job
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {dayJobs.length === 0 && (
                  <div className="rounded-[16px] bg-card shadow-card p-8 text-center text-sm text-muted-foreground">
                    No stops scheduled. The scheduler fills this as installs are booked.
                  </div>
                )}
              </div>
            )}

            {/* ═══ WEEK — drag a job to another day; the customer hears why ═══ */}
            {tab === 'week' && (() => {
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
                          className={`rounded-[12px] bg-card shadow-card min-h-[9rem] flex flex-col ${isDayToday ? 'ring-1 ring-pop/40' : ''}`}>
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
                                  className={`rounded-[10px] border-l-4 ${isSurvey ? 'border-l-tech' : 'border-l-primary'} bg-background shadow-card p-2 cursor-grab active:cursor-grabbing ${dragId === l.id ? 'opacity-40' : ''}`}>
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

            {/* ═══ JOBS ═══ */}
            {tab === 'jobs' && (
              <div className="space-y-3">
                <div className="flex gap-1">
                  <button onClick={() => setJobSubTab('active')}
                    className={`px-3 h-9 rounded-[10px] text-xs font-medium ${jobSubTab === 'active' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    Active ({displayActive.length})
                  </button>
                  <button onClick={() => setJobSubTab('completed')}
                    className={`px-3 h-9 rounded-[10px] text-xs font-medium ${jobSubTab === 'completed' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    Completed ({completedJobs.length})
                  </button>
                </div>
                {jobSubTab === 'active' && (
                  <div className="space-y-3">
                    {[['Surveys', surveyJobs, Camera, 'survey'], ['Installs', activeJobs, Wrench, 'install'], ['Handovers', handoverJobs, CheckCircle2, 'handover']].map(([label, pool, Icon, variant]: any) => pool.length > 0 && (
                      <div key={label}>
                        <h3 className="label-micro mb-1.5 flex items-center gap-1"><Icon className="h-3 w-3" /> {label} ({pool.length})</h3>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{pool.map((lead: DummyLead) => <JobCard key={lead.id} lead={lead} variant={variant} onClick={() => navigate(`/job/${lead.id}`)} />)}</div>
                      </div>
                    ))}
                    {displayActive.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active jobs.</p>}
                  </div>
                )}
                {jobSubTab === 'completed' && (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {completedJobs.map(lead => <JobCard key={lead.id} lead={lead} variant="completed" onClick={() => navigate(`/job/${lead.id}`)} />)}
                    {completedJobs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No completed jobs yet.</p>}
                  </div>
                )}
              </div>
            )}

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
                        className={`w-full rounded-[12px] p-3 text-left transition-colors ${threadLead?.id === l.id ? 'bg-primary/5 shadow-card' : 'bg-card shadow-card hover:bg-muted/50'}`}>
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
                  <div className="rounded-[16px] bg-card shadow-card flex flex-col min-h-[24rem] max-h-[calc(100dvh-16rem)]">
                    <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border shrink-0">
                      <button className="lg:hidden text-muted-foreground" onClick={() => setThreadLead(null)} aria-label="Back">←</button>
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[11px]">{threadLead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                      <div className="leading-tight min-w-0">
                        <p className="text-sm font-semibold truncate">{threadLead.name}</p>
                        <p className="text-2xs text-muted-foreground truncate">{threadLead.address}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <a href={`tel:${threadLead.phone ?? ''}`} className="inline-grid place-items-center size-8 rounded-[10px] hover:bg-muted" aria-label="Call"><Phone className="size-4" /></a>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(`/job/${threadLead.id}`)}>Open job</Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto scroll-slim p-4 space-y-2.5">
                      {threadFor(threadLead).map((m, i) => (
                        <div key={i} className={`max-w-[85%] rounded-[12px] px-3 py-2 text-sm leading-body ${m.from === 'customer' ? 'bg-muted mr-auto' : m.from === 'installer' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-tech/10 text-foreground ml-auto'}`}>
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
                        className="flex-1 h-10 rounded-[10px] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                      />
                      <Button size="sm" className="h-10" onClick={() => sendReply(threadLead)} disabled={!reply.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="hidden lg:grid rounded-[16px] bg-card shadow-card min-h-[24rem] place-items-center text-sm text-muted-foreground">
                    Pick a customer to open the thread
                  </div>
                )}
              </div>
            )}

            {/* ═══ MATERIALS ═══ */}
            {tab === 'materials' && (
              <div className="space-y-3">
                <div className="flex gap-1">
                  <button onClick={() => setMatSubTab('per_customer')} className={`px-3 h-9 rounded-[10px] text-xs font-medium ${matSubTab === 'per_customer' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Per Customer</button>
                  <button onClick={() => setMatSubTab('stock')} className={`px-3 h-9 rounded-[10px] text-xs font-medium ${matSubTab === 'stock' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Depot Stock</button>
                </div>
                {matSubTab === 'per_customer' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Auto-generated BOM for each job. Expand + check off as you load the van.</p>
                    {[...activeJobs, ...handoverJobs].map(lead => {
                      const proposal = lead.proposal;
                      const isExpanded = expandedJob === lead.id;
                      const hasBattery = !!proposal?.battery_model;
                      const bomItems = proposal ? [
                        { category: 'Panels', item: `${proposal.panel_count} × ${proposal.panel_model}`, qty: proposal.panel_count, critical: true },
                        { category: 'Inverter', item: proposal.inverter_model, qty: 1, critical: true },
                        ...(hasBattery ? [{ category: 'Battery', item: proposal.battery_model!, qty: 1, critical: true }] : []),
                        { category: 'Mounting', item: 'Rails + hooks + clamps', qty: Math.ceil(proposal.panel_count * 0.3), critical: true },
                        { category: 'Electrical', item: 'DC cable (6mm²)', qty: Math.ceil(8 + proposal.panel_count * 1.2), critical: true },
                        { category: 'Electrical', item: 'AC cable + isolators + SPD', qty: 4, critical: true },
                        { category: 'Safety', item: 'Harness + edge protection', qty: 2, critical: true },
                      ] : [];
                      return (
                        <div key={lead.id} className="rounded-[16px] bg-card shadow-card overflow-hidden">
                          <button onClick={() => setExpandedJob(isExpanded ? null : lead.id)} className="w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-muted/30">
                            <div className="p-2 bg-primary/10 rounded-lg"><Package className="h-4 w-4 text-primary" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{lead.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{lead.address.split(',').slice(-1)[0]?.trim()} · {proposal?.system_size_kw}kWp</div>
                            </div>
                            <Badge variant="outline" className="text-[11px]">{bomItems.length} items</Badge>
                          </button>
                          {isExpanded && (
                            <div className="border-t border-border p-3 space-y-1">
                              {bomItems.map((item, i) => (
                                <label key={i} className="flex items-center gap-2 p-2 border border-border rounded-[10px] text-xs cursor-pointer">
                                  <input type="checkbox" className="h-4 w-4 rounded" />
                                  <Badge variant="outline" className="text-[11px] shrink-0">{item.category}</Badge>
                                  <span className="flex-1 truncate">{item.qty} × {item.item}</span>
                                  {item.critical && <Badge variant="outline" className="text-[11px] bg-pop/10 text-pop border-pop/30">Critical</Badge>}
                                </label>
                              ))}
                              <Button size="sm" className="w-full mt-2" onClick={() => navigate(`/job/${lead.id}`)}>Open job <ChevronRight className="h-3 w-3 ml-1" /></Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {matSubTab === 'stock' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Dublin depot inventory. Auto-reorder triggers when available &lt; 5.</p>
                    {[
                      { item: 'Longi Hi-MO 6 435W', stock: 48, alloc: 32 },
                      { item: 'SolarEdge SE5K inverter', stock: 6, alloc: 4 },
                      { item: 'Tesla Powerwall 3 (13.5kWh)', stock: 4, alloc: 3 },
                      { item: 'Mounting rails (1.6m)', stock: 120, alloc: 84 },
                      { item: 'DC cable (6mm²)', stock: 800, alloc: 400 },
                      { item: 'Surge protector (Type 2)', stock: 8, alloc: 7 },
                    ].map(row => {
                      const available = row.stock - row.alloc;
                      const low = available < 5;
                      return (
                        <div key={row.item} className="rounded-[16px] bg-card shadow-card p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{row.item}</div>
                              <div className="text-xs text-muted-foreground">{row.stock} in stock · {row.alloc} allocated this week</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold tabular-nums ${low ? 'text-pop' : 'text-foreground'}`}>{available}</div>
                              <div className="text-[11px] text-muted-foreground">available</div>
                            </div>
                          </div>
                          {low && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-pop">
                              <AlertTriangle className="h-3 w-3" /> Auto-reorder triggered · PO sent to Setanta Solar
                            </div>
                          )}
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${low ? 'bg-pop' : available < 15 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, (available / Math.max(1, row.stock)) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══ MAP — the day's ROUTE, not a decoration ═══ */}
            {tab === 'map' && (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold">{isToday ? "Today's route" : `Route — ${dayLabel}`}</h3>
                  <span className="text-xs text-muted-foreground">{dayJobs.length} {dayJobs.length === 1 ? 'stop' : 'stops'} in time order</span>
                  {dayJobs.length > 0 && (
                    <a
                      href={`https://www.google.com/maps/dir/${dayJobs.map(({ l }) => encodeURIComponent(l.address)).join('/')}`}
                      target="_blank" rel="noreferrer"
                      className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                      <Navigation className="h-3.5 w-3.5" /> Open full route
                    </a>
                  )}
                </div>
                <div className="rounded-[16px] bg-card shadow-card overflow-hidden">
                  <div className="aspect-[4/3] sm:aspect-[16/9] bg-muted">
                    <iframe
                      title="Route map"
                      src={dayJobs.length >= 2
                        ? `https://maps.google.com/maps?saddr=${encodeURIComponent(dayJobs[0].l.address)}&daddr=${dayJobs.slice(1).map(({ l }) => encodeURIComponent(l.address)).join('+to:')}&output=embed`
                        : dayJobs.length === 1
                          ? `https://maps.google.com/maps?q=${encodeURIComponent(dayJobs[0].l.address)}&z=13&output=embed`
                          : 'https://maps.google.com/maps?q=Dublin,Ireland&t=m&z=11&output=embed'}
                      className="w-full h-full border-0" loading="lazy" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {dayJobs.map(({ l, d }, i) => (
                    <div key={l.id} className="rounded-[12px] bg-card shadow-card p-3 flex items-center gap-3">
                      <span className={`size-6 rounded-full grid place-items-center text-xs font-bold text-white shrink-0 ${i === 0 ? 'bg-pop' : 'bg-tech'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{l.name} <span className="text-muted-foreground font-normal">· {new Date(d).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}</span></div>
                        <div className="text-xs text-muted-foreground truncate">{l.address}</div>
                      </div>
                      <a href={navUrl(l.address)} target="_blank" rel="noreferrer" className="inline-grid place-items-center size-9 rounded-[10px] border border-border hover:bg-muted transition-colors" aria-label={`Navigate to ${l.name}`}>
                        <Navigation className="h-4 w-4 text-tech" />
                      </a>
                      <button className="inline-grid place-items-center size-9 rounded-[10px] border border-border hover:bg-muted transition-colors" onClick={() => navigate(`/job/${l.id}`)} aria-label={`Open ${l.name}`}>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {dayJobs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No stops to route.</p>}
                </div>
              </div>
            )}

          </div>
      </main>

      {/* move-reason modal: tell the customer WHY before the move lands */}
      {pendingMove && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Reschedule reason">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setPendingMove(null); setMoveReason(null); }} />
          <div className="absolute inset-x-3 bottom-3 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[26rem] rounded-[16px] bg-background shadow-card p-5">
            <h3 className="text-md font-semibold">Moving {pendingMove.lead.name.split(' ')[0]}'s job</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(pendingMove.from).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' })} → {new Date(pendingMove.to).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' })}. Pick the reason they'll be given:
            </p>
            <div className="mt-3 space-y-1.5">
              {MOVE_REASONS.map(r => (
                <button key={r} type="button" onClick={() => setMoveReason(r)}
                  className={`w-full text-left rounded-[10px] border px-3 py-2 text-sm transition-colors ${moveReason === r ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
                  {r}
                </button>
              ))}
            </div>
            <input
              value={moveNote}
              onChange={e => setMoveNote(e.target.value)}
              placeholder="Optional personal note…"
              className="mt-3 w-full h-10 rounded-[10px] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
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

      <RoleBasedAICoach />
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
    <div className={`rounded-[16px] bg-card shadow-card cursor-pointer hover:shadow-md transition-shadow border-l-4 ${edge}`} onClick={onClick}>
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
