/**
 * FinanceWindow — the owner's MONEY window.
 *
 * Cal's correction: v1 read like a settings page. Rebuilt money-first:
 *   1. Cash position — collected, deposits held, outstanding, grants in flight
 *   2. Deposits to chase — the list that moves cash this week
 *   3. The book — every job's money, downloadable
 *   4. Payment setup — Stripe/bank/VAT demoted to the bottom, where config
 *      belongs (all v1 security properties kept: sk_ refused, IBAN masked,
 *      Stripe-hosted checkout so card data never touches us)
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Landmark, ShieldCheck, CreditCard, CheckCircle2, Euro, Lock, Download,
  Send, Award, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateDummyLeads } from '@/lib/dummyData';
import { getStage } from '@/lib/leadIntake';
import { useFinanceConfig, saveFinanceConfig, stripeMode, maskIban, type FinanceConfig } from '@/lib/financeConfig';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function FinanceWindow() {
  const saved = useFinanceConfig();
  const [cfg, setCfg] = useState<FinanceConfig>(saved);
  const [editingBank, setEditingBank] = useState(!saved.bank.iban);
  const leads = useMemo(() => generateDummyLeads(), []);

  const m = useMemo(() => {
    const jobs = leads.filter(l => l.proposal).map(l => {
      const net = l.proposal!.net_cost ?? 0;
      const deposit = l.invoice?.deposit_amount ?? Math.round(net * (cfg.invoicing.depositPct / 100));
      const depositPaid = !!l.invoice?.deposit_paid;
      const finalPaid = !!l.invoice?.final_paid || ['final_paid', 'completed'].includes(l.workflow_stage);
      return {
        id: l.id, name: l.name, stage: getStage(l.workflow_stage)?.label ?? l.workflow_stage,
        net, deposit, depositPaid, finalPaid,
        outstanding: finalPaid ? 0 : depositPaid ? net - deposit : net,
      };
    }).sort((a, b) => b.net - a.net);
    return {
      jobs,
      collected: jobs.reduce((s, j) => s + (j.finalPaid ? j.net : j.depositPaid ? j.deposit : 0), 0),
      depositsHeld: jobs.filter(j => j.depositPaid && !j.finalPaid).reduce((s, j) => s + j.deposit, 0),
      outstandingAR: jobs.filter(j => j.depositPaid && !j.finalPaid).reduce((s, j) => s + j.outstanding, 0),
      grantsInFlight: leads.filter(l => ['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed'].includes(l.workflow_stage)).reduce((s, l) => s + (l.proposal?.seai_grant ?? 0), 0),
      depositsDue: jobs.filter(j => !j.depositPaid && !j.finalPaid),
    };
  }, [leads, cfg.invoicing.depositPct]);

  const mode = stripeMode(cfg.stripe.publishableKey.trim());

  const save = () => {
    try {
      saveFinanceConfig(cfg);
      setEditingBank(false);
      toast.success('Payment setup saved');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1 — Cash position: the four numbers an owner checks before coffee */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Collected', value: m.collected, tone: 'text-doc-deposit', icon: Euro },
          { label: 'Deposits held', value: m.depositsHeld, tone: '', icon: Landmark },
          { label: 'Outstanding balances', value: m.outstandingAR, tone: '', icon: Clock },
          { label: 'SEAI grants in flight', value: m.grantsInFlight, tone: 'text-tech', icon: Award },
        ].map(k => (
          <div key={k.label} className="rounded-[16px] bg-card shadow-card p-4">
            <div className="flex items-center justify-between">
              <span className="label-micro">{k.label}</span>
              <k.icon className={`size-3.5 ${k.tone || 'text-muted-foreground'}`} />
            </div>
            <div className={`mt-1.5 text-2xl font-semibold tabular-nums ${k.tone}`}>{eur(k.value)}</div>
          </div>
        ))}
      </div>

      {/* 2 — Deposits to chase: the list that moves cash this week */}
      {m.depositsDue.length > 0 && (
        <div className="rounded-[16px] bg-card shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <h3 className="text-sm font-semibold">Deposits to chase</h3>
            <span className="text-2xs font-medium rounded-full bg-doc-proposal-subtle text-doc-proposal px-2 py-0.5">{m.depositsDue.length} due · {eur(m.depositsDue.reduce((s, j) => s + j.deposit, 0))}</span>
          </div>
          <div className="divide-y divide-border">
            {m.depositsDue.map(j => (
              <div key={j.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="font-medium truncate">{j.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{j.stage}</span>
                <span className="ml-auto tabular-nums font-semibold shrink-0">{eur(j.deposit)}</span>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                  onClick={() => toast.success(`Deposit link queued for ${j.name.split(' ')[0]} — goes out with your approval`)}>
                  <Send className="size-3 mr-1" /> Send deposit link
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 — The book: every job's money, downloadable */}
      <div className="rounded-[16px] bg-card shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <h3 className="text-sm font-semibold">The book</h3>
          <span className="text-2xs text-muted-foreground">every figure traceable to a job</span>
          <Button variant="outline" size="sm" className="ml-auto h-7 text-xs"
            onClick={() => downloadCsv('financials.csv', ['Customer', 'Stage', 'Net', 'Deposit', 'Outstanding', 'Status'],
              m.jobs.map(j => [j.name, j.stage, j.net, j.depositPaid ? j.deposit : 0, j.outstanding, j.finalPaid ? 'Paid in full' : j.depositPaid ? 'Deposit in' : 'Deposit due']))}>
            <Download className="size-3 mr-1" /> CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border">
                {['Customer', 'Stage', 'Net', 'Deposit', 'Outstanding', ''].map(h => (
                  <th key={h} className="label-micro font-medium px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {m.jobs.map(j => (
                <tr key={j.id}>
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{j.name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{j.stage}</td>
                  <td className="px-4 py-2 tabular-nums">{eur(j.net)}</td>
                  <td className="px-4 py-2 tabular-nums">{j.depositPaid ? eur(j.deposit) : '—'}</td>
                  <td className="px-4 py-2 tabular-nums">{j.outstanding ? eur(j.outstanding) : '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-2xs rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${j.finalPaid ? 'bg-doc-deposit/10 text-doc-deposit' : j.depositPaid ? 'bg-tech-subtle text-tech' : 'bg-doc-proposal-subtle text-doc-proposal'}`}>
                      {j.finalPaid ? 'Paid in full' : j.depositPaid ? 'Deposit in' : 'Deposit due'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4 — Payment setup: config lives at the bottom, where config belongs */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="label-micro">Payment setup</span>
          <span className="flex-1 h-px bg-border" />
          <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground"><ShieldCheck className="size-3 text-doc-deposit" /> card data never touches this app — Stripe-hosted checkout; secret keys live in the server vault</span>
        </div>
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="rounded-[16px] bg-card shadow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="size-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Stripe</h4>
              {mode ? (
                <span className={`ml-auto inline-flex items-center gap-1 text-2xs font-medium rounded-full px-2 py-0.5 ${mode === 'live' ? 'bg-doc-deposit/10 text-doc-deposit' : 'bg-doc-proposal-subtle text-doc-proposal'}`}>
                  <CheckCircle2 className="size-3" /> {mode === 'live' ? 'Live' : 'Test'}
                </span>
              ) : (
                <span className="ml-auto text-2xs font-medium rounded-full bg-muted text-muted-foreground px-2 py-0.5">Not connected</span>
              )}
            </div>
            <Label htmlFor="fw-pk" className="text-xs">Publishable key</Label>
            <Input id="fw-pk" value={cfg.stripe.publishableKey}
              onChange={e => setCfg(c => ({ ...c, stripe: { publishableKey: e.target.value } }))}
              placeholder="pk_live_…" className="mt-1 font-mono text-xs h-9" />
            <p className="text-2xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Lock className="size-3" /> Secret key (sk_…) is refused here — server vault only.
            </p>
          </div>

          <div className="rounded-[16px] bg-card shadow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="size-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Bank transfer on invoices</h4>
              {saved.bank.iban && !editingBank && (
                <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setEditingBank(true)}>Edit</Button>
              )}
            </div>
            {saved.bank.iban && !editingBank ? (
              <div className="text-sm">
                <div className="font-medium">{saved.bank.accountName}</div>
                <div className="text-muted-foreground font-mono text-xs mt-0.5">{maskIban(saved.bank.iban)} · {saved.bank.bic}</div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Input value={cfg.bank.accountName} onChange={e => setCfg(c => ({ ...c, bank: { ...c.bank, accountName: e.target.value } }))} placeholder="Account name" className="h-9 text-xs" />
                <div className="grid grid-cols-3 gap-2">
                  <Input value={cfg.bank.iban} onChange={e => setCfg(c => ({ ...c, bank: { ...c.bank, iban: e.target.value } }))} placeholder="IBAN" className="h-9 font-mono text-xs col-span-2" />
                  <Input value={cfg.bank.bic} onChange={e => setCfg(c => ({ ...c, bank: { ...c.bank, bic: e.target.value } }))} placeholder="BIC" className="h-9 font-mono text-xs" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="fw-dep" className="text-xs text-muted-foreground">Deposit</Label>
            <Input id="fw-dep" type="number" min={0} max={100} value={cfg.invoicing.depositPct}
              onChange={e => setCfg(c => ({ ...c, invoicing: { ...c.invoicing, depositPct: Math.max(0, Math.min(100, Number(e.target.value))) } }))}
              className="w-16 h-8 text-xs" />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">VAT</span>
            {([0, 13.5, 23] as const).map(r => (
              <button key={r} onClick={() => setCfg(c => ({ ...c, invoicing: { ...c.invoicing, vatRate: r } }))}
                className={`h-8 px-2.5 rounded-[8px] text-xs font-medium border transition-colors ${cfg.invoicing.vatRate === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
                {r}%
              </button>
            ))}
            <span className="text-2xs text-muted-foreground ml-1">0% = domestic solar (IE, since May 2023)</span>
          </div>
          <Button size="sm" className="ml-auto h-8 text-xs font-semibold" onClick={save}>Save setup</Button>
        </div>
      </div>
    </div>
  );
}
