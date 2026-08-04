/**
 * RoofPhotoRead — Survey-Photo Intelligence at the point of capture.
 *
 * The surveyor snaps the roof; the model reads orientation, pitch, shading and
 * obstructions and offers to fill the fields they were about to type. It
 * SUGGESTS — the surveyor taps "Use these", then adjusts anything that's off.
 * Honest by design: no AI configured / unreadable photo never fills a
 * confident wrong value; the survey always works by hand.
 */
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Loader2, ScanEye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyseRoofPhoto, type RoofRead } from '@/lib/roofRead';

export interface RoofFields {
  orientation?: string;   // matches the Orientation select (South, South-West…)
  pitch?: string;         // roof_pitch
  shading?: string;       // matches the Shading select (None, Minimal…)
  obstructions?: string;  // free text for nearby_obstructions
}

/** Map the model's words onto the survey form's option values. */
const ORIENTATION: Record<string, string> = {
  south: 'South', 'south-east': 'South-East', southeast: 'South-East', 'south-west': 'South-West', southwest: 'South-West',
  east: 'East', west: 'West', north: 'North',
};
const SHADING: Record<string, string> = { none: 'None', light: 'Minimal', moderate: 'Partial', heavy: 'Significant' };

function toFields(r: RoofRead): RoofFields {
  const obs = (r.obstructions ?? []).join(', ');
  return {
    orientation: r.orientation ? ORIENTATION[r.orientation.toLowerCase().replace(/\s+/g, '-')] : undefined,
    pitch: r.pitch_estimate ? String(parseInt(r.pitch_estimate, 10) || '') || undefined : undefined,
    shading: r.shading ? SHADING[r.shading.toLowerCase()] : undefined,
    obstructions: obs || undefined,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
}

export default function RoofPhotoRead({ onApply }: { onApply: (f: RoofFields) => void }) {
  const [read, setRead] = useState<RoofRead | null>(null);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setRead(null); setApplied(false);
    const dataUrl = await fileToDataUrl(f);
    const res = await analyseRoofPhoto(dataUrl);
    setBusy(false);
    if (res.status === 'ok') { setRead(res.read); }
    else if (res.status === 'no_ai') toast('AI read unavailable', { description: 'No model configured — fill the roof by eye.' });
    else toast('Could not read that photo', { description: 'Retake it with the whole roof face in frame, or fill by hand.' });
  };

  const fields = read ? toFields(read) : null;
  const hasSomething = fields && (fields.orientation || fields.pitch || fields.shading || fields.obstructions);

  return (
    <div className="rounded-panel border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <ScanEye className="size-4 text-doc-proposal shrink-0" />
        <span className="text-sm font-semibold">Read the roof from a photo</span>
        <span className="ml-auto text-2xs text-muted-foreground">AI fills, you confirm</span>
      </div>
      <p className="mt-1 text-2xs text-muted-foreground leading-body">
        Snap the roof face and the model reads orientation, pitch, shading and obstructions — then you tap to fill and fix anything off.
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Reading the roof…</> : <><Camera className="size-3.5 mr-1.5" /> {read ? 'Retake' : 'Read a roof photo'}</>}
      </Button>

      {read && (
        <div className="mt-2.5 rounded-control bg-muted/40 p-2.5 text-xs space-y-1">
          {fields?.orientation && <div><span className="text-muted-foreground">Orientation:</span> <strong>{fields.orientation}</strong></div>}
          {fields?.pitch && <div><span className="text-muted-foreground">Pitch:</span> <strong>{fields.pitch}°</strong></div>}
          {fields?.shading && <div><span className="text-muted-foreground">Shading:</span> <strong>{fields.shading}</strong></div>}
          {fields?.obstructions && <div><span className="text-muted-foreground">Obstructions:</span> <strong>{fields.obstructions}</strong></div>}
          {read.note && <div className="text-muted-foreground italic">{read.note}</div>}
          {!hasSomething && <div className="text-muted-foreground">Couldn't read a clear orientation or shading — fill these by eye.</div>}
          {hasSomething && (
            <Button size="sm" className="mt-1.5 h-7 text-xs" disabled={applied}
              onClick={() => { onApply(fields!); setApplied(true); toast.success('Filled from the photo', { description: 'Check each field and adjust anything that\'s off.' }); }}>
              {applied ? <><Check className="size-3.5 mr-1.5" /> Filled — review below</> : 'Use these on the form'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
