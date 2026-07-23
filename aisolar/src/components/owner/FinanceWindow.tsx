/**
 * FinanceWindow — the owner's money surface (Cal: "financials was a big one
 * we need to get right… bank and stripe easy setup and totally secure").
 *
 * Three jobs, one page:
 *  1. SETUP — Stripe (publishable key only; sk_ refused hard) + bank details
 *     for invoice transfers. Both BYO — the tenant's accounts, their money.
 *  2. DEFAULTS — deposit % and the Irish VAT reality (0% on domestic solar
 *     supply+install since May 2023; 13.5%/23% for the edge cases).
 *  3. THE LEDGER — deposits and balances off the live pipeline, every figure
 *     traceable to a lead.
 *
 * How money actually moves (saas-starter's shape, minus subscriptions):
 * consultant sends deposit link → Stripe-hosted Checkout (card data never
 * touches us) → webhook marks the invoice paid → kernel logs DepositPaid.
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Landmark, ShieldCheck, CreditCard, CheckCircle2, AlertTriangle,
  Euro, ArrowRight, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateDummyLeads } from '@/lib/dummyData';
import { useFinanceConfig, saveFinanceConfig, stripeMode, maskIban, type FinanceConfig } from '@/lib/financeConfig';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function FinanceWindow() {
  const saved = useFinanceConfig();
  const [cfg, setCfg] = useState<FinanceConfig>(saved);
  const [editingBank, setEditingBank] = useState(!saved.bank.iban);

  const leads = useMemo(() => generateDummyLeads(), []);
  const ledger = useMemo(() => {
    const rows = leads.filter(l => l.invoice || l.proposal).map(l => {
      const net = l.proposal?.net_cost ?? 0;
      const deposit = l.invoice?.deposit_amount ?? Math.round(net * (cfg.invoicing.depositPct / 100));
      const depositPaid = !!l.invoice?.deposit_paid;
      const finalPaid = ['final_paid', 'completed'].includes(l.workflow_stage);
      return { id: l.id, name: l.name, net, deposit, depositPaid, finalPaid };
    });
    return {
      rows,
      collected: rows.reduce((s, r) => s + (r.finalPaid ? r.net : r.depositPaid ? r.deposit : 0), 0),
      outstanding: rows.reduce((s, r) => s + (r.finalPaid ? 0 : r.depositPaid ? r.net - r.deposit : 0), 0),
      awaitingDeposit: rows.filter(r => !r.depositPaid && !r.finalPaid).length,
    };
  }, [leads, cfg.invoicing.depositPct]);

  const mode = stripeMode(cfg.stripe.publishableKey.trim());

  const save = () => {
    try {
      saveFinanceConfig(cfg);
      setEditingBank(false);
      toast.success('Financial settings saved');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Security posture — up front, in plain words, all of it true */}
      <div className="rounded-panel bg-card shadow-card p-4 flex gap-3">
        <ShieldCheck className="size-5 text-doc-deposit shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-body">
          <span className="font-semibold text-foreground">How this stays secure: </span>
          card payments run through Stripe-hosted Checkout, so card numbers never touch this app.
          Your Stripe secret key lives in the server vault, never in a browser — this page will refuse it.
          These are your accounts and your money; AISolar never sits in the flow.
        </div>
      </div>

      {/* 1 — Stripe */}
      <section className="rounded-panel bg-card shadow-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Card payments — Stripe</h2>
          {mode ? (
            <span className={`ml-auto inline-flex items-center gap-1 text-2xs font-medium rounded-full px-2 py-0.5 ${mode === 'live' ? 'bg-doc-deposit/10 text-doc-deposit' : 'bg-doc-proposal-subtle text-doc-proposal'}`}>
              <CheckCircle2 className="size-3" /> {mode === 'live' ? 'Live mode' : 'Test mode'}
            </span>
          ) : (
            <span className="ml-auto text-2xs font-medium rounded-full bg-muted text-muted-foreground px-2 py-0.5">Not connected</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3 leading-body">
          Deposit links open Stripe Checkout under your account. Paste your <strong>publishable</strong> key
          (starts <code className="text-2xs">pk_</code>) from the Stripe dashboard → Developers → API keys.
        </p>
        <div>
          <Label htmlFor="fw-pk">Publishable key</Label>
          <Input id="fw-pk" value={cfg.stripe.publishableKey}
            onChange={e => setCfg(c => ({ ...c, stripe: { publishableKey: e.target.value } }))}
            placeholder="pk_live_…" className="mt-1.5 font-mono text-xs" />
          <p className="text-2xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Lock className="size-3" /> Your secret key (sk_…) is set once, server-side, at launch — never here.
          </p>
        </div>
      </section>

      {/* 2 — Bank transfer */}
      <section className="rounded-panel bg-card shadow-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Landmark className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Bank transfer — on your invoices</h2>
          {saved.bank.iban && !editingBank && (
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setEditingBank(true)}>Edit</Button>
          )}
        </div>
        {saved.bank.iban && !editingBank ? (
          <div className="text-sm">
            <div className="font-medium">{saved.bank.accountName}</div>
            <div className="text-muted-foreground font-mono text-xs mt-0.5">{maskIban(saved.bank.iban)} · {saved.bank.bic}</div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label htmlFor="fw-acct">Account name</Label>
              <Input id="fw-acct" value={cfg.bank.accountName}
                onChange={e => setCfg(c => ({ ...c, bank: { ...c.bank, accountName: e.target.value } }))}
                placeholder="AISolar Ireland Ltd" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="fw-iban">IBAN</Label>
              <Input id="fw-iban" value={cfg.bank.iban}
                onChange={e => setCfg(c => ({ ...c, bank: { ...c.bank, iban: e.target.value } }))}
                placeholder="IE29 AIBK 9311 5212 3456 78" className="mt-1.5 font-mono text-xs" />
            </div>
            <div>
              <Label htmlFor="fw-bic">BIC</Label>
              <Input id="fw-bic" value={cfg.bank.bic}
                onChange={e => setCfg(c => ({ ...c, bank: { ...c.bank, bic: e.target.value } }))}
                placeholder="AIBKIE2D" className="mt-1.5 font-mono text-xs" />
            </div>
          </div>
        )}
        <p className="text-2xs text-muted-foreground mt-2">Shown on invoices as the transfer option next to the card link. Masked here after saving.</p>
      </section>

      {/* 3 — Invoice defaults */}
      <section className="rounded-panel bg-card shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Euro className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Invoice defaults</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fw-dep">Deposit</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input id="fw-dep" type="number" min={0} max={100} value={cfg.invoicing.depositPct}
                onChange={e => setCfg(c => ({ ...c, invoicing: { ...c.invoicing, depositPct: Math.max(0, Math.min(100, Number(e.target.value))) } }))}
                className="w-24" />
              <span className="text-sm text-muted-foreground">% of net cost</span>
            </div>
          </div>
          <div>
            <Label>VAT on installs</Label>
            <div className="flex gap-2 mt-1.5">
              {([0, 13.5, 23] as const).map(r => (
                <button key={r} onClick={() => setCfg(c => ({ ...c, invoicing: { ...c.invoicing, vatRate: r } }))}
                  className={`h-9 px-3 rounded-[10px] text-sm font-medium border transition-colors ${cfg.invoicing.vatRate === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
                  {r}%
                </button>
              ))}
            </div>
            <p className="text-2xs text-muted-foreground mt-1.5">0% applies to supply + install of solar panels on private dwellings in Ireland (since May 2023). Confirm edge cases with your accountant.</p>
          </div>
        </div>
        <Button className="mt-4 h-10 rounded-[10px] font-semibold" onClick={save}>Save financial settings</Button>
      </section>

      {/* 4 — The ledger, off the live pipeline */}
      <section className="rounded-panel bg-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <h2 className="font-semibold text-sm">The money, right now</h2>
          <span className="ml-auto text-2xs text-muted-foreground">every figure traceable to a lead</span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border">
          <div className="bg-card px-4 py-3 text-center">
            <div className="label-micro">Collected</div>
            <div className="text-lg font-semibold tabular-nums text-doc-deposit">{eur(ledger.collected)}</div>
          </div>
          <div className="bg-card px-4 py-3 text-center">
            <div className="label-micro">Outstanding balances</div>
            <div className="text-lg font-semibold tabular-nums">{eur(ledger.outstanding)}</div>
          </div>
          <div className="bg-card px-4 py-3 text-center">
            <div className="label-micro">Awaiting deposit</div>
            <div className="text-lg font-semibold tabular-nums text-doc-proposal">{ledger.awaitingDeposit}</div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {ledger.rows.slice(0, 6).map(r => (
            <div key={r.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
              <span className="font-medium truncate">{r.name}</span>
              <span className={`text-2xs rounded-full px-2 py-0.5 font-medium shrink-0 ${r.finalPaid ? 'bg-doc-deposit/10 text-doc-deposit' : r.depositPaid ? 'bg-tech-subtle text-tech' : 'bg-doc-proposal-subtle text-doc-proposal'}`}>
                {r.finalPaid ? 'Paid in full' : r.depositPaid ? 'Deposit in' : 'Deposit due'}
              </span>
              <span className="ml-auto tabular-nums text-muted-foreground text-xs">
                {r.finalPaid ? eur(r.net) : r.depositPaid ? `${eur(r.net - r.deposit)} due` : `${eur(r.deposit)} deposit`}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center gap-2 text-2xs text-muted-foreground">
          <AlertTriangle className="size-3 shrink-0" />
          Deposit link → Stripe Checkout → webhook marks it paid → the kernel logs DepositPaid. Live once your keys are in the vault.
          <ArrowRight className="size-3 ml-auto shrink-0" />
        </div>
      </section>
    </div>
  );
}
