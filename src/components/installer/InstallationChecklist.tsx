import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLog';
import { sendStageChangeNotification } from '@/lib/stageNotifications';
import SignatureCanvas from '@/components/ui/SignatureCanvas';
import { 
  Loader2, 
  Zap, 
  Settings, 
  Home, 
  CheckCircle, 
  PenLine,
  Save,
  CreditCard,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface InstallationChecklistProps {
  proposalId: string;
  leadId: string;
  leadName: string;
}

interface InvoiceStatus {
  id: string;
  invoice_number: string;
  total_amount: number;
  deposit_amount: number | null;
  final_amount: number | null;
  deposit_paid: boolean;
  final_paid: boolean;
  status: string;
}

interface SeaiStatus {
  id: string;
  application_number: string | null;
  status: string;
  grant_amount: number | null;
  system_size_kw: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  ber_cert_uploaded: boolean;
  completion_cert_uploaded: boolean;
  invoice_uploaded: boolean;
  photos_uploaded: boolean;
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
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | null>(null);
  const [seaiStatus, setSeaiStatus] = useState<SeaiStatus | null>(null);

  useEffect(() => {
    fetchChecklist();
    fetchInvoiceStatus();
    fetchSeaiStatus();
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

  const fetchInvoiceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, deposit_amount, final_amount, deposit_paid, final_paid, status')
        .eq('proposal_id', proposalId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setInvoiceStatus(data as InvoiceStatus);
      }
    } catch (error) {
      console.error('Error fetching invoice status:', error);
    }
  };

  const fetchSeaiStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('seai_applications')
        .select('id, application_number, status, grant_amount, system_size_kw, submitted_at, approved_at, rejected_at, ber_cert_uploaded, completion_cert_uploaded, invoice_uploaded, photos_uploaded')
        .eq('proposal_id', proposalId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSeaiStatus(data as SeaiStatus);
      }
    } catch (error) {
      console.error('Error fetching SEAI status:', error);
    }
  };

  const getSeaiStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'submitted':
      case 'pending_verification':
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeaiStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft - Not Submitted',
      submitted: 'Submitted - Awaiting Review',
      pending_verification: 'Pending Verification',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return labels[status] || status;
  };

  const getSeaiDocProgress = () => {
    if (!seaiStatus) return 0;
    const docs = [
      seaiStatus.ber_cert_uploaded,
      seaiStatus.completion_cert_uploaded,
      seaiStatus.invoice_uploaded,
      seaiStatus.photos_uploaded,
    ];
    return docs.filter(Boolean).length;
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

  const handleSign = (type: 'installer' | 'customer', signatureData: string | null) => {
    if (type === 'installer') {
      setChecklist(prev => ({ 
        ...prev, 
        installer_signature: signatureData,
        installer_signed_at: signatureData ? new Date().toISOString() : null
      }));
    } else {
      setChecklist(prev => ({ 
        ...prev, 
        customer_signature: signatureData,
        customer_signed_at: signatureData ? new Date().toISOString() : null
      }));
    }
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

      // workflow_stage is automatically updated by database trigger when checklist is signed

      // Fetch proposal to get pricing for invoice
      const { data: proposal } = await supabase
        .from('proposals')
        .select('net_cost, system_cost, seai_grant')
        .eq('id', proposalId)
        .single();

      // Check if invoice already exists
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('proposal_id', proposalId)
        .maybeSingle();

      let invoiceId = existingInvoice?.id;

      // Auto-generate invoice if it doesn't exist
      if (!existingInvoice && proposal) {
        const totalAmount = proposal.net_cost || proposal.system_cost || 0;
        const depositAmount = Math.round(totalAmount * 0.3);
        const finalAmount = totalAmount - depositAmount;
        const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            lead_id: leadId,
            proposal_id: proposalId,
            invoice_number: invoiceNumber,
            total_amount: totalAmount,
            deposit_amount: depositAmount,
            final_amount: finalAmount,
            deposit_paid: true,
            deposit_paid_at: new Date().toISOString(),
            status: 'pending_final'
          })
          .select()
          .single();

        if (invoiceError) {
          console.error('Invoice creation error:', invoiceError);
        } else {
          invoiceId = newInvoice?.id;
          
          // Log invoice creation
          await logActivity({
            leadId,
            actionType: 'invoice_created',
            description: `Invoice ${invoiceNumber} auto-generated on installation completion`,
            metadata: { invoice_id: newInvoice?.id, total_amount: totalAmount }
          });
        }
      }

      // Send installation completed email with payment link
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'installation_completed',
            leadId,
            invoiceId
          }
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }
      
      // Send stage change notification
      await sendStageChangeNotification(leadId, 'installation_scheduled', 'installed');

      // Log activity
      await logActivity({
        leadId,
        actionType: 'installation_completed',
        description: `Installation completed for ${leadName}`,
        metadata: {
          proposal_id: proposalId
        }
      });

      setChecklist(prev => ({ ...prev, status: 'completed' }));
      toast({ title: 'Installation Complete', description: 'Invoice generated and payment link sent to customer.' });
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
      {/* Payment Status Indicator */}
      {invoiceStatus && (
        <Card className={invoiceStatus.final_paid ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {invoiceStatus.final_paid ? (
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                    <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">
                    {invoiceStatus.final_paid ? 'Final Payment Received' : 'Final Payment Pending'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Invoice #{invoiceStatus.invoice_number} • Total: €{invoiceStatus.total_amount?.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Badge variant={invoiceStatus.deposit_paid ? 'default' : 'secondary'} className={invoiceStatus.deposit_paid ? 'bg-green-500' : ''}>
                    Deposit {invoiceStatus.deposit_paid ? '✓' : 'Pending'}
                  </Badge>
                  <Badge variant={invoiceStatus.final_paid ? 'default' : 'secondary'} className={invoiceStatus.final_paid ? 'bg-green-500' : ''}>
                    Final {invoiceStatus.final_paid ? '✓' : 'Pending'}
                  </Badge>
                </div>
                {!invoiceStatus.final_paid && invoiceStatus.final_amount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance due: €{invoiceStatus.final_amount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEAI Grant Status Indicator */}
      {seaiStatus && (
        <Card className={
          seaiStatus.status === 'approved' 
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
            : seaiStatus.status === 'rejected'
            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
            : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
        }>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  seaiStatus.status === 'approved' 
                    ? 'bg-green-100 dark:bg-green-900'
                    : seaiStatus.status === 'rejected'
                    ? 'bg-red-100 dark:bg-red-900'
                    : 'bg-blue-100 dark:bg-blue-900'
                }`}>
                  <FileText className={`h-5 w-5 ${
                    seaiStatus.status === 'approved' 
                      ? 'text-green-600 dark:text-green-400'
                      : seaiStatus.status === 'rejected'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    SEAI Grant Application
                    {getSeaiStatusIcon(seaiStatus.status)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {seaiStatus.application_number 
                      ? `#${seaiStatus.application_number}` 
                      : 'No application number yet'
                    }
                    {seaiStatus.grant_amount && ` • Grant: €${seaiStatus.grant_amount.toLocaleString()}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge 
                  variant={seaiStatus.status === 'approved' ? 'default' : 'secondary'} 
                  className={
                    seaiStatus.status === 'approved' 
                      ? 'bg-green-500' 
                      : seaiStatus.status === 'rejected'
                      ? 'bg-red-500'
                      : seaiStatus.status === 'submitted' || seaiStatus.status === 'pending_verification'
                      ? 'bg-blue-500'
                      : ''
                  }
                >
                  {getSeaiStatusLabel(seaiStatus.status)}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Documents: {getSeaiDocProgress()}/4</span>
                  <div className="flex gap-0.5 ml-1">
                    {[
                      { uploaded: seaiStatus.ber_cert_uploaded, label: 'BER' },
                      { uploaded: seaiStatus.completion_cert_uploaded, label: 'Completion' },
                      { uploaded: seaiStatus.invoice_uploaded, label: 'Invoice' },
                      { uploaded: seaiStatus.photos_uploaded, label: 'Photos' },
                    ].map((doc, i) => (
                      <div 
                        key={i}
                        className={`w-2 h-2 rounded-full ${doc.uploaded ? 'bg-green-500' : 'bg-muted'}`}
                        title={`${doc.label}: ${doc.uploaded ? 'Uploaded' : 'Pending'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {seaiStatus.status === 'approved' && seaiStatus.approved_at && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Approved on {new Date(seaiStatus.approved_at).toLocaleDateString()}
              </p>
            )}
            {seaiStatus.status === 'submitted' && seaiStatus.submitted_at && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Submitted on {new Date(seaiStatus.submitted_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
                    {checklist.installer_signature && checklist.installer_signature.startsWith('data:image') ? (
                      <div className="space-y-2">
                        <img 
                          src={checklist.installer_signature} 
                          alt="Installer signature" 
                          className="h-24 border rounded bg-white"
                        />
                        <p className="text-xs text-muted-foreground">
                          Signed: {checklist.installer_signed_at ? new Date(checklist.installer_signed_at).toLocaleString() : ''}
                        </p>
                        {!isComplete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSign('installer', null)}
                          >
                            Clear & Re-sign
                          </Button>
                        )}
                      </div>
                    ) : (
                      <SignatureCanvas
                        onSignatureChange={(sig) => handleSign('installer', sig)}
                        initialSignature={checklist.installer_signature}
                        disabled={isComplete}
                        label="Installer signs here"
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Customer Signature */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Customer Signature ({leadName})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {checklist.customer_signature && checklist.customer_signature.startsWith('data:image') ? (
                      <div className="space-y-2">
                        <img 
                          src={checklist.customer_signature} 
                          alt="Customer signature" 
                          className="h-24 border rounded bg-white"
                        />
                        <p className="text-xs text-muted-foreground">
                          Signed: {checklist.customer_signed_at ? new Date(checklist.customer_signed_at).toLocaleString() : ''}
                        </p>
                        {!isComplete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSign('customer', null)}
                          >
                            Clear & Re-sign
                          </Button>
                        )}
                      </div>
                    ) : (
                      <SignatureCanvas
                        onSignatureChange={(sig) => handleSign('customer', sig)}
                        initialSignature={checklist.customer_signature}
                        disabled={isComplete}
                        label="Customer signs here"
                      />
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
