/**
 * _shared/quote.ts — the SINGLE edge copy of the quote engine.
 *
 * Deno edge functions can't import from src/, so this is a FAITHFUL, byte-true
 * mirror of the frontend engine:
 *   - src/lib/leadIntake.ts  (computeQuote, selfConsumptionFromOccupancy, annualYieldFactor, IE_ENERGY)
 *   - src/lib/seaiPipeline.ts (domesticSolarGrant, calculateNDMG, cegRate, VAT_COMMERCIAL, seaiPropertyType)
 *   - src/lib/pricing.ts      (systemCost, PricingConfig, DEFAULT_PRICING)
 *
 * WHY THIS EXISTS: the proposal drafter (agent-drain) previously re-implemented
 * the money math inline, and that copy drifted — €900/kWp flat grant (vs the real
 * €700/€200 tiered), no commercial VAT, battery cost dropped, savings from the
 * early intake estimate instead of the occupancy-recomputed figure. A signed
 * contract rests on the STORED number, so the drift was a launch bug. One source
 * of truth kills all four. **Keep this in step with computeQuote — if the frontend
 * engine changes, change here too.** Tenant pricing is an explicit input so a
 * per-tenant price change flows into the stored quote (admin-settable).
 */

export const IE_ENERGY = {
  RETAIL_RATE: 0.35,
  EXPORT_RATE: 0.14,
  YIELD_PER_KWP: 950,
  SELF_CONSUMPTION_PCT: 0.70, // fallback ONLY, when occupancy is unknown
  BATTERY_CYCLES_PER_YEAR: 200,
} as const;

export const VAT_COMMERCIAL = 0.13;

export interface PricingConfig { perKwp: number; batteryPerKwh: number; panelWatts: number }
/** Mirrors src/lib/pricing.ts DEFAULT_PRICING — the fallback when a tenant hasn't set its own. */
export const DEFAULT_PRICING: PricingConfig = { perKwp: 1800, batteryPerKwh: 650, panelWatts: 435 };

const CEG_RATES: Record<string, number> = {
  "pinergy": 0.20, "electric ireland": 0.195, "bord gais": 0.185, "bord gáis": 0.185,
  "sse": 0.20, "sse airtricity": 0.20, "energia": 0.18, "flogas": 0.185,
};
export function cegRate(provider?: string | null): number {
  if (!provider) return IE_ENERGY.EXPORT_RATE;
  const key = provider.trim().toLowerCase();
  const hit = Object.keys(CEG_RATES).find((k) => key.includes(k));
  return hit ? CEG_RATES[hit] : IE_ENERGY.EXPORT_RATE;
}

export type PropertyType = "domestic" | "commercial";
export function seaiPropertyType(raw?: string | null): PropertyType {
  return /commercial|industrial|farm|non.?domestic|business/i.test(raw ?? "") ? "commercial" : "domestic";
}

/** DOMESTIC grant: €700/kWp first 2 kWp, €200/kWp for 2–4 kWp, cap €1,800. */
export function domesticSolarGrant(kwp: number): number {
  const g = Math.min(kwp, 2) * 700 + Math.max(0, Math.min(kwp, 4) - 2) * 200;
  return Math.min(Math.round(g), 1800);
}
/** COMMERCIAL NDMG: €900/kWp→2 · €300→20 · €200→200 · €150→1000, cap €162,600. */
export function calculateNDMG(kwp: number): number {
  if (kwp < 1) return 0;
  let g = Math.min(kwp, 2) * 900;
  if (kwp > 2) g += (Math.min(kwp, 20) - 2) * 300;
  if (kwp > 20) g += (Math.min(kwp, 200) - 20) * 200;
  if (kwp > 200) g += (Math.min(kwp, 1000) - 200) * 150;
  return Math.min(Math.round(g), 162600);
}

export function annualYieldFactor(input: { orientation?: string | null; pitchDeg?: number | string | null; shading?: string | null }): number {
  const o = String(input.orientation ?? "south").toLowerCase().replace(/[_-]/g, " ");
  const orientF =
    o.includes("south") && (o.includes("east") || o.includes("west")) ? 0.96 :
    o.includes("south") ? 1.0 :
    o.includes("north") && (o.includes("east") || o.includes("west")) ? 0.70 :
    o.includes("north") ? 0.62 :
    (o.includes("east") || o.includes("west")) ? 0.85 : 0.90;
  const pitch = Number(input.pitchDeg) || 35;
  const pitchF = 1 - Math.min(0.14, Math.abs(pitch - 35) / 100);
  const s = String(input.shading ?? "none").toLowerCase();
  const shadeF =
    s.includes("heavy") || s.includes("significant") ? 0.72 :
    s.includes("moderate") || s.includes("partial") ? 0.85 :
    s.includes("light") || s.includes("minimal") ? 0.95 : 1.0;
  return Math.round(orientF * pitchF * shadeF * 100) / 100;
}

export function selfConsumptionFromOccupancy(input: { homeDuringDay?: string | null; occupants?: string | null; hasBattery?: boolean }): number {
  const base = input.homeDuringDay === "usually" ? 0.62 : input.homeDuringDay === "mixed" ? 0.50 : input.homeDuringDay === "out" ? 0.35 : IE_ENERGY.SELF_CONSUMPTION_PCT;
  const people = input.occupants === "5+" ? 5 : Number(input.occupants) || 2;
  const withPeople = base + Math.max(0, people - 2) * 0.02;
  const capNoBattery = Math.min(0.75, withPeople);
  return input.hasBattery ? Math.min(0.90, capNoBattery + 0.20) : capNoBattery;
}

export function systemCost(input: { systemSizeKw?: number; batteryKwh?: number }, cfg: PricingConfig = DEFAULT_PRICING): number {
  const kwp = input.systemSizeKw ?? 0;
  return Math.round(kwp * cfg.perKwp + (input.batteryKwh ?? 0) * cfg.batteryPerKwh);
}

export interface QuoteRates { dayRate?: number; nightRate?: number | null; exportRate?: number; standingCharge?: number | null; dayNightMeter?: boolean; provider?: string | null }
/** Read the tariff off the 21-point bill extract (mirror of ratesFromIntake). */
export function ratesFromIntake(intake: Record<string, unknown> | null | undefined): QuoteRates {
  const i = intake ?? {};
  const num = (k: string): number | null => { const v = i[k]; return typeof v === "number" && isFinite(v) ? v : null; };
  const provider = (i["extracted_provider"] as string) ?? null;
  return {
    dayRate: num("extracted_unit_rate") ?? IE_ENERGY.RETAIL_RATE,
    nightRate: num("extracted_night_rate"),
    exportRate: cegRate(provider),
    standingCharge: num("extracted_standing_charge"),
    dayNightMeter: i["extracted_day_night_meter"] === true,
    provider,
  };
}

export interface QuoteInput {
  systemSizeKw: number;
  batteryKwh?: number;
  addOnsCost?: number;
  roof?: { orientation?: string | null; pitchDeg?: number | string | null; shading?: string | null } | null;
  occupancy?: { occupants?: string | null; homeDuringDay?: string | null } | null;
  selfConsumptionOverride?: number | null;
  rates?: QuoteRates | null;
  annualUseKwh?: number | null;
  propertyType?: PropertyType;
  discountPct?: number;
  netCostOverride?: number | null;
  /** Tenant pricing (admin-settable). Defaults to DEFAULT_PRICING. */
  pricing?: PricingConfig;
}

/** Faithful edge mirror of src/lib/leadIntake.ts computeQuote(). */
export function computeQuote(q: QuoteInput) {
  const cfg = q.pricing ?? DEFAULT_PRICING;
  const kwp = Math.max(0, q.systemSizeKw);
  const propertyType: PropertyType = q.propertyType ?? "domestic";
  const rates = {
    dayRate: q.rates?.dayRate ?? IE_ENERGY.RETAIL_RATE,
    nightRate: q.rates?.nightRate ?? null,
    exportRate: q.rates?.exportRate ?? IE_ENERGY.EXPORT_RATE,
    standingCharge: q.rates?.standingCharge ?? null,
    dayNightMeter: q.rates?.dayNightMeter ?? false,
    provider: q.rates?.provider ?? null,
  };

  const yieldFactor = q.roof ? annualYieldFactor(q.roof) : 1.0;
  const productionKwh = Math.round(kwp * IE_ENERGY.YIELD_PER_KWP * yieldFactor);

  const hasBattery = (q.batteryKwh ?? 0) > 0;
  const selfConsumption = (q.selfConsumptionOverride != null && q.selfConsumptionOverride > 0)
    ? Math.min(0.95, Math.max(0.2, q.selfConsumptionOverride))
    : selfConsumptionFromOccupancy({ occupants: q.occupancy?.occupants, homeDuringDay: q.occupancy?.homeDuringDay, hasBattery });
  const selfConsumedKwh = Math.round(productionKwh * selfConsumption);
  const exportedKwh = Math.max(0, productionKwh - selfConsumedKwh);

  const selfUseSavings = Math.round(selfConsumedKwh * rates.dayRate);
  const exportIncome = Math.round(exportedKwh * rates.exportRate);
  const batteryArbitrage = (hasBattery && rates.dayNightMeter && rates.nightRate != null && rates.nightRate < rates.dayRate)
    ? Math.round((q.batteryKwh ?? 0) * (rates.dayRate - rates.nightRate) * IE_ENERGY.BATTERY_CYCLES_PER_YEAR) : 0;
  const annualSavings = selfUseSavings + exportIncome + batteryArbitrage;

  const exVat = systemCost({ systemSizeKw: kwp, batteryKwh: q.batteryKwh ?? 0 }, cfg) + (q.addOnsCost ?? 0);
  const vatAmount = propertyType === "commercial" ? Math.round(exVat * VAT_COMMERCIAL) : 0;
  const grossCost = exVat + vatAmount;
  const seaiGrant = propertyType === "commercial" ? calculateNDMG(kwp) : domesticSolarGrant(kwp);
  const computedNet = Math.round(Math.max(0, grossCost - seaiGrant) * (1 - (q.discountPct ?? 0) / 100));
  const netCost = q.netCostOverride ?? computedNet;

  const paybackYears = annualSavings > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 0;
  const noExport = selfUseSavings + batteryArbitrage;
  const paybackNoExportYears = noExport > 0 ? Math.round((netCost / noExport) * 10) / 10 : 0;
  const annualUse = q.annualUseKwh && q.annualUseKwh > 0 ? q.annualUseKwh : null;
  const coveragePct = annualUse ? Math.min(100, Math.round((productionKwh / annualUse) * 100)) : null;

  return {
    systemSizeKw: kwp, yieldFactor, productionKwh, selfConsumption, selfConsumedKwh, exportedKwh, rates,
    selfUseSavings, exportIncome, batteryArbitrage, annualSavings, coveragePct,
    grossCost, vatAmount, seaiGrant, netCost, paybackYears, paybackNoExportYears,
    twentyYearBenefit: annualSavings * 20 - netCost,
  };
}
