/**
 * serverStore — the CUTOVER adapter (Sweep 8, 30 Jul).
 *
 * The dual-write bridge between the localStorage stores (offline-first, the
 * source of truth TODAY) and their Postgres homes (the source of truth after
 * deploy verification). Every save below is fire-and-forget: it never throws,
 * never blocks the UI, and silently no-ops when there is no session or the
 * table isn't deployed yet — so the app behaves identically before and after
 * the backend lands. Flip order (read DB first) happens in the cutover pass
 * AFTER `supabase db push` is verified live, never before.
 *
 * Table map (migrations 20260727 / 20260730 / 20260801):
 *   tenant_settings(tenant_id, key, value)  ← tenant_brand · proposal_terms ·
 *                                              finance_config · company_compliance ·
 *                                              pricing (admin equipment rates)
 *   consent_records                          ← gdpr banner (append-only)
 *   feedback                                 ← owner-cockpit feedback
 *   installed_equipment                      ← fieldRecord.serials (the gate)
 *   lead_touchpoints                         ← touch history
 *
 * NOTE on types: src/integrations/supabase/types.ts is generated from the OLD
 * live schema and does not know the new tables yet. The `db` cast below is the
 * documented, temporary bridge — regenerate types after deploy
 * (`supabase gen types typescript`) and remove the cast in the cutover pass.
 */
import { supabase } from '@/integrations/supabase/client';
import type { SerialState } from '@/lib/fieldRecord';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** True when a real signed-in session exists (never in anonymous/demo use). */
async function hasSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

/** Fire-and-forget guard: swallow everything — offline, undeployed, RLS-denied. */
function quiet(p: Promise<unknown>) {
  p.catch(() => { /* dual-write is best-effort until cutover flips the order */ });
}

/** tenant_settings upsert — the server home for the four owner-settings stores. */
export function pushTenantSetting(
  key: 'tenant_brand' | 'proposal_terms' | 'finance_config' | 'company_compliance' | 'pricing',
  value: unknown,
) {
  quiet((async () => {
    if (!(await hasSession())) return;
    const { data: u } = await supabase.auth.getUser();
    const tenantId = (u.user?.app_metadata as { tenant_id?: string } | undefined)?.tenant_id ?? null;
    if (!tenantId) return; // no tenant claim yet (pre-A1) — localStorage remains the record
    await db.from('tenant_settings').upsert(
      { tenant_id: tenantId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,key' },
    );
  })());
}

/** consent_records append — GDPR trail. Anonymous-safe: writes only the hash-able ref. */
export function pushConsent(subjectRef: string, choices: Record<string, boolean>, granted: boolean, source?: string) {
  quiet(db.from('consent_records').insert({
    subject_ref: subjectRef, choices, granted, source: source ?? 'cookie_banner',
  }));
}

/** feedback append — the owner-cockpit store the docs never held. */
export function pushFeedback(context: string, body: string) {
  quiet((async () => {
    if (!(await hasSession())) return;
    const { data: u } = await supabase.auth.getUser();
    await db.from('feedback').insert({ context, body, author_ref: u.user?.id ?? null });
  })());
}

/** installed_equipment upsert — the commissioning-gate attestation (fieldRecord bridge).
 *  Only ever called with CONFIRMED gate data; attested_by = the signed-in installer. */
export function pushInstalledEquipment(leadId: string, s: SerialState) {
  quiet((async () => {
    if (!(await hasSession())) return;
    const { data: u } = await supabase.auth.getUser();
    await db.from('installed_equipment').upsert({
      lead_id: leadId, unit_index: 1,
      fitted_model: s.fittedModel, serial: s.serial, ac_rating_kw: s.acRatingKw,
      export_limit: s.exportLimit, rated_current_a: s.ratedCurrentA,
      type_test_cert_ref: s.typeTestCertRef, first_connection: s.firstConnection || null,
      protection_confirmed: s.protectionConfirmed, mismatch_flagged: s.mismatchFlagged,
      note: s.note, confirmed: s.confirmed,
      attested_by: u.user?.id ?? null,
      attested_at: s.confirmed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'lead_id,unit_index' });
  })());
}

/** lead_touchpoints append — the in-memory record the sweep notes flagged. */
export function pushTouchpoint(leadId: string, kind: string, summary?: string, actorRole?: string) {
  quiet((async () => {
    if (!(await hasSession())) return;
    const { data: u } = await supabase.auth.getUser();
    await db.from('lead_touchpoints').insert({
      lead_id: leadId, kind, summary: summary ?? null,
      actor_role: actorRole ?? null, actor_ref: u.user?.id ?? null,
    });
  })());
}
