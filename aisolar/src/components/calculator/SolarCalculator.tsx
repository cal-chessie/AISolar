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
import { Sun, TrendingUp, Zap, ArrowRight, Calculator, BatteryCharging, Leaf, Upload, Moon } from 'lucide-react';
import { calculateSystemEstimate } from '@/lib/leadIntake';
import { getPricingConfig } from '@/lib/pricing';
import { eur } from '@/lib/seaiPipeline';
import RoofDesigner from '@/components/calculator/RoofDesigner';

const ORIENT: Record<'south' | 'east' | 'west' | 'north', number> = { south: 1, east: 0.85, west: 0.85, north: 0.65 };

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

export default function SolarCalculator({ showHeader = true, initialBill = 250 }: { showHeader?: boolean; initialBill?: number }) {
  const navigate = useNavigate();
  const [monthlyBill, setMonthlyBill] = useState(initialBill);
  const [nightPct, setNightPct] = useState(35);
  const [orientation, setOrientation] = useState<'south' | 'east' | 'west' | 'north'>('south');
  const [battery, setBattery] = useState(false);
  const [roofPanels, setRoofPanels] = useState(0);
  const [roofKwp, setRoofKwp] = useState(0);
  const [roofAddress, setRoofAddress] = useState('');

  const cfg = getPricingConfig();

  // Carry everything the customer just did into /start so the estimate
  // continues from THEIR numbers — bill, night split, orientation, battery
  // and the roof they drew — instead of starting blank (Cal: the drawn array
  // must automate to the estimate → survey → proposal).
  const goToStart = () => navigate('/start', {
    state: {
      calc: {
        monthlyBill, nightPct, orientation, battery,
        roofPanels, roofKwp, roofAddress,
        systemSizeKw: r.systemSizeKw, annualSavings: r.annualSavings,
        seaiGrant: r.seaiGrant, netCost: r.netCost, paybackYears: r.paybackYears,
      },
    },
  });

  const r = useMemo(() => {
    // The merge: your bill sizes the system, your roof caps it at what fits.
    const est = calculateSystemEstimate({ monthlyBill, roofCapKwp: roofKwp || undefined });
    const orient = ORIENT[orientation];
    const baseSavings = Math.round(est.annualSavings * orient);
    const batteryKwh = 10.2;
    const batteryBoost = battery ? Math.round(baseSavings * (0.10 + (nightPct / 100) * 0.30)) : 0;
    const batteryCost = battery ? Math.round(batteryKwh * cfg.batteryPerKwh) : 0;
    const annualSavings = baseSavings + batteryBoost;
    const netCost = est.netCost + batteryCost;
    const paybackYears = annualSavings > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 0;
    const twentyYear = annualSavings * 20 - netCost;
    const curve = Array.from({ length: 21 }, (_, y) => ({ year: y, saved: annualSavings * y - netCost }));
    return { est, batteryKwh, annualSavings, netCost, paybackYears, twentyYear, batteryCost, curve,
      seaiGrant: est.seaiGrant, systemSizeKw: est.systemSizeKw, panels: Math.round((est.systemSizeKw * 1000) / cfg.panelWatts),
      annualProduction: est.annualProductionKwh, co2: est.co2TonnesPerYear, grossCost: est.grossCost };
  }, [monthlyBill, nightPct, orientation, battery, roofKwp, cfg]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
      {showHeader && (
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-card">
            <Calculator className="size-3.5" /> Free · no signup · instant
          </span>
          <h1 className="mt-5 text-[32px] leading-[38px] sm:text-[42px] sm:leading-[48px] font-semibold tracking-tight">
            Watch solar pay for itself
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-body">
            Move the sliders and your estimate rebuilds live — grant, savings, payback, the lot.
            Then upload your bill and we run it on your real numbers.
          </p>
        </div>
      )}

      {/* The split: play left · full-glory estimate right */}
      <div className={`${showHeader ? 'mt-10' : ''} grid lg:grid-cols-2 gap-6 items-start`}>
        {/* ── LEFT · play ─────────────────────────────────────────── */}
        <div className="rounded-panel bg-card shadow-card p-6 space-y-7">
          <div>
            <label className="text-sm font-medium mb-2 block">Your roof</label>
            <RoofDesigner panelWatts={cfg.panelWatts} onChange={({ panels, kwp, address }) => { setRoofPanels(panels); setRoofKwp(kwp); setRoofAddress(address); }} />
            {roofPanels > 0 && (
              <p className="mt-2 text-xs font-medium text-doc-deposit">Room for about {roofPanels} panels here — a {roofKwp} kWp system, now in your estimate.</p>
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
            <label className="text-sm font-medium mb-2 block">Roof faces</label>
            <div className="grid grid-cols-4 gap-2">
              {(['south', 'east', 'west', 'north'] as const).map(dir => (
                <button key={dir} onClick={() => setOrientation(dir)}
                  className={`py-2.5 rounded-control border text-xs font-medium capitalize transition-colors ${orientation === dir ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
                  <Sun className={`size-4 mx-auto mb-1 ${orientation === dir ? 'text-doc-proposal' : 'text-muted-foreground'}`} />
                  {dir}
                </button>
              ))}
            </div>
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

          <div className="rounded-panel bg-muted/40 p-3.5 flex items-center gap-3">
            <Upload className="size-4 text-muted-foreground shrink-0" />
            <p className="text-2xs text-muted-foreground flex-1">Sliders are an estimate. Upload your bill and we read up to 21 details for the exact numbers.</p>
            <button onClick={goToStart} className="text-2xs font-semibold text-foreground underline underline-offset-2 shrink-0 hover:no-underline">Upload bill</button>
          </div>
        </div>

        {/* ── RIGHT · the estimate, in full glory ─────────────────── */}
        <div className="rounded-panel bg-card shadow-card overflow-hidden">
          <div className="px-6 pt-6 pb-5 border-b border-border">
            <p className="label-micro">Estimated 20-year saving</p>
            <Money value={r.twentyYear} className="block mt-1 text-4xl sm:text-[44px] sm:leading-[48px] font-semibold tracking-tight text-doc-deposit tabular-nums" />
            <p className="mt-2 text-xs text-muted-foreground leading-body">
              The SEAI grant takes <span className="font-semibold text-foreground tabular-nums">{eur(r.seaiGrant)}</span> off the price, and the system pays for itself in about <span className="font-semibold text-foreground tabular-nums">{r.paybackYears} years</span> — everything after that comes off your bills.
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
            <div className="flex justify-between text-doc-deposit"><span>SEAI grant</span><span className="tabular-nums">−{eur(r.seaiGrant)}</span></div>
            <div className="flex justify-between font-semibold border-t border-border pt-1.5"><span>Your net cost</span><span className="tabular-nums"><Money value={r.netCost} /></span></div>
          </div>

          <div className="px-6 pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="label-micro">Where you stand, year by year</p>
              <span className="text-2xs text-muted-foreground">20-yr view</span>
            </div>
            <div className="h-40 -mx-4">
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

          <div className="p-4 pt-0">
            <button onClick={goToStart}
              className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-panel bg-pop text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Get this on my real numbers <ArrowRight className="size-4" />
            </button>
            <p className="mt-2 text-2xs text-center text-muted-foreground">Free · no signup · we read up to 21 details off your bill</p>
          </div>
        </div>
      </div>

      <p className="text-2xs text-center text-muted-foreground mt-6 max-w-2xl mx-auto">
        Estimate only — Irish retail rate €0.35/kWh, SEAI grant €700/kWp to 2 kWp then €200/kWp to 4 kWp (max €1,800), 70% self-consumption, 0% VAT.
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
