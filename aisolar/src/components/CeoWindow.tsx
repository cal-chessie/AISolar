/**
 * CeoWindow — the owner's REAL analytics (Cal: "the real window — agents,
 * KPIs, leads, database, the most valuable CEO measurements — downloadable;
 * collect all agents' autologs and report").
 *
 * Four tabs:
 *   Overview — the CEO numbers, every figure traceable to a row
 *   Agents   — runs by agent + the collected AUTOLOG (every agent action),
 *              downloadable as CSV
 *   Leads    — the database view, downloadable as CSV
 *   Charts   — the existing funnel/team dashboard, kept as the visual layer
 *
 * All exports are client-side CSV blobs — they work in demo and in prod.
 */
import { useMemo, useState, lazy, Suspense } from 'react';
import {
  BarChart3, Bot, Download, Euro, TrendingDown, Users, Clock, Database,
  LineChart, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardListSkeleton } from '@/components/ui/SuspenseFallbacks';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { PIPELINE_STAGES, STAGE_GROUPS, getStage } from '@/lib/leadIntake';

const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/* Conservative manual-minutes per agent action — same model as InsightsView. */
const TASK_MINUTES: Array<{ match: RegExp; label: string; minutes: number }> = [
  { match: /draft|proposal/i, label: 'Drafting proposals', minutes: 45 },
  { match: /grant|seai/i, label: 'SEAI grant paperwork', minutes: 30 },
  { match: /book|schedul|survey/i, label: 'Booking + calendar admin', minutes: 12 },
  { match: /invoice|deposit|payment/i, label: 'Invoicing + payment chase', minutes: 10 },
  { match: /remind|follow|chase|t-\d/i, label: 'Reminders + follow-ups', minutes: 6 },
  { match: /.*/, label: 'Customer updates', minutes: 5 },
];

function agentFor(summary: string): string {
  const s = summary.toLowerCase();
  if (/draft|proposal/.test(s)) return 'The drafter';
  if (/grant|seai/.test(s)) return 'The grants clerk';
  if (/book|schedul|survey/.test(s)) return 'The scheduler';
  if (/invoice|deposit|payment/.test(s)) return 'The bookkeeper';
  if (/remind|follow|chase|t-\d/.test(s)) return 'The chaser';
  if (/intake|acknowledge|score/.test(s)) return 'The greeter';
  if (/digest|update/.test(s)) return 'The correspondent';
  if (/warranty|handover/.test(s)) return 'The closer';
  if (/install.*sched|materials ordered|crew/.test(s)) return 'The coordinator';
  if (/stale|escalat/.test(s)) return 'The watchdog';
  return 'AITeam';
}

/** Client-side CSV download. */
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

type Tab = 'overview' | 'financials' | 'agents' | 'leads' | 'charts';

export default function CeoWindow() {
  const [tab, setTab] = useState<Tab>('overview');
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());

  const d = useMemo(() => {
    const revenueClosed = leads.filter(l => l.invoice?.final_paid).reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0);
    const depositsHeld = leads.filter(l => l.invoice?.deposit_paid && !l.invoice?.final_paid).reduce((s, l) => s + (l.invoice?.deposit_amount ?? 0), 0);
    const pipelineValue = leads.filter(l => l.proposal && !l.invoice?.final_paid).reduce((s, l) => s + (l.proposal!.net_cost ?? 0), 0);
    const won = leads.filter(l => ['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(l.workflow_stage));
    const conversion = leads.length ? Math.round((won.length / leads.length) * 100) : 0;
    const avgJob = won.length ? Math.round(won.reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0) / won.length) : 0;

    // The autolog — every agent action across the book, newest first.
    const autolog = leads.flatMap(l =>
      l.touchpoints.filter(tp => tp.actor === 'agent').map(tp => ({
        at: tp.timestamp,
        agent: agentFor(tp.summary ?? ''),
        customer: l.name,
        stage: getStage(tp.stage)?.label ?? tp.stage,
        summary: tp.summary ?? '',
        minutes: TASK_MINUTES.find(t => t.match.test(tp.summary ?? ''))!.minutes,
      })),
    ).sort((a, b) => +new Date(b.at) - +new Date(a.at));

    const minutesSaved = autolog.reduce((s, r) => s + r.minutes, 0);

    const byAgent = new Map<string, { runs: number; minutes: number }>();
    for (const r of autolog) {
      const cur = byAgent.get(r.agent) ?? { runs: 0, minutes: 0 };
      cur.runs += 1; cur.minutes += r.minutes;
      byAgent.set(r.agent, cur);
    }
    // Full roster of 10 — agents with no logged runs still show (at 0), so the
    // owner sees the whole team, not just the busy ones.
    const ROSTER = ['The greeter', 'The scheduler', 'The drafter', 'The chaser', 'The grants clerk', 'The coordinator', 'The closer', 'The correspondent', 'The watchdog', 'The bookkeeper'];
    const agents = ROSTER.map(name => ({ agent: name, ...(byAgent.get(name) ?? { runs: 0, minutes: 0 }) }))
      .sort((a, b) => b.runs - a.runs);

    // Stall: biggest drop between phases
    const total = leads.length || 1;
    let remaining = total;
    const phases = STAGE_GROUPS.map(g => {
      const n = PIPELINE_STAGES.filter(s => s.group === g.id).reduce((a, s) => a + leads.filter(l => l.workflow_stage === s.id).length, 0);
      const reach = Math.round((remaining / total) * 100);
      remaining -= n;
      return { label: g.label, reach };
    });
    let stall = { label: '—', drop: 0 };
    for (let i = 1; i < phases.length; i++) {
      const drop = phases[i - 1].reach - phases[i].reach;
      if (drop > stall.drop) stall = { label: phases[i].label, drop };
    }

    const bySource = new Map<string, { total: number; won: number }>();
    for (const l of leads) {
      const cur = bySource.get(l.source) ?? { total: 0, won: 0 };
      cur.total += 1;
      if (won.includes(l)) cur.won += 1;
      bySource.set(l.source, cur);
    }
    const sources = [...bySource.entries()].map(([source, v]) => ({ source, ...v, rate: v.total ? Math.round((v.won / v.total) * 100) : 0 })).sort((a, b) => b.rate - a.rate);

    // Financials detail — every job with money attached, plus outstanding AR.
    const jobs = leads.filter(l => l.proposal).map(l => ({
      name: l.name,
      stage: getStage(l.workflow_stage)?.label ?? l.workflow_stage,
      gross: l.proposal!.gross_cost ?? 0,
      grant: l.proposal!.seai_grant ?? 0,
      net: l.proposal!.net_cost ?? 0,
      deposit: l.invoice?.deposit_paid ? (l.invoice?.deposit_amount ?? Math.round((l.proposal!.net_cost ?? 0) * 0.3)) : 0,
      finalPaid: !!l.invoice?.final_paid,
      outstanding: l.invoice?.final_paid ? 0 : (l.invoice?.deposit_paid ? (l.proposal!.net_cost ?? 0) - (l.invoice?.deposit_amount ?? Math.round((l.proposal!.net_cost ?? 0) * 0.3)) : (l.proposal!.net_cost ?? 0)),
    })).sort((a, b) => b.net - a.net);
    const outstandingAR = jobs.filter(j => j.deposit > 0 && !j.finalPaid).reduce((s, j) => s + j.outstanding, 0);
    const grantsInFlight = leads.filter(l => ['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed'].includes(l.workflow_stage)).reduce((s, l) => s + (l.proposal?.seai_grant ?? 0), 0);

    return { revenueClosed, depositsHeld, pipelineValue, conversion, avgJob, autolog, minutesSaved, agents, stall, sources, jobs, outstandingAR, grantsInFlight };
  }, [leads]);

  const exportAutolog = () => downloadCsv(
    `aisolar-agent-autolog-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Timestamp', 'Agent', 'Customer', 'Stage', 'Action', 'Manual minutes saved'],
    d.autolog.map(r => [r.at, r.agent, r.customer, r.stage, r.summary, r.minutes]),
  );
  const exportLeads = () => downloadCsv(
    `aisolar-leads-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Name', 'Email', 'Phone', 'Address', 'MPRN', 'Stage', 'Source', 'Score', 'Monthly bill €', 'Annual kWh', 'System kWp', 'Net cost €', 'Deposit paid', 'Final paid'],
    leads.map(l => [l.name, l.email, l.phone ?? '', l.address, l.mprn ?? '', getStage(l.workflow_stage)?.label ?? l.workflow_stage, l.source, l.score, l.monthly_bill ?? '', l.annual_kwh ?? '', l.proposal?.system_size_kw ?? '', l.proposal?.net_cost ?? '', l.invoice?.deposit_paid ? 'yes' : 'no', l.invoice?.final_paid ? 'yes' : 'no']),
  );
  const exportKpis = () => downloadCsv(
    `aisolar-ceo-report-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Metric', 'Value'],
    [
      ['Revenue banked', d.revenueClosed], ['Deposits held', d.depositsHeld],
      ['Pipeline value', d.pipelineValue], ['Conversion %', d.conversion],
      ['Average job €', d.avgJob], ['Agent actions', d.autolog.length],
      ['Hours saved', Math.round(d.minutesSaved / 60)], ['Biggest stall', `${d.stall.label} (−${d.stall.drop}%)`],
      ...d.sources.map(s => [`Win rate — ${s.source.replace(/_/g, ' ')}`, `${s.rate}% (${s.won}/${s.total})`]),
    ],
  );

  const TABS: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'financials', label: 'Financials', icon: Euro },
    { id: 'agents', label: 'Agents', icon: Bot },
    { id: 'leads', label: 'Leads', icon: Database },
    { id: 'charts', label: 'Charts', icon: LineChart },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-6xl">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">Every figure traces to a row. Every table downloads.</p>
        <Button variant="outline" size="sm" className="ml-auto" onClick={exportKpis}>
          <Download className="size-4 mr-1.5" /> Download report
        </Button>
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 h-9 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button type="button" onClick={() => setTab('financials')} className="text-left cursor-pointer group">
              <Kpi icon={<Euro />} label="Revenue banked" value={eur(d.revenueClosed)} sub={`${eur(d.depositsHeld)} deposits held · open financials →`} hero />
            </button>
            <Kpi icon={<TrendingDown />} label="Pipeline value" value={eur(d.pipelineValue)} sub={`${d.conversion}% conversion`} />
            <Kpi icon={<Users />} label="Average job" value={d.avgJob ? eur(d.avgJob) : '—'} sub="won deals only" />
            <Kpi icon={<Clock />} label="Hours saved" value={`${Math.round(d.minutesSaved / 60)} hrs`} sub={`${d.autolog.length} agent actions`} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-panel border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Where jobs stall</h3>
              <p className="mt-1 text-xs text-muted-foreground">Biggest drop between phases — fix this before buying more leads.</p>
              <p className="mt-3 text-xl font-semibold">{d.stall.label} <span className="text-pop text-sm font-medium">−{d.stall.drop}%</span></p>
            </div>
            <div className="rounded-panel border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Win rate by source</h3>
              <div className="mt-2 space-y-1.5">
                {d.sources.map(s => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{s.source.replace(/_/g, ' ')}</span>
                    <span className="tabular-nums text-muted-foreground">{s.won}/{s.total} · <strong className="text-foreground">{s.rate}%</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'financials' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={<Euro />} label="Revenue banked" value={eur(d.revenueClosed)} sub="final payments received" hero />
            <Kpi icon={<Euro />} label="Deposits held" value={eur(d.depositsHeld)} sub="jobs underway" />
            <Kpi icon={<Euro />} label="Outstanding balances" value={eur(d.outstandingAR)} sub="deposit paid, final due" />
            <Kpi icon={<Euro />} label="SEAI grants in flight" value={eur(d.grantsInFlight)} sub="approved → installed" />
          </div>

          <div className="rounded-panel border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 h-11 border-b border-border">
              <Euro className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Money by job</h3>
              <span className="text-2xs text-muted-foreground">{d.jobs.length} jobs with proposals</span>
              <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => downloadCsv(
                `aisolar-financials-${new Date().toISOString().slice(0, 10)}.csv`,
                ['Customer', 'Stage', 'Gross €', 'SEAI grant €', 'Net €', 'Deposit received €', 'Final paid', 'Outstanding €'],
                d.jobs.map(j => [j.name, j.stage, j.gross, j.grant, j.net, j.deposit, j.finalPaid ? 'yes' : 'no', j.outstanding]),
              )}>
                <Download className="size-3.5 mr-1" /> CSV
              </Button>
            </div>
            <div className="max-h-[28rem] overflow-auto scroll-slim">
              <table className="w-full text-sm min-w-[44rem]">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-left border-b border-border">
                    {['Customer', 'Stage', 'Gross', 'Grant', 'Net', 'Deposit', 'Outstanding'].map(h => <th key={h} className="font-medium text-xs text-muted-foreground px-4 py-2 whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {d.jobs.map(j => (
                    <tr key={j.name} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap font-medium">{j.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">{j.stage}</td>
                      <td className="px-4 py-2 tabular-nums">{eur(j.gross)}</td>
                      <td className="px-4 py-2 tabular-nums text-doc-deposit">−{eur(j.grant)}</td>
                      <td className="px-4 py-2 tabular-nums font-medium">{eur(j.net)}</td>
                      <td className="px-4 py-2 tabular-nums">{j.deposit ? eur(j.deposit) : '—'}</td>
                      <td className={`px-4 py-2 tabular-nums ${j.outstanding > 0 ? 'text-doc-invoice font-medium' : 'text-muted-foreground'}`}>{j.outstanding > 0 ? eur(j.outstanding) : 'settled'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'agents' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {d.agents.map(a => (
              <div key={a.agent} className="rounded-panel border border-border bg-card p-4">
                <div className="flex items-center gap-1.5"><Bot className="size-3.5 text-primary" /><span className="label-micro">{a.agent}</span></div>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums">{a.runs}</p>
                <p className="text-xs text-muted-foreground">{(a.minutes / 60).toFixed(1)} hrs of manual work</p>
              </div>
            ))}
          </div>

          <div className="rounded-panel border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 h-11 border-b border-border">
              <Bot className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Agent autolog</h3>
              <span className="text-2xs text-muted-foreground">{d.autolog.length} actions collected</span>
              <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={exportAutolog}>
                <Download className="size-3.5 mr-1" /> CSV
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto scroll-slim">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-left border-b border-border">
                    {['When', 'Agent', 'Customer', 'Action'].map(h => <th key={h} className="font-medium text-xs text-muted-foreground px-4 py-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {d.autolog.map((r, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap tabular-nums">{new Date(r.at).toLocaleString('en-IE', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="px-4 py-2 whitespace-nowrap font-medium">{r.agent}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.customer}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="rounded-panel border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 h-11 border-b border-border">
            <Database className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Leads database</h3>
            <span className="text-2xs text-muted-foreground">{leads.length} rows</span>
            <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={exportLeads}>
              <Download className="size-3.5 mr-1" /> CSV
            </Button>
          </div>
          <div className="max-h-[32rem] overflow-auto scroll-slim">
            <table className="w-full text-sm min-w-[56rem]">
              <thead className="sticky top-0 bg-card">
                <tr className="text-left border-b border-border">
                  {['Name', 'Stage', 'Source', 'Score', 'Bill €/mo', 'kWp', 'Net cost', 'Deposit', 'Final'].map(h => <th key={h} className="font-medium text-xs text-muted-foreground px-4 py-2 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{l.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">{getStage(l.workflow_stage)?.label}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs capitalize text-muted-foreground">{l.source.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 tabular-nums">{l.score}</td>
                    <td className="px-4 py-2 tabular-nums">€{l.monthly_bill}</td>
                    <td className="px-4 py-2 tabular-nums">{l.proposal?.system_size_kw ?? '—'}</td>
                    <td className="px-4 py-2 tabular-nums">{l.proposal ? eur(l.proposal.net_cost) : '—'}</td>
                    <td className="px-4 py-2">{l.invoice?.deposit_paid ? <CheckCircle2 className="size-4 text-doc-deposit" /> : <XCircle className="size-4 text-muted-foreground/40" />}</td>
                    <td className="px-4 py-2">{l.invoice?.final_paid ? <CheckCircle2 className="size-4 text-doc-deposit" /> : <XCircle className="size-4 text-muted-foreground/40" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'charts' && (
        <Suspense fallback={<CardListSkeleton count={3} />}>
          <AnalyticsDashboard />
        </Suspense>
      )}

      {/* Cal: custom windows are part of the AIOS offer — say so where the
          owner is already looking at their numbers. */}
      <div className="rounded-panel bg-primary text-primary-foreground p-5 flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">Want a window this page doesn't have?</p>
          <p className="text-xs text-primary-foreground/70 mt-0.5 leading-body">
            Custom views, reports and agent behaviours are part of the AIOS offer — we build them around how your company runs.
          </p>
        </div>
        <a href="mailto:cal@renewably.ie?subject=Custom%20window%20request"
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-background text-foreground px-4 text-xs font-semibold hover:opacity-90 transition-opacity shrink-0">
          Contact our team
        </a>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, hero }: { icon: React.ReactNode; label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className={`rounded-panel border bg-card p-4 ${hero ? 'border-primary/30 bg-primary/[0.03]' : 'border-border'}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground [&>svg]:size-3.5">{icon}<span className="label-micro">{label}</span></div>
      <p className={`mt-1.5 font-semibold tabular-nums ${hero ? 'text-2xl text-primary' : 'text-2xl'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
