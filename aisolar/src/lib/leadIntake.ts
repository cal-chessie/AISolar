/**
 * Lead Intake — the single source of truth for bill-extracted customer data.
 *
 * Design principle: the customer's energy bill is the front door. Once AI extracts
 * the data, it flows through the ENTIRE pipeline — survey, proposal, contract,
 * installation, SEAI grant — without re-entry. Every downstream stage reads from
 * `lead_intake` and only adds NEW fields (roof type, panel model, etc.).
 *
 * Schema (mirrors the migration 20260718_lead_intake.sql):
 *   lead_intake (
 *     id UUID PK,
 *     lead_id UUID FK -> leads(id),
 *     source TEXT,                    -- 'bill_upload' | 'manual' | 'referral'
 *     extracted_* ...                 -- the FULL 21-point bill extract; the
 *       interface below mirrors the columns 1:1 (extract-bill-data persists all 21).
 *     extraction_confidence TEXT,     -- 'high' | 'medium' | 'low'
 *     extraction_raw JSONB,           -- full AI response
 *     estimated_system_size_kw NUMERIC,
 *     estimated_annual_savings NUMERIC,
 *     estimated_payback_years NUMERIC,
 *     estimated_20yr_savings NUMERIC,
 *     solar_offset_pct NUMERIC,
 *     created_at TIMESTAMPTZ,
 *     updated_at TIMESTAMPTZ
 *   )
 */
import { systemCost } from './pricing';
import { domesticSolarGrant, calculateNDMG, cegRate, VAT_COMMERCIAL, type PropertyType } from './seaiPipeline';

export interface LeadIntake {
  id: string;
  lead_id: string;
  source: 'bill_upload' | 'manual' | 'referral' | 'ai_analyser';
  // AI-extracted from the bill — the FULL 21-point extract that extract-bill-data
  // persists to lead_intake. (Was v1: only the 5 core below were typed; the other
  // 16 rode untyped. This IS the DB shape now, 1:1 — BillReadPanel.billReadFromIntake
  // maps these snake_case columns into the camelCase BillRead view-model.)
  extracted_monthly_bill: number | null;
  extracted_annual_kwh: number | null;
  extracted_mprn: string | null;
  extracted_account_name: string | null;
  extracted_address: string | null;
  extracted_eircode: string | null;
  extracted_provider: string | null;
  extracted_tariff_name: string | null;
  extracted_unit_rate: number | null;          // day rate €/kWh
  extracted_night_rate: number | null;          // night rate €/kWh (day/night meters)
  extracted_standing_charge: number | null;
  extracted_standing_charge_unit: string | null;
  extracted_vat_rate: number | null;            // electricity VAT on the bill (9 / 13.5)
  extracted_day_night_meter: boolean | null;
  extracted_billing_period: string | null;
  extracted_billing_period_kwh: number | null;
  extracted_day_usage_kwh: number | null;       // the split that argues the battery case
  extracted_night_usage_kwh: number | null;
  extracted_estimated_reading: boolean | null;  // E on the bill → caveat the numbers
  extracted_notes: string | null;
  bill_extracted_at: string | null;             // when the reader ran (ISO)
  extraction_confidence: 'high' | 'medium' | 'low' | null;
  extraction_raw: Record<string, unknown> | null;
  // Classification — the survey's "home or business?" (residential/commercial),
  // carried onto the intake. The ONE domestic/commercial field (picks SEAI scheme
  // + VAT). NOT bill-derived; optional here because it originates on the survey.
  property_type?: string | null;
  // AI-estimated (system size, savings, payback)
  estimated_system_size_kw: number | null;
  estimated_annual_savings: number | null;
  estimated_payback_years: number | null;
  estimated_20yr_savings: number | null;
  solar_offset_pct: number | null;
  // Survey-confirmed (added by installer on site)
  confirmed_roof_type?: string | null;
  confirmed_roof_orientation?: string | null;
  confirmed_roof_pitch?: number | null;
  confirmed_shading?: 'none' | 'light' | 'moderate' | 'heavy' | null;
  confirmed_available_area_m2?: number | null;
  confirmed_system_size_kw?: number | null;
  confirmed_panel_count?: number | null;
  confirmed_battery_kwh?: number | null;
  confirmed_inverter_type?: string | null;
  // Proposal-finalized (added by consultant)
  finalized_panel_model?: string | null;
  finalized_inverter_model?: string | null;
  finalized_battery_model?: string | null;
  finalized_total_cost?: number | null;
  finalized_seai_grant?: number | null;
  finalized_net_cost?: number | null;
  finalized_payback_years?: number | null;
  finalized_25yr_savings?: number | null;
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * The unified stage vocabulary for the whole pipeline.
 * Used by DB triggers, email templates, AI coach, pipeline view, audit dashboard.
 * DO NOT duplicate these strings elsewhere.
 */
export const PIPELINE_STAGES = [
  { id: 'new',              label: 'New Lead',              group: 'intake',     color: 'slate',    automation: 'LeadIntakeAgent normalizes extracted data' },
  { id: 'intake_complete',  label: 'Intake Complete',       group: 'intake',     color: 'blue',     automation: 'SurveySchedulerAgent books site visit' },
  { id: 'survey_scheduled', label: 'Survey Scheduled',      group: 'survey',     color: 'blue',     automation: 'Installer notified + calendar invite sent' },
  { id: 'survey_complete',  label: 'Survey Complete',       group: 'survey',     color: 'indigo',   automation: 'ProposalDraftAgent auto-drafts from survey' },
  { id: 'proposal_drafted', label: 'Proposal Drafted',      group: 'proposal',   color: 'violet',   automation: 'Consultant reviews draft' },
  { id: 'proposal_sent',    label: 'Proposal Sent',         group: 'proposal',   color: 'violet',   automation: 'Customer portal link emailed' },
  { id: 'approved',         label: 'Contract Signed',       group: 'contract',   color: 'emerald',  automation: 'Invoice auto-created + SEAI grant started' },
  { id: 'deposit_paid',     label: 'Deposit Paid',          group: 'contract',   color: 'emerald',  automation: 'InstallCoordinatorAgent schedules install' },
  { id: 'install_scheduled',label: 'Install Scheduled',     group: 'install',    color: 'pending',    automation: 'Materials ordered + customer reminder' },
  { id: 'installing',       label: 'Install In Progress',   group: 'install',    color: 'pending',    automation: 'Installer checklist active' },
  { id: 'installed',        label: 'Install Complete',      group: 'install',    color: 'emerald',  automation: 'PostInstallAgent: warranty email + review request' },
  { id: 'final_paid',       label: 'Final Paid',            group: 'closeout',   color: 'emerald',  automation: 'GrantAgent submits SEAI paperwork' },
  { id: 'completed',        label: 'Project Closed',        group: 'closeout',   color: 'green',    automation: 'Handover pack + referral request' },
] as const;

export type PipelineStageId = typeof PIPELINE_STAGES[number]['id'];

export const STAGE_GROUPS = [
  { id: 'intake',    label: 'Intake',    color: 'blue' },
  { id: 'survey',    label: 'Survey',    color: 'indigo' },
  { id: 'proposal',  label: 'Proposal',  color: 'violet' },
  { id: 'contract',  label: 'Contract',  color: 'emerald' },
  { id: 'install',   label: 'Install',   color: 'pending' },
  { id: 'closeout',  label: 'Closeout',  color: 'green' },
] as const;

/** Lookup helpers */
export function getStage(id: string) {
  return PIPELINE_STAGES.find(s => s.id === id) || PIPELINE_STAGES[0];
}

export function getStageGroup(id: string) {
  const stage = getStage(id);
  return STAGE_GROUPS.find(g => g.id === stage.group) || STAGE_GROUPS[0];
}

/** Customer-facing touchpoints — what the customer has received so far. */
export interface Touchpoint {
  id: string;
  stage: string;
  channel: 'email' | 'sms' | 'portal' | 'phone' | 'whatsapp';
  direction: 'outbound' | 'inbound';
  summary: string;
  timestamp: string;
  actor: 'system' | 'consultant' | 'installer' | 'customer' | 'agent';
}

/**
 * Compute the next automation that should fire for a lead at this stage.
 * Used by the Pipeline View to show "what happens next, automatically".
 */
export function getNextAutomation(stage: string): string | null {
  const stageObj = getStage(stage);
  // The "next" automation is the automation of the NEXT stage in the pipeline
  const idx = PIPELINE_STAGES.findIndex(s => s.id === stage);
  if (idx === -1 || idx === PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[idx + 1].automation;
}

/**
 * Carry-over rules: which fields from intake should pre-fill the survey form.
 * This eliminates the duplicate-data-entry complaint.
 */
export const INTAKE_TO_SURVEY_MAP: Record<string, string> = {
  extracted_monthly_bill: 'monthly_bill',
  extracted_annual_kwh: 'annual_kwh',
  extracted_mprn: 'mprn',
  extracted_address: 'address',
  estimated_system_size_kw: 'recommended_system_size',
};

/**
 * Carry-over rules: which fields from survey should pre-fill the proposal.
 */
export const SURVEY_TO_PROPOSAL_MAP: Record<string, string> = {
  confirmed_system_size_kw: 'system_size_kw',
  confirmed_panel_count: 'panel_count',
  confirmed_battery_kwh: 'battery_capacity_kwh',
  confirmed_inverter_type: 'inverter_type',
  confirmed_roof_type: 'roof_type',
  confirmed_roof_orientation: 'roof_orientation',
};

/** Energy calculation constants (Ireland-specific). */
export const IE_ENERGY = {
  RETAIL_RATE: 0.35,           // €/kWh average retail electricity
  EXPORT_RATE: 0.14,           // €/kWh micro-gen export tariff
  YIELD_PER_KWP: 950,          // kWh per kWp per year (IE climate)
  SELF_CONSUMPTION_PCT: 0.70,  // typical home self-consumption
  BATTERY_CYCLES_PER_YEAR: 200, // conservative full night-charge cycles/yr for the day/night arbitrage term
  SYSTEM_COST_PER_KWP: 1800,   // DEPRECATED — pricing now lives in src/lib/pricing.ts (brand.pricing.perKwp). Kept only so old references resolve; do not add new uses.
  SEAI_GRANT_MAX: 1800,        // €
  SEAI_PER_KWP: 900,           // €
} as const;

/**
 * Calculate the system estimate from intake data.
 * Single source of truth — used by AIBillAnalyser (front door), ProposalDraftAgent,
 * and the proposal editor. Eliminates the "two parallel grant calculation paths" bug.
 */
/** Irish trading-income corporation-tax rate — the value of a capital allowance. */
const IE_CORP_TAX = 0.125;

/** IRR over `years` for a single upfront outflow + level annual inflow. Bisection;
 *  headline-capped at 100%. Used for the commercial estimate. */
function irrPercent(initial: number, annual: number, years: number): number {
  if (initial <= 0 || annual <= 0) return 0;
  const npv = (r: number) => { let s = -initial; for (let t = 1; t <= years; t++) s += annual / Math.pow(1 + r, t); return s; };
  if (npv(1) > 0) return 100;
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (npv(mid) > 0) lo = mid; else hi = mid; }
  return Math.round(((lo + hi) / 2) * 1000) / 10;
}

export function calculateSystemEstimate(input: {
  monthlyBill?: number | null;
  annualKwh?: number | null;
  roofCapKwp?: number | null;
  /** How much generation is used on-site vs exported. Defaults to the flat 0.70;
   *  callers with occupancy data pass an occupancy-driven % (see
   *  selfConsumptionFromOccupancy) so the savings reflect the real home. */
  selfConsumptionPct?: number | null;
  /** THE §D FORK — one question at the door decides the whole job. domestic
   *  (default) → €-saving + SEAI grant + payback; commercial → ex-VAT + VAT
   *  reclaim + NDMG + ACA + ROI/IRR. Commercial fields are undefined for domestic. */
  propertyType?: PropertyType;
}) {
  const commercial = input.propertyType === 'commercial';
  const monthlyBill = input.monthlyBill ?? 0;
  const annualKwh = input.annualKwh && input.annualKwh > 0
    ? input.annualKwh
    : (monthlyBill * 12) / IE_ENERGY.RETAIL_RATE;

  // Domestic clamps to the Irish residential band (3–12 kWp); commercial sizes to
  // offset the load, 4–500 kWp (NDMG reaches to 1000). Roof cap wins either way.
  const rawSize = Math.round(annualKwh / IE_ENERGY.YIELD_PER_KWP);
  const calcSize = commercial ? Math.max(4, Math.min(500, rawSize)) : Math.max(3, Math.min(12, rawSize));
  const systemSize = input.roofCapKwp ? Math.min(input.roofCapKwp, calcSize) : calcSize;

  const annualProduction = systemSize * IE_ENERGY.YIELD_PER_KWP;
  // Businesses run their load in daylight → higher self-consumption than a home.
  const defaultSelfCon = commercial ? 0.80 : IE_ENERGY.SELF_CONSUMPTION_PCT;
  const selfConsumption = (input.selfConsumptionPct != null && input.selfConsumptionPct > 0)
    ? Math.min(0.95, Math.max(0.2, input.selfConsumptionPct))
    : defaultSelfCon;
  const selfConsumedKwh = annualProduction * selfConsumption;
  const exportedKwh = annualProduction - selfConsumedKwh;
  const annualSavings = (selfConsumedKwh * IE_ENERGY.RETAIL_RATE) + (exportedKwh * IE_ENERGY.EXPORT_RATE);
  const solarOffset = annualKwh > 0 ? Math.min(85, Math.round((annualProduction / annualKwh) * 100)) : 0;

  // Commercial capital is quoted EX-VAT (they reclaim the 13%); domestic solar is
  // 0% VAT, so gross = ex. Grant forks: domestic tiers vs the NDMG formula.
  const grossCost = systemCost({ systemSizeKw: systemSize });
  const grant = commercial ? calculateNDMG(systemSize) : domesticSolarGrant(systemSize);
  const netCost = grossCost - grant;   // after grant (both) — same meaning across the fork

  let paybackYears: number, twentyYearSavings: number;
  let vatReclaim: number | undefined, acaRelief: number | undefined, netCostAfterAca: number | undefined;
  let roiPct: number | undefined, irrPct: number | undefined, twentyFiveYearNet: number | undefined;

  if (commercial) {
    // VAT they get back; ACA = 100% first-year capital allowance on the grant-net
    // capital, worth the 12.5% trading rate in year one; ROI/IRR off the true net.
    vatReclaim = Math.round(grossCost * VAT_COMMERCIAL);
    acaRelief = Math.round(netCost * IE_CORP_TAX);
    netCostAfterAca = netCost - acaRelief;
    paybackYears = annualSavings > 0 ? Math.round((netCostAfterAca / annualSavings) * 10) / 10 : 0;
    roiPct = netCostAfterAca > 0 ? Math.round((annualSavings / netCostAfterAca) * 100) : 0;
    irrPct = irrPercent(netCostAfterAca, annualSavings, 25);
    twentyFiveYearNet = Math.round(annualSavings * 25 - netCostAfterAca);
    twentyYearSavings = Math.round(annualSavings * 20 - netCostAfterAca);
  } else {
    paybackYears = annualSavings > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 0;
    twentyYearSavings = Math.round(annualSavings * 20 - netCost);
  }

  return {
    propertyType: (input.propertyType ?? 'domestic') as PropertyType,
    commercial,
    annualKwh: Math.round(annualKwh),
    systemSizeKw: systemSize,
    annualProductionKwh: Math.round(annualProduction),
    annualSavings: Math.round(annualSavings),
    solarOffsetPct: solarOffset,
    grossCost,
    seaiGrant: grant,   // domestic grant OR NDMG — existing callers keep working
    netCost,
    paybackYears,
    twentyYearSavings,
    co2TonnesPerYear: Math.round((annualProduction * 0.4) / 1000 * 10) / 10,
    // commercial-only (undefined for domestic)
    ndmgGrant: commercial ? grant : undefined,
    exVatCost: commercial ? grossCost : undefined,
    vatReclaim,
    acaRelief,
    netCostAfterAca,
    roiPct,
    irrPct,
    twentyFiveYearNet,
  };
}

/**
 * Self-consumption % from the survey's occupancy answers — the honest lever that
 * replaces the flat 0.70. More people and someone home during the day means more
 * of the roof's daytime output is used on the spot; out all day means most of it
 * exports, which is where a battery earns its keep. Any answer missing falls back
 * to the flat default, so nothing breaks. The consultant can override the result.
 *
 *   home_during_day: usually 0.62 · mixed 0.50 · out 0.35
 *   + 0.02 per person above two (more baseload), capped 0.75 without a battery
 *   + a battery adds ~0.20, capped 0.90
 */
export function selfConsumptionFromOccupancy(input: {
  homeDuringDay?: string | null;   // 'usually' | 'mixed' | 'out'
  occupants?: string | null;       // '1' | '2' | '3' | '4' | '5+'
  hasBattery?: boolean;
}): number {
  const base = input.homeDuringDay === 'usually' ? 0.62
    : input.homeDuringDay === 'mixed' ? 0.50
      : input.homeDuringDay === 'out' ? 0.35
        : IE_ENERGY.SELF_CONSUMPTION_PCT;
  const people = input.occupants === '5+' ? 5 : Number(input.occupants) || 2;
  const withPeople = base + Math.max(0, people - 2) * 0.02;
  const capNoBattery = Math.min(0.75, withPeople);
  return input.hasBattery ? Math.min(0.90, capNoBattery + 0.20) : capNoBattery;
}

/**
 * How much the flat 950 kWh/kWp yield is derated by the REAL roof — orientation,
 * pitch and shading — so a north-facing, shaded roof never reads like an
 * unshaded south one. 1.0 = ideal (south, ~35°, no shade). Handles both shading
 * vocabularies in use (none/light/moderate/heavy and none/minimal/partial/significant).
 */
export function annualYieldFactor(input: {
  orientation?: string | null;
  pitchDeg?: number | string | null;
  shading?: string | null;
}): number {
  const o = String(input.orientation ?? 'south').toLowerCase().replace(/[_-]/g, ' ');
  const orientF =
    o.includes('south') && (o.includes('east') || o.includes('west')) ? 0.96 :
    o.includes('south') ? 1.0 :
    o.includes('north') && (o.includes('east') || o.includes('west')) ? 0.70 :
    o.includes('north') ? 0.62 :
    (o.includes('east') || o.includes('west')) ? 0.85 :
    0.90;
  const pitch = Number(input.pitchDeg) || 35;
  const pitchF = 1 - Math.min(0.14, Math.abs(pitch - 35) / 100); // gentle penalty off the ~35° optimum
  const s = String(input.shading ?? 'none').toLowerCase();
  const shadeF =
    s.includes('heavy') || s.includes('significant') ? 0.72 :
    s.includes('moderate') || s.includes('partial') ? 0.85 :
    s.includes('light') || s.includes('minimal') ? 0.95 :
    1.0;
  return Math.round(orientF * pitchF * shadeF * 100) / 100;
}

/** Believable annual production (kWh) for a system on a specific roof. */
export function annualProduction(kWp: number, roof: Parameters<typeof annualYieldFactor>[0]): number {
  return Math.round(kWp * IE_ENERGY.YIELD_PER_KWP * annualYieldFactor(roof));
}

/* ────────────────────────────────────────────────────────────────────────────
   THE QUOTE ENGINE — computeQuote()
   One function computes every money figure. Studio, ProposalView, customer
   proposal, portal header and the LeadFlow money step all call THIS, so the
   same lead shows the same numbers on every surface, from every entry path
   (bill upload / manual / phone). Fixes the root cause of figure drift: four
   files each re-implementing `production × sc × 0.35 + export × 0.14`.
   ──────────────────────────────────────────────────────────────────────── */

/** Tariff picture, bill-first with honest fallbacks. */
export interface BillRates {
  dayRate: number;            // €/kWh retail day rate (bill unit rate, else 0.35)
  nightRate: number | null;   // €/kWh night rate when a day/night meter exists
  exportRate: number;         // €/kWh CEG feed-in, supplier-specific (else 0.14)
  standingCharge: number | null; // €/day — baseline cost solar can NEVER remove
  dayNightMeter: boolean;
  provider: string | null;
}

/** Read the tariff off the 21-point bill extract. Every field falls back to the
 *  flat IE_ENERGY constants, so manual/phone leads without a bill still price. */
export function ratesFromIntake(intake: Record<string, unknown> | null | undefined): BillRates {
  const i = intake ?? {};
  const num = (k: string): number | null => {
    const v = i[k];
    return typeof v === 'number' && isFinite(v) ? v : null;
  };
  const provider = (i['extracted_provider'] as string) ?? null;
  return {
    dayRate: num('extracted_unit_rate') ?? IE_ENERGY.RETAIL_RATE,
    nightRate: num('extracted_night_rate'),
    exportRate: cegRate(provider),
    standingCharge: num('extracted_standing_charge'),
    dayNightMeter: i['extracted_day_night_meter'] === true,
    provider,
  };
}

export interface QuoteInput {
  systemSizeKw: number;
  batteryKwh?: number;               // 0 / undefined = no battery
  addOnsCost?: number;               // diverter + EV charger installed prices
  /** Roof facts (survey/design). Omit → no derate (flat 950, pre-survey estimate). */
  roof?: { orientation?: string | null; pitchDeg?: number | string | null; shading?: string | null } | null;
  occupancy?: { occupants?: string | null; homeDuringDay?: string | null } | null;
  /** Consultant's manual override of the occupancy-derived self-consumption %. */
  selfConsumptionOverride?: number | null;
  rates?: Partial<BillRates> | null; // from ratesFromIntake(); missing keys fall back
  annualUseKwh?: number | null;      // for coverage %
  propertyType?: PropertyType;       // default domestic
  discountPct?: number;              // consultant discount applied to net
  /** A STORED proposal net_cost wins over recomputed cost (append-only contract). */
  netCostOverride?: number | null;
}

export interface QuoteOutput {
  systemSizeKw: number;
  yieldFactor: number;
  productionKwh: number;
  selfConsumption: number;
  selfConsumedKwh: number;
  exportedKwh: number;
  rates: BillRates;
  selfUseSavings: number;      // €/yr — displaced day-rate purchases
  exportIncome: number;        // €/yr — CEG feed-in on exported kWh
  batteryArbitrage: number;    // €/yr — night-rate charging displacing day rate
  annualSavings: number;       // €/yr — the headline (sum of the three)
  coveragePct: number | null;  // production / annual use
  grossCost: number;           // system + battery + add-ons (+ VAT if commercial)
  vatAmount: number;           // 0 domestic; 13% commercial (in the maths, not a string)
  seaiGrant: number;           // domestic tiered cap €1,800 | commercial NDMG
  netCost: number;
  paybackYears: number;        // with CEG export income
  paybackNoExportYears: number;// the honest second line: self-use only
  twentyYearBenefit: number;
}

export function computeQuote(q: QuoteInput): QuoteOutput {
  const kwp = Math.max(0, q.systemSizeKw);
  const propertyType: PropertyType = q.propertyType ?? 'domestic';
  const rates: BillRates = {
    dayRate: q.rates?.dayRate ?? IE_ENERGY.RETAIL_RATE,
    nightRate: q.rates?.nightRate ?? null,
    exportRate: q.rates?.exportRate ?? IE_ENERGY.EXPORT_RATE,
    standingCharge: q.rates?.standingCharge ?? null,
    dayNightMeter: q.rates?.dayNightMeter ?? false,
    provider: q.rates?.provider ?? null,
  };

  // Production — roof-derated when we know the roof, flat only pre-survey.
  const yieldFactor = q.roof ? annualYieldFactor(q.roof) : 1.0;
  const productionKwh = Math.round(kwp * IE_ENERGY.YIELD_PER_KWP * yieldFactor);

  // Self-consumption — occupancy-driven; 0.70 lives ONLY inside this fallback.
  const hasBattery = (q.batteryKwh ?? 0) > 0;
  const selfConsumption = (q.selfConsumptionOverride != null && q.selfConsumptionOverride > 0)
    ? Math.min(0.95, Math.max(0.2, q.selfConsumptionOverride))
    : selfConsumptionFromOccupancy({
        occupants: q.occupancy?.occupants,
        homeDuringDay: q.occupancy?.homeDuringDay,
        hasBattery,
      });
  const selfConsumedKwh = Math.round(productionKwh * selfConsumption);
  const exportedKwh = Math.max(0, productionKwh - selfConsumedKwh);

  // The money: self-use displaces the DAY rate; exports earn the supplier's CEG;
  // a battery on a day/night meter also charges cheap and displaces dear.
  const selfUseSavings = Math.round(selfConsumedKwh * rates.dayRate);
  const exportIncome = Math.round(exportedKwh * rates.exportRate);
  const batteryArbitrage = (hasBattery && rates.dayNightMeter && rates.nightRate != null && rates.nightRate < rates.dayRate)
    ? Math.round((q.batteryKwh ?? 0) * (rates.dayRate - rates.nightRate) * IE_ENERGY.BATTERY_CYCLES_PER_YEAR)
    : 0;
  const annualSavings = selfUseSavings + exportIncome + batteryArbitrage;

  // Cost + grant + VAT (commercial VAT applied in the maths; grant is ex-VAT).
  const exVat = systemCost({ systemSizeKw: kwp, batteryKwh: q.batteryKwh ?? 0 }) + (q.addOnsCost ?? 0);
  const vatAmount = propertyType === 'commercial' ? Math.round(exVat * VAT_COMMERCIAL) : 0;
  const grossCost = exVat + vatAmount;
  const seaiGrant = propertyType === 'commercial' ? calculateNDMG(kwp) : domesticSolarGrant(kwp);
  const computedNet = Math.round(Math.max(0, grossCost - seaiGrant) * (1 - (q.discountPct ?? 0) / 100));
  const netCost = q.netCostOverride ?? computedNet;

  const paybackYears = annualSavings > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 0;
  const noExport = selfUseSavings + batteryArbitrage;
  const paybackNoExportYears = noExport > 0 ? Math.round((netCost / noExport) * 10) / 10 : 0;
  const annualUse = q.annualUseKwh && q.annualUseKwh > 0 ? q.annualUseKwh : null;
  const coveragePct = annualUse ? Math.min(100, Math.round((productionKwh / annualUse) * 100)) : null;

  return {
    systemSizeKw: kwp, yieldFactor, productionKwh, selfConsumption, selfConsumedKwh, exportedKwh,
    rates, selfUseSavings, exportIncome, batteryArbitrage, annualSavings, coveragePct,
    grossCost, vatAmount, seaiGrant, netCost, paybackYears, paybackNoExportYears,
    twentyYearBenefit: annualSavings * 20 - netCost,
  };
}
