import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  Zap, 
  Settings, 
  Home, 
  CheckCircle, 
  PenLine,
  Save
} from 'lucide-react';

interface InstallationChecklistProps {
  proposalId: string;
  leadId: string;
  leadName: string;
}

interface ChecklistData {
  id?: string;
  main_fuse_size: string | null;
  network_provider: string | null;
  ct_clamp_location: string | null;
  isolator_installed: boolean;
  export_limiter_required: boolean;
  rcd_present_tested: boolean;
  earth_bond_confirmed: boolean;
  panels_installed: boolean;
  inverter_installed: boolean;
  battery_installed: boolean;
  monitoring_online: boolean;
  customer_app_setup: boolean;
  myenergi_setup: boolean;
  roof_tiles_secure: boolean;
  flashing_installed: boolean;
  cable_routing_complete: boolean;
  weatherproofing_complete: boolean;
  installer_signature: string | null;
  installer_signed_at: string | null;
  customer_signature: string | null;
  customer_signed_at: string | null;
  completion_notes: string | null;
  status: string;
}

const defaultChecklist: ChecklistData = {
  main_fuse_size: null,
  network_provider: null,
  ct_clamp_location: null,
  isolator_installed: false,
  export_limiter_required: false,
  rcd_present_tested: false,
  earth_bond_confirmed: false,
  panels_installed: false,
  inverter_installed: false,
  battery_installed: false,
  monitoring_online: false,
  customer_app_setup: false,
  myenergi_setup: false,
  roof_tiles_secure: false,
  flashing_installed: false,
  cable_routing_complete: false,
  weatherproofing_complete: false,
  installer_signature: null,
  installer_signed_at: null,
  customer_signature: null,
  customer_signed_at: null,
  completion_notes: null,
  status: 'pending'
};

export default function InstallationChecklist({ proposalId, leadId, leadName }: InstallationChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistData>(defaultChecklist);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChecklist();
  }, [proposalId]);

  const fetchChecklist = async () => {
    try {
      const { data, error } = await supabase
        .from('installation_checklists')
        .select('*')
        .eq('proposal_id', proposalId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setChecklist(data as ChecklistData);
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveChecklist = async () => {
    setSaving(true);
    try {
      const { id, ...checklistData } = checklist;

      if (id) {
        const { error } = await supabase
          .from('installation_checklists')
          .update(checklistData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('installation_checklists')
          .insert({ ...checklistData, proposal_id: proposalId, lead_id: leadId })
          .select()
          .single();
        if (error) throw error;
        setChecklist({ ...checklist, id: data.id });
      }

      toast({ title: 'Checklist Saved', description: 'Installation checklist has been updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: keyof ChecklistData, value: boolean) => {
    setChecklist(prev => ({ ...prev, [field]: value }));
  };

  const handleSign = async (type: 'installer' | 'customer', signature: string) => {
    if (!signature.trim()) return;
    
    const updates = type === 'installer' 
      ? { installer_signature: signature, installer_signed_at: new Date().toISOString() }
      : { customer_signature: signature, customer_signed_at: new Date().toISOString() };
    
    setChecklist(prev => ({ ...prev, ...updates }));
  };

  const completeChecklist = async () => {
    if (!checklist.installer_signature || !checklist.customer_signature) {
      toast({ title: 'Signatures Required', description: 'Both installer and customer signatures are required.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('installation_checklists')
        .update({ status: 'completed' })
        .eq('id', checklist.id);

      if (error) throw error;

      // Update proposal status
      await supabase
        .from('proposals')
        .update({ installation_status: 'completed' })
        .eq('id', proposalId);

      // Update lead workflow
      await supabase
        .from('leads')
        .update({ workflow_stage: 'installed' })
        .eq('id', leadId);

      setChecklist(prev => ({ ...prev, status: 'completed' }));
      toast({ title: 'Installation Complete', description: 'The installation has been marked as complete.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getCompletionPercentage = () => {
    const booleanFields = [
      'isolator_installed', 'export_limiter_required', 'rcd_present_tested', 'earth_bond_confirmed',
      'panels_installed', 'inverter_installed', 'battery_installed', 'monitoring_online',
      'customer_app_setup', 'myenergi_setup', 'roof_tiles_secure', 'flashing_installed',
      'cable_routing_complete', 'weatherproofing_complete'
    ];
    const completed = booleanFields.filter(f => checklist[f as keyof ChecklistData]).length;
    return Math.round((completed / booleanFields.length) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isComplete = checklist.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Installation Checklist
              </CardTitle>
              <CardDescription>Complete all checks before marking installation as done</CardDescription>
            </div>
            <div className="text-right">
              <Badge variant={isComplete ? 'default' : 'secondary'} className={isComplete ? 'bg-green-500' : ''}>
                {isComplete ? 'Completed' : `${getCompletionPercentage()}% Complete`}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Accordion type="multiple" defaultValue={['electrical', 'equipment', 'roofing']} className="space-y-4">
        {/* Electrical Verification */}
        <AccordionItem value="electrical" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">Electrical Verification</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Main Fuse Size</Label>
                  <Select 
                    value={checklist.main_fuse_size || ''} 
                    onValueChange={(v) => setChecklist(prev => ({ ...prev, main_fuse_size: v }))}
                    disabled={isComplete}
                  >
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="63A">63A</SelectItem>
                      <SelectItem value="80A">80A</SelectItem>
                      <SelectItem value="100A">100A</SelectItem>
                      <SelectItem value="125A">125A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Network Provider</Label>
                  <Select 
                    value={checklist.network_provider || ''} 
                    onValueChange={(v) => setChecklist(prev => ({ ...prev, network_provider: v }))}
                    disabled={isComplete}
                  >
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESB Networks">ESB Networks</SelectItem>
                      <SelectItem value="SSE Airtricity">SSE Airtricity</SelectItem>
                      <SelectItem value="Energia">Energia</SelectItem>
                      <SelectItem value="Electric Ireland">Electric Ireland</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CT Clamp Location</Label>
                  <Select 
                    value={checklist.ct_clamp_location || ''} 
                    onValueChange={(v) => setChecklist(prev => ({ ...prev, ct_clamp_location: v }))}
                    disabled={isComplete}
                  >
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consumer Unit">Consumer Unit</SelectItem>
                      <SelectItem value="Meter Tails">Meter Tails</SelectItem>
                      <SelectItem value="Distribution Board">Distribution Board</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {[
                  { key: 'isolator_installed', label: 'Isolator Installed' },
                  { key: 'export_limiter_required', label: 'Export Limiter Required' },
                  { key: 'rcd_present_tested', label: 'RCD Present & Tested' },
                  { key: 'earth_bond_confirmed', label: 'Earth Bond Confirmed' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                    <Label className="text-sm">{item.label}</Label>
                    <Switch
                      checked={checklist[item.key as keyof ChecklistData] as boolean}
                      onCheckedChange={(v) => handleToggle(item.key as keyof ChecklistData, v)}
                      disabled={isComplete}
                    />
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Equipment Setup */}
        <AccordionItem value="equipment" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">Equipment Setup</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'panels_installed', label: 'Panels Installed' },
                { key: 'inverter_installed', label: 'Inverter Installed' },
                { key: 'battery_installed', label: 'Battery Installed' },
                { key: 'monitoring_online', label: 'Monitoring Online' },
                { key: 'customer_app_setup', label: 'Customer App Setup' },
                { key: 'myenergi_setup', label: 'MyEnergi Setup' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                  <Label className="text-sm">{item.label}</Label>
                  <Switch
                    checked={checklist[item.key as keyof ChecklistData] as boolean}
                    onCheckedChange={(v) => handleToggle(item.key as keyof ChecklistData, v)}
                    disabled={isComplete}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Roofing Checks */}
        <AccordionItem value="roofing" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-orange-500" />
              <span className="font-semibold">Roofing Checks</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'roof_tiles_secure', label: 'Roof Tiles Secure' },
                { key: 'flashing_installed', label: 'Flashing Installed' },
                { key: 'cable_routing_complete', label: 'Cable Routing Complete' },
                { key: 'weatherproofing_complete', label: 'Weatherproofing Complete' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                  <Label className="text-sm">{item.label}</Label>
                  <Switch
                    checked={checklist[item.key as keyof ChecklistData] as boolean}
                    onCheckedChange={(v) => handleToggle(item.key as keyof ChecklistData, v)}
                    disabled={isComplete}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Completion & Signatures */}
        <AccordionItem value="completion" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Completion & Signatures</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-6">
              <div>
                <Label>Completion Notes</Label>
                <Textarea
                  value={checklist.completion_notes || ''}
                  onChange={(e) => setChecklist(prev => ({ ...prev, completion_notes: e.target.value }))}
                  placeholder="Any notes about the installation..."
                  disabled={isComplete}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Installer Signature */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Installer Signature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {checklist.installer_signature ? (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="font-signature text-lg">{checklist.installer_signature}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Signed: {checklist.installer_signed_at ? new Date(checklist.installer_signed_at).toLocaleString() : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          placeholder="Type full name to sign"
                          onBlur={(e) => handleSign('installer', e.target.value)}
                          disabled={isComplete}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Signature */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Customer Signature ({leadName})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {checklist.customer_signature ? (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="font-signature text-lg">{checklist.customer_signature}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Signed: {checklist.customer_signed_at ? new Date(checklist.customer_signed_at).toLocaleString() : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          placeholder="Customer types full name to sign"
                          onBlur={(e) => handleSign('customer', e.target.value)}
                          disabled={isComplete}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Action Buttons */}
      {!isComplete && (
        <div className="flex gap-4">
          <Button variant="outline" onClick={saveChecklist} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Progress
          </Button>
          <Button 
            onClick={completeChecklist} 
            disabled={saving || !checklist.installer_signature || !checklist.customer_signature}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Installation
          </Button>
        </div>
      )}
    </div>
  );
}
