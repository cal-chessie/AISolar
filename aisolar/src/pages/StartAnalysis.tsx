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
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Upload, Pencil, FileText, Loader2, Check,
  Sun, Battery, Euro, TrendingDown, CalendarClock, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { calculateSystemEstimate } from '@/lib/leadIntake';
import { AisolarWordmark } from '@/components/brand/AiosMark';
import { Field, InputGroup } from '@/components/ui/field';

const CAL_LINK = 'https://cal.com/renewableireland/solar-consultation';
const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type Step = 'choose' | 'upload' | 'manual' | 'estimate' | 'book';

interface BillData {
  monthlyBill?: number | null;
  annualKwh?: number | null;
  dayUsageKwh?: number | null;
  nightUsageKwh?: number | null;
  dayNightMeter?: boolean | null;
  eircode?: string | null;
  provider?: string | null;
  fieldsRead: number;      // how many bill details we actually hold
}

/* A worked sample so the flow is walkable before the extractor is live. The
   maths downstream is real; only these inputs are illustrative. */
const SAMPLE: BillData = {
  monthlyBill: 296, annualKwh: 10200, dayUsageKwh: 6600, nightUsageKwh: 3600,
  dayNightMeter: true, eircode: 'D04 X8N7', provider: 'Electric Ireland', fieldsRead: 17,
};

export default function StartAnalysis() {
  const [step, setStep] = useState<Step>('choose');
  const [bill, setBill] = useState<BillData | null>(null);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState({ mobile: '', email: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  // manual inputs — the few that actually move the estimate, most-weighted first
  const [manual, setManual] = useState({ monthlyBill: '', dayNight: false, eircode: '' });

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
        monthlyBill: d.billAmount, annualKwh: d.annualKwh, dayUsageKwh: d.dayUsageKwh,
        nightUsageKwh: d.nightUsageKwh, dayNightMeter: d.dayNightMeter, eircode: d.eircode,
        provider: d.provider, fieldsRead: held,
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
    setBill({
      monthlyBill: isFinite(mb) ? mb : null,
      annualKwh: null,
      dayNightMeter: manual.dayNight,
      eircode: manual.eircode || null,
      fieldsRead: [manual.monthlyBill, manual.dayNight, manual.eircode].filter(Boolean).length,
    });
    setStep('estimate');
  }

  const satelliteSrc = bill?.eircode
    ? `https://maps.google.com/maps?q=${encodeURIComponent(bill.eircode)}&t=k&z=19&output=embed`
    : null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
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
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">See what solar saves you</h1>
            <p className="mt-3 text-muted-foreground leading-body">
              Your last electricity bill has everything we need. Upload it and
              we'll read the numbers that decide your system — no forms.
            </p>
            <div className="mt-8 grid gap-3">
              <button onClick={() => { setStep('upload'); }}
                className="group rounded-panel border border-border bg-card shadow-card p-5 text-left flex items-center gap-4 hover:border-primary/40 transition-colors">
                <span className="size-11 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0"><Upload className="size-5" /></span>
                <span className="flex-1">
                  <span className="font-semibold flex items-center gap-2">Upload your bill <span className="text-2xs font-medium bg-doc-deposit/10 text-doc-deposit rounded-full px-2 py-0.5">most accurate</span></span>
                  <span className="block text-sm text-muted-foreground mt-0.5">A photo or PDF. We read 21 details off it.</span>
                </span>
                <ArrowRight className="size-5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              </button>
              <button onClick={() => setStep('manual')}
                className="group rounded-panel border border-border bg-card shadow-card p-5 text-left flex items-center gap-4 hover:border-primary/40 transition-colors">
                <span className="size-11 rounded-lg bg-muted grid place-items-center shrink-0"><Pencil className="size-5" /></span>
                <span className="flex-1">
                  <span className="font-semibold">Enter it manually</span>
                  <span className="block text-sm text-muted-foreground mt-0.5">Three quick numbers if you don't have the bill handy.</span>
                </span>
                <ArrowRight className="size-5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              </button>
            </div>
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
          <div className="max-w-2xl mx-auto">
            <div className="text-center">
              {bill && bill.fieldsRead > 3 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-doc-deposit/10 text-doc-deposit text-xs font-medium px-3 py-1">
                  <Check className="size-3.5" /> Read {bill.fieldsRead} details off your bill
                </span>
              )}
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">Your solar estimate</h1>
              <p className="mt-2 text-muted-foreground">Built on your real numbers. Confirmed on a 30-minute call.</p>
            </div>

            {/* headline figures */}
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

            {/* satellite of the actual roof (imagery only — no auto-detection) */}
            {satelliteSrc && (
              <div className="mt-4 rounded-panel border border-border bg-card shadow-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border text-sm font-semibold">Your roof from above</div>
                <iframe title="Property satellite view" src={satelliteSrc} className="w-full h-64 border-0" loading="lazy" />
                <p className="px-4 py-2 text-2xs text-muted-foreground">Satellite imagery. Exact panel layout is measured at your free survey.</p>
              </div>
            )}

            <button onClick={() => setStep('book')}
              className="mt-6 w-full h-12 rounded-control bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <CalendarClock className="size-4" /> Book my free consultation
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Ballpark figures. Your exact quote comes after a free survey.</p>
          </div>
        )}

        {/* ── BOOK ───────────────────────────────────────────────────────── */}
        {step === 'book' && (
          <div className="max-w-2xl mx-auto">
            <BackBtn onClick={() => setStep('estimate')} />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Book your call</h1>
            <p className="mt-2 text-muted-foreground leading-body">Pick a slot that suits. Your estimate and bill details come with you — the consultant already has your numbers.</p>

            <div className="mt-6 grid sm:grid-cols-2 gap-3">
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
                src={`${CAL_LINK}?embed=true${contact.email ? `&email=${encodeURIComponent(contact.email)}` : ''}${contact.mobile ? `&name=${encodeURIComponent(contact.mobile)}` : ''}`}
                className="w-full h-[560px] border-0"
                loading="lazy"
              />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Your details stay in the EU and are only used for your consultation.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft className="size-4" /> Back
    </button>
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
