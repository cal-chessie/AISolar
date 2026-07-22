/**
 * EstimateView — the AI bill-extract estimate, clickable from pipeline.
 *
 * Shows: bill-extracted data (MPRN, kWh, monthly bill), AI estimate
 * (system size, savings, payback), lead details (name, email, phone, address).
 * Owner can open this at any stage without being blocked.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  FileText, Zap, TrendingUp, Award, MapPin, Phone, Mail,
  Calculator, ArrowRight, Sun, Clock, Target, Download,
} from 'lucide-react';
import { type DummyLead } from '@/lib/dummyData';
import { calculateSystemEstimate } from '@/lib/leadIntake';
import { calculateSEAI, eur } from '@/lib/seaiPipeline';

const eurFmt = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function EstimateView({ lead, onOpenProposal }: { lead: DummyLead; onOpenProposal?: () => void }) {
  const estimate = calculateSystemEstimate({
    monthlyBill: lead.monthly_bill,
    annualKwh: lead.annual_kwh,
  });
  const seai = calculateSEAI({
    systemSizeKw: estimate.systemSizeKw,
    propertyType: 'domestic',
    installType: 'retrofit',
    annualKwhUsage: estimate.annualKwh,
    annualProductionKwh: estimate.annualProductionKwh,
    selfConsumptionPct: 0.7,
    netCost: estimate.netCost,
  });

  return (
    <div className="space-y-3">
      {/* Lead details */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12"><AvatarFallback>{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
            <div className="flex-1">
              <h2 className="font-bold text-lg">{lead.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {lead.email}</div>
                <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {lead.phone}</div>
                <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /> {lead.address.split(',').slice(-1)[0]?.trim()}</div>
                <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-muted-foreground" /> MPRN: <span className="font-mono">{lead.mprn}</span></div>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Confidence: <span className="capitalize ml-1 font-bold">{lead.intake.extraction_confidence}</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Bill extracted data */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Bill extraction (AI)</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">Monthly bill</div>
              <div className="text-2xl font-bold text-primary">€{lead.monthly_bill}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">Annual consumption</div>
              <div className="text-2xl font-bold">{(lead.annual_kwh || estimate.annualKwh).toLocaleString()} kWh</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">Annual spend</div>
              <div className="text-2xl font-bold">{eurFmt(lead.monthly_bill * 12)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI estimate */}
      <Card className="border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> AI estimate</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <Sun className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">System size</div>
              <div className="text-lg font-bold text-amber-600">{estimate.systemSizeKw} kWp</div>
            </div>
            <div className="text-center">
              <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Annual savings</div>
              <div className="text-lg font-bold text-primary">{eurFmt(estimate.annualSavings)}</div>
            </div>
            <div className="text-center">
              <Award className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">SEAI grant</div>
              <div className="text-lg font-bold text-primary">{eurFmt(seai.solarElectricityGrant)}</div>
            </div>
            <div className="text-center">
              <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Payback</div>
              <div className="text-lg font-bold">{estimate.paybackYears} yrs</div>
            </div>
          </div>
          <div className="mt-3 p-2 bg-background rounded text-xs grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Net cost:</span> <span className="font-bold">{eurFmt(estimate.netCost)}</span></div>
            <div><span className="text-muted-foreground">20-year savings:</span> <span className="font-bold">{eurFmt(estimate.twentyYearSavings)}</span></div>
            <div><span className="text-muted-foreground">Solar offset:</span> <span className="font-bold">{estimate.solarOffsetPct}%</span></div>
            <div><span className="text-muted-foreground">Annual production:</span> <span className="font-bold">{estimate.annualProductionKwh.toLocaleString()} kWh</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1"><Download className="h-4 w-4 mr-2" /> Download estimate</Button>
        {onOpenProposal && (
          <Button onClick={onOpenProposal} className="flex-1 bg-primary transition-colors hover:bg-primary">
            Open full proposal <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
