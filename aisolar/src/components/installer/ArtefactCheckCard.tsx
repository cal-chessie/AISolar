/**
 * ArtefactCheckCard — Compliance Vision at the gate, one shape for every artefact.
 *
 * Cal (3 Aug): "plate + RECI cross-checks at the gate." The type-test check
 * shipped first; this generalises it so the crew can also point the model at
 * the rating PLATE (serial + AC rating + model vs what they typed) and the RECI
 * cert (its number vs Settings). Same law each time: the AI FLAGS, the human
 * DECIDES, and a missing/unreadable image never blocks the gate — it just means
 * the human checks it by eye, which is exactly what happens today.
 *
 * Self-contained: owns its capture + verdict state so the parent (JobViewV2)
 * stays thin and three of these can sit on the page without stepping on
 * each other.
 */
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Shield, Loader2, Camera, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyArtefact, FIELD_LABELS, type ArtefactKind, type ArtefactVerdict } from '@/lib/artefactCheck';
import type { SerialState, CertFile } from '@/lib/fieldRecord';

interface Props {
  kind: ArtefactKind;
  title: string;
  /** One line: what this reads and compares, in the crew's language. */
  blurb: string;
  /** The captured image (plate photo / cert scan) — null until taken. */
  cert: CertFile | undefined;
  onCapture: (file: CertFile) => void;
  /** What the human typed — the model's read is checked against this. */
  serials: Pick<SerialState, 'fittedModel' | 'acRatingKw' | 'ratedCurrentA' | 'typeTestCertRef' | 'serial'>;
  /** RECI number from Settings (only used by the reci check). */
  reciNumber?: string;
  /** The lead — so the AI verdict PERSISTS to the field record (the moat's
   *  evidence + a mismatch blocks the pack). */
  leadId?: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function ArtefactCheckCard({ kind, title, blurb, cert, onCapture, serials, reciNumber, leadId }: Props) {
  const [verdict, setVerdict] = useState<ArtefactVerdict | null>(null);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    onCapture({ name: f.name, dataUrl, kind: 'image' });
    setVerdict(null); // a new photo invalidates the old read
  };

  const run = async () => {
    if (!cert?.dataUrl || cert.kind !== 'image') return;
    setChecking(true);
    const v = await verifyArtefact(kind, cert.dataUrl, serials, reciNumber);
    setVerdict(v);
    setChecking(false);
    // PERSIST the verdict — the compliance vision RECORDS what it read (evidence
    // for the pack + audit), and a mismatch blocks filing (nc6Completeness).
    if (leadId && (v.status === 'ok' || v.status === 'mismatch')) {
      setArtefactVerdict(leadId, kind, {
        status: v.status, at: new Date().toISOString(),
        mismatchCount: v.status === 'mismatch' ? v.mismatches.length : 0,
      });
    }
    if (v.status === 'mismatch') {
      toast.error(`${v.mismatches.length} mismatch${v.mismatches.length === 1 ? '' : 'es'} vs the ${title.toLowerCase()}`, {
        description: 'Look again before this goes on the NC6 — the document wins.',
      });
    } else if (v.status === 'ok') {
      toast.success(`${title} agrees with what you typed`, { description: 'Cross-checked by the compliance read.' });
    } else if (v.status === 'no_ai') {
      toast('AI check unavailable', { description: 'No model configured — the gate still works by hand.' });
    } else {
      toast('Could not read that image', { description: 'Retake it straighter/brighter, or carry on by hand.' });
    }
  };

  return (
    <div className="rounded-panel border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Shield className="size-4 text-doc-contract shrink-0" />
        <span className="text-sm font-semibold">{title}</span>
        {verdict?.status === 'ok' && (
          <span className="ml-auto text-2xs font-semibold rounded-full bg-doc-deposit/10 text-doc-deposit px-2 py-0.5 flex items-center gap-1">
            <CheckCircle2 className="size-3" /> agrees
          </span>
        )}
        {verdict?.status === 'mismatch' && (
          <span className="ml-auto text-2xs font-semibold rounded-full bg-pop/10 text-pop px-2 py-0.5">{verdict.mismatches.length} to check</span>
        )}
      </div>
      <p className="mt-1 text-2xs text-muted-foreground leading-body">{blurb}</p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fileRef.current?.click()}>
          <Camera className="size-3.5 mr-1.5" /> {cert?.dataUrl ? 'Retake photo' : 'Take photo'}
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs"
          disabled={!cert?.dataUrl || cert.kind !== 'image' || checking}
          onClick={run}>
          {checking ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Reading…</> : <><Shield className="size-3.5 mr-1.5" /> Cross-check now</>}
        </Button>
      </div>

      {verdict?.status === 'mismatch' && (
        <div className="mt-2 space-y-1.5">
          {verdict.mismatches.map(m => (
            <div key={m.field} className="rounded-control border border-pop/40 bg-pop/5 p-2 text-2xs">
              <div className="font-semibold text-pop">{FIELD_LABELS[m.field] ?? m.field}</div>
              <div className="mt-0.5 text-muted-foreground">
                you typed <strong className="text-foreground font-mono">{m.typed}</strong> · the document reads <strong className="text-foreground font-mono">{m.read}</strong>
              </div>
            </div>
          ))}
          <p className="text-2xs text-muted-foreground">Fix the field, or note why the document differs — nothing files until you're happy.</p>
        </div>
      )}
      {verdict?.status === 'ok' && Object.keys(verdict.extracted).length > 0 && (
        <p className="mt-2 text-2xs text-muted-foreground">
          Read: {Object.entries(verdict.extracted).filter(([, v]) => v && v !== 'unreadable').map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(' · ')}
        </p>
      )}
    </div>
  );
}
