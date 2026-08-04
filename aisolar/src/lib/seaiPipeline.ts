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
 *   - SEAI Solar Electricity Grant (domestic): €700/kWp for the first 2 kWp,
 *     then €200/kWp to 4 kWp — max €1,800 (unchanged for 2026, confirmed seai.ie)
 *   - Microgen Export Plan (export tariff): €0.14/kWh (2026 rate, ESB Networks)
 *   - Post-works BER: a CONDITION of the domestic grant (SEAI won't pay until
 *     it's published) — NOT a €300 uplift; no such bonus exists
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
    grantPerKwp: 700,         // headline rate for the first 2 kWp; see domesticSolarGrant() for the tiers
    grantMax: 1800,
    grantMaxKwp: 4,           // cap is reached at 4 kWp
    // NOTE: no €300 "BER uplift" exists in the current grant — a post-works BER
    // is a REQUIREMENT to claim, not extra money. Removed from the amount.
  },
  // Commercial (Non-Domestic Microgen) grant lives in calculateNDMG() — the one
  // formula. The old fixed-tier table (cap €25k) was wrong and is deleted.
  // ESB Networks microgen export tariff (2026)
  EXPORT_RATE: 0.14,           // €/kWh
  // HEUL loan
  HEUL: {
    maxLoanAmount: 25000,
    interestRate: 0.039,        // 3.9% APR (SBCI subsidised)
    maxTermYears: 10,
  },
  // Tax
  VAT_SOLAR: 0,                // DOMESTIC solar is 0% VAT since 1 May 2023 (gov.ie / revenue.ie). Commercial differs.
} as const;

/** Commercial solar VAT — applied to the system cost in the maths (not just the
 *  invoice description string, which already said 13%). Matches that copy so the
 *  app is internally consistent; TENANT-CONFIG: confirm the exact reduced rate
 *  with the tenant's accountant at onboarding. Grant amounts are ex-VAT. */
export const VAT_COMMERCIAL = 0.13;

/**
 * CEG (Clean Export Guarantee) — the feed-in tariff per exported kWh, which
 * VARIES BY SUPPLIER. The bill read gives us the supplier (extracted_provider),
 * so export income uses THEIR rate, not a flat number. TENANT-CONFIG table:
 * indicative 2026 values, verified against each supplier's published tariff
 * sheet at onboarding — rates change; the fallback is the conservative ESB
 * baseline EXPORT_RATE (0.14) already used across the app.
 */
export const CEG_RATES: Record<string, number> = {
  'pinergy': 0.20,
  'electric ireland': 0.195,
  'bord gais': 0.185,
  'bord gáis': 0.185,
  'sse': 0.20,
  'sse airtricity': 0.20,
  'energia': 0.18,
  'flogas': 0.185,
};

/** Supplier → CEG €/kWh, falling back to the conservative ESB baseline. */
export function cegRate(provider?: string | null): number {
  if (!provider) return SEAI_RATES.EXPORT_RATE;
  const key = provider.trim().toLowerCase();
  const hit = Object.keys(CEG_RATES).find(k => key.includes(k));
  return hit ? CEG_RATES[hit] : SEAI_RATES.EXPORT_RATE;
}

/**
 * SEAI Solar Electricity Grant — DOMESTIC. THE one function; import it everywhere.
 * Verified Jul 2026 vs seai.ie / citizensinformation.ie:
 *   €700/kWp for the first 2 kWp, €200/kWp for 2–4 kWp, capped €1,800 (at 4 kWp).
 * (Was wrongly modelled as flat €900/kWp cap €1,800, which overstated small systems.)
 */
/**
 * Map a survey/intake building-type string to the SEAI property type, so the
 * "What kind of building is this?" answer actually drives the grant:
 *   residential / home  → domestic  (tiered €700/€200, cap €1,800)
 *   commercial / farm / industrial → commercial (NDMG, cap €162,600)
 * A 12 kWp domestic install caps at €1,800; the same 12 kWp commercial is ~€4,800.
 */
export function seaiPropertyType(raw?: string | null): PropertyType {
  return /commercial|industrial|farm|non.?domestic|business/i.test(raw ?? '') ? 'commercial' : 'domestic';
}

export interface SEAIGrantEligibility {
  /** false = a hard disqualifier is present (grant cannot be claimed). */
  eligible: boolean;
  /** Hard disqualifiers — the customer is NOT eligible while any of these hold. */
  blockers: string[];
  /** Conditions still to satisfy before payment (not disqualifiers). */
  conditions: string[];
}

/**
 * SEAI DOMESTIC Solar Electricity Grant eligibility (seai.ie, 2026):
 *   • home built AND occupied BEFORE 2021 (new builds meet solar via building
 *     regs, not this grant),
 *   • the property has an MPRN,
 *   • no previous SEAI solar PV funding at that MPRN.
 * Commercial NDMG is a different scheme with its own rules — not gated here.
 *
 * Standalone on purpose: any surface (proposal, DoW, grant agent) can call it
 * with the facts it holds without threading new fields through calculateSEAI.
 * The grant is never promised as certain while `eligible` is false.
 */
export function seaiGrantEligibility(args: {
  propertyType: PropertyType;
  installType?: InstallType;
  yearBuilt?: number | string | null;
  mprn?: string | null;
}): SEAIGrantEligibility {
  if (args.propertyType !== 'domestic') {
    return {
      eligible: true,
      blockers: [],
      conditions: ['Commercial NDMG — eligibility per the Non-Domestic Microgen scheme, not the domestic gate'],
    };
  }
  const blockers: string[] = [];
  const year = typeof args.yearBuilt === 'string' ? parseInt(args.yearBuilt, 10) : args.yearBuilt;
  if (args.installType === 'new_build') {
    blockers.push('New build — the grant is for homes built & occupied before 2021 (new builds meet solar via building regs, not this grant)');
  }
  if (typeof year === 'number' && Number.isFinite(year) && year >= 2021) {
    blockers.push(`Built ${year} — the home must have been built & occupied before 2021`);
  }
  if (!args.mprn || !String(args.mprn).trim()) {
    blockers.push('No MPRN on file — the meter point must exist to claim');
  }
  return {
    eligible: blockers.length === 0,
    blockers,
    conditions: [
      'Post-works BER published by a registered assessor (SEAI pays only after this)',
      'No previous SEAI solar PV funding claimed at this MPRN',
    ],
  };
}

export function domesticSolarGrant(kwp: number): number {
  const g = Math.min(kwp, 2) * 700 + Math.max(0, Math.min(kwp, 4) - 2) * 200;
  return Math.min(Math.round(g), 1800);
}

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
    solarElectricityGrantRate = SEAI_RATES.DOMESTIC.grantPerKwp;   // headline rate (first 2 kWp)
    solarElectricityGrantMax = SEAI_RATES.DOMESTIC.grantMax;
    solarElectricityGrant = domesticSolarGrant(input.systemSizeKw); // tiered €700/€200, cap €1,800
  } else {
    // Commercial: SEAI Non-Domestic Microgen — ONE formula, shared with the
    // compliance window (was a separate, wrong tier table that disagreed).
    solarElectricityGrant = calculateNDMG(input.systemSizeKw);
    solarElectricityGrantMax = 162600;
  }

  // 2. Microgen export tariff (annual value)
  const selfConsumedKwh = input.annualProductionKwh * input.selfConsumptionPct;
  const exportedKwhPerYear = Math.max(0, input.annualProductionKwh - selfConsumedKwh);
  const microgenExportRate = SEAI_RATES.EXPORT_RATE;
  const microgenExportAnnualValue = Math.round(exportedKwhPerYear * microgenExportRate);

  // 3. BER uplift — there is NO €300 BER bonus in the current SEAI grant. A
  // post-works BER is a REQUIREMENT to claim, not extra money. Always 0; the
  // field is kept so consumers don't break.
  const berUplift = 0;

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
      // A post-works BER by a registered assessor is a hard CONDITION of the
      // domestic grant — SEAI won't pay until it's published. It is NOT a €300
      // uplift (no such uplift exists). Not part of the commercial NDMG scheme.
      description: 'Post-works BER by a registered assessor — SEAI pays the grant only once it is published',
      required: input.propertyType === 'domestic',
      status: 'missing',
      source: 'site_surveys.ber_rating',
    },
    {
      id: 'invoice',
      label: 'Final tax invoice',
      // Domestic solar is 0% VAT (since 1 May 2023); commercial is the 13%
      // reduced rate. Never tell a homeowner they were charged 13%.
      description: input.propertyType === 'domestic'
        ? 'VAT-compliant final invoice from the installer (domestic solar is 0% VAT)'
        : 'VAT-compliant final invoice from the installer (commercial solar at 13% VAT)',
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
      // NC6 is a NOTIFICATION (≤6kW single / ≤11kW three-phase); above that it's
      // an NC7 APPLICATION energised only after ESB's offer. Don't hardcode NC6.
      description: input.systemSizeKw > 6
        ? 'ESB microgen connection — NC7 application (over 6kW single / 11kW three-phase) or NC6 if within band'
        : 'ESB microgen connection — NC6 notification (microgen export setup)',
      required: true,
      status: 'missing',
      source: 'esb_connection',
    },
    {
      id: 'planning_exemption',
      label: 'Planning exemption confirmation',
      // Domestic rooftop solar is EXEMPT regardless of size since Oct 2022
      // (SI 493/2022) — the old 12 m² / 50%-roof caps are gone. Only caveats:
      // the 15cm projection + ridge-line limits, and Solar Safeguarding Zones
      // near airports. Non-domestic still has area limits, so it can need it.
      description: input.propertyType === 'domestic'
        ? 'Domestic rooftop is exempt regardless of size (SI 493/2022) — confirm only projection/ridge limits + not in a Solar Safeguarding Zone (near airports)'
        : 'Confirm non-domestic rooftop stays within exempted-development limits, else planning permission is required',
      required: input.propertyType !== 'domestic' && input.systemSizeKw > 6,
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
