/**
 * A. Customer Intelligence Profile — 360° view per customer.
 *
 * One page that aggregates EVERYTHING about a customer:
 *   - Bill extraction data (MPRN, kWh, monthly bill)
 *   - Survey data (roof, electrical, preferences)
 *   - Proposal data (system, products, pricing)
 *   - Contract + invoice data
 *   - SEAI grant status
 *   - All touchpoints (email, SMS, calls, AI chat)
 *   - Install photos + checklist
 *   - Post-install feedback + review
 *   - Referral info
 *
 * This is the single "open a customer" view for consultant/installer/admin.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User, MapPin, Phone, Mail, Sun, Zap, Home, FileText, CreditCard,
  Award, Camera, MessageSquare, Star, TrendingUp, Clock, CheckCircle2,
  Bot, Shield, Calendar, PoundSterling,
} from 'lucide-react';
import { useState } from 'react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { getStage } from '@/lib/leadIntake';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function CustomerIntelligenceProfile({ leadId }: { leadId?: string }) {
  const [lead] = useState<DummyLead>(() => {
    const leads = generateDummyLeads();
    return leads.find(l => l.proposal && l.contract) || leads[6];
  });

  const stage = getStage(lead.workflow_stage);
  const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{lead.name}</h1>
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" /> {lead.address}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> MPRN: {lead.mprn}</span>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`bg-primary text-white`}>{stage.label}</Badge>
              <div className="text-xs text-muted-foreground mt-1">Score: {lead.score}/100</div>
              <div className="text-xs text-muted-foreground">Assigned: {lead.assigned_consultant}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intelligence grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Bill data */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Bill extraction</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <Row label="Monthly bill" value={`€${lead.monthly_bill}`} />
            <Row label="Annual kWh" value={lead.annual_kwh?.toLocaleString()} />
            <Row label="MPRN" value={lead.mprn} mono />
            <Row label="Confidence" value={lead.intake.extraction_confidence} />
          </CardContent>
        </Card>

        {/* Survey data */}
        {lead.survey && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Survey</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <Row label="Roof type" value={lead.survey.roof_type} />
              <Row label="Orientation" value={lead.survey.roof_orientation} />
              <Row label="Pitch" value={`${lead.survey.roof_pitch}°`} />
              <Row label="Shading" value={lead.survey.shading} />
              <Row label="System" value={`${lead.survey.confirmed_system_size_kw}kWp`} />
              <Row label="Battery" value={lead.survey.confirmed_battery_kwh ? `${lead.survey.confirmed_battery_kwh}kWh` : 'None'} />
            </CardContent>
          </Card>
        )}

        {/* Proposal data */}
        {lead.proposal && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sun className="h-4 w-4 text-doc-proposal" /> Proposal</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <Row label="Status" value={lead.proposal.status} />
              <Row label="System" value={`${lead.proposal.system_size_kw}kWp`} />
              <Row label="Panels" value={`${lead.proposal.panel_count} × ${lead.proposal.panel_model}`} />
              <Row label="Inverter" value={lead.proposal.inverter_model} />
              <Row label="Net cost" value={eur(lead.proposal.net_cost)} />
              <Row label="SEAI grant" value={eur(lead.proposal.seai_grant)} />
              <Row label="Payback" value={`${lead.proposal.payback_years} yrs`} />
            </CardContent>
          </Card>
        )}

        {/* Contract + invoice */}
        {lead.contract && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Contract & invoice</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <Row label="Contract" value={`Signed ${new Date(lead.contract.signed_date).toLocaleDateString('en-IE')}`} />
              {lead.invoice && (
                <>
                  <Row label="Deposit" value={`${eur(lead.invoice.deposit_amount)} ${lead.invoice.deposit_paid ? '✓' : ' pending'}`} />
                  <Row label="Final" value={`${eur(lead.invoice.final_amount)} ${lead.invoice.final_paid ? '✓' : ' pending'}`} />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Installation */}
        {lead.assignment && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-doc-proposal" /> Installation</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <Row label="Installer" value={lead.assignment.installer_name} />
              <Row label="Scheduled" value={new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE')} />
              <Row label="Status" value={lead.assignment.status} />
            </CardContent>
          </Card>
        )}

        {/* Touchpoints summary */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Communication</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <Row label="Total touchpoints" value={String(lead.touchpoints.length)} />
            <Row label="Emails" value={String(lead.touchpoints.filter(t => t.channel === 'email').length)} />
            <Row label="Portal views" value={String(lead.touchpoints.filter(t => t.channel === 'portal').length)} />
            <Row label="AI chat" value={String(lead.touchpoints.filter(t => t.actor === 'agent').length)} />
            <Row label="Last contact" value={new Date(lead.touchpoints[lead.touchpoints.length - 1]?.timestamp || Date.now()).toLocaleDateString('en-IE')} />
          </CardContent>
        </Card>
      </div>

      {/* Touchpoint timeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Full touchpoint timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {lead.touchpoints.map((tp, i) => (
              <div key={i} className="flex items-start gap-2 p-2 border rounded text-xs">
                <Badge variant="outline" className="text-[11px] flex-shrink-0">{tp.channel}</Badge>
                <div className="flex-1">
                  <div className="text-foreground">{tp.summary}</div>
                  <div className="text-muted-foreground mt-0.5">
                    {tp.actor} · {new Date(tp.timestamp).toLocaleString('en-IE', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

