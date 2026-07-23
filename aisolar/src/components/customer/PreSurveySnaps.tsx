/**
 * PreSurveySnaps — the customer takes the surveyor's four photos, in chat.
 *
 * Cal: "the client being able to take some snaps to help with the survey
 * before the survey even happens or if it needs to even happen. the client
 * could be prompted inside the chat to snap the 4 main photos the
 * consultant takes."
 *
 * The four shots a surveyor takes first on every Irish domestic job:
 *   1. The roof, from outside — face, pitch, obstructions
 *   2. The electricity meter — MPRN plate + meter type
 *   3. The fuse board — spare ways, main switch rating
 *   4. The attic — rafters, felt, cable route
 *
 * Camera-first on mobile (capture=environment). Demo holds object URLs
 * locally; at launch these upload to survey_photos against the lead and
 * the scheduler decides whether the visit shrinks or disappears.
 * HONESTY: we never promise "no survey" — "may save you a visit" is the
 * strongest claim; anything unclear still gets confirmed on site.
 */
import { useRef, useState } from 'react';
import { Camera, Check, Home, Zap, PanelLeft, Warehouse } from 'lucide-react';

const SHOTS = [
  { id: 'roof', label: 'Your roof, from outside', hint: 'Stand back far enough to see the whole roof face', icon: Home },
  { id: 'meter', label: 'Your electricity meter', hint: 'The number plate on it matters — get it sharp', icon: Zap },
  { id: 'board', label: 'Your fuse board', hint: 'Open the door if it has one', icon: PanelLeft },
  { id: 'attic', label: 'Inside the attic', hint: 'Flash on — we need the rafters', icon: Warehouse },
] as const;

export default function PreSurveySnaps({ onAllDone }: { onAllDone?: (photos: Record<string, string>) => void }) {
  const [snaps, setSnaps] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const done = Object.keys(snaps).length;

  const takeSnap = (id: string, file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSnaps(prev => {
      const next = { ...prev, [id]: url };
      if (Object.keys(next).length === SHOTS.length) onAllDone?.(next);
      return next;
    });
  };

  return (
    <div className="rounded-[16px] bg-card shadow-card p-4 max-w-sm">
      <p className="text-sm font-semibold">Four quick photos before your survey</p>
      <p className="text-xs text-muted-foreground mt-1 leading-snug">
        These are the first four shots our surveyor takes. Snapping them now may
        shorten your survey visit — or save you one. Anything unclear, we still
        confirm on site.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {SHOTS.map(shot => {
          const taken = snaps[shot.id];
          return (
            <button key={shot.id} type="button" onClick={() => inputs.current[shot.id]?.click()}
              className={`relative flex flex-col items-center justify-center gap-1.5 rounded-[10px] p-3 min-h-[92px] text-center transition-colors ${
                taken ? 'bg-doc-deposit/10' : 'bg-muted/40 hover:bg-muted/70 border border-dashed border-border'
              }`}>
              <input ref={el => { inputs.current[shot.id] = el; }} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={e => takeSnap(shot.id, e.target.files?.[0])} />
              {taken ? (
                <>
                  <img src={taken} alt={shot.label} className="absolute inset-0 size-full object-cover rounded-[10px] opacity-40" />
                  <Check className="size-4 text-doc-deposit relative" />
                  <span className="text-[11px] font-medium relative">{shot.label}</span>
                </>
              ) : (
                <>
                  <shot.icon className="size-4 text-muted-foreground" />
                  <span className="text-[11px] font-medium leading-tight">{shot.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{shot.hint}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-doc-deposit rounded-full transition-all" style={{ width: `${(done / SHOTS.length) * 100}%` }} />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">{done}/{SHOTS.length}</span>
        {done < SHOTS.length && <Camera className="size-3.5 text-muted-foreground" />}
      </div>
      {done === SHOTS.length && (
        <p className="mt-2 text-xs font-medium text-doc-deposit">All four in — sent to your surveyor. We'll be in touch about your visit.</p>
      )}
    </div>
  );
}
