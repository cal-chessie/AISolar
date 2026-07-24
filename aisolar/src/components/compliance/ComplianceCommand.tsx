/**
 * ComplianceCommand — grants & compliance, stupid simple at a glance.
 *
 * Cal's final spec: "rethink… make it stupid simple to understand at a
 * glance. all those attributes viewable and accessible through the
 * interface."
 *
 * THE GLANCE: one row per customer. Three gate dots — A (SEAI) · B (ESB) ·
 * C (certs) — green done, blue moving, yellow waiting on someone, grey not
 * started. Then THE ONE NEXT THING in plain words ("Next: SEAI offer —
 * agent chasing"). That's the whole page. Authorities are FILTERS, not
 * separate worlds — a customer's story never fragments.
 *
 * Click a row -> the full pack (PaperworkWindow) with every attribute on
 * an inspector strip. Engine untouched: decideCompliance + buildPack.
 */
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight, Bot, CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { decideCompliance } from '@/lib/complianceDecision';
import { calculateNDMG } from '@/lib/seaiPipeline';
import PaperworkWindow, { buildPack } from '@/components/compliance/PaperworkWindow';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type GateState = 'done' | 'moving' | 'waiting' | 'idle';

const DOT: Record<GateState, string> = {
  done: 'bg-doc-deposit',
  moving: 'bg-tech',
  waiting: 'bg-doc-proposal',
  idle: 'bg-muted-foreground/25',
};

/** One customer, one story: gate states + the single next thing. */
function story(lead: DummyLead) {
  const d = decideCompliance(lead);
  const pack = buildPack(lead);
  const grant = d.commercial ? calculateNDMG(d.kW) : (lead.proposal?.seai_grant ?? (d.kW ? Math.min(Math.round(d.kW * 900), 1800) : 0));

  const gateState = (g: 'A' | 'B' | 'C'): GateState => {
    const docs = pack.filter(p => p.gate === g);
    if (docs.every(p => ['received', 'complete', 'sent'].includes(p.status))) return 'done';
    if (docs.some(p => p.status === 'awaiting_signature')) return 'waiting';
    if (docs.some(p => ['prepared', 'sent', 'received', 'complete'].includes(p.status))) return 'moving';
    return 'idle';
  };
  const gates = { A: gateState('A'), B: gateState('B'), C: gateState('C') } as const;

  // The one next thing: first unfinished doc, in order, said like a human
  const nextDoc = pack.find(p => !['received', 'complete', 'sent'].includes(p.status));
  const next = !nextDoc
    ? 'Pack complete — release it'
    : nextDoc.status === 'awaiting_signature'
      ? `${nextDoc.name} — waiting on signature`
      : nextDoc.status === 'prepared'
        ? `${nextDoc.name} — prepared, ready to send`
        : `${nextDoc.name} — ${nextDoc.source === 'upload' ? 'needs the upload' : nextDoc.source === 'email-in' ? 'awaited by email' : 'agent preparing'}`;

  const ready = pack.filter(p => ['received', 'complete', 'sent'].includes(p.status)).length;
  return { d, pack, gates, next, nextGate: nextDoc?.gate ?? null, grant, ready, total: pack.length, releasable: ready === pack.length };
}

type Filter = 'all' | 'A' | 'B' | 'C' | 'release';
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Everyone' },
  { id: 'A', label: 'Waiting on SEAI' },
  { id: 'B', label: 'Waiting on ESB' },
  { id: 'C', label: 'Certs & closeout' },
  { id: 'release', label: 'Release ready' },
];

export default function ComplianceCommand() {
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<DummyLead | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads
      .filter(l => l.proposal)
      .filter(l => !q || l.name.toLowerCase().includes(q) || (l.mprn ?? '').includes(q) || l.address.toLowerCase().includes(q))
      .map(l => ({ lead: l, ...story(l) }))
      // a customer sits under the gate their NEXT thing lives in — the three
      // gate filters therefore PARTITION the work, never overlap (Cal)
      .filter(r => filter === 'all' ? true : filter === 'release' ? r.releasable : r.nextGate === filter);
  }, [leads, search, filter]);

  const totals = useMemo(() => {
    const all = leads.filter(l => l.proposal).map(l => story(l));
    return {
      grants: all.reduce((s, r) => s + r.grant, 0),
      releasable: all.filter(r => r.releasable).length,
      waiting: all.filter(r => !r.releasable).length,
    };
  }, [leads]);

  if (selected) return <PaperworkWindow lead={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Three numbers. That's the business — family cards, no black slab. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-[16px] bg-card shadow-card p-4">
          <div className="label-micro">Grants in play</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-doc-deposit">{eur(totals.grants)}</div>
          <div className="text-2xs text-muted-foreground">indicative — confirmed at application</div>
        </div>
        <div className="rounded-[16px] bg-card shadow-card p-4">
          <div className="label-micro">In motion</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{totals.waiting}</div>
          <div className="text-2xs text-muted-foreground">packs being carried by agents</div>
        </div>
        <div className="rounded-[16px] bg-card shadow-card p-4">
          <div className="label-micro">Ready to release</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-doc-deposit">{totals.releasable}</div>
          <div className="text-2xs text-muted-foreground">every document in hand</div>
        </div>
        <div className="rounded-[16px] bg-card shadow-card p-4 flex items-center">
          <div className="text-xs text-muted-foreground leading-snug flex items-start gap-1.5">
            <Bot className="size-3.5 shrink-0 mt-0.5 text-tech" /> Agents prepare, track and chase — your registered people sign.
          </div>
        </div>
      </div>

      {/* Search + filters on one line */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, MPRN or address…" className="pl-9 h-9 rounded-[10px]" />
        </div>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`h-9 px-3 rounded-[10px] text-xs font-medium border transition-colors shrink-0 ${filter === f.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* One row = one customer's whole story */}
      <div className="rounded-[16px] bg-card shadow-card overflow-hidden divide-y divide-border">
        {/* the legend, once, tiny */}
        <div className="px-4 py-2 flex items-center gap-4 text-2xs text-muted-foreground bg-muted/30">
          <span className="font-medium">A · SEAI grant &nbsp; B · ESB connection &nbsp; C · certs &amp; closeout</span>
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1"><span className={`size-2 rounded-full ${DOT.done}`} /> done</span>
            <span className="flex items-center gap-1"><span className={`size-2 rounded-full ${DOT.moving}`} /> moving</span>
            <span className="flex items-center gap-1"><span className={`size-2 rounded-full ${DOT.waiting}`} /> waiting</span>
          </span>
        </div>
        {rows.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">Nothing here — clear the search or pick another filter.</p>
        )}
        {rows.map(({ lead, d, gates, next, grant, releasable }) => (
          <button key={lead.id} onClick={() => setSelected(lead)}
            className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-muted/40 transition-colors">
            {/* the three dots — the whole journey in 40px */}
            <span className="flex items-center gap-1.5 shrink-0" aria-label={`Gates: A ${gates.A}, B ${gates.B}, C ${gates.C}`}>
              {(['A', 'B', 'C'] as const).map(g => (
                <span key={g} className="flex flex-col items-center gap-0.5">
                  <span className={`size-2.5 rounded-full ${DOT[gates[g]]}`} />
                  <span className="text-[9px] text-muted-foreground leading-none">{g}</span>
                </span>
              ))}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{lead.name}</span>
                <span className="text-2xs rounded-full bg-tech-subtle text-tech px-1.5 py-0.5 font-medium shrink-0">{d.esbForm}</span>
                {d.commercial && <span className="text-2xs rounded-full bg-doc-contract-subtle text-doc-contract px-1.5 py-0.5 font-medium shrink-0">Commercial</span>}
              </div>
              <div className={`text-xs truncate mt-0.5 ${releasable ? 'text-doc-deposit font-medium' : 'text-muted-foreground'}`}>
                {releasable ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3" /> {next}</span> : <>Next: {next}</>}
              </div>
            </div>
            <span className="text-sm font-semibold tabular-nums text-doc-deposit shrink-0">{eur(grant)}</span>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
      {/* FORMS LIBRARY — every official form, one click, regardless of routing
          (Cal: "I want access to the NC7 and the rest of the certs") */}
      <div className="rounded-[16px] bg-card shadow-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Forms library</span>
          <span className="text-2xs text-muted-foreground">the official documents, blank — the packs above fill them per customer</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            ['NC6 — Microgen notification', '/forms/esbn-form-nc6.pdf'],
            ['NC7 — Mini-gen application', '/forms/esbn-form-nc7.pdf'],
            ['NC7-01 — Installation confirmation', '/forms/esbn-nc7-01-installation-confirmation.pdf'],
            ['NC7-02 — ELS test form', '/forms/esbn-nc7-02-els-test.pdf'],
            ['NC7-03 — ELS declaration', '/forms/esbn-nc7-03-els-declaration.pdf'],
            ['NC8 — Small-scale (inverter)', '/forms/esbn-form-nc8.pdf'],
            ['NC5 — Small-scale (synchronous)', '/forms/esbn-form-nc5.pdf'],
            ['Trina TSM-440 datasheet', '/datasheets/trinasolar-tsm-440-neg9rc28.pdf'],
          ].map(([label, href]) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] border border-border text-xs font-medium hover:bg-muted/50 transition-colors">
              {label} <ExternalLink className="size-3 text-muted-foreground" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
