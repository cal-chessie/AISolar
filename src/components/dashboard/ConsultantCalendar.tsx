import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Phone, 
  ClipboardList, 
  User, 
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Mail
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface ScheduledEvent {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  lead_phone?: string;
  type: 'call' | 'survey';
  date: Date;
  time?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface LeadNeedingAction {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  created_at: string;
  monthly_bill?: number;
  days_since_contact: number;
  urgency: 'high' | 'medium' | 'low';
  source?: string;
}

export default function ConsultantCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [leadsNeedingCalls, setLeadsNeedingCalls] = useState<LeadNeedingAction[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadNeedingAction | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    type: 'call' as 'call' | 'survey',
    date: '',
    time: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
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
        if (daysSince > 3) urgency = 'high';
        else if (daysSince > 1) urgency = 'medium';

        // Extract source from notes if it contains "AI Analysis"
        const source = lead.notes?.includes('AI Analysis') ? 'AI Analyser' : 'Manual';

        return {
          ...lead,
          days_since_contact: daysSince,
          urgency,
          source
        };
      });

      setLeadsNeedingCalls(leadsWithUrgency);

      // Fetch scheduled surveys for the month
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const { data: surveysData, error: surveysError } = await supabase
        .from('site_surveys')
        .select('*, leads(name, email, phone)')
        .gte('survey_date', monthStart.toISOString())
        .lte('survey_date', monthEnd.toISOString())
        .order('survey_date', { ascending: true });

      if (surveysError) throw surveysError;

      // Convert surveys to events
      const surveyEvents: ScheduledEvent[] = (surveysData || []).map(survey => ({
        id: survey.id,
        lead_id: survey.lead_id,
        lead_name: survey.leads?.name || 'Unknown',
        lead_email: survey.leads?.email || '',
        lead_phone: survey.leads?.phone,
        type: 'survey',
        date: new Date(survey.survey_date),
        status: survey.status === 'completed' ? 'completed' : 'scheduled',
        notes: survey.access_notes
      }));

      setSurveys(surveysData || []);
      setScheduledEvents(surveyEvents);
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
  };

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
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get consultant profile for email
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', user.id)
          .single();

        // Create survey
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

        // Update lead status
        await supabase
          .from('leads')
          .update({ status: 'contacted', workflow_stage: 'survey' })
          .eq('id', selectedLead.id);

        // Send email notification
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
          // Don't fail the whole operation if email fails
        }

        toast({
          title: 'Survey scheduled',
          description: `Survey scheduled for ${selectedLead.name} on ${scheduleForm.date}. Email notification sent.`
        });
      } else {
        // For calls, update lead status and add note
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

  const eventsOnSelectedDate = scheduledEvents.filter(event => 
    isSameDay(event.date, selectedDate)
  );

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Calendar</h2>
        <Badge variant="outline" className="gap-1">
          <CalendarIcon size={14} />
          {format(currentMonth, 'MMMM yyyy')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border w-full"
              modifiers={{
                hasEvent: scheduledEvents.map(e => e.date)
              }}
              modifiersClassNames={{
                hasEvent: 'bg-primary/20 font-bold'
              }}
            />

            {/* Events for selected date */}
            <div className="mt-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h4>
              {eventsOnSelectedDate.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events scheduled</p>
              ) : (
                <div className="space-y-2">
                  {eventsOnSelectedDate.map(event => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {event.type === 'survey' ? (
                            <ClipboardList size={16} className="text-primary" />
                          ) : (
                            <Phone size={16} className="text-blue-500" />
                          )}
                          <span className="font-medium">{event.lead_name}</span>
                        </div>
                        <Badge variant={event.status === 'completed' ? 'default' : 'outline'}>
                          {event.status}
                        </Badge>
                      </div>
                      {event.time && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {event.time}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leads Needing Calls */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone size={18} />
              Needs Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {leadsNeedingCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All leads have been contacted! 🎉
              </p>
            ) : (
              leadsNeedingCalls.map(lead => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg border ${getUrgencyColor(lead.urgency)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User size={14} />
                        <span className="font-medium text-sm truncate">{lead.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{lead.email}</p>
                      {lead.phone && (
                        <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {lead.days_since_contact}d ago
                        </Badge>
                        {lead.source === 'AI Analyser' && (
                          <Badge className="text-[10px] bg-primary/20 text-primary">
                            AI Lead
                          </Badge>
                        )}
                        {lead.monthly_bill && (
                          <Badge variant="outline" className="text-[10px]">
                            €{lead.monthly_bill}/mo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Dialog open={showScheduleDialog && selectedLead?.id === lead.id} onOpenChange={(open) => {
                      setShowScheduleDialog(open);
                      if (open) setSelectedLead(lead);
                      else setSelectedLead(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8">
                          <Phone size={12} className="mr-1" />
                          Call
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Schedule for {lead.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select 
                              value={scheduleForm.type} 
                              onValueChange={(v) => setScheduleForm({...scheduleForm, type: v as 'call' | 'survey'})}
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
                          <Button onClick={handleSchedule} className="w-full">
                            <Plus size={16} className="mr-2" />
                            Schedule {scheduleForm.type === 'call' ? 'Call' : 'Survey'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8" asChild>
                      <a href={`mailto:${lead.email}`}>
                        <Mail size={12} className="mr-1" />
                        Email
                      </a>
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Surveys Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList size={18} />
            Upcoming Surveys
          </CardTitle>
        </CardHeader>
        <CardContent>
          {surveys.filter(s => s.status !== 'completed').length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming surveys scheduled
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {surveys.filter(s => s.status !== 'completed').slice(0, 6).map(survey => (
                <motion.div
                  key={survey.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-muted/50 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon size={14} className="text-primary" />
                    <span className="text-sm font-medium">
                      {format(new Date(survey.survey_date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{survey.leads?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{survey.leads?.email}</p>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
