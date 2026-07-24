/**
 * pricing.ts — the ONE place a system's cost is computed.
 *
 * Cal: "the math has to be perfect throughout as that will have to be changed
 * per tenant either in the settings or the product page." Before this, three
 * screens disagreed: the estimate used €1,800/kWp, the design step summed
 * product COST (zero margin) + guessed labour, and the drafting agent used a
 * third flat rate. A customer saw one number at estimate and a different one
 * at proposal.
 *
 * Now every screen — estimate, design, proposal, and the drafting agent —
 * resolves cost through THIS function, and every rate comes from the tenant's
 * config (brand.pricing, editable in Settings or the Products page). Change a
 * rate once and every screen moves together.
 *
 * Model: cost = (kWp × perKwp) + (batteryKwh × batteryPerKwh). The per-kWp
 * base is the market-standard all-in for hardware + standard install; storage
 * is added on top per usable kWh. Panel count converts to kWp via panelWatts,
 * so the design step (which counts panels) and the estimate (which sizes in
 * kWp) land on the SAME number.
 *
 * Edge functions can't import from src/ — supabase/functions/agent-drain keeps
 * a mirrored copy of these defaults, stamped with the same source note.
 */
import { brand } from '@/config/brand';

export interface PricingConfig {
  /** € per kWp installed — hardware + standard labour. */
  perKwp: number;
  /** € per usable kWh of battery storage, added on top. */
  batteryPerKwh: number;
  /** Panel wattage (W) — converts panel count ↔ kWp. */
  panelWatts: number;
}

/** Fallback if a tenant hasn't set its own — mirrors brand.pricing. */
export const DEFAULT_PRICING: PricingConfig = {
  perKwp: 1800,
  batteryPerKwh: 650,
  panelWatts: 435,
};

/** The active tenant's pricing — brand.pricing with defaults filled in. */
export function getPricingConfig(): PricingConfig {
  return { ...DEFAULT_PRICING, ...(brand as { pricing?: Partial<PricingConfig> }).pricing };
}

/** Panel count → kWp, using the tenant's panel wattage. */
export function panelsToKwp(panelCount: number, cfg: PricingConfig = getPricingConfig()): number {
  return (panelCount * cfg.panelWatts) / 1000;
}

/**
 * Gross system cost (before grant). Give it a size in kWp OR a panel count —
 * both resolve through the same rates, so the estimate and the proposal agree.
 */
export function systemCost(
  input: { systemSizeKw?: number; panelCount?: number; batteryKwh?: number },
  cfg: PricingConfig = getPricingConfig(),
): number {
  const kwp = input.systemSizeKw ?? (input.panelCount != null ? panelsToKwp(input.panelCount, cfg) : 0);
  const base = kwp * cfg.perKwp;
  const battery = (input.batteryKwh ?? 0) * cfg.batteryPerKwh;
  return Math.round(base + battery);
}
