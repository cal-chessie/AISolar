/**
 * ComplianceCommand — the grants & compliance OPERATIONS ROOM.
 *
 * Cal: "start from scratch, keep what you need… separate clients and the
 * actual SEAI ESB RECI and make this the best part of the SaaS."
 *
 * The separation: Clients is where you look UP a customer. THIS is where the
 * paperwork WORK happens — organised by AUTHORITY, the way the work actually
 * queues: the SEAI lane (grants), the ESB lane (connections), the RECI &
 * closeout lane (certs + release). Search always on top. A row is one job in
 * one lane with ONE action; clicking it opens the customer's full pack
 * (PaperworkWindow — kept, it's right).
 *
 * Engine kept, surface rebuilt: decideCompliance routes, buildPack states,
 * calculateNDMG/calculateSEAI money (INDICATIVE — confirmed at application).
 */
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Award, Zap, Shield, Search, ChevronRight, Bot } from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { getStage } from '@/lib/leadIntake';
import { decideCompliance } from '@/lib/complianceDecision';
import { calculateNDMG } from '@/lib/seaiPipeline';
import PaperworkWindow, { buildPack } from '@/components/compliance/PaperworkWindow';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/** One customer's compliance snapshot — everything the lanes need. */
function snapshot(lead: DummyLead) {
  const d = decideCompliance(lead);
  const pack = buildPack(lead);
  const by = (id: string) => pack.find(p => p.id === id);
  const ready = pack.filter(p => ['received', 'complete', 'sent'].includes(p.status)).length;
  const grant = d.commercial ? calculateNDMG(d.kW) : (lead.proposal?.seai_grant ?? (d.kW ? Math.min(Math.round(d.kW * 900), 1800) : 0));
  return { d, pack, by, ready, total: pack.length, grant };
}

type Lane = 'seai' | 'esb' | 'reci';

const LANES: Array<{ id: Lane; label: string; icon: typeof Award; tint: string; sub: string }> = [
  { id: 'seai', label: 'SEAI', icon: Award, tint: 'text-doc-contract', sub: 'grants — offer before work starts' },
  { id: 'esb', label: 'ESB', icon: Zap, tint: 'text-tech', sub: 'connections — one form per customer' },
  { id: 'reci', label: 'RECI & closeout', icon: Shield, tint: 'text-doc-deposit', sub: 'certs in, pack released' },
];

export default function ComplianceCommand() {
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [search, setSearch] = useState('');
  const [lane, setLane] = useState<Lane>('seai');
  const [selected, setSelected] = useState<DummyLead | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads
      .filter(l => l.proposal) // no proposal, no paperwork yet
      .filter(l => !q || l.name.toLowerCase().includes(q) || (l.mprn ?? '').includes(q) || l.address.toLowerCase().includes(q))
      .map(l => ({ lead: l, ...snapshot(l) }));
  }, [leads, search]);

  const totals = useMemo(() => ({
    grants: rows.reduce((s, r) => s + r.grant, 0),
    nc6: rows.filter(r => r.d.esbForm === 'NC6').length,
    nc7plus: rows.filter(r => r.d.esbForm !== 'NC6').length,
    releasable: rows.filter(r => r.ready === r.total).length,
    awaiting: rows.reduce((s, r) => s + (r.total - r.ready), 0),
  }), [rows]);

  if (selected) {
    return <PaperworkWindow lead={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl">
      {/* The compliance business, one line each */}
      <div className="rounded-[16px] bg-primary text-primary-foreground shadow-card p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <div className="text-2xs text-primary-foreground/60 uppercase tracking-wide">Grants in play</div>
          <div className="text-2xl font-bold tabular-nums text-doc-deposit">{eur(totals.grants)}</div>
          <div className="text-2xs text-primary-foreground/50">indicative — confirmed at application</div>
        </div>
        <div>
          <div className="text-2xs text-primary-foreground/60 uppercase tracking-wide">Connections</div>
          <div className="text-2xl font-bold tabular-nums">{totals.nc6}<span className="text-sm font-normal text-primary-foreground/60"> NC6</span> · {totals.nc7plus}<span className="text-sm font-normal text-primary-foreground/60"> NC7+</span></div>
        </div>
        <div>
          <div className="text-2xs text-primary-foreground/60 uppercase tracking-wide">Docs awaited</div>
          <div className="text-2xl font-bold tabular-nums text-doc-proposal">{totals.awaiting}</div>
        </div>
        <div>
          <div className="text-2xs text-primary-foreground/60 uppercase tracking-wide">Packs releasable</div>
          <div className="text-2xl font-bold tabular-nums text-doc-deposit">{totals.releasable}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-2xs text-primary-foreground/60">
          <Bot className="size-3" /> agents prepare · track · chase — registered people sign
        </div>
      </div>

      {/* Quick search — always here (Cal) */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, MPRN or address…" className="pl-9 h-10 rounded-[10px]" />
      </div>

      {/* The three authorities */}
      <div className="flex gap-1.5">
        {LANES.map(l => (
          <button key={l.id} onClick={() => setLane(l.id)}
            className={`flex-1 flex items-center gap-2 p-3 rounded-[12px] border text-left transition-colors ${lane === l.id ? 'bg-card shadow-card border-transparent' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}>
            <l.icon className={`size-4 shrink-0 ${l.tint}`} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{l.label}</span>
              <span className="block text-2xs text-muted-foreground truncate">{l.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* The lane — one row per customer, one status, one line. Calm. */}
      <div className="rounded-[16px] bg-card shadow-card overflow-hidden divide-y divide-border">
        {rows.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">No paperwork matches — clear the search or wait for the next proposal.</p>
        )}
        {rows.map(({ lead, d, by, ready, total, grant }) => {
          // What THIS lane says about THIS customer
          let status: { label: string; cls: string }; let detail: string;
          if (lane === 'seai') {
            const offer = by('seai_offer');
            status = offer?.status === 'received'
              ? { label: 'Offer in', cls: 'bg-doc-deposit/10 text-doc-deposit' }
              : by('seai_app')?.status === 'sent'
                ? { label: 'Submitted', cls: 'bg-doc-contract-subtle text-doc-contract' }
                : { label: 'To prepare', cls: 'bg-muted text-muted-foreground' };
            detail = `${d.commercial ? 'Non-Domestic Microgen' : 'Domestic grant'} · ${eur(grant)}`;
          } else if (lane === 'esb') {
            const nc = by('nc6');
            status = nc?.status === 'sent'
              ? { label: 'Submitted', cls: 'bg-doc-contract-subtle text-doc-contract' }
              : nc?.status === 'prepared'
                ? { label: 'Prepared', cls: 'bg-tech-subtle text-tech' }
                : { label: 'Awaiting design', cls: 'bg-muted text-muted-foreground' };
            detail = `${d.esbForm} · ${d.tiic}kW inverter · ${d.threePhase ? 'three' : 'single'} phase${d.requiresG10 ? ' · G10 required' : ''}`;
          } else {
            const reci = by('reci'); const ber = by('ber');
            status = ready === total
              ? { label: 'Release ready', cls: 'bg-doc-deposit/10 text-doc-deposit' }
              : reci?.status === 'received'
                ? { label: 'RECI in', cls: 'bg-tech-subtle text-tech' }
                : { label: `${total - ready} awaited`, cls: 'bg-doc-proposal-subtle text-doc-proposal' };
            detail = `RECI ${reci?.status === 'received' ? '✓' : '—'} · BER ${ber?.status === 'received' ? '✓' : '—'} · pack ${ready}/${total}`;
          }
          return (
            <button key={lead.id} onClick={() => setSelected(lead)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{lead.name}</span>
                  <span className="text-2xs rounded-full bg-tech-subtle text-tech px-1.5 py-0.5 font-medium shrink-0">{d.esbForm}</span>
                  {d.commercial && <span className="text-2xs rounded-full bg-doc-contract-subtle text-doc-contract px-1.5 py-0.5 font-medium shrink-0">Commercial</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  <span className="font-mono">{lead.mprn || 'MPRN —'}</span> · {detail}
                </div>
              </div>
              <span className={`text-2xs rounded-full px-2 py-0.5 font-medium shrink-0 ${status.cls}`}>{status.label}</span>
              <span className="text-xs text-muted-foreground shrink-0">{getStage(lead.workflow_stage).label}</span>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
