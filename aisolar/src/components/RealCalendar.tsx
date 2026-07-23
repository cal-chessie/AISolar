/**
 * RealCalendar — actual month-view calendar with events.
 *
 * Not a week strip. A real calendar grid you'd recognise from Google Calendar.
 * Click any day → see events. Click any event → navigate to the relevant view.
 * Switch between Month / Week / Day views.
 * Colour-coded by event type.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
  Phone, Video, MapPin, Wrench, FileText, Bot, Plus, X,
  ChevronDown, ChevronUp, Layout, List,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';

type ViewMode = 'month' | 'week' | 'day';
type EventType = 'consultation' | 'site_survey' | 'install' | 'follow_up' | 'deadline' | 'agent_run' | 'payment';

interface CalEvent {
  id: string;
  date: Date;
  time: string;
  endTime?: string;
  type: EventType;
  title: string;
  customer: string;
  assignee: string;
  route?: string;
}

/* Family language on the calendar: people-time is charcoal, field work is
   tech blue, installs proposal-yellow, money green, deadlines pop-red. */
const EVENT_META: Record<EventType, { label: string; icon: typeof Video; color: string; bg: string; text: string }> = {
  consultation: { label: 'Consultation', icon: Video, color: 'charcoal', bg: 'bg-muted', text: 'text-foreground' },
  site_survey: { label: 'Site survey', icon: MapPin, color: 'tech', bg: 'bg-tech-subtle', text: 'text-tech' },
  install: { label: 'Install', icon: Wrench, color: 'pending', bg: 'bg-doc-proposal-subtle', text: 'text-doc-proposal' },
  follow_up: { label: 'Follow-up', icon: Phone, color: 'charcoal', bg: 'bg-muted', text: 'text-foreground' },
  deadline: { label: 'Deadline', icon: Clock, color: 'pop', bg: 'bg-pop/10', text: 'text-pop' },
  agent_run: { label: 'Agent', icon: Bot, color: 'tech', bg: 'bg-tech-subtle', text: 'text-tech' },
  payment: { label: 'Payment', icon: FileText, color: 'green', bg: 'bg-doc-deposit/10', text: 'text-doc-deposit' },
};

function generateEvents(leads: DummyLead[]): CalEvent[] {
  const events: CalEvent[] = [];
  const today = new Date();

  leads.forEach((lead, i) => {
    // Consultations
    if (['new', 'intake_complete'].includes(lead.workflow_stage)) {
      const d = new Date(today); d.setDate(today.getDate() + (i % 4) + 1); d.setHours(10, 0);
      events.push({ id: `cons_${lead.id}`, date: d, time: '10:00', endTime: '10:30', type: 'consultation', title: `${lead.name} — consultation`, customer: lead.name, assignee: lead.assigned_consultant, route: `/lead-flow/${lead.id}` });
    }
    // Site surveys
    if (lead.survey?.scheduled_date) {
      const d = new Date(lead.survey.scheduled_date);
      events.push({ id: `survey_${lead.id}`, date: d, time: '10:00', endTime: '11:00', type: 'site_survey', title: `${lead.name} — site survey`, customer: lead.name, assignee: lead.survey.surveyor || 'TBD', route: `/lead-flow/${lead.id}` });
    }
    // Installs
    if (lead.assignment?.scheduled_date) {
      const d = new Date(lead.assignment.scheduled_date);
      events.push({ id: `install_${lead.id}`, date: d, time: '08:00', endTime: '17:00', type: 'install', title: `${lead.name} — ${lead.proposal?.system_size_kw}kWp`, customer: lead.name, assignee: lead.assignment.installer_name, route: '/job' });
    }
    // Follow-ups
    if (lead.workflow_stage === 'proposal_sent') {
      const d = new Date(today); d.setDate(today.getDate() + 1); d.setHours(14, 0);
      events.push({ id: `follow_${lead.id}`, date: d, time: '14:00', endTime: '14:15', type: 'follow_up', title: `${lead.name} — follow-up call`, customer: lead.name, assignee: lead.assigned_consultant, route: `/lead-flow/${lead.id}` });
    }
    // Deadlines
    if (lead.proposal?.sent_date) {
      const d = new Date(lead.proposal.sent_date); d.setDate(d.getDate() + 30);
      if (d > today) {
        events.push({ id: `deadline_${lead.id}`, date: d, time: '23:59', type: 'deadline', title: `${lead.name} — proposal expires`, customer: lead.name, assignee: lead.assigned_consultant, route: `/lead-flow/${lead.id}` });
      }
    }
    // Payment due
    if (lead.invoice && !lead.invoice.final_paid && lead.workflow_stage === 'installed') {
      const d = new Date(today); d.setDate(today.getDate() + 2);
      events.push({ id: `payment_${lead.id}`, date: d, time: '12:00', type: 'payment', title: `${lead.name} — final payment due`, customer: lead.name, assignee: 'System', route: '/analytics' });
    }
  });

  // Agent runs (daily)
  for (let day = -2; day < 14; day++) {
    const d = new Date(today); d.setDate(today.getDate() + day);
    [{ time: '09:00', title: 'Follow-Up Agent daily run' },
     { time: '09:30', title: 'Payment Reminder Agent daily run' }].forEach(ae => {
      events.push({ id: `agent_${day}_${ae.time}`, date: d, time: ae.time, endTime: '09:32', type: 'agent_run', title: ae.title, customer: '—', assignee: 'System', route: '/agents' });
    });
    // Weekly Monday digest
    if (d.getDay() === 1) {
      events.push({ id: `agent_digest_${day}`, date: d, time: '10:00', type: 'agent_run', title: 'Customer Digest weekly run', customer: '—', assignee: 'System', route: '/agents' });
    }
  }

  return events;
}

export default function RealCalendar() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [events] = useState<CalEvent[]>(() => generateEvents(leads));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    events.forEach(e => {
      const key = e.date.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    // Sort each day's events by time
    map.forEach(dayEvents => dayEvents.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [events]);

  // Month grid
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first (IE)
    const days: Date[] = [];
    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    // Next month padding to fill 6 rows
    while (days.length < 42) {
      const last = days[days.length - 1];
      days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    return days;
  }, [currentDate]);

  // Week days (Monday-first)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(d);
      day.setDate(d.getDate() + i);
      return day;
    });
  }, [currentDate]);

  const today = new Date();
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  const navigateDate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const selectedDayEvents = selectedDate ? (eventsByDay.get(selectedDate.toDateString()) || []) : [];
  const dayViewEvents = eventsByDay.get(currentDate.toDateString()) || [];

  return (
    <div className="p-3 space-y-3">
      {/* Calendar header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="font-bold text-lg">
            {currentDate.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })}
            {viewMode === 'week' && ` — Week of ${weekDays[0].toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}`}
            {viewMode === 'day' && ` — ${currentDate.toLocaleDateString('en-IE', { day: 'numeric', month: 'long' })}`}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigateDate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>Today</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-xs rounded capitalize ${viewMode === mode ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
                {mode}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open('https://cal.com/renewableireland/solar-consultation', '_blank')}><Plus className="h-3 w-3 mr-1" /> Add</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-3">
        {/* Calendar grid */}
        <div className="rounded-[16px] bg-card shadow-card p-3">
            {viewMode === 'month' && (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-[11px] font-medium text-muted-foreground py-1">{day}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-0.5">
                  {monthDays.map((day, i) => {
                    const dayEvents = eventsByDay.get(day.toDateString()) || [];
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    return (
                      <button
                        key={i}
                        onClick={() => { setSelectedDate(day); setCurrentDate(day); setViewMode('day'); }}
                        className={`min-h-[60px] sm:min-h-[80px] p-1 rounded-[10px] text-left transition-colors ${
                          isToday(day) ? 'ring-1 ring-primary/40 bg-muted/40' :
                          isCurrentMonth ? 'hover:bg-muted/50' : 'opacity-40 hover:bg-muted/30'
                        }`}
                      >
                        <div className={`text-xs mb-0.5 ${isToday(day) ? 'font-bold text-primary' : isCurrentMonth ? 'font-medium' : 'text-muted-foreground'}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map(e => {
                            const meta = EVENT_META[e.type];
                            return (
                              <div key={e.id} className={`text-[11px] px-1 py-0.5 rounded truncate ${meta.bg} ${meta.text}`} title={e.title}>
                                <meta.icon className="h-2 w-2 inline mr-0.5" />
                                {e.time} {e.title.split(' — ')[0]}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && <div className="text-[11px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {viewMode === 'week' && (
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, i) => {
                  const dayEvents = eventsByDay.get(day.toDateString()) || [];
                  return (
                    <div key={i} className={`min-h-[300px] p-1.5 rounded-[10px] bg-muted/20 ${isToday(day) ? 'ring-1 ring-primary/30' : ''}`}>
                      <button onClick={() => { setSelectedDate(day); setCurrentDate(day); setViewMode('day'); }}
                        className={`text-xs font-bold mb-1 hover:underline ${isToday(day) ? 'text-primary' : ''}`}>
                        {day.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric' })}
                      </button>
                      <div className="space-y-1">
                        {dayEvents.map(e => {
                          const meta = EVENT_META[e.type];
                          return (
                            <button key={e.id} onClick={() => setSelectedEvent(e)}
                              className={`w-full text-left text-[11px] px-1.5 py-1 rounded ${meta.bg} ${meta.text} hover:ring-1 hover:ring-primary`}>
                              <div className="font-medium">{e.time}</div>
                              <div className="truncate">{e.title}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'day' && (
              <div>
                <button onClick={() => setViewMode('month')}
                  className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" /> Back to month
                </button>
                {/* Hour timeline 07:00–19:00 — the full day, not a flat list */}
                <div className="relative">
                  {Array.from({ length: 13 }, (_, i) => i + 7).map(hour => {
                    const hh = String(hour).padStart(2, '0');
                    const hourEvents = dayViewEvents.filter(e => parseInt(e.time.slice(0, 2), 10) === hour);
                    const nowHere = isToday(currentDate) && new Date().getHours() === hour;
                    return (
                      <div key={hour} className="flex gap-3 min-h-[44px] border-t border-border/60 relative">
                        <div className="w-12 shrink-0 -mt-2 text-[11px] tabular-nums text-muted-foreground bg-card pr-1">{hh}:00</div>
                        <div className="flex-1 py-1 space-y-1">
                          {nowHere && (
                            <div className="flex items-center gap-1" aria-label="Current time">
                              <span className="size-1.5 rounded-full bg-pop" />
                              <span className="flex-1 h-px bg-pop/60" />
                            </div>
                          )}
                          {hourEvents.map(e => {
                            const meta = EVENT_META[e.type];
                            const Icon = meta.icon;
                            const allDay = e.endTime && (parseInt(e.endTime, 10) - parseInt(e.time, 10)) >= 6;
                            return (
                              <button key={e.id} onClick={() => setSelectedEvent(e)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-left ${meta.bg} hover:opacity-90 transition-opacity`}>
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.text}`} />
                                <span className={`text-xs font-medium truncate ${meta.text}`}>{e.title}</span>
                                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground shrink-0">
                                  {e.time}{e.endTime ? `–${e.endTime}` : ''}{allDay ? ' · all day' : ''}
                                </span>
                                <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">{e.assignee}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {dayViewEvents.length === 0 && (
                    <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Nothing scheduled this day.</p>
                  )}
                </div>
              </div>
            )}
          </div>

        {/* Selected day panel */}
        <div className="rounded-[16px] bg-card shadow-card p-4">
            {selectedDate ? (
              <>
                <h3 className="text-sm font-bold mb-2">
                  {selectedDate.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <div className="text-xs text-muted-foreground mb-3">{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}</div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {selectedDayEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No events scheduled.</p>
                  ) : (
                    selectedDayEvents.map(e => {
                      const meta = EVENT_META[e.type];
                      const Icon = meta.icon;
                      return (
                        <button key={e.id} onClick={() => setSelectedEvent(e)}
                          className={`w-full flex items-start gap-2 p-2 border rounded-lg hover:bg-muted/30 text-left`}>
                          <div className={`p-1.5 rounded ${meta.bg}`}>
                            <Icon className={`h-3 w-3 ${meta.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{e.title}</div>
                            <div className="text-[11px] text-muted-foreground">{e.time}{e.endTime ? ` — ${e.endTime}` : ''} · {e.assignee}</div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Click a day to see events.</p>
            )}

            {/* Legend */}
            <div className="mt-3 pt-3 border-t">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Event types</div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(EVENT_META).map(([type, meta]) => (
                  <div key={type} className="flex items-center gap-1 text-[11px]">
                    <div className={`h-2 w-2 rounded ${meta.bg}`} />
                    {meta.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
      </div>

      {/* Event detail modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-background w-full max-w-md rounded-2xl p-4"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const meta = EVENT_META[selectedEvent.type];
                const Icon = meta.icon;
                return (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${meta.bg}`}><Icon className={`h-5 w-5 ${meta.text}`} /></div>
                        <div>
                          <h3 className="font-bold">{selectedEvent.title}</h3>
                          <Badge variant="outline" className={`text-[11px] ${meta.bg} ${meta.text}`}>{meta.label}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> {selectedEvent.time}{selectedEvent.endTime ? ` — ${selectedEvent.endTime}` : ''}</div>
                      <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-muted-foreground" /> {selectedEvent.date.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> Customer: {selectedEvent.customer}</div>
                      <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground" /> Assigned to: {selectedEvent.assignee}</div>
                    </div>
                    {selectedEvent.route && (
                      <Button className="w-full mt-4" onClick={() => { navigate(selectedEvent.route!); setSelectedEvent(null); }}>
                        Open {meta.label} <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
