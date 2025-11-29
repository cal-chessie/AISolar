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
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, CheckCircle, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

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
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SiteSurveyFormProps {
  leadId: string;
}

export default function SiteSurveyForm({ leadId }: SiteSurveyFormProps) {
  const [loading, setLoading] = useState(false);
  const [existingSurvey, setExistingSurvey] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ url: string; type: string; description: string }>>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      status: 'draft',
    },
  });

  const status = watch('status');

  useEffect(() => {
    fetchExistingSurvey();
  }, [leadId]);

  const fetchExistingSurvey = async () => {
    try {
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
            setValue(key as any, String(data[key]));
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
            type: p.photo_type || 'general',
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

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${leadId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('survey-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('survey-photos')
          .getPublicUrl(fileName);

        return {
          url: publicUrl,
          type: 'general',
          description: file.name,
        };
      });

      const newPhotos = await Promise.all(uploadPromises);
      setUploadedPhotos(prev => [...prev, ...newPhotos]);

      toast({
        title: 'Photos uploaded',
        description: `${acceptedFiles.length} photo(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5242880, // 5MB
  });

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: SurveyFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
        status: data.status,
        completed_at: data.status === 'completed' ? new Date().toISOString() : null,
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

      toast({
        title: 'Success',
        description: `Site survey ${existingSurvey ? 'updated' : 'created'} successfully`,
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

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Roof Details */}
      <Card>
        <CardHeader>
          <CardTitle>Roof Details</CardTitle>
          <CardDescription>Information about the property's roof</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="roof_type">Roof Type *</Label>
              <Select onValueChange={(value) => setValue('roof_type', value)} value={watch('roof_type')}>
                <SelectTrigger>
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
              {errors.roof_condition && <p className="text-sm text-destructive mt-1">{errors.roof_condition.message}</p>}
            </div>

            <div>
              <Label htmlFor="roof_orientation">Roof Orientation</Label>
              <Input {...register('roof_orientation')} placeholder="e.g., South-facing" />
            </div>

            <div>
              <Label htmlFor="roof_pitch">Roof Pitch (degrees)</Label>
              <Input {...register('roof_pitch')} type="number" step="0.1" placeholder="e.g., 30" />
            </div>

            <div>
              <Label htmlFor="roof_material">Roof Material</Label>
              <Input {...register('roof_material')} placeholder="e.g., Tiles, Slate" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environmental Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Environmental Analysis</CardTitle>
          <CardDescription>Shading and surrounding conditions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shading_analysis">Shading Analysis</Label>
            <Textarea {...register('shading_analysis')} placeholder="Describe any shading issues..." rows={3} />
          </div>

          <div>
            <Label htmlFor="nearby_obstructions">Nearby Obstructions</Label>
            <Textarea {...register('nearby_obstructions')} placeholder="Trees, buildings, etc..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Electrical System */}
      <Card>
        <CardHeader>
          <CardTitle>Electrical System</CardTitle>
          <CardDescription>Current electrical infrastructure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="electrical_panel_capacity">Panel Capacity</Label>
              <Input {...register('electrical_panel_capacity')} placeholder="e.g., 100A" />
            </div>

            <div>
              <Label htmlFor="electrical_panel_condition">Panel Condition</Label>
              <Select onValueChange={(value) => setValue('electrical_panel_condition', value)} value={watch('electrical_panel_condition')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="needs_upgrade">Needs Upgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="meter_location">Meter Location</Label>
              <Input {...register('meter_location')} placeholder="e.g., Outside front" />
            </div>

            <div>
              <Label htmlFor="grid_connection_type">Grid Connection Type</Label>
              <Input {...register('grid_connection_type')} placeholder="e.g., Single phase" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>System Recommendations</CardTitle>
          <CardDescription>Proposed solar system specifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="recommended_system_size">System Size (kW)</Label>
              <Input {...register('recommended_system_size')} type="number" step="0.1" placeholder="e.g., 6.5" />
            </div>

            <div>
              <Label htmlFor="recommended_panel_count">Panel Count</Label>
              <Input {...register('recommended_panel_count')} type="number" placeholder="e.g., 16" />
            </div>

            <div>
              <Label htmlFor="estimated_installation_cost">Est. Cost (€)</Label>
              <Input {...register('estimated_installation_cost')} type="number" step="0.01" placeholder="e.g., 12000" />
            </div>
          </div>

          <div>
            <Label htmlFor="installation_notes">Installation Notes</Label>
            <Textarea {...register('installation_notes')} placeholder="Any special installation considerations..." rows={3} />
          </div>

          <div>
            <Label htmlFor="special_requirements">Special Requirements</Label>
            <Textarea {...register('special_requirements')} placeholder="Scaffolding, permits, etc..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Site Photos</CardTitle>
          <CardDescription>Upload photos of the roof, electrical panel, and property</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {uploadingPhotos ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  {isDragActive ? 'Drop photos here' : 'Drag & drop photos here, or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Accepts JPEG, PNG, WebP (max 5MB per file)
                </p>
              </>
            )}
          </div>

          {uploadedPhotos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {uploadedPhotos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.url}
                    alt={photo.description}
                    className="w-full h-32 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="mt-1">
                    <p className="text-xs text-muted-foreground truncate">{photo.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status and Submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label htmlFor="status">Survey Status</Label>
              <Select onValueChange={(value) => setValue('status', value)} value={status}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {status === 'completed' ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {existingSurvey ? 'Update Survey' : 'Create Survey'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
