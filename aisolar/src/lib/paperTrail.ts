/**
 * paperTrail — the WRITE layer for the ESB paper trail (Cal, 4 Aug: "worst thing
 * is a mistake in the paper trail"). `lead_documents` and `esb_submissions` were
 * designed and migrated but NOTHING wrote them — the whole "agents prepare, track
 * and chase; humans sign and submit" story rested on empty tables. This wires it.
 *
 * Laws it holds:
 *  - ONE vocabulary: every doc_type resolves through docVocab (no hardcoded ids).
 *  - Truth-pass: esb_submissions.esb_reference / submitted_* stay NULL until a
 *    REAL portal submission. A seal is a seal; a submission is a submission.
 *  - Demo-safe: with no session (demo / signed-out) every write is a no-op, so
 *    the demo never fabricates DB rows. Verifies for real at deploy, authed.
 *  - Fire-and-forget: a failed write never blocks the human flow; it logs.
 */
import { supabase } from '@/integrations/supabase/client';
import { docTypeFromCert, type DocType, type CertKey } from '@/lib/docVocab';

async function hasSession(): Promise<boolean> {
  try { return !!(await supabase.auth.getSession()).data.session; } catch { return false; }
}

/** SHA-256 hex of a data URL's bytes — the same seal shape the pack uses. */
export async function sha256OfDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const b64 = dataUrl.split(',')[1] ?? '';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch { return null; }
}

export type DocStatus = 'not_started' | 'prepared' | 'awaiting_signature' | 'sent' | 'received' | 'complete';

export interface DocPatch {
  status?: DocStatus;
  source?: 'agent' | 'upload' | 'email-in' | 'installer';
  storage_path?: string;
  sha256?: string;
  size_bytes?: number;
  original_name?: string;
  detail?: string;
}

/**
 * Upsert one pack document (unique on lead_id + doc_type — one row per document
 * per lead). Records what we know now; fields fill in as the doc progresses.
 */
export async function recordDocument(leadId: string, docType: DocType, patch: DocPatch = {}): Promise<void> {
  if (!(await hasSession())) return; // demo / signed-out — never fabricate a row
  try {
    const { error } = await supabase.from('lead_documents').upsert(
      { lead_id: leadId, doc_type: docType, updated_at: new Date().toISOString(), ...patch },
      { onConflict: 'lead_id,doc_type' },
    );
    if (error) console.warn('[paperTrail] recordDocument', docType, error.message);
  } catch (e) { console.warn('[paperTrail] recordDocument threw', e); }
}

/**
 * Record a cert captured at the commissioning gate — resolves the fieldRecord
 * cert key to its canonical doc_type, seals the file, and marks it received.
 */
export async function recordCert(leadId: string, cert: CertKey, dataUrl: string, name?: string): Promise<void> {
  const docType = docTypeFromCert(cert);
  if (!docType) return;
  const sha256 = await sha256OfDataUrl(dataUrl);
  await recordDocument(leadId, docType, {
    status: 'received', source: 'installer',
    ...(sha256 ? { sha256 } : {}), ...(name ? { original_name: name } : {}),
  });
}

export interface SealInput {
  form: 'nc6' | 'nc7' | 'nc5' | 'nc8';
  packSha256: string;
  pageCount?: number;
  mprn?: string;
  installerName?: string;
  reciNumber?: string;
  completenessReady: boolean;
  missing: string[];
  packStoragePath?: string;
  packDocumentId?: string;
}

/**
 * Seal a submission pack → one esb_submissions row (status 'sealed'). Captures
 * the seal + the completeness snapshot at seal time. esb_reference stays NULL —
 * a seal is NOT a submission (truth-pass). Returns the row id, or null.
 */
export async function sealSubmission(leadId: string, input: SealInput): Promise<string | null> {
  if (!(await hasSession())) return null;
  try {
    const { data, error } = await supabase.from('esb_submissions').insert({
      lead_id: leadId,
      form: input.form,
      pack_sha256: input.packSha256,
      pack_storage_path: input.packStoragePath ?? null,
      pack_document_id: input.packDocumentId ?? null,
      page_count: input.pageCount ?? null,
      mprn: input.mprn ?? null,
      installer_name: input.installerName ?? null,
      reci_number: input.reciNumber ?? null,
      completeness_ready: input.completenessReady,
      missing: input.missing,
      status: 'sealed',
    }).select('id').single();
    if (error) { console.warn('[paperTrail] sealSubmission', error.message); return null; }
    return data?.id ?? null;
  } catch (e) { console.warn('[paperTrail] sealSubmission threw', e); return null; }
}

/**
 * Record a REAL portal submission (the browser portal_submitter agent's write-
 * back, or a human logging the ref). Only NOW does esb_reference get set — and
 * only with a real value the caller supplies. No ref, no 'submitted'.
 */
export async function markSubmitted(submissionId: string, esbReference: string): Promise<void> {
  if (!esbReference.trim()) return; // truth-pass: never mark submitted without a real ref
  if (!(await hasSession())) return;
  try {
    const { error } = await supabase.from('esb_submissions').update({
      status: 'submitted', esb_reference: esbReference.trim(), submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', submissionId);
    if (error) console.warn('[paperTrail] markSubmitted', error.message);
  } catch (e) { console.warn('[paperTrail] markSubmitted threw', e); }
}

export async function markSubmissionOutcome(submissionId: string, outcome: 'accepted' | 'rejected', rejectReason?: string): Promise<void> {
  if (!(await hasSession())) return;
  try {
    const { error } = await supabase.from('esb_submissions').update({
      status: outcome, reject_reason: outcome === 'rejected' ? (rejectReason ?? null) : null, updated_at: new Date().toISOString(),
    }).eq('id', submissionId);
    if (error) console.warn('[paperTrail] markSubmissionOutcome', error.message);
  } catch (e) { console.warn('[paperTrail] markSubmissionOutcome threw', e); }
}

export interface LeadDocumentRow { doc_type: DocType; status: DocStatus; sha256?: string; source?: string; updated_at?: string }
export interface EsbSubmissionRow {
  id: string; form: string; status: string; pack_sha256?: string; esb_reference?: string | null;
  completeness_ready: boolean; missing: string[]; sealed_at?: string; submitted_at?: string | null;
}

/** Read the paper trail for a lead — the documents + the submission history. */
export async function getPaperTrail(leadId: string): Promise<{ documents: LeadDocumentRow[]; submissions: EsbSubmissionRow[] }> {
  if (!(await hasSession())) return { documents: [], submissions: [] };
  try {
    const [d, s] = await Promise.all([
      supabase.from('lead_documents').select('doc_type,status,sha256,source,updated_at').eq('lead_id', leadId),
      supabase.from('esb_submissions').select('id,form,status,pack_sha256,esb_reference,completeness_ready,missing,sealed_at,submitted_at').eq('lead_id', leadId).order('sealed_at', { ascending: false }),
    ]);
    return { documents: (d.data ?? []) as LeadDocumentRow[], submissions: (s.data ?? []) as EsbSubmissionRow[] };
  } catch { return { documents: [], submissions: [] }; }
}
