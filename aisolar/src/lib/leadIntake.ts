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
 *     extracted_monthly_bill NUMERIC,
 *     extracted_annual_kwh INTEGER,
 *     extracted_mprn TEXT,
 *     extracted_account_name TEXT,
 *     extracted_address TEXT,
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
import { domesticSolarGrant } from './seaiPipeline';

export interface LeadIntake {
  id: string;
  lead_id: string;
  source: 'bill_upload' | 'manual' | 'referral' | 'ai_analyser';
  // AI-extracted (front-door)
  extracted_monthly_bill: number | null;
  extracted_annual_kwh: number | null;
  extracted_mprn: string | null;
  extracted_account_name: string | null;
  extracted_address: string | null;
  extraction_confidence: 'high' | 'medium' | 'low' | null;
  extraction_raw: Record<string, unknown> | null;
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
  SYSTEM_COST_PER_KWP: 1800,   // DEPRECATED — pricing now lives in src/lib/pricing.ts (brand.pricing.perKwp). Kept only so old references resolve; do not add new uses.
  SEAI_GRANT_MAX: 1800,        // €
  SEAI_PER_KWP: 900,           // €
} as const;

/**
 * Calculate the system estimate from intake data.
 * Single source of truth — used by AIBillAnalyser (front door), ProposalDraftAgent,
 * and the proposal editor. Eliminates the "two parallel grant calculation paths" bug.
 */
export function calculateSystemEstimate(input: {
  monthlyBill?: number | null;
  annualKwh?: number | null;
  roofCapKwp?: number | null;
  /** How much generation is used on-site vs exported. Defaults to the flat 0.70;
   *  callers with occupancy data pass an occupancy-driven % (see
   *  selfConsumptionFromOccupancy) so the savings reflect the real home. */
  selfConsumptionPct?: number | null;
}) {
  const monthlyBill = input.monthlyBill ?? 0;
  const annualKwh = input.annualKwh && input.annualKwh > 0
    ? input.annualKwh
    : (monthlyBill * 12) / IE_ENERGY.RETAIL_RATE;

  // Clamp system size to Irish residential range (3-12 kWp) unless survey override
  const calcSize = Math.max(3, Math.min(12, Math.round(annualKwh / IE_ENERGY.YIELD_PER_KWP)));
  const systemSize = input.roofCapKwp ? Math.min(input.roofCapKwp, calcSize) : calcSize;

  const annualProduction = systemSize * IE_ENERGY.YIELD_PER_KWP;
  const selfConsumption = (input.selfConsumptionPct != null && input.selfConsumptionPct > 0)
    ? Math.min(0.95, Math.max(0.2, input.selfConsumptionPct))
    : IE_ENERGY.SELF_CONSUMPTION_PCT;
  const selfConsumedKwh = annualProduction * selfConsumption;
  const exportedKwh = annualProduction - selfConsumedKwh;
  const annualSavings = (selfConsumedKwh * IE_ENERGY.RETAIL_RATE) + (exportedKwh * IE_ENERGY.EXPORT_RATE);
  const solarOffset = annualKwh > 0 ? Math.min(85, Math.round((annualProduction / annualKwh) * 100)) : 0;

  const grossCost = systemCost({ systemSizeKw: systemSize });
  const seaiGrant = domesticSolarGrant(systemSize);   // verified tiered €700/€200 (was flat €900/kWp)
  const netCost = grossCost - seaiGrant;
  const paybackYears = annualSavings > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 0;
  const twentyYearSavings = annualSavings * 20 - netCost;

  return {
    annualKwh: Math.round(annualKwh),
    systemSizeKw: systemSize,
    annualProductionKwh: Math.round(annualProduction),
    annualSavings: Math.round(annualSavings),
    solarOffsetPct: solarOffset,
    grossCost,
    seaiGrant,
    netCost,
    paybackYears,
    twentyYearSavings: Math.round(twentyYearSavings),
    co2TonnesPerYear: Math.round((annualProduction * 0.4) / 1000 * 10) / 10,
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
