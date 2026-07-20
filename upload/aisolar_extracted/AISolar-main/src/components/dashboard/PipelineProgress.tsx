import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  ClipboardList, 
  FileText, 
  CheckCircle, 
  Calendar,
  Truck,
  CreditCard,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface StageCounts {
  new: number;
  survey: number;
  proposal: number;
  approved: number;
  scheduled: number;
  installed: number;
  completed: number;
}

interface PipelineProgressProps {
  onStageClick?: (stage: string) => void;
  compact?: boolean;
}

const STAGE_CONFIG = [
  { key: 'new', label: 'New Leads', icon: Users, color: 'bg-blue-500', textColor: 'text-blue-500' },
  { key: 'survey', label: 'Survey', icon: ClipboardList, color: 'bg-amber-500', textColor: 'text-amber-500' },
  { key: 'proposal', label: 'Proposal', icon: FileText, color: 'bg-purple-500', textColor: 'text-purple-500' },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  { key: 'scheduled', label: 'Scheduled', icon: Calendar, color: 'bg-cyan-500', textColor: 'text-cyan-500' },
  { key: 'installed', label: 'Installed', icon: Truck, color: 'bg-indigo-500', textColor: 'text-indigo-500' },
];

export function PipelineProgress({ onStageClick, compact = false }: PipelineProgressProps) {
  const [stageCounts, setStageCounts] = useState<StageCounts>({
    new: 0,
    survey: 0,
    proposal: 0,
    approved: 0,
    scheduled: 0,
    installed: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('workflow_stage');

      if (error) throw error;

      const counts: StageCounts = {
        new: 0,
        survey: 0,
        proposal: 0,
        approved: 0,
        scheduled: 0,
        installed: 0,
        completed: 0
      };

      (leads || []).forEach(lead => {
        const stage = lead.workflow_stage || 'new';
        if (stage in counts) {
          counts[stage as keyof StageCounts]++;
        }
      });

      setStageCounts(counts);
      setTotalLeads(leads?.length || 0);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeLeads = totalLeads - stageCounts.completed;
  const conversionRate = totalLeads > 0 
    ? Math.round(((stageCounts.installed + stageCounts.completed) / totalLeads) * 100) 
    : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pipeline Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="grid grid-cols-6 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STAGE_CONFIG.map((stage, index) => {
          const count = stageCounts[stage.key as keyof StageCounts];
          const Icon = stage.icon;
          return (
            <motion.button
              key={stage.key}
              onClick={() => onStageClick?.(stage.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                count > 0 ? `${stage.color}/10 ${stage.textColor}` : 'bg-muted text-muted-foreground'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="h-3 w-3" />
              <span>{stage.label}</span>
              <Badge variant="secondary" className="h-5 min-w-[20px] text-[10px]">
                {count}
              </Badge>
              {index < STAGE_CONFIG.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground ml-1" />
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Pipeline Overview
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{activeLeads}</span> active leads
            </span>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {conversionRate}% conversion
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-muted">
            {STAGE_CONFIG.map((stage) => {
              const count = stageCounts[stage.key as keyof StageCounts];
              const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
              if (percentage === 0) return null;
              return (
                <motion.div
                  key={stage.key}
                  className={`${stage.color} h-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  title={`${stage.label}: ${count} (${percentage.toFixed(0)}%)`}
                />
              );
            })}
          </div>
        </div>

        {/* Stage Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {STAGE_CONFIG.map((stage, index) => {
            const count = stageCounts[stage.key as keyof StageCounts];
            const Icon = stage.icon;
            const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
            
            return (
              <motion.button
                key={stage.key}
                onClick={() => onStageClick?.(stage.key)}
                className="relative p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className={`inline-flex p-1.5 rounded-md ${stage.color}/10 mb-2`}>
                  <Icon className={`h-4 w-4 ${stage.textColor}`} />
                </div>
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-xs text-muted-foreground truncate">{stage.label}</div>
                <div className="text-[10px] text-muted-foreground/70">{percentage}%</div>
                
                {/* Connector arrow */}
                {index < STAGE_CONFIG.length - 1 && (
                  <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-4 w-4 text-muted-foreground/30 hidden md:block" />
                )}
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default PipelineProgress;
