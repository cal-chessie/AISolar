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

export type EsbFormChoice = 'NC6' | 'NC7' | 'NC8';

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
  const match = m.match(/(\d+(?:\.\d+)?)\s*k(?:W|VA)?/i) ?? m.match(/SE(\d+(?:\.\d+)?)K/i) ?? m.match(/-(\d+(?:\.\d+)?)(?:K|T)\b/i);
  const parsed = match ? parseFloat(match[1]) : 0;
  return parsed > 0 && parsed <= 1000 ? parsed : (lead.proposal?.system_size_kw ?? 0);
}

export function decideCompliance(lead: DummyLead): ComplianceDecision {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const kW = lead.proposal?.system_size_kw ?? 0;
  const tiic = inverterAcKw(lead);
  const threePhase = /three/i.test(lead.survey?.confirmed_inverter_type ?? '');
  const commercial = i.extracted_premises_type === 'commercial' || i.property_type === 'commercial';
  const nc6Limit = threePhase ? 11 : 6;
  const esbForm: EsbFormChoice = tiic <= nc6Limit ? 'NC6' : tiic <= 50 ? 'NC7' : 'NC8';

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
