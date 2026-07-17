import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { getActionIcon, getActionColor, ActivityActionType } from '@/lib/activityLog';

interface ActivityLog {
  id: string;
  lead_id: string;
  user_id: string | null;
  action_type: string;
  description: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface ActivityTimelineProps {
  leadId: string;
  maxItems?: number;
}

export function ActivityTimeline({ leadId, maxItems = 20 }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('activity-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `lead_id=eq.${leadId}`
        },
        (payload) => {
          setActivities(prev => [payload.new as ActivityLog, ...prev].slice(0, maxItems));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, maxItems]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      setActivities((data || []).map(d => ({
        ...d,
        metadata: (d.metadata as Record<string, any>) || {}
      })));

      // Fetch user names for activities with user_id
      const userIds = [...new Set((data || []).map(a => a.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const names: Record<string, string> = {};
        profiles?.forEach(p => {
          if (p.user_id) names[p.user_id] = p.full_name || 'Unknown User';
        });
        setUserNames(names);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No activity recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative pl-6">
                {/* Timeline line */}
                {index < activities.length - 1 && (
                  <div className="absolute left-[11px] top-8 w-0.5 h-full bg-border" />
                )}
                
                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center text-xs">
                  {getActionIcon(activity.action_type as ActivityActionType)}
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getActionColor(activity.action_type as ActivityActionType)}`}
                        >
                          {activity.action_type.replace(/_/g, ' ')}
                        </Badge>
                        {activity.user_id && userNames[activity.user_id] && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {userNames[activity.user_id]}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {/* Show metadata if present */}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {Object.entries(activity.metadata).map(([key, value]) => (
                        <span key={key} className="mr-3">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
