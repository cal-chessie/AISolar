/**
 * RoofDesigner — keyless "panels land on your roof", at TRUE scale (3 Aug fix).
 *
 * THE BUG THIS KILLS (Cal: "the panels are oversized"): the old layer drew
 * FIXED-pixel panels (9×14px) over a Google *embed* iframe that picks its own
 * zoom — the `z=20` param isn't honoured reliably, so whenever the embed
 * rendered zoomed-out, fixed-px panels read as garden-sized slabs.
 *
 * Now the map is OURS end-to-end, the Design Studio's own system (ONE scale
 * everywhere): OSM Nominatim geocodes (keyless) → SatTiles paints Esri imagery
 * for a view WE control → panel pixels are COMPUTED from real metres via
 * roofGeo's Web-Mercator maths at the current zoom + container width. A panel
 * is 1.134×1.722 m on every screen, at every zoom, full stop.
 *
 * Still honest: keyless Nominatim is weak on bare Eircodes (the hint says so —
 * add the street). Level 2 (Google Solar auto-detect) is unchanged and layers
 * in when the Maps key is live. "Rough layout, confirmed at survey" framing stays.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { MapPin, Pencil, RotateCcw, Sparkles, Loader2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Check, Plus, Minus } from 'lucide-react';
import { detectRoof, hasMapsKey, type RoofInsight } from '@/lib/googleSolar';
import { osmGeocode } from '@/lib/roofImagery';
import { mppAt, IMG_LOGICAL_W, type MapView } from '@/lib/roofGeo';
import SatTiles from '@/components/SatTiles';

// Real panel footprint in METRES — pixels are derived, never hardcoded.
const PANEL_W_M = 1.134;
const PANEL_H_M = 1.722;
const GAP_M = 0.05;
const MAX_PANELS = 40;

type Rect = { x: number; y: number; w: number; h: number };

export default function RoofDesigner({
  panelWatts,
  onChange,
}: {
  panelWatts: number;
  onChange?: (roof: { panels: number; kwp: number; address: string }) => void;
}) {
  const [address, setAddress] = useState('45 Griffith Avenue, Drumcondra, Dublin 9');
  const [view, setView] = useState<MapView | null>(null);
  const [finding, setFinding] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [rotation, setRotation] = useState(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // TRUE SCALE: container px per metre, from the measured box width.
  const [containerW, setContainerW] = useState(0);
  // Level 2: Google Solar auto-detect (unchanged)
  const [checking, setChecking] = useState(false);
  const [auto, setAuto] = useState<RoofInsight | null>(null);
  const [autoUsed, setAutoUsed] = useState(false);
  const [noCoverage, setNoCoverage] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setContainerW(entries[0]?.contentRect.width ?? 0));
    ro.observe(el);
    setContainerW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Metres → container pixels for the CURRENT view. The whole fix in one line:
  // SatTiles spans IMG_LOGICAL_W logical px across the container, and mppAt is
  // exact Web-Mercator — so a metre is always the same fraction of the screen
  // as it is of the ground.
  const pxPerM = view && containerW > 0 ? (containerW / IMG_LOGICAL_W) / mppAt(view.lat, view.zoom) : 0;
  const PW = PANEL_W_M * pxPerM;
  const PH = PANEL_H_M * pxPerM;
  const GAP = GAP_M * pxPerM;

  const emit = useCallback((r: Rect | null, ppm: number) => {
    if (!r || ppm <= 0) { onChange?.({ panels: 0, kwp: 0, address }); return; }
    const pw = PANEL_W_M * ppm, ph = PANEL_H_M * ppm, gap = GAP_M * ppm;
    const cols = Math.max(0, Math.floor((r.w + gap) / (pw + gap)));
    const rows = Math.max(0, Math.floor((r.h + gap) / (ph + gap)));
    const panels = Math.min(MAX_PANELS, cols * rows);
    onChange?.({ panels, kwp: Math.round((panels * panelWatts) / 100) / 10, address });
  }, [onChange, panelWatts, address]);

  const find = async () => {
    setRect(null); setRotation(0); emit(null, 0); setDrawing(false);
    setAuto(null); setAutoUsed(false); setNoCoverage(false); setNotFound(false);
    setFinding(true);
    const hit = await osmGeocode(address);
    setFinding(false);
    if (hit) setView({ lat: hit.lat, lng: hit.lng, zoom: 20 });
    else setNotFound(true);
    if (!hasMapsKey()) return; // keyless Level 1 only
    setChecking(true);
    const insight = await detectRoof(address);
    setChecking(false);
    if (insight) setAuto(insight); else setNoCoverage(true);
  };
  const useAuto = () => { if (auto) { onChange?.({ panels: auto.panels, kwp: auto.kwp, address }); setAutoUsed(true); } };

  // Find the default address once on mount, so the box never sits empty.
  useEffect(() => { void find(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Pan (arrows) + zoom — the view is OURS now, so scale stays true through both.
  const panView = (dxPx: number, dyPx: number) => {
    if (!view || containerW <= 0) return;
    const mpp = mppAt(view.lat, view.zoom) * (IMG_LOGICAL_W / containerW); // metres per CONTAINER px
    const dLng = (dxPx * mpp) / (111320 * Math.cos((view.lat * Math.PI) / 180));
    const dLat = -(dyPx * mpp) / 110574;
    setView({ ...view, lat: view.lat + dLat, lng: view.lng + dLng });
  };
  const zoomView = (dz: number) => {
    if (!view) return;
    const z = Math.min(21, Math.max(18, view.zoom + dz));
    setView({ ...view, zoom: z });
    // Panel px change with zoom; the drawn RECT is screen-space, so re-emit.
    setRect(r => { if (r) emit(r, (containerW / IMG_LOGICAL_W) / mppAt(view.lat, z)); return r; });
  };

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
      const valid = !!(r && r.w > PW && r.h > PH); // must fit at least one REAL panel
      emit(valid ? r : null, pxPerM);
      if (valid) setDrawing(false);
      return valid ? r : null;
    });
  };

  // Drag the finished box to move it.
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

  // Panel grid inside the drawn rect — TRUE-scale cells.
  const panels: Array<{ left: number; top: number }> = [];
  if (rect && pxPerM > 0) {
    const cols = Math.floor((rect.w + GAP) / (PW + GAP));
    const rows = Math.floor((rect.h + GAP) / (PH + GAP));
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++)
      if (panels.length < MAX_PANELS) panels.push({ left: c * (PW + GAP), top: r * (PH + GAP) });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={address} onChange={e => setAddress(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') find(); }}
            placeholder="Your address (street + town works best)"
            className="w-full h-10 pl-9 pr-3 rounded-control border border-border bg-background text-sm" />
        </div>
        <button onClick={find} disabled={finding}
          className="h-10 px-3 rounded-control bg-primary text-primary-foreground text-xs font-semibold shrink-0 hover:opacity-90 transition-opacity disabled:opacity-60">
          {finding ? <Loader2 className="size-4 animate-spin" /> : 'Find'}
        </button>
      </div>

      {notFound && (
        <p className="mt-2 text-2xs text-muted-foreground">Couldn't pin that address on the free map — Eircodes alone often miss here. Add the street + town and try again.</p>
      )}

      {/* Level 2 — Google Solar auto-detect (unchanged) */}
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

      {/* THE MAP — ours end-to-end. aspect-[16/9] keeps the projection square
          on both axes (the studio's own rule), so metres never stretch. */}
      <div ref={boxRef} className="relative mt-2 aspect-[16/9] rounded-panel overflow-hidden border border-border bg-muted select-none touch-none">
        {view ? (
          <SatTiles view={view} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-2xs text-muted-foreground">
            {finding ? 'Finding your roof…' : 'Enter your address above to load the satellite view.'}
          </div>
        )}

        {/* draw layer */}
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
                <div key={i} className="absolute rounded-[1px] bg-primary/85 border border-white/40"
                  style={{ left: p.left, top: p.top, width: PW, height: PH }} />
              ))}
            </div>
          )}
        </div>

        {/* draw-mode overlay */}
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
                Press, drag across the roof, let go. Real-size panels fill it automatically.
              </p>
            </div>
          </div>
        )}

        {/* view controls — pan + zoom (the view is ours now) */}
        {view && !drawing && (
          <div className="absolute top-2 right-2 z-30 flex flex-col gap-1">
            {([[ArrowUp, 0, -60], [ArrowDown, 0, 60], [ArrowLeft, -60, 0], [ArrowRight, 60, 0]] as const).map(([Ic, dx, dy], i) => (
              <button key={i} onClick={() => panView(dx, dy)} aria-label="Pan the map"
                className="size-7 grid place-items-center rounded-control bg-background/90 shadow-card hover:bg-background transition-colors">
                <Ic className="size-3.5" />
              </button>
            ))}
            <button onClick={() => zoomView(1)} aria-label="Zoom in" className="size-7 grid place-items-center rounded-control bg-background/90 shadow-card hover:bg-background transition-colors"><Plus className="size-3.5" /></button>
            <button onClick={() => zoomView(-1)} aria-label="Zoom out" className="size-7 grid place-items-center rounded-control bg-background/90 shadow-card hover:bg-background transition-colors"><Minus className="size-3.5" /></button>
          </div>
        )}

        {/* action controls */}
        <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center gap-2 flex-wrap">
          {!drawing && !rect && view && (
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
              <button onClick={() => { setRect(null); setRotation(0); emit(null, 0); setDrawing(true); }}
                className="inline-flex h-9 items-center gap-1.5 rounded-control bg-background/95 px-3 text-2xs font-semibold shadow-card hover:bg-background transition-colors">
                <RotateCcw className="size-3.5" /> Redraw
              </button>
            </>
          )}
        </div>
      </div>

      {/* fine-tuning */}
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
          ? 'Panels are drawn at their real size for this view — still a rough layout; the exact count and positions are measured at your free survey.'
          : 'Find your address above, then draw a box over your roof. Real-size panels fill it automatically and your estimate updates as you go.'}
      </p>
    </div>
  );
}
