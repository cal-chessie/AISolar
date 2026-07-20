/**
 * ProposalView — the actual professional proposal.
 *
 * Shows the full proposal: system design, gear, costs, savings, finance.
 * Owner can view at any stage. Links to the professional PDF output.
 * Also shows compliance status (SEAI, ESB, RECI) pre-populated from survey data.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sun, Zap, Award, TrendingUp, DollarSign, Clock, FileText,
  Download, ArrowRight, CheckCircle2, Shield, Home, Battery,
  Wrench, Printer, Percent, CreditCard,
} from 'lucide-react';
import { type DummyLead } from '@/lib/dummyData';
import { calculateSEAI, eur } from '@/lib/seaiPipeline';

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

  return (
    <div className="space-y-3">
      {/* Proposal header */}
      <Card className="border-emerald-300 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 mb-2">
                {proposal.status === 'draft' ? 'DRAFT' : proposal.status === 'presented' ? 'SENT' : 'APPROVED'}
              </Badge>
              <h2 className="text-xl font-bold">Solar Proposal</h2>
              <p className="text-sm text-muted-foreground">Prepared for {lead.name} · {lead.address}</p>
              <p className="text-xs text-muted-foreground mt-1">Proposal #{proposal.id} · {proposal.sent_date ? `Sent ${new Date(proposal.sent_date).toLocaleDateString('en-IE')}` : 'Not sent'}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{proposal.system_size_kw} kWp</div>
              <div className="text-xs text-muted-foreground">{proposal.panel_count} panels</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System design */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sun className="h-4 w-4 text-amber-600" /> System design</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Solar panels</div>
              <div className="font-bold text-sm">{proposal.panel_count} × {proposal.panel_model}</div>
              <div className="text-xs text-muted-foreground mt-1">{(proposal.panel_count * 0.435).toFixed(1)} kWp total</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Inverter</div>
              <div className="font-bold text-sm">{proposal.inverter_model}</div>
            </div>
            {proposal.battery_model && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Battery storage</div>
                <div className="font-bold text-sm">{proposal.battery_model}</div>
              </div>
            )}
            {survey && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Roof</div>
                <div className="font-bold text-sm capitalize">{survey.roof_type} · {survey.roof_orientation} · {survey.roof_pitch}°</div>
                <div className="text-xs text-muted-foreground">Shading: {survey.shading}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-600" /> Investment & savings</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <div className="text-xs text-muted-foreground">Net cost</div>
              <div className="text-xl font-bold text-emerald-700">{eurFmt(proposal.net_cost)}</div>
              <div className="text-[11px] text-muted-foreground">after {eurFmt(proposal.seai_grant)} grant</div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-xs text-muted-foreground">Annual savings</div>
              <div className="text-xl font-bold text-blue-700">{eurFmt(proposal.annual_savings)}</div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="text-xs text-muted-foreground">Payback</div>
              <div className="text-xl font-bold text-amber-700">{proposal.payback_years} yrs</div>
            </div>
            <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg">
              <div className="text-xs text-muted-foreground">20-yr savings</div>
              <div className="text-xl font-bold text-violet-700">{eurFmt(proposal.twenty_year_savings)}</div>
            </div>
          </div>
          <div className="mt-3 p-2 bg-muted/30 rounded text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Gross cost</span><span className="font-medium">{eurFmt(proposal.gross_cost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SEAI grant</span><span className="font-medium text-violet-600">−{eurFmt(proposal.seai_grant)}</span></div>
            <div className="flex justify-between font-bold"><span>Net investment</span><span>{eurFmt(proposal.net_cost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Deposit (30%)</span><span>{eurFmt(proposal.net_cost * 0.3)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Balance (70%)</span><span>{eurFmt(proposal.net_cost * 0.7)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance papertrail (SEAI + ESB + RECI) */}
      <Card className="border-violet-200 dark:border-violet-800">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-violet-600" /> Compliance papertrail</h3>
          <p className="text-xs text-muted-foreground mb-3">Pre-populated from survey + install data. These certs are linked to the customer portal.</p>
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
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1"><Printer className="h-4 w-4 mr-2" /> Print PDF</Button>
        <Button variant="outline" className="flex-1"><Download className="h-4 w-4 mr-2" /> Download</Button>
        <Button className="flex-1 bg-emerald-600 transition-colors hover:bg-emerald-700"><FileText className="h-4 w-4 mr-2" /> Open in LeadFlow</Button>
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
    pending: { label: 'Pending', color: 'amber', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    in_progress: { label: 'In progress', color: 'blue', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    submitted: { label: 'Submitted', color: 'violet', bg: 'bg-violet-50 text-violet-700 border-violet-200' },
    filed: { label: 'Filed', color: 'emerald', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }[status];

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-muted">
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
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
            <span>{field}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
