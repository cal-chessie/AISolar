/**
 * Solar ROI Calculator page — thin wrapper around the reusable SolarCalculator,
 * which also embeds on the AISolar landing. Chrome (nav + footer) lives here.
 */
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingShell';
import SEOHead from '@/components/SEOHead';
import SolarCalculator from '@/components/calculator/SolarCalculator';

export default function ROICalculator() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SEOHead
        title="Solar ROI Calculator Ireland | Free Savings Estimate — AISOLAR"
        description="Play with your numbers and watch your solar payback build in real time. Draw your roof, size the system, and get an instant estimate on Irish energy rates + the SEAI grant."
      />
      <MarketingNav product="aisolar" />
      <SolarCalculator />
      <MarketingFooter product="aisolar" />
    </div>
  );
}
