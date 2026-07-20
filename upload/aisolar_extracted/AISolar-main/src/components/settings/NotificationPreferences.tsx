import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail, Save, Loader2, Clock, Calendar } from 'lucide-react';
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
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly';
  digest_time: string;
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
  digest_enabled: false,
  digest_frequency: 'daily',
  digest_time: '09:00',
};

const notificationTypes = [
  { key: 'contract_signed', label: 'Contract Signed', description: 'When a customer signs a contract' },
  { key: 'payment_received', label: 'Payment Received', description: 'When payments or deposits are received' },
  { key: 'installation_scheduled', label: 'Installation Scheduled', description: 'When an installation date is confirmed' },
  { key: 'survey_completed', label: 'Survey Completed', description: 'When a site survey is marked complete' },
  { key: 'proposal_approved', label: 'Proposal Approved', description: 'When a customer approves a proposal' },
  { key: 'stage_changes', label: 'Workflow Stage Changes', description: 'When a lead moves to a new stage' },
];

const timeOptions = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
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
          digest_enabled: (data as any).digest_enabled ?? false,
          digest_frequency: (data as any).digest_frequency ?? 'daily',
          digest_time: (data as any).digest_time?.slice(0, 5) ?? '09:00',
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

  const handleSelectChange = (key: keyof NotificationPrefs, value: string) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
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
          email_contract_signed: prefs.email_contract_signed,
          email_payment_received: prefs.email_payment_received,
          email_installation_scheduled: prefs.email_installation_scheduled,
          email_survey_completed: prefs.email_survey_completed,
          email_proposal_approved: prefs.email_proposal_approved,
          email_stage_changes: prefs.email_stage_changes,
          inapp_contract_signed: prefs.inapp_contract_signed,
          inapp_payment_received: prefs.inapp_payment_received,
          inapp_installation_scheduled: prefs.inapp_installation_scheduled,
          inapp_survey_completed: prefs.inapp_survey_completed,
          inapp_proposal_approved: prefs.inapp_proposal_approved,
          inapp_stage_changes: prefs.inapp_stage_changes,
          digest_enabled: prefs.digest_enabled,
          digest_frequency: prefs.digest_frequency,
          digest_time: prefs.digest_time + ':00',
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
    <div className="space-y-6">
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
                  checked={prefs[`email_${type.key}` as keyof NotificationPrefs] as boolean}
                  onCheckedChange={() => handleToggle(`email_${type.key}` as keyof NotificationPrefs)}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={prefs[`inapp_${type.key}` as keyof NotificationPrefs] as boolean}
                  onCheckedChange={() => handleToggle(`inapp_${type.key}` as keyof NotificationPrefs)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Digest Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Email Digest
          </CardTitle>
          <CardDescription>
            Receive a summary of all notifications instead of individual emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Enable Email Digest</Label>
              <p className="text-sm text-muted-foreground">
                Consolidate notifications into a single email summary
              </p>
            </div>
            <Switch
              checked={prefs.digest_enabled}
              onCheckedChange={() => handleToggle('digest_enabled')}
            />
          </div>

          {prefs.digest_enabled && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Frequency
                  </Label>
                  <Select
                    value={prefs.digest_frequency}
                    onValueChange={(value) => handleSelectChange('digest_frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (Monday)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Delivery Time
                  </Label>
                  <Select
                    value={prefs.digest_time}
                    onValueChange={(value) => handleSelectChange('digest_time', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>
                  When enabled, you'll receive a {prefs.digest_frequency} summary at{' '}
                  {timeOptions.find(t => t.value === prefs.digest_time)?.label || prefs.digest_time}{' '}
                  instead of individual email notifications.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
