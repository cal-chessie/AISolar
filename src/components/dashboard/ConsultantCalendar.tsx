import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Phone, 
  ClipboardList, 
  User, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  LayoutGrid,
  List,
  CalendarDays,
  Plus,
  FileText,
  Truck,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { EventDetailDialog } from './EventDetailDialog';
import { QuickAddEventDialog } from './QuickAddEventDialog';
import { PipelineProgress } from './PipelineProgress';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isToday,
  addDays,
  subDays,
  setMonth,
  setYear
} from 'date-fns';

interface ScheduledEvent {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  lead_phone?: string;
  lead_address?: string;
  type: 'call' | 'survey' | 'proposal' | 'installation';
  date: Date;
  time?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  proposal_id?: string;
  survey_id?: string;
}

interface LeadNeedingAction {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: string;
  created_at: string;
  monthly_bill?: number;
  days_since_contact: number;
  urgency: 'high' | 'medium' | 'low';
  source?: string;
}

type ViewMode = 'month' | 'week' | 'day';

interface ConsultantCalendarProps {
  onViewLead?: (leadId: string) => void;
  onViewSurvey?: (surveyId: string) => void;
  onViewProposal?: (proposalId: string) => void;
}

export default function ConsultantCalendar({ onViewLead, onViewSurvey, onViewProposal }: ConsultantCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [leadsNeedingCalls, setLeadsNeedingCalls] = useState<LeadNeedingAction[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadNeedingAction | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduledEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    type: 'call' as 'call' | 'survey',
    date: '',
    time: '',
    notes: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch leads that need follow-up calls
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .in('status', ['new', 'contacted'])
        .order('created_at', { ascending: true });

      if (leadsError) throw leadsError;

      // Calculate urgency based on days since creation
      const now = new Date();
      const leadsWithUrgency: LeadNeedingAction[] = (leads || []).map(lead => {
        const createdDate = new Date(lead.created_at);
        const daysSince = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        let urgency: 'high' | 'medium' | 'low' = 'low';
        
        const isAILead = lead.notes?.includes('[SOURCE: AI_ANALYSER]') || lead.notes?.includes('[AI Analysis');
        const isHighValue = (lead.monthly_bill || 0) >= 200;
        
        if (isAILead || isHighValue) {
          urgency = daysSince > 1 ? 'high' : 'medium';
        } else {
          if (daysSince > 3) urgency = 'high';
          else if (daysSince > 1) urgency = 'medium';
        }

        return {
          ...lead,
          days_since_contact: daysSince,
          urgency,
          source: isAILead ? 'AI Analyser' : 'Manual'
        };
      });

      leadsWithUrgency.sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        const aIsAI = a.source === 'AI Analyser' ? 0 : 1;
        const bIsAI = b.source === 'AI Analyser' ? 0 : 1;
        if (aIsAI !== bIsAI) return aIsAI - bIsAI;
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });

      setLeadsNeedingCalls(leadsWithUrgency);

      // Get date range for fetching events (3 months window)
      const rangeStart = subMonths(startOfMonth(currentDate), 1);
      const rangeEnd = addMonths(endOfMonth(currentDate), 1);
      
      // Fetch scheduled surveys
      const { data: surveysData, error: surveysError } = await supabase
        .from('site_surveys')
        .select('*, leads(name, email, phone, address)')
        .gte('survey_date', rangeStart.toISOString())
        .lte('survey_date', rangeEnd.toISOString())
        .order('survey_date', { ascending: true });

      if (surveysError) throw surveysError;

      // Fetch proposals with scheduled presentation dates
      const { data: proposalsData } = await supabase
        .from('proposals')
        .select('*, leads(name, email, phone, address)')
        .not('confirmed_install_date', 'is', null)
        .gte('confirmed_install_date', rangeStart.toISOString())
        .lte('confirmed_install_date', rangeEnd.toISOString());

      // Convert surveys to events
      const surveyEvents: ScheduledEvent[] = (surveysData || []).map(survey => ({
        id: survey.id,
        lead_id: survey.lead_id,
        lead_name: survey.leads?.name || 'Unknown',
        lead_email: survey.leads?.email || '',
        lead_phone: survey.leads?.phone,
        lead_address: survey.leads?.address,
        type: 'survey' as const,
        date: new Date(survey.survey_date),
        time: format(new Date(survey.survey_date), 'HH:mm'),
        status: survey.status === 'completed' ? 'completed' : survey.status === 'cancelled' ? 'cancelled' : 'scheduled',
        notes: survey.access_notes,
        survey_id: survey.id
      }));

      // Convert proposals with install dates to events
      const installEvents: ScheduledEvent[] = (proposalsData || []).map(proposal => ({
        id: proposal.id,
        lead_id: proposal.lead_id,
        lead_name: proposal.leads?.name || 'Unknown',
        lead_email: proposal.leads?.email || '',
        lead_phone: proposal.leads?.phone,
        lead_address: proposal.leads?.address,
        type: 'installation' as const,
        date: new Date(proposal.confirmed_install_date!),
        time: '09:00',
        status: proposal.installation_status === 'completed' ? 'completed' : proposal.installation_status === 'cancelled' ? 'cancelled' : 'scheduled',
        notes: proposal.installation_notes,
        proposal_id: proposal.id
      }));

      setScheduledEvents([...surveyEvents, ...installEvents]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: 'Error loading calendar',
        description: 'Could not load calendar data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSchedule = async () => {
    if (!selectedLead || !scheduleForm.date) {
      toast({
        title: 'Missing information',
        description: 'Please select a date',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (scheduleForm.type === 'survey') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', user.id)
          .single();

        const surveyDate = new Date(`${scheduleForm.date}T${scheduleForm.time || '09:00'}`);
        const { error } = await supabase
          .from('site_surveys')
          .insert({
            lead_id: selectedLead.id,
            surveyor_id: user.id,
            survey_date: surveyDate.toISOString(),
            status: 'draft',
            access_notes: scheduleForm.notes
          });

        if (error) throw error;

        await supabase
          .from('leads')
          .update({ status: 'contacted', workflow_stage: 'survey' })
          .eq('id', selectedLead.id);

        try {
          await supabase.functions.invoke('send-survey-notification', {
            body: {
              customerName: selectedLead.name,
              customerEmail: selectedLead.email,
              surveyDate: surveyDate.toISOString(),
              surveyTime: scheduleForm.time || '09:00',
              consultantName: profile?.full_name || 'Your Solar Consultant',
              consultantPhone: profile?.phone,
              consultantEmail: user.email,
            }
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }

        toast({
          title: 'Survey scheduled',
          description: `Survey scheduled for ${selectedLead.name} on ${scheduleForm.date}`
        });
      } else {
        const existingNotes = (selectedLead as any).notes || '';
        await supabase
          .from('leads')
          .update({ 
            status: 'contacted',
            notes: `${existingNotes}\n\nCall scheduled: ${scheduleForm.date} ${scheduleForm.time || ''}\n${scheduleForm.notes || ''}`
          })
          .eq('id', selectedLead.id);

        toast({
          title: 'Call scheduled',
          description: `Call scheduled for ${selectedLead.name}`
        });
      }

      setShowScheduleDialog(false);
      setSelectedLead(null);
      setScheduleForm({ type: 'call', date: '', time: '', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error scheduling:', error);
      toast({
        title: 'Error scheduling',
        description: 'Could not schedule the event',
        variant: 'destructive'
      });
    }
  };

  // Navigation functions - synced properly
  const navigatePrevious = () => {
    const newDate = viewMode === 'month' 
      ? subMonths(currentDate, 1)
      : viewMode === 'week' 
        ? subWeeks(currentDate, 1)
        : subDays(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const navigateNext = () => {
    const newDate = viewMode === 'month' 
      ? addMonths(currentDate, 1)
      : viewMode === 'week' 
        ? addWeeks(currentDate, 1)
        : addDays(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      // If clicking a date in a different month, navigate to that month
      if (date.getMonth() !== currentDate.getMonth() || date.getFullYear() !== currentDate.getFullYear()) {
        setCurrentDate(date);
      }
    }
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return scheduledEvents.filter(event => isSameDay(event.date, day));
  };

  // Get week days based on currentDate
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 })
  });

  // Time slots for day/week view
  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 8;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getEventColor = (type: string, status: string) => {
    if (status === 'completed') return 'bg-muted text-muted-foreground';
    if (status === 'cancelled') return 'bg-destructive/20 text-destructive';
    switch (type) {
      case 'survey': return 'bg-primary text-primary-foreground';
      case 'proposal': return 'bg-purple-500 text-white';
      case 'installation': return 'bg-emerald-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'survey': return <ClipboardList size={10} />;
      case 'proposal': return <FileText size={10} />;
      case 'installation': return <Truck size={10} />;
      default: return <Phone size={10} />;
    }
  };

  const handleEventClick = (event: ScheduledEvent) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const handleEmptySlotClick = (date: Date) => {
    setQuickAddDate(date);
    setShowQuickAdd(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-20 bg-muted rounded-lg" />
        <div className="animate-pulse h-96 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Overview */}
      <PipelineProgress compact />

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={showEventDetail}
        onOpenChange={setShowEventDetail}
        onEventUpdated={fetchData}
        onViewLead={onViewLead}
        onViewSurvey={onViewSurvey}
        onViewProposal={onViewProposal}
      />

      {/* Quick Add Event Dialog */}
      <QuickAddEventDialog
        selectedDate={quickAddDate}
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onEventAdded={fetchData}
      />

      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrevious} className="h-8 w-8">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" onClick={goToToday} className="text-xs h-8 px-3">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext} className="h-8 w-8">
            <ChevronRight size={16} />
          </Button>
          <h2 className="text-base sm:text-lg font-semibold ml-2">
            {viewMode === 'day' && format(currentDate, 'EEE, MMM d, yyyy')}
            {viewMode === 'week' && `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`}
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} className="h-8">
            <ToggleGroupItem value="day" aria-label="Day view" className="gap-1 h-8 px-2 text-xs">
              <CalendarDays size={12} />
              <span className="hidden sm:inline">Day</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Week view" className="gap-1 h-8 px-2 text-xs">
              <List size={12} />
              <span className="hidden sm:inline">Week</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Month view" className="gap-1 h-8 px-2 text-xs">
              <LayoutGrid size={12} />
              <span className="hidden sm:inline">Month</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Button 
            variant="outline"
            size="icon"
            onClick={fetchData}
            className="h-8 w-8"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </Button>

          <Button 
            size="sm" 
            onClick={() => {
              setQuickAddDate(selectedDate);
              setShowQuickAdd(true);
            }}
            className="gap-1 h-8"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Event</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Calendar Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-2 sm:p-4">
              <AnimatePresence mode="wait">
                {/* Month View */}
                {viewMode === 'month' && (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      month={currentDate}
                      onMonthChange={setCurrentDate}
                      className="rounded-md border w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full"
                      modifiers={{
                        hasEvent: scheduledEvents.map(e => e.date)
                      }}
                      modifiersClassNames={{
                        hasEvent: 'bg-primary/20 font-bold relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full'
                      }}
                    />
                    
                    {/* Selected day events */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {format(selectedDate, 'EEEE, MMMM d')}
                        </h4>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEmptySlotClick(selectedDate)}
                          className="gap-1 h-7 text-xs"
                        >
                          <Plus size={12} />
                          Add
                        </Button>
                      </div>
                      {getEventsForDay(selectedDate).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No events scheduled</p>
                      ) : (
                        <div className="space-y-2">
                          {getEventsForDay(selectedDate).map(event => (
                            <div key={event.id} onClick={() => handleEventClick(event)} className="cursor-pointer">
                              <EventCard event={event} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Week View */}
                {viewMode === 'week' && (
                  <motion.div
                    key="week"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-x-auto"
                  >
                    <div className="min-w-[600px]">
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map((day) => (
                          <button
                            key={day.toISOString()}
                            className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${
                              isToday(day) ? 'bg-primary text-primary-foreground' : 
                              isSameDay(day, selectedDate) ? 'bg-primary/10' : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedDate(day)}
                          >
                            <div className="text-xs font-medium">{format(day, 'EEE')}</div>
                            <div className="text-lg font-bold">{format(day, 'd')}</div>
                            {getEventsForDay(day).length > 0 && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1 mt-1">
                                {getEventsForDay(day).length}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Time Grid */}
                      <div className="border rounded-lg overflow-hidden">
                        {timeSlots.map((time) => (
                          <div key={time} className="grid grid-cols-7 border-b last:border-b-0">
                            {weekDays.map((day, dayIdx) => {
                              const dayEvents = getEventsForDay(day).filter(
                                e => e.time?.startsWith(time.split(':')[0])
                              );
                              return (
                                <div 
                                  key={day.toISOString()} 
                                  className="min-h-[50px] border-l first:border-l-0 p-1 relative"
                                >
                                  {dayIdx === 0 && (
                                    <span className="absolute -left-0.5 -top-2.5 text-[9px] text-muted-foreground bg-background px-1">
                                      {time}
                                    </span>
                                  )}
                                  {dayEvents.length === 0 ? (
                                    <div 
                                      className="h-full min-h-[40px] hover:bg-primary/5 transition-colors cursor-pointer rounded"
                                      onClick={() => {
                                        const clickDate = new Date(day);
                                        const [hours] = time.split(':').map(Number);
                                        clickDate.setHours(hours, 0, 0, 0);
                                        handleEmptySlotClick(clickDate);
                                      }}
                                    />
                                  ) : (
                                    dayEvents.map(event => (
                                      <div
                                        key={event.id}
                                        className={`text-[9px] p-1 rounded mb-1 truncate cursor-pointer hover:opacity-80 flex items-center gap-1 ${getEventColor(event.type, event.status)}`}
                                        title={`${event.lead_name} - ${event.type}`}
                                        onClick={() => handleEventClick(event)}
                                      >
                                        {getEventIcon(event.type)}
                                        <span className="truncate">{event.lead_name}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Day View */}
                {viewMode === 'day' && (
                  <motion.div
                    key="day"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="space-y-2">
                      {timeSlots.map((time) => {
                        const hourEvents = getEventsForDay(currentDate).filter(
                          e => e.time?.startsWith(time.split(':')[0])
                        );
                        return (
                          <div key={time} className="flex gap-4 border-b pb-2">
                            <div className="w-14 text-sm text-muted-foreground font-medium">
                              {time}
                            </div>
                            <div className="flex-1 min-h-[60px]">
                              {hourEvents.length === 0 ? (
                                <div 
                                  className="h-full bg-muted/30 rounded-lg border-2 border-dashed border-muted hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
                                  onClick={() => {
                                    const clickDate = new Date(currentDate);
                                    const [hours] = time.split(':').map(Number);
                                    clickDate.setHours(hours, 0, 0, 0);
                                    handleEmptySlotClick(clickDate);
                                  }}
                                />
                              ) : (
                                <div className="space-y-2">
                                  {hourEvents.map(event => (
                                    <div key={event.id} onClick={() => handleEventClick(event)} className="cursor-pointer">
                                      <EventCard event={event} detailed />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Leads Needing Follow-up */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone size={14} />
                Needs Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {leadsNeedingCalls.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  All leads contacted! 🎉
                </p>
              ) : (
                leadsNeedingCalls.slice(0, 6).map(lead => {
                  const isHighValue = (lead.monthly_bill || 0) >= 200;
                  return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-2 rounded-lg border text-xs ${
                      lead.source === 'AI Analyser' 
                        ? 'bg-primary/5 border-primary/30' 
                        : getUrgencyColor(lead.urgency)
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <User size={10} />
                      <button 
                        className="font-medium truncate text-left hover:text-primary"
                        onClick={() => onViewLead?.(lead.id)}
                      >
                        {lead.name}
                      </button>
                    </div>
                    {lead.monthly_bill && (
                      <p className="text-[10px] text-muted-foreground">€{lead.monthly_bill}/mo</p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {lead.days_since_contact}d ago
                      </Badge>
                      {lead.source === 'AI Analyser' && (
                        <Badge className="text-[9px] h-4 px-1 bg-gradient-to-r from-primary to-primary/80">
                          ⚡ AI
                        </Badge>
                      )}
                    </div>
                    <Dialog open={showScheduleDialog && selectedLead?.id === lead.id} onOpenChange={(open) => {
                      setShowScheduleDialog(open);
                      if (open) setSelectedLead(lead);
                      else setSelectedLead(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="w-full mt-2 text-[10px] h-6">
                          Schedule
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-base">Schedule for {lead.name}</DialogTitle>
                        </DialogHeader>
                        <ScheduleForm 
                          scheduleForm={scheduleForm}
                          setScheduleForm={setScheduleForm}
                          onSubmit={handleSchedule}
                        />
                      </DialogContent>
                    </Dialog>
                  </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, detailed = false }: { event: ScheduledEvent; detailed?: boolean }) {
  const getEventColor = (type: string, status: string) => {
    if (status === 'completed') return 'bg-muted border-muted';
    if (status === 'cancelled') return 'bg-destructive/10 border-destructive/30';
    switch (type) {
      case 'survey': return 'bg-primary/10 border-primary';
      case 'proposal': return 'bg-purple-500/10 border-purple-500';
      case 'installation': return 'bg-emerald-500/10 border-emerald-500';
      default: return 'bg-blue-500/10 border-blue-500';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'survey': return <ClipboardList size={14} className="text-primary" />;
      case 'proposal': return <FileText size={14} className="text-purple-500" />;
      case 'installation': return <Truck size={14} className="text-emerald-500" />;
      default: return <Phone size={14} className="text-blue-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border-l-4 ${getEventColor(event.type, event.status)}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getEventIcon(event.type)}
          <span className="font-medium text-sm">{event.lead_name}</span>
        </div>
        <Badge variant={event.status === 'completed' ? 'secondary' : event.status === 'cancelled' ? 'destructive' : 'default'} className="text-[10px]">
          {event.status}
        </Badge>
      </div>
      {event.time && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Clock size={10} />
          {event.time}
        </p>
      )}
      {detailed && (
        <>
          {event.lead_address && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin size={10} />
              {event.lead_address}
            </p>
          )}
          {event.lead_email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail size={10} />
              {event.lead_email}
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}

// Schedule Form Component
function ScheduleForm({ 
  scheduleForm, 
  setScheduleForm, 
  onSubmit 
}: { 
  scheduleForm: any; 
  setScheduleForm: (f: any) => void; 
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>Type</Label>
        <Select 
          value={scheduleForm.type} 
          onValueChange={(v) => setScheduleForm({...scheduleForm, type: v})}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">Phone Call</SelectItem>
            <SelectItem value="survey">Site Survey</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input 
            type="date" 
            value={scheduleForm.date}
            onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Input 
            type="time" 
            value={scheduleForm.time}
            onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea 
          placeholder="Add any notes..."
          value={scheduleForm.notes}
          onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
        />
      </div>
      <Button onClick={onSubmit} className="w-full">
        Schedule
      </Button>
    </div>
  );
}
