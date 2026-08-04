/**
 * EstimateView — the in-app estimate, rebuilt as a crown jewel.
 *
 * Was: three grey boxes showing 5 of the 21 fields — the moat, watered down
 * exactly where the consultant sells with it. Now it's the canonical
 * BillReadPanel (all fields, dynamic count, day/night split, honesty caveats)
 * + the satellite of the actual roof + the money, with one primary action.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Zap, TrendingUp, Award, MapPin, Phone, Mail,
  Calculator, ArrowRight, Sun, Clock,
} from 'lucide-react';
import { type DummyLead } from '@/lib/dummyData';
import { calculateSystemEstimate, selfConsumptionFromOccupancy } from '@/lib/leadIntake';
import { calculateSEAI, seaiPropertyType, seaiGrantEligibility } from '@/lib/seaiPipeline';
import BillReadPanel, { billReadFromIntake } from '@/components/bill/BillReadPanel';
import DocumentActions from '@/components/consultant/DocumentActions';

const eurFmt = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function EstimateView({ lead, onOpenProposal }: { lead: DummyLead; onOpenProposal?: () => void }) {
  const estimate = calculateSystemEstimate({
    monthlyBill: lead.monthly_bill,
    annualKwh: lead.annual_kwh,
  });
  const seai = calculateSEAI({
    systemSizeKw: estimate.systemSizeKw,
    propertyType: seaiPropertyType((lead.intake as Record<string, unknown>)?.property_type as string),
    installType: 'retrofit',
    annualKwhUsage: estimate.annualKwh,
    annualProductionKwh: estimate.annualProductionKwh,
    // Occupancy-driven when the survey has answered; its own 0.70 fallback before.
    selfConsumptionPct: selfConsumptionFromOccupancy({
      occupants: lead.survey?.household_occupants,
      homeDuringDay: lead.survey?.home_during_day,
      hasBattery: !!lead.proposal?.battery_model,
    }),
    netCost: estimate.netCost,
  });

  // SEAI grant eligibility — don't present €1,800 as certain when we KNOW the
  // home can't claim it (post-2021 build / new build / no MPRN). Only flags on
  // positive evidence; unknown year built stays eligible.
  const grantElig = seaiGrantEligibility({
    propertyType: seaiPropertyType((lead.intake as Record<string, unknown>)?.property_type as string),
    installType: 'retrofit',
    yearBuilt: (lead.intake as Record<string, unknown>)?.year_built as string | number | undefined,
    mprn: lead.mprn,
  });

  const bill = billReadFromIntake(lead.intake as Record<string, unknown>, {
    monthlyBill: lead.monthly_bill,
    annualKwh: lead.annual_kwh,
    mprn: lead.mprn,
    accountName: lead.name,
    address: lead.address,
  });
  const eircode = bill.eircode ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0];

  return (
    <div className="space-y-3">
      {/* who — one slim strip */}
      <div className="rounded-panel bg-card shadow-card p-4 flex items-center gap-3">
        <Avatar className="h-11 w-11"><AvatarFallback>{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-base truncate">{lead.name}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {lead.email}</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>
            <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {lead.address.split(',').slice(-1)[0]?.trim()}</span>
          </div>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 capitalize ${lead.intake.extraction_confidence === 'high' ? 'bg-doc-deposit/10 text-doc-deposit border-doc-deposit/30' : lead.intake.extraction_confidence === 'medium' ? 'bg-doc-proposal/10 text-doc-proposal border-doc-proposal/30' : 'bg-muted text-muted-foreground'}`}>
          {lead.intake.extraction_confidence} confidence
        </Badge>
      </div>

      {/* THE READ — the moat, at full strength, everywhere */}
      <BillReadPanel bill={bill} dense />

      {/* the roof, from the eircode */}
      {eircode && (
        <div className="rounded-panel bg-card shadow-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
            <MapPin className="size-4 text-tech" />
            <span className="text-sm font-semibold">The roof, from above</span>
            <span className="ml-auto text-2xs text-muted-foreground">{eircode}</span>
          </div>
          <iframe
            title="Property satellite view"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(eircode)}&t=k&z=19&output=embed`}
            className="w-full h-52 border-0"
            loading="lazy"
          />
          <p className="px-4 py-1.5 text-2xs text-muted-foreground">Imagery only — exact layout is measured at the survey.</p>
        </div>
      )}

      {/* the money */}
      <div className="rounded-panel bg-card shadow-card border-l-4 border-l-primary p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> The estimate, off their numbers</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Sun, label: 'System size', value: `${estimate.systemSizeKw} kWp`, tone: '' },
            { icon: TrendingUp, label: 'Annual savings', value: eurFmt(estimate.annualSavings), tone: 'text-doc-deposit' },
            { icon: Award, label: 'SEAI grant', value: grantElig.eligible ? eurFmt(seai.solarElectricityGrant) : 'Check eligibility', tone: grantElig.eligible ? 'text-tech' : 'text-doc-proposal' },
            { icon: Clock, label: 'Payback', value: `${estimate.paybackYears} yrs`, tone: '' },
          ].map(m => (
            <div key={m.label} className="text-center">
              <m.icon className={`h-4.5 w-4.5 mx-auto mb-1 ${m.tone || 'text-muted-foreground'}`} />
              <div className="label-micro">{m.label}</div>
              <div className={`text-lg font-semibold tabular-nums ${m.tone}`}>{m.value}</div>
            </div>
          ))}
        </div>
        {!grantElig.eligible && (
          <div className="mt-3 rounded-control border border-doc-proposal/40 bg-doc-proposal/5 p-2.5 text-2xs leading-snug">
            <span className="font-semibold text-doc-proposal">SEAI grant may not apply — </span>
            <span className="text-muted-foreground">{grantElig.blockers.join(' · ')}. The figures below assume the {eurFmt(seai.solarElectricityGrant)} grant; without it the net cost is <span className="font-semibold text-foreground">{eurFmt(estimate.netCost + seai.solarElectricityGrant)}</span>. Confirm eligibility before quoting it.</span>
          </div>
        )}
        <div className="mt-3 p-2.5 bg-muted/40 rounded-control text-xs grid grid-cols-2 gap-2">
          <div><span className="text-muted-foreground">Net cost:</span> <span className="font-semibold tabular-nums">{eurFmt(estimate.netCost)}</span></div>
          <div><span className="text-muted-foreground">20-year savings:</span> <span className="font-semibold tabular-nums">{eurFmt(estimate.twentyYearSavings)}</span></div>
          <div><span className="text-muted-foreground">Solar offset:</span> <span className="font-semibold tabular-nums">{estimate.solarOffsetPct}%</span></div>
          <div><span className="text-muted-foreground">Annual production:</span> <span className="font-semibold tabular-nums">{estimate.annualProductionKwh.toLocaleString()} kWh</span></div>
        </div>
      </div>

      {/* Review-and-act: bottleneck intelligence + notify, not print/download */}
      <DocumentActions lead={lead} forwardLabel="Open the proposal" forwardIcon={ArrowRight} onForward={onOpenProposal} />
    </div>
  );
}
