import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft, Save, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProposalQuestionnaireProps {
  leadId: string;
  onBack?: () => void;
}

const TOTAL_STEPS = 26;

export default function ProposalQuestionnaire({ leadId, onBack }: ProposalQuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const updateFormData = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSave = () => {
    toast({
      title: 'Progress saved',
      description: `Questionnaire progress saved for step ${currentStep}`,
    });
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Not signed in',
          description: 'Please log in again to create a proposal.',
          variant: 'destructive',
        });
        return;
      }

      const annualConsumption = parseFloat(formData.annualConsumption || '0');
      const currentTariff = parseFloat(formData.currentTariff || '0.35');
      const systemSizeKw = parseFloat(formData.systemSize || (annualConsumption ? (annualConsumption / 900).toFixed(1) : '0'));
      const estimatedProduction = systemSizeKw * 900; // kWh/year
      const monthlySavings = estimatedProduction && currentTariff ? (estimatedProduction * currentTariff) / 12 : null;
      const systemCost = systemSizeKw ? systemSizeKw * 1500 : null;
      const seaiGrant = systemSizeKw ? Math.min(2400, systemSizeKw * 900) : null;
      const netCost = systemCost !== null && seaiGrant !== null ? systemCost - seaiGrant : null;
      const annualSavings = monthlySavings !== null ? monthlySavings * 12 : null;
      const paybackYears = netCost !== null && annualSavings ? netCost / annualSavings : null;

      const { error } = await supabase.from('proposals').insert({
        lead_id: leadId,
        consultant_id: user.id,
        system_size_kw: systemSizeKw || null,
        estimated_annual_production_kwh: estimatedProduction || null,
        monthly_savings: monthlySavings || null,
        system_cost: systemCost || null,
        seai_grant: seaiGrant || null,
        net_cost: netCost || null,
        payback_period_years: paybackYears || null,
        roof_type: formData.roofType || null,
        roof_material: formData.roofMaterial || null,
        status: 'draft',
      });

      if (error) throw error;

      toast({
        title: 'Proposal generated',
        description: 'Your proposal has been created successfully.',
      });

      if (onBack) {
        onBack();
      }
    } catch (error: any) {
      toast({
        title: 'Error generating proposal',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="property-type">Property Type</Label>
              <Select onValueChange={(value) => updateFormData('propertyType', value)}>
                <SelectTrigger id="property-type">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="roof-type">Roof Type</Label>
              <Select onValueChange={(value) => updateFormData('roofType', value)}>
                <SelectTrigger id="roof-type">
                  <SelectValue placeholder="Select roof type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pitched">Pitched</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="roof-material">Roof Material</Label>
              <Select onValueChange={(value) => updateFormData('roofMaterial', value)}>
                <SelectTrigger id="roof-material">
                  <SelectValue placeholder="Select roof material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiles">Tiles</SelectItem>
                  <SelectItem value="slate">Slate</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="roof-age">Roof Age (years)</Label>
              <Input
                id="roof-age"
                type="number"
                placeholder="Enter roof age"
                value={formData.roofAge || ''}
                onChange={(e) => updateFormData('roofAge', e.target.value)}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label>Shading Analysis</Label>
              <RadioGroup onValueChange={(value) => updateFormData('shadingAnalysis', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="shading-none" />
                  <Label htmlFor="shading-none">No shading</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="minimal" id="shading-minimal" />
                  <Label htmlFor="shading-minimal">Minimal shading</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate" id="shading-moderate" />
                  <Label htmlFor="shading-moderate">Moderate shading</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="significant" id="shading-significant" />
                  <Label htmlFor="shading-significant">Significant shading</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="annual-consumption">Annual Energy Consumption (kWh)</Label>
              <Input
                id="annual-consumption"
                type="number"
                placeholder="Enter annual kWh"
                value={formData.annualConsumption || ''}
                onChange={(e) => updateFormData('annualConsumption', e.target.value)}
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="peak-usage">Peak Usage Time</Label>
              <Select onValueChange={(value) => updateFormData('peakUsage', value)}>
                <SelectTrigger id="peak-usage">
                  <SelectValue placeholder="Select peak usage time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (6am-12pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12pm-6pm)</SelectItem>
                  <SelectItem value="evening">Evening (6pm-12am)</SelectItem>
                  <SelectItem value="night">Night (12am-6am)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-tariff">Current Electricity Tariff (€/kWh)</Label>
              <Input
                id="current-tariff"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.currentTariff || ''}
                onChange={(e) => updateFormData('currentTariff', e.target.value)}
              />
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <div>
              <Label>Battery Storage Interest</Label>
              <RadioGroup onValueChange={(value) => updateFormData('batteryInterest', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="battery-yes" />
                  <Label htmlFor="battery-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="battery-no" />
                  <Label htmlFor="battery-no">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maybe" id="battery-maybe" />
                  <Label htmlFor="battery-maybe">Maybe later</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="system-size">Desired System Size (kW)</Label>
              <Input
                id="system-size"
                type="number"
                step="0.1"
                placeholder="Enter system size"
                value={formData.systemSize || ''}
                onChange={(e) => updateFormData('systemSize', e.target.value)}
              />
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="panel-preference">Panel Brand Preference</Label>
              <Select onValueChange={(value) => updateFormData('panelPreference', value)}>
                <SelectTrigger id="panel-preference">
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium brands</SelectItem>
                  <SelectItem value="mid">Mid-range brands</SelectItem>
                  <SelectItem value="budget">Budget friendly</SelectItem>
                  <SelectItem value="no-preference">No preference</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 12:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="inverter-type">Inverter Type Preference</Label>
              <Select onValueChange={(value) => updateFormData('inverterType', value)}>
                <SelectTrigger id="inverter-type">
                  <SelectValue placeholder="Select inverter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String inverter</SelectItem>
                  <SelectItem value="micro">Micro inverters</SelectItem>
                  <SelectItem value="hybrid">Hybrid inverter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 13:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget">Budget Range (€)</Label>
              <Select onValueChange={(value) => updateFormData('budget', value)}>
                <SelectTrigger id="budget">
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5000-8000">€5,000 - €8,000</SelectItem>
                  <SelectItem value="8000-12000">€8,000 - €12,000</SelectItem>
                  <SelectItem value="12000-15000">€12,000 - €15,000</SelectItem>
                  <SelectItem value="15000+">€15,000+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 14:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="financing">Financing Option</Label>
              <Select onValueChange={(value) => updateFormData('financing', value)}>
                <SelectTrigger id="financing">
                  <SelectValue placeholder="Select financing option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Full payment upfront</SelectItem>
                  <SelectItem value="loan">Solar loan</SelectItem>
                  <SelectItem value="lease">Lease option</SelectItem>
                  <SelectItem value="ppa">Power Purchase Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 15:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="installation-timeline">Preferred Installation Timeline</Label>
              <Select onValueChange={(value) => updateFormData('timeline', value)}>
                <SelectTrigger id="installation-timeline">
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asap">As soon as possible</SelectItem>
                  <SelectItem value="1-3months">1-3 months</SelectItem>
                  <SelectItem value="3-6months">3-6 months</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 16:
        return (
          <div className="space-y-4">
            <div>
              <Label>EV Charger Interest</Label>
              <RadioGroup onValueChange={(value) => updateFormData('evCharger', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="ev-yes" />
                  <Label htmlFor="ev-yes">Yes, include in proposal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="ev-no" />
                  <Label htmlFor="ev-no">No, not interested</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="future" id="ev-future" />
                  <Label htmlFor="ev-future">Interested for future</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 17:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="monitoring">System Monitoring Preference</Label>
              <Select onValueChange={(value) => updateFormData('monitoring', value)}>
                <SelectTrigger id="monitoring">
                  <SelectValue placeholder="Select monitoring option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic monitoring</SelectItem>
                  <SelectItem value="advanced">Advanced monitoring & analytics</SelectItem>
                  <SelectItem value="premium">Premium with AI insights</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 18:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="warranty">Warranty Preference</Label>
              <Select onValueChange={(value) => updateFormData('warranty', value)}>
                <SelectTrigger id="warranty">
                  <SelectValue placeholder="Select warranty period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 years</SelectItem>
                  <SelectItem value="15">15 years</SelectItem>
                  <SelectItem value="20">20 years</SelectItem>
                  <SelectItem value="25">25 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 19:
        return (
          <div className="space-y-4">
            <div>
              <Label>Grid Connection Status</Label>
              <RadioGroup onValueChange={(value) => updateFormData('gridConnection', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="grid-existing" />
                  <Label htmlFor="grid-existing">Existing grid connection</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upgrade" id="grid-upgrade" />
                  <Label htmlFor="grid-upgrade">Needs upgrade</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="grid-new" />
                  <Label htmlFor="grid-new">New connection required</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 20:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="electrical-panel">Electrical Panel Capacity (Amps)</Label>
              <Input
                id="electrical-panel"
                type="number"
                placeholder="Enter panel capacity"
                value={formData.panelCapacity || ''}
                onChange={(e) => updateFormData('panelCapacity', e.target.value)}
              />
            </div>
          </div>
        );

      case 21:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="special-requirements">Special Requirements or Concerns</Label>
              <Textarea
                id="special-requirements"
                placeholder="Any special requirements, HOA restrictions, or concerns..."
                value={formData.specialRequirements || ''}
                onChange={(e) => updateFormData('specialRequirements', e.target.value)}
                rows={4}
              />
            </div>
          </div>
        );

      case 22:
        return (
          <div className="space-y-4">
            <div>
              <Label>Interested in Government Grants</Label>
              <RadioGroup onValueChange={(value) => updateFormData('grants', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="grants-yes" />
                  <Label htmlFor="grants-yes">Yes, help me apply</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="grants-no" />
                  <Label htmlFor="grants-no">No, not interested</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="info" id="grants-info" />
                  <Label htmlFor="grants-info">Need more information</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 23:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="future-expansion">Future Expansion Plans</Label>
              <Select onValueChange={(value) => updateFormData('expansion', value)}>
                <SelectTrigger id="future-expansion">
                  <SelectValue placeholder="Select expansion plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No expansion planned</SelectItem>
                  <SelectItem value="battery">Add battery later</SelectItem>
                  <SelectItem value="panels">Add more panels</SelectItem>
                  <SelectItem value="both">Both battery and panels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 24:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="maintenance">Maintenance Service Preference</Label>
              <Select onValueChange={(value) => updateFormData('maintenance', value)}>
                <SelectTrigger id="maintenance">
                  <SelectValue placeholder="Select maintenance option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Self-maintenance</SelectItem>
                  <SelectItem value="annual">Annual service plan</SelectItem>
                  <SelectItem value="biannual">Bi-annual service plan</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 25:
        return (
          <div className="space-y-4">
            <div>
              <Label>Primary Motivation</Label>
              <RadioGroup onValueChange={(value) => updateFormData('motivation', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="savings" id="motivation-savings" />
                  <Label htmlFor="motivation-savings">Cost savings</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="environment" id="motivation-environment" />
                  <Label htmlFor="motivation-environment">Environmental impact</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="independence" id="motivation-independence" />
                  <Label htmlFor="motivation-independence">Energy independence</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="value" id="motivation-value" />
                  <Label htmlFor="motivation-value">Property value increase</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 26:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="additional-notes">Additional Notes or Questions</Label>
              <Textarea
                id="additional-notes"
                placeholder="Any additional information or questions you'd like to include..."
                value={formData.additionalNotes || ''}
                onChange={(e) => updateFormData('additionalNotes', e.target.value)}
                rows={5}
              />
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                🎉 Questionnaire Complete! Review your answers and generate the proposal.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const titles = [
      'Property Information',
      'Roof Type',
      'Roof Material',
      'Roof Age',
      'Shading Analysis',
      'Energy Consumption',
      'Peak Usage',
      'Current Tariff',
      'Battery Storage',
      'System Size',
      'Panel Preference',
      'Inverter Type',
      'Budget',
      'Financing',
      'Installation Timeline',
      'EV Charger',
      'System Monitoring',
      'Warranty',
      'Grid Connection',
      'Electrical Panel',
      'Special Requirements',
      'Government Grants',
      'Future Expansion',
      'Maintenance',
      'Primary Motivation',
      'Final Notes'
    ];
    return titles[currentStep - 1];
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Step {currentStep} of {TOTAL_STEPS}</span>
          <span className="text-muted-foreground">{Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {getStepTitle()}
          </CardTitle>
          <CardDescription>
            Step {currentStep} of {TOTAL_STEPS}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[200px]">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Progress
          </Button>
        </div>

        {currentStep < TOTAL_STEPS ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            Generate Proposal
            <FileText className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
