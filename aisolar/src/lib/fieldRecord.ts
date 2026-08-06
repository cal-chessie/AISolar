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

/** Handover sign-off — BOTH parties, captured at the handover stage. eIDAS
 *  "simple electronic signature": the typed name IS the signature, backed by the
 *  handover event (who/when). Printed on the Declaration of Works + kept as the
 *  proof of handover. Same legal basis as the NC6/NC7 signatures. */
export interface HandoverSignoff {
  installerName?: string;   // the registered installer signing off
  homeownerName?: string;   // the homeowner accepting the works
  signedAt?: string;        // when both signed
}

/** The AI compliance-vision verdict for one artefact, PERSISTED so the pack
 *  records that it was checked (and blocks filing on a mismatch). Keyed by
 *  artefact kind ('type_test' | 'plate' | 'reci' | 'sld'). */
export interface ArtefactVerdictRecord {
  status: string;      // 'ok' | 'mismatch' | 'unreadable' | 'error'
  at: string;          // ISO — when the AI read it
  mismatchCount: number;
}

export interface FieldRecord {
  serials: SerialState;
  signature: string | null; // the drawn pad (customer) — kept alongside the names
  handover?: HandoverSignoff;
  certs: CertRecord;
  /** AI compliance-vision verdicts per artefact — the moat's persisted evidence. */
  verdicts?: Record<string, ArtefactVerdictRecord>;
}

/** Persist the AI verdict for an artefact into the same offline-first store the
 *  job view uses. So the compliance vision RECORDS what it read — not read-and-
 *  forget — and a mismatch can block the pack (see nc6Completeness). */
export function setArtefactVerdict(leadId: string, kind: string, verdict: ArtefactVerdictRecord): void {
  try {
    const key = `jobview_v2_${leadId}`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    data.verdicts = { ...(data.verdicts ?? {}), [kind]: verdict };
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('field-record-changed', { detail: { leadId } }));
  } catch { /* ignore */ }
}

/** Record a handover sign-off name (eIDAS simple signature) into the same
 *  offline-first store JobViewV2 uses. Self-contained so the handover UI can
 *  write without threading state through the whole job view. */
export function setHandoverSignoff(leadId: string, patch: Partial<HandoverSignoff>): void {
  try {
    const key = `jobview_v2_${leadId}`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    data.handover = { ...(data.handover ?? {}), ...patch };
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('field-record-changed', { detail: { leadId } }));
  } catch { /* ignore */ }
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
      handover: data.handover ?? undefined,
      certs: (data.certs ?? {}) as CertRecord,
    };
  } catch {
    return null;
  }
}
