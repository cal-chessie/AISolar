import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, CheckCircle, Loader2 } from 'lucide-react';
import { logActivity } from '@/lib/activityLog';

interface ContractSignatureProps {
  proposalId: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  totalAmount: number;
  onSignComplete?: (contractId: string) => void;
}

export default function ContractSignature({
  proposalId,
  leadId,
  leadName,
  leadEmail,
  totalAmount,
  onSignComplete
}: ContractSignatureProps) {
  const [loading, setLoading] = useState(false);
  const [signed, setSigned] = useState(false);
  const [formData, setFormData] = useState({
    signedByName: leadName,
    signedByEmail: leadEmail,
    gdprConsent: false,
    marketingConsent: false,
    signature: ''
  });

  const GDPR_TEXT = `I consent to Solar Dublin processing my personal data for the purpose of this solar installation contract. 
I understand that my data will be stored securely and used only for contract fulfillment, installation scheduling, 
warranty registration, and customer support. I can withdraw consent at any time by contacting support@solardublin.ie.`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.gdprConsent) {
      toast({
        title: 'GDPR Consent Required',
        description: 'Please accept the data processing consent to proceed.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.signature.trim()) {
      toast({
        title: 'Signature Required',
        description: 'Please type your full name as your digital signature.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Create contract record
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          proposal_id: proposalId,
          lead_id: leadId,
          signed_by_name: formData.signedByName,
          signed_by_email: formData.signedByEmail,
          signature_data: formData.signature,
          gdpr_consent: formData.gdprConsent,
          gdpr_consent_text: GDPR_TEXT
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Update proposal status to approved
      await supabase
        .from('proposals')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', proposalId);

      // Create invoice
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const depositAmount = totalAmount * 0.3; // 30% deposit

      const { data: newInvoice } = await supabase
        .from('invoices')
        .insert({
          proposal_id: proposalId,
          lead_id: leadId,
          contract_id: contract.id,
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          status: 'pending',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
        })
        .select()
        .single();

      // Send invoice notification email
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'invoice_created',
            leadId,
            invoiceId: newInvoice?.id,
          },
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the signing process if email fails
      }

      // Update lead workflow stage
      await supabase
        .from('leads')
        .update({ 
          workflow_stage: 'approved',
          status: 'closed_won'
        })
        .eq('id', leadId);

      // Log activity
      await logActivity({
        leadId,
        actionType: 'contract_signed',
        description: `Contract signed by ${formData.signedByName}`,
        metadata: {
          total_amount: totalAmount,
          signed_by_email: formData.signedByEmail
        }
      });

      setSigned(true);
      toast({
        title: 'Contract Signed Successfully',
        description: `Invoice ${invoiceNumber} has been generated. Deposit amount: €${depositAmount.toLocaleString()}`,
      });

      if (onSignComplete) {
        onSignComplete(contract.id);
      }
    } catch (error: any) {
      console.error('Error signing contract:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign contract',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (signed) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-300">Contract Signed</h3>
            <p className="text-green-700 dark:text-green-400 mt-2">
              Thank you! Your invoice has been generated and sent to {formData.signedByEmail}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Contract Acceptance
        </CardTitle>
        <CardDescription>
          Please review and sign to proceed with your solar installation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Contract Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">€{totalAmount.toLocaleString()}</span>
              <span className="text-muted-foreground">Deposit (30%):</span>
              <span className="font-medium">€{(totalAmount * 0.3).toLocaleString()}</span>
              <span className="text-muted-foreground">Balance Due:</span>
              <span className="font-medium">€{(totalAmount * 0.7).toLocaleString()}</span>
            </div>
          </div>

          {/* Signatory Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="signedByName">Full Name</Label>
              <Input
                id="signedByName"
                value={formData.signedByName}
                onChange={(e) => setFormData(prev => ({ ...prev, signedByName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="signedByEmail">Email</Label>
              <Input
                id="signedByEmail"
                type="email"
                value={formData.signedByEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, signedByEmail: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* GDPR Consent */}
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-sm">
              <h4 className="font-semibold mb-2">Data Protection Notice</h4>
              <p className="text-muted-foreground text-xs">{GDPR_TEXT}</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="gdprConsent"
                checked={formData.gdprConsent}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, gdprConsent: checked === true }))
                }
              />
              <Label htmlFor="gdprConsent" className="text-sm leading-tight">
                I accept the data processing terms above and consent to the processing of my personal data *
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="marketingConsent"
                checked={formData.marketingConsent}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, marketingConsent: checked === true }))
                }
              />
              <Label htmlFor="marketingConsent" className="text-sm leading-tight text-muted-foreground">
                I would like to receive updates about solar energy news and offers (optional)
              </Label>
            </div>
          </div>

          {/* Digital Signature */}
          <div>
            <Label htmlFor="signature">Digital Signature</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Type your full legal name as your digital signature
            </p>
            <Input
              id="signature"
              value={formData.signature}
              onChange={(e) => setFormData(prev => ({ ...prev, signature: e.target.value }))}
              placeholder="Type your full name here"
              className="font-signature text-lg"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Sign Contract & Generate Invoice
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
