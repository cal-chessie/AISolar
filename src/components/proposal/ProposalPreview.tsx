import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Download, Send, Eye, Check, Calendar, 
  CreditCard, ArrowRight, ArrowLeft, Signature, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SignatureCanvas from '@/components/ui/SignatureCanvas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { exportProposalToPDF, ProposalPDFData } from '@/lib/pdfExport';
import { format, addWeeks, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProposalPreviewProps {
  proposal: any;
  lead: any;
  onBack: () => void;
  onComplete?: () => void;
}

type PreviewStep = 'preview' | 'signature' | 'dates' | 'payment' | 'complete';

export default function ProposalPreview({ proposal, lead, onBack, onComplete }: ProposalPreviewProps) {
  const [currentStep, setCurrentStep] = useState<PreviewStep>('preview');
  const [loading, setLoading] = useState(false);
  
  // Signature step state
  const [signatureData, setSignatureData] = useState('');
  const [signatoryName, setSignatoryName] = useState(lead?.name || '');
  const [signatoryEmail, setSignatoryEmail] = useState(lead?.email || '');
  const [gdprConsent, setGdprConsent] = useState(false);
  
  // Date selection step state
  const [preferredDates, setPreferredDates] = useState<Date[]>([]);
  const minDate = addWeeks(new Date(), 3); // Minimum 3 weeks lead time
  
  // Payment schedule state
  const [paymentSchedule, setPaymentSchedule] = useState<'full' | 'deposit' | 'installments'>('deposit');
  
  const depositAmount = proposal?.net_cost ? Math.round(proposal.net_cost * 0.3) : 0;
  const balanceAmount = proposal?.net_cost ? proposal.net_cost - depositAmount : 0;

  const handleDownloadPDF = () => {
    if (!proposal || !lead) return;
    
    const pdfData: ProposalPDFData = {
      customerName: lead.name,
      customerEmail: lead.email,
      customerAddress: lead.address,
      systemSizeKw: proposal.system_size_kw,
      panelCount: proposal.panel_count,
      panelType: proposal.panel_type,
      inverterType: proposal.inverter_type,
      batteryCapacityKwh: proposal.battery_capacity_kwh,
      systemCost: proposal.system_cost,
      seaiGrant: proposal.seai_grant,
      netCost: proposal.net_cost,
      monthlySavings: proposal.monthly_savings,
      paybackPeriodYears: proposal.payback_period_years,
      estimatedAnnualProductionKwh: proposal.estimated_annual_production_kwh,
      energyOffsetPercentage: proposal.energy_offset_percentage || 80,
      createdAt: proposal.created_at,
      proposalId: proposal.id,
    };
    
    exportProposalToPDF(pdfData);
  };

  const handleProceedToSignature = () => {
    setCurrentStep('signature');
  };

  const handleSignatureComplete = async () => {
    if (!signatureData || !signatoryName || !signatoryEmail || !gdprConsent) {
      toast({
        title: 'Missing information',
        description: 'Please complete all required fields including signature and consent.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      // Create contract record
      const { error: contractError } = await supabase
        .from('contracts')
        .insert({
          proposal_id: proposal.id,
          lead_id: lead.id,
          signed_by_name: signatoryName,
          signed_by_email: signatoryEmail,
          signature_data: signatureData,
          gdpr_consent: gdprConsent,
          gdpr_consent_text: 'I consent to the processing of my personal data in accordance with GDPR for the purpose of this solar installation project.',
          signed_at: new Date().toISOString(),
        });

      if (contractError) throw contractError;
      
      setCurrentStep('dates');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelection = (date: Date | undefined) => {
    if (!date) return;
    
    if (isBefore(date, minDate)) {
      toast({
        title: 'Invalid date',
        description: 'Please select a date at least 3 weeks from today.',
        variant: 'destructive',
      });
      return;
    }
    
    if (preferredDates.length >= 3) {
      toast({
        title: 'Maximum dates selected',
        description: 'You can only select up to 3 preferred dates.',
      });
      return;
    }
    
    if (!preferredDates.find(d => d.getTime() === date.getTime())) {
      setPreferredDates([...preferredDates, date]);
    }
  };

  const removeDate = (index: number) => {
    setPreferredDates(preferredDates.filter((_, i) => i !== index));
  };

  const handleDatesComplete = async () => {
    if (preferredDates.length === 0) {
      toast({
        title: 'Please select dates',
        description: 'Select at least one preferred installation date.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      // Update proposal with preferred dates
      const { error } = await supabase
        .from('proposals')
        .update({
          preferred_install_dates: preferredDates.map(d => d.toISOString()),
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (error) throw error;

      // Update lead workflow stage
      await supabase
        .from('leads')
        .update({ workflow_stage: 'approved' })
        .eq('id', lead.id);
      
      setCurrentStep('payment');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = async () => {
    setLoading(true);
    try {
      // Create invoice
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase
        .from('invoices')
        .insert({
          lead_id: lead.id,
          proposal_id: proposal.id,
          invoice_number: invoiceNumber,
          total_amount: proposal.net_cost,
          deposit_amount: depositAmount,
          final_amount: balanceAmount,
          status: 'pending',
          due_date: addWeeks(new Date(), 1).toISOString(),
        });

      if (error) throw error;

      // Send proposal accepted email notification
      try {
        await supabase.functions.invoke('send-proposal-accepted', {
          body: {
            customerName: lead.name,
            customerEmail: lead.email,
            systemSizeKw: proposal.system_size_kw,
            netCost: proposal.net_cost,
            seaiGrant: proposal.seai_grant,
            preferredDates: preferredDates.map(d => d.toISOString()),
            paymentOption: paymentSchedule,
            depositAmount: paymentSchedule === 'deposit' ? depositAmount : undefined,
          }
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't block the flow if email fails
      }
      
      setCurrentStep('complete');
      
      toast({
        title: 'Proposal Accepted!',
        description: 'Your proposal has been signed and submitted successfully.',
      });
      
      onComplete?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Proposal Header */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Solar Proposal</h2>
              <p className="text-primary-foreground/90">{lead?.name}</p>
              <p className="text-sm text-primary-foreground/70">{lead?.address}</p>
            </div>
            <Badge variant="secondary">{proposal?.status}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{proposal?.system_size_kw} kW</div>
            <div className="text-xs text-muted-foreground">System Size</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">€{proposal?.monthly_savings?.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Monthly Savings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{proposal?.payback_period_years?.toFixed(1)} yrs</div>
            <div className="text-xs text-muted-foreground">Payback</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">€{proposal?.net_cost?.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Net Cost</div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Investment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">System Cost</span>
            <span className="font-medium">€{proposal?.system_cost?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b text-green-600">
            <span>SEAI Grant</span>
            <span className="font-medium">-€{proposal?.seai_grant?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 text-lg font-bold">
            <span>Your Investment</span>
            <span className="text-primary">€{proposal?.net_cost?.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* System Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Panels:</span>
              <span className="ml-2 font-medium">{proposal?.panel_count} x {proposal?.panel_type || 'Premium'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Inverter:</span>
              <span className="ml-2 font-medium">{proposal?.inverter_type || 'Hybrid'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Annual Production:</span>
              <span className="ml-2 font-medium">{proposal?.estimated_annual_production_kwh?.toLocaleString()} kWh</span>
            </div>
            {proposal?.battery_storage && (
              <div>
                <span className="text-muted-foreground">Battery:</span>
                <span className="ml-2 font-medium">{proposal?.battery_capacity_kwh} kWh</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={handleDownloadPDF} className="flex-1">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button onClick={handleProceedToSignature} className="flex-1">
          Accept & Sign
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderSignatureStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Signature className="h-5 w-5 text-primary" />
            Contract Acceptance
          </CardTitle>
          <CardDescription>
            Sign below to accept this solar proposal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="signatory-name">Full Name</Label>
              <Input
                id="signatory-name"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="signatory-email">Email</Label>
              <Input
                id="signatory-email"
                type="email"
                value={signatoryEmail}
                onChange={(e) => setSignatoryEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Your Signature</Label>
            <SignatureCanvas
              onSignatureChange={(data) => setSignatureData(data || '')}
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Checkbox
              id="gdpr-consent"
              checked={gdprConsent}
              onCheckedChange={(checked) => setGdprConsent(checked === true)}
            />
            <Label htmlFor="gdpr-consent" className="text-sm leading-relaxed cursor-pointer">
              I consent to the processing of my personal data in accordance with GDPR for the purpose of this solar installation project. I understand that my data will be used to arrange surveys, installation, and SEAI grant applications.
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setCurrentStep('preview')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleSignatureComplete} 
          disabled={loading || !signatureData || !gdprConsent}
          className="flex-1"
        >
          {loading ? 'Processing...' : 'Confirm Signature'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderDatesStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Select Installation Dates
          </CardTitle>
          <CardDescription>
            Choose up to 3 preferred installation dates (minimum 3 weeks from today)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <CalendarComponent
              mode="single"
              onSelect={handleDateSelection}
              disabled={(date) => isBefore(date, minDate)}
              className="rounded-md border"
            />
          </div>

          {preferredDates.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Dates:</Label>
              <div className="flex flex-wrap gap-2">
                {preferredDates.map((date, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="px-3 py-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeDate(index)}
                  >
                    {format(date, 'EEE, MMM d, yyyy')}
                    <span className="ml-2">×</span>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click a date to remove it</p>
            </div>
          )}

          {preferredDates.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Please select at least one preferred installation date
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setCurrentStep('signature')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleDatesComplete} 
          disabled={loading || preferredDates.length === 0}
          className="flex-1"
        >
          {loading ? 'Processing...' : 'Continue to Payment'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Schedule
          </CardTitle>
          <CardDescription>
            Choose your preferred payment option
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label 
              className={cn(
                "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors",
                paymentSchedule === 'deposit' && "border-primary bg-primary/5"
              )}
            >
              <input
                type="radio"
                name="payment"
                value="deposit"
                checked={paymentSchedule === 'deposit'}
                onChange={() => setPaymentSchedule('deposit')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Deposit + Balance</div>
                <p className="text-sm text-muted-foreground">
                  Pay €{depositAmount.toLocaleString()} (30%) now, €{balanceAmount.toLocaleString()} on completion
                </p>
              </div>
              <Badge variant="secondary">Recommended</Badge>
            </label>

            <label 
              className={cn(
                "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors",
                paymentSchedule === 'full' && "border-primary bg-primary/5"
              )}
            >
              <input
                type="radio"
                name="payment"
                value="full"
                checked={paymentSchedule === 'full'}
                onChange={() => setPaymentSchedule('full')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Full Payment</div>
                <p className="text-sm text-muted-foreground">
                  Pay €{proposal?.net_cost?.toLocaleString()} in full upfront
                </p>
              </div>
            </label>

            <label 
              className={cn(
                "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors",
                paymentSchedule === 'installments' && "border-primary bg-primary/5"
              )}
            >
              <input
                type="radio"
                name="payment"
                value="installments"
                checked={paymentSchedule === 'installments'}
                onChange={() => setPaymentSchedule('installments')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Monthly Installments</div>
                <p className="text-sm text-muted-foreground">
                  Spread cost over 12-60 months (subject to credit approval)
                </p>
              </div>
            </label>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Total Investment</span>
              <span className="font-bold">€{proposal?.net_cost?.toLocaleString()}</span>
            </div>
            {paymentSchedule === 'deposit' && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Now (30%)</span>
                  <span className="font-medium text-primary">€{depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">On Completion</span>
                  <span>€{balanceAmount.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setCurrentStep('dates')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handlePaymentComplete} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Processing...' : 'Complete Acceptance'}
          <Check className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12 space-y-6"
    >
      <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="h-10 w-10 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Proposal Accepted!</h2>
        <p className="text-muted-foreground">
          Thank you for choosing us for your solar installation.
        </p>
      </div>

      <Card className="text-left max-w-md mx-auto">
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contract Signed</span>
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dates Selected</span>
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice Created</span>
            <Check className="h-4 w-4 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        We'll be in touch within 24 hours to confirm your installation date.
      </p>

      <Button onClick={onBack}>
        Return to Dashboard
      </Button>
    </motion.div>
  );

  // Step indicator
  const steps = [
    { id: 'preview', label: 'Preview' },
    { id: 'signature', label: 'Sign' },
    { id: 'dates', label: 'Dates' },
    { id: 'payment', label: 'Payment' },
    { id: 'complete', label: 'Complete' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Progress Steps */}
      {currentStep !== 'complete' && (
        <div className="flex items-center justify-between mb-8">
          {steps.slice(0, -1).map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                index < currentStepIndex && "bg-green-600 text-white",
                index === currentStepIndex && "bg-primary text-primary-foreground",
                index > currentStepIndex && "bg-muted text-muted-foreground"
              )}>
                {index < currentStepIndex ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {index < steps.length - 2 && (
                <div className={cn(
                  "w-12 sm:w-20 h-1 mx-1",
                  index < currentStepIndex ? "bg-green-600" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'signature' && renderSignatureStep()}
          {currentStep === 'dates' && renderDatesStep()}
          {currentStep === 'payment' && renderPaymentStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
