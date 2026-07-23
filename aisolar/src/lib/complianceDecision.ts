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
  commercial: boolean;
  threePhase: boolean;
  kW: number;
  /** the SEAI route this customer is on */
  seaiScheme: 'domestic-grant' | 'non-domestic-microgen';
  /** doc ids that exist for this customer — anything else never gets a row */
  requiredDocs: string[];
}

export function decideCompliance(lead: DummyLead): ComplianceDecision {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const kW = lead.proposal?.system_size_kw ?? 0;
  const threePhase = /three/i.test(lead.survey?.confirmed_inverter_type ?? '');
  const commercial = i.extracted_premises_type === 'commercial' || i.property_type === 'commercial';
  const nc6Limit = threePhase ? 11 : 6;
  const esbForm: EsbFormChoice = kW <= nc6Limit ? 'NC6' : kW <= 50 ? 'NC7' : 'NC8';

  const requiredDocs = [
    'seai_app', 'seai_offer',            // grant route (scheme varies)
    'esb_loa', 'block_diagram', 'nc6',   // 'nc6' row id = the ONE application (form name varies)
    ...(esbForm === 'NC7' ? ['nc7_01', 'nc7_02'] : []),
    'dow', 'itc', 'reci', 'datasheet', 'ber',
  ];

  return {
    esbForm, commercial, threePhase, kW,
    seaiScheme: commercial ? 'non-domestic-microgen' : 'domestic-grant',
    requiredDocs,
  };
}
