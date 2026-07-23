/**
 * ProposalView — the close, rebuilt as a crown jewel.
 *
 * The proposal is the ONE document the customer compares against two other
 * quotes, so it has to look like nobody else's: framed in the doc-proposal
 * yellow, opened by an inverted charcoal masthead, and grounded in the
 * customer's own bill (the canonical 21-point read, dense) so every number
 * below it is visibly theirs — not an average home's.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sun, Zap, Award, FileText, Download, CheckCircle2, Shield,
  Battery, Printer, Calculator,
} from 'lucide-react';
import { type DummyLead } from '@/lib/dummyData';
import { calculateSEAI } from '@/lib/seaiPipeline';
import BillReadPanel, { billReadFromIntake } from '@/components/bill/BillReadPanel';

const eurFmt = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function ProposalView({ lead }: { lead: DummyLead }) {
  const proposal = lead.proposal;
  const survey = lead.survey;
  if (!proposal) {
    return <div className="p-8 text-center text-sm text-muted-foreground">No proposal created yet for this lead.</div>;
  }

  const seai = calculateSEAI({
    systemSizeKw: proposal.system_size_kw,
    propertyType: 'domestic',
    installType: 'retrofit',
    annualKwhUsage: lead.annual_kwh || 0,
    annualProductionKwh: proposal.system_size_kw * 950,
    selfConsumptionPct: 0.7,
    netCost: proposal.net_cost,
  });

  const bill = billReadFromIntake(lead.intake as Record<string, unknown>, {
    monthlyBill: lead.monthly_bill,
    annualKwh: lead.annual_kwh,
    mprn: lead.mprn,
    accountName: lead.name,
    address: lead.address,
  });

  const statusMeta = proposal.status === 'draft'
    ? { label: 'DRAFT', tone: 'bg-muted-foreground text-white' }
    : proposal.status === 'presented'
      ? { label: 'SENT', tone: 'bg-doc-contract text-white' }
      : { label: 'APPROVED', tone: 'bg-doc-deposit text-white' };

  return (
    /* The doc-proposal yellow frame — the proposal's colour, everywhere it appears */
    <div className="space-y-3 rounded-[16px] border-l-4 border-l-doc-proposal pl-3 -ml-3">
      {/* Masthead — inverted charcoal, the number that matters on the right */}
      <div className="rounded-[16px] bg-primary text-primary-foreground shadow-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 mb-2 ${statusMeta.tone}`}>{statusMeta.label}</span>
            <h2 className="text-xl font-bold">Solar Proposal</h2>
            <p className="text-sm text-primary-foreground/70">Prepared for {lead.name} · {lead.address}</p>
            <p className="text-xs text-primary-foreground/60 mt-1">Proposal #{proposal.id} · {proposal.sent_date ? `Sent ${new Date(proposal.sent_date).toLocaleDateString('en-IE')}` : 'Not sent'}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold tabular-nums">{proposal.system_size_kw} kWp</div>
            <div className="text-xs text-primary-foreground/70">{proposal.panel_count} panels</div>
            <div className="mt-2 text-lg font-semibold text-doc-deposit tabular-nums">{eurFmt(proposal.annual_savings)}<span className="text-xs font-normal text-primary-foreground/60"> saved / yr</span></div>
          </div>
        </div>
      </div>

      {/* Their bill, in full — the reason every number below is theirs */}
      <BillReadPanel bill={bill} dense />

      {/* System design */}
      <div className="rounded-[16px] bg-card shadow-card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sun className="h-4 w-4 text-primary" /> Designed for this roof</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-3 bg-muted/30 rounded-[10px]">
            <div className="label-micro">Solar panels</div>
            <div className="font-bold text-sm">{proposal.panel_count} × {proposal.panel_model}</div>
            <div className="text-xs text-muted-foreground mt-1">{(proposal.panel_count * 0.435).toFixed(1)} kWp total</div>
          </div>
          <div className="p-3 bg-muted/30 rounded-[10px]">
            <div className="label-micro">Inverter</div>
            <div className="font-bold text-sm">{proposal.inverter_model}</div>
          </div>
          {proposal.battery_model && (
            <div className="p-3 bg-muted/30 rounded-[10px]">
              <div className="label-micro flex items-center gap-1"><Battery className="h-3 w-3" /> Battery storage</div>
              <div className="font-bold text-sm">{proposal.battery_model}</div>
            </div>
          )}
          {survey && (
            <div className="p-3 bg-muted/30 rounded-[10px]">
              <div className="label-micro">Roof (surveyed)</div>
              <div className="font-bold text-sm capitalize">{survey.roof_type} · {survey.roof_orientation} · {survey.roof_pitch}°</div>
              <div className="text-xs text-muted-foreground">Shading: {survey.shading}</div>
            </div>
          )}
        </div>
      </div>

      {/* The money */}
      <div className="rounded-[16px] bg-card shadow-card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Investment & savings</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Net cost', value: eurFmt(proposal.net_cost), sub: `after ${eurFmt(proposal.seai_grant)} grant`, tone: '' },
            { label: 'Annual savings', value: eurFmt(proposal.annual_savings), tone: 'text-doc-deposit' },
            { label: 'Payback', value: `${proposal.payback_years} yrs`, tone: '' },
            { label: '20-yr savings', value: eurFmt(proposal.twenty_year_savings), tone: 'text-doc-deposit' },
          ].map(m => (
            <div key={m.label} className="p-3 bg-muted/30 rounded-[10px]">
              <div className="label-micro">{m.label}</div>
              <div className={`text-xl font-bold tabular-nums ${m.tone || 'text-foreground'}`}>{m.value}</div>
              {m.sub && <div className="text-[11px] text-muted-foreground">{m.sub}</div>}
            </div>
          ))}
        </div>
        <div className="mt-3 p-2.5 bg-muted/30 rounded-[10px] text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Gross cost</span><span className="font-medium tabular-nums">{eurFmt(proposal.gross_cost)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">SEAI grant</span><span className="font-medium text-tech tabular-nums">−{eurFmt(proposal.seai_grant)}</span></div>
          <div className="flex justify-between font-bold border-t border-border pt-1"><span>Net investment</span><span className="tabular-nums">{eurFmt(proposal.net_cost)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Deposit (30%)</span><span className="text-doc-deposit font-medium tabular-nums">{eurFmt(proposal.net_cost * 0.3)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Balance (70%)</span><span className="tabular-nums">{eurFmt(proposal.net_cost * 0.7)}</span></div>
        </div>
      </div>

      {/* Compliance papertrail — SEAI tracked (never "submitted for you") */}
      <div className="rounded-[16px] bg-card shadow-card p-4">
        <h3 className="font-semibold text-sm mb-1 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Compliance papertrail</h3>
        <p className="text-xs text-muted-foreground mb-3">Pre-populated from survey + install data, linked to the customer portal.</p>
        <div className="space-y-2">
          <ComplianceItem
            org="SEAI" label="Solar Electricity Grant" icon={Award}
            status={lead.workflow_stage === 'completed' ? 'submitted' : ['approved','deposit_paid','install_scheduled','installing','installed','final_paid'].includes(lead.workflow_stage) ? 'in_progress' : 'pending'}
            details={`Grant: ${eurFmt(proposal.seai_grant)} · MPRN: ${lead.mprn} · System: ${proposal.system_size_kw}kWp`}
            prePopulated={['MPRN', 'System size', 'Invoice (auto)', 'Install photos (from checklist)']}
          />
          <ComplianceItem
            org="ESB" label="NC6 Microgen Export" icon={Zap}
            status={['installed','final_paid','completed'].includes(lead.workflow_stage) ? 'submitted' : 'pending'}
            details={`Export tariff: €0.14/kWh · Connection: ${survey?.confirmed_inverter_type || 'Single phase'}`}
            prePopulated={['Inverter type (from survey)', 'System size', 'Installation date']}
          />
          <ComplianceItem
            org="RECI" label="Electrical sign-off" icon={Shield}
            status={['installed','final_paid','completed'].includes(lead.workflow_stage) ? 'filed' : 'pending'}
            details={`RECI cert required for commissioning · Isolator: ${lead.assignment ? 'installed' : 'pending'}`}
            prePopulated={['Isolator installed (from checklist)', 'RCD tested (from checklist)', 'Earth bond (from checklist)', 'SPD installed (from checklist)']}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-10 rounded-[10px]"><Printer className="h-4 w-4 mr-2" /> Print PDF</Button>
        <Button variant="outline" className="flex-1 h-10 rounded-[10px]"><Download className="h-4 w-4 mr-2" /> Download</Button>
        <Button className="flex-1 h-10 rounded-[10px] font-semibold"><FileText className="h-4 w-4 mr-2" /> Open in LeadFlow</Button>
      </div>
    </div>
  );
}

function ComplianceItem({ org, label, icon: Icon, status, details, prePopulated }: {
  org: string; label: string; icon: typeof Shield;
  status: 'pending' | 'in_progress' | 'submitted' | 'filed';
  details: string; prePopulated: string[];
}) {
  const statusMeta = {
    pending: { label: 'Pending', bg: 'bg-doc-proposal-subtle text-doc-proposal border-doc-proposal/30' },
    in_progress: { label: 'In progress', bg: 'bg-tech-subtle text-tech border-tech/30' },
    submitted: { label: 'Submitted', bg: 'bg-doc-contract-subtle text-doc-contract border-doc-contract/30' },
    filed: { label: 'Filed', bg: 'bg-doc-deposit-subtle text-doc-deposit border-doc-deposit/30' },
  }[status];

  return (
    <div className="p-3 bg-muted/20 rounded-[10px]">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-[8px] bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{org}</span>
            <span className="text-xs text-muted-foreground">— {label}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{details}</div>
        </div>
        <Badge variant="outline" className={`text-[11px] ${statusMeta.bg}`}>{statusMeta.label}</Badge>
      </div>
      <div className="pl-9 space-y-0.5">
        {prePopulated.map((field, i) => (
          <div key={i} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-2.5 w-2.5 text-doc-deposit" />
            <span>{field}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
