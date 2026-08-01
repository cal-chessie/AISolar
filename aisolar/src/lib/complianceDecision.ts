/**
 * complianceDecision — THE one place the form choice happens.
 *
 * Cal: "does the agent know to shut down the other files if only 1 or 2 are
 * needed?" Better than shutting down: the unneeded forms NEVER EXIST. This
 * function is the single source of truth — the Paperwork Engine's rows, the
 * grants page chips, the PDF generator and (at launch) the agents all call
 * it. At launch, lead_documents rows are created ONLY for what it returns:
 * no row, no generation, no chasing, nothing to suppress.
 *
 * The ladder (ESB): NC6 ≤6kW single / ≤11kW three-phase · NC7 ≤50kW ·
 * NC8 above (inverter small-scale; NC5 = synchronous, not roof solar).
 * Premises decides the SEAI scheme: domestic grant vs Non-Domestic Microgen.
 */
import type { DummyLead } from '@/lib/dummyData';
import { getFieldRecord } from '@/lib/fieldRecord';
import { seaiPropertyType } from '@/lib/seaiPipeline';

export type EsbFormChoice = 'NC6' | 'NC7' | 'NC8';

/** The ESB ladder as a pure function — one place the bands live, callable
 *  from the field app to warn the crew the MOMENT a fitted rating would flip
 *  the form (NC6→NC7 needs pre-approval; catching it on the roof is the
 *  whole point of the triple check).
 *  ⚠️ VERIFY BEFORE LIVE (flagged 28 Jul, needs ESB policy read + Cal's yes):
 *  micro-gen is 25A/phase = 5.75 kVA single / 11.04 kVA three — the 6/11
 *  bands here are the common shorthand and UNDER-FILE at exactly 5.75–6.0 kW
 *  single-phase. Statutory threshold change requires sign-off, not a quiet
 *  edit. Until then boundary cases should be eyeballed. */
export function esbFormForAcKw(acKw: number, threePhase: boolean): EsbFormChoice {
  const nc6Limit = threePhase ? 11 : 6;
  return acKw <= nc6Limit ? 'NC6' : acKw <= 50 ? 'NC7' : 'NC8';
}

export interface ComplianceDecision {
  esbForm: EsbFormChoice;
  /** Total Installed Inverter Capacity — what ESB actually routes on */
  tiic: number;
  /** NC7+ commercial paths need the G10 central protection relay on the SLD */
  requiresG10: boolean;
  commercial: boolean;
  threePhase: boolean;
  kW: number;
  /** the SEAI route this customer is on */
  seaiScheme: 'domestic-grant' | 'non-domestic-microgen';
  /** doc ids that exist for this customer — anything else never gets a row */
  requiredDocs: string[];
}

/** ESB routes on Total Installed Inverter Capacity (TIIC — the AC rating),
 *  NOT the panel kWp. A 7kWp array on a 5kW hybrid is NC6. Parse the kW out
 *  of the inverter model ("SE5K", "X1-HYBRID-5.0T", "SigenStor 8kW"); fall
 *  back to array kWp only when no inverter is picked yet. */
export function inverterAcKw(lead: DummyLead): number {
  const m = lead.proposal?.inverter_model ?? '';
  const match = m.match(/(\d+(?:\.\d+)?)\s*k(?:W|VA)?/i) ?? m.match(/SE(\d+(?:\.\d+)?)K/i) ?? m.match(/-(\d+(?:\.\d+)?)(?:K|T)\b/i)
    // SolaX-style "X1-Hybrid-5.0 G4" / "X1-Mini-3.6": rating trails the family
    // name as a bare decimal (caught live 28 Jul — fell through to kWp and
    // over-filed NC7 on a 5kW hybrid).
    ?? m.match(/(?:hybrid|mini|boost|air|pro)-(\d+(?:\.\d+)?)\b/i);
  const parsed = match ? parseFloat(match[1]) : 0;
  return parsed > 0 && parsed <= 1000 ? parsed : (lead.proposal?.system_size_kw ?? 0);
}

export function decideCompliance(lead: DummyLead): ComplianceDecision {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const kW = lead.proposal?.system_size_kw ?? 0;
  // THE FIELD RECORD WINS (same law as pdfFill): once the crew has attested
  // the AC rating off the plate, ESB routing runs on the FITTED number, not
  // the designed one — a substitution that crosses a band flips the form
  // here, automatically, before any paperwork generates.
  const gate = getFieldRecord(lead.id)?.serials;
  const attestedKw = gate?.confirmed ? parseFloat(gate.acRatingKw) : NaN;
  const tiic = Number.isFinite(attestedKw) && attestedKw > 0 ? attestedKw : inverterAcKw(lead);
  const threePhase = /three/i.test(lead.survey?.confirmed_inverter_type ?? '');
  // ONE classification field: property_type. (extracted_premises_type was a dead
  // duplicate — never written by anything — so it always read null here anyway.)
  const commercial = seaiPropertyType((lead.survey as Record<string, unknown> | undefined)?.property_type as string ?? i.property_type as string) === 'commercial';
  const esbForm: EsbFormChoice = esbFormForAcKw(tiic, threePhase);

  const requiredDocs = [
    'seai_app', 'seai_offer',            // grant route (scheme varies)
    'esb_loa', 'block_diagram', 'nc6',   // 'nc6' row id = the ONE application (form name varies)
    ...(esbForm === 'NC7' ? ['nc7_01', 'nc7_02'] : []),
    'dow', 'itc', 'reci', 'datasheet', 'ber',
  ];

  return {
    esbForm, tiic, requiresG10: esbForm !== 'NC6', commercial, threePhase, kW,
    seaiScheme: commercial ? 'non-domestic-microgen' : 'domestic-grant',
    requiredDocs,
  };
}
