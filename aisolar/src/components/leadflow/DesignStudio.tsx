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
import { Sun, Zap, Battery, TrendingUp, Plus, Minus, Sparkles, Loader2, CheckCircle2, Satellite, RotateCw, Move, Maximize2, ArrowLeftRight, Expand, X, Droplets } from 'lucide-react';
import { buildingInsights, staticMapUrlForQuery, hasMapsKey, type RoofInsight } from '@/lib/googleSolar';
import { osmGeocode } from '@/lib/roofImagery';
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
const STUDIO_ZOOM = 20;
const IMG_LOGICAL_W = 640;
const PANEL_W_M = 1.134;
const PANEL_H_M = 1.722;
const PANEL_GAP_M = 0.02;

/** A pleasing landscape grid for N panels (wider than tall, like a real roof). */
function defaultCols(count: number) {
  return Math.max(2, Math.min(count, Math.round(Math.sqrt(count * 1.9))));
}

export default function DesignStudio({ lead, designData, setDesignData, estimate }: {
  lead: DummyLead;
  designData: any;
  setDesignData: (data: any) => void;
  estimate: any;
}) {
  const eircode = ((lead.intake ?? {}) as Record<string, unknown>).extracted_eircode as string
    ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0] ?? '';
  const address = lead.address;
  const roofQuery = address || eircode || 'Dublin';
  const update = (field: string, value: any) => setDesignData({ ...designData, [field]: value });
  const patch = (fields: Record<string, any>) => setDesignData({ ...designData, ...fields });

  // ── Satellite image (Google Static Maps, address-keyed) + Solar roof fit ──
  // center=<address> geocodes server-side, so the image paints without a client
  // geocode (localhost CORS never touches it). The Solar panel-fit is best-effort
  // on OSM coords and may CORS-fail — the image never depends on it.
  const satUrl = hasMapsKey() ? staticMapUrlForQuery(roofQuery, { w: 640, h: 360, zoom: STUDIO_ZOOM }) : null;
  const [imgOk, setImgOk] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [roofInsight, setRoofInsight] = useState<RoofInsight | null>(null);
  // The geocoded centre drives the ground scale (metres-per-pixel), so panels
  // are drawn at their REAL footprint on the roof — not an arbitrary size.
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  // Layout: map on the left by default; the consultant can flip it to the right.
  const [mapSide, setMapSide] = useState<'left' | 'right'>('left');
  const [fullscreen, setFullscreen] = useState(false);
  const ranOnce = useRef(false);
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    let live = true;
    osmGeocode(roofQuery).then(loc => {
      if (!live || !loc) return;
      setCenter(loc);
      if (hasMapsKey()) buildingInsights(loc.lat, loc.lng).then(ins => { if (live) setRoofInsight(ins); });
    });
    return () => { live = false; };
  }, [roofQuery]);

  const hasImage = !!satUrl && imgOk;
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

  // ── Array placement (drag + rotate), persisted on designData ────────────
  const ax = designData.arrayX ?? 50;
  const ay = designData.arrayY ?? 52;
  const arot = designData.arrayRot ?? 0;
  // Consultant controls the shape: columns (rows follow) — no more mystery layout.
  const cols = clamp(designData.arrayCols ?? defaultCols(count), 1, count);
  const rows = Math.ceil(count / cols);
  const setCols = (n: number) => update('arrayCols', clamp(n, 1, count));
  // Strings: how the panels split across the inverter's MPPT inputs.
  const strings = clamp(designData.strings ?? 1, 1, 6);
  const perString = Math.floor(count / strings);
  const stringRemainder = count - perString * strings;
  const setStrings = (n: number) => update('strings', clamp(n, 1, 6));

  const canvasRef = useRef<HTMLDivElement>(null);
  // Ground scale, resolution-independent: the array is drawn as a FRACTION of the
  // map's visible width (real array metres ÷ metres across the whole image). No
  // pixel guessing, so panels stay accurate at any canvas size, fullscreen, or
  // flipped side. metres-across-the-image = 640 logical px × metres-per-pixel.
  const metresPerLogicalPx = center ? (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, STUDIO_ZOOM) : null;
  const groundWidthM = metresPerLogicalPx ? metresPerLogicalPx * IMG_LOGICAL_W : null;
  const accurate = groundWidthM != null;
  const arrayMetresW = cols * panelWm + (cols - 1) * PANEL_GAP_M;
  const arrayWidthPct = accurate ? (arrayMetresW / groundWidthM!) * 100 : 40;
  const gapPct = (PANEL_GAP_M / arrayMetresW) * 100;
  const cellAspect = panelWm / panelHm;

  const grab = useRef<{ offX: number; offY: number } | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * 100;
    const py = ((e.clientY - r.top) / r.height) * 100;
    grab.current = { offX: px - (designData.arrayX ?? 50), offY: py - (designData.arrayY ?? 52) };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [designData.arrayX, designData.arrayY]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!grab.current) return;
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * 100 - grab.current.offX;
    const py = ((e.clientY - r.top) / r.height) * 100 - grab.current.offY;
    patch({ arrayX: clamp(px, 8, 92), arrayY: clamp(py, 8, 92) });
  }, [designData]);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    grab.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }, []);

  const roofPane = (
    <div className="rounded-panel border border-border/70 bg-card shadow-card overflow-hidden">
      <header className="flex items-center gap-2 px-4 h-11 border-b border-border shrink-0">
        <Satellite className="size-4 text-tech" />
        <h3 className="text-sm font-semibold">The roof</h3>
        <RoofBadge hasImage={hasImage} insight={roofInsight} />
        <div className="ml-auto flex items-center gap-2">
          {eircode && <span className="text-2xs text-muted-foreground font-mono">{eircode}</span>}
          <button onClick={() => setFullscreen(f => !f)} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            className="size-7 grid place-items-center rounded-control hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            {fullscreen ? <X className="size-4" /> : <Expand className="size-4" />}
          </button>
        </div>
      </header>

      <div ref={canvasRef} className="relative aspect-[16/9] overflow-hidden bg-slate-900 select-none">
        {satUrl && (
          <img src={satUrl} alt="Roof from above" onError={() => setImgOk(false)} onLoad={() => setImgLoaded(true)} draggable={false}
            className={cn('absolute inset-0 w-full h-full object-cover', !hasImage && 'hidden')} />
        )}
        {!hasImage && (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 20%, #1e293b, #0b1220)' }}>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[8deg]"
              style={{ width: '58%', height: '46%', background: 'linear-gradient(160deg,#334155,#1e293b)', borderRadius: 6, boxShadow: '0 12px 40px rgba(0,0,0,.5)' }} aria-hidden />
          </div>
        )}
        {hasImage && !imgLoaded && (
          <div className="absolute inset-0 grid place-items-center bg-slate-900">
            <span className="flex items-center gap-2 text-xs text-slate-300"><Loader2 className="size-4 animate-spin" /> Loading the roof…</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/10 pointer-events-none" />

        {/* The array — draggable */}
        <div
          role="group" aria-label="Solar array, drag to place"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          className="absolute touch-none cursor-grab active:cursor-grabbing"
          style={{ left: `${ax}%`, top: `${ay}%`, width: `${arrayWidthPct}%`, transform: `translate(-50%,-50%) rotate(${arot}deg)` }}
        >
          <div className="rounded-[2px] ring-2 ring-tech/90 shadow-[0_4px_16px_rgba(0,0,0,.45)]"
            style={{ background: 'rgba(15,23,42,.35)' }}>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gapPct}%` }}>
              {Array.from({ length: count }).map((_, i) => (
                <span key={i} style={{
                  aspectRatio: cellAspect,
                  background: 'linear-gradient(150deg, #24365c 0%, #152b4a 40%, #0a1220 100%)',
                  boxShadow: 'inset 0 0 0 0.5px rgba(150,190,240,.55), inset 0 1px 2px rgba(255,255,255,.12)',
                  borderRadius: 1.5,
                }} />
              ))}
            </div>
          </div>
          <span className="absolute -left-1 -top-1 size-1.5 rounded-full bg-tech ring-1 ring-white/70" />
          <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-tech ring-1 ring-white/70" />
          <span className="absolute -left-1 -bottom-1 size-1.5 rounded-full bg-tech ring-1 ring-white/70" />
          <span className="absolute -right-1 -bottom-1 size-1.5 rounded-full bg-tech ring-1 ring-white/70" />
        </div>

        {/* Orientation chip */}
        <div className="absolute top-2 left-2 bg-background/85 backdrop-blur text-2xs px-2 py-1 rounded-control font-medium flex items-center gap-1.5">
          <span className="text-tech font-bold">N↑</span>
          <span className="text-muted-foreground">{designData.roofOrientation || 'S'} · {designData.roofPitch || 30}°</span>
        </div>

        {/* Drag hint */}
        {ax === 50 && ay === 52 && (
          <div className="absolute top-2 right-2 bg-tech/90 text-white text-2xs px-2 py-1 rounded-control font-medium flex items-center gap-1 shadow-card">
            <Move className="size-3" /> Drag onto the roof
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
          <span className="text-muted-foreground">Live satellite view. Drag the array onto the roof; the surveyor's count sizes it.</span>
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
      <div className="flex items-center gap-2.5 flex-wrap">
        {stepper('Panels', count, () => setPanelCount(count - 1), () => setPanelCount(count + 1))}
        <div className="h-5 w-px bg-border" />
        {stepper('Cols', cols, () => setCols(cols - 1), () => setCols(cols + 1), <span className="text-2xs text-muted-foreground ml-0.5">{rows}×{cols}</span>)}
        <div className="h-5 w-px bg-border" />
        {stepper('Strings', strings, () => setStrings(strings - 1), () => setStrings(strings + 1), <span className="text-2xs text-muted-foreground ml-0.5">{perString}{stringRemainder ? `+${stringRemainder}` : ''}/str</span>)}
        {/* Quick actions — one-tap sizing */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <button
            onClick={() => {
              const use = lead.annual_kwh || estimate.annualKwh || 0;
              const perPanelKwh = (panelWatts / 1000) * IE_ENERGY.YIELD_PER_KWP * yieldFactor;
              if (use > 0 && perPanelKwh > 0) setPanelCount(Math.ceil(use / perPanelKwh));
            }}
            title="Size the array to cover their annual usage"
            className="h-7 px-2.5 rounded-control border border-tech text-tech text-2xs font-semibold flex items-center gap-1 hover:bg-tech-subtle">
            <TrendingUp className="size-3" /> Size to bill
          </button>
          {roofInsight && (
            <button onClick={() => setPanelCount(roofInsight.panels)} title="Fill the roof to Google Solar's max"
              className="h-7 px-2.5 rounded-control bg-tech text-white text-2xs font-semibold flex items-center gap-1 hover:bg-tech/90">
              <Maximize2 className="size-3" /> Fill
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RotateCw className="size-3.5 text-muted-foreground shrink-0" />
        <input type="range" min={-45} max={45} step={1} value={arot}
          onChange={e => update('arrayRot', Number(e.target.value))}
          aria-label="Rotate array" className="flex-1 accent-tech min-w-0" />
        <span className="text-2xs tabular-nums text-muted-foreground w-8 text-right shrink-0">{arot}°</span>
        <div className="h-5 w-px bg-border" />
        <span className="text-2xs text-muted-foreground tabular-nums shrink-0">{systemSizeKw} kWp · {coverage}%</span>
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
            <GearPicker kind="battery" label="Battery" options={batteries} value={designData.batteryModel} onPick={m => update('batteryModel', m)} />
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
