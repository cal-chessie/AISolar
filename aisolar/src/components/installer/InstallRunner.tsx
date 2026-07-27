/**
 * InstallRunner — the job in progress, in order (AIField screens 3–6).
 *
 * The crew's day is linear and physical: five gated stages, each demanding its
 * photos before the next unlocks. The photos ARE the evidence pack (ESB, RECI,
 * warranty) — not decoration. At commissioning the serials come off the van and
 * the TRIPLE CHECK runs: machine reads what was fitted → cross-checks it against
 * what the proposal specified → the human confirms at the gate. A substituted
 * inverter would make the NC6 describe kit that isn't on the roof — and a kW
 * change can flip NC6 → NC7, which legally needed pre-approval. Nothing clears
 * silently. Handover closes with the customer's signature ON THE PHONE,
 * offline-tolerant (everything persists locally; Sweep 8 syncs it).
 *
 * Mobile-first: 375px, gloves, sun glare — big targets, one column, no hover.
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  X, Camera, CheckCircle2, Circle, AlertTriangle, PenLine, ChevronRight,
  ShieldCheck, Sun, Zap, Cpu, HeartHandshake, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DummyLead } from '@/lib/dummyData';

interface PhotoSlot { id: string; label: string }
interface CheckItem { id: string; label: string }
interface StageDef {
  id: string; label: string; icon: typeof Sun;
  photos: PhotoSlot[]; checks: CheckItem[];
}

const STAGES: StageDef[] = [
  {
    id: 'preinstall', label: 'Pre-install', icon: ShieldCheck,
    photos: [{ id: 'van', label: 'Van load vs BOM' }, { id: 'site', label: 'Site on arrival' }],
    checks: [{ id: 'walk', label: 'Walked the plan with the customer' }, { id: 'access', label: 'Roof + attic access confirmed' }],
  },
  {
    id: 'roof', label: 'Roof', icon: Sun,
    photos: [{ id: 'rails', label: 'Rails + fixings' }, { id: 'flash', label: 'Flashing / penetrations' }, { id: 'array', label: 'Array complete' }],
    checks: [{ id: 'torque', label: 'Anchors torqued to spec' }, { id: 'seal', label: 'Cable entry sealed' }],
  },
  {
    id: 'electrical', label: 'Electrical', icon: Zap,
    photos: [{ id: 'inverter', label: 'Inverter mounted' }, { id: 'board', label: 'Board after works' }],
    checks: [{ id: 'isolators', label: 'Isolators labelled' }, { id: 'bonding', label: 'Bonding verified' }],
  },
  {
    id: 'commissioning', label: 'Commissioning', icon: Cpu,
    photos: [{ id: 'plate', label: 'Inverter rating plate' }, { id: 'screen', label: 'Inverter live screen' }],
    checks: [{ id: 'export', label: 'Export limit set' }, { id: 'app', label: 'Monitoring app connected' }],
  },
  {
    id: 'handover', label: 'Handover', icon: HeartHandshake,
    photos: [{ id: 'pack', label: 'Handover pack handed over' }],
    checks: [{ id: 'demo', label: 'Showed the customer their app' }],
  },
];

interface RunState {
  photos: Record<string, string>;      // "stage/slot" -> dataURL
  checks: Record<string, boolean>;     // "stage/check" -> done
  serial: string;
  fittedModel: string;                 // what's actually on the wall
  serialConfirmed: boolean;
  mismatchFlagged: boolean;
  signature: string | null;            // dataURL
  signedAt: string | null;
}

const EMPTY: RunState = { photos: {}, checks: {}, serial: '', fittedModel: '', serialConfirmed: false, mismatchFlagged: false, signature: null, signedAt: null };
const storeKey = (id: string) => `aifield_run_${id}`;

export default function InstallRunner({ lead, onClose }: { lead: DummyLead; onClose: () => void }) {
  const [run, setRun] = useState<RunState>(() => {
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(storeKey(lead.id)) || '{}') }; } catch { return EMPTY; }
  });
  // Offline-tolerant: every change lands in localStorage immediately.
  useEffect(() => { try { localStorage.setItem(storeKey(lead.id), JSON.stringify(run)); } catch { /* full */ } }, [run, lead.id]);

  const specifiedInverter = lead.proposal?.inverter_model || 'SolaX X1-Hybrid-5.0 G4';
  const [openStage, setOpenStage] = useState<string>(() => firstIncomplete(run));

  function stageDone(s: StageDef, r: RunState): boolean {
    const photosOk = s.photos.every(p => !!r.photos[`${s.id}/${p.id}`]);
    const checksOk = s.checks.every(c => !!r.checks[`${s.id}/${c.id}`]);
    if (s.id === 'commissioning') return photosOk && checksOk && r.serialConfirmed;
    if (s.id === 'handover') return photosOk && checksOk && !!r.signature;
    return photosOk && checksOk;
  }
  function firstIncomplete(r: RunState): string {
    for (const s of STAGES) if (!stageDone(s, r)) return s.id;
    return STAGES[STAGES.length - 1].id;
  }
  const doneCount = STAGES.filter(s => stageDone(s, run)).length;
  const allDone = doneCount === STAGES.length;

  const addPhoto = (stageId: string, slotId: string, file: File) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result !== 'string') return;
      setRun(prev => ({ ...prev, photos: { ...prev.photos, [`${stageId}/${slotId}`]: r.result as string } }));
    };
    r.readAsDataURL(file);
  };

  // fitted-vs-specified: the heart of the triple check
  const modelsAgree = run.fittedModel.trim() !== '' &&
    run.fittedModel.trim().toLowerCase() === specifiedInverter.trim().toLowerCase();

  // ── signature pad ─────────────────────────────────────────────────────────
  const sigRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const sigStart = (e: React.PointerEvent) => {
    const c = sigRef.current; if (!c) return;
    drawing.current = true;
    const ctx = c.getContext('2d')!; const r = c.getBoundingClientRect();
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo((e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height));
    c.setPointerCapture(e.pointerId);
  };
  const sigMove = (e: React.PointerEvent) => {
    const c = sigRef.current; if (!c || !drawing.current) return;
    const ctx = c.getContext('2d')!; const r = c.getBoundingClientRect();
    ctx.lineTo((e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)); ctx.stroke();
  };
  const sigEnd = () => { drawing.current = false; };
  const sigClear = () => { const c = sigRef.current; if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height); };
  const sigConfirm = () => {
    const c = sigRef.current; if (!c) return;
    setRun(prev => ({ ...prev, signature: c.toDataURL('image/png'), signedAt: new Date().toISOString() }));
    toast.success('Signed on site', { description: 'Stored on this phone — lands on the NC6 + Declaration of Works at sync.' });
  };

  const first = lead.name.split(' ')[0];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* header */}
      <header className="w-full max-w-3xl mx-auto flex items-center gap-3 px-4 h-14 shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-bold truncate">{lead.name} — the install</h2>
          <p className="text-2xs text-muted-foreground truncate">{lead.address}</p>
        </div>
        <span className="ml-auto text-2xs font-semibold tabular-nums rounded-full bg-tech/10 text-tech px-2 py-1 shrink-0">{doneCount}/{STAGES.length} stages</span>
        <button onClick={onClose} aria-label="Close" className="size-9 grid place-items-center rounded-control hover:bg-muted shrink-0"><X className="size-4" /></button>
      </header>
      <div className="border-b border-border shrink-0" />
      {/* progress */}
      <div className="h-1.5 bg-muted shrink-0">
        <div className="h-full bg-tech transition-all" style={{ width: `${(doneCount / STAGES.length) * 100}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-24 w-full"><div className="max-w-3xl mx-auto p-3 space-y-2.5">
        {allDone && (
          <div className="rounded-panel border border-doc-deposit/40 bg-doc-deposit/10 p-4 text-sm">
            <p className="font-semibold text-doc-deposit flex items-center gap-1.5"><CheckCircle2 className="size-4" /> Job complete — evidence pack ready</p>
            <p className="text-xs text-muted-foreground mt-1">{Object.keys(run.photos).length} photos · serial verified · signed by {first} — everything the ESB, RECI and the warranty need, captured once.</p>
          </div>
        )}

        {STAGES.map((s, i) => {
          const done = stageDone(s, run);
          const prevDone = i === 0 || stageDone(STAGES[i - 1], run);
          const locked = !prevDone && !done;
          const open = openStage === s.id && !locked;
          const Icon = s.icon;
          return (
            <section key={s.id} className={cn('rounded-panel border bg-card', done ? 'border-doc-deposit/40' : open ? 'border-tech/50' : 'border-border', locked && 'opacity-55')}>
              <button className="w-full flex items-center gap-3 p-3.5 text-left" disabled={locked}
                onClick={() => setOpenStage(open ? '' : s.id)}>
                <span className={cn('size-9 rounded-lg grid place-items-center shrink-0', done ? 'bg-doc-deposit/10 text-doc-deposit' : open ? 'bg-tech/10 text-tech' : 'bg-muted text-muted-foreground')}>
                  {locked ? <Lock className="size-4" /> : done ? <CheckCircle2 className="size-4.5" /> : <Icon className="size-4.5" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block">{i + 1}. {s.label}</span>
                  <span className="text-2xs text-muted-foreground">
                    {locked ? `Finish ${STAGES[i - 1].label} first` :
                      done ? 'Complete' :
                      `${s.photos.filter(p => run.photos[`${s.id}/${p.id}`]).length}/${s.photos.length} photos · ${s.checks.filter(c => run.checks[`${s.id}/${c.id}`]).length}/${s.checks.length} checks`}
                  </span>
                </span>
                <ChevronRight className={cn('size-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-90')} />
              </button>

              {open && (
                <div className="px-3.5 pb-3.5 space-y-3">
                  {/* photos — the evidence pack */}
                  <div className="grid grid-cols-2 gap-2">
                    {s.photos.map(p => {
                      const shot = run.photos[`${s.id}/${p.id}`];
                      return (
                        <label key={p.id} className={cn('relative rounded-control border overflow-hidden cursor-pointer', shot ? 'border-doc-deposit/50' : 'border-dashed border-border hover:border-tech')}>
                          {shot ? (
                            <img src={shot} alt={p.label} className="w-full h-24 object-cover" />
                          ) : (
                            <span className="h-24 grid place-items-center"><Camera className="size-5 text-muted-foreground" /></span>
                          )}
                          <span className={cn('absolute bottom-0 inset-x-0 text-2xs font-medium px-2 py-1', shot ? 'bg-doc-deposit/85 text-white' : 'bg-background/85 text-muted-foreground')}>{p.label}</span>
                          <input type="file" accept="image/*" capture="environment" className="sr-only"
                            onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(s.id, p.id, f); }} />
                        </label>
                      );
                    })}
                  </div>
                  {/* checks */}
                  <div className="space-y-1">
                    {s.checks.map(c => {
                      const on = !!run.checks[`${s.id}/${c.id}`];
                      return (
                        <button key={c.id}
                          onClick={() => setRun(prev => ({ ...prev, checks: { ...prev.checks, [`${s.id}/${c.id}`]: !on } }))}
                          className={cn('w-full h-11 flex items-center gap-2.5 px-3 rounded-control border text-left text-sm', on ? 'border-doc-deposit/40 bg-doc-deposit/5' : 'border-border hover:bg-muted')}>
                          {on ? <CheckCircle2 className="size-4.5 text-doc-deposit shrink-0" /> : <Circle className="size-4.5 text-muted-foreground shrink-0" />}
                          {c.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* commissioning: serials + THE TRIPLE CHECK */}
                  {s.id === 'commissioning' && (
                    <div className="rounded-control border border-border p-3 space-y-2.5">
                      <p className="text-xs font-semibold flex items-center gap-1.5"><Cpu className="size-3.5 text-tech" /> Serials off the van — feeds NC6 §5 + the warranty pack</p>
                      <div>
                        <label className="text-2xs text-muted-foreground">Inverter model AS FITTED (off the rating plate)</label>
                        <input value={run.fittedModel} onChange={e => setRun(prev => ({ ...prev, fittedModel: e.target.value, serialConfirmed: false }))}
                          placeholder={specifiedInverter} className="mt-1 w-full h-11 rounded-control border border-input bg-background px-3 text-sm" />
                      </div>
                      <div>
                        <label className="text-2xs text-muted-foreground">Serial number</label>
                        <input value={run.serial} onChange={e => setRun(prev => ({ ...prev, serial: e.target.value, serialConfirmed: false }))}
                          placeholder="e.g. XB5012345678" className="mt-1 w-full h-11 rounded-control border border-input bg-background px-3 text-sm font-mono" />
                      </div>
                      {run.fittedModel.trim() && (
                        modelsAgree ? (
                          <div className="rounded-control bg-doc-deposit/10 border border-doc-deposit/40 p-2.5 text-xs">
                            <p className="font-semibold text-doc-deposit flex items-center gap-1.5"><CheckCircle2 className="size-3.5" /> Matches the proposal</p>
                            <p className="text-muted-foreground mt-0.5">Proposal specified <strong className="text-foreground">{specifiedInverter}</strong>. NC6 §5 and the protection table describe what's actually on the wall.</p>
                          </div>
                        ) : (
                          <div className="rounded-control bg-pop-subtle border border-pop/40 p-2.5 text-xs">
                            <p className="font-semibold text-pop flex items-center gap-1.5"><AlertTriangle className="size-3.5" /> Doesn't match the proposal</p>
                            <p className="text-muted-foreground mt-0.5">Proposal specified <strong className="text-foreground">{specifiedInverter}</strong>. A substituted inverter makes the NC6 describe kit that isn't on the roof — and a kW change can flip NC6 → NC7, which needs ESB pre-approval. Nothing clears silently.</p>
                          </div>
                        )
                      )}
                      <button
                        disabled={!run.serial.trim() || !run.fittedModel.trim()}
                        onClick={() => {
                          setRun(prev => ({ ...prev, serialConfirmed: true, mismatchFlagged: !modelsAgree }));
                          toast.success(modelsAgree ? 'Serial confirmed — matches the proposal' : 'Recorded as fitted — office flagged', {
                            description: modelsAgree ? 'Every digit confirmed by you at the gate.' : 'The office sees the substitution BEFORE the NC6 goes anywhere.',
                          });
                        }}
                        className={cn('w-full h-11 rounded-control text-sm font-semibold text-white disabled:opacity-40', modelsAgree || !run.fittedModel.trim() ? 'bg-tech hover:bg-tech/90' : 'bg-pop hover:bg-pop/90')}>
                        {run.serialConfirmed ? 'Confirmed ✓' : modelsAgree || !run.fittedModel.trim() ? 'I confirm every digit' : 'Record as fitted + flag the office'}
                      </button>
                    </div>
                  )}

                  {/* handover: the signature that NC6/DoW are waiting on */}
                  {s.id === 'handover' && (
                    <div className="rounded-control border border-border p-3 space-y-2">
                      <p className="text-xs font-semibold flex items-center gap-1.5"><PenLine className="size-3.5 text-tech" /> {first} signs right here — offline is fine, it stores on this phone</p>
                      {run.signature ? (
                        <div className="rounded-control bg-doc-deposit/10 border border-doc-deposit/40 p-2.5 text-xs">
                          <img src={run.signature} alt={`${lead.name} signature`} className="h-14 bg-white rounded border border-border" />
                          <p className="font-semibold text-doc-deposit mt-1.5 flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Signed {run.signedAt ? new Date(run.signedAt).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }) : ''} — feeds the NC6 + Declaration of Works</p>
                        </div>
                      ) : (
                        <>
                          <canvas ref={sigRef} width={640} height={180}
                            onPointerDown={sigStart} onPointerMove={sigMove} onPointerUp={sigEnd} onPointerLeave={sigEnd}
                            className="w-full h-28 bg-white rounded-control border border-input touch-none" />
                          <div className="flex gap-2">
                            <button onClick={sigClear} className="flex-1 h-10 rounded-control border border-border text-sm font-medium hover:bg-muted">Clear</button>
                            <button onClick={sigConfirm} className="flex-1 h-10 rounded-control bg-tech text-white text-sm font-semibold hover:bg-tech/90">Confirm signature</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div></div>
    </div>
  );
}
