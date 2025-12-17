import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPrefs {
  email_contract_signed: boolean;
  email_payment_received: boolean;
  email_installation_scheduled: boolean;
  email_survey_completed: boolean;
  email_proposal_approved: boolean;
  email_stage_changes: boolean;
  inapp_contract_signed: boolean;
  inapp_payment_received: boolean;
  inapp_installation_scheduled: boolean;
  inapp_survey_completed: boolean;
  inapp_proposal_approved: boolean;
  inapp_stage_changes: boolean;
}

const defaultPrefs: NotificationPrefs = {
  email_contract_signed: true,
  email_payment_received: true,
  email_installation_scheduled: true,
  email_survey_completed: true,
  email_proposal_approved: true,
  email_stage_changes: false,
  inapp_contract_signed: true,
  inapp_payment_received: true,
  inapp_installation_scheduled: true,
  inapp_survey_completed: true,
  inapp_proposal_approved: true,
  inapp_stage_changes: true,
};

const notificationTypes = [
  { key: 'contract_signed', label: 'Contract Signed', description: 'When a customer signs a contract' },
  { key: 'payment_received', label: 'Payment Received', description: 'When payments or deposits are received' },
  { key: 'installation_scheduled', label: 'Installation Scheduled', description: 'When an installation date is confirmed' },
  { key: 'survey_completed', label: 'Survey Completed', description: 'When a site survey is marked complete' },
  { key: 'proposal_approved', label: 'Proposal Approved', description: 'When a customer approves a proposal' },
  { key: 'stage_changes', label: 'Workflow Stage Changes', description: 'When a lead moves to a new stage' },
];

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPrefs({
          email_contract_signed: data.email_contract_signed ?? true,
          email_payment_received: data.email_payment_received ?? true,
          email_installation_scheduled: data.email_installation_scheduled ?? true,
          email_survey_completed: data.email_survey_completed ?? true,
          email_proposal_approved: data.email_proposal_approved ?? true,
          email_stage_changes: data.email_stage_changes ?? false,
          inapp_contract_signed: data.inapp_contract_signed ?? true,
          inapp_payment_received: data.inapp_payment_received ?? true,
          inapp_installation_scheduled: data.inapp_installation_scheduled ?? true,
          inapp_survey_completed: data.inapp_survey_completed ?? true,
          inapp_proposal_approved: data.inapp_proposal_approved ?? true,
          inapp_stage_changes: data.inapp_stage_changes ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which notifications you want to receive via email and in-app alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_80px] gap-4 items-center pb-2 border-b">
          <div className="font-medium text-sm text-muted-foreground">Notification Type</div>
          <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
            <Mail className="h-4 w-4" />
            Email
          </div>
          <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
            <Bell className="h-4 w-4" />
            In-App
          </div>
        </div>

        {/* Notification rows */}
        {notificationTypes.map((type) => (
          <div key={type.key} className="grid grid-cols-[1fr_80px_80px] gap-4 items-center">
            <div>
              <Label className="font-medium">{type.label}</Label>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </div>
            <div className="flex justify-center">
              <Switch
                checked={prefs[`email_${type.key}` as keyof NotificationPrefs]}
                onCheckedChange={() => handleToggle(`email_${type.key}` as keyof NotificationPrefs)}
              />
            </div>
            <div className="flex justify-center">
              <Switch
                checked={prefs[`inapp_${type.key}` as keyof NotificationPrefs]}
                onCheckedChange={() => handleToggle(`inapp_${type.key}` as keyof NotificationPrefs)}
              />
            </div>
          </div>
        ))}

        <Separator />

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={savePreferences} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
