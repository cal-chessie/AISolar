import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, X, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
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
  { id: 'roof_overview', label: 'Roof Overview', description: 'Full view of the roof from ground level', required: true },
  { id: 'roof_closeup', label: 'Roof Close-up', description: 'Detailed view of tiles/material condition', required: true },
  { id: 'electrical_panel', label: 'Electrical Panel', description: 'Main fuse board with cover open', required: true },
  { id: 'meter', label: 'Meter', description: 'Electricity meter showing MPRN', required: true },
  { id: 'attic', label: 'Attic Space', description: 'Access and roof underside', required: false },
  { id: 'inverter_location', label: 'Inverter Location', description: 'Proposed inverter mounting area', required: false },
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
  const [showCamera, setShowCamera] = useState<string | null>(null);

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
        description: `${REQUIRED_PHOTOS.find(p => p.id === photoType)?.label} saved successfully`,
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
      setShowCamera(null);
    }
  };

  const handleFileSelect = (photoType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleCapture(photoType, file);
    }
  };

  const handleCameraCapture = async (photoType: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      
      // Create a video element
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      
      // Create canvas and capture
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `${photoType}.jpg`, { type: 'image/jpeg' });
          await handleCapture(photoType, file);
        }
      }, 'image/jpeg', 0.9);
    } catch (error: any) {
      toast({
        title: 'Camera access denied',
        description: 'Please use the upload button instead',
        variant: 'destructive',
      });
    }
  };

  const removePhoto = (photoType: string) => {
    onPhotosChange(existingPhotos.filter(p => p.type !== photoType));
  };

  const capturedCount = REQUIRED_PHOTOS.filter(p => p.required && getPhotoForType(p.id)).length;
  const requiredCount = REQUIRED_PHOTOS.filter(p => p.required).length;

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <span className="font-medium">Required Photos</span>
        </div>
        <Badge variant={capturedCount >= requiredCount ? "default" : "secondary"}>
          {capturedCount} / {requiredCount} captured
        </Badge>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REQUIRED_PHOTOS.map((photo) => {
          const captured = getPhotoForType(photo.id);
          const isUploading = uploading === photo.id;

          return (
            <Card 
              key={photo.id} 
              className={cn(
                "overflow-hidden transition-all",
                captured && "border-green-500/50 bg-green-50/50 dark:bg-green-900/10",
                !captured && photo.required && "border-orange-300/50"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{photo.label}</span>
                      {photo.required && !captured && (
                        <Badge variant="outline" className="text-[10px] h-4 text-orange-600 border-orange-300">
                          Required
                        </Badge>
                      )}
                      {captured && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{photo.description}</p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {captured ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative group"
                    >
                      <img 
                        src={captured.url} 
                        alt={photo.label}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleFileSelect(photo.id, e)}
                          />
                          <Button size="sm" variant="secondary" className="pointer-events-none">
                            <Camera className="h-3 w-3 mr-1" />
                            Retake
                          </Button>
                        </label>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => removePhoto(photo.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2"
                    >
                      {/* Camera Button */}
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleFileSelect(photo.id, e)}
                          disabled={isUploading}
                        />
                        <Button 
                          variant="default" 
                          className="w-full h-16 flex-col gap-1 pointer-events-none"
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span className="text-[10px]">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="h-5 w-5" />
                              <span className="text-[10px]">Capture</span>
                            </>
                          )}
                        </Button>
                      </label>
                      
                      {/* Upload Button */}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(photo.id, e)}
                          disabled={isUploading}
                        />
                        <Button 
                          variant="outline" 
                          className="h-16 w-16 flex-col gap-1 pointer-events-none"
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4" />
                          <span className="text-[10px]">Upload</span>
                        </Button>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Minimum photos warning */}
      {capturedCount < requiredCount && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-800 dark:text-orange-200">
            Please capture at least {requiredCount} required photos to complete the survey. 
            Missing: {REQUIRED_PHOTOS.filter(p => p.required && !getPhotoForType(p.id)).map(p => p.label).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
