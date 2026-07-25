/**
 * proposalNarrative — turns the money into the sentence that lands.
 *
 * A grid of four figures is a fact sheet. The WOW is the reframe: what it means
 * per month, how much of their current bill it erases, the free-power years
 * after payback, and the plain "you are ahead of doing nothing" over 20 years.
 * One function so the consultant's proposal and the homeowner's copy say the
 * exact same thing — the consultant reads out what the customer will read.
 *
 * Every input is already computed off the customer's own bill + occupancy, so
 * nothing here invents a number; it only articulates the ones we hold.
 */
const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export interface MoneyStoryInput {
  annualSavings: number;
  netCost: number;
  paybackYears: number;
  twentyYearBenefit: number;
  monthlyBill?: number | null;
  /** panel performance warranty — the honest floor for "free" years */
  warrantyYears?: number;
}

/**
 * The money story, in the homeowner's own second person. Returns two short
 * paragraphs: the felt monthly/yearly saving, then the long game.
 */
export function moneyStory(i: MoneyStoryInput): { lead: string; horizon: string } {
  const monthly = Math.max(0, Math.round(i.annualSavings / 12));
  const warranty = i.warrantyYears ?? 25;
  const freeYears = Math.max(0, Math.round(warranty - i.paybackYears));
  const billPct = i.monthlyBill && i.monthlyBill > 0
    ? Math.round((i.annualSavings / (i.monthlyBill * 12)) * 100)
    : null;

  const lead = billPct
    ? `About ${eur(monthly)} a month back in your pocket, ${eur(i.annualSavings)} across the year. That is close to ${billPct}% of what you spend on electricity today, made by your own roof instead of bought from the grid.`
    : `About ${eur(monthly)} a month back in your pocket, ${eur(i.annualSavings)} across the year, made by your own roof instead of bought from the grid.`;

  const horizon = `The system pays for itself in ${i.paybackYears} years. The ${freeYears}+ years after that are power you would otherwise keep buying, so twenty years in you are ${eur(i.twentyYearBenefit)} ahead of doing nothing.`;

  return { lead, horizon };
}
