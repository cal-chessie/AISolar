/**
 * DesignStudio — the heart of every installer's business.
 *
 * The design step, rebuilt from a blank map iframe + a fake centred CSS grid
 * into a real cockpit: it drops the customer's ACTUAL roof (Google Static Maps
 * satellite image, which — unlike the maps.google.com embed — always renders),
 * lets the consultant DRAG and ROTATE the panel array onto the real roof plane,
 * reads the max fit from Google Solar, sizes the system live, and recommends the
 * gear as real products. Every number runs off the same spine as the proposal
 * (occupancy → self-consumption → savings), so what the consultant lands on IS
 * the proposal.
 *
 * Coverage: Google has most of urban Ireland. Where it doesn't (rural, e.g.
 * Roscommon) the image and Solar read fall back to a designed roof plane sized
 * from the survey — never a blank box, never blocked.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Sun, Zap, Battery, TrendingUp, Plus, Minus, Sparkles, Loader2, CheckCircle2, Satellite, RotateCw, Move, Maximize2, ArrowLeftRight, Expand, X, Droplets, Crosshair, AlertTriangle, Info } from 'lucide-react';
import { buildingInsights, geocode as googleGeocode, hasMapsKey, type RoofInsight } from '@/lib/googleSolar';
import { RoofImagery } from '@/components/SatTiles';
import { osmGeocode } from '@/lib/roofImagery';
import { geoToPct, pctToGeo, type MapView, IMG_LOGICAL_W, IMG_LOGICAL_H, PANEL_GAP_M, mppAt, type PlacedArray } from '@/lib/roofGeo';
import { computeQuote, ratesFromIntake, IE_ENERGY } from '@/lib/leadIntake';
import { getProductsByKind, getProduct, type CatalogProduct } from '@/config/productCatalog';
import { seaiPropertyType } from '@/lib/seaiPipeline';
import { Kpi, eurCompact } from '@/components/consultant/cockpitUi';
import { cn } from '@/lib/utils';
import type { DummyLead } from '@/lib/dummyData';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const PANEL_WATTS = 440;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Accurate sizing: the satellite image is requested at this zoom and logical
// width, so its ground scale is known. A residential panel is ~1.134 × 1.722 m
// (portrait). Drawing panels to that real footprint is what stops consultants
// from sizing a system the roof can't physically hold.
// z19 is Esri World Imagery's native depth over Ireland — the studio OPENS at
// the sharpest real imagery. Zooming to 20 is allowed but upsamples (soft).
const STUDIO_ZOOM = 19;
const PANEL_W_M = 1.134;
const PANEL_H_M = 1.722;

// Geo model: shared with the customer proposal (src/lib/roofGeo.ts) — one
// projection, so the design snapshot on the proposal is pixel-identical to
// what the consultant placed here. One string per roof face (Cal).
/** A pleasing landscape grid for N panels (wider than tall, like a real roof). */
function defaultCols(count: number) {
  return Math.max(2, Math.min(count, Math.round(Math.sqrt(count * 1.9))));
}

export default function DesignStudio({ lead, designData, setDesignData, estimate, onSetEircode }: {
  lead: DummyLead;
  designData: any;
  setDesignData: (data: any) => void;
  estimate: any;
  /** Cal's real bill has NO eircode (rural townland address) — the consultant
   *  sets it right here on the map header and everything re-anchors. */
  onSetEircode?: (eircode: string) => void;
}) {
  const eircode = ((lead.intake ?? {}) as Record<string, unknown>).extracted_eircode as string
    ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0] ?? '';
  const address = lead.address;
  // Eircode first: an Irish townland address ("Ben, Fore, Co Westmeath") can
  // geocode to the wrong house or nothing; the eircode pins the exact door.
  const roofQuery = eircode ? `${eircode}, Ireland` : (address || 'Dublin');
  const update = (field: string, value: any) => setDesignData({ ...designData, [field]: value });
  const patch = (fields: Record<string, any>) => setDesignData({ ...designData, ...fields });

  // ── Satellite image (Google Static Maps, address-keyed) + Solar roof fit ──
  // center=<address> geocodes server-side, so the image paints without a client
  // geocode (localhost CORS never touches it). The Solar panel-fit is best-effort
  // on OSM coords and may CORS-fail — the image never depends on it.
  const [roofInsight, setRoofInsight] = useState<RoofInsight | null>(null);
  // The geocoded centre drives the ground scale (metres-per-pixel), so panels
  // are drawn at their REAL footprint on the roof — not an arbitrary size.
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  // The live map view (pan + zoom). Null until the geocode gives us a centre.
  const [view, setView] = useState<MapView | null>(null);
  const [panPx, setPanPx] = useState<{ dx: number; dy: number } | null>(null);
  // Imagery renders from Esri World Imagery tiles keyed to the live view —
  // Google Static Maps stopped serving satellite in the EEA (27 Jul), so the
  // tiles ARE the roof now (SatTiles shares roofGeo's exact projection).
  // Layout: map on the left by default; the consultant can flip it to the right.
  const [mapSide, setMapSide] = useState<'left' | 'right'>('left');
  const [fullscreen, setFullscreen] = useState(false);
  const [editingLoc, setEditingLoc] = useState(false);
  const [locDraft, setLocDraft] = useState('');
  const lastQuery = useRef('');
  useEffect(() => {
    if (lastQuery.current === roofQuery) return;
    lastQuery.current = roofQuery;
    let live = true;
    // TRUST CHAIN (Cal's "nothing's accurate" bug): Google geocode resolves
    // eircodes exactly — but needs the Geocoding API enabled. OSM CANNOT
    // resolve Eircodes (proprietary DB — it returns the city centre), so it
    // only ever gets the ADDRESS, and only when there's no eircode. If neither
    // gives a trusted centre we keep the address/eircode-keyed image (Google
    // geocodes it server-side, so the HOUSE is right) and simply leave pan off.
    (async () => {
      const g = await googleGeocode(roofQuery);
      if (g) return g;
      if (!eircode && address) return await osmGeocode(address);
      return null;
    })().then(loc => {
      if (!live) return;
      if (!loc) {
        // Eircode set but no trusted client geocode: drop the live view so the
        // image re-keys to the eircode (Google pins the right house server-side).
        if (eircode) setView(null);
        return;
      }
      setCenter(loc);
      const v0: MapView = { lat: loc.lat, lng: loc.lng, zoom: STUDIO_ZOOM };
      setView(v0);
      // Upgrade any %-anchored arrays to real coordinates so pan/zoom carries them.
      setDesignData((prev: any) => {
        const list: PlacedArray[] = prev.arrays ?? [{
          id: 's1', name: 'String 1',
          panelCount: prev.panelCount || 14,
          cols: Math.max(1, prev.arrayCols ?? defaultCols(prev.panelCount || 14)),
          rot: prev.arrayRot ?? 0,
          xPct: prev.arrayX ?? 50, yPct: prev.arrayY ?? 52,
          lat: null, lng: null,
        }];
        return {
          ...prev,
          arrays: list.map(a => a.lat != null ? a : { ...a, ...pctToGeo(v0, a.xPct, a.yPct) }),
        };
      });
      if (hasMapsKey()) buildingInsights(loc.lat, loc.lng).then(ins => { if (live) setRoofInsight(ins); });
    });
    return () => { live = false; };
  }, [roofQuery]);

  const hasImage = !!view;
  const maxPanels = roofInsight?.panels ?? 40;

  // ── Gear (real products) ────────────────────────────────────────────────
  const panels = useMemo(() => getProductsByKind('panel'), []);
  const inverters = useMemo(() => getProductsByKind('inverter'), []);
  const batteries = useMemo(() => getProductsByKind('battery'), []);
  const diverters = useMemo(() => getProductsByKind('diverter'), []);
  const chargers = useMemo(() => getProductsByKind('charger'), []);
  const selPanel = getProduct(designData.panelModel, 'panel');
  const panelWatts = selPanel?.watts ?? (parseFloat(selPanel?.spec?.match(/(\d+)\s*W/i)?.[1] ?? '') || PANEL_WATTS);
  // The SELECTED panel's real dimensions drive the on-roof footprint (every model
  // is a different size). Falls back to a typical panel if the catalog lacks dims.
  const panelWm = selPanel?.widthM ?? PANEL_W_M;
  const panelHm = selPanel?.heightM ?? PANEL_H_M;

  // ── ONE quote engine (computeQuote) — same numbers as proposal + portal ──
  const count = designData.panelCount;
  const systemSizeKw = Math.round((count * panelWatts) / 100) / 10;
  const diverterPrice = designData.includeDiverter ? ((getProduct(designData.diverterModel, 'diverter') ?? diverters[0])?.price ?? 0) : 0;
  const chargerPrice = designData.includeCharger ? ((getProduct(designData.chargerModel, 'charger') ?? chargers[0])?.price ?? 0) : 0;
  const intake = (lead.intake ?? {}) as Record<string, unknown>;
  const quote = computeQuote({
    systemSizeKw,
    batteryKwh: designData.includeBattery ? (designData.batterySize || 5) : 0,
    addOnsCost: diverterPrice + chargerPrice,
    roof: {
      orientation: designData.roofOrientation ?? lead.survey?.roof_orientation,
      pitchDeg: designData.roofPitch ?? lead.survey?.roof_pitch,
      shading: lead.survey?.shading ?? designData.shading,
    },
    occupancy: { occupants: lead.survey?.household_occupants, homeDuringDay: lead.survey?.home_during_day },
    rates: ratesFromIntake(intake),
    annualUseKwh: lead.annual_kwh || estimate.annualKwh,
    propertyType: seaiPropertyType((lead.survey as Record<string, unknown> | undefined)?.property_type as string ?? intake['property_type'] as string),
  });
  const { yieldFactor, productionKwh: production, selfConsumption, annualSavings, grossCost, seaiGrant, netCost, paybackYears } = quote;
  const coverage = quote.coveragePct ?? 0;
  const setPanelCount = (n: number) => update('panelCount', clamp(n, 4, maxPanels));

  // ── MULTI-ARRAY MODEL: one STRING per roof face ─────────────────────────
  // Each array is its own placeable block (front roof, back roof, side…) with
  // its own count/columns/rotation. Arrays are anchored to REAL geo-coordinates
  // once the geocode resolves, so they stay glued to their roof when the map
  // pans or zooms. Legacy single-array designs migrate on first render.
  const arrays: PlacedArray[] = designData.arrays ?? [{
    id: 's1', name: 'String 1',
    panelCount: designData.panelCount || 14,
    cols: clamp(designData.arrayCols ?? defaultCols(designData.panelCount || 14), 1, designData.panelCount || 14),
    rot: designData.arrayRot ?? 0,
    xPct: designData.arrayX ?? 50, yPct: designData.arrayY ?? 52,
    lat: null, lng: null,
  }];
  const totalPanels = arrays.reduce((s, a) => s + a.panelCount, 0);
  // Keep the legacy fields in sync so LeadFlow's cost breakdown, SEAI memo and
  // SendStep keep reading the same designData shape untouched.
  const commitArrays = (next: PlacedArray[]) => patch({
    arrays: next,
    panelCount: next.reduce((s, a) => s + a.panelCount, 0),
    strings: next.length,
  });
  const updateArray = (id: string, fields: Partial<PlacedArray>) =>
    commitArrays(arrays.map(a => (a.id === id ? { ...a, ...fields } : a)));

  const [selId, setSelId] = useState('s1');
  const sel = arrays.find(a => a.id === selId) ?? arrays[0];

  // ── THE MAP VIEW: pan + zoom on real geo-coordinates ────────────────────
  // The Static Maps image re-centres on {lat,lng,zoom}; before the geocode
  // resolves we fall back to the address-keyed image (no pan — nothing to
  // anchor to). This geo model is exactly what a tile map (MapLibre) would
  // need, so a later swap to live tiles keeps the arrays as-is.
  const canvasRef = useRef<HTMLDivElement>(null);

  // Ground scale at the CURRENT view — the array is drawn as a fraction of the
  // map's real width (metres ÷ metres-across-the-image), so panel footprints
  // stay accurate at any zoom, any canvas size, fullscreen or flipped.
  const scaleLat = view?.lat ?? center?.lat ?? null;
  const scaleZoom = view?.zoom ?? STUDIO_ZOOM;
  const metresPerLogicalPx = scaleLat != null ? mppAt(scaleLat, scaleZoom) : null;
  const groundWidthM = metresPerLogicalPx ? metresPerLogicalPx * IMG_LOGICAL_W : null;
  const accurate = groundWidthM != null;
  const cellAspect = panelWm / panelHm;
  const widthPctFor = (a: PlacedArray) => {
    const m = a.cols * panelWm + (a.cols - 1) * PANEL_GAP_M;
    return accurate ? (m / groundWidthM!) * 100 : Math.min(46, 12 + a.cols * 5);
  };
  const gapPctFor = (a: PlacedArray) => (PANEL_GAP_M / (a.cols * panelWm + (a.cols - 1) * PANEL_GAP_M)) * 100;
  /** Where an array renders in the CURRENT view: geo-anchored when it can be. */
  const renderPos = (a: PlacedArray) =>
    view && a.lat != null && a.lng != null ? geoToPct(view, a.lat, a.lng) : { x: a.xPct, y: a.yPct };

  // One drag machine: grabbing an array moves THAT array; grabbing open map pans.
  const drag = useRef<
    | { kind: 'array'; id: string; offX: number; offY: number }
    | { kind: 'pan'; startX: number; startY: number; startView: MapView }
    | null
  >(null);
  const pctOf = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, r };
  };
  const startArrayDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const a = arrays.find(x => x.id === id)!;
    const pos = renderPos(a);
    const p = pctOf(e);
    setSelId(id);
    drag.current = { kind: 'array', id, offX: p.x - pos.x, offY: p.y - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (!view) return; // nothing to pan before the geocode lands
    // Presses on the canvas's own controls (zoom/recentre/fullscreen/eircode)
    // must stay CLICKS — capturing the pointer here cancels the button's click
    // entirely (the "zoom buttons do nothing" bug).
    if ((e.target as HTMLElement).closest('button, form, input, a')) return;
    drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, startView: view };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !canvasRef.current) return;
    if (d.kind === 'array') {
      const p = pctOf(e);
      const x = clamp(p.x - d.offX, 4, 96);
      const y = clamp(p.y - d.offY, 4, 96);
      const geo = view ? pctToGeo(view, x, y) : null;
      updateArray(d.id, { xPct: x, yPct: y, ...(geo ? { lat: geo.lat, lng: geo.lng } : {}) });
      if (!designData.arrayMoved) update('arrayMoved', true);
    } else {
      setPanPx({ dx: e.clientX - d.startX, dy: e.clientY - d.startY });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d?.kind === 'pan' && panPx && canvasRef.current) {
      // Commit the pan: the point that was under the cursor stays under it.
      const r = canvasRef.current.getBoundingClientRect();
      const dxPct = (panPx.dx / r.width) * 100;
      const dyPct = (panPx.dy / r.height) * 100;
      const c = pctToGeo(d.startView, 50 - dxPct, 50 - dyPct);
      setView({ ...d.startView, lat: c.lat, lng: c.lng });
    }
    setPanPx(null);
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };
  // Persist the view so the SEND step can redraw this exact frame on the
  // customer's proposal (the design snapshot).
  useEffect(() => { if (view) setDesignData((prev: any) => ({ ...prev, mapView: view })); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [view?.lat, view?.lng, view?.zoom]);
  const setZoom = (z: number) => view && setView({ ...view, zoom: clamp(z, 17, 20) });
  const recentre = () => center && setView({ lat: center.lat, lng: center.lng, zoom: STUDIO_ZOOM });
  const setSelCount = (n: number) => {
    const c = clamp(n, 1, 60);
    updateArray(sel.id, { panelCount: c, cols: clamp(sel.cols, 1, c) });
  };
  const setSelCols = (n: number) => updateArray(sel.id, { cols: clamp(n, 1, sel.panelCount) });
  /** Good · Better · Best — panels + battery in ONE patch (two patches in the
   *  same tick would clobber each other; patch() spreads current designData). */
  const applyPreset = (tier: 'essential' | 'recommended' | 'max') => {
    const use = lead.annual_kwh || estimate.annualKwh || 0;
    const perPanelKwh = (panelWatts / 1000) * IE_ENERGY.YIELD_PER_KWP * yieldFactor;
    const billTarget = use > 0 && perPanelKwh > 0 ? Math.ceil(use / perPanelKwh) : totalPanels;
    const goal = tier === 'essential' ? Math.max(6, Math.ceil(billTarget * 0.7))
      : tier === 'recommended' ? billTarget
      : (roofInsight?.panels ?? Math.ceil(billTarget * 1.3));
    // The preset sizes the SELECTED string; other roof faces stay as placed.
    const others = totalPanels - sel.panelCount;
    const mine = clamp(goal - others, 2, 60);
    const next = arrays.map(a => a.id === sel.id ? { ...a, panelCount: mine, cols: clamp(a.cols, 1, mine) } : a);
    patch({
      arrays: next,
      panelCount: next.reduce((s, a) => s + a.panelCount, 0),
      strings: next.length,
      includeBattery: tier !== 'essential',
      ...(tier === 'recommended' ? { batteryModel: 'SolaX Triple Power T-BAT 5.8kWh', batterySize: 5.8 } : {}),
      ...(tier === 'max' ? { batteryModel: 'SolaX Triple Power 11.6kWh (2×5.8)', batterySize: 11.6 } : {}),
    });
  };
  /** Cal: "add a string = panels on ANOTHER roof". New block lands beside the
   *  selected one, inherits its rotation, and becomes the selection. */
  const addString = () => {
    const id = `s${Date.now().toString(36)}`;
    const base = renderPos(sel);
    const x = clamp(base.x + 18, 6, 94);
    const y = clamp(base.y + 6, 6, 94);
    const geo = view ? pctToGeo(view, x, y) : null;
    commitArrays([...arrays, {
      id, name: `String ${arrays.length + 1}`, panelCount: 6, cols: 3, rot: sel.rot,
      xPct: x, yPct: y, lat: geo?.lat ?? null, lng: geo?.lng ?? null,
    }]);
    setSelId(id);
  };
  const overMax = roofInsight != null && totalPanels > roofInsight.panels;

  const roofPane = (
    <div className="rounded-panel border border-border/70 bg-card shadow-card overflow-hidden">
      <header className="flex items-center gap-2 px-4 h-11 border-b border-border shrink-0">
        <Satellite className="size-4 text-tech" />
        <h3 className="text-sm font-semibold">The roof</h3>
        <RoofBadge hasImage={hasImage} insight={roofInsight} />
        <div className="ml-auto flex items-center gap-2">
          {editingLoc ? (
            <form className="flex items-center gap-1" onSubmit={e => { e.preventDefault(); const v = locDraft.trim().toUpperCase(); if (v) onSetEircode?.(v); setEditingLoc(false); }}>
              <input autoFocus value={locDraft} onChange={e => setLocDraft(e.target.value.toUpperCase())} placeholder="D04 X2C1" maxLength={8}
                className="h-6 w-24 rounded-control border border-tech bg-background px-1.5 text-2xs font-mono uppercase outline-none" aria-label="Eircode" />
              <button type="submit" className="h-6 px-1.5 rounded-control bg-tech text-white text-2xs font-semibold">Set</button>
            </form>
          ) : eircode ? (
            <button type="button" onClick={() => { setLocDraft(eircode); setEditingLoc(true); }}
              title="Change the eircode (re-centres the map)"
              className="text-2xs text-muted-foreground font-mono hover:text-tech transition-colors">{eircode}</button>
          ) : (
            <button type="button" onClick={() => { setLocDraft(''); setEditingLoc(true); }}
              title="The bill had no eircode — set it to pin the exact roof"
              className="h-6 px-2 rounded-control border border-dashed border-pop text-pop text-2xs font-semibold hover:bg-pop-subtle">
              + Eircode
            </button>
          )}
          <button onClick={() => setFullscreen(f => !f)} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            className="size-7 grid place-items-center rounded-control hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            {fullscreen ? <X className="size-4" /> : <Expand className="size-4" />}
          </button>
        </div>
      </header>

      <div
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        className={cn('relative aspect-[16/9] overflow-hidden bg-slate-900 select-none touch-none', view && 'cursor-grab active:cursor-grabbing')}
      >
        {/* Pan layer — the image and every array shift together while dragging the map */}
        <div className="absolute inset-0" style={panPx ? { transform: `translate(${panPx.dx}px, ${panPx.dy}px)` } : undefined}>
          {view && <RoofImagery view={view} />}
          {!hasImage && (
            <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 20%, #1e293b, #0b1220)' }}>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[8deg]"
                style={{ width: '58%', height: '46%', background: 'linear-gradient(160deg,#334155,#1e293b)', borderRadius: 6, boxShadow: '0 12px 40px rgba(0,0,0,.5)' }} aria-hidden />
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />

          {/* The strings — each its own draggable array on its own roof face */}
          {arrays.map(a => {
            const pos = renderPos(a);
            const isSel = a.id === sel.id;
            return (
              <div
                key={a.id} role="group" aria-label={`${a.name}, drag to place`}
                onPointerDown={e => startArrayDrag(e, a.id)}
                className="absolute touch-none cursor-grab active:cursor-grabbing"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${widthPctFor(a)}%`, transform: `translate(-50%,-50%) rotate(${a.rot}deg)`, zIndex: isSel ? 3 : 2 }}
              >
                <span className={cn('absolute -top-5 left-1/2 -translate-x-1/2 text-2xs font-semibold px-1.5 py-0.5 rounded-control whitespace-nowrap pointer-events-none',
                  isSel ? 'bg-tech text-white' : 'bg-background/85 text-muted-foreground')}>
                  {a.name} · {a.panelCount}
                </span>
                <div className={cn('rounded-[2px] shadow-[0_4px_16px_rgba(0,0,0,.45)]', isSel ? 'ring-2 ring-tech/90' : 'ring-1 ring-white/50')}
                  style={{ background: 'rgba(15,23,42,.35)' }}>
                  <div className="grid" style={{ gridTemplateColumns: `repeat(${a.cols}, 1fr)`, gap: `${gapPctFor(a)}%` }}>
                    {Array.from({ length: a.panelCount }).map((_, i) => (
                      <span key={i} style={{
                        aspectRatio: cellAspect,
                        background: 'linear-gradient(150deg, #24365c 0%, #152b4a 40%, #0a1220 100%)',
                        boxShadow: 'inset 0 0 0 0.5px rgba(150,190,240,.55), inset 0 1px 2px rgba(255,255,255,.12)',
                        borderRadius: 1.5,
                      }} />
                    ))}
                  </div>
                </div>
                {isSel && (
                  <>
                    <span className="absolute -left-1 -top-1 size-1.5 rounded-full bg-tech ring-1 ring-white/70" />
                    <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-tech ring-1 ring-white/70" />
                    <span className="absolute -left-1 -bottom-1 size-1.5 rounded-full bg-tech ring-1 ring-white/70" />
                    <span className="absolute -right-1 -bottom-1 size-1.5 rounded-full bg-tech ring-1 ring-white/70" />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Fixed overlays — these do NOT pan with the map */}
        <div className="absolute top-2 left-2 bg-background/85 backdrop-blur text-2xs px-2 py-1 rounded-control font-medium flex items-center gap-1.5 z-10">
          <span className="text-tech font-bold">N↑</span>
          <span className="text-muted-foreground">{designData.roofOrientation || 'S'} · {designData.roofPitch || 30}°</span>
        </div>
        {arrays.length === 1 && !designData.arrayMoved && (
          <div className="absolute top-2 right-2 bg-tech/90 text-white text-2xs px-2 py-1 rounded-control font-medium flex items-center gap-1 shadow-card z-10">
            <Move className="size-3" /> Drag onto the roof
          </div>
        )}
        {view && (
          <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
            <button aria-label="Zoom in" onClick={() => setZoom(view.zoom + 1)} disabled={view.zoom >= 20}
              className="size-8 grid place-items-center rounded-control bg-background/90 backdrop-blur shadow-card hover:bg-background disabled:opacity-40"><Plus className="size-4" /></button>
            <button aria-label="Zoom out" onClick={() => setZoom(view.zoom - 1)} disabled={view.zoom <= 17}
              className="size-8 grid place-items-center rounded-control bg-background/90 backdrop-blur shadow-card hover:bg-background disabled:opacity-40"><Minus className="size-4" /></button>
            <button aria-label="Recentre on the house" onClick={recentre}
              className="size-8 grid place-items-center rounded-control bg-background/90 backdrop-blur shadow-card hover:bg-background"><Crosshair className="size-4" /></button>
          </div>
        )}
      </div>

      {/* Read-out line */}
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border-t border-border">
        {roofInsight ? (
          <>
            <span className="flex items-center gap-1.5 text-tech font-medium"><Satellite className="size-3.5" /> Google Solar read this roof</span>
            <span className="text-muted-foreground">fits up to <strong className="text-foreground tabular-nums">{roofInsight.panels}</strong> panels ({roofInsight.kwp} kWp)</span>
          </>
        ) : hasImage ? (
          <span className="text-muted-foreground">Live satellite. Drag the map to move around, zoom with the buttons, drag each string onto its roof.</span>
        ) : (
          <span className="text-muted-foreground">No satellite here. Placed on a roof plane, sized from the survey.</span>
        )}
      </div>
    </div>
  );

  // Compact controls card — sits BELOW the map. Panels / columns / strings / rotate.
  const stepper = (label: string, val: number | string, dec: () => void, inc: () => void, extra?: React.ReactNode) => (
    <div className="flex items-center gap-1">
      <span className="label-micro mr-0.5">{label}</span>
      <button onClick={dec} className="size-7 rounded-control border border-border grid place-items-center hover:bg-muted transition-colors"><Minus className="size-3.5" /></button>
      <span className="text-sm font-semibold tabular-nums w-6 text-center">{val}</span>
      <button onClick={inc} className="size-7 rounded-control border border-border grid place-items-center hover:bg-muted transition-colors"><Plus className="size-3.5" /></button>
      {extra}
    </div>
  );
  const controlsStrip = (
    <div className="rounded-panel border border-border/70 bg-card shadow-card p-2.5 space-y-2">
      {/* The strings — one per roof face. Click to select, X to remove, + to add. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {arrays.map(a => (
          <button key={a.id} type="button" onClick={() => setSelId(a.id)}
            className={cn('h-7 pl-2.5 rounded-control text-2xs font-semibold flex items-center gap-1.5 border transition-colors',
              arrays.length > 1 ? 'pr-1' : 'pr-2.5',
              a.id === sel.id ? 'bg-tech text-white border-tech' : 'bg-card border-border text-muted-foreground hover:text-foreground')}>
            {a.name} · {a.panelCount}
            {arrays.length > 1 && (
              <span role="button" aria-label={`Remove ${a.name}`}
                onClick={e => {
                  e.stopPropagation();
                  const next = arrays.filter(x => x.id !== a.id);
                  commitArrays(next);
                  if (sel.id === a.id) setSelId(next[0].id);
                }}
                className={cn('size-4 grid place-items-center rounded-full hover:bg-black/25', a.id === sel.id ? 'text-white/85' : 'text-muted-foreground')}>
                <X className="size-3" />
              </span>
            )}
          </button>
        ))}
        <button type="button" onClick={addString}
          className="h-7 px-2.5 rounded-control border border-dashed border-tech text-tech text-2xs font-semibold flex items-center gap-1 hover:bg-tech-subtle">
          <Plus className="size-3" /> String (another roof)
        </button>
        {overMax && roofInsight && (
          <span className="h-7 px-2.5 rounded-control bg-pop-subtle text-pop text-2xs font-semibold flex items-center gap-1 ml-auto">
            <AlertTriangle className="size-3" /> {totalPanels} panels — over this roof's max fit ({roofInsight.panels})
          </span>
        )}
      </div>

      {/* Good · Better · Best — one tap sets the whole offer (panels + battery);
          everything below stays editable, so a preset is a start, not a cage. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-2xs font-semibold text-muted-foreground mr-1">Offer:</span>
        <button type="button" onClick={() => applyPreset('essential')}
          title="Panels only, sized under their bill — the price-led door-opener"
          className="h-7 px-2.5 rounded-control border border-border text-2xs font-semibold flex items-center gap-1 hover:bg-muted">
          Essential <span className="text-muted-foreground font-normal">panels only</span>
        </button>
        <button type="button" onClick={() => applyPreset('recommended')}
          title="Sized to their bill with evening battery cover — most homes land here"
          className="h-7 px-2.5 rounded-control border border-tech bg-tech-subtle text-tech text-2xs font-semibold flex items-center gap-1 hover:bg-tech/15">
          Recommended <span className="font-normal opacity-80">bill + battery</span>
        </button>
        <button type="button" onClick={() => applyPreset('max')}
          title={roofInsight ? `Google Solar max for this roof (${roofInsight.panels} panels) + the big battery` : 'Fill the roof + the big battery'}
          className="h-7 px-2.5 rounded-control border border-doc-deposit text-doc-deposit text-2xs font-semibold flex items-center gap-1 hover:bg-doc-deposit/10">
          Max roof <span className="font-normal opacity-80">{roofInsight ? `${roofInsight.panels} panels` : 'fill'} + 11.6kWh</span>
        </button>
      </div>

      {/* The SELECTED string's controls */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {stepper('Panels', sel.panelCount, () => setSelCount(sel.panelCount - 1), () => setSelCount(sel.panelCount + 1))}
        <div className="h-5 w-px bg-border" />
        {stepper('Cols', sel.cols, () => setSelCols(sel.cols - 1), () => setSelCols(sel.cols + 1),
          <span className="text-2xs text-muted-foreground ml-0.5">{Math.ceil(sel.panelCount / sel.cols)}×{sel.cols}</span>)}
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
          <RotateCw className="size-3.5 text-muted-foreground shrink-0" />
          <input type="range" min={-45} max={45} step={1} value={sel.rot}
            onChange={e => updateArray(sel.id, { rot: Number(e.target.value) })}
            aria-label={`Rotate ${sel.name}`} className="flex-1 accent-tech min-w-0" />
          <span className="text-2xs tabular-nums text-muted-foreground w-8 text-right shrink-0">{sel.rot}°</span>
        </div>
        {/* Quick actions size the TOTAL by adjusting the selected string */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <button
            onClick={() => {
              const use = lead.annual_kwh || estimate.annualKwh || 0;
              const perPanelKwh = (panelWatts / 1000) * IE_ENERGY.YIELD_PER_KWP * yieldFactor;
              if (use > 0 && perPanelKwh > 0) {
                const target = Math.ceil(use / perPanelKwh);
                setSelCount(target - (totalPanels - sel.panelCount));
              }
            }}
            title="Size the system to cover their annual usage"
            className="h-7 px-2.5 rounded-control border border-tech text-tech text-2xs font-semibold flex items-center gap-1 hover:bg-tech-subtle">
            <TrendingUp className="size-3" /> Size to bill
          </button>
          {roofInsight && (
            <button
              onClick={() => setSelCount(roofInsight.panels - (totalPanels - sel.panelCount))}
              title="Fill the roof to Google Solar's max"
              className="h-7 px-2.5 rounded-control bg-tech text-white text-2xs font-semibold flex items-center gap-1 hover:bg-tech/90">
              <Maximize2 className="size-3" /> Fill
            </button>
          )}
        </div>
      </div>

      {/* The string math, totalled */}
      <div className="flex items-center gap-2 text-2xs text-muted-foreground">
        {arrays.length > 2 && (
          <span className="flex items-center gap-1"><Info className="size-3 shrink-0" /> Most residential hybrids take 2 strings — check the inverter's MPPT count.</span>
        )}
        <span className="ml-auto tabular-nums shrink-0">
          {arrays.length} {arrays.length === 1 ? 'string' : 'strings'} · {totalPanels} panels · {systemSizeKw} kWp · {coverage}%
        </span>
      </div>
    </div>
  );

  // The gear (equipment) — the smaller side column.
  const gearPane = (
    <div className="rounded-panel border border-border/70 bg-card shadow-card">
      <header className="flex items-center gap-2 px-4 h-11 border-b border-border">
        <Zap className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">The gear</h3>
        <span className="ml-auto text-2xs text-muted-foreground">picks flow to the proposal</span>
      </header>
      <div className="p-3 space-y-3">
        <GearPicker kind="panel" label="Solar panels" options={panels} value={designData.panelModel} onPick={m => update('panelModel', m)} />
        <GearPicker kind="inverter" label="Inverter" options={inverters} value={designData.inverterModel} onPick={m => update('inverterModel', m)} />
        <div>
          <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <input type="checkbox" checked={designData.includeBattery} onChange={e => update('includeBattery', e.target.checked)} className="size-4 rounded border-input" />
            <span className="text-xs font-semibold flex items-center gap-1"><Battery className="size-3.5 text-doc-deposit" /> Add battery storage</span>
            <span className="text-2xs text-muted-foreground">
              {lead.survey?.home_during_day === 'out' ? '(out all day, so a battery carries the day to the evening peak)' : '(evening cover)'}
            </span>
          </label>
          {designData.includeBattery && (
            <GearPicker kind="battery" label="Battery" options={batteries} value={designData.batteryModel} onPick={m => {
              // The battery MODEL owns its kWh (Cal: deal strip said "13.5kWh"
              // while arbitrage priced 5). Parse capacity from the product and
              // keep batterySize in lockstep so every money line prices the
              // battery the consultant actually picked.
              const prod = batteries.find(b => b.model === m);
              const kwh = parseFloat(/([\d.]+)\s*kwh/i.exec(`${prod?.spec ?? ''} ${m}`)?.[1] ?? '');
              patch({ batteryModel: m, ...(Number.isFinite(kwh) && kwh > 0 ? { batterySize: kwh } : {}) });
            }} />
          )}
        </div>
        <div>
          <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <input type="checkbox" checked={!!designData.includeDiverter} onChange={e => update('includeDiverter', e.target.checked)} className="size-4 rounded border-input" />
            <span className="text-xs font-semibold flex items-center gap-1"><Droplets className="size-3.5 text-tech" /> Add hot-water diverter</span>
            <span className="text-2xs text-muted-foreground">(free hot water from surplus)</span>
          </label>
          {designData.includeDiverter && (
            <GearPicker kind="diverter" label="Diverter" options={diverters} value={designData.diverterModel} onPick={m => update('diverterModel', m)} />
          )}
        </div>
        <div>
          <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <input type="checkbox" checked={!!designData.includeCharger} onChange={e => update('includeCharger', e.target.checked)} className="size-4 rounded border-input" />
            <span className="text-xs font-semibold flex items-center gap-1"><Zap className="size-3.5 text-primary" /> Add EV charger</span>
            <span className="text-2xs text-muted-foreground">(charge off the roof)</span>
          </label>
          {designData.includeCharger && (
            <GearPicker kind="charger" label="EV charger" options={chargers} value={designData.chargerModel} onPick={m => update('chargerModel', m)} />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header + flip-sides toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sun className="h-5 w-5 text-doc-proposal" /> Design studio
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            Lay the array on {lead.name.split(' ')[0]}'s real roof. What you land here becomes the proposal.
          </p>
        </div>
        <button onClick={() => setMapSide(s => (s === 'left' ? 'right' : 'left'))}
          className="hidden lg:flex shrink-0 items-center gap-1.5 h-9 px-3 rounded-control border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Flip the map to the other side">
          <ArrowLeftRight className="size-3.5" /> Map {mapSide}
        </button>
      </div>

      {/* The design in four numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Kpi tone="tech" icon={<Sun />} value={`${systemSizeKw} kWp`} label={`${count} panels`} />
        <Kpi tone="deposit" icon={<TrendingUp />} value={eurCompact(annualSavings)} label="Saved / yr" />
        <Kpi tone="proposal" icon={<Zap />} value={`${production.toLocaleString()}`} label="kWh / yr" />
        <Kpi tone="neutral" icon={<CheckCircle2 />} value={`${coverage}%`} label="of their usage" />
      </div>

      {/* Map is the show-stopper (~63%); compact controls sit below it. Gear is
          the smaller side column. Flip swaps sides AND the widths, so the map
          stays the wide one wherever it lives. */}
      <div className={cn('grid gap-4 items-start', mapSide === 'left' ? 'lg:grid-cols-[1.7fr_1fr]' : 'lg:grid-cols-[1fr_1.7fr]')}>
        <div className={cn('space-y-3 min-w-0', mapSide === 'right' && 'lg:order-2')}>
          {fullscreen ? (
            <div className="rounded-panel border border-dashed border-border/70 bg-card/40 aspect-[16/9] grid place-items-center text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Expand className="size-4" /> Map open in the window</span>
            </div>
          ) : roofPane}
          {controlsStrip}
        </div>
        <div className={cn('space-y-3 min-w-0', mapSide === 'right' && 'lg:order-1')}>
          {/* System cost — the number the KPIs don't show. Net price after the grant. */}
          <div className="rounded-panel border border-border/70 bg-card shadow-card p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="label-micro flex items-center gap-1"><Sparkles className="size-3.5 text-doc-proposal" /> System cost</span>
              <span className="text-2xs text-muted-foreground tabular-nums shrink-0">{systemSizeKw} kWp · {count} panels</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums leading-none">{eur(netCost)}</span>
              <span className="text-xs text-muted-foreground">after the grant</span>
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              Gross <strong className="text-foreground tabular-nums">{eur(grossCost)}</strong>
              {quote.vatAmount > 0 && <> (incl. <strong className="text-foreground tabular-nums">{eur(quote.vatAmount)}</strong> VAT)</>}
              {' '}· SEAI grant <strong className="text-doc-proposal tabular-nums">−{eur(seaiGrant)}</strong>
            </div>
            {/* The payback lines — where the money comes from, and both honest paybacks */}
            <div className="mt-2 pt-2 border-t border-border/60 space-y-1 text-xs text-muted-foreground">
              <div>
                <strong className="text-foreground tabular-nums">{eur(quote.selfUseSavings)}</strong>/yr self-use at €{quote.rates.dayRate.toFixed(2)}
                {' '}+ <strong className="text-foreground tabular-nums">{eur(quote.exportIncome)}</strong>/yr CEG export at €{quote.rates.exportRate.toFixed(2)}
                {quote.batteryArbitrage > 0 && <> + <strong className="text-foreground tabular-nums">{eur(quote.batteryArbitrage)}</strong>/yr night-rate battery charging</>}
              </div>
              <div>
                Pays back in <strong className="text-doc-deposit tabular-nums">{paybackYears} yrs</strong>
                {quote.paybackNoExportYears > paybackYears && <> · <span className="tabular-nums">{quote.paybackNoExportYears} yrs</span> on self-use alone</>}
              </div>
            </div>
          </div>

          {gearPane}
        </div>
      </div>

      {/* Expanded map — a cal.com-style centred window, not a full-screen cover.
          Backdrop click or the X in the header closes it. */}
      {fullscreen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setFullscreen(false)}>
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-panel shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {roofPane}
          </div>
        </div>
      )}
    </div>
  );
}

function RoofBadge({ hasImage, insight }: { hasImage: boolean; insight: RoofInsight | null }) {
  if (insight) return <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-tech-subtle text-tech text-2xs font-semibold"><Satellite className="size-3" /> live roof</span>;
  if (hasImage) return <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-tech-subtle text-tech text-2xs font-semibold"><Satellite className="size-3" /> satellite</span>;
  return <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-muted text-muted-foreground text-2xs">from survey</span>;
}

/** One gear row — the recommended product highlighted, others selectable. */
function GearPicker({ kind, label, options, value, onPick }: {
  kind: CatalogProduct['kind']; label: string; options: CatalogProduct[]; value: string; onPick: (model: string) => void;
}) {
  const KindIcon = kind === 'panel' ? Sun : kind === 'inverter' ? Zap : kind === 'battery' ? Battery : kind === 'diverter' ? Droplets : Zap;
  const isActive = (p: CatalogProduct) => value?.toLowerCase() === p.model.toLowerCase() || value?.toLowerCase().includes(p.maker.toLowerCase());
  // Two per category — a clean single row. The selected one always shows.
  const shown = [...options.filter(isActive), ...options.filter(p => !isActive(p))].slice(0, 2);
  return (
    <div>
      <div className="label-micro mb-1.5">{label}</div>
      {/* Uniform 2-col grid, clean names — no ragged content-width chips, no SKU noise */}
      <div className="grid grid-cols-2 gap-1.5">
        {shown.map(p => {
          const active = isActive(p);
          const primary = p.watts ? `${p.maker} ${p.watts}W` : p.maker;
          const tokens = p.spec.split('·').map(s => s.trim());
          const secondary = tokens.find(s => !/^\d+\s*W$/i.test(s)) ?? tokens[0];
          return (
            <button key={p.model} onClick={() => onPick(p.model)}
              className={cn('text-left rounded-control border p-2 min-w-0 transition-colors', active ? 'border-tech bg-tech-subtle' : 'border-border bg-card hover:border-tech/40')}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn('shrink-0 [&>svg]:size-4', active ? 'text-tech' : 'text-muted-foreground')}>
                  {active ? <CheckCircle2 /> : <KindIcon />}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-tight truncate">{primary}</div>
                  <div className="text-2xs text-muted-foreground leading-tight truncate">{secondary} · {p.warrantyYears}yr</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
