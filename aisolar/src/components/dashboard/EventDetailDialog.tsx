import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  ClipboardList,
  FileText,
  ExternalLink,
  User,
  Truck
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
  type: 'call' | 'survey' | 'proposal' | 'installation';
  date: Date;
  time?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  proposal_id?: string;
  survey_id?: string;
}

interface EventDetailDialogProps {
  event: ScheduledEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: () => void;
  onViewLead?: (leadId: string) => void;
  onViewSurvey?: (surveyId: string) => void;
  onViewProposal?: (proposalId: string) => void;
}

export function EventDetailDialog({ 
  event, 
  open, 
  onOpenChange, 
  onEventUpdated,
  onViewLead,
  onViewSurvey,
  onViewProposal
}: EventDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!event) return null;

  const handleMarkComplete = async () => {
    setLoading(true);
    try {
      if (event.type === 'survey') {
        await supabase
          .from('site_surveys')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', event.id);
        // workflow_stage is automatically updated by database trigger
      } else if (event.type === 'installation') {
        await supabase
          .from('proposals')
          .update({ installation_status: 'completed' })
          .eq('id', event.proposal_id);
        // workflow_stage is automatically updated by database trigger
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
      } else if (event.type === 'installation') {
        await supabase
          .from('proposals')
          .update({ installation_status: 'cancelled' })
          .eq('id', event.proposal_id);
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
        return <Badge className="bg-emerald-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Scheduled</Badge>;
    }
  };

  const getEventIcon = () => {
    switch (event.type) {
      case 'survey':
        return <ClipboardList className="h-5 w-5 text-primary" />;
      case 'proposal':
        return <FileText className="h-5 w-5 text-purple-500" />;
      case 'installation':
        return <Truck className="h-5 w-5 text-emerald-500" />;
      default:
        return <Phone className="h-5 w-5 text-blue-500" />;
    }
  };

  const getEventTypeLabel = () => {
    switch (event.type) {
      case 'survey': return 'Site Survey';
      case 'proposal': return 'Proposal Presentation';
      case 'installation': return 'Installation';
      default: return 'Call';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getEventIcon()}
            {getEventTypeLabel()} Details
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
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">{event.lead_name}</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-xs"
                onClick={() => onViewLead?.(event.lead_id)}
              >
                <User className="h-3 w-3" />
                View Lead
              </Button>
            </div>
            
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

          {/* Quick Links */}
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {event.type === 'survey' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => onViewSurvey?.(event.id)}
                >
                  <ClipboardList className="h-3 w-3" />
                  Open Survey Form
                </Button>
              )}
              {event.proposal_id && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => onViewProposal?.(event.proposal_id!)}
                >
                  <FileText className="h-3 w-3" />
                  View Proposal
                </Button>
              )}
              {event.type === 'survey' && !event.proposal_id && event.status === 'completed' && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => {
                    onOpenChange(false);
                    // This would trigger creating a proposal for this lead
                    toast({ title: 'Creating proposal...', description: 'Navigate to proposals tab' });
                  }}
                >
                  <FileText className="h-3 w-3" />
                  Create Proposal
                </Button>
              )}
            </div>
          </div>
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
                Cancel Event
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
