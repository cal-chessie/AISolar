import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Phone, Mail, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { logActivity } from '@/lib/activityLog';

interface StaleLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  workflow_stage: string | null;
  updated_at: string;
  days_stale: number;
  threshold: number;
}

interface StageThreshold {
  workflow_stage: string;
  threshold_days: number;
}

interface FollowUpRemindersProps {
  onLeadClick?: (leadId: string) => void;
  expanded?: boolean;
}

// Default thresholds if settings table is empty
const DEFAULT_THRESHOLDS: Record<string, number> = {
  'new': 2,
  'survey': 3,
  'proposal': 5,
  'approved': 3,
  'scheduled': 7,
  'installed': 14
};

export function FollowUpReminders({ onLeadClick, expanded = false }: FollowUpRemindersProps) {
  const [staleLeads, setStaleLeads] = useState<StaleLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(!expanded);
  const [thresholds, setThresholds] = useState<Record<string, number>>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    fetchThresholdsAndLeads();
  }, []);

  const fetchThresholdsAndLeads = async () => {
    try {
      // Fetch stage thresholds
      const { data: thresholdData } = await supabase
        .from('follow_up_settings')
        .select('workflow_stage, threshold_days');

      const thresholdMap: Record<string, number> = { ...DEFAULT_THRESHOLDS };
      (thresholdData || []).forEach((t: StageThreshold) => {
        thresholdMap[t.workflow_stage] = t.threshold_days;
      });
      setThresholds(thresholdMap);

      // Fetch all leads that aren't completed
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, workflow_stage, updated_at')
        .not('workflow_stage', 'in', '("completed","installed","done")');

      if (error) throw error;

      // Filter leads that exceed their stage threshold
      const now = new Date();
      const stale = (leads || [])
        .map(lead => {
          const stage = lead.workflow_stage || 'new';
          const threshold = thresholdMap[stage] || 3;
          const daysSinceUpdate = differenceInDays(now, new Date(lead.updated_at));
          return {
            ...lead,
            days_stale: daysSinceUpdate,
            threshold
          };
        })
        .filter(lead => lead.days_stale >= lead.threshold)
        .sort((a, b) => (b.days_stale - b.threshold) - (a.days_stale - a.threshold));

      setStaleLeads(stale);
    } catch (error) {
      console.error('Error fetching stale leads:', error);
      toast.error('Failed to fetch follow-up reminders');
    } finally {
      setLoading(false);
    }
  };

  const markAsContacted = async (leadId: string, leadName: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      // Log the activity
      await logActivity({
        leadId,
        actionType: 'lead_contacted',
        description: `Marked ${leadName} as contacted via follow-up reminder`
      });

      toast.success('Lead marked as contacted');
      fetchThresholdsAndLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  };

  const getUrgencyColor = (daysPastThreshold: number) => {
    if (daysPastThreshold >= 4) return 'destructive';
    if (daysPastThreshold >= 2) return 'default';
    return 'secondary';
  };

  const getStageLabel = (stage: string | null) => {
    const labels: Record<string, string> = {
      'new': 'New Lead',
      'survey': 'Survey',
      'proposal': 'Proposal',
      'approved': 'Approved',
      'scheduled': 'Scheduled'
    };
    return labels[stage || 'new'] || stage || 'New Lead';
  };

  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-orange-500" />
            Follow-up Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (staleLeads.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-orange-500" />
            Follow-up Reminders
            <Badge variant="destructive" className="ml-2">
              {staleLeads.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Leads exceeding their stage-specific follow-up threshold
        </p>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-3">
          {staleLeads.slice(0, 5).map((lead) => {
            const daysPastThreshold = lead.days_stale - lead.threshold;
            return (
              <div
                key={lead.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onLeadClick?.(lead.id)}
                      className="font-medium text-foreground hover:text-primary truncate text-left"
                    >
                      {lead.name}
                    </button>
                    <Badge variant={getUrgencyColor(daysPastThreshold)}>
                      <Clock className="h-3 w-3 mr-1" />
                      {lead.days_stale}d / {lead.threshold}d
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="truncate">{getStageLabel(lead.workflow_stage)}</span>
                    <span>•</span>
                    <span className="truncate">
                      {daysPastThreshold > 0 ? `${daysPastThreshold}d overdue` : 'Due now'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {lead.phone && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(`tel:${lead.phone}`, '_blank')}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(`mailto:${lead.email}`, '_blank')}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => markAsContacted(lead.id, lead.name)}
                  >
                    Mark Contacted
                  </Button>
                </div>
              </div>
            );
          })}
          {staleLeads.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="link" className="text-orange-600">
                View all {staleLeads.length} leads needing follow-up
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
