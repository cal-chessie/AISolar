import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Settings, Clock, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import { brand } from '@/config/brand';

interface ThresholdSetting {
  id: string;
  workflow_stage: string;
  threshold_days: number;
}

const STAGE_LABELS: Record<string, { label: string; description: string }> = {
  'new': { label: 'New Leads', description: 'Leads that have just been captured' },
  'survey': { label: 'Survey Stage', description: 'Leads waiting for site survey' },
  'proposal': { label: 'Proposal Stage', description: 'Leads with pending proposal' },
  'approved': { label: 'Approved', description: 'Proposals accepted, awaiting scheduling' },
  'scheduled': { label: 'Scheduled', description: 'Installation scheduled' },
  'installed': { label: 'Installed', description: 'Installation completed, awaiting final steps' }
};

const DEFAULT_THRESHOLDS: Record<string, number> = {
  'new': 2,
  'survey': 3,
  'proposal': 5,
  'approved': 3,
  'scheduled': 7,
  'installed': 14
};

export default function AdminSettings() {
  const navigate = useNavigate();
  const [thresholds, setThresholds] = useState<ThresholdSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    fetchThresholds();
  };

  const fetchThresholds = async () => {
    try {
      const { data, error } = await supabase
        .from('follow_up_settings')
        .select('*')
        .order('workflow_stage');

      if (error) throw error;
      setThresholds(data || []);
    } catch (error) {
      console.error('Error fetching thresholds:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateThreshold = (stage: string, days: number) => {
    setThresholds(prev => 
      prev.map(t => 
        t.workflow_stage === stage ? { ...t, threshold_days: days } : t
      )
    );
    setHasChanges(true);
  };

  const saveThresholds = async () => {
    setSaving(true);
    try {
      for (const threshold of thresholds) {
        const { error } = await supabase
          .from('follow_up_settings')
          .update({ threshold_days: threshold.threshold_days })
          .eq('id', threshold.id);

        if (error) throw error;
      }
      
      toast.success('Follow-up thresholds saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving thresholds:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    setSaving(true);
    try {
      for (const [stage, days] of Object.entries(DEFAULT_THRESHOLDS)) {
        const { error } = await supabase
          .from('follow_up_settings')
          .update({ threshold_days: days })
          .eq('workflow_stage', stage);

        if (error) throw error;
      }
      
      await fetchThresholds();
      toast.success('Reset to default thresholds');
      setHasChanges(false);
    } catch (error) {
      console.error('Error resetting thresholds:', error);
      toast.error('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const getStageOrder = (stage: string) => {
    const order = ['new', 'survey', 'proposal', 'approved', 'scheduled', 'installed'];
    return order.indexOf(stage);
  };

  const sortedThresholds = [...thresholds].sort(
    (a, b) => getStageOrder(a.workflow_stage) - getStageOrder(b.workflow_stage)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={`Admin Settings - ${brand.name}`}
        description="Configure follow-up reminders and system settings"
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
        <header className="bg-card border-b border-border shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/consultant')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Settings className="h-6 w-6" />
                    Admin Settings
                  </h1>
                  <p className="text-muted-foreground text-sm">Configure system preferences</p>
                </div>
              </div>
              {hasChanges && (
                <Badge variant="secondary" className="animate-pulse">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Follow-up Reminder Thresholds
              </CardTitle>
              <CardDescription>
                Configure how many days of inactivity trigger a follow-up reminder for each workflow stage.
                Leads exceeding their threshold will appear in the dashboard reminders panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {sortedThresholds.map((threshold) => {
                const stageInfo = STAGE_LABELS[threshold.workflow_stage] || {
                  label: threshold.workflow_stage,
                  description: ''
                };
                const defaultValue = DEFAULT_THRESHOLDS[threshold.workflow_stage] || 3;
                const isModified = threshold.threshold_days !== defaultValue;

                return (
                  <div key={threshold.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium flex items-center gap-2">
                          {stageInfo.label}
                          {isModified && (
                            <Badge variant="outline" className="text-xs">
                              Modified
                            </Badge>
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {stageInfo.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={threshold.threshold_days}
                          onChange={(e) => updateThreshold(
                            threshold.workflow_stage,
                            parseInt(e.target.value) || 1
                          )}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min((threshold.threshold_days / 14) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <Separator className="my-6" />

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  disabled={saving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button
                  onClick={saveThresholds}
                  disabled={saving || !hasChanges}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Default Threshold Values</CardTitle>
              <CardDescription>
                Reference values for follow-up timing best practices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(DEFAULT_THRESHOLDS).map(([stage, days]) => (
                  <div key={stage} className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium text-sm">{STAGE_LABELS[stage]?.label || stage}</p>
                    <p className="text-2xl font-bold text-primary">{days} days</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
