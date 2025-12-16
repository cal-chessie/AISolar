import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle, X, FileText, ArrowRight, ChevronDown, ChevronUp, Info, MapPin } from 'lucide-react';
import { validateSurveyCompletion, mapSurveyToProposal, calculateSurveyStatus } from '@/lib/surveyValidation';
import SurveyStepProgress, { SURVEY_STEPS } from '@/components/survey/SurveyStepProgress';
import GuidedPhotoCapture from '@/components/survey/GuidedPhotoCapture';
import EircodeAddressLookup from '@/components/address/EircodeAddressLookup';
import { logActivity } from '@/lib/activityLog';
import { sendStageChangeNotification } from '@/lib/stageNotifications';

const surveySchema = z.object({
  roof_type: z.string().min(1, 'Roof type is required'),
  roof_condition: z.string().min(1, 'Roof condition is required'),
  roof_orientation: z.string().optional(),
  roof_pitch: z.string().optional(),
  roof_material: z.string().optional(),
  shading_analysis: z.string().optional(),
  nearby_obstructions: z.string().optional(),
  electrical_panel_capacity: z.string().optional(),
  electrical_panel_condition: z.string().optional(),
  meter_location: z.string().optional(),
  grid_connection_type: z.string().optional(),
  recommended_system_size: z.string().optional(),
  recommended_panel_count: z.string().optional(),
  estimated_installation_cost: z.string().optional(),
  installation_notes: z.string().optional(),
  special_requirements: z.string().optional(),
  status: z.string().default('draft'),
  // New installer logistics fields
  property_storeys: z.string().optional(),
  scaffolding_required: z.string().optional(),
  parking_situation: z.string().optional(),
  attic_access: z.string().optional(),
  access_notes: z.string().optional(),
  customer_availability: z.string().optional(),
  existing_solar: z.boolean().optional(),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SiteSurveyFormProps {
  leadId: string;
  onCreateProposal?: (surveyData: any, leadData: any) => void;
}

const PHOTO_TYPES = [
  { value: 'roof_overview', label: 'Roof Overview' },
  { value: 'roof_closeup', label: 'Roof Close-up' },
  { value: 'electrical_panel', label: 'Electrical Panel' },
  { value: 'meter', label: 'Meter' },
  { value: 'attic', label: 'Attic Space' },
  { value: 'inverter_location', label: 'Inverter Location' },
  { value: 'access_point', label: 'Access Point' },
  { value: 'other', label: 'Other' },
];

export default function SiteSurveyForm({ leadId, onCreateProposal }: SiteSurveyFormProps) {
  const [loading, setLoading] = useState(false);
  const [existingSurvey, setExistingSurvey] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ url: string; type: string; description: string }>>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  
  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    roof: true,
    environmental: false,
    electrical: false,
    recommendations: false,
    logistics: false,
    photos: false,
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      status: 'draft',
      existing_solar: false,
    },
  });

  const status = watch('status');
  const formValues = watch();

  // Calculate completion status
  const completionStatus = validateSurveyCompletion(formValues, uploadedPhotos.length);

  // Calculate current step based on open sections
  const getCurrentStep = () => {
    if (openSections.roof) return 2;
    if (openSections.environmental) return 3;
    if (openSections.electrical) return 4;
    if (openSections.recommendations) return 5;
    if (openSections.logistics) return 6;
    if (openSections.photos) return 7;
    return 1;
  };

  const getCompletedSteps = () => {
    const completed: string[] = [];
    if (completionStatus.sections.roof.complete) completed.push('roof');
    if (completionStatus.sections.electrical.complete) completed.push('electrical');
    if (completionStatus.sections.recommendations.complete) completed.push('recommendations');
    if (completionStatus.sections.photos.complete) completed.push('photos');
    return completed;
  };


  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    fetchExistingSurvey();
  }, [leadId]);

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
            if (key === 'existing_solar') {
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
    // Validate completion if trying to complete
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

      // Auto-calculate status based on completion
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
        electrical_panel_condition: data.electrical_panel_condition || null,
        meter_location: data.meter_location || null,
        grid_connection_type: data.grid_connection_type || null,
        recommended_system_size: data.recommended_system_size ? parseFloat(data.recommended_system_size) : null,
        recommended_panel_count: data.recommended_panel_count ? parseInt(data.recommended_panel_count) : null,
        estimated_installation_cost: data.estimated_installation_cost ? parseFloat(data.estimated_installation_cost) : null,
        installation_notes: data.installation_notes || null,
        special_requirements: data.special_requirements || null,
        status: finalStatus,
        completed_at: finalStatus === 'completed' ? new Date().toISOString() : null,
        // New installer logistics fields
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
        // Delete old photos first
        await supabase
          .from('survey_photos')
          .delete()
          .eq('survey_id', surveyId);

        // Insert new photos
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
        
        // Send stage change notification
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

  const SectionHeader = ({ 
    title, 
    section, 
    isComplete,
    description 
  }: { 
    title: string; 
    section: keyof typeof openSections;
    isComplete?: boolean;
    description?: string;
  }) => (
    <CollapsibleTrigger 
      className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-3">
        <span className="font-semibold text-base">{title}</span>
        {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
      </div>
      <div className="flex items-center gap-2">
        {description && (
          <span className="text-xs text-muted-foreground hidden sm:inline">{description}</span>
        )}
        {openSections[section] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </div>
    </CollapsibleTrigger>
  );

  return (
    <div className="space-y-4 pb-32">
      {/* Progress Indicator - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <SurveyStepProgress 
          currentStep={getCurrentStep()} 
          completedSteps={getCompletedSteps()}
        />
      </div>

      <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-3">
        {/* Roof Details - Collapsible */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.roof}>
            <SectionHeader 
              title="Roof Details" 
              section="roof" 
              isComplete={completionStatus.sections.roof.complete}
              description="Required"
            />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="roof_type">Roof Type *</Label>
                    <Select onValueChange={(value) => setValue('roof_type', value)} value={watch('roof_type')}>
                      <SelectTrigger className="w-full">
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
                      <SelectTrigger className="w-full">
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
                    <Label htmlFor="roof_orientation">Roof Orientation *</Label>
                    <Select onValueChange={(value) => setValue('roof_orientation', value)} value={watch('roof_orientation')}>
                      <SelectTrigger className="w-full">
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
                    <Label htmlFor="roof_pitch">Roof Pitch (degrees) *</Label>
                    <Input {...register('roof_pitch')} type="number" step="1" placeholder="e.g., 30" className="w-full" />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="roof_material">Roof Material *</Label>
                    <Select onValueChange={(value) => setValue('roof_material', value)} value={watch('roof_material')}>
                      <SelectTrigger className="w-full">
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
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Environmental Analysis - Collapsible */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.environmental}>
            <SectionHeader 
              title="Environmental Analysis" 
              section="environmental"
              description="Shading & obstructions"
            />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <Label htmlFor="shading_analysis">Shading Analysis</Label>
                  <Select onValueChange={(value) => setValue('shading_analysis', value)} value={watch('shading_analysis')}>
                    <SelectTrigger className="w-full">
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
                  <Textarea {...register('nearby_obstructions')} placeholder="Trees, chimneys, neighboring buildings..." rows={2} className="w-full" />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Electrical System - Collapsible */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.electrical}>
            <SectionHeader 
              title="Electrical System" 
              section="electrical"
              isComplete={completionStatus.sections.electrical.complete}
              description="Required"
            />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="electrical_panel_capacity">Panel Capacity *</Label>
                    <Select onValueChange={(value) => setValue('electrical_panel_capacity', value)} value={watch('electrical_panel_capacity')}>
                      <SelectTrigger className="w-full">
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
                    <Label htmlFor="meter_location">Meter Location</Label>
                    <Input {...register('meter_location')} placeholder="e.g., Outside front, utility room" className="w-full" />
                  </div>

                  <div>
                    <Label htmlFor="meter_location">Meter Location</Label>
                    <Input {...register('meter_location')} placeholder="e.g., Outside front, utility room" className="w-full" />
                  </div>

                  <div>
                    <Label htmlFor="grid_connection_type">Grid Connection *</Label>
                    <Select onValueChange={(value) => setValue('grid_connection_type', value)} value={watch('grid_connection_type')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single phase">Single phase</SelectItem>
                        <SelectItem value="Three phase">Three phase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Customer Goals & System Options - Collapsible */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.recommendations}>
            <SectionHeader 
              title="Customer Goals & System" 
              section="recommendations"
              isComplete={completionStatus.sections.recommendations.complete}
              description="Required"
            />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recommended_system_size">Recommended System Size (kW) *</Label>
                    <Input {...register('recommended_system_size')} type="number" step="0.1" placeholder="e.g., 6.5" className="w-full" />
                  </div>

                  <div>
                    <Label htmlFor="recommended_panel_count">Panel Count *</Label>
                    <Input {...register('recommended_panel_count')} type="number" placeholder="e.g., 16" className="w-full" />
                  </div>
                </div>

                {/* Energy Management Options */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <Label className="font-medium">Energy Management Options</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                      <Switch
                        checked={watch('battery_storage' as any) || false}
                        onCheckedChange={(checked) => setValue('battery_storage' as any, checked)}
                      />
                      <div>
                        <Label className="cursor-pointer font-medium">Battery Storage</Label>
                        <p className="text-xs text-muted-foreground">Store excess solar energy</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                      <Switch
                        checked={watch('hot_water_diverter' as any) || false}
                        onCheckedChange={(checked) => setValue('hot_water_diverter' as any, checked)}
                      />
                      <div>
                        <Label className="cursor-pointer font-medium">Hot Water Diverter</Label>
                        <p className="text-xs text-muted-foreground">Eddi/iBoost for hot water</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                      <Switch
                        checked={watch('ev_charger' as any) || false}
                        onCheckedChange={(checked) => setValue('ev_charger' as any, checked)}
                      />
                      <div>
                        <Label className="cursor-pointer font-medium">EV Charger</Label>
                        <p className="text-xs text-muted-foreground">Electric vehicle charging</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="installation_notes">Installation Notes</Label>
                  <Textarea {...register('installation_notes')} placeholder="Access requirements, scaffolding needs, special considerations..." rows={2} className="w-full" />
                </div>

                <div>
                  <Label htmlFor="special_requirements">Special Requirements</Label>
                  <Textarea {...register('special_requirements')} placeholder="Permits, planning permission, HOA restrictions..." rows={2} className="w-full" />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Installer Logistics - NEW Collapsible Section */}
        <Card className="overflow-hidden border-dashed border-amber-300">
          <Collapsible open={openSections.logistics}>
            <SectionHeader 
              title="Installer Logistics" 
              section="logistics"
              description="Recommended for installers"
            />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 mb-4">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    These optional fields help installers prepare for the site visit, reducing the need for second visits.
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
                      // Update lead address if changed
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
                      <SelectTrigger className="w-full">
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
                      <SelectTrigger className="w-full">
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
                      <SelectTrigger className="w-full">
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
                    <Input {...register('parking_situation')} placeholder="e.g., Driveway, street parking" className="w-full" />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-muted rounded-lg">
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
                    <Textarea {...register('customer_availability')} placeholder="Best days/times for installation, any date restrictions..." rows={2} className="w-full" />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="access_notes">Access Notes</Label>
                    <Textarea {...register('access_notes')} placeholder="Gate codes, dog in garden, ring doorbell, etc..." rows={2} className="w-full" />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Photo Upload - Collapsible with Guided Capture */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.photos}>
            <SectionHeader 
              title="Site Photos" 
              section="photos"
              isComplete={completionStatus.sections.photos.complete}
              description={`${uploadedPhotos.length} captured`}
            />
            <CollapsibleContent>
              <CardContent className="pt-0">
                {/* Guided Photo Capture - Individual buttons for each required photo */}
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
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Auto-calculated Status Display */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-1 block">Survey Status</Label>
                <p className="text-xs text-muted-foreground">Auto-calculated based on completion</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                calculateSurveyStatus(formValues, uploadedPhotos.length) === 'completed' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : calculateSurveyStatus(formValues, uploadedPhotos.length) === 'in_progress'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {calculateSurveyStatus(formValues, uploadedPhotos.length) === 'completed' && (
                  <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Completed</span>
                )}
                {calculateSurveyStatus(formValues, uploadedPhotos.length) === 'in_progress' && 'In Progress'}
                {calculateSurveyStatus(formValues, uploadedPhotos.length) === 'draft' && 'Draft'}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border z-50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSubmit((data) => onSubmit(data, false))} 
            disabled={loading} 
            variant="outline"
            className="flex-1"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Save Survey</>
            )}
          </Button>

          {onCreateProposal && (
            <Button
              type="button"
              onClick={handleCompleteAndCreateProposal}
              disabled={loading || !completionStatus.isComplete}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Complete & Create Proposal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        
        {!completionStatus.isComplete && onCreateProposal && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Complete all required fields ({completionStatus.completionPercentage}%) to create a proposal
          </p>
        )}
      </div>
    </div>
  );
}
