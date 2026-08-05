/**
 * SolarCalculator — the interactive calculator body, extracted from the /calculator
 * page so it can also live as a section on the marketing site (Cal: "this needs
 * to be on the marketing site"). Draw-your-roof + sliders → live full-glory
 * estimate. One engine (calculateSystemEstimate + systemCost); domestic path is
 * the unified one. `showHeader` toggles the lander headline for embedded use.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, ReferenceArea, Tooltip } from 'recharts';
import { Sun, TrendingUp, Zap, ArrowRight, Calculator, BatteryCharging, Leaf, Moon } from 'lucide-react';
import { calculateSystemEstimate, irrPercent } from '@/lib/leadIntake';
import { getPricingConfig } from '@/lib/pricing';
import { eur } from '@/lib/seaiPipeline';
import RoofDesigner from '@/components/calculator/RoofDesigner';

type Face = 'south' | 'east' | 'west' | 'north';

/** Yield relative to due south for a pitched Irish roof. */
const ORIENT: Record<Face, number> = { south: 1, east: 0.85, west: 0.85, north: 0.65 };

/**
 * Real roofs have more than one face. An east–west dual pitch is one of the
 * most common shapes in Ireland — half the panels each side — and forcing a
 * single choice mis-models it badly.
 *
 * Panels are split evenly across the faces you pick, so the effective yield is
 * the mean of those faces. East+west also spreads generation across the day
 * (morning on one side, evening on the other) rather than peaking at noon,
 * which usually means MORE of it is used in the house instead of exported —
 * so we give it a small self-consumption credit rather than treating it as
 * simply worse than south.
 */
function orientFactor(faces: Face[]): number {
  if (faces.length === 0) return ORIENT.south;
  const mean = faces.reduce((s, f) => s + ORIENT[f], 0) / faces.length;
  const eastWestSpread = faces.includes('east') && faces.includes('west');
  return mean * (eastWestSpread ? 1.04 : 1);
}

const FACE_LABEL: Record<Face, string> = { south: 'South', east: 'East', west: 'West', north: 'North' };

/** Count-up number — tweens to its value on change; shows the value instantly if rAF never runs. */
function useCountUp(value: number, ms = 500) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current, b = value;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(a + (b - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

function Money({ value, className }: { value: number; className?: string }) {
  const n = useCountUp(value);
  return <span className={className}>{eur(Math.round(n))}</span>;
}

export default function SolarCalculator({
  showHeader = true,
  initialBill = 250,
  /** Real day/night split read off the bill — seeds the slider instead of the 35% guess. */
  initialNightPct,
  /** Real annual usage off the bill. When present the estimate runs on THIS,
      not on a figure derived from the monthly bill — the whole point of the read. */
  annualKwh,
  /** Hide the built-in "upload your bill" CTA when we're already past that
      (the bill analyser embeds this after the read). */
  showUploadCta = true,
  /** §D fork — 'commercial' runs the NDMG + commercial-sizing path so a business
      never sees the domestic €1,800 grant. Default domestic. */
  propertyType = 'domestic',
  /** Real unit rate off the bill. Absent (manual path) → conservative fallback
      (€0.24 commercial / €0.35 domestic) and the estimate is flagged indicative. */
  unitRate,
  /** EMBED MODE (2E): when set, the CTA captures the lead into the tenant via
      this callback (with the estimate) INSTEAD of navigating to /start — the
      embedded widget lives on the tenant's own site, not the AISOLAR funnel. */
  onGetProposal,
}: {
  showHeader?: boolean;
  initialBill?: number;
  initialNightPct?: number;
  annualKwh?: number;
  showUploadCta?: boolean;
  propertyType?: 'domestic' | 'commercial';
  unitRate?: number | null;
  onGetProposal?: (estimate: {
    monthlyBill: number; systemSizeKw: number; annualSavings: number;
    seaiGrant: number; netCost: number; paybackYears: number;
    propertyType: 'domestic' | 'commercial'; orientation: string; battery: boolean;
    roofKwp: number; roofAddress: string;
  }) => void;
}) {
  const navigate = useNavigate();
  const [monthlyBill, setMonthlyBill] = useState(initialBill);
  const [nightPct, setNightPct] = useState(initialNightPct ?? 35);
  const [email, setEmail] = useState('');
  // Multi-select: a roof can face more than one way (east+west dual pitch is
  // extremely common here). Never allow an empty set — fall back to keeping the
  // last face selected.
  const [faces, setFaces] = useState<Face[]>(['south']);
  const toggleFace = (f: Face) => setFaces(cur =>
    cur.includes(f) ? (cur.length === 1 ? cur : cur.filter(x => x !== f)) : [...cur, f]);
  const [battery, setBattery] = useState(false);
  const [roofPanels, setRoofPanels] = useState(0);
  const [roofKwp, setRoofKwp] = useState(0);
  const [roofAddress, setRoofAddress] = useState('');

  const cfg = getPricingConfig();

  // Carry everything the customer just did into /start so the estimate
  // continues from THEIR numbers — bill, night split, orientation, battery
  // and the roof they drew — instead of starting blank (Cal: the drawn array
  // must automate to the estimate → survey → proposal).
  // Embed mode captures the lead into the tenant; standalone continues to the
  // AISOLAR funnel. One CTA, the right destination for where it's rendered.
  const continueFromEstimate = () => {
    if (onGetProposal) {
      onGetProposal({
        monthlyBill, systemSizeKw: r.systemSizeKw, annualSavings: r.annualSavings,
        seaiGrant: r.seaiGrant, netCost: r.netCost, paybackYears: r.paybackYears,
        propertyType, orientation: faces.join('+'), battery, roofKwp, roofAddress,
      });
      return;
    }
    navigate('/start', {
      state: {
        calc: {
          monthlyBill, nightPct, orientation: faces.join('+'), battery,
          roofPanels, roofKwp, roofAddress,
          systemSizeKw: r.systemSizeKw, annualSavings: r.annualSavings,
          seaiGrant: r.seaiGrant, netCost: r.netCost, paybackYears: r.paybackYears,
        },
      },
    });
  };
  const goToStart = continueFromEstimate;

  const r = useMemo(() => {
    // The merge: your bill sizes the system, your roof caps it at what fits.
    const est = calculateSystemEstimate({ monthlyBill, annualKwh, roofCapKwp: roofKwp || undefined, propertyType, retailRate: unitRate });
    const orient = orientFactor(faces);
    const baseSavings = Math.round(est.annualSavings * orient);
    const batteryKwh = 10.2;
    const batteryBoost = battery ? Math.round(baseSavings * (0.10 + (nightPct / 100) * 0.30)) : 0;
    const batteryCost = battery ? Math.round(batteryKwh * cfg.batteryPerKwh) : 0;
    const annualSavings = baseSavings + batteryBoost;
    const commercial = propertyType === 'commercial';
    const grossCost = est.grossCost + batteryCost;        // ex-VAT capital (commercial)
    const afterGrant = est.netCost + batteryCost;         // net after grant, incl battery
    // Commercial: fold ACA (100% first-year allowance × 12.5% trading rate on the
    // grant-net capital) into an EFFECTIVE net; add the reclaimable VAT + ROI/IRR.
    const acaRelief = commercial ? Math.round(afterGrant * 0.125) : 0;
    const vatReclaim = commercial ? Math.round(grossCost * 0.13) : 0;
    const netCost = commercial ? afterGrant - acaRelief : afterGrant;   // effective net
    const paybackYears = annualSavings > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 0;
    const roi = commercial && netCost > 0 ? Math.round((annualSavings / netCost) * 100) : 0;
    const irr = commercial ? irrPercent(netCost, annualSavings, 25) : 0;
    const twentyYear = annualSavings * 20 - netCost;
    const curve = Array.from({ length: 21 }, (_, y) => ({ year: y, saved: annualSavings * y - netCost }));
    return { est, batteryKwh, annualSavings, netCost, afterGrant, grossCost, acaRelief, vatReclaim, roi, irr, commercial,
      paybackYears, twentyYear, batteryCost, curve,
      seaiGrant: est.seaiGrant, systemSizeKw: est.systemSizeKw, panels: Math.round((est.systemSizeKw * 1000) / cfg.panelWatts),
      annualProduction: est.annualProductionKwh, co2: est.co2TonnesPerYear,
      rateIndicative: est.rateIndicative };
  }, [monthlyBill, nightPct, faces, battery, roofKwp, annualKwh, cfg, propertyType, unitRate]);

  const commercial = propertyType === 'commercial';
  const grantLabel = commercial ? 'NDMG grant' : 'SEAI grant';

  return (
    /* When embedded in a page that already has its own container (the bill
       analyser, the widget), don't impose a second max-width and a big vertical
       rhythm on top — it reads as badly fitted. Standalone keeps the lander
       spacing. */
    <div className={showHeader ? 'mx-auto max-w-6xl px-5 py-10 lg:py-14' : 'w-full px-0'}>
      {showHeader && (
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
            <Calculator className="size-3.5" /> Free · no signup · instant
          </span>
          <h1 className="mt-5 text-[32px] leading-[38px] sm:text-[42px] sm:leading-[48px] font-semibold tracking-tight">
            Watch solar pay for itself
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-body">
            Move the sliders and your estimate rebuilds live: grant, savings, payback, the lot.
            Then upload your bill and we run it on your real numbers.
          </p>
        </div>
      )}

      {/* The split: play left · full-glory estimate right */}
      <div className={`${showHeader ? 'mt-10' : ''} grid lg:grid-cols-2 gap-6 items-start`}>
        {/* ── LEFT · play ─────────────────────────────────────────── */}
        <div className="rounded-panel bg-card shadow-card p-5 space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Your roof</label>
            <RoofDesigner panelWatts={cfg.panelWatts} onChange={({ panels, kwp, address }) => { setRoofPanels(panels); setRoofKwp(kwp); setRoofAddress(address); }} />
            {roofPanels > 0 && (
              <p className="mt-2 text-xs font-medium text-doc-deposit">Room for about {roofPanels} panels here, a {roofKwp} kWp system, now in your estimate.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Your monthly electricity bill</label>
              <span className="text-xl font-semibold tabular-nums">€{monthlyBill}</span>
            </div>
            <input type="range" min={80} max={600} step={10} value={monthlyBill}
              onChange={e => setMonthlyBill(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer" />
            <div className="flex justify-between text-2xs text-muted-foreground mt-1"><span>€80</span><span>€600+</span></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><Moon className="size-3.5 text-tech" /> How much do you use at night?</label>
              <span className="text-xl font-semibold tabular-nums">{nightPct}%</span>
            </div>
            <input type="range" min={10} max={70} step={5} value={nightPct}
              onChange={e => setNightPct(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer" />
            <p className="text-2xs text-muted-foreground mt-1">The more you use after dark, the more a battery earns you.</p>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <label className="text-sm font-medium">Which way does your roof face?</label>
              <span className="text-2xs text-muted-foreground">pick all that apply</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['south', 'east', 'west', 'north'] as const).map(dir => {
                const on = faces.includes(dir);
                return (
                  <button key={dir} onClick={() => toggleFace(dir)}
                    aria-pressed={on}
                    className={`py-2.5 rounded-control border text-xs font-medium transition-colors ${on ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
                    <Sun className={`size-4 mx-auto mb-1 ${on ? 'text-doc-proposal' : 'text-muted-foreground'}`} />
                    {FACE_LABEL[dir]}
                  </button>
                );
              })}
            </div>
            <p className="text-2xs text-muted-foreground mt-1.5">
              {faces.includes('east') && faces.includes('west')
                ? 'East and west splits the panels across both pitches, so generation spreads from morning to evening instead of peaking at noon, and more of it gets used in the house.'
                : faces.length > 1
                  ? `Panels split across ${faces.length} faces, so we blend the yield accordingly.`
                  : 'Most Irish homes have two pitches. Tap both if yours does.'}
            </p>
          </div>

          <button onClick={() => setBattery(b => !b)}
            className={`w-full flex items-center gap-3 rounded-panel border p-3.5 text-left transition-colors ${battery ? 'border-doc-deposit/50 bg-doc-deposit/5' : 'border-border hover:bg-muted/50'}`}>
            <span className={`size-9 rounded-control grid place-items-center shrink-0 ${battery ? 'bg-doc-deposit/15 text-doc-deposit' : 'bg-muted text-muted-foreground'}`}>
              <BatteryCharging className="size-4.5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium">Add a {r.batteryKwh} kWh battery</span>
              <span className="block text-2xs text-muted-foreground">Stores the day's sun for the evening · fixed +{eur(r.batteryCost || Math.round(r.batteryKwh * cfg.batteryPerKwh))}</span>
            </span>
            <span className={`size-5 rounded-full border-2 grid place-items-center shrink-0 ${battery ? 'border-doc-deposit bg-doc-deposit' : 'border-muted-foreground/40'}`}>
              {battery && <span className="size-2 rounded-full bg-white" />}
            </span>
          </button>

        </div>

        {/* ── RIGHT · the estimate, in full glory ─────────────────── */}
        <div className="rounded-panel bg-card shadow-card overflow-hidden">
          {commercial ? (
            <>
              <div className="px-6 pt-5 pb-4 border-b border-border">
                <p className="label-micro">Return on investment</p>
                <span className="block mt-1 text-3xl sm:text-4xl font-semibold tracking-tight text-doc-deposit tabular-nums">{r.roi}%<span className="text-lg font-medium text-muted-foreground"> / yr</span></span>
                <p className="mt-2 text-xs text-muted-foreground leading-body">
                  <span className="font-semibold text-foreground tabular-nums">{r.irr}% IRR</span> · pays back in <span className="font-semibold text-foreground tabular-nums">{r.paybackYears} years</span>. Ex-VAT; the {grantLabel} takes <span className="font-semibold text-foreground tabular-nums">{eur(r.seaiGrant)}</span> off and ACA relief folds into your effective net.
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                <KeyFact label="System" value={`${r.systemSizeKw} kWp`} sub={`${r.panels} panels${battery ? ' + batt' : ''}`} />
                <KeyFact label="Effective net" valueEl={<Money value={r.netCost} />} sub="after grant + ACA" />
                <KeyFact label="Payback" value={`${r.paybackYears} yrs`} sub={`${r.irr}% IRR`} />
              </div>
              <div className="px-6 py-4 border-b border-border space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">System installed (ex-VAT)</span><span className="tabular-nums"><Money value={r.grossCost} /></span></div>
                {battery && <div className="flex justify-between"><span className="text-muted-foreground">Battery</span><span className="tabular-nums">{eur(r.batteryCost)}</span></div>}
                <div className="flex justify-between text-doc-deposit"><span>{grantLabel}</span><span className="tabular-nums">−{eur(r.seaiGrant)}</span></div>
                <div className="flex justify-between text-doc-deposit"><span>ACA tax relief (year 1)</span><span className="tabular-nums">−{eur(r.acaRelief)}</span></div>
                <div className="flex justify-between font-semibold border-t border-border pt-1.5"><span>Effective net cost</span><span className="tabular-nums"><Money value={r.netCost} /></span></div>
                <div className="flex justify-between text-2xs text-muted-foreground"><span>+ VAT reclaimed (you pay, then reclaim)</span><span className="tabular-nums">{eur(r.vatReclaim)}</span></div>
              </div>
            </>
          ) : (
            <>
              <div className="px-6 pt-5 pb-4 border-b border-border">
                <p className="label-micro">Estimated 20-year saving</p>
                <Money value={r.twentyYear} className="block mt-1 text-3xl sm:text-4xl font-semibold tracking-tight text-doc-deposit tabular-nums" />
                <p className="mt-2 text-xs text-muted-foreground leading-body">
                  The {grantLabel} takes <span className="font-semibold text-foreground tabular-nums">{eur(r.seaiGrant)}</span> off the price, and the system pays for itself in about <span className="font-semibold text-foreground tabular-nums">{r.paybackYears} years</span>. Everything after that comes off your bills.
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                <KeyFact label="System" value={`${r.systemSizeKw} kWp`} sub={`${r.panels} panels${battery ? ' + batt' : ''}`} />
                <KeyFact label="Net cost" valueEl={<Money value={r.netCost} />} sub="after grant" />
                <KeyFact label="Payback" value={`${r.paybackYears} yrs`} sub="then it's free" />
              </div>
              <div className="px-6 py-4 border-b border-border space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">System installed</span><span className="tabular-nums"><Money value={r.grossCost} /></span></div>
                {battery && <div className="flex justify-between"><span className="text-muted-foreground">Home battery</span><span className="tabular-nums">{eur(r.batteryCost)}</span></div>}
                <div className="flex justify-between text-doc-deposit"><span>{grantLabel}</span><span className="tabular-nums">−{eur(r.seaiGrant)}</span></div>
                <div className="flex justify-between font-semibold border-t border-border pt-1.5"><span>Your net cost</span><span className="tabular-nums"><Money value={r.netCost} /></span></div>
              </div>
            </>
          )}

          {r.rateIndicative && (
            <p className="px-6 pt-3 text-2xs text-muted-foreground leading-snug">
              Indicative — savings use a conservative {commercial ? '€0.24' : '€0.35'}/kWh rate. Every estimate is confirmed off a real bill at the proposal stage.
            </p>
          )}

          <div className="px-6 pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="label-micro">Where you stand, year by year</p>
              <span className="text-2xs text-muted-foreground">20-yr view</span>
            </div>
            <div className="h-28 -mx-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={r.curve} margin={{ top: 14, right: 16, left: 16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="save" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--doc-deposit))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--doc-deposit))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  {r.paybackYears > 0 && r.paybackYears <= 20 && (
                    <ReferenceArea x1={0} x2={r.paybackYears} fill="hsl(var(--pop))" fillOpacity={0.05} />
                  )}
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(y: number) => (y % 5 === 0 ? `${y}y` : '')} />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                  {r.paybackYears > 0 && r.paybackYears <= 20 && (
                    <ReferenceLine x={Math.round(r.paybackYears)} stroke="hsl(var(--doc-deposit))" strokeDasharray="4 3" strokeWidth={1.5}
                      label={{ value: `paid back · yr ${r.paybackYears}`, position: 'insideTopRight', fontSize: 10, fontWeight: 600, fill: 'hsl(var(--doc-deposit))' }} />
                  )}
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--border))' }}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12, boxShadow: 'var(--shadow-card)' }}
                    labelFormatter={(y) => `Year ${y}`}
                    formatter={(v: number) => [eur(Math.round(v)), v >= 0 ? 'In profit' : 'Still paying back']}
                  />
                  <Area type="monotone" dataKey="saved" stroke="hsl(var(--doc-deposit))" strokeWidth={2.5} fill="url(#save)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="px-6 py-4 grid grid-cols-3 gap-3 border-t border-border">
            <MiniStat icon={Zap} tint="text-tech" value={`${(r.annualProduction / 1000).toFixed(1)}k`} label="kWh made a year" />
            <MiniStat icon={TrendingUp} tint="text-doc-deposit" valueEl={<Money value={r.annualSavings} />} label="saved a year" />
            <MiniStat icon={Leaf} tint="text-doc-deposit" value={`${r.co2} t`} label="CO₂ cut a year" />
          </div>

          {/* Embed mode: one button → the widget's own capture panel (name +
              contact), which lands the lead in the tenant's pipeline. */}
          {onGetProposal && (
            <div className="p-4 pt-0">
              <button onClick={continueFromEstimate}
                className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-panel bg-pop text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Get my full proposal <ArrowRight className="size-4" />
              </button>
              <p className="mt-2 text-2xs text-center text-muted-foreground">
                A local specialist confirms your exact numbers off a real bill — no obligation.
              </p>
            </div>
          )}

          {showUploadCta && !onGetProposal && (
            <div className="p-4 pt-0 space-y-2">
              <form onSubmit={(e) => { e.preventDefault(); goToStart(); }} className="flex gap-2">
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com" aria-label="Your email"
                  className="min-w-0 flex-1 h-11 rounded-panel border border-border bg-background px-3.5 text-sm outline-none transition-colors focus:border-primary"
                />
                <button type="submit"
                  className="shrink-0 inline-flex h-11 items-center justify-center gap-2 rounded-panel bg-pop text-white px-4 text-sm font-semibold hover:opacity-90 transition-opacity">
                  Email me this <ArrowRight className="size-4" />
                </button>
              </form>
              <p className="text-2xs text-center text-muted-foreground">
                In your inbox in seconds. Loved that? <button type="button" onClick={goToStart} className="font-semibold text-doc-deposit underline underline-offset-2 hover:no-underline">Grab your bill</button> and we take it from a great estimate to exact, off 21 real details that carry straight to your installer.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-2xs text-center text-muted-foreground mt-6 max-w-2xl mx-auto">
        Estimate only. Irish retail rate €0.35/kWh, SEAI grant €700/kWp to 2 kWp then €200/kWp to 4 kWp (max €1,800), 70% self-consumption, 0% VAT.
        Your real figures come off your bill at upload; actual savings vary with roof, shading and usage.
      </p>
    </div>
  );
}

function KeyFact({ label, value, valueEl, sub }: { label: string; value?: string; valueEl?: React.ReactNode; sub: string }) {
  return (
    <div className="px-4 py-3.5 text-center">
      <div className="label-micro">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{valueEl ?? value}</div>
      <div className="text-2xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function MiniStat({ icon: Icon, tint, value, valueEl, label }: { icon: typeof Sun; tint: string; value?: string; valueEl?: React.ReactNode; label: string }) {
  return (
    <div>
      <Icon className={`size-4 ${tint}`} />
      <div className="mt-1.5 text-base font-semibold tabular-nums leading-none">{valueEl ?? value}</div>
      <div className="mt-1 text-2xs text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}
