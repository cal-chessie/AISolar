/**
 * CalculatorWidget — the embeddable, tenant-branded solar calculator (Cal:
 * "this should be a module that goes onto anyone's website").
 *
 * One engine, two front doors that BOTH land on the same full-glory estimate:
 *   • Manual   — draw the roof + play with panels/sliders (SolarCalculator).
 *   • Bill     — hand us your bill; we size it and show you the estimate + the
 *                satellite picture of your roof.
 * This makes the old generic /calculator redundant and brings the bill door
 * on par. Branded to the tenant via getTenantBrand() (a ?tenant= param can
 * point it at a specific tenant once tenants live in the DB). Rendered chrome-
 * less at /embed so a tenant pastes it into an iframe on their own site.
 *
 * Leads captured here route to ingest-lead (stamped to the tenant) at launch;
 * until coxmtpnq access lands, "book" hands off to /start with the bill seeded.
 */
import { useState } from 'react';
import { PencilRuler, ReceiptText, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEmbedBrand } from '@/lib/embedBrand';
import { AiosGlyph } from '@/components/brand/AiosMark';
import SolarCalculator from '@/components/calculator/SolarCalculator';
import { captureWidgetLead, type WidgetLeadInput } from '@/lib/widgetLead';

type Mode = 'choose' | 'manual' | 'bill' | 'capture' | 'done';
type Estimate = NonNullable<WidgetLeadInput['estimate']>;

/** Bill door — three plain numbers (or an upload at launch) size the system. */
function BillEntry({ onGo }: { onGo: (bill: number) => void }) {
  const [bill, setBill] = useState(250);
  return (
    <div className="max-w-md mx-auto w-full">
      <div className="rounded-panel bg-card shadow-card p-6 space-y-5">
        <div>
          <label className="label-micro">Your typical electricity bill</label>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-muted-foreground">€</span>
            <input
              type="number"
              inputMode="numeric"
              value={bill}
              min={30}
              max={2000}
              onChange={e => setBill(Math.max(0, Number(e.target.value) || 0))}
              className="w-full bg-transparent text-4xl font-semibold tabular-nums outline-none border-b border-border focus:border-primary transition-colors"
            />
            <span className="text-sm text-muted-foreground shrink-0">/ month</span>
          </div>
          <input
            type="range" min={50} max={800} step={10} value={Math.min(800, bill)}
            onChange={e => setBill(Number(e.target.value))}
            className="w-full mt-4 accent-primary"
          />
        </div>
        <button
          onClick={() => onGo(bill)}
          className="w-full h-12 rounded-panel bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          See my estimate <ArrowRight className="size-4" />
        </button>
        <p className="text-2xs text-muted-foreground text-center leading-relaxed">
          Reads the day/night split from your bill. Grants and figures are
          indicative — confirmed on a full survey.
        </p>
      </div>
    </div>
  );
}

/** LeadCapture — the door. After the estimate, the visitor leaves their details
 *  and the lead lands in the tenant's pipeline (via ingest-lead + source key). */
function LeadCapture({ estimate, onDone }: { estimate: Estimate | null; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', eircode: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="max-w-md mx-auto w-full">
      <div className="rounded-panel bg-card shadow-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Send me my full proposal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {estimate?.systemSizeKw
              ? `Your ${estimate.systemSizeKw}kWp estimate is ready. Leave your details and a local specialist confirms the exact numbers off a real bill — no obligation.`
              : 'Leave your details and a local specialist confirms your exact numbers — no obligation.'}
          </p>
        </div>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          await captureWidgetLead({ ...form, estimate: estimate ?? undefined });
          setBusy(false); onDone(); // always thank them — a soft miss still logs client-side
        }}>
          <input required value={form.name} onChange={set('name')} placeholder="Your name"
            className="w-full h-11 rounded-panel border border-border bg-background px-3.5 text-sm outline-none focus:border-primary transition-colors" />
          <input required type="email" value={form.email} onChange={set('email')} placeholder="you@email.com"
            className="w-full h-11 rounded-panel border border-border bg-background px-3.5 text-sm outline-none focus:border-primary transition-colors" />
          <div className="grid grid-cols-2 gap-3">
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="Phone (optional)"
              className="w-full h-11 rounded-panel border border-border bg-background px-3.5 text-sm outline-none focus:border-primary transition-colors" />
            <input value={form.eircode} onChange={set('eircode')} placeholder="Eircode (optional)"
              className="w-full h-11 rounded-panel border border-border bg-background px-3.5 text-sm outline-none focus:border-primary transition-colors" />
          </div>
          <button type="submit" disabled={busy}
            className="w-full h-12 rounded-panel bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
            {busy ? 'Sending…' : <>Send me my proposal <ArrowRight className="size-4" /></>}
          </button>
          <p className="text-2xs text-muted-foreground text-center">
            We only use your details to prepare your solar proposal.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function CalculatorWidget() {
  const brand = useEmbedBrand();
  const [mode, setMode] = useState<Mode>('bill'); // bill-first — one path, the AI hook up front
  const [seedBill, setSeedBill] = useState(250);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Tenant-branded strip — their name, their logo (or the mark) */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto w-full px-4 py-3 flex items-center gap-2.5">
          {brand.logoUrl
            ? <img src={brand.logoUrl} alt={brand.name} className="h-7 w-auto" />
            : <AiosGlyph className="size-7" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{brand.name}</div>
            <div className="text-2xs text-muted-foreground truncate">{brand.subtitle}</div>
          </div>
          {mode !== 'bill' && (
            <button
              onClick={() => setMode('bill')}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="size-3.5" /> Start over
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full">
        {mode === 'choose' && (
          <div className="max-w-3xl mx-auto w-full px-4 py-10 lg:py-16">
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-center">
              See what solar does for your home
            </h1>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-lg mx-auto">
              Two ways in — both land on the same estimate: your system size,
              your grant, the year you break even.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {/* Manual door */}
              <button
                onClick={() => setMode('manual')}
                className="text-left rounded-panel bg-card shadow-card p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="size-11 rounded-panel bg-primary/10 text-primary flex items-center justify-center">
                  <PencilRuler className="size-5" />
                </div>
                <div className="mt-4 font-semibold">Draw your roof</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Trace your roof on the map, place the panels, and watch the
                  numbers move as you play.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Start drawing <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

              {/* Bill door */}
              <button
                onClick={() => setMode('bill')}
                className="text-left rounded-panel bg-card shadow-card p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="size-11 rounded-panel bg-primary/10 text-primary flex items-center justify-center">
                  <ReceiptText className="size-5" />
                </div>
                <div className="mt-4 font-semibold">Use your bill</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Give us your monthly bill and we size the system for you —
                  full estimate, straight away.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Get my estimate <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        )}

        {mode === 'manual' && (
          <div className="px-4 py-6">
            {/* one engine — the bill door seeds it, the draw door starts fresh.
                onGetProposal is THE door: the CTA captures into the tenant. */}
            <SolarCalculator showHeader={false} initialBill={seedBill}
              onGetProposal={(est) => { setEstimate(est); setMode('capture'); }} />
          </div>
        )}

        {mode === 'bill' && (
          <div className="px-4 py-10">
            <BillEntry onGo={(b) => { setSeedBill(b); setMode('manual'); }} />
            <div className="text-center mt-5">
              <button
                onClick={() => setMode('manual')}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Rather draw your roof on a map? <ArrowRight className="size-3" />
              </button>
            </div>
          </div>
        )}

        {mode === 'capture' && (
          <div className="px-4 py-10">
            <LeadCapture estimate={estimate} onDone={() => setMode('done')} />
          </div>
        )}

        {mode === 'done' && (
          <div className="px-4 py-16 max-w-md mx-auto w-full text-center">
            <CheckCircle2 className="size-12 text-doc-deposit mx-auto" />
            <h2 className="mt-4 text-xl font-semibold">Thank you — that's with {brand.name}.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A local specialist will be in touch shortly to confirm your exact
              numbers and answer anything you'd like to know. No obligation.
            </p>
            <button onClick={() => { setEstimate(null); setMode('bill'); }}
              className="mt-6 text-sm font-medium text-primary inline-flex items-center gap-1">
              <ArrowLeft className="size-3.5" /> Start another estimate
            </button>
          </div>
        )}
      </main>

      {/* Quiet credit — the parent brand, never louder than the tenant */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto w-full px-4 py-2.5 flex items-center justify-center gap-1.5 text-2xs text-muted-foreground">
          <AiosGlyph className="size-3.5 opacity-60" /> Powered by AISolar
        </div>
      </footer>
    </div>
  );
}
