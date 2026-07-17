import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Battery, Zap, TrendingUp, Leaf, Euro } from 'lucide-react';

interface ProposalSummaryCardProps {
  proposal: {
    system_size_kw?: number | null;
    panel_count?: number | null;
    panel_type?: string | null;
    battery_storage?: boolean | null;
    battery_capacity_kwh?: number | null;
    system_cost?: number | null;
    seai_grant?: number | null;
    net_cost?: number | null;
    monthly_savings?: number | null;
    payback_period_years?: number | null;
    estimated_annual_production_kwh?: number | null;
  };
}

export default function ProposalSummaryCard({ proposal }: ProposalSummaryCardProps) {
  const stats = [
    {
      icon: Sun,
      label: 'System Size',
      value: proposal.system_size_kw ? `${proposal.system_size_kw} kWp` : 'TBD',
      color: 'text-amber-500 dark:text-amber-400'
    },
    {
      icon: Zap,
      label: 'Panels',
      value: proposal.panel_count ? `${proposal.panel_count} panels` : 'TBD',
      subtext: proposal.panel_type || undefined,
      color: 'text-blue-500 dark:text-blue-400'
    },
    {
      icon: Battery,
      label: 'Battery',
      value: proposal.battery_storage 
        ? `${proposal.battery_capacity_kwh || 0} kWh` 
        : 'Not included',
      color: 'text-green-500 dark:text-green-400'
    },
    {
      icon: TrendingUp,
      label: 'Annual Production',
      value: proposal.estimated_annual_production_kwh 
        ? `${proposal.estimated_annual_production_kwh.toLocaleString()} kWh`
        : 'TBD',
      color: 'text-purple-500 dark:text-purple-400'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" />
          Your Solar System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Specs */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="font-semibold">{stat.value}</p>
              {stat.subtext && (
                <p className="text-xs text-muted-foreground">{stat.subtext}</p>
              )}
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Euro className="h-4 w-4 text-primary" />
            Investment Summary
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">System Cost</span>
              <span>€{(proposal.system_cost || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span>SEAI Grant</span>
              <span>-€{(proposal.seai_grant || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Net Cost</span>
              <span className="text-primary">€{(proposal.net_cost || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Savings */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <Leaf className="h-5 w-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              €{(proposal.monthly_savings || 0).toLocaleString()}/mo
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">Estimated Savings</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {proposal.payback_period_years || '?'} years
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Payback Period</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}