/**
 * Estimates View — all leads' AI estimates in one place.
 *
 * Shows every lead with their bill-extracted estimate:
 *   - Monthly bill, annual kWh, MPRN
 *   - Estimated system size, annual savings, SEAI grant, payback
 *   - Click any lead → opens the LeadDetailView
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Calculator, Search, Sun, TrendingUp, Award, Clock, Zap,
  ChevronRight, Download, FileText,
} from 'lucide-react';
import { type DummyLead } from '@/lib/dummyData';
import { calculateSystemEstimate, getStage } from '@/lib/leadIntake';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function EstimatesView({ leads, onSelectLead }: { leads: DummyLead[]; onSelectLead: (lead: DummyLead) => void }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'bill' | 'savings' | 'payback' | 'score'>('savings');

  const estimates = useMemo(() => {
    return leads.map(lead => {
      const estimate = calculateSystemEstimate({
        monthlyBill: lead.monthly_bill,
        annualKwh: lead.annual_kwh,
      });
      return { lead, estimate };
    }).filter(({ lead }) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.address.toLowerCase().includes(q) ||
        lead.mprn.includes(q);
    }).sort((a, b) => {
      if (sortBy === 'bill') return b.lead.monthly_bill - a.lead.monthly_bill;
      if (sortBy === 'savings') return b.estimate.annualSavings - a.estimate.annualSavings;
      if (sortBy === 'payback') return a.estimate.paybackYears - b.estimate.paybackYears;
      if (sortBy === 'score') return b.lead.score - a.lead.score;
      return 0;
    });
  }, [leads, search, sortBy]);

  const totals = useMemo(() => {
    const totalSavings = estimates.reduce((s, e) => s + e.estimate.annualSavings, 0);
    const totalGrant = estimates.length * 1800;
    const avgSystem = estimates.length > 0
      ? estimates.reduce((s, e) => s + e.estimate.systemSizeKw, 0) / estimates.length
      : 0;
    const avgPayback = estimates.length > 0
      ? (estimates.reduce((s, e) => s + e.estimate.paybackYears, 0) / estimates.length).toFixed(1)
      : '0';
    return { totalSavings, totalGrant, avgSystem, avgPayback, count: estimates.length };
  }, [estimates]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Estimates</h2>
        <Button variant="outline" size="sm"><Download className="h-3 w-3 mr-1" /> Export CSV</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Total leads</div>
          <div className="text-xl font-bold">{totals.count}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Avg system size</div>
          <div className="text-xl font-bold text-amber-600">{totals.avgSystem.toFixed(1)} kWp</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Total annual savings</div>
          <div className="text-xl font-bold text-primary">{eur(totals.totalSavings)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Avg payback</div>
          <div className="text-xl font-bold">{totals.avgPayback} yrs</div>
        </CardContent></Card>
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
        </div>
        <div className="flex gap-1">
          {(['savings', 'bill', 'payback', 'score'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-2 py-1 rounded text-[11px] font-medium capitalize ${sortBy === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Estimate cards */}
      <div className="space-y-2">
        {estimates.map(({ lead, estimate }) => {
          const stage = getStage(lead.workflow_stage);
          return (
            <Card key={lead.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onSelectLead(lead)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{lead.name}</span>
                      {lead.score > 80 && <Badge className="text-[11px] h-3.5 px-1 bg-red-500 text-white">Hot</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{lead.address.split(',').slice(-1)[0]?.trim()} · MPRN: {lead.mprn}</div>
                  </div>
                  <Badge variant="outline" className={`text-[11px] bg-primary/10 text-primary border-primary/40`}>{stage.label}</Badge>
                </div>

                {/* Estimate grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
                  <div className="text-center p-1.5 bg-muted/30 rounded">
                    <div className="text-[11px] text-muted-foreground">Bill/mo</div>
                    <div className="text-sm font-bold">€{lead.monthly_bill}</div>
                  </div>
                  <div className="text-center p-1.5 bg-muted/30 rounded">
                    <div className="text-[11px] text-muted-foreground">kWh/yr</div>
                    <div className="text-sm font-bold">{(lead.annual_kwh || estimate.annualKwh).toLocaleString()}</div>
                  </div>
                  <div className="text-center p-1.5 bg-amber-50 dark:bg-amber-950/20 rounded">
                    <div className="text-[11px] text-muted-foreground">System</div>
                    <div className="text-sm font-bold text-amber-600">{estimate.systemSizeKw}kWp</div>
                  </div>
                  <div className="text-center p-1.5 bg-primary/10 dark:bg-primary/10 rounded">
                    <div className="text-[11px] text-muted-foreground">Savings/yr</div>
                    <div className="text-sm font-bold text-primary">{eur(estimate.annualSavings)}</div>
                  </div>
                  <div className="text-center p-1.5 bg-primary/10 dark:bg-primary/10 rounded">
                    <div className="text-[11px] text-muted-foreground">SEAI grant</div>
                    <div className="text-sm font-bold text-primary">{eur(1800)}</div>
                  </div>
                  <div className="text-center p-1.5 bg-muted/30 rounded">
                    <div className="text-[11px] text-muted-foreground">Payback</div>
                    <div className="text-sm font-bold">{estimate.paybackYears}y</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <div className="text-[11px] text-muted-foreground">
                    Net cost: {eur(estimate.netCost)} · 20yr savings: {eur(estimate.twentyYearSavings)} · Offset: {estimate.solarOffsetPct}%
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 text-xs">
                    Open <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
