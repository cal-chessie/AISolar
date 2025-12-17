import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft, Save, FileText, CheckCircle, Zap, Battery, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activityLog';
import EquipmentLibrary from '@/components/equipment/EquipmentLibrary';

interface ProposalQuestionnaireProps {
  leadId: string;
  proposalId?: string;
  initialData?: Record<string, any> | null;
  onBack?: () => void;
}

// When survey data is pre-filled, we skip step 1 (property/energy) since it's already captured
const BASE_STEPS = 15;

export default function ProposalQuestionnaire({ leadId, proposalId, initialData, onBack }: ProposalQuestionnaireProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  
  // Determine if survey data pre-filled key fields (skip step 1 if so)
  const hasPrefilledEnergyData = initialData?._prefilledFromSurvey && 
    initialData?.propertyType && 
    initialData?.annualConsumption;
  
  const TOTAL_STEPS = hasPrefilledEnergyData ? BASE_STEPS - 1 : BASE_STEPS;
  const [currentStep, setCurrentStep] = useState(hasPrefilledEnergyData ? 2 : 1);

  useEffect(() => {
    if (proposalId) {
      loadProposal();
    } else if (initialData) {
      // Pre-fill from survey data
      setFormData(prev => ({ ...prev, ...initialData }));
      if (hasPrefilledEnergyData) {
        toast({
          title: 'Survey data loaded',
          description: 'Property & energy info pre-filled from survey. Starting from roof details.',
        });
      } else {
        toast({
          title: 'Survey data loaded',
          description: 'Form pre-filled with survey information. Review and adjust as needed.',
        });
      }
    }
  }, [proposalId, initialData]);

  const loadProposal = async () => {
    if (!proposalId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          propertyType: data.property_type || 'residential',
          annualConsumption: data.current_annual_consumption_kwh?.toString() || '',
          systemSize: data.system_size_kw?.toString() || '',
          roofType: data.roof_type || '',
          roofMaterial: data.roof_material || '',
          roofOrientation: data.roof_orientation || '',
          roofPitch: data.roof_pitch?.toString() || '',
          roofCondition: data.roof_condition || '',
          shadingLevel: data.shading_level || '',
          batteryStorage: data.battery_storage ? 'yes' : 'no',
          batteryCapacity: data.battery_capacity_kwh?.toString() || '',
          panelType: data.panel_type || '',
          inverterType: data.inverter_type || '',
          currentTariff: '0.35',
          installationNotes: data.installation_notes || '',
          specialRequirements: data.special_requirements || '',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error loading proposal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
      description: `Questionnaire progress saved at step ${currentStep}`,
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
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
      const estimatedProduction = systemSizeKw * 900;
      const monthlySavings = estimatedProduction && currentTariff ? (estimatedProduction * currentTariff) / 12 : null;
      const systemCost = systemSizeKw ? systemSizeKw * 1400 : null;
      
      // Updated SEAI Grant Logic (2024): €1,800 max for domestic systems ≥2kWp
      const propertyType = formData.propertyType || 'residential';
      let seaiGrant = 0;
      let requiresReview = false;
      
      if (propertyType === 'residential') {
        seaiGrant = systemSizeKw >= 2 ? 1800 : Math.round(systemSizeKw * 900);
      } else if (propertyType === 'commercial') {
        if (systemSizeKw < 6) {
          seaiGrant = Math.min(2700, Math.round(systemSizeKw * 900));
        } else if (systemSizeKw <= 50) {
          seaiGrant = 2700 + Math.round((systemSizeKw - 6) * 300);
          seaiGrant = Math.min(16200, seaiGrant);
          requiresReview = systemSizeKw > 20;
        } else {
          seaiGrant = 16200;
          requiresReview = true;
        }
      } else if (propertyType === 'industrial') {
        seaiGrant = 0;
        requiresReview = true;
      }
      
      const netCost = systemCost !== null ? systemCost - seaiGrant : null;
      const annualSavings = monthlySavings !== null ? monthlySavings * 12 : null;
      const paybackYears = netCost !== null && annualSavings ? netCost / annualSavings : null;

      // Calculate panel count based on system size
      const panelCount = Math.ceil(systemSizeKw / 0.4); // Assuming 400W panels

      const proposalData = {
        lead_id: leadId,
        consultant_id: user.id,
        system_size_kw: systemSizeKw || null,
        panel_count: panelCount || null,
        estimated_annual_production_kwh: estimatedProduction || null,
        monthly_savings: monthlySavings || null,
        system_cost: systemCost || null,
        seai_grant: seaiGrant || null,
        net_cost: netCost || null,
        payback_period_years: paybackYears || null,
        property_type: propertyType,
        requires_review: requiresReview,
        roof_type: formData.roofType || null,
        roof_material: formData.roofMaterial || null,
        roof_orientation: formData.roofOrientation || null,
        roof_pitch: formData.roofPitch ? parseFloat(formData.roofPitch) : null,
        roof_condition: formData.roofCondition || null,
        shading_level: formData.shadingLevel || null,
        battery_storage: formData.batteryStorage === 'yes',
        battery_capacity_kwh: formData.batteryCapacity ? parseFloat(formData.batteryCapacity) : null,
        panel_type: formData.panelType || 'Premium Mono PERC',
        inverter_type: formData.inverterType || 'Hybrid',
        current_annual_consumption_kwh: annualConsumption || null,
        installation_notes: formData.installationNotes || formData.customerNotes || null,
        special_requirements: formData.specialRequirements || null,
        installation_timeline_weeks: formData.timeline === 'asap' ? 2 : formData.timeline === '1-3months' ? 6 : 12,
        status: 'draft',
      };

      let error;
      if (proposalId) {
        const result = await supabase
          .from('proposals')
          .update(proposalData)
          .eq('id', proposalId);
        error = result.error;
      } else {
        const result = await supabase
          .from('proposals')
          .insert(proposalData);
        error = result.error;
      }

      if (error) throw error;

      // Log activity
      await logActivity({
        leadId,
        actionType: proposalId ? 'proposal_updated' : 'proposal_created',
        description: `Proposal ${proposalId ? 'updated' : 'created'} - ${systemSizeKw}kW system`,
        metadata: {
          system_size_kw: systemSizeKw,
          net_cost: netCost,
          seai_grant: seaiGrant,
          property_type: propertyType
        }
      });

      toast({
        title: proposalId ? 'Proposal updated' : 'Proposal generated',
        description: `Your proposal has been ${proposalId ? 'updated' : 'created'} successfully.`,
      });

      if (onBack) {
        onBack();
      }
    } catch (error: any) {
      toast({
        title: 'Error saving proposal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if field has prefilled data from survey
  const isFieldPrefilled = (fieldName: string) => {
    return initialData && initialData[fieldName];
  };

  const renderStep = () => {
    switch (currentStep) {
      // Step 1: Property & Energy Overview
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="property-type" className="flex items-center gap-2 mb-2">
                Property Type
                {isFieldPrefilled('propertyType') && <CheckCircle className="h-4 w-4 text-green-500" />}
              </Label>
              <Select 
                value={formData.propertyType || ''} 
                onValueChange={(value) => updateFormData('propertyType', value)}
              >
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

            <div>
              <Label htmlFor="annual-consumption" className="flex items-center gap-2 mb-2">
                Annual Energy Consumption (kWh)
                {isFieldPrefilled('annualConsumption') && <CheckCircle className="h-4 w-4 text-green-500" />}
              </Label>
              <Input
                id="annual-consumption"
                type="number"
                placeholder="Enter annual kWh"
                value={formData.annualConsumption || ''}
                onChange={(e) => updateFormData('annualConsumption', e.target.value)}
              />
              {isFieldPrefilled('annualConsumption') && (
                <p className="text-xs text-green-600 mt-1">Calculated from monthly bill</p>
              )}
            </div>

            <div>
              <Label htmlFor="current-tariff" className="mb-2 block">Current Electricity Tariff (€/kWh)</Label>
              <Input
                id="current-tariff"
                type="number"
                step="0.01"
                placeholder="0.35"
                value={formData.currentTariff || ''}
                onChange={(e) => updateFormData('currentTariff', e.target.value)}
              />
            </div>
          </div>
        );

      // Step 2: Roof Details (consolidated)
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  Roof Type
                  {isFieldPrefilled('roofType') && <CheckCircle className="h-4 w-4 text-green-500" />}
                </Label>
                <Select 
                  value={formData.roofType || ''} 
                  onValueChange={(value) => updateFormData('roofType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select roof type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pitched">Pitched</SelectItem>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  Roof Material
                  {isFieldPrefilled('roofMaterial') && <CheckCircle className="h-4 w-4 text-green-500" />}
                </Label>
                <Select 
                  value={formData.roofMaterial || ''} 
                  onValueChange={(value) => updateFormData('roofMaterial', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Concrete tiles">Concrete tiles</SelectItem>
                    <SelectItem value="Clay tiles">Clay tiles</SelectItem>
                    <SelectItem value="Slate">Slate</SelectItem>
                    <SelectItem value="Metal">Metal</SelectItem>
                    <SelectItem value="Felt/Membrane">Felt/Membrane</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  Roof Orientation
                  {isFieldPrefilled('roofOrientation') && <CheckCircle className="h-4 w-4 text-green-500" />}
                </Label>
                <Select 
                  value={formData.roofOrientation || ''} 
                  onValueChange={(value) => updateFormData('roofOrientation', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select orientation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="South-East">South-East</SelectItem>
                    <SelectItem value="South-West">South-West</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                    <SelectItem value="North">North</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  Roof Condition
                  {isFieldPrefilled('roofCondition') && <CheckCircle className="h-4 w-4 text-green-500" />}
                </Label>
                <Select 
                  value={formData.roofCondition || ''} 
                  onValueChange={(value) => updateFormData('roofCondition', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="roof-pitch" className="mb-2 block">Roof Pitch (degrees)</Label>
              <Input
                id="roof-pitch"
                type="number"
                placeholder="Enter roof pitch"
                value={formData.roofPitch || ''}
                onChange={(e) => updateFormData('roofPitch', e.target.value)}
              />
            </div>
          </div>
        );

      // Step 3: Shading Analysis
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                Shading Analysis
                {isFieldPrefilled('shadingLevel') && <CheckCircle className="h-4 w-4 text-green-500" />}
              </Label>
              <RadioGroup 
                value={formData.shadingAnalysis || formData.shadingLevel || ''} 
                onValueChange={(value) => updateFormData('shadingAnalysis', value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="None" id="shading-none" />
                  <Label htmlFor="shading-none" className="cursor-pointer flex-1">
                    <span className="font-medium">No shading</span>
                    <p className="text-xs text-muted-foreground">Optimal solar production</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="Minimal" id="shading-minimal" />
                  <Label htmlFor="shading-minimal" className="cursor-pointer flex-1">
                    <span className="font-medium">Minimal shading</span>
                    <p className="text-xs text-muted-foreground">Early morning/late evening only</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="Partial" id="shading-moderate" />
                  <Label htmlFor="shading-moderate" className="cursor-pointer flex-1">
                    <span className="font-medium">Moderate shading</span>
                    <p className="text-xs text-muted-foreground">Some hours affected</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="Significant" id="shading-significant" />
                  <Label htmlFor="shading-significant" className="cursor-pointer flex-1">
                    <span className="font-medium">Significant shading</span>
                    <p className="text-xs text-muted-foreground">May affect system sizing</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      // Step 4: System Size & Design
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="system-size" className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                System Size (kW)
                {isFieldPrefilled('systemSize') && <CheckCircle className="h-4 w-4 text-green-500" />}
              </Label>
              <Input
                id="system-size"
                type="number"
                step="0.1"
                placeholder="Enter system size"
                value={formData.systemSize || ''}
                onChange={(e) => updateFormData('systemSize', e.target.value)}
              />
              {isFieldPrefilled('systemSize') && (
                <p className="text-xs text-green-600 mt-1">Recommended from survey assessment</p>
              )}
            </div>

            <div>
              <Label htmlFor="peak-usage" className="mb-2 block">Peak Usage Time</Label>
              <Select 
                value={formData.peakUsage || ''} 
                onValueChange={(value) => updateFormData('peakUsage', value)}
              >
                <SelectTrigger id="peak-usage">
                  <SelectValue placeholder="When do you use the most electricity?" />
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

      // Step 5: Battery Storage
      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Battery className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <Label className="text-base font-semibold">Battery Storage</Label>
                <p className="text-sm text-muted-foreground">Store excess energy for use at night</p>
              </div>
              <Switch
                checked={formData.batteryStorage === 'yes'}
                onCheckedChange={(checked) => updateFormData('batteryStorage', checked ? 'yes' : 'no')}
              />
            </div>

            {formData.batteryStorage === 'yes' && (
              <div className="space-y-4 animate-in fade-in-50">
                <div>
                  <Label htmlFor="battery-capacity" className="mb-2 block">Battery Capacity (kWh)</Label>
                  <Select 
                    value={formData.batteryCapacity || ''} 
                    onValueChange={(value) => updateFormData('batteryCapacity', value)}
                  >
                    <SelectTrigger id="battery-capacity">
                      <SelectValue placeholder="Select capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 kWh (Small home)</SelectItem>
                      <SelectItem value="10">10 kWh (Average home)</SelectItem>
                      <SelectItem value="13.5">13.5 kWh (Large home)</SelectItem>
                      <SelectItem value="20">20+ kWh (High consumption)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        );

      // Step 6: Equipment Selection - Using Equipment Library
      case 6:
        const systemSize = parseFloat(formData.systemSize || '5');
        return (
          <div className="space-y-4">
            <EquipmentLibrary
              selectedPanel={formData.selectedPanelId}
              selectedInverter={formData.selectedInverterId}
              selectedBattery={formData.selectedBatteryId}
              onSelectPanel={(product) => {
                updateFormData('selectedPanelId', product?.id);
                updateFormData('panelType', product ? `${product.manufacturer} ${product.model}` : '');
              }}
              onSelectInverter={(product) => {
                updateFormData('selectedInverterId', product?.id);
                updateFormData('inverterType', product ? `${product.manufacturer} ${product.model}` : '');
              }}
              onSelectBattery={(product) => {
                updateFormData('selectedBatteryId', product?.id || null);
                if (product) {
                  updateFormData('batteryStorage', 'yes');
                }
              }}
              systemSizeKw={systemSize}
            />
            <p className="text-xs text-muted-foreground text-center mt-4">
              Select equipment to include in your proposal. Pricing will update automatically.
            </p>
          </div>
        );

      // Step 7: Budget & Financing
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="budget" className="mb-2 block">Budget Range (€)</Label>
              <Select 
                value={formData.budget || ''} 
                onValueChange={(value) => updateFormData('budget', value)}
              >
                <SelectTrigger id="budget">
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5000-8000">€5,000 - €8,000</SelectItem>
                  <SelectItem value="8000-12000">€8,000 - €12,000</SelectItem>
                  <SelectItem value="12000-15000">€12,000 - €15,000</SelectItem>
                  <SelectItem value="15000+">€15,000+</SelectItem>
                  <SelectItem value="flexible">Flexible - focus on best value</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="financing" className="mb-2 block">Payment Preference</Label>
              <RadioGroup 
                value={formData.financing || ''} 
                onValueChange={(value) => updateFormData('financing', value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="cash" id="financing-cash" />
                  <Label htmlFor="financing-cash" className="cursor-pointer flex-1">
                    <span className="font-medium">Full payment upfront</span>
                    <p className="text-xs text-muted-foreground">Best value - no interest</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="loan" id="financing-loan" />
                  <Label htmlFor="financing-loan" className="cursor-pointer flex-1">
                    <span className="font-medium">Solar loan</span>
                    <p className="text-xs text-muted-foreground">Fixed monthly payments</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="deposit" id="financing-deposit" />
                  <Label htmlFor="financing-deposit" className="cursor-pointer flex-1">
                    <span className="font-medium">Deposit + balance</span>
                    <p className="text-xs text-muted-foreground">Pay deposit now, balance on completion</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      // Step 8: Timeline
      case 8:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">When would you like installation?</Label>
              <RadioGroup 
                value={formData.timeline || ''} 
                onValueChange={(value) => updateFormData('timeline', value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="asap" id="timeline-asap" />
                  <Label htmlFor="timeline-asap" className="cursor-pointer flex-1">
                    <span className="font-medium">As soon as possible</span>
                    <p className="text-xs text-muted-foreground">Usually 2-4 weeks</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="1-3months" id="timeline-1-3" />
                  <Label htmlFor="timeline-1-3" className="cursor-pointer flex-1">
                    <span className="font-medium">1-3 months</span>
                    <p className="text-xs text-muted-foreground">Planning ahead</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="3-6months" id="timeline-3-6" />
                  <Label htmlFor="timeline-3-6" className="cursor-pointer flex-1">
                    <span className="font-medium">3-6 months</span>
                    <p className="text-xs text-muted-foreground">Flexible timing</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="exploring" id="timeline-exploring" />
                  <Label htmlFor="timeline-exploring" className="cursor-pointer flex-1">
                    <span className="font-medium">Just exploring options</span>
                    <p className="text-xs text-muted-foreground">Gathering information</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      // Step 9: Additional Features (EV, Smart Home)
      case 9:
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Select any additional features you're interested in:</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">EV Charger</Label>
                  <p className="text-xs text-muted-foreground">Add electric vehicle charging capability</p>
                </div>
                <Switch
                  checked={formData.evCharger === 'yes'}
                  onCheckedChange={(checked) => updateFormData('evCharger', checked ? 'yes' : 'no')}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">Smart Home Integration</Label>
                  <p className="text-xs text-muted-foreground">Connect to home automation systems</p>
                </div>
                <Switch
                  checked={formData.smartHome === 'yes'}
                  onCheckedChange={(checked) => updateFormData('smartHome', checked ? 'yes' : 'no')}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">Monitoring App</Label>
                  <p className="text-xs text-muted-foreground">Track production on your phone</p>
                </div>
                <Switch
                  checked={formData.monitoring !== 'no'}
                  onCheckedChange={(checked) => updateFormData('monitoring', checked ? 'yes' : 'no')}
                  defaultChecked
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">Extended Warranty</Label>
                  <p className="text-xs text-muted-foreground">Additional coverage beyond standard</p>
                </div>
                <Switch
                  checked={formData.extendedWarranty === 'yes'}
                  onCheckedChange={(checked) => updateFormData('extendedWarranty', checked ? 'yes' : 'no')}
                />
              </div>
            </div>
          </div>
        );

      // Step 10: Environmental Goals
      case 10:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">What matters most to you?</Label>
              <RadioGroup 
                value={formData.primaryGoal || ''} 
                onValueChange={(value) => updateFormData('primaryGoal', value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="savings" id="goal-savings" />
                  <Label htmlFor="goal-savings" className="cursor-pointer flex-1">
                    <span className="font-medium">Maximum savings</span>
                    <p className="text-xs text-muted-foreground">Reduce electricity bills as much as possible</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="independence" id="goal-independence" />
                  <Label htmlFor="goal-independence" className="cursor-pointer flex-1">
                    <span className="font-medium">Energy independence</span>
                    <p className="text-xs text-muted-foreground">Reduce reliance on the grid</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="environment" id="goal-environment" />
                  <Label htmlFor="goal-environment" className="cursor-pointer flex-1">
                    <span className="font-medium">Environmental impact</span>
                    <p className="text-xs text-muted-foreground">Reduce carbon footprint</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="property" id="goal-property" />
                  <Label htmlFor="goal-property" className="cursor-pointer flex-1">
                    <span className="font-medium">Property value</span>
                    <p className="text-xs text-muted-foreground">Increase home value with green upgrade</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      // Step 11: Concerns & Questions for Customer (NEW CONSOLIDATED)
      case 11:
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Customer Questions & Concerns</h3>
              <p className="text-sm text-muted-foreground">Capture anything the customer wants to discuss</p>
            </div>

            <div>
              <Label className="mb-2 block">Main concerns or hesitations?</Label>
              <div className="space-y-2">
                {['Cost/affordability', 'Roof suitability', 'How it looks', 'Reliability', 'Payback time', 'Installation disruption'].map((concern) => (
                  <div key={concern} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`concern-${concern}`}
                      checked={(formData.concerns || []).includes(concern)}
                      onChange={(e) => {
                        const current = formData.concerns || [];
                        if (e.target.checked) {
                          updateFormData('concerns', [...current, concern]);
                        } else {
                          updateFormData('concerns', current.filter((c: string) => c !== concern));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`concern-${concern}`} className="cursor-pointer">{concern}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="customer-questions" className="mb-2 block">Questions to address in proposal</Label>
              <Textarea
                id="customer-questions"
                placeholder="Any specific questions the customer asked..."
                value={formData.customerQuestions || ''}
                onChange={(e) => updateFormData('customerQuestions', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      // Step 12: Special Requirements (from survey if available)
      case 12:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="special-requirements" className="flex items-center gap-2 mb-2">
                Special Requirements
                {isFieldPrefilled('specialRequirements') && <CheckCircle className="h-4 w-4 text-green-500" />}
              </Label>
              <Textarea
                id="special-requirements"
                placeholder="Planning permission, HOA restrictions, specific installation requirements..."
                value={formData.specialRequirements || ''}
                onChange={(e) => updateFormData('specialRequirements', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="installation-notes" className="flex items-center gap-2 mb-2">
                Installation Notes
                {isFieldPrefilled('installationNotes') && <CheckCircle className="h-4 w-4 text-green-500" />}
              </Label>
              <Textarea
                id="installation-notes"
                placeholder="Access issues, scaffolding needs, date preferences..."
                value={formData.installationNotes || ''}
                onChange={(e) => updateFormData('installationNotes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      // Step 13: Consultant Notes (internal)
      case 13:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Internal Notes</h3>
              <p className="text-sm text-blue-700">These notes are for internal use and won't appear on the customer proposal.</p>
            </div>

            <div>
              <Label htmlFor="consultant-notes" className="mb-2 block">Consultant Assessment</Label>
              <Textarea
                id="consultant-notes"
                placeholder="Your assessment of this lead, recommended approach, follow-up actions..."
                value={formData.consultantNotes || ''}
                onChange={(e) => updateFormData('consultantNotes', e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="follow-up" className="mb-2 block">Recommended Follow-up</Label>
              <Select 
                value={formData.followUp || ''} 
                onValueChange={(value) => updateFormData('followUp', value)}
              >
                <SelectTrigger id="follow-up">
                  <SelectValue placeholder="Select follow-up action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call_tomorrow">Call tomorrow</SelectItem>
                  <SelectItem value="email_proposal">Email proposal today</SelectItem>
                  <SelectItem value="schedule_survey">Schedule site survey</SelectItem>
                  <SelectItem value="wait_callback">Wait for customer callback</SelectItem>
                  <SelectItem value="not_interested">Not interested - close</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      // Step 14: Summary Review
      case 14:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Proposal Summary</h3>
            
            <div className="grid gap-3">
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Property Type</span>
                <span className="font-medium">{formData.propertyType || 'Not set'}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">System Size</span>
                <span className="font-medium">{formData.systemSize || 'Auto-calculated'} kW</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Battery Storage</span>
                <span className="font-medium">{formData.batteryStorage === 'yes' ? `Yes (${formData.batteryCapacity} kWh)` : 'No'}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Panel Type</span>
                <span className="font-medium">{formData.panelType || 'Premium Mono PERC'}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Inverter Type</span>
                <span className="font-medium">{formData.inverterType || 'Hybrid'}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Timeline</span>
                <span className="font-medium">{formData.timeline || 'Not set'}</span>
              </div>
            </div>

            {initialData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <p className="text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Survey data was automatically loaded - review above for accuracy
                </p>
              </div>
            )}
          </div>
        );

      // Step 15: Final Generate
      case 15:
        return (
          <div className="space-y-4 text-center">
            <FileText className="mx-auto h-16 w-16 text-primary" />
            <h3 className="text-xl font-bold">Ready to Generate Proposal</h3>
            <p className="text-muted-foreground">
              Click "Generate Proposal" to create a detailed solar system proposal with pricing, savings calculations, and equipment specifications.
            </p>
            {initialData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <p className="text-green-700 text-sm flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Pre-filled with survey data - no double entry needed!
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const titles: { [key: number]: string } = {
      1: 'Property & Energy',
      2: 'Roof Details',
      3: 'Shading Analysis',
      4: 'System Design',
      5: 'Battery Storage',
      6: 'Equipment Package',
      7: 'Budget & Financing',
      8: 'Installation Timeline',
      9: 'Additional Features',
      10: 'Your Goals',
      11: 'Customer Questions',
      12: 'Special Requirements',
      13: 'Internal Notes',
      14: 'Review Summary',
      15: 'Generate Proposal',
    };
    return titles[currentStep] || `Step ${currentStep}`;
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Progress Bar - Sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-4 -mx-4 px-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Step {currentStep} of {TOTAL_STEPS}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round((currentStep / TOTAL_STEPS) * 100)}% complete
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {getStepTitle()}
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                Cancel
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            {currentStep === TOTAL_STEPS 
              ? 'Final step - generate your proposal' 
              : 'Please provide the following information'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      {/* Fixed Navigation at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border z-50">
        <div className="max-w-2xl mx-auto flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="gap-2 flex-1 sm:flex-none"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="flex gap-2 flex-1 sm:flex-none">
            <Button variant="outline" onClick={handleSave} className="gap-2">
              <Save size={18} />
              <span className="hidden sm:inline">Save</span>
            </Button>

            {currentStep === TOTAL_STEPS ? (
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="gap-2 flex-1 sm:flex-none"
              >
                <FileText size={18} />
                {loading ? 'Generating...' : 'Generate Proposal'}
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2 flex-1 sm:flex-none">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={18} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
