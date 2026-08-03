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
  /** NC6 §4/§5A + Table 1 attestation: the fitted unit is type-test certified
   *  (EN 50549-1) and the Table 1 protection settings are applied & verified.
   *  Attested by the named installer at the gate — the ONLY source that ever
   *  puts a Y in the form's "Confirm Settings Applied" column. */
  protectionConfirmed: boolean;
  /** NC6 §5 "Rated Current (Amps) as per Type Test" — read OFF the type-test
   *  cert / datasheet (a certified figure), NOT derived. ≤25A single / 16A per
   *  phase three. */
  ratedCurrentA: string;
  /** NC6 §5A "Corresponding Type Test Certificate Referencing above Unit" — the
   *  cert's reference number (the cert PDF is attached separately). */
  typeTestCertRef: string;
  /** NC6 §2 "Is this the first Microgenerator connection at these premises?" —
   *  '' until confirmed. 'no' triggers the ESB do-not-connect warning. */
  firstConnection: '' | 'yes' | 'no';
}

export const DEFAULT_SERIALS: SerialState = {
  fittedModel: '', serial: '', acRatingKw: '', exportLimit: '',
  confirmed: false, mismatchFlagged: false, note: '', protectionConfirmed: false,
  ratedCurrentA: '', typeTestCertRef: '', firstConnection: '',
};

/** A cert captured on site — the REAL file, held as a data URL so it can be
 *  previewed, bundled into the submission pack, and (Sweep 8) uploaded to
 *  storage + hashed onto the record. `kind` drives how the pack embeds it. */
export interface CertFile {
  name: string;
  dataUrl: string;
  kind: 'image' | 'pdf';
}

export interface CertRecord {
  /** Safe Electric (RECI) completion cert — I.S. 10101. */
  reci?: CertFile;
  /** Signed Declaration of Works (→ the BER assessor). */
  dow?: CertFile;
  /** Inverter type-test cert — ESB require it ATTACHED to the NC6. */
  typeTest?: CertFile;
  /** Electrical single-line diagram — ESB require it attached to the NC6. */
  sld?: CertFile;
  /** Photo of the inverter rating/serial plate — feeds the Compliance Vision
   *  cross-check of serial + AC rating + model against what the crew typed. */
  plate?: CertFile;
}

export interface FieldRecord {
  serials: SerialState;
  signature: string | null; // dataURL today; storage URL + hash at Sweep 8
  certs: CertRecord;
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
      certs: (data.certs ?? {}) as CertRecord,
    };
  } catch {
    return null;
  }
}
