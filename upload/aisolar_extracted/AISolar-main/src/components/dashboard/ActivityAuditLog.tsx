import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Search, Activity, User, FileText, Calendar, CreditCard, Settings, Zap } from "lucide-react";

const actionTypeIcons: Record<string, React.ReactNode> = {
  stage_change: <Zap className="h-4 w-4" />,
  lead_created: <User className="h-4 w-4" />,
  lead_contacted: <User className="h-4 w-4" />,
  proposal_created: <FileText className="h-4 w-4" />,
  survey_completed: <Calendar className="h-4 w-4" />,
  payment_received: <CreditCard className="h-4 w-4" />,
  notification_sent: <Activity className="h-4 w-4" />,
  settings_updated: <Settings className="h-4 w-4" />,
};

const actionTypeColors: Record<string, string> = {
  stage_change: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  lead_created: "bg-green-500/10 text-green-500 border-green-500/20",
  lead_contacted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  proposal_created: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  survey_completed: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  payment_received: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  notification_sent: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  settings_updated: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export const ActivityAuditLog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: activities, isLoading } = useQuery({
    queryKey: ["activity-audit-log", actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select(`
          *,
          leads:lead_id (name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredActivities = activities?.filter((activity) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      activity.description?.toLowerCase().includes(searchLower) ||
      activity.action_type?.toLowerCase().includes(searchLower) ||
      (activity.leads as any)?.name?.toLowerCase().includes(searchLower) ||
      (activity.leads as any)?.email?.toLowerCase().includes(searchLower)
    );
  });

  const uniqueActionTypes = [...new Set(activities?.map((a) => a.action_type) || [])];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Audit Log
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivities?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activities found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActivities?.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${actionTypeColors[activity.action_type] || "bg-muted"}`}>
                    {actionTypeIcons[activity.action_type] || <Activity className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {activity.action_type.replace(/_/g, " ")}
                      </Badge>
                      {(activity.leads as any)?.name && (
                        <span className="text-xs text-muted-foreground">
                          • {(activity.leads as any).name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        • {format(new Date(activity.created_at), "MMM d, yyyy HH:mm")}
                      </span>
                    </div>
                    {activity.metadata && Object.keys(activity.metadata as object).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-1 p-2 rounded bg-muted/50 text-xs overflow-x-auto">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
