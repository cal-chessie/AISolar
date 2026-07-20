import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, X, Upload, AlertCircle, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RequiredPhoto {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

const REQUIRED_PHOTOS: RequiredPhoto[] = [
  { id: 'roof_overview', label: 'Roof Overview', description: 'Full view of roof from ground', required: true },
  { id: 'roof_closeup', label: 'Roof Close-up', description: 'Tile/material condition detail', required: true },
  { id: 'electrical_panel', label: 'Electrical Panel', description: 'Fuse board with cover open', required: true },
  { id: 'meter', label: 'Electricity Meter', description: 'Meter showing MPRN visible', required: true },
  { id: 'attic', label: 'Attic Space', description: 'Access hatch and roof underside', required: false },
  { id: 'inverter_location', label: 'Inverter Location', description: 'Proposed mounting area', required: false },
  { id: 'access_point', label: 'Access Point', description: 'Entry to property/driveway', required: false },
];

interface CapturedPhoto {
  id: string;
  url: string;
  type: string;
}

interface GuidedPhotoCaptureProps {
  leadId: string;
  existingPhotos: CapturedPhoto[];
  onPhotosChange: (photos: CapturedPhoto[]) => void;
}

export default function GuidedPhotoCapture({ 
  leadId, 
  existingPhotos, 
  onPhotosChange 
}: GuidedPhotoCaptureProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<CapturedPhoto[]>([]);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const getPhotoForType = (type: string) => 
    existingPhotos.find(p => p.type === type);

  const handleCapture = async (photoType: string, file: File) => {
    setUploading(photoType);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${photoType}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('survey-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('survey-photos')
        .getPublicUrl(fileName);

      // Remove existing photo of same type if exists
      const filteredPhotos = existingPhotos.filter(p => p.type !== photoType);
      const newPhoto: CapturedPhoto = {
        id: fileName,
        url: publicUrl,
        type: photoType
      };
      
      onPhotosChange([...filteredPhotos, newPhoto]);
      
      toast({
        title: 'Photo captured',
        description: `${REQUIRED_PHOTOS.find(p => p.id === photoType)?.label || 'Photo'} saved`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (photoType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleCapture(photoType, file);
    }
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const triggerCapture = (photoType: string) => {
    const input = fileInputRefs.current[photoType];
    if (input) {
      input.click();
    }
  };

  const removePhoto = (photoType: string) => {
    onPhotosChange(existingPhotos.filter(p => p.type !== photoType));
  };

  const handleExtraPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const photoType = `extra_${Date.now()}`;
      await handleCapture(photoType, file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const capturedCount = REQUIRED_PHOTOS.filter(p => p.required && getPhotoForType(p.id)).length;
  const requiredCount = REQUIRED_PHOTOS.filter(p => p.required).length;
  const allOptionalPhotos = existingPhotos.filter(p => !REQUIRED_PHOTOS.find(r => r.id === p.type));

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-transparent rounded-xl border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <span className="font-semibold block">Required Photos</span>
            <span className="text-sm text-muted-foreground">Capture each photo below</span>
          </div>
        </div>
        <Badge 
          variant={capturedCount >= requiredCount ? "default" : "secondary"}
          className={cn(
            "text-sm px-3 py-1",
            capturedCount >= requiredCount && "bg-green-500"
          )}
        >
          {capturedCount} / {requiredCount}
        </Badge>
      </div>

      {/* Required Photos - Individual Capture Buttons */}
      <div className="space-y-3">
        {REQUIRED_PHOTOS.map((photo) => {
          const captured = getPhotoForType(photo.id);
          const isUploading = uploading === photo.id;

          return (
            <Card 
              key={photo.id} 
              className={cn(
                "overflow-hidden transition-all",
                captured && "border-green-500 bg-green-50/50 dark:bg-green-900/10",
                !captured && photo.required && "border-orange-300/50 dark:border-orange-700/50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Photo Preview or Capture Button */}
                  <div className="relative flex-shrink-0">
                    {/* Hidden file input */}
                    <input
                      ref={(el) => (fileInputRefs.current[photo.id] = el)}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileSelect(photo.id, e)}
                      disabled={isUploading}
                    />

                    <AnimatePresence mode="wait">
                      {captured ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative group"
                        >
                          <img 
                            src={captured.url} 
                            alt={photo.label}
                            className="w-20 h-20 object-cover rounded-xl border-2 border-green-500"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-1">
                            <Button 
                              size="icon" 
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={() => triggerCapture(photo.id)}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => removePhoto(photo.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => triggerCapture(photo.id)}
                          disabled={isUploading}
                          className={cn(
                            "w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                            "bg-primary text-primary-foreground hover:bg-primary/90",
                            "active:scale-95 touch-manipulation",
                            isUploading && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isUploading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <>
                              <Camera className="h-6 w-6" />
                              <span className="text-[10px] font-medium">CAPTURE</span>
                            </>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Photo Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base">{photo.label}</span>
                      {photo.required && !captured && (
                        <Badge variant="outline" className="text-[10px] h-5 text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700">
                          Required
                        </Badge>
                      )}
                      {!photo.required && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          Optional
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{photo.description}</p>
                  </div>

                  {/* Alternative Upload Button */}
                  {!captured && !isUploading && (
                    <label className="cursor-pointer flex-shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileSelect(photo.id, e)}
                      />
                      <div className="h-10 w-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Extra Photos Section */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-medium">Additional Photos</span>
            <p className="text-sm text-muted-foreground">Capture any extra photos needed</p>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleExtraPhoto}
            />
            <Button variant="outline" size="sm" className="pointer-events-none">
              <Plus className="h-4 w-4 mr-2" />
              Add Photo
            </Button>
          </label>
        </div>

        {allOptionalPhotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {allOptionalPhotos.map((photo, index) => (
              <div key={photo.id} className="relative group">
                <img 
                  src={photo.url} 
                  alt={`Extra photo ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(photo.type)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Minimum photos warning */}
      {capturedCount < requiredCount && (
        <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-200">
              {requiredCount - capturedCount} required photo{requiredCount - capturedCount > 1 ? 's' : ''} remaining
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-0.5">
              Missing: {REQUIRED_PHOTOS.filter(p => p.required && !getPhotoForType(p.id)).map(p => p.label).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
