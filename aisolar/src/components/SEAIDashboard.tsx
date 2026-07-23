/**
 * SEAI & Compliance Dashboard — proper grant tracking.
 *
 * Shows:
 *   - SEAI grant pipeline (pending, in_progress, submitted, approved, paid)
 *   - ESB NC6 microgen export status per lead
 *   - RECI electrical sign-off status per lead
 *   - Paperwork checklist per lead (what's missing, what's ready)
 *   - Grant value tracker (total claimed, pending, expected)
 *   - Compliance timeline (when each cert was filed)
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Award, Zap, Shield, CheckCircle2, AlertTriangle, Clock, FileText,
  TrendingUp, DollarSign, Download, ChevronRight, Filter,
} from 'lucide-react';
import { type DummyLead } from '@/lib/dummyData';
import { getStage } from '@/lib/leadIntake';
import PaperworkWindow, { buildPack } from '@/components/compliance/PaperworkWindow';
import { decideCompliance } from '@/lib/complianceDecision';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface ComplianceItem {
  lead: DummyLead;
  seaiStatus: 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'paid';
  esbStatus: 'not_started' | 'submitted' | 'connected';
  reciStatus: 'not_started' | 'filed';
  paperwork: Array<{ item: string; status: 'missing' | 'pending' | 'ready' | 'submitted' }>;
  grantAmount: number;
}

function getComplianceForLead(lead: DummyLead): ComplianceItem {
  const stage = lead.workflow_stage;
  const hasProposal = !!lead.proposal;
  const hasContract = !!lead.contract;
  const isInstalled = ['installed', 'final_paid', 'completed'].includes(stage);
  const isCompleted = stage === 'completed';

  // SEAI status
  let seaiStatus: ComplianceItem['seaiStatus'] = 'not_started';
  if (isCompleted) seaiStatus = 'paid';
  else if (isInstalled) seaiStatus = 'submitted';
  else if (hasContract) seaiStatus = 'in_progress';
  else if (hasProposal) seaiStatus = 'not_started';

  // ESB status
  let esbStatus: ComplianceItem['esbStatus'] = 'not_started';
  if (isInstalled || isCompleted) esbStatus = 'connected';
  else if (hasContract) esbStatus = 'submitted';

  // RECI status
  let reciStatus: ComplianceItem['reciStatus'] = 'not_started';
  if (isInstalled || isCompleted) reciStatus = 'filed';

  // Paperwork
  const paperwork = [
    { item: 'MPRN verification', status: lead.mprn ? 'ready' as const : 'missing' as const },
    { item: 'BER certificate', status: isInstalled ? 'submitted' as const : 'pending' as const },
    { item: 'Final tax invoice', status: lead.invoice ? 'ready' as const : 'missing' as const },
    { item: 'Install photos', status: isInstalled ? 'submitted' as const : 'pending' as const },
    { item: 'Commissioning cert (RECI)', status: reciStatus === 'filed' ? 'submitted' as const : 'pending' as const },
    { item: 'ESB NC6 form', status: esbStatus === 'connected' ? 'submitted' as const : esbStatus === 'submitted' ? 'pending' as const : 'missing' as const },
  ];

  return {
    lead,
    seaiStatus,
    esbStatus,
    reciStatus,
    paperwork,
    grantAmount: lead.proposal?.seai_grant || 0,
  };
}

const STATUS_META = {
  not_started: { label: 'Not started', color: 'slate', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
  in_progress: { label: 'In progress', color: 'blue', bg: 'bg-primary/10 text-primary border-primary/40' },
  submitted: { label: 'Submitted', color: 'violet', bg: 'bg-primary/10 text-primary border-primary/40' },
  approved: { label: 'Approved', color: 'emerald', bg: 'bg-primary/10 text-primary border-primary/40' },
  paid: { label: 'Paid', color: 'green', bg: 'bg-primary/10 text-primary border-primary/40' },
  connected: { label: 'Connected', color: 'emerald', bg: 'bg-primary/10 text-primary border-primary/40' },
  filed: { label: 'Filed', color: 'emerald', bg: 'bg-primary/10 text-primary border-primary/40' },
};

const PAPERWORK_META = {
  missing: { color: 'red', bg: 'bg-red-50 text-red-700', icon: AlertTriangle },
  pending: { color: 'pending', bg: 'bg-doc-proposal-subtle text-doc-proposal', icon: Clock },
  ready: { color: 'blue', bg: 'bg-primary/10 text-primary', icon: FileText },
  submitted: { color: 'emerald', bg: 'bg-primary/10 text-primary', icon: CheckCircle2 },
};

export default function SEAIDashboard({ leads }: { leads: DummyLead[] }) {
  const [selectedLead, setSelectedLead] = useState<DummyLead | null>(null);
  const [filter, setFilter] = useState<'all' | 'seai' | 'esb' | 'reci'>('all');

  const complianceData = useMemo(() => {
    return leads
      .filter(l => l.proposal) // Only leads with proposals have compliance
      .map(getComplianceForLead);
  }, [leads]);

  const stats = useMemo(() => {
    const totalGrantValue = complianceData.reduce((s, c) => s + c.grantAmount, 0);
    const submitted = complianceData.filter(c => ['submitted', 'approved', 'paid'].includes(c.seaiStatus)).length;
    const pending = complianceData.filter(c => c.seaiStatus === 'in_progress').length;
    const notStarted = complianceData.filter(c => c.seaiStatus === 'not_started').length;
    const esbConnected = complianceData.filter(c => c.esbStatus === 'connected').length;
    const reciFiled = complianceData.filter(c => c.reciStatus === 'filed').length;
    return { totalGrantValue, submitted, pending, notStarted, esbConnected, reciFiled, total: complianceData.length };
  }, [complianceData]);

  if (selectedLead) {
    return <PaperworkWindow lead={selectedLead} onBack={() => setSelectedLead(null)} />;
  }

  return (
    <div className="p-4 space-y-3">

      {/* The grants business at a glance — every figure traceable to a pack */}
      <div className="rounded-[16px] bg-primary text-primary-foreground shadow-card p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <div className="text-2xs text-primary-foreground/60 uppercase tracking-wide">Grant pipeline</div>
          <div className="text-2xl font-bold tabular-nums text-doc-deposit">{eur(stats.totalGrantValue)}</div>
        </div>
        <div>
          <div className="text-2xs text-primary-foreground/60 uppercase tracking-wide">SEAI submitted</div>
          <div className="text-2xl font-bold tabular-nums">{stats.submitted}</div>
        </div>
        <div>
          <div className="text-2xs text-primary-foreground/60 uppercase tracking-wide">ESB connected</div>
          <div className="text-2xl font-bold tabular-nums">{stats.esbConnected}</div>
        </div>
        <div>
          <div className="text-2xs text-primary-foreground/60 uppercase tracking-wide">RECI filed</div>
          <div className="text-2xl font-bold tabular-nums">{stats.reciFiled}</div>
        </div>
        <div className="ml-auto text-2xs text-primary-foreground/60 max-w-[200px]">
          Agents prepare, track and chase every document — click a customer for their full pack.
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1">
        {(['all', 'seai', 'esb', 'reci'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            {f === 'all' ? 'All' : f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Compliance list */}
      <div className="space-y-2">
        {complianceData.map(c => (
          <Card key={c.lead.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelectedLead(c.lead)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{c.lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate flex items-center gap-1.5">{c.lead.name}
                    {(() => { const d = decideCompliance(c.lead);
                      return <>
                        <span className="text-2xs rounded-full bg-tech-subtle text-tech px-1.5 py-0.5 font-medium shrink-0">{d.esbForm}</span>
                        {d.commercial && <span className="text-2xs rounded-full bg-doc-contract-subtle text-doc-contract px-1.5 py-0.5 font-medium shrink-0">Commercial</span>}
                      </>; })()}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.lead.address.split(',').slice(-1)[0]?.trim()}</div>
                  {(() => { const pk = buildPack(c.lead); const ready = pk.filter(d => ['received','complete','sent'].includes(d.status)).length;
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 max-w-[140px] h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-doc-deposit rounded-full" style={{ width: `${(ready / pk.length) * 100}%` }} />
                        </div>
                        <span className="text-2xs text-muted-foreground tabular-nums">{ready}/{pk.length} docs</span>
                      </div>
                    ); })()}
                </div>
                <div className="flex items-center gap-2">
                  {/* SEAI badge */}
                  {(filter === 'all' || filter === 'seai') && (
                    <div className="flex items-center gap-1">
                      <Award className="h-3 w-3 text-primary" />
                      <Badge variant="outline" className={`text-[11px] ${STATUS_META[c.seaiStatus].bg}`}>{STATUS_META[c.seaiStatus].label}</Badge>
                    </div>
                  )}
                  {/* ESB badge */}
                  {(filter === 'all' || filter === 'esb') && (
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-tech" />
                      <Badge variant="outline" className={`text-[11px] ${STATUS_META[c.esbStatus].bg}`}>{STATUS_META[c.esbStatus].label}</Badge>
                    </div>
                  )}
                  {/* RECI badge */}
                  {(filter === 'all' || filter === 'reci') && (
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-primary" />
                      <Badge variant="outline" className={`text-[11px] ${STATUS_META[c.reciStatus].bg}`}>{STATUS_META[c.reciStatus].label}</Badge>
                    </div>
                  )}
                  <span className="text-xs font-semibold text-primary">{eur(c.grantAmount)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              {/* Paperwork progress bar */}
              <div className="mt-2 flex items-center gap-1">
                {c.paperwork.map((p, i) => {
                  const meta = PAPERWORK_META[p.status];
                  return <div key={i} className={`h-1.5 flex-1 rounded-full ${meta.bg.split(' ')[0]}`} title={`${p.item}: ${p.status}`} />;
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
