import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  Edit,
  Trash2,
  ClipboardList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ScheduledEvent {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  lead_phone?: string;
  lead_address?: string;
  type: 'call' | 'survey';
  date: Date;
  time?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface EventDetailDialogProps {
  event: ScheduledEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: () => void;
}

export function EventDetailDialog({ event, open, onOpenChange, onEventUpdated }: EventDetailDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  const handleMarkComplete = async () => {
    setLoading(true);
    try {
      if (event.type === 'survey') {
        await supabase
          .from('site_surveys')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', event.id);
      }
      toast({ title: 'Event marked as complete' });
      onEventUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error updating event', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      if (event.type === 'survey') {
        await supabase
          .from('site_surveys')
          .update({ status: 'cancelled' })
          .eq('id', event.id);
      }
      toast({ title: 'Event cancelled' });
      onEventUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error cancelling event', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (event.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Scheduled</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {event.type === 'survey' ? (
              <ClipboardList className="h-5 w-5 text-primary" />
            ) : (
              <Phone className="h-5 w-5 text-blue-500" />
            )}
            {event.type === 'survey' ? 'Survey' : 'Call'} Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            {getStatusBadge()}
          </div>

          {/* Customer Info */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h4 className="font-semibold text-lg">{event.lead_name}</h4>
            
            {event.lead_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${event.lead_email}`} className="text-primary hover:underline">
                  {event.lead_email}
                </a>
              </div>
            )}
            
            {event.lead_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${event.lead_phone}`} className="text-primary hover:underline">
                  {event.lead_phone}
                </a>
              </div>
            )}
            
            {event.lead_address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.lead_address}</span>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{format(event.date, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            {event.time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{event.time}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {event.notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{event.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {event.status === 'scheduled' && (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleMarkComplete}
                disabled={loading}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Complete
              </Button>
            </>
          )}
          {event.lead_phone && (
            <Button
              variant="default"
              onClick={() => window.open(`tel:${event.lead_phone}`, '_blank')}
              className="gap-2"
            >
              <Phone className="h-4 w-4" />
              Call Now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
