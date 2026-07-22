import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle, FileText, ArrowRight, Info, MapPin } from 'lucide-react';
import { validateSurveyCompletion, mapSurveyToProposal, calculateSurveyStatus } from '@/lib/surveyValidation';
import SurveyStepProgress, { SURVEY_STEPS, SurveyStepNavigation } from '@/components/survey/SurveyStepProgress';
import GuidedPhotoCapture from '@/components/survey/GuidedPhotoCapture';
import EircodeAddressLookup from '@/components/address/EircodeAddressLookup';
import { logActivity } from '@/lib/activityLog';
import { sendStageChangeNotification } from '@/lib/stageNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const surveySchema = z.object({
  // Property & energy info (key fields for proposals)
  property_type: z.string().optional().default('residential'),
  annual_consumption_kwh: z.string().optional(),
  current_tariff: z.string().optional(),
  // Customer goals (moved to top)
  battery_storage: z.boolean().optional(),
  hot_water_diverter: z.boolean().optional(),
  ev_charger: z.boolean().optional(),
  customer_priorities: z.string().optional(),
  // Roof details
  roof_type: z.string().min(1, 'Roof type is required'),
  roof_condition: z.string().min(1, 'Roof condition is required'),
  roof_orientation: z.string().optional(),
  roof_pitch: z.string().optional(),
  roof_material: z.string().optional(),
  // Environmental
  shading_analysis: z.string().optional(),
  nearby_obstructions: z.string().optional(),
  // Electrical
  electrical_panel_capacity: z.string().optional(),
  meter_location: z.string().optional(),
  grid_connection_type: z.string().optional(),
  // System recommendations
  recommended_system_size: z.string().optional(),
  recommended_panel_count: z.string().optional(),
  // Installation & logistics (merged)
  property_storeys: z.string().optional(),
  scaffolding_required: z.string().optional(),
  parking_situation: z.string().optional(),
  attic_access: z.string().optional(),
  access_notes: z.string().optional(),
  customer_availability: z.string().optional(),
  existing_solar: z.boolean().optional(),
  installation_notes: z.string().optional(),
  special_requirements: z.string().optional(),
  status: z.string().default('draft'),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SiteSurveyFormProps {
  leadId: string;
  onCreateProposal?: (surveyData: any, leadData: any) => void;
}

export default function SiteSurveyForm({ leadId, onCreateProposal }: SiteSurveyFormProps) {
  const [loading, setLoading] = useState(false);
  const [existingSurvey, setExistingSurvey] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ url: string; type: string; description: string }>>([]);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Ref for scrolling to survey top
  const surveyContainerRef = useRef<HTMLDivElement>(null);
  
  // Swipe gesture state
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const minSwipeDistance = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    
    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0 && currentStep < SURVEY_STEPS.length) {
        // Swipe left = next step
        setCurrentStep(prev => prev + 1);
      } else if (swipeDistance < 0 && currentStep > 1) {
        // Swipe right = previous step
        setCurrentStep(prev => prev - 1);
      }
    }
    
    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  }, [currentStep]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      status: 'draft',
      property_type: 'residential',
      current_tariff: '0.35',
      existing_solar: false,
      battery_storage: false,
      hot_water_diverter: false,
      ev_charger: false,
    },
  });

  const formValues = watch();

  // Calculate completion status
  const completionStatus = validateSurveyCompletion(formValues, uploadedPhotos.length);

  const getCompletedSteps = () => {
    const completed: string[] = [];
    // Customer info is always "complete" since it comes from lead data
    if (leadData?.name && leadData?.email) completed.push('customer');
    // Goals complete if property type set and consumption entered
    if (formValues.property_type && formValues.annual_consumption_kwh) {
      completed.push('goals');
    }
    if (completionStatus.sections.roof.complete) completed.push('roof');
    if (formValues.shading_analysis) completed.push('environmental');
    if (completionStatus.sections.electrical.complete) completed.push('electrical');
    if (formValues.property_storeys || formValues.scaffolding_required) completed.push('installation');
    if (completionStatus.sections.photos.complete) completed.push('photos');
    return completed;
  };

  useEffect(() => {
    fetchExistingSurvey();
  }, [leadId]);

  // Scroll to survey top when step changes
  useEffect(() => {
    if (surveyContainerRef.current) {
      surveyContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep]);

  const fetchExistingSurvey = async () => {
    try {
      // Fetch lead data
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (lead) {
        setLeadData(lead);
      }

      const { data, error } = await supabase
        .from('site_surveys')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setExistingSurvey(data);
        // Populate form with existing data
        Object.keys(data).forEach((key) => {
          if (data[key] !== null && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
            if (['existing_solar', 'battery_storage', 'hot_water_diverter', 'ev_charger'].includes(key)) {
              setValue(key as any, Boolean(data[key]));
            } else {
              setValue(key as any, String(data[key]));
            }
          }
        });

        // Load existing photos
        const { data: photos } = await supabase
          .from('survey_photos')
          .select('*')
          .eq('survey_id', data.id);
        
        if (photos) {
          setUploadedPhotos(photos.map(p => ({
            url: p.photo_url,
            type: p.photo_type || 'other',
            description: p.description || '',
          })));
        }
      }
    } catch (error: any) {
      console.error('Error fetching survey:', error);
      toast({
        title: 'Error',
        description: 'Failed to load existing survey data',
        variant: 'destructive',
      });
    } finally {
      setFetchingData(false);
    }
  };

  const onSubmit = async (data: SurveyFormData, shouldComplete: boolean = false) => {
    if (shouldComplete && !completionStatus.isComplete) {
      toast({
        title: 'Cannot Complete Survey',
        description: `Please fill in all required fields: ${completionStatus.missingFields.slice(0, 3).join(', ')}${completionStatus.missingFields.length > 3 ? '...' : ''}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const autoStatus = calculateSurveyStatus(data, uploadedPhotos.length);
      const finalStatus = shouldComplete ? 'completed' : autoStatus;

      const surveyData = {
        lead_id: leadId,
        surveyor_id: user.id,
        roof_type: data.roof_type,
        roof_condition: data.roof_condition,
        roof_orientation: data.roof_orientation || null,
        roof_pitch: data.roof_pitch ? parseFloat(data.roof_pitch) : null,
        roof_material: data.roof_material || null,
        shading_analysis: data.shading_analysis || null,
        nearby_obstructions: data.nearby_obstructions || null,
        electrical_panel_capacity: data.electrical_panel_capacity || null,
        meter_location: data.meter_location || null,
        grid_connection_type: data.grid_connection_type || null,
        recommended_system_size: data.recommended_system_size ? parseFloat(data.recommended_system_size) : null,
        recommended_panel_count: data.recommended_panel_count ? parseInt(data.recommended_panel_count) : null,
        installation_notes: data.installation_notes || null,
        special_requirements: data.special_requirements || null,
        status: finalStatus,
        completed_at: finalStatus === 'completed' ? new Date().toISOString() : null,
        property_storeys: data.property_storeys ? parseInt(data.property_storeys) : null,
        scaffolding_required: data.scaffolding_required || null,
        parking_situation: data.parking_situation || null,
        attic_access: data.attic_access || null,
        access_notes: data.access_notes || null,
        customer_availability: data.customer_availability || null,
        existing_solar: data.existing_solar || false,
      };

      let surveyId;
      if (existingSurvey) {
        const { error } = await supabase
          .from('site_surveys')
          .update(surveyData)
          .eq('id', existingSurvey.id);
        if (error) throw error;
        surveyId = existingSurvey.id;
      } else {
        const { data: newSurvey, error } = await supabase
          .from('site_surveys')
          .insert([surveyData])
          .select()
          .single();
        if (error) throw error;
        surveyId = newSurvey.id;
        setExistingSurvey(newSurvey);
      }

      // Save photos to survey_photos table
      if (uploadedPhotos.length > 0 && surveyId) {
        await supabase
          .from('survey_photos')
          .delete()
          .eq('survey_id', surveyId);

        const photoInserts = uploadedPhotos.map(photo => ({
          survey_id: surveyId,
          photo_url: photo.url,
          photo_type: photo.type,
          description: photo.description,
        }));

        const { error: photoError } = await supabase
          .from('survey_photos')
          .insert(photoInserts);

        if (photoError) throw photoError;
      }

      // Update lead workflow stage
      if (finalStatus === 'completed') {
        await supabase
          .from('leads')
          .update({ workflow_stage: 'survey_complete' })
          .eq('id', leadId);
        
        await sendStageChangeNotification(leadId, leadData?.workflow_stage || 'new', 'survey_complete');
      } else if (finalStatus === 'in_progress') {
        await supabase
          .from('leads')
          .update({ workflow_stage: 'survey_in_progress' })
          .eq('id', leadId);
      }

      // Log activity
      if (finalStatus === 'completed') {
        await logActivity({
          leadId,
          actionType: 'survey_completed',
          description: `Site survey completed for ${leadData?.name || 'lead'}`,
          metadata: {
            recommended_system_size: data.recommended_system_size,
            panel_count: data.recommended_panel_count,
            roof_type: data.roof_type
          }
        });
      } else if (!existingSurvey) {
        await logActivity({
          leadId,
          actionType: 'survey_started',
          description: `Site survey started for ${leadData?.name || 'lead'}`
        });
      }

      toast({
        title: 'Success',
        description: `Site survey ${existingSurvey ? 'updated' : 'created'} successfully${finalStatus === 'completed' ? ' and marked as complete' : ''}`,
      });

      fetchExistingSurvey();
    } catch (error: any) {
      console.error('Error saving survey:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save survey',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAndCreateProposal = async () => {
    const formData = getValues();
    await onSubmit(formData, true);
    
    if (completionStatus.isComplete && onCreateProposal) {
      const proposalData = mapSurveyToProposal(formData, leadData);
      onCreateProposal(proposalData, leadData);
    }
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Step content components
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Customer Info (read-only from lead)
        return (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Customer information is automatically populated from the lead record.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <div className="p-3 bg-muted rounded-lg font-medium">{leadData?.name || 'Not available'}</div>
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="p-3 bg-muted rounded-lg">{leadData?.email || 'Not available'}</div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <div className="p-3 bg-muted rounded-lg">{leadData?.phone || 'Not provided'}</div>
                </div>
                <div>
                  <Label>Monthly Bill</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    {leadData?.monthly_bill ? `€${leadData.monthly_bill}` : 'Not provided'}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <div className="p-3 bg-muted rounded-lg">{leadData?.address || 'Not provided'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Customer Goals & Preferences (moved up)
        return (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Property Type - Key field for SEAI grant calculations */}
              <div>
                <Label htmlFor="property_type" className="font-medium">Property Type *</Label>
                <Select onValueChange={(value) => setValue('property_type', value)} value={watch('property_type') || 'residential'}>
                  <SelectTrigger className="w-full mt-1.5 h-12">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Determines SEAI grant eligibility</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="annual_consumption_kwh">Annual Consumption (kWh) *</Label>
                  <Input 
                    {...register('annual_consumption_kwh')} 
                    type="number" 
                    placeholder="e.g., 4500" 
                    className="w-full mt-1.5 h-12" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">From electricity bill</p>
                </div>
                <div>
                  <Label htmlFor="current_tariff">Current Tariff (€/kWh)</Label>
                  <Input 
                    {...register('current_tariff')} 
                    type="number" 
                    step="0.01"
                    placeholder="0.35" 
                    className="w-full mt-1.5 h-12" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">Avg €0.35/kWh in Ireland</p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <Label className="font-semibold text-base">What are you looking to achieve?</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-4 p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors">
                    <Switch
                      checked={watch('battery_storage') || false}
                      onCheckedChange={(checked) => setValue('battery_storage', checked)}
                    />
                    <div className="flex-1">
                      <Label className="cursor-pointer font-medium text-base">Battery Storage</Label>
                      <p className="text-sm text-muted-foreground">Store excess solar energy for nighttime use</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors">
                    <Switch
                      checked={watch('hot_water_diverter') || false}
                      onCheckedChange={(checked) => setValue('hot_water_diverter', checked)}
                    />
                    <div className="flex-1">
                      <Label className="cursor-pointer font-medium text-base">Hot Water Diverter</Label>
                      <p className="text-sm text-muted-foreground">Eddi/iBoost to heat water with excess solar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors">
                    <Switch
                      checked={watch('ev_charger') || false}
                      onCheckedChange={(checked) => setValue('ev_charger', checked)}
                    />
                    <div className="flex-1">
                      <Label className="cursor-pointer font-medium text-base">EV Charger</Label>
                      <p className="text-sm text-muted-foreground">Charge your electric vehicle with solar power</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="customer_priorities">Customer Priorities & Notes</Label>
                <Textarea 
                  {...register('customer_priorities')} 
                  placeholder="What's most important to the customer? (e.g., maximise savings, energy independence, reduce carbon footprint)" 
                  rows={3} 
                  className="w-full mt-1.5" 
                />
              </div>
            </CardContent>
          </Card>
        );

      case 3: // Roof Details
        return (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="roof_type">Roof Type *</Label>
                  <Select onValueChange={(value) => setValue('roof_type', value)} value={watch('roof_type')}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Select roof type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pitched">Pitched</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.roof_type && <p className="text-sm text-destructive mt-1">{errors.roof_type.message}</p>}
                </div>

                <div>
                  <Label htmlFor="roof_condition">Roof Condition *</Label>
                  <Select onValueChange={(value) => setValue('roof_condition', value)} value={watch('roof_condition')}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.roof_condition && <p className="text-sm text-destructive mt-1">{errors.roof_condition.message}</p>}
                </div>

                <div>
                  <Label htmlFor="roof_orientation">Roof Orientation</Label>
                  <Select onValueChange={(value) => setValue('roof_orientation', value)} value={watch('roof_orientation')}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Select orientation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="South">South</SelectItem>
                      <SelectItem value="South-East">South-East</SelectItem>
                      <SelectItem value="South-West">South-West</SelectItem>
                      <SelectItem value="East">East</SelectItem>
                      <SelectItem value="West">West</SelectItem>
                      <SelectItem value="North">North (not ideal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="roof_pitch">Roof Pitch (degrees)</Label>
                  <Input {...register('roof_pitch')} type="number" step="1" placeholder="e.g., 30" className="w-full mt-1.5" />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="roof_material">Roof Material</Label>
                  <Select onValueChange={(value) => setValue('roof_material', value)} value={watch('roof_material')}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Concrete tiles">Concrete tiles</SelectItem>
                      <SelectItem value="Clay tiles">Clay tiles</SelectItem>
                      <SelectItem value="Slate">Slate</SelectItem>
                      <SelectItem value="Metal">Metal</SelectItem>
                      <SelectItem value="Felt/Membrane">Felt/Membrane (flat)</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4: // Environmental
        return (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="shading_analysis">Shading Analysis</Label>
                <Select onValueChange={(value) => setValue('shading_analysis', value)} value={watch('shading_analysis')}>
                  <SelectTrigger className="w-full mt-1.5">
                    <SelectValue placeholder="Select shading level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">No shading</SelectItem>
                    <SelectItem value="Minimal">Minimal (early morning/late evening only)</SelectItem>
                    <SelectItem value="Partial">Partial (some hours affected)</SelectItem>
                    <SelectItem value="Significant">Significant (major obstruction)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nearby_obstructions">Nearby Obstructions</Label>
                <Textarea 
                  {...register('nearby_obstructions')} 
                  placeholder="Trees, chimneys, neighboring buildings, dormer windows..." 
                  rows={3} 
                  className="w-full mt-1.5" 
                />
              </div>
            </CardContent>
          </Card>
        );

      case 5: // Electrical
        return (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="electrical_panel_capacity">Panel Capacity</Label>
                  <Select onValueChange={(value) => setValue('electrical_panel_capacity', value)} value={watch('electrical_panel_capacity')}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Select capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40A">40A (older property)</SelectItem>
                      <SelectItem value="63A">63A (standard)</SelectItem>
                      <SelectItem value="80A">80A (modern)</SelectItem>
                      <SelectItem value="100A">100A (large property)</SelectItem>
                      <SelectItem value="3-phase">3-phase (commercial)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grid_connection_type">Grid Connection</Label>
                  <Select onValueChange={(value) => setValue('grid_connection_type', value)} value={watch('grid_connection_type')}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single phase">Single phase</SelectItem>
                      <SelectItem value="Three phase">Three phase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="meter_location">Meter Location</Label>
                  <Input {...register('meter_location')} placeholder="e.g., Outside front, utility room, garage" className="w-full mt-1.5" />
                </div>

                <div>
                  <Label htmlFor="recommended_system_size">Recommended System Size (kW)</Label>
                  <Input {...register('recommended_system_size')} type="number" step="0.1" placeholder="e.g., 6.5" className="w-full mt-1.5" />
                </div>

                <div>
                  <Label htmlFor="recommended_panel_count">Recommended Panel Count</Label>
                  <Input {...register('recommended_panel_count')} type="number" placeholder="e.g., 16" className="w-full mt-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 6: // Installation & Logistics (merged)
        return (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  These details help installers prepare for the site visit and reduce second visits.
                </p>
              </div>

              {/* Address Lookup with Map */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Property Location</Label>
                </div>
                <EircodeAddressLookup 
                  value={leadData?.address || ''}
                  onChange={(address) => {
                    if (address && leadData) {
                      supabase
                        .from('leads')
                        .update({ address })
                        .eq('id', leadId)
                        .then(() => {
                          setLeadData({ ...leadData, address });
                        });
                    }
                  }}
                  showMap={true}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="property_storeys">Property Storeys</Label>
                  <Select onValueChange={(value) => setValue('property_storeys', value)} value={watch('property_storeys')}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Select storeys" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1-storey (bungalow)</SelectItem>
                      <SelectItem value="2">2-storey</SelectItem>
                      <SelectItem value="3">3+ storey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scaffolding_required">Scaffolding Required</Label>
                  <Select onValueChange={(value) => setValue('scaffolding_required', value)} value={watch('scaffolding_required')}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes - Full scaffolding</SelectItem>
                      <SelectItem value="partial">Partial - Some walls only</SelectItem>
                      <SelectItem value="no">No - Ladder access OK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="attic_access">Attic Access</Label>
                  <Select onValueChange={(value) => setValue('attic_access', value)} value={watch('attic_access')}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="Select access type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy hatch access</SelectItem>
                      <SelectItem value="difficult">Difficult access</SelectItem>
                      <SelectItem value="none">No attic access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="parking_situation">Parking Situation</Label>
                  <Input {...register('parking_situation')} placeholder="e.g., Driveway, street parking" className="w-full mt-1.5" />
                </div>

                <div className="sm:col-span-2 flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Switch
                    checked={watch('existing_solar') || false}
                    onCheckedChange={(checked) => setValue('existing_solar', checked)}
                  />
                  <Label htmlFor="existing_solar" className="cursor-pointer">
                    Property has existing solar system
                  </Label>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="customer_availability">Customer Availability</Label>
                  <Textarea {...register('customer_availability')} placeholder="Best days/times for installation, any date restrictions..." rows={2} className="w-full mt-1.5" />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="access_notes">Access Notes</Label>
                  <Textarea {...register('access_notes')} placeholder="Gate codes, dog in garden, ring doorbell, etc..." rows={2} className="w-full mt-1.5" />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="installation_notes">Installation Notes</Label>
                  <Textarea {...register('installation_notes')} placeholder="Special considerations, cable routing preferences..." rows={2} className="w-full mt-1.5" />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="special_requirements">Special Requirements</Label>
                  <Textarea {...register('special_requirements')} placeholder="Permits, planning permission, HOA restrictions..." rows={2} className="w-full mt-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 7: // Photos
        return (
          <Card>
            <CardContent className="pt-6">
              <GuidedPhotoCapture
                leadId={leadId}
                existingPhotos={uploadedPhotos.map((p, i) => ({ 
                  id: `photo-${i}`, 
                  url: p.url, 
                  type: p.type 
                }))}
                onPhotosChange={(photos) => {
                  setUploadedPhotos(photos.map(p => ({
                    url: p.url,
                    type: p.type,
                    description: p.type
                  })));
                }}
              />
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={surveyContainerRef} className="space-y-4 pb-24">
      {/* Progress Indicator - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <SurveyStepProgress 
          currentStep={currentStep} 
          completedSteps={getCompletedSteps()}
          onStepChange={setCurrentStep}
          showNavigation={false}
        />
      </div>

      {/* Step Content with Animation and Swipe Gestures */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Survey Status Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="mb-1 block">Survey Status</Label>
              <p className="text-xs text-muted-foreground">Auto-calculated based on completion</p>
            </div>
            <div className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium",
              calculateSurveyStatus(formValues, uploadedPhotos.length) === 'completed' 
                ? 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary'
                : calculateSurveyStatus(formValues, uploadedPhotos.length) === 'in_progress'
                ? 'bg-tech/10 text-tech'
                : 'bg-muted text-muted-foreground'
            )}>
              {calculateSurveyStatus(formValues, uploadedPhotos.length) === 'completed' && (
                <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Completed</span>
              )}
              {calculateSurveyStatus(formValues, uploadedPhotos.length) === 'in_progress' && 'In Progress'}
              {calculateSurveyStatus(formValues, uploadedPhotos.length) === 'draft' && 'Draft'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ONE slim action bar (was: step pill + two h-14 buttons + save/complete
          stack + helper text — half the phone screen of chrome). Left: prev/next.
          Right: Save + the star action, Complete & Create Proposal. */}
      <div className="fixed bottom-0 left-0 right-0 px-3 py-2 bg-background/95 backdrop-blur border-t border-border z-50 pb-safe">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <SurveyStepNavigation
            currentStep={currentStep}
            totalSteps={SURVEY_STEPS.length}
            onStepChange={setCurrentStep}
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={handleSubmit((data) => onSubmit(data, false))}
              disabled={loading}
              variant="outline"
              size="sm"
              className="h-9"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-4 w-4" /> Save</>}
            </Button>
            {onCreateProposal && (
              <Button
                type="button"
                onClick={handleCompleteAndCreateProposal}
                disabled={loading || !completionStatus.isComplete}
                size="sm"
                className="h-9"
                title={!completionStatus.isComplete ? `Complete all required fields (${completionStatus.completionPercentage}%) to create a proposal` : undefined}
              >
                <FileText className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Complete &amp; Create Proposal</span>
                <span className="sm:hidden">Proposal</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
