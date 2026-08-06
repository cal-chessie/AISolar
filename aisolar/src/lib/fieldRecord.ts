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

import { supabase } from '@/integrations/supabase/client';
import { isDemoMode } from './demoMode';

/** Sandbox guard — never write real field-record rows while the owner is on the
 *  demo tour (mirrors leadWrites/notify). */
const SANDBOX = () => isDemoMode();

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

/** Shared local writer — mutate the offline-first cache, stamp `_updatedAt` (for
 *  last-write-wins hydrate) and fan out the change event. localStorage is the
 *  crew's offline source; the server mirror is best-effort on top. */
function writeLocal(leadId: string, mutate: (d: Record<string, unknown>) => void): void {
  try {
    const key = `jobview_v2_${leadId}`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    mutate(data);
    data._updatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('field-record-changed', { detail: { leadId } }));
  } catch { /* ignore */ }
}

/** What goes to the server mirror: the structured ATTESTATION only. Cert files
 *  are stripped to presence (name/kind) — the real bytes live in the
 *  project-documents bucket, so the row stays small and can't blow a jsonb/quota
 *  limit. */
function stripForDb(data: Record<string, any>): Record<string, unknown> {
  const certs = data.certs
    ? Object.fromEntries(Object.entries(data.certs).map(([k, v]: [string, any]) =>
        [k, v ? { name: v.name, kind: v.kind } : v]))
    : undefined;
  return {
    serials: data.serials,
    verdicts: data.verdicts,
    handoverSignoff: data.handoverSignoff,   // eIDAS names — own key (see setHandoverSignoff)
    signature: data.signature,
    certs,
    // checklist progress (small booleans) so a cache-clear loses nothing, not just the gate
    preInstall: data.preInstall, roof: data.roof, electrical: data.electrical,
    commissioning: data.commissioning, handover: data.handover, photos: data.photos,
  };
}

/** Best-effort upsert of the field record to the durable server mirror
 *  (`field_records`). Demo-guarded (no real rows in the sandbox) and offline-safe
 *  — a failed write leaves localStorage as the source, so the crew loses nothing.
 *  tenant_id is stamped server-side from the lead; RLS (`own_lead`) authorises. */
export async function pushFieldRecord(leadId: string): Promise<void> {
  if (SANDBOX()) return;
  try {
    const raw = localStorage.getItem(`jobview_v2_${leadId}`);
    if (!raw) return;
    const data = JSON.parse(raw);
    await supabase.from('field_records').upsert(
      { lead_id: leadId, record: stripForDb(data) },
      { onConflict: 'lead_id' },
    );
  } catch { /* offline / best-effort — localStorage still holds it */ }
}

/** Pull the server mirror into localStorage when the local cache is missing or
 *  older — the cache-clear / new-device case (#27: the crew must not lose the
 *  commissioning gate). Last-write-wins by `updated_at`. Returns true if it
 *  adopted the server copy. Call on job open. */
export async function hydrateFieldRecord(leadId: string): Promise<boolean> {
  if (SANDBOX()) return false;
  try {
    const { data, error } = await supabase
      .from('field_records')
      .select('record, updated_at')
      .eq('lead_id', leadId)
      .maybeSingle();
    if (error || !data?.record) return false;
    const key = `jobview_v2_${leadId}`;
    const localRaw = localStorage.getItem(key);
    const local = localRaw ? JSON.parse(localRaw) : null;
    const remoteAt = data.updated_at ? Date.parse(data.updated_at) : 0;
    const localAt = local?._updatedAt ? Date.parse(local._updatedAt) : 0;
    if (local && localAt >= remoteAt) return false; // local is fresher — keep it
    const merged = { ...(local ?? {}), ...(data.record as object), _updatedAt: data.updated_at };
    localStorage.setItem(key, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('field-record-changed', { detail: { leadId } }));
    return true;
  } catch { return false; }
}

/** Persist the AI verdict for an artefact into the offline-first store AND the
 *  server mirror. So the compliance vision RECORDS what it read — not read-and-
 *  forget — and a mismatch can block the pack (see nc6Completeness) even on a
 *  fresh device. */
export function setArtefactVerdict(leadId: string, kind: string, verdict: ArtefactVerdictRecord): void {
  writeLocal(leadId, (d) => { d.verdicts = { ...((d.verdicts as object) ?? {}), [kind]: verdict }; });
  void pushFieldRecord(leadId);
}

/** Record a handover sign-off name (eIDAS simple signature) into the offline-first
 *  store AND the server mirror. Self-contained so the handover UI can write
 *  without threading state through the whole job view. */
export function setHandoverSignoff(leadId: string, patch: Partial<HandoverSignoff>): void {
  // Distinct key from JobViewV2's `handover` TOGGLE list (both share this record):
  // the signoff object lives under `handoverSignoff`, so the eIDAS names that print
  // on the SEAI Declaration of Works can't be clobbered by a checklist tick.
  writeLocal(leadId, (d) => { d.handoverSignoff = { ...((d.handoverSignoff as object) ?? {}), ...patch }; });
  void pushFieldRecord(leadId);
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
      handover: (data.handoverSignoff as HandoverSignoff) ?? undefined,   // eIDAS signoff (own key; deconflicted from the toggle list)
      certs: (data.certs ?? {}) as CertRecord,
      verdicts: data.verdicts ?? undefined,   // FIX: was dropped — the mismatch block read undefined
    };
  } catch {
    return null;
  }
}
