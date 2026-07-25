/**
 * RoofDesigner — Level 1 (keyless) "panels land on your roof".
 *
 * Cal's unlock, isolated to the client calculator first as a proof. Same
 * keyless Google satellite embed the proposal already uses, plus a draw layer:
 * find your house, drag a box over the roof, and panels auto-fill it as a grid.
 * The count feeds the live estimate.
 *
 * HONEST: keyless means the layout is approximate (we can't measure pixels to
 * metres without the Maps Static key — on the GATE 0 rotation list). Framed as
 * "rough layout — exact count + positions confirmed at survey". When the key is
 * live this upgrades to true-scale, and Google Solar auto-detect (Level 2)
 * layers in where Ireland has coverage. Reused by the design step + proposal.
 */
import { useRef, useState, useCallback } from 'react';
import { MapPin, Pencil, RotateCcw, Sparkles, Loader2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { detectRoof, hasMapsKey, type RoofInsight } from '@/lib/googleSolar';

// Keyless panel footprint in map pixels at the fixed satellite zoom (~z20).
// A real 1m×1.7m panel is only ~8×13px at this zoom — sized so a domestic roof
// box holds a realistic 10–25 panels, not four slabs.
const PW = 9, PH = 14, GAP = 2;

type Rect = { x: number; y: number; w: number; h: number };

export default function RoofDesigner({
  panelWatts,
  onChange,
}: {
  panelWatts: number;
  onChange?: (roof: { panels: number; kwp: number; address: string }) => void;
}) {
  const [address, setAddress] = useState('45 Griffith Avenue, Drumcondra, Dublin 9');
  const [query, setQuery] = useState(address);
  const [drawing, setDrawing] = useState(false);   // draw mode on → map locked
  const [rect, setRect] = useState<Rect | null>(null);
  const [rotation, setRotation] = useState(0);     // align the panel grid to an angled roof
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Level 2: Google Solar auto-detect
  const [checking, setChecking] = useState(false);
  const [auto, setAuto] = useState<RoofInsight | null>(null);
  const [autoUsed, setAutoUsed] = useState(false);
  const [noCoverage, setNoCoverage] = useState(false);

  const emit = useCallback((r: Rect | null) => {
    if (!r) { onChange?.({ panels: 0, kwp: 0, address }); return; }
    const cols = Math.max(0, Math.floor((r.w + GAP) / (PW + GAP)));
    const rows = Math.max(0, Math.floor((r.h + GAP) / (PH + GAP)));
    const panels = Math.min(40, cols * rows);
    onChange?.({ panels, kwp: Math.round((panels * panelWatts) / 100) / 10, address });
  }, [onChange, panelWatts, address]);

  const find = async () => {
    setQuery(address); setRect(null); setRotation(0); emit(null); setDrawing(false);
    setAuto(null); setAutoUsed(false); setNoCoverage(false);
    if (!hasMapsKey()) return;   // no key → keyless Level 1 only
    setChecking(true);
    const insight = await detectRoof(address);
    setChecking(false);
    if (insight) setAuto(insight); else setNoCoverage(true);
  };
  const useAuto = () => { if (auto) { onChange?.({ panels: auto.panels, kwp: auto.kwp, address }); setAutoUsed(true); } };

  const rel = (e: React.PointerEvent) => {
    const b = boxRef.current!.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  const onDown = (e: React.PointerEvent) => {
    if (!drawing) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = rel(e);
    setRect({ ...dragStart.current, w: 0, h: 0 });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing || !dragStart.current) return;
    const p = rel(e), s = dragStart.current;
    setRect({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const onUp = () => {
    if (!dragStart.current) return;
    dragStart.current = null;
    setRect(r => {
      const valid = !!(r && r.w > 20 && r.h > 20);
      emit(valid ? r : null);
      if (valid) setDrawing(false);   // drawn → leave draw mode so the next drag MOVES it, not redraws
      return valid ? r : null;
    });
  };

  // Drag the finished box to move it (adjust mode); a drag outside it pans the map.
  const moveStart = useRef<{ mx: number; my: number; rx: number; ry: number } | null>(null);
  const onBoxDown = (e: React.PointerEvent) => {
    if (drawing || !rect) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = rel(e);
    moveStart.current = { mx: p.x, my: p.y, rx: rect.x, ry: rect.y };
  };
  const onBoxMove = (e: React.PointerEvent) => {
    if (!moveStart.current || !rect) return;
    const p = rel(e), s = moveStart.current;
    setRect({ ...rect, x: s.rx + (p.x - s.mx), y: s.ry + (p.y - s.my) });
  };
  const onBoxUp = () => { moveStart.current = null; };
  const nudge = (dx: number, dy: number) => setRect(r => (r ? { ...r, x: r.x + dx, y: r.y + dy } : r));

  // grid of panels inside the drawn rect, positioned RELATIVE to the box so the
  // whole group can be rotated as one to line up with an angled roof.
  const panels: Array<{ left: number; top: number }> = [];
  if (rect) {
    const cols = Math.floor((rect.w + GAP) / (PW + GAP));
    const rows = Math.floor((rect.h + GAP) / (PH + GAP));
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++)
      if (panels.length < 40) panels.push({ left: c * (PW + GAP), top: r * (PH + GAP) });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={address} onChange={e => setAddress(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') find(); }}
            placeholder="Your address or Eircode"
            className="w-full h-10 pl-9 pr-3 rounded-control border border-border bg-background text-sm" />
        </div>
        <button onClick={find} disabled={checking}
          className="h-10 px-3 rounded-control bg-primary text-primary-foreground text-xs font-semibold shrink-0 hover:opacity-90 transition-opacity disabled:opacity-60">
          {checking ? <Loader2 className="size-4 animate-spin" /> : 'Find'}
        </button>
      </div>

      {/* Level 2 — Google Solar auto-detect result */}
      {checking && (
        <p className="mt-2 flex items-center gap-1.5 text-2xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Checking Google Solar for your roof…</p>
      )}
      {auto && !autoUsed && (
        <div className="mt-2 rounded-control border border-doc-deposit/40 bg-doc-deposit/5 p-3">
          <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="size-3.5 text-doc-deposit" /> Google found your roof</p>
          <p className="text-2xs text-muted-foreground mt-0.5">Fits up to <span className="font-medium text-foreground">{auto.panels} panels</span> ({auto.kwp} kWp) · {auto.sunshineHours.toLocaleString()} sun-hours a year — real geometry, not a guess.</p>
          <button onClick={useAuto} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-control bg-doc-deposit text-white px-3 text-2xs font-semibold hover:opacity-90 transition-opacity">
            <Sparkles className="size-3.5" /> Use this roof
          </button>
        </div>
      )}
      {autoUsed && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-doc-deposit"><Sparkles className="size-3.5" /> Auto-detected — {auto?.panels} panels ({auto?.kwp} kWp) feeding your estimate.</p>
      )}
      {noCoverage && (
        <p className="mt-2 text-2xs text-muted-foreground">Google doesn't have this roof yet (common in rural Ireland) — draw it on the map instead, it's just as good.</p>
      )}

      <div ref={boxRef} className="relative mt-2 h-[280px] sm:h-[300px] lg:h-[240px] rounded-panel overflow-hidden border border-border bg-muted select-none">
        {/* fallback backdrop if the embed is blocked */}
        <div className="absolute inset-0 grid place-items-center text-2xs text-muted-foreground">Loading satellite…</div>
        <iframe
          title="Your roof from above"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=k&z=20&output=embed`}
          className="absolute inset-0 w-full h-full border-0"
          style={{ pointerEvents: drawing ? 'none' : 'auto' }}
          loading="lazy"
        />
        {/* draw layer — only captures when drawing */}
        <div
          className="absolute inset-0"
          style={{ pointerEvents: drawing ? 'auto' : 'none', cursor: drawing ? 'crosshair' : 'default' }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        >
          {rect && (
            <div className="absolute"
              onPointerDown={onBoxDown} onPointerMove={onBoxMove} onPointerUp={onBoxUp}
              style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, transform: `rotate(${rotation}deg)`, transformOrigin: 'center', pointerEvents: drawing ? 'none' : 'auto', cursor: drawing ? 'default' : 'move' }}>
              <div className="absolute inset-0 border-2 border-white/90 rounded-[2px]" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)' }} />
              {panels.map((p, i) => (
                <div key={i} className="absolute rounded-[2px] bg-primary/85 border border-white/40"
                  style={{ left: p.left, top: p.top, width: PW, height: PH }} />
              ))}
            </div>
          )}
        </div>

        {/* ── DRAW MODE OVERLAY ───────────────────────────────────────────────
            The old hint was a tiny badge that also vanished the moment you
            started dragging, and nothing signalled that the mode had changed.
            Now entering draw mode visibly takes over the map and tells you
            exactly what to do, for as long as you're doing it. */}
        {drawing && !rect && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/45 pointer-events-none">
            <div className="text-center px-6">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-white/95 text-foreground shadow-lg">
                <Pencil className="size-5" />
              </span>
              <p className="mt-2.5 text-sm font-semibold text-white drop-shadow">
                Drag a box over your roof
              </p>
              <p className="mt-1 text-2xs text-white/80 drop-shadow max-w-[15rem] mx-auto leading-snug">
                Press, drag across the roof, let go. The panels fill it automatically.
              </p>
            </div>
          </div>
        )}

        {/* controls */}
        <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center gap-2 flex-wrap">
          {!drawing && !rect && (
            <button onClick={() => setDrawing(true)}
              className="inline-flex h-9 items-center gap-2 rounded-control bg-primary text-primary-foreground px-4 text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity">
              <Pencil className="size-4" /> Draw your roof
            </button>
          )}
          {drawing && (
            <button onClick={() => setDrawing(false)}
              className="inline-flex h-9 items-center gap-1.5 rounded-control bg-background/95 px-3 text-2xs font-semibold shadow-card hover:bg-background transition-colors">
              Cancel
            </button>
          )}
          {rect && (
            <>
              <span className="inline-flex h-9 items-center gap-1.5 rounded-control bg-doc-deposit text-white px-3 text-2xs font-semibold shadow-card">
                <Check className="size-3.5" /> Roof set
              </span>
              <button onClick={() => { setRect(null); setRotation(0); emit(null); setDrawing(true); }}
                className="inline-flex h-9 items-center gap-1.5 rounded-control bg-background/95 px-3 text-2xs font-semibold shadow-card hover:bg-background transition-colors">
                <RotateCcw className="size-3.5" /> Redraw
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fine-tuning only appears once there's something to tune — and each
          control says what it's FOR, not just what it is. */}
      {rect && (
        <div className="mt-3 rounded-control border border-border bg-muted/30 p-3 space-y-2.5">
          <p className="text-2xs font-semibold">Line it up with your roof</p>
          <div className="flex items-center gap-2.5">
            <span className="text-2xs text-muted-foreground shrink-0 w-24">Match the angle</span>
            <input type="range" min={-90} max={90} step={1} value={rotation}
              onChange={e => setRotation(Number(e.target.value))}
              aria-label="Rotate the panel layout to match your roof angle"
              className="flex-1 accent-primary cursor-pointer" />
            <span className="text-2xs tabular-nums text-muted-foreground w-9 text-right shrink-0">{rotation}°</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-2xs text-muted-foreground shrink-0 w-24">Nudge into place</span>
            <div className="flex gap-1">
              {([[ArrowLeft, -4, 0, 'left'], [ArrowUp, 0, -4, 'up'], [ArrowDown, 0, 4, 'down'], [ArrowRight, 4, 0, 'right']] as const).map(([Ic, dx, dy, dir]) => (
                <button key={dir} onClick={() => nudge(dx, dy)} aria-label={`Nudge ${dir}`}
                  className="size-8 grid place-items-center rounded-control border border-border bg-background hover:bg-muted transition-colors">
                  <Ic className="size-3.5" />
                </button>
              ))}
            </div>
            <span className="text-2xs text-muted-foreground">or just drag it on the map</span>
          </div>
        </div>
      )}

      <p className="mt-2 text-2xs text-muted-foreground leading-snug">
        {rect
          ? 'This is a rough layout to size your system — the exact panel count and positions are measured at your free survey.'
          : 'Find your address above, then draw a box over your roof. The panels fill it automatically and your estimate updates as you go.'}
      </p>
    </div>
  );
}
