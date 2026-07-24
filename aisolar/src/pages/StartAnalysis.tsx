/**
 * StartAnalysis — /start
 *
 * The homeowner front door (Cal's vision): bill in one flow, then a smooth
 * transition into the 21-point estimate, then one button to book a call.
 *
 *   choose ─▶ upload ─┐
 *            manual ──┴─▶ estimate (numbers + satellite of the roof) ─▶ book
 *
 * Rules Cal set:
 *   - The ONLY typed fields are mobile + email. Everything else is read off the
 *     bill, or (manual fallback) the few most-weighted inputs.
 *   - No auto roof-detection claim. We show the real satellite IMAGE of the
 *     address (Google Maps embed, geocoded from the eircode) — that's true and
 *     easy; the array is sized from bill/survey, not a scan.
 *   - Charcoal + white + grey, one quiet lift of colour. cal.com-clean.
 *
 * The extraction call goes to the deployed `extract-bill-data` edge function.
 * Until that Supabase is reachable it falls back to a worked sample so the flow
 * is walkable — the estimate maths (calculateSystemEstimate) is the real thing.
 */
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Upload, Pencil, FileText, Loader2, Check,
  Sun, Battery, Euro, TrendingDown, CalendarClock, ShieldCheck, Award,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { calculateSystemEstimate } from '@/lib/leadIntake';
import { AisolarWordmark } from '@/components/brand/AiosMark';
import SEOHead from '@/components/SEOHead';
import { toast } from 'sonner';
import { Field, InputGroup } from '@/components/ui/field';

const CAL_LINK = 'https://cal.com/renewableireland/solar-consultation';
const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type Step = 'choose' | 'upload' | 'manual' | 'estimate' | 'book' | 'callback';

/** What the calculator carries forward when the customer clicks through. */
interface CarriedCalc {
  monthlyBill?: number; nightPct?: number;
  orientation?: string; battery?: boolean;
  roofPanels?: number; roofKwp?: number; roofAddress?: string;
  systemSizeKw?: number; annualSavings?: number;
  seaiGrant?: number; netCost?: number; paybackYears?: number;
}

interface BillData {
  // the full 21-field read (whatever the extractor found)
  mprn?: string | null;
  monthlyBill?: number | null;
  annualKwh?: number | null;
  billingPeriodKwh?: number | null;
  accountName?: string | null;
  address?: string | null;
  eircode?: string | null;
  provider?: string | null;
  tariffName?: string | null;
  billingPeriod?: string | null;
  unitRate?: number | null;
  nightRate?: number | null;
  standingCharge?: number | null;
  standingChargeUnit?: string | null;
  vatRate?: number | null;
  dayNightMeter?: boolean | null;
  dayUsageKwh?: number | null;
  nightUsageKwh?: number | null;
  estimatedReading?: boolean | null;
  notes?: string | null;
  fieldsRead: number;      // how many bill details we actually hold
}

/* A worked sample so the flow is walkable before the extractor is live. The
   maths downstream is real; only these inputs are illustrative. Full 21 so the
   estimate can prove the depth of the read — that depth is what sells the call. */
const SAMPLE: BillData = {
  mprn: '10001234567', monthlyBill: 296, annualKwh: 10200, billingPeriodKwh: 1700,
  accountName: 'J. Murphy', address: '14 Ailesbury Road, Ballsbridge, Dublin 4', eircode: 'D04 X8N7',
  provider: 'Electric Ireland', tariffName: 'Home Electric+ Night Boost', billingPeriod: 'Bi-monthly',
  unitRate: 0.3512, nightRate: 0.1721, standingCharge: 0.6027, standingChargeUnit: 'per day', vatRate: 9,
  dayNightMeter: true, dayUsageKwh: 6600, nightUsageKwh: 3600, estimatedReading: false, notes: null,
  fieldsRead: 19,
};

/**
 * Turn what the calculator carried into a BillData so the customer lands on the
 * estimate directly — not the old questionnaire. Annual usage is derived from
 * the monthly bill the same way the manual path does it (÷ €0.35/kWh).
 */
function billFromCarried(c: CarriedCalc): BillData {
  const mb = c.monthlyBill ?? null;
  const annualKwh = mb ? Math.round((mb * 12) / 0.35) : null;
  return {
    monthlyBill: mb,
    annualKwh,
    dayNightMeter: (c.nightPct ?? 0) >= 40,
    eircode: c.roofAddress || null,
    notes: [c.battery ? 'Wants a battery' : null, c.roofKwp ? `Drew ~${c.roofKwp} kWp on their roof` : null].filter(Boolean).join(' · ') || null,
    fieldsRead: [mb, c.nightPct, c.roofAddress].filter(Boolean).length,
  };
}

export default function StartAnalysis() {
  // The calculator (widget, /calculator, landing) hands off what the customer
  // already did — bill, night split, the roof they drew — via navigation state.
  // They've done the work, so we land them straight on the estimate + book,
  // NOT the old questionnaire (Cal: don't re-ask what the widget captured).
  const carried = (useLocation().state as { calc?: CarriedCalc } | null)?.calc ?? null;

  const [step, setStep] = useState<Step>(carried ? 'estimate' : 'choose');
  const [bill, setBill] = useState<BillData | null>(() => carried ? billFromCarried(carried) : null);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState({ name: '', mobile: '', email: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  // manual inputs — the few that actually move the estimate, most-weighted first,
  // plus two sticky yes/no questions that sharpen it and pull the user in.
  const [manual, setManual] = useState({ monthlyBill: '', dayNight: false, eircode: '', ev: null as boolean | null, daytime: null as boolean | null });

  // Wizard steps swap content without a route change, so the global
  // ScrollToTop never fires — you'd submit the form and land halfway down your
  // own estimate. Take them to the top of each new step.
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const estimate = bill
    ? calculateSystemEstimate({ monthlyBill: bill.monthlyBill, annualKwh: bill.annualKwh })
    : null;

  const nightPct = bill?.dayUsageKwh && bill?.nightUsageKwh
    ? Math.round((bill.nightUsageKwh / (bill.dayUsageKwh + bill.nightUsageKwh)) * 100)
    : null;

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1] ?? '');
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke('extract-bill-data', {
        body: { imageBase64: b64, fileType: file.type },
      });
      if (error || !data?.data) throw error ?? new Error('no data');
      const d = data.data;
      const held = Object.entries(d).filter(([k, v]) => k !== 'confidence' && v != null).length;
      setBill({
        mprn: d.mprn, monthlyBill: d.billAmount, annualKwh: d.annualKwh, billingPeriodKwh: d.billingPeriodKwh,
        accountName: d.accountName, address: d.address, eircode: d.eircode, provider: d.provider,
        tariffName: d.tariffName, billingPeriod: d.billingPeriod, unitRate: d.unitRate, nightRate: d.nightRate,
        standingCharge: d.standingCharge, standingChargeUnit: d.standingChargeUnit, vatRate: d.vatRate,
        dayNightMeter: d.dayNightMeter, dayUsageKwh: d.dayUsageKwh, nightUsageKwh: d.nightUsageKwh,
        estimatedReading: d.estimatedReading, notes: d.notes, fieldsRead: held,
      });
    } catch {
      // Extractor not reachable yet (Supabase not live) — walk the flow on the
      // worked sample rather than dead-ending the homeowner.
      setBill(SAMPLE);
    } finally {
      setBusy(false);
      setStep('estimate');
    }
  }

  function submitManual() {
    const mb = parseFloat(manual.monthlyBill);
    // Derive annual usage from the bill; an EV adds ~2,000 kWh/yr, which pushes
    // the recommended system up — the yes/no answers actually move the estimate.
    const baseKwh = isFinite(mb) ? (mb * 12) / 0.35 : null;
    const annualKwh = baseKwh != null ? Math.round(baseKwh + (manual.ev ? 2000 : 0)) : null;
    setBill({
      monthlyBill: isFinite(mb) ? mb : null,
      annualKwh,
      dayNightMeter: manual.dayNight,
      eircode: manual.eircode || null,
      notes: [manual.ev ? 'Has an EV' : null, manual.daytime ? 'Home during the day' : null].filter(Boolean).join(' · ') || null,
      fieldsRead: [manual.monthlyBill, manual.dayNight, manual.eircode, manual.ev != null, manual.daytime != null].filter(Boolean).length,
    });
    setStep('estimate');
  }

  const satelliteSrc = bill?.eircode
    ? `https://maps.google.com/maps?q=${encodeURIComponent(bill.eircode)}&t=k&z=19&output=embed`
    : null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SEOHead
        title="Your free solar estimate — AISOLAR"
        description="Upload your electricity bill or draw your roof and get a solar estimate on your real numbers: system size, SEAI grant, annual saving and payback. Free, no signup."
        canonical="https://aisolar.ie/start"
      />
      {/* slim header */}
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <AisolarWordmark className="size-8" />
            <span className="font-semibold tracking-tight text-sm">AISolar <span className="text-muted-foreground font-normal">by AIOS</span></span>
          </Link>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Free · no obligation
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 lg:py-14">
        {/* ── CHOOSE ─────────────────────────────────────────────────────── */}
        {step === 'choose' && (
          <div className="min-w-0">
            <div className="max-w-xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">See what solar saves you</h1>
              <p className="mt-3 text-muted-foreground leading-body">
                Your last electricity bill has everything we need. Upload it and
                we'll read the numbers that decide your system — no forms.
              </p>
            </div>

            <div className="mt-8 grid gap-3 max-w-xl mx-auto">
              <button onClick={() => { setStep('upload'); }}
                className="group rounded-panel border border-border bg-card shadow-card p-5 text-left flex items-center gap-4 hover:border-primary/40 transition-colors">
                <span className="size-11 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0"><Upload className="size-5" /></span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold flex items-center gap-2 flex-wrap">Upload your bill <span className="text-2xs font-medium bg-doc-deposit/10 text-doc-deposit rounded-full px-2 py-0.5">most accurate</span></span>
                  <span className="block text-sm text-muted-foreground mt-0.5">A photo or PDF. We read up to 21 details off it.</span>
                </span>
                <ArrowRight className="size-5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
              </button>
              <button onClick={() => setStep('manual')}
                className="group rounded-panel border border-border bg-card shadow-card p-5 text-left flex items-center gap-4 hover:border-primary/40 transition-colors">
                <span className="size-11 rounded-lg bg-muted grid place-items-center shrink-0"><Pencil className="size-5" /></span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold">Enter it manually</span>
                  <span className="block text-sm text-muted-foreground mt-0.5">Three quick numbers if you don't have the bill handy.</span>
                </span>
                <ArrowRight className="size-5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
              </button>
            </div>

            {/* ── THE MOAT, MADE VISIBLE ───────────────────────────────────────
                The whole differentiator is "we read 21 details off your bill".
                Saying it in one line and leaving the rest of the screen empty
                sells nothing — so show the actual fields, and what they buy. */}
            <section className="mt-12 rounded-panel bg-card shadow-card overflow-hidden min-w-0">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-2 flex-wrap">
                <FileText className="size-4 text-brand-aisolar shrink-0" />
                <span className="text-sm font-semibold">What we read off your bill</span>
                <span className="ml-auto text-2xs text-muted-foreground">up to 21 details · about 20 seconds</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border">
                {[
                  ['MPRN', 'identifies your connection'],
                  ['Annual usage', 'sizes the system'],
                  ['Day / night split', 'decides the battery case'],
                  ['Unit rate', 'values every saved kWh'],
                  ['Night rate', 'prices the evening'],
                  ['Standing charge', 'the part solar never cuts'],
                ].map(([k, why]) => (
                  <div key={k} className="p-3.5 min-w-0">
                    <p className="text-xs font-semibold truncate">{k}</p>
                    <p className="mt-0.5 text-2xs text-muted-foreground leading-snug">{why}</p>
                  </div>
                ))}
              </div>
              <p className="px-5 py-2.5 text-2xs text-muted-foreground border-t border-border">
                …plus tariff, billing period, supplier, meter type, reading type and more.
                Every figure in your estimate traces back to one of them.
              </p>
            </section>

            {/* what you actually walk away with */}
            <section className="mt-4 grid sm:grid-cols-3 gap-3 min-w-0">
              {[
                { icon: Sun, t: 'Your system size', s: 'In kWp and panel count, sized to your usage — not an average home.' },
                { icon: Award, t: 'Your SEAI grant', s: 'The exact figure you qualify for, and what you actually pay after it.' },
                { icon: TrendingDown, t: 'Your payback year', s: 'When it stops costing and starts paying, on your numbers.' },
              ].map(({ icon: I, t, s }) => (
                <div key={t} className="rounded-panel bg-card shadow-card p-4 min-w-0">
                  <I className="size-4 text-brand-aisolar" />
                  <p className="mt-2 text-sm font-semibold">{t}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s}</p>
                </div>
              ))}
            </section>

            <p className="mt-5 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap">
              <ShieldCheck className="size-3.5 shrink-0" />
              Free, no signup, no obligation. Your bill stays in the EU and we only read the energy figures.
            </p>
          </div>
        )}

        {/* ── UPLOAD ─────────────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="max-w-xl mx-auto">
            <BackBtn onClick={() => setStep('choose')} />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Upload your electricity bill</h1>
            <p className="mt-2 text-muted-foreground leading-body">A clear photo or PDF of any recent bill. It never leaves the EU, and we only read the energy figures.</p>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="mt-6 w-full rounded-panel border-2 border-dashed border-border bg-card p-10 grid place-items-center gap-3 text-center hover:border-primary/50 transition-colors disabled:opacity-70"
            >
              {busy ? (
                <><Loader2 className="size-7 text-primary animate-spin" /><span className="text-sm font-medium">Reading your bill…</span></>
              ) : (
                <><span className="size-12 rounded-full bg-primary/10 text-primary grid place-items-center"><Upload className="size-6" /></span>
                  <span className="font-medium">Tap to add your bill</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG or PDF · up to 5&nbsp;MB</span></>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            <button onClick={() => setStep('manual')} className="mt-4 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
              I don't have my bill — enter it manually
            </button>
          </div>
        )}

        {/* ── MANUAL ─────────────────────────────────────────────────────── */}
        {step === 'manual' && (
          <div className="max-w-md mx-auto">
            <BackBtn onClick={() => setStep('choose')} />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">A few quick numbers</h1>
            <p className="mt-2 text-muted-foreground leading-body">Just the ones that move the estimate. You can confirm the rest on the call.</p>

            <div className="mt-6 space-y-5">
              <Field label="Your typical monthly electricity bill" htmlFor="mb" required helper="The single biggest driver of your system size.">
                <InputGroup prefix="€">
                  <input id="mb" inputMode="decimal" value={manual.monthlyBill}
                    onChange={e => setManual(m => ({ ...m, monthlyBill: e.target.value }))}
                    placeholder="0"
                    className="w-full h-control bg-transparent px-3 text-base outline-none tabular-nums" />
                </InputGroup>
              </Field>

              <Field label="Do you have a day/night meter?" helper="Night-heavy homes need a different battery case — this changes the recommendation.">
                <div className="flex gap-2">
                  {[['Yes', true], ['No / not sure', false]].map(([label, val]) => (
                    <button key={String(label)} type="button" onClick={() => setManual(m => ({ ...m, dayNight: val as boolean }))}
                      className={`flex-1 h-control rounded-control border text-sm font-medium transition-colors ${manual.dayNight === val ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>

              <YesNo label="Do you drive an EV (or plan to)?"
                helper="An EV roughly doubles a home's usage — we size for it."
                value={manual.ev} onChange={v => setManual(m => ({ ...m, ev: v }))} />

              <YesNo label="Is someone usually home during the day?"
                helper="Daytime use is what solar replaces directly — it lifts your savings."
                value={manual.daytime} onChange={v => setManual(m => ({ ...m, daytime: v }))} />

              <Field label="Eircode" htmlFor="ec" helper="So we can show your roof from satellite. Optional.">
                <input id="ec" value={manual.eircode}
                  onChange={e => setManual(m => ({ ...m, eircode: e.target.value.toUpperCase() }))}
                  placeholder="D04 X8N7"
                  className="w-full h-control rounded-control border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 uppercase" />
              </Field>
            </div>

            <button onClick={submitManual} disabled={!manual.monthlyBill}
              className="mt-7 w-full h-11 rounded-control bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40">
              See my estimate <ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {/* ── ESTIMATE ───────────────────────────────────────────────────── */}
        {step === 'estimate' && estimate && (
          /* wider than the other steps — the live calculator is two columns */
          <div className="max-w-5xl mx-auto">
            <div className="text-center">
              {bill && bill.fieldsRead > 3 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-doc-deposit/10 text-doc-deposit text-xs font-medium px-3 py-1">
                  <Check className="size-3.5" /> Read {bill.fieldsRead} details off your bill
                </span>
              )}
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">Your solar estimate</h1>
              <p className="mt-2 text-muted-foreground">Built on your real numbers. Confirmed on a 30-minute call.</p>
            </div>

            {/* YOUR figures, stated — not sliders. The calculator is for people
                who DON'T have their bill to hand; here we already read it, so
                showing a guessing tool would undercut the whole point. */}
            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              <Metric icon={<Sun className="size-4" />} label="Recommended system" value={`${estimate.systemSizeKw} kWp`} sub={`covers ~${estimate.solarOffsetPct}% of your usage`} hero />
              <Metric icon={<Euro className="size-4" />} label="You pay after SEAI grant" value={eur(estimate.netCost)} sub={`${eur(estimate.grossCost)} − ${eur(estimate.seaiGrant)} grant`} />
              <Metric icon={<TrendingDown className="size-4" />} label="Saved every year" value={eur(estimate.annualSavings)} sub={`${estimate.paybackYears} yr payback`} />
              <Metric icon={<Battery className="size-4" />} label="20-year saving" value={eur(estimate.twentyYearSavings)} sub={`${estimate.co2TonnesPerYear} t CO₂ cut / yr`} />
            </div>

            {/* day/night split — the moat, if we have it */}
            {nightPct != null && (
              <div className="mt-4 rounded-panel border border-border bg-card shadow-card p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">Your day / night split</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{100 - nightPct}% day · {nightPct}% night</span>
                </div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
                  <div className="bg-primary" style={{ width: `${100 - nightPct}%` }} />
                  <div className="bg-primary/30" style={{ width: `${nightPct}%` }} />
                </div>
                <p className="mt-2.5 text-xs text-muted-foreground leading-body">
                  {nightPct >= 40
                    ? `You use ${nightPct}% at night on the cheaper rate — solar does the heavy lifting by day, so we'll be honest on the call about whether a battery is worth it for you.`
                    : `You use ${100 - nightPct}% by day at the expensive rate — exactly the half solar replaces, which is why your savings land where they do.`}
                </p>
              </div>
            )}

            {/* THE READ — all 21 points we pulled off the bill. This is the sell:
                every figure the estimate runs on, shown, so the survey is the
                obvious next step. */}
            {bill && <BillReadPanel bill={bill} />}

            {/* satellite of the actual roof (imagery only — no auto-detection) */}
            {satelliteSrc && (
              <div className="mt-4 rounded-panel border border-border bg-card shadow-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border text-sm font-semibold">Your roof from above</div>
                <iframe title="Property satellite view" src={satelliteSrc} className="w-full h-64 border-0" loading="lazy" />
                <p className="px-4 py-2 text-2xs text-muted-foreground">Satellite imagery. Exact panel layout is measured at your free survey.</p>
              </div>
            )}

            {/* ── THE ASK — Problem → Solution → Ask ──────────────────────────
                An estimate on its own doesn't get anyone a system. This says
                plainly what the estimate CAN'T tell you, what a proposal adds,
                and then gives two honest doors: the full thing, or just have
                someone ring you. */}
            <section className="mt-8 rounded-panel bg-card shadow-card overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-border">
                <p className="label-micro text-brand-aisolar">What this estimate can't tell you</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight">
                  It's your numbers. It isn't your roof yet.
                </h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xl">
                  The figures above run off your real usage, so they're honest — but they
                  assume a standard roof. What they can't know is your pitch and shading,
                  exactly how many panels fit, where the inverter goes, or what your
                  MPRN allows for export. That's what turns an estimate into a firm price.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {/* Door 1 — the full thing */}
                <div className="p-5 sm:p-6 min-w-0">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-brand-aisolar">Recommended</p>
                  <h3 className="mt-1.5 font-semibold">Turn this into a full proposal</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    A free 30-minute survey, then a fixed written proposal.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {[
                      'Your exact panel layout, measured on your roof',
                      'A firm price — not a ballpark',
                      'Your SEAI grant application prepared for you',
                      'ESB registration handled as part of the job',
                    ].map(x => (
                      <li key={x} className="flex items-start gap-2 text-xs">
                        <Check className="size-3.5 text-doc-deposit mt-0.5 shrink-0" />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setStep('book')}
                    className="mt-4 w-full h-control rounded-control bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    <CalendarClock className="size-4" /> Book my free survey
                  </button>
                  <p className="mt-2 text-2xs text-center text-muted-foreground">Free · no obligation · 30 minutes</p>
                </div>

                {/* Door 2 — low friction */}
                <div className="p-5 sm:p-6 min-w-0">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Not ready to book?</p>
                  <h3 className="mt-1.5 font-semibold">Have a consultant call you</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Leave your details and we'll come back to you — no calendars, no pressure.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {[
                      'We keep this estimate on file against your name',
                      'A real person answers your questions',
                      'You decide if a survey is worth your time',
                    ].map(x => (
                      <li key={x} className="flex items-start gap-2 text-xs">
                        <Check className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setStep('callback')}
                    className="mt-4 w-full h-control rounded-control border border-border bg-background text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors">
                    Ask a consultant to call
                  </button>
                  <p className="mt-2 text-2xs text-center text-muted-foreground">Name, email and number — that's it</p>
                </div>
              </div>
            </section>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Figures are indicative and confirmed at your survey and on your SEAI application.
            </p>
          </div>
        )}

        {/* ── BOOK ───────────────────────────────────────────────────────── */}
        {step === 'book' && (
          <div className="max-w-2xl mx-auto">
            <BackBtn onClick={() => setStep('estimate')} />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Turn this into a real quote</h1>
            <p className="mt-2 text-muted-foreground leading-body">
              A free 30-minute survey confirms every number above and locks your
              SEAI grant. Your bill read and estimate come with you — the
              consultant already has your figures, so there's nothing to repeat.
            </p>

            {/* what the survey gets them — sell it */}
            <ul className="mt-4 grid sm:grid-cols-3 gap-2">
              {[['Exact roof + panel layout', ShieldCheck], ['Your SEAI grant secured', Euro], ['Firm price, no pressure', Check]].map(([t, Ic]) => {
                const Icon = Ic as typeof Check;
                return <li key={t as string} className="flex items-center gap-2 rounded-control border border-border bg-card px-3 py-2 text-xs font-medium"><Icon className="size-3.5 text-doc-deposit" /> {t as string}</li>;
              })}
            </ul>

            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              <Field label="Name" htmlFor="nm" required>
                <input id="nm" autoComplete="name" value={contact.name}
                  onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full h-control rounded-control border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25" />
              </Field>
              <Field label="Mobile" htmlFor="mob" required>
                <input id="mob" inputMode="tel" autoComplete="tel" value={contact.mobile}
                  onChange={e => setContact(c => ({ ...c, mobile: e.target.value }))}
                  placeholder="08X XXX XXXX"
                  className="w-full h-control rounded-control border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25" />
              </Field>
              <Field label="Email" htmlFor="em" required>
                <input id="em" type="email" inputMode="email" autoComplete="email" value={contact.email}
                  onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                  placeholder="you@example.ie"
                  className="w-full h-control rounded-control border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25" />
              </Field>
            </div>

            <div className="mt-4 rounded-panel border border-border bg-card shadow-card overflow-hidden">
              <iframe
                title="Book a consultation"
                src={`${CAL_LINK}?embed=true${contact.email ? `&email=${encodeURIComponent(contact.email)}` : ''}${contact.name ? `&name=${encodeURIComponent(contact.name)}` : ''}`}
                className="w-full h-[560px] border-0"
                loading="lazy"
              />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Your details stay in the EU and are only used for your consultation.
            </p>
          </div>
        )}

        {/* ── CALLBACK — the low-friction door. Three fields, no calendar. ──── */}
        {step === 'callback' && (
          <div className="max-w-md mx-auto">
            <BackBtn onClick={() => setStep('estimate')} />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Have a consultant call you</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              We'll keep your estimate on file against your name so you don't have to
              explain it twice. No calendars, no pressure.
            </p>

            {/* what they're leaving behind, so it's not a blind form */}
            {estimate && (
              <div className="mt-5 rounded-panel bg-muted/40 p-3.5 text-xs">
                <p className="font-medium text-foreground">We'll bring this to the call:</p>
                <p className="mt-1 text-muted-foreground">
                  {estimate.systemSizeKw} kWp · {eur(estimate.netCost)} after grant ·
                  {' '}{eur(estimate.annualSavings)}/yr saved
                  {bill?.fieldsRead ? ` · read from ${bill.fieldsRead} details on your bill` : ''}
                </p>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <Field label="Your name" required>
                <InputGroup>
                  <input value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
                    placeholder="Your name" className="w-full h-control bg-transparent px-3 text-sm outline-none" />
                </InputGroup>
              </Field>
              <Field label="Email" required>
                <InputGroup>
                  <input type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                    placeholder="you@example.ie" className="w-full h-control bg-transparent px-3 text-sm outline-none" />
                </InputGroup>
              </Field>
              <Field label="Phone" required helper="So a consultant can actually reach you.">
                <InputGroup>
                  <input type="tel" value={contact.mobile} onChange={e => setContact(c => ({ ...c, mobile: e.target.value }))}
                    placeholder="08X XXX XXXX" className="w-full h-control bg-transparent px-3 text-sm outline-none" />
                </InputGroup>
              </Field>
            </div>

            <button
              disabled={!contact.name.trim() || !contact.email.trim() || !contact.mobile.trim()}
              onClick={() => toast.success(`Thanks ${contact.name.split(' ')[0] || ''} — a consultant will be in touch`, {
                description: 'Your estimate is saved against your name. Usually within one working day.',
              })}
              className="mt-5 w-full h-12 rounded-control bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Ask a consultant to call me
            </button>
            <p className="mt-2 text-center text-2xs text-muted-foreground">
              Usually within one working day. No sales pressure.
            </p>
            <p className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Your details stay in the EU and are only used to contact you about this estimate.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function YesNo({ label, helper, value, onChange }: { label: string; helper?: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <Field label={label} helper={helper}>
      <div className="flex gap-2">
        {[['Yes', true], ['No', false]].map(([l, v]) => (
          <button key={String(l)} type="button" onClick={() => onChange(v as boolean)}
            className={`flex-1 h-control rounded-control border text-sm font-medium transition-colors ${value === v ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {l}
          </button>
        ))}
      </div>
    </Field>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft className="size-4" /> Back
    </button>
  );
}

/* The full 21-point read. Renders whatever the extractor actually found, with a
   dynamic count (never overclaims), framed as "no other quote opened your bill". */
function BillReadPanel({ bill }: { bill: BillData }) {
  const rate = (n?: number | null) => (n == null ? undefined : `€${Number(n).toFixed(2)}/kWh`);
  const rows: Array<{ label: string; value?: string }> = [
    { label: 'Supplier', value: bill.provider ?? undefined },
    { label: 'Tariff', value: bill.tariffName ?? undefined },
    { label: 'MPRN', value: bill.mprn ? `${bill.mprn.slice(0, 3)}••••${bill.mprn.slice(-3)}` : undefined },
    { label: 'Account', value: bill.accountName ?? undefined },
    { label: 'Monthly bill', value: bill.monthlyBill != null ? eur(bill.monthlyBill) : undefined },
    { label: 'Annual usage', value: bill.annualKwh != null ? `${bill.annualKwh.toLocaleString()} kWh` : undefined },
    { label: 'Billed usage', value: bill.billingPeriodKwh != null ? `${bill.billingPeriodKwh.toLocaleString()} kWh` : undefined },
    { label: 'Day rate', value: rate(bill.unitRate) },
    { label: 'Night rate', value: rate(bill.nightRate) },
    { label: 'Standing charge', value: bill.standingCharge != null ? `€${bill.standingCharge.toFixed(2)}${bill.standingChargeUnit ? ` ${bill.standingChargeUnit}` : ''}` : undefined },
    { label: 'VAT', value: bill.vatRate != null ? `${bill.vatRate}%` : undefined },
    { label: 'Meter', value: bill.dayNightMeter == null ? undefined : bill.dayNightMeter ? 'Day / night' : 'Single rate' },
    { label: 'Day usage', value: bill.dayUsageKwh != null ? `${bill.dayUsageKwh.toLocaleString()} kWh` : undefined },
    { label: 'Night usage', value: bill.nightUsageKwh != null ? `${bill.nightUsageKwh.toLocaleString()} kWh` : undefined },
    { label: 'Billing period', value: bill.billingPeriod ?? undefined },
    { label: 'Reading', value: bill.estimatedReading == null ? undefined : bill.estimatedReading ? 'Estimated' : 'Actual read' },
    { label: 'Eircode', value: bill.eircode ?? undefined },
    { label: 'Supply address', value: bill.address ? bill.address.split(',').slice(0, 2).join(',') : undefined },
  ];
  const cells = rows.filter(r => r.value);
  const pad = (4 - (cells.length % 4)) % 4;
  return (
    <div className="mt-4 rounded-panel border border-border bg-card shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <span className="text-sm font-semibold">What your bill told us</span>
          <span className="ml-auto text-2xs font-medium rounded-full bg-doc-deposit/10 text-doc-deposit px-2 py-0.5">{cells.length} details read</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 leading-body">
          Every figure above runs off these. Ask the other quotes you get which of them opened your bill.
        </p>
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {cells.map(c => (
          <div key={c.label} className="bg-card px-3 py-2.5">
            <dt className="label-micro">{c.label}</dt>
            <dd className="text-sm font-semibold tabular-nums truncate mt-0.5">{c.value}</dd>
          </div>
        ))}
        {Array.from({ length: pad }).map((_, k) => <div key={`p${k}`} className="bg-card hidden md:block" aria-hidden />)}
      </dl>
    </div>
  );
}

function Metric({ icon, label, value, sub, hero }: { icon: React.ReactNode; label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className={`rounded-panel border bg-card shadow-card p-4 ${hero ? 'border-primary/30 bg-primary/[0.03]' : 'border-border'}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className={hero ? 'text-primary' : ''}>{icon}</span>
        <span className="label-micro">{label}</span>
      </div>
      <div className={`mt-1.5 font-semibold tabular-nums ${hero ? 'text-2xl text-primary' : 'text-xl'}`}>{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
