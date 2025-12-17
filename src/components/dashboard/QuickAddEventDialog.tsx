import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Phone, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface QuickAddEventDialogProps {
  selectedDate: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventAdded: () => void;
}

export function QuickAddEventDialog({ selectedDate, open, onOpenChange, onEventAdded }: QuickAddEventDialogProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    leadId: '',
    type: 'survey' as 'call' | 'survey',
    time: '09:00',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchLeads();
    }
  }, [open]);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name, email, phone')
      .in('workflow_stage', ['new', 'survey'])
      .order('created_at', { ascending: false })
      .limit(50);
    
    setLeads(data || []);
  };

  const handleSubmit = async () => {
    if (!form.leadId || !selectedDate) {
      toast({ title: 'Please select a lead', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const eventDate = new Date(selectedDate);
      const [hours, minutes] = form.time.split(':').map(Number);
      eventDate.setHours(hours, minutes, 0, 0);

      if (form.type === 'survey') {
        await supabase.from('site_surveys').insert({
          lead_id: form.leadId,
          surveyor_id: user.id,
          survey_date: eventDate.toISOString(),
          status: 'draft',
          access_notes: form.notes
        });

        await supabase
          .from('leads')
          .update({ workflow_stage: 'survey' })
          .eq('id', form.leadId);
      } else {
        const lead = leads.find(l => l.id === form.leadId);
        await supabase
          .from('leads')
          .update({ 
            workflow_stage: 'survey',
            notes: `Call scheduled: ${format(eventDate, 'PPP')} at ${form.time}\n${form.notes || ''}`
          })
          .eq('id', form.leadId);
      }

      toast({ title: `${form.type === 'survey' ? 'Survey' : 'Call'} scheduled successfully` });
      onEventAdded();
      onOpenChange(false);
      setForm({ leadId: '', type: 'survey', time: '09:00', notes: '' });
    } catch (error) {
      console.error('Error scheduling event:', error);
      toast({ title: 'Error scheduling event', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule for {format(selectedDate, 'MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Event Type */}
          <div className="space-y-2">
            <Label>Event Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.type === 'survey' ? 'default' : 'outline'}
                onClick={() => setForm({ ...form, type: 'survey' })}
                className="flex-1 gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                Survey
              </Button>
              <Button
                type="button"
                variant={form.type === 'call' ? 'default' : 'outline'}
                onClick={() => setForm({ ...form, type: 'call' })}
                className="flex-1 gap-2"
              >
                <Phone className="h-4 w-4" />
                Call
              </Button>
            </div>
          </div>

          {/* Lead Selection */}
          <div className="space-y-2">
            <Label>Select Lead</Label>
            <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a lead..." />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name} - {lead.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !form.leadId}>
            {loading ? 'Scheduling...' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
