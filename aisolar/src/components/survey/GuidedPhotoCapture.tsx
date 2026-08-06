import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, X, Upload, AlertCircle, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RequiredPhoto {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

// The full shot list, tagged so each survey step can pull just its own shots
// (walk the house once, snap where you stand — no second lap for photos).
const REQUIRED_PHOTOS: RequiredPhoto[] = [
  { id: 'roof_overview', label: 'Roof overview', description: 'Full view of the roof from the ground', required: true },
  { id: 'roof_closeup', label: 'Roof close-up', description: 'Tile / material condition detail', required: true },
  { id: 'electrical_panel', label: 'Fuse board', description: 'Board with the cover open', required: true },
  { id: 'meter', label: 'Electricity meter', description: 'Meter with the MPRN visible', required: true },
  { id: 'attic', label: 'Attic space', description: 'Access hatch and roof underside', required: false },
  { id: 'inverter_location', label: 'Inverter spot', description: 'Proposed mounting area', required: false },
  { id: 'access_point', label: 'Access point', description: 'Entry to property / driveway', required: false },
];

export { REQUIRED_PHOTOS };

interface CapturedPhoto {
  id: string;
  url: string;
  type: string;
}

interface GuidedPhotoCaptureProps {
  leadId: string;
  existingPhotos: CapturedPhoto[];
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  /** Which shots to show here. Omit for all. Pass [] for an extras-only view. */
  photoIds?: string[];
  /** Show the "Anything else" adder. Default true. */
  showExtras?: boolean;
  /** Show the count header. Default true. */
  showHeader?: boolean;
}

export default function GuidedPhotoCapture({
  leadId,
  existingPhotos,
  onPhotosChange,
  photoIds,
  showExtras = true,
  showHeader = true,
}: GuidedPhotoCaptureProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const shots = photoIds ? REQUIRED_PHOTOS.filter(p => photoIds.includes(p.id)) : REQUIRED_PHOTOS;
  const getPhotoForType = (type: string) => existingPhotos.find(p => p.type === type);

  const handleCapture = async (photoType: string, file: File) => {
    setUploading(photoType);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${photoType}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('survey-photos').upload(fileName, file);
      if (uploadError) throw uploadError;
      // The bucket is PRIVATE + tenant-scoped, so getPublicUrl returns a dead
      // link — a signed URL is the only one that authorises (5 Aug fix).
      const { data: signed } = await supabase.storage.from('survey-photos').createSignedUrl(fileName, 60 * 60 * 24 * 7);
      const filteredPhotos = existingPhotos.filter(p => p.type !== photoType);
      const newPhoto: CapturedPhoto = { id: fileName, url: signed?.signedUrl ?? '', type: photoType };
      onPhotosChange([...filteredPhotos, newPhoto]);
      toast({ title: 'Photo captured', description: `${REQUIRED_PHOTOS.find(p => p.id === photoType)?.label || 'Photo'} saved` });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (photoType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleCapture(photoType, file);
    if (event.target) event.target.value = '';
  };

  const triggerCapture = (photoType: string) => fileInputRefs.current[photoType]?.click();
  const removePhoto = (photoType: string) => onPhotosChange(existingPhotos.filter(p => p.type !== photoType));

  const handleExtraPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await handleCapture(`extra_${Date.now()}`, file);
    if (event.target) event.target.value = '';
  };

  const capturedCount = shots.filter(p => p.required && getPhotoForType(p.id)).length;
  const requiredCount = shots.filter(p => p.required).length;
  const missing = shots.filter(p => p.required && !getPhotoForType(p.id));
  const allExtraPhotos = existingPhotos.filter(p => !REQUIRED_PHOTOS.find(r => r.id === p.type));

  return (
    <div className="space-y-3">
      {/* Count header — deposit-green when the required shots for this step are in */}
      {showHeader && shots.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {requiredCount > 0 ? `${capturedCount} of ${requiredCount} needed here` : 'Optional shots'}
          </span>
          <span className={cn('inline-flex items-center gap-1 text-2xs font-medium rounded-full px-2 py-0.5',
            requiredCount === 0 || capturedCount >= requiredCount
              ? 'bg-doc-deposit/10 text-doc-deposit' : 'bg-pop-subtle text-pop')}>
            {capturedCount >= requiredCount && requiredCount > 0 ? <Check className="size-3" /> : null}
            {capturedCount}/{Math.max(requiredCount, shots.length)}
          </span>
        </div>
      )}

      {/* Shots for this step */}
      {shots.map((photo) => {
        const captured = getPhotoForType(photo.id);
        const isUploading = uploading === photo.id;
        return (
          <div key={photo.id}
            className={cn('flex items-center gap-3 rounded-control border p-3 transition-colors',
              captured ? 'border-doc-deposit/40 bg-doc-deposit/5'
                : photo.required ? 'border-pop/30 bg-pop-subtle/40' : 'border-border bg-card')}>
            <div className="relative flex-shrink-0">
              <input
                ref={(el) => (fileInputRefs.current[photo.id] = el)}
                type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => handleFileSelect(photo.id, e)} disabled={isUploading}
              />
              <AnimatePresence mode="wait">
                {captured ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative group">
                    <img src={captured.url} alt={photo.label} className="w-16 h-16 object-cover rounded-lg border border-doc-deposit/40" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                      <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => triggerCapture(photo.id)}>
                        <Camera className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => removePhoto(photo.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-doc-deposit rounded-full flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} type="button"
                    onClick={() => triggerCapture(photo.id)} disabled={isUploading}
                    className={cn('w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all',
                      'bg-tech text-white hover:bg-tech/90 active:scale-95 touch-manipulation',
                      isUploading && 'opacity-50 cursor-not-allowed')}>
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (<><Camera className="h-5 w-5" /><span className="text-[9px] font-semibold tracking-wide">SNAP</span></>)}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{photo.label}</span>
                {photo.required && !captured && (
                  <span className="text-2xs font-medium rounded-full px-1.5 py-0.5 text-pop bg-pop-subtle">Needed</span>
                )}
                {!photo.required && !captured && (
                  <span className="text-2xs font-medium rounded-full px-1.5 py-0.5 text-muted-foreground bg-muted">Optional</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{photo.description}</p>
            </div>

            {!captured && !isUploading && (
              <label className="cursor-pointer flex-shrink-0">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(photo.id, e)} />
                <div className="h-9 w-9 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-tech hover:bg-tech-subtle transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              </label>
            )}
          </div>
        );
      })}

      {/* Missing-shots nudge for this step */}
      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-control border border-pop/30 bg-pop-subtle/50 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-pop mt-0.5 flex-shrink-0" />
          <p className="text-xs text-pop leading-body">
            Still needed: {missing.map(p => p.label).join(', ')}
          </p>
        </div>
      )}

      {/* Extras — the catch-all adder + thumbnails */}
      {showExtras && (
        <div className={cn(shots.length > 0 && 'pt-3 border-t border-border')}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Anything else worth a shot?</span>
              <p className="text-xs text-muted-foreground">Odd angles, damage, obstructions, the gable end.</p>
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleExtraPhoto} />
              <Button variant="outline" size="sm" className="pointer-events-none h-9">
                <Plus className="h-4 w-4 mr-1.5" /> Add
              </Button>
            </label>
          </div>
          {allExtraPhotos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {allExtraPhotos.map((photo, index) => (
                <div key={photo.id} className="relative group">
                  <img src={photo.url} alt={`Extra ${index + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                  <Button size="icon" variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(photo.type)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
