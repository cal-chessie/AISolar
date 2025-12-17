import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, Settings, Clock, Save, RotateCcw, Users, Link2, 
  Palette, Mail, Shield, CreditCard, CheckCircle2, AlertCircle,
  Plus, Trash2, Edit2, Send, UserPlus, Copy, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import { brand } from '@/config/brand';

interface InviteUser {
  email: string;
  role: 'admin' | 'consultant' | 'installer';
}

interface ThresholdSetting {
  id: string;
  workflow_stage: string;
  threshold_days: number;
}

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
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

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'proposal_sent',
    name: 'Proposal Sent',
    subject: 'Your Solar Proposal from {{company_name}}',
    body: 'Dear {{customer_name}},\n\nThank you for your interest in solar energy. Your personalized proposal is ready for review.\n\nView your proposal here: {{portal_link}}\n\nBest regards,\n{{company_name}}',
    enabled: true
  },
  {
    id: 'survey_scheduled',
    name: 'Survey Scheduled',
    subject: 'Site Survey Scheduled - {{company_name}}',
    body: 'Dear {{customer_name}},\n\nYour site survey has been scheduled for {{survey_date}}.\n\nOur consultant will arrive between {{time_slot}}.\n\nBest regards,\n{{company_name}}',
    enabled: true
  },
  {
    id: 'installation_confirmed',
    name: 'Installation Confirmed',
    subject: 'Installation Date Confirmed - {{company_name}}',
    body: 'Dear {{customer_name}},\n\nGreat news! Your installation has been confirmed for {{install_date}}.\n\nPlease ensure the property is accessible.\n\nBest regards,\n{{company_name}}',
    enabled: true
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    subject: 'Payment Reminder - {{company_name}}',
    body: 'Dear {{customer_name}},\n\nThis is a friendly reminder that your payment of €{{amount}} is due.\n\nPay now: {{payment_link}}\n\nBest regards,\n{{company_name}}',
    enabled: true
  }
];

// Invite User Dialog Component
function InviteUserDialog({ onInvite }: { onInvite: (data: InviteUser) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'consultant' | 'installer'>('consultant');
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (email) {
      onInvite({ email, role });
      setEmail('');
      setRole('consultant');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new user to your team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="colleague@company.ie"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
                <SelectItem value="installer">Installer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!email}>
            <Send className="h-4 w-4 mr-2" />
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('followups');
  const [thresholds, setThresholds] = useState<ThresholdSetting[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Branding state
  const [brandingConfig, setBrandingConfig] = useState<{
    companyName: string;
    tagline: string;
    primaryColor: string;
    accentColor: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
  }>({
    companyName: brand.name,
    tagline: brand.tagline,
    primaryColor: '#10b981',
    accentColor: '#059669',
    contactEmail: brand.contact.email,
    contactPhone: brand.contact.phone,
    address: brand.contact.address
  });

  // Integration state
  const [integrations, setIntegrations] = useState<{
    stripe: { enabled: boolean; status: 'connected' | 'not_configured' };
    resend: { enabled: boolean; status: 'connected' | 'not_configured' };
    coinbase: { enabled: boolean; status: 'connected' | 'not_configured' };
  }>({
    stripe: { enabled: true, status: 'connected' },
    resend: { enabled: true, status: 'connected' },
    coinbase: { enabled: false, status: 'not_configured' }
  });

  const handleInviteUser = (data: InviteUser) => {
    toast.success(`Invitation sent to ${data.email} as ${data.role}`);
  };

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    await Promise.all([fetchThresholds(), fetchUsers()]);
    setLoading(false);
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
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.full_name || 'Unknown',
          full_name: profile.full_name,
          role: userRole?.role || 'consultant',
          created_at: profile.created_at
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  const updateUserRole = async (userId: string, newRole: 'admin' | 'consultant' | 'installer') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role: newRole } : u
      ));
      toast.success('User role updated');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const updateEmailTemplate = (templateId: string, field: keyof EmailTemplate, value: string | boolean) => {
    setEmailTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, [field]: value } : t
    ));
    setHasChanges(true);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={`Admin Settings - ${brand.name}`}
        description="Configure system settings, user management, and integrations"
      />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4">
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
                  <p className="text-muted-foreground text-sm">Manage system configuration</p>
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

        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 h-auto p-1">
              <TabsTrigger value="followups" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Follow-ups</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">Integrations</span>
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
              <TabsTrigger value="emails" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email Templates</span>
              </TabsTrigger>
            </TabsList>

            {/* Follow-up Settings Tab */}
            <TabsContent value="followups" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Follow-up Reminder Thresholds
                  </CardTitle>
                  <CardDescription>
                    Configure how many days of inactivity trigger a follow-up reminder for each workflow stage.
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
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        User Management
                      </CardTitle>
                      <CardDescription>
                        Manage user accounts and role assignments
                      </CardDescription>
                    </div>
                    <InviteUserDialog onInvite={handleInviteUser} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No users found</p>
                        <p className="text-sm text-muted-foreground">Invite team members to get started</p>
                      </div>
                    ) : (
                      users.map((user) => (
                        <div 
                          key={user.id} 
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              user.role === 'admin' ? 'bg-primary/20 text-primary' :
                              user.role === 'installer' ? 'bg-orange-500/20 text-orange-600' :
                              'bg-blue-500/20 text-blue-600'
                            }`}>
                              <span className="font-medium">
                                {(user.full_name || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name || 'Unknown User'}</p>
                              <p className="text-sm text-muted-foreground">
                                Joined {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Select
                              value={user.role}
                              onValueChange={(value) => updateUserRole(user.user_id, value as 'admin' | 'consultant' | 'installer')}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3" />
                                    Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="consultant">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    Consultant
                                  </div>
                                </SelectItem>
                                <SelectItem value="installer">
                                  <div className="flex items-center gap-2">
                                    <Settings className="h-3 w-3" />
                                    Installer
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Role Permissions</CardTitle>
                  <CardDescription>Overview of what each role can access</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border border-primary/30 rounded-lg bg-primary/5">
                      <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Full system access</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> User management</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Settings & configuration</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Analytics & reports</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Product management</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-blue-300 rounded-lg bg-blue-500/5">
                      <h4 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Consultant
                      </h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Lead management</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Site surveys</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Proposals</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Calendar scheduling</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Customer communication</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-orange-300 rounded-lg bg-orange-500/5">
                      <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Installer
                      </h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> View assignments</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Survey details</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Installation checklists</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Map view</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Completion signatures</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Gateways
                  </CardTitle>
                  <CardDescription>
                    Configure payment processing integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-[#635BFF] flex items-center justify-center">
                        <span className="text-white font-bold text-sm">S</span>
                      </div>
                      <div>
                        <p className="font-medium">Stripe</p>
                        <p className="text-sm text-muted-foreground">Card payments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {integrations.stripe.status === 'connected' ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not configured
                        </Badge>
                      )}
                      <Switch 
                        checked={integrations.stripe.enabled}
                        onCheckedChange={(checked) => 
                          setIntegrations(prev => ({
                            ...prev,
                            stripe: { ...prev.stripe, enabled: checked }
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-[#0052FF] flex items-center justify-center">
                        <span className="text-white font-bold text-sm">C</span>
                      </div>
                      <div>
                        <p className="font-medium">Coinbase Commerce</p>
                        <p className="text-sm text-muted-foreground">Cryptocurrency payments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {integrations.coinbase.status === 'connected' ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not configured
                        </Badge>
                      )}
                      <Switch 
                        checked={integrations.coinbase.enabled}
                        onCheckedChange={(checked) => 
                          setIntegrations(prev => ({
                            ...prev,
                            coinbase: { ...prev.coinbase, enabled: checked }
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Service
                  </CardTitle>
                  <CardDescription>
                    Configure email delivery settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-black flex items-center justify-center">
                        <span className="text-white font-bold text-sm">R</span>
                      </div>
                      <div>
                        <p className="font-medium">Resend</p>
                        <p className="text-sm text-muted-foreground">Transactional emails</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {integrations.resend.status === 'connected' ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not configured
                        </Badge>
                      )}
                      <Switch 
                        checked={integrations.resend.enabled}
                        onCheckedChange={(checked) => 
                          setIntegrations(prev => ({
                            ...prev,
                            resend: { ...prev.resend, enabled: checked }
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Brand Configuration
                  </CardTitle>
                  <CardDescription>
                    Customize your company branding and appearance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input 
                        value={brandingConfig.companyName}
                        onChange={(e) => setBrandingConfig(prev => ({
                          ...prev,
                          companyName: e.target.value
                        }))}
                        placeholder="Your Company Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tagline</Label>
                      <Input 
                        value={brandingConfig.tagline}
                        onChange={(e) => setBrandingConfig(prev => ({
                          ...prev,
                          tagline: e.target.value
                        }))}
                        placeholder="Your company tagline"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color"
                          value={brandingConfig.primaryColor}
                          onChange={(e) => setBrandingConfig(prev => ({
                            ...prev,
                            primaryColor: e.target.value
                          }))}
                          className="w-16 h-10 p-1"
                        />
                        <Input 
                          value={brandingConfig.primaryColor}
                          onChange={(e) => setBrandingConfig(prev => ({
                            ...prev,
                            primaryColor: e.target.value
                          }))}
                          placeholder="#10b981"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color"
                          value={brandingConfig.accentColor}
                          onChange={(e) => setBrandingConfig(prev => ({
                            ...prev,
                            accentColor: e.target.value
                          }))}
                          className="w-16 h-10 p-1"
                        />
                        <Input 
                          value={brandingConfig.accentColor}
                          onChange={(e) => setBrandingConfig(prev => ({
                            ...prev,
                            accentColor: e.target.value
                          }))}
                          placeholder="#059669"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Contact Information</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input 
                          type="email"
                          value={brandingConfig.contactEmail}
                          onChange={(e) => setBrandingConfig(prev => ({
                            ...prev,
                            contactEmail: e.target.value
                          }))}
                          placeholder="info@company.ie"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input 
                          value={brandingConfig.contactPhone}
                          onChange={(e) => setBrandingConfig(prev => ({
                            ...prev,
                            contactPhone: e.target.value
                          }))}
                          placeholder="+353 1 234 5678"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input 
                        value={brandingConfig.address}
                        onChange={(e) => setBrandingConfig(prev => ({
                          ...prev,
                          address: e.target.value
                        }))}
                        placeholder="123 Main Street, Dublin, Ireland"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => toast.success('Branding settings saved (demo)')}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Branding
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>See how your branding looks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: brandingConfig.primaryColor }}
                      >
                        <span className="text-white font-bold">
                          {brandingConfig.companyName[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold">{brandingConfig.companyName}</h3>
                        <p className="text-sm text-muted-foreground">{brandingConfig.tagline}</p>
                      </div>
                    </div>
                    <Button style={{ backgroundColor: brandingConfig.primaryColor }}>
                      Get Your Free Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Templates Tab */}
            <TabsContent value="emails" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Templates
                  </CardTitle>
                  <CardDescription>
                    Customize automated email notifications sent to customers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{template.name}</h4>
                          <Switch 
                            checked={template.enabled}
                            onCheckedChange={(checked) => 
                              updateEmailTemplate(template.id, 'enabled', checked)
                            }
                          />
                        </div>
                        <Badge variant={template.enabled ? 'default' : 'secondary'}>
                          {template.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Subject Line</Label>
                        <Input 
                          value={template.subject}
                          onChange={(e) => updateEmailTemplate(template.id, 'subject', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Email Body</Label>
                        <Textarea 
                          value={template.body}
                          onChange={(e) => updateEmailTemplate(template.id, 'body', e.target.value)}
                          rows={5}
                          className="font-mono text-sm"
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Available variables: {'{{customer_name}}'}, {'{{company_name}}'}, {'{{portal_link}}'}, {'{{amount}}'}, {'{{survey_date}}'}, {'{{install_date}}'}
                      </p>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button onClick={() => toast.success('Email templates saved (demo)')}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
