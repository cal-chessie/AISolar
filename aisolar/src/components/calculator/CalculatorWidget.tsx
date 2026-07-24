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
import { PencilRuler, ReceiptText, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTenantBrand } from '@/lib/tenantBrand';
import { AiosGlyph } from '@/components/brand/AiosMark';
import SolarCalculator from '@/components/calculator/SolarCalculator';

type Mode = 'choose' | 'manual' | 'bill';

/** Bill door — three plain numbers (or an upload at launch) size the system. */
function BillEntry({ onGo }: { onGo: (bill: number) => void }) {
  const [bill, setBill] = useState(250);
  return (
    <div className="max-w-md mx-auto w-full">
      <div className="rounded-[16px] bg-card shadow-card p-6 space-y-5">
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
          className="w-full h-12 rounded-[12px] bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
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

export default function CalculatorWidget() {
  const brand = useTenantBrand();
  const [mode, setMode] = useState<Mode>('choose');
  const [seedBill, setSeedBill] = useState(250);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Tenant-branded strip — their name, their logo (or the mark) */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto w-full px-4 py-3 flex items-center gap-2.5">
          {brand.logoDataUrl
            ? <img src={brand.logoDataUrl} alt={brand.name} className="h-7 w-auto" />
            : <AiosGlyph className="size-7" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{brand.name}</div>
            <div className="text-2xs text-muted-foreground truncate">Solar savings calculator</div>
          </div>
          {mode !== 'choose' && (
            <button
              onClick={() => setMode('choose')}
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
                className="text-left rounded-[16px] bg-card shadow-card p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="size-11 rounded-[12px] bg-primary/10 text-primary flex items-center justify-center">
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
                className="text-left rounded-[16px] bg-card shadow-card p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="size-11 rounded-[12px] bg-primary/10 text-primary flex items-center justify-center">
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
            {/* one engine — the bill door seeds it, the draw door starts fresh */}
            <SolarCalculator showHeader={false} initialBill={seedBill} />
          </div>
        )}

        {mode === 'bill' && (
          <div className="px-4 py-10">
            <BillEntry onGo={(b) => { setSeedBill(b); setMode('manual'); }} />
          </div>
        )}
      </main>

      {/* Quiet credit — the parent brand, never louder than the tenant */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto w-full px-4 py-2.5 flex items-center justify-center gap-1.5 text-2xs text-muted-foreground">
          <AiosGlyph className="size-3.5 opacity-60" /> Powered by AIOS
        </div>
      </footer>
    </div>
  );
}
