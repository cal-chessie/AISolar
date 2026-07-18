/**
 * UnifiedCalendar — shared calendar across all views.
 *
 * Shows: consultations, site visits, installs, deadlines, agent runs.
 * Links to schedules and work based on:
 *   - Client scheduled calls (consultant)
 *   - Site visits (consultant + installer)
 *   - Jobs and equipment (installer)
 *
 * Used in: Owner Birdseye, Consultant Inbox, Installer Portal.
 * Each view filters to show what's relevant to that role.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
  Phone, Video, MapPin, Wrench, FileText, Bot, Users, Plus,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';

interface CalendarEvent {
  id: string;
  date: Date;
  time: string;
  duration: string;
  type: 'consultation' | 'site_survey' | 'install' | 'follow_up' | 'deadline' | 'agent_run';
  title: string;
  customer: string;
  assignee: string;
  route?: string;
}

const EVENT_META = {
  consultation: { label: 'Consultation', icon: Video, color: 'blue' },
  site_survey: { label: 'Site survey', icon: MapPin, color: 'indigo' },
  install: { label: 'Install', icon: Wrench, color: 'amber' },
  follow_up: { label: 'Follow-up call', icon: Phone, color: 'emerald' },
  deadline: { label: 'Deadline', icon: Clock, color: 'red' },
  agent_run: { label: 'Agent', icon: Bot, color: 'violet' },
} as const;

function generateEvents(leads: DummyLead[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const today = new Date();

  leads.forEach((lead, i) => {
    // Consultations
    if (['new', 'intake_complete'].includes(lead.workflow_stage)) {
      const d = new Date(today);
      d.setDate(today.getDate() + (i % 3) + 1);
      events.push({
        id: `cons_${lead.id}`, date: d, time: '10:00', duration: '30 min',
        type: 'consultation', title: `${lead.name} — consultation`,
        customer: lead.name, assignee: lead.assigned_consultant, route: '/lead-flow',
      });
    }
    // Site surveys
    if (['survey_scheduled', 'survey_complete'].includes(lead.workflow_stage) && lead.survey?.scheduled_date) {
      events.push({
        id: `survey_${lead.id}`, date: new Date(lead.survey.scheduled_date), time: '10:00', duration: '60 min',
        type: 'site_survey', title: `${lead.name} — site survey`,
        customer: lead.name, assignee: lead.survey?.surveyor || 'Unassigned', route: '/job',
      });
    }
    // Installs
    if (lead.assignment?.scheduled_date && ['install_scheduled', 'installing'].includes(lead.workflow_stage)) {
      events.push({
        id: `install_${lead.id}`, date: new Date(lead.assignment.scheduled_date), time: '08:00', duration: '1-2 days',
        type: 'install', title: `${lead.name} — ${lead.proposal?.system_size_kw}kWp install`,
        customer: lead.name, assignee: lead.assignment.installer_name, route: '/job',
      });
    }
    // Follow-ups (for proposal_sent)
    if (lead.workflow_stage === 'proposal_sent') {
      const d = new Date(today);
      d.setDate(today.getDate() + 1);
      events.push({
        id: `follow_${lead.id}`, date: d, time: '14:00', duration: '15 min',
        type: 'follow_up', title: `${lead.name} — follow-up call`,
        customer: lead.name, assignee: lead.assigned_consultant, route: '/consultant',
      });
    }
    // Deadlines (proposal validity)
    if (lead.proposal?.sent_date) {
      const sentDate = new Date(lead.proposal.sent_date);
      const deadline = new Date(sentDate);
      deadline.setDate(deadline.getDate() + 30);
      if (deadline > today) {
        events.push({
          id: `deadline_${lead.id}`, date: deadline, time: '23:59', duration: '—',
          type: 'deadline', title: `${lead.name} — proposal expires`,
          customer: lead.name, assignee: lead.assigned_consultant, route: '/lead-flow',
        });
      }
    }
  });

  // Agent runs (daily at fixed times)
  const agentEvents = [
    { time: '09:00', title: 'Follow-Up Agent — daily run', assignee: 'System' },
    { time: '09:30', title: 'Payment Reminder Agent — daily run', assignee: 'System' },
    { time: '10:00', title: 'Customer Digest Agent — weekly (Mon)', assignee: 'System', day: 1 },
  ];
  for (let day = 0; day < 7; day++) {
    const d = new Date(today);
    d.setDate(today.getDate() + day);
    agentEvents.forEach(ae => {
      if (ae.day !== undefined && d.getDay() !== ae.day) return;
      events.push({
        id: `agent_${day}_${ae.time}`, date: d, time: ae.time, duration: '~2 min',
        type: 'agent_run', title: ae.title, customer: '—', assignee: ae.assignee, route: '/agents',
      });
    });
  }

  return events;
}

export default function UnifiedCalendar({ filterRole }: { filterRole?: 'consultant' | 'installer' | 'owner' }) {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [currentWeek, setCurrentWeek] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // start of week (Sunday)
    return d;
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const allEvents = useMemo(() => generateEvents(leads), [leads]);

  // Filter events by role
  const events = useMemo(() => {
    if (!filterRole) return allEvents;
    if (filterRole === 'installer') {
      return allEvents.filter(e => ['site_survey', 'install'].includes(e.type));
    }
    if (filterRole === 'consultant') {
      return allEvents.filter(e => ['consultation', 'follow_up', 'deadline'].includes(e.type));
    }
    return allEvents;
  }, [allEvents, filterRole]);

  // Group by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(e => {
      const key = e.date.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentWeek);
      d.setDate(currentWeek.getDate() + i);
      return d;
    });
  }, [currentWeek]);

  const selectedDayEvents = selectedDay ? eventsByDay.get(selectedDay.toDateString()) || [] : [];

  const prevWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - 7);
    setCurrentWeek(d);
  };
  const nextWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 7);
    setCurrentWeek(d);
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold text-sm">
              {currentWeek.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })} — {new Date(currentWeek.getTime() + 6 * 86400000).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="sm" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            {filterRole && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {filterRole} view
              </Badge>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add event
            </Button>
          </div>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekDays.map((day, i) => {
            const dayEvents = eventsByDay.get(day.toDateString()) || [];
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = selectedDay?.toDateString() === day.toDateString();
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={`p-2 rounded-lg border text-center transition-colors min-h-[80px] ${
                  isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' :
                  isToday ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' :
                  'border-border hover:border-blue-300'
                }`}
              >
                <div className={`text-[10px] font-medium ${isToday ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {day.toLocaleDateString('en-IE', { weekday: 'short' })}
                </div>
                <div className={`text-sm font-bold ${isToday ? 'text-emerald-700' : ''}`}>{day.getDate()}</div>
                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                    {dayEvents.slice(0, 4).map(e => {
                      const meta = EVENT_META[e.type];
                      return <div key={e.id} className={`h-1.5 w-1.5 rounded-full bg-${meta.color}-500`} />;
                    })}
                    {dayEvents.length > 4 && <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 4}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        {selectedDay && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
              {selectedDay.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })} — {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No events scheduled.</p>
              ) : (
                selectedDayEvents
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map(event => {
                    const meta = EVENT_META[event.type];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={event.id}
                        className={`flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/30 cursor-pointer ${event.route ? 'hover:border-blue-300' : ''}`}
                        onClick={() => event.route && navigate(event.route)}
                      >
                        <div className={`p-1.5 rounded-lg bg-${meta.color}-100 dark:bg-${meta.color}-950/40 flex-shrink-0`}>
                          <Icon className={`h-3 w-3 text-${meta.color}-700 dark:text-${meta.color}-300`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{event.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {event.time} · {event.duration} · {event.assignee}
                          </div>
                        </div>
                        {event.route && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          {Object.entries(EVENT_META).map(([type, meta]) => (
            <span key={type} className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full bg-${meta.color}-500`} />
              {meta.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
