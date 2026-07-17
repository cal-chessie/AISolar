// ============================================================
// AISolar Estimate Engine — ONE SOURCE OF TRUTH for the number
// Pure TypeScript. No dependencies. Used by: widget, app,
// proposal engine, Solar Coach, VPP projections.
// ============================================================

// ---------- Types ----------

export interface EstimateInputs {
  /** €/month from bill or manual entry (optional — annualKwh can be supplied instead) */
  monthlyBill?: number;
  /** Actual annual consumption from the bill if extracted (kWh) */
  annualKwh?: number | null;
  /** Specific yield for the location (kWh per kWp per year). From PVGIS live or county fallback. */
  specificYield?: number | null;
  /** Irish county (used for fallback yield if no PVGIS value supplied) */
  county?: string | null;
  /** Whether a battery is included in the system */
  includeBattery?: boolean;
  /** Usable roof capacity cap in kWp, if known (from survey / Google Solar later) */
  roofCapKwp?: number | null;
  /** Override any assumptions (tariffs, costs, SEAI tiers) */
  config?: Partial<EstimateConfig>;
}

export interface EstimateConfig {
  /** Retail electricity rate €/kWh */
  retailRate: number;
  /** Clean Export Guarantee rate €/kWh (export income) */
  exportRate: number;
  /** Installed cost €/kWp before grant (panels+inverter+install) */
  costPerKwp: number;
  /** Additional battery cost € (if includeBattery) */
  batteryCost: number;
  /** Self-consumption ratio WITHOUT battery (0–1) */
  selfConsumptionNoBattery: number;
  /** Self-consumption ratio WITH battery (0–1) */
  selfConsumptionWithBattery: number;
  /** Panel degradation per year (0.005 = 0.5%) */
  degradationPerYear: number;
  /** Electricity price inflation per year (0.02 = 2%) */
  priceInflationPerYear: number;
  /** Year the inverter is replaced */
  inverterReplacementYear: number;
  /** Inverter replacement cost € */
  inverterReplacementCost: number;
  /** Projection horizon in years */
  horizonYears: number;
  /** Min/max system size bounds kWp */
  minSystemKwp: number;
  maxSystemKwp: number;
  /** SEAI grant tiers: € per kWp for each band. Order matters. */
  seaiTiers: Array<{ uptoKwp: number; ratePerKwp: number }>;
  /** SEAI grant absolute cap € */
  seaiCap: number;
  /** Fallback specific yield if none supplied and county unknown */
  defaultSpecificYield: number;
}

export interface YearCashflow {
  year: number;
  production: number;       // kWh
  selfConsumedValue: number; // €
  exportValue: number;       // €
  outgoings: number;         // € (inverter replacement etc.)
  netCashflow: number;       // €
  cumulative: number;        // €
}

export interface EstimateResult {
  // Headline numbers
  systemSizeKwp: number;
  systemCostGross: number;      // before grant
  seaiGrant: number;
  systemCostNet: number;        // after grant
  annualProductionKwh: number;  // year 1
  annualSavings: number;        // year 1 (self-consumption + export)
  annualSelfConsumptionSavings: number;
  annualExportIncome: number;
  solarOffsetPct: number;       // % of consumption covered
  paybackYears: number | null;  // null = doesn't pay back within horizon
  lifetimeSavings: number;      // net of costs over horizon
  co2SavedTonnesPerYear: number;
  // Transparency (what the coach/proposal can explain)
  assumptions: {
    specificYield: number;
    yieldSource: "pvgis" | "county-fallback" | "default";
    retailRate: number;
    exportRate: number;
    selfConsumption: number;
    annualKwhUsed: number;
    annualKwhSource: "bill" | "estimated-from-spend";
    degradationPerYear: number;
    priceInflationPerYear: number;
    horizonYears: number;
  };
  cashflows: YearCashflow[];
}

// ---------- Defaults (all overridable via config) ----------
// NOTE: verify current SEAI tiers + CEG rates at launch; they change.
// These are config, not gospel — that's the point of the engine.

export const DEFAULT_CONFIG: EstimateConfig = {
  retailRate: 0.35,
  exportRate: 0.20,
  costPerKwp: 1650,
  batteryCost: 2500,
  selfConsumptionNoBattery: 0.35,
  selfConsumptionWithBattery: 0.70,
  degradationPerYear: 0.005,
  priceInflationPerYear: 0.02,
  inverterReplacementYear: 12,
  inverterReplacementCost: 1200,
  horizonYears: 25,
  minSystemKwp: 2,
  maxSystemKwp: 12,
  // SEAI domestic solar PV structure: rate per kWp banded, capped.
  // CONFIG — update to current SEAI values at launch.
  seaiTiers: [
    { uptoKwp: 2, ratePerKwp: 700 },
    { uptoKwp: 4, ratePerKwp: 200 },
  ],
  seaiCap: 1800,
  defaultSpecificYield: 950,
};

// County fallback specific yields (kWh/kWp/yr, ~south-facing ~35° tilt).
// Fallback ONLY — live PVGIS by lat/long always preferred.
// Values are indicative; refine against PVGIS per county centroid.
export const COUNTY_YIELD_FALLBACK: Record<string, number> = {
  antrim: 880, armagh: 890, carlow: 950, cavan: 900, clare: 940,
  cork: 970, derry: 870, donegal: 870, down: 890, dublin: 950,
  fermanagh: 880, galway: 920, kerry: 980, kildare: 945, kilkenny: 955,
  laois: 940, leitrim: 890, limerick: 950, longford: 915, louth: 930,
  mayo: 900, meath: 935, monaghan: 905, offaly: 935, roscommon: 915,
  sligo: 895, tipperary: 950, tyrone: 875, waterford: 965, westmeath: 930,
  wexford: 970, wicklow: 950,
};

// ---------- SEAI grant calculation (tiered, capped) ----------

export function calculateSeaiGrant(systemKwp: number, cfg: EstimateConfig): number {
  let grant = 0;
  let prev = 0;
  for (const tier of cfg.seaiTiers) {
    const bandKwp = Math.max(0, Math.min(systemKwp, tier.uptoKwp) - prev);
    grant += bandKwp * tier.ratePerKwp;
    prev = tier.uptoKwp;
    if (systemKwp <= tier.uptoKwp) break;
  }
  return Math.min(Math.round(grant), cfg.seaiCap);
}

// ---------- The engine ----------

export function calculateEstimate(inputs: EstimateInputs): EstimateResult {
  const cfg: EstimateConfig = { ...DEFAULT_CONFIG, ...(inputs.config ?? {}) };

  // 1. Consumption — prefer the real bill number
  const annualKwhSource = inputs.annualKwh ? "bill" as const : "estimated-from-spend" as const;
  const annualKwh = inputs.annualKwh ?? (inputs.monthlyBill * 12) / cfg.retailRate;

  // 2. Yield — PVGIS value > county fallback > default
  let specificYield = cfg.defaultSpecificYield;
  let yieldSource: EstimateResult["assumptions"]["yieldSource"] = "default";
  if (inputs.specificYield && inputs.specificYield > 0) {
    specificYield = inputs.specificYield;
    yieldSource = "pvgis";
  } else if (inputs.county) {
    const fy = COUNTY_YIELD_FALLBACK[inputs.county.trim().toLowerCase()];
    if (fy) { specificYield = fy; yieldSource = "county-fallback"; }
  }

  // 3. System sizing — cover consumption, respect roof cap and bounds
  let sizeKwp = annualKwh / specificYield;
  if (inputs.roofCapKwp && inputs.roofCapKwp > 0) sizeKwp = Math.min(sizeKwp, inputs.roofCapKwp);
  sizeKwp = Math.max(cfg.minSystemKwp, Math.min(cfg.maxSystemKwp, Math.round(sizeKwp * 2) / 2)); // 0.5 kWp steps

  // 4. Year-1 production & the self-consumption / export split
  const production1 = sizeKwp * specificYield;
  const selfConsumption = inputs.includeBattery ? cfg.selfConsumptionWithBattery : cfg.selfConsumptionNoBattery;
  // Can't self-consume more than the house actually uses
  const selfConsumedKwh1 = Math.min(production1 * selfConsumption, annualKwh);
  const exportedKwh1 = Math.max(0, production1 - selfConsumedKwh1);

  const annualSelfConsumptionSavings = Math.round(selfConsumedKwh1 * cfg.retailRate);
  const annualExportIncome = Math.round(exportedKwh1 * cfg.exportRate);
  const annualSavings = annualSelfConsumptionSavings + annualExportIncome;

  // 5. Costs & grant
  const systemCostGross = Math.round(sizeKwp * cfg.costPerKwp + (inputs.includeBattery ? cfg.batteryCost : 0));
  const seaiGrant = calculateSeaiGrant(sizeKwp, cfg);
  const systemCostNet = systemCostGross - seaiGrant;

  // 6. 25-year cashflow: degradation + price inflation + inverter replacement
  const cashflows: YearCashflow[] = [];
  let cumulative = -systemCostNet;
  let paybackYears: number | null = null;

  for (let y = 1; y <= cfg.horizonYears; y++) {
    const degr = Math.pow(1 - cfg.degradationPerYear, y - 1);
    const infl = Math.pow(1 + cfg.priceInflationPerYear, y - 1);
    const prod = production1 * degr;
    const selfK = Math.min(prod * selfConsumption, annualKwh);
    const expK = Math.max(0, prod - selfK);
    const selfVal = selfK * cfg.retailRate * infl;
    const expVal = expK * cfg.exportRate * infl;
    const outgo = y === cfg.inverterReplacementYear ? cfg.inverterReplacementCost : 0;
    const net = selfVal + expVal - outgo;
    const prevCumulative = cumulative;
    cumulative += net;

    if (paybackYears === null && prevCumulative < 0 && cumulative >= 0) {
      // interpolate within the year for a decimal payback
      paybackYears = Math.round((y - 1 + (-prevCumulative) / net) * 10) / 10;
    }

    cashflows.push({
      year: y,
      production: Math.round(prod),
      selfConsumedValue: Math.round(selfVal),
      exportValue: Math.round(expVal),
      outgoings: outgo,
      netCashflow: Math.round(net),
      cumulative: Math.round(cumulative),
    });
  }

  const lifetimeSavings = Math.round(cumulative); // net of all costs over horizon
  const solarOffsetPct = Math.min(100, Math.round((selfConsumedKwh1 / annualKwh) * 100));
  // SEAI/CRU grid intensity ~0.33 kgCO2/kWh — config-worthy later
  const co2SavedTonnesPerYear = Math.round((production1 * 0.33) / 10) / 100;

  return {
    systemSizeKwp: sizeKwp,
    systemCostGross,
    seaiGrant,
    systemCostNet,
    annualProductionKwh: Math.round(production1),
    annualSavings,
    annualSelfConsumptionSavings,
    annualExportIncome,
    solarOffsetPct,
    paybackYears,
    lifetimeSavings,
    co2SavedTonnesPerYear,
    assumptions: {
      specificYield,
      yieldSource,
      retailRate: cfg.retailRate,
      exportRate: cfg.exportRate,
      selfConsumption,
      annualKwhUsed: Math.round(annualKwh),
      annualKwhSource,
      degradationPerYear: cfg.degradationPerYear,
      priceInflationPerYear: cfg.priceInflationPerYear,
      horizonYears: cfg.horizonYears,
    },
    cashflows,
  };
}
