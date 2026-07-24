/**
 * SEAI Grant Pipeline
 *
 * The single source of truth for SEAI grant calculation + all Irish solar incentives.
 * Used by:
 *   - Proposal Drafter Agent (auto-calculates grant when drafting)
 *   - Proposal editor (consultant sees real-time grant update)
 *   - Customer portal (shows grant status + paperwork progress)
 *   - SEAI Grant Agent (compiles submission pack from this data)
 *
 * Sources:
 *   - SEAI Solar Electricity Grant (residential): €900/kWp, max €1,800 (2kWp+)
 *   - Microgen Export Plan (export tariff): €0.14/kWh (2026 rate, ESB Networks)
 *   - BER uplift: €300 if post-works BER ≥ B3
 *   - Home Energy Upgrade Loan (HEUL): low-interest loan via SBCI/credit unions
 *
 * For commercial: SEAI Non-Domestic Microgen Grant (NDMG) — different tiers.
 */

export type PropertyType = 'domestic' | 'commercial';
export type InstallType = 'retrofit' | 'new_build';

export interface SEAIInput {
  // From lead_intake.extracted_* + confirmed_* + finalized_*
  systemSizeKw: number;
  propertyType: PropertyType;
  installType: InstallType;
  annualKwhUsage: number;          // from bill extract
  annualProductionKwh: number;     // from system design
  selfConsumptionPct: number;      // 0-1, typically 0.7
  netCost: number;                 // after grant, before tax
  batteryCapacityKwh?: number;
  county?: string;                 // for any regional incentives
  // Survey-confirmed
  roofOrientation?: string;
  shading?: 'none' | 'light' | 'moderate' | 'heavy';
  // BER data
  berRating?: string;              // 'A1', 'B3', 'C1', etc.
}

export interface SEAIOutput {
  // SEAI Solar Electricity Grant
  solarElectricityGrant: number;
  solarElectricityGrantRate: number;   // €/kWp
  solarElectricityGrantMax: number;
  // Export tariff (annual value)
  microgenExportAnnualValue: number;
  microgenExportRate: number;          // €/kWh
  exportedKwhPerYear: number;
  // BER uplift (if applicable)
  berUplift: number;
  // HEUL loan eligibility
  heulEligible: boolean;
  heulLoanAmount: number;
  heulInterestRate: number;
  // Total incentives
  totalGrants: number;
  totalAnnualIncentives: number;       // grants + annual export value
  // Net investment after all incentives
  netInvestmentAfterIncentives: number;
  // 20-year financial picture
  twentyYearSavings: number;
  twentyYearIncentives: number;
  // Paperwork status (for SEAI Grant Agent)
  paperworkRequired: SEAIPaperworkItem[];
  paperworkProgress: number;           // 0-100
}

export interface SEAIPaperworkItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  status: 'missing' | 'pending' | 'ready' | 'submitted';
  source: string;                      // which field in lead_intake provides this
}

// 2026 SEAI rates (Ireland)
export const SEAI_RATES = {
  DOMESTIC: {
    grantPerKwp: 900,
    grantMax: 1800,
    grantMaxKwp: 2,           // grant caps at 2 kWp equivalent
    berUplift: 300,
    berThreshold: 'B3',
  },
  COMMERCIAL: {
    // Non-Domestic Microgen Grant (NDMG) — simplified tiers
    tiers: [
      { maxKwp: 6, grant: 2500 },
      { maxKwp: 10, grant: 3500 },
      { maxKwp: 20, grant: 5500 },
      { maxKwp: 50, grant: 12000 },
      { maxKwp: 1000, grant: 25000 },
    ],
  },
  // ESB Networks microgen export tariff (2026)
  EXPORT_RATE: 0.14,           // €/kWh
  // HEUL loan
  HEUL: {
    maxLoanAmount: 25000,
    interestRate: 0.039,        // 3.9% APR (SBCI subsidised)
    maxTermYears: 10,
  },
  // Tax
  VAT_SOLAR: 0.13,             // 13% VAT on solar installations (Ireland)
} as const;

/**
 * Calculate the full SEAI grant + incentives picture for a proposal.
 * Single source of truth — used everywhere grant numbers are shown.
 */
export function calculateSEAI(input: SEAIInput): SEAIOutput {
  // 1. SEAI Solar Electricity Grant
  let solarElectricityGrant = 0;
  let solarElectricityGrantRate = 0;
  let solarElectricityGrantMax = 0;

  if (input.propertyType === 'domestic') {
    solarElectricityGrantRate = SEAI_RATES.DOMESTIC.grantPerKwp;
    solarElectricityGrantMax = SEAI_RATES.DOMESTIC.grantMax;
    solarElectricityGrant = Math.min(
      solarElectricityGrantMax,
      Math.min(input.systemSizeKw, SEAI_RATES.DOMESTIC.grantMaxKwp) * solarElectricityGrantRate
    );
  } else {
    // Commercial: find the right tier
    const tier = SEAI_RATES.COMMERCIAL.tiers.find(t => input.systemSizeKw <= t.maxKwp)
      ?? SEAI_RATES.COMMERCIAL.tiers[SEAI_RATES.COMMERCIAL.tiers.length - 1];
    solarElectricityGrant = tier.grant;
    solarElectricityGrantMax = tier.grant;
  }

  // 2. Microgen export tariff (annual value)
  const selfConsumedKwh = input.annualProductionKwh * input.selfConsumptionPct;
  const exportedKwhPerYear = Math.max(0, input.annualProductionKwh - selfConsumedKwh);
  const microgenExportRate = SEAI_RATES.EXPORT_RATE;
  const microgenExportAnnualValue = Math.round(exportedKwhPerYear * microgenExportRate);

  // 3. BER uplift (domestic only, if post-works BER is B3 or better)
  let berUplift = 0;
  if (input.propertyType === 'domestic' && input.berRating) {
    const ratingOrder = ['A1','A2','A3','B1','B2','B3','C1','C2','C3','D1','D2','E1','E2','F','G'];
    const berIdx = ratingOrder.indexOf(input.berRating);
    const thresholdIdx = ratingOrder.indexOf(SEAI_RATES.DOMESTIC.berThreshold);
    if (berIdx >= 0 && berIdx <= thresholdIdx) {
      berUplift = SEAI_RATES.DOMESTIC.berUplift;
    }
  }

  // 4. HEUL loan eligibility (domestic retrofit only, net cost > €5k)
  const heulEligible = input.propertyType === 'domestic'
    && input.installType === 'retrofit'
    && input.netCost > 5000;
  const heulLoanAmount = heulEligible
    ? Math.min(SEAI_RATES.HEUL.maxLoanAmount, input.netCost)
    : 0;
  const heulInterestRate = SEAI_RATES.HEUL.interestRate;

  // 5. Totals
  const totalGrants = solarElectricityGrant + berUplift;
  const totalAnnualIncentives = totalGrants + microgenExportAnnualValue;
  const netInvestmentAfterIncentives = input.netCost - totalGrants;

  // 6. 20-year picture
  // Annual savings = self-consumed kWh × retail rate + export × export rate
  // (Retail rate not passed in — use SEAI standard 0.35 €/kWh)
  const RETAIL_RATE = 0.35;
  const annualSelfConsumptionValue = selfConsumedKwh * RETAIL_RATE;
  const annualSavings = annualSelfConsumptionValue + microgenExportAnnualValue;
  const twentyYearSavings = Math.round((annualSavings * 20) - netInvestmentAfterIncentives);
  const twentyYearIncentives = totalGrants + (microgenExportAnnualValue * 20);

  // 7. Paperwork checklist (for SEAI Grant Agent)
  const paperworkRequired: SEAIPaperworkItem[] = [
    {
      id: 'mpan_mprn',
      label: 'MPRN verification',
      description: '11-digit Meter Point Reference Number from customer bill',
      required: true,
      status: 'pending',
      source: 'lead_intake.extracted_mprn',
    },
    {
      id: 'ber_cert',
      label: 'BER Certificate (post-works)',
      description: 'Building Energy Rating certificate showing B3 or better (for €300 uplift)',
      required: berUplift > 0,
      status: 'missing',
      source: 'site_surveys.ber_rating',
    },
    {
      id: 'invoice',
      label: 'Final tax invoice',
      description: 'VAT-compliant invoice from installer (13% VAT on solar)',
      required: true,
      status: 'pending',
      source: 'invoices.invoice_number',
    },
    {
      id: 'install_photos',
      label: 'Installation photos',
      description: 'Photos of completed install (panels, inverter, meter)',
      required: true,
      status: 'pending',
      source: 'installation_photos',
    },
    {
      id: 'commissioning_cert',
      label: 'Commissioning certificate',
      description: 'RECI-signed commissioning cert + Safe Electric Ireland registration',
      required: true,
      status: 'pending',
      source: 'installation_checklists.reci_signed',
    },
    {
      id: 'esb_connection',
      label: 'ESB Networks connection agreement',
      description: 'NC6 form confirmation (microgen export setup)',
      required: true,
      status: 'missing',
      source: 'esb_connection',
    },
    {
      id: 'planning_exemption',
      label: 'Planning exemption confirmation',
      description: 'Confirmation that install qualifies for exempted development (≤12 kWp domestic, rear roof, etc.)',
      required: input.systemSizeKw > 6,
      status: 'pending',
      source: 'site_surveys.planning_status',
    },
  ];

  const completedItems = paperworkRequired.filter(p => p.status === 'ready' || p.status === 'submitted').length;
  const requiredItems = paperworkRequired.filter(p => p.required).length;
  const paperworkProgress = Math.round((completedItems / requiredItems) * 100);

  return {
    solarElectricityGrant,
    solarElectricityGrantRate,
    solarElectricityGrantMax,
    microgenExportAnnualValue,
    microgenExportRate,
    exportedKwhPerYear: Math.round(exportedKwhPerYear),
    berUplift,
    heulEligible,
    heulLoanAmount,
    heulInterestRate,
    totalGrants,
    totalAnnualIncentives,
    netInvestmentAfterIncentives,
    twentyYearSavings,
    twentyYearIncentives,
    paperworkRequired,
    paperworkProgress,
  };
}

/**
 * Generate the SEAI application pack as a structured object.
 * The SEAI Grant Agent calls this, then renders to PDF and emails to
 * solarpvgrants@seai.ie (no API — manual portal submission).
 */
export function buildSEAIApplicationPack(
  input: SEAIInput,
  customer: { name: string; email: string; phone: string; address: string; mprn: string },
  installer: { name: string; reciNumber: string; seaiNumber: string },
  seai: SEAIOutput,
) {
  return {
    applicationDate: new Date().toISOString(),
    customer,
    installer,
    property: {
      type: input.propertyType,
      installType: input.installType,
      address: customer.address,
      mprn: customer.mprn,
      county: input.county,
      berRating: input.berRating,
    },
    system: {
      systemSizeKw: input.systemSizeKw,
      annualProductionKwh: input.annualProductionKwh,
      selfConsumptionPct: input.selfConsumptionPct,
      batteryCapacityKwh: input.batteryCapacityKwh,
      roofOrientation: input.roofOrientation,
      shading: input.shading,
    },
    financials: {
      netCost: input.netCost,
      solarElectricityGrant: seai.solarElectricityGrant,
      berUplift: seai.berUplift,
      netInvestmentAfterIncentives: seai.netInvestmentAfterIncentives,
      annualExportValue: seai.microgenExportAnnualValue,
      twentyYearSavings: seai.twentyYearSavings,
    },
    paperwork: seai.paperworkRequired,
    paperworkProgress: seai.paperworkProgress,
    declaration: {
      customerConsent: true,
      installerAttestation: true,
      seaiTermsAccepted: true,
    },
  };
}

/** Format EUR for display. */
export const eur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);


/* ── Grants engine (Cal: commercial + domestic + EV) ─────────────────────────
   RATES ARE A VERSIONED TABLE, marked INDICATIVE everywhere they render —
   SEAI publishes changes; the number is confirmed at application, never
   promised. Sources on record: seai.ie business-grants/commercial-solar-pv   (Jul 2026 search). */

/** SEAI Non-Domestic Microgen Grant — piecewise per kWp, hard cap €162,600.
 *  €900/kWp→2 · €300→20 · €200→200 · €150→1000. */
export function calculateNDMG(kwp: number): number {
  if (kwp < 1) return 0;
  let g = 0;
  g += Math.min(kwp, 2) * 900;
  if (kwp > 2) g += (Math.min(kwp, 20) - 2) * 300;
  if (kwp > 20) g += (Math.min(kwp, 200) - 20) * 200;
  if (kwp > 200) g += (Math.min(kwp, 1000) - 200) * 150;
  return Math.min(Math.round(g), 162600);
}

/** ZEVI workplace charger grant: 60% of eligible cost, capped €5,000/point. */
export function calculateZEVIWorkplace(totalCost: number, chargePoints: number): number {
  return Math.round(Math.min(totalCost * 0.6, chargePoints * 5000));
}

/** SEAI EV Home Charger Grant — fixed. No ESB form exists for chargers
 *  (they are load, not generation): domestic = RECI cert only; commercial =
 *  LCT register note. */
export const EV_HOME_CHARGER_GRANT = 300;
