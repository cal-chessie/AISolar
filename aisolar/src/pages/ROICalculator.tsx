/**
 * E. Solar ROI Calculator — public page for SEO + lead capture.
 *
 * No bill upload needed. Customer enters:
 *   - Monthly bill (slider)
 *   - County (dropdown)
 *   - Roof orientation (4 buttons)
 * Get instant estimate + CTA to upload bill for detailed analysis.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sun, TrendingUp, Zap, Award, ArrowRight, Calculator, MapPin } from 'lucide-react';
import { calculateSystemEstimate } from '@/lib/leadIntake';
import { calculateSEAI, eur } from '@/lib/seaiPipeline';
import SiteNavigation from '@/components/layout/SiteNavigation';
import SEOHead from '@/components/SEOHead';
import { brand } from '@/config/brand';

export default function ROICalculator() {
  const navigate = useNavigate();
  const [monthlyBill, setMonthlyBill] = useState(250);
  const [county, setCounty] = useState('Dublin');
  const [orientation, setOrientation] = useState<'south' | 'east' | 'west' | 'north'>('south');

  const estimate = useMemo(() => calculateSystemEstimate({ monthlyBill }), [monthlyBill]);
  const seai = useMemo(() => calculateSEAI({
    systemSizeKw: estimate.systemSizeKw,
    propertyType: 'domestic',
    installType: 'retrofit',
    annualKwhUsage: estimate.annualKwh,
    annualProductionKwh: estimate.annualProductionKwh,
    selfConsumptionPct: 0.7,
    netCost: estimate.netCost,
  }), [estimate]);

  const orientationMultiplier = orientation === 'south' ? 1 : orientation === 'east' || orientation === 'west' ? 0.85 : 0.65;
  const adjustedSavings = Math.round(estimate.annualSavings * orientationMultiplier);

  return (
    <>
      <SEOHead
        title="Solar ROI Calculator Ireland | Free Savings Estimate — AISOLAR"
        description="Calculate your solar savings in 30 seconds. Enter your monthly bill and roof orientation. Get instant estimate of system size, savings, SEAI grant, and payback period."
      />
      <SiteNavigation />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40 mb-3">
            <Calculator className="h-3 w-3 mr-1" /> Free · No signup
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Solar Savings Calculator</h1>
          <p className="text-muted-foreground">See how much you could save with solar. Instant estimate based on Irish energy rates + SEAI grants.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Monthly bill slider */}
              <div>
                <label className="text-sm font-semibold flex items-center justify-between mb-2">
                  <span>Monthly electricity bill</span>
                  <span className="text-2xl font-bold text-primary">€{monthlyBill}</span>
                </label>
                <input
                  type="range" min="80" max="600" step="10"
                  value={monthlyBill}
                  onChange={e => setMonthlyBill(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>€80</span><span>€300</span><span>€600+</span>
                </div>
              </div>

              {/* County */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Your county</label>
                <select value={county} onChange={e => setCounty(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {['Dublin','Cork','Galway','Limerick','Waterford','Kildare','Meath','Wicklow','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Roof orientation</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['south','east','west','north'] as const).map(dir => (
                    <button
                      key={dir}
                      onClick={() => setOrientation(dir)}
                      className={`p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                        orientation === dir ? 'border-primary/40 bg-primary/10 dark:bg-primary/10' : 'border-border'
                      }`}
                    >
                      <Sun className={`h-4 w-4 mx-auto mb-1 ${orientation === dir ? 'text-primary' : 'text-muted-foreground'}`} />
                      {dir.charAt(0).toUpperCase() + dir.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4">Your estimate</h3>
              <div className="space-y-3">
                <ResultRow icon={Sun} label="Recommended system" value={`${estimate.systemSizeKw} kWp`} color="amber" />
                <ResultRow icon={TrendingUp} label="Annual savings" value={eur(adjustedSavings)} color="emerald" />
                <ResultRow icon={Award} label="SEAI grant" value={eur(seai.solarElectricityGrant)} color="violet" />
                <ResultRow icon={Calculator} label="Net cost" value={eur(estimate.netCost)} color="blue" />
                <ResultRow icon={Zap} label="Payback period" value={`${estimate.paybackYears} years`} color="amber" />
                <ResultRow icon={TrendingUp} label="20-year savings" value={eur(estimate.twentyYearSavings)} color="emerald" />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 p-3 bg-background rounded-lg border"
              >
                <p className="text-xs text-muted-foreground mb-2">Want a detailed proposal with your exact roof?</p>
                <Button onClick={() => navigate('/upload')} className="w-full bg-primary hover:bg-primary">
                  Upload bill for full analysis <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Estimates based on Irish retail rate €0.35/kWh, SEAI grant €900/kWp (max €1,800), 70% self-consumption.
          Actual savings vary with roof, shading, and usage patterns.
        </p>
      </div>
    </>
  );
}

function ResultRow({ icon: Icon, label, value, color }: { icon: typeof Sun; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-background/60 rounded-lg">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded bg-primary/10 dark:bg-primary/10`}>
          <Icon className={`h-3 w-3 text-primary dark:text-primary`} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}
