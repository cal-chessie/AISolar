/**
 * fieldRecord — the AIField job record: what the crew ATTESTED at the gate,
 * readable anywhere the record is needed (the paperwork, the handover pack,
 * the coach). ONE source between the field app and the forms — the reason a
 * substituted inverter can never again produce an NC6 describing kit that
 * isn't on the roof.
 *
 * Storage today: offline-first localStorage (`jobview_v2_<leadId>`), written
 * by JobViewV2. Sweep 8 replaces the store with `installed_equipment` /
 * `install_evidence` rows (+ the installer's own vault of their serials) and
 * kernel emits per kernelVocabulary.ts — the SHAPE here is that contract.
 *
 * Language law (Decidability §5): everything here is ATTESTED by the named
 * installer at the gate — never "machine-verified". Occurrence stays on the
 * far bank; this record is the bridge.
 */

export interface SerialState {
  fittedModel: string;      // inverter model AS FITTED — off the rating plate
  serial: string;           // inverter serial number — off the plate
  acRatingKw: string;       // inverter AC rating (kW) — off the plate. This is
                            // the number NC6 §5 wants; NEVER the DC kWp.
  exportLimit: string;      // the REAL export setting, as commissioned —
                            // 'None — full export' or 'Limited to X kW'
  confirmed: boolean;       // installer confirmed every digit at the gate
  mismatchFlagged: boolean; // fitted ≠ proposal — recorded, never cleared silently
  note: string;             // why — rides with the record on a mismatch
}

export const DEFAULT_SERIALS: SerialState = {
  fittedModel: '', serial: '', acRatingKw: '', exportLimit: '',
  confirmed: false, mismatchFlagged: false, note: '',
};

export interface FieldRecord {
  serials: SerialState;
  signature: string | null; // dataURL today; storage URL + hash at Sweep 8
}

/** Read a job's field record. Null when the crew hasn't started that job on
 *  this device — callers fall back to the proposal AND SAY SO (truth-pass:
 *  a form must never silently present designed kit as fitted kit). */
export function getFieldRecord(leadId: string): FieldRecord | null {
  try {
    const raw = localStorage.getItem(`jobview_v2_${leadId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      serials: { ...DEFAULT_SERIALS, ...(data.serials ?? {}) },
      signature: data.signature ?? null,
    };
  } catch {
    return null;
  }
}
