/**
 * serverStore — the CUTOVER adapter (Sweep 8, 30 Jul).
 *
 * The bridge between the localStorage stores and their Postgres home.
 * CUTOVER STATE (3 Aug): the READ-FLIP is BUILT — hydrateTenantSettings()
 * (called from useAuth on sign-in/boot) makes the DB the source of truth the
 * moment a session exists: every tenant_settings row lands in its store's
 * localStorage key + fires its change event; the stores are the DB's cache
 * from then on, kept in step by the dual-writes below. Everything stays
 * fire-and-forget: no session / offline / table-not-deployed → silent no-op,
 * the app behaves identically. Tenant via resolveTenantId (user_roles ladder —
 * the JWT claim is a fallback, not a dependency).
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

/**
 * resolveTenantId — THE one tenant resolver (the cutover unify, 3 Aug).
 *
 * The old split: RLS resolves tenant from `user_roles`; this file read only the
 * JWT claim (absent pre-A1) → every owner-settings write silently no-op'd.
 * Now ONE ladder, same order the app trusts elsewhere (leadWrites):
 *   profiles.tenant_id → user_roles (a REAL tenant row, never the global-admin
 *   NULL row) → app_metadata.tenant_id (the A1 JWT claim, when it lands).
 * Cached per user id — settings saves shouldn't re-query on every keystroke.
 */
const tenantCache = new Map<string, string | null>();
export async function resolveTenantId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    if (tenantCache.has(user.id)) return tenantCache.get(user.id) ?? null;
    let tenant: string | null = null;
    const prof = await db.from('profiles').select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
    if (prof.data?.tenant_id) tenant = prof.data.tenant_id as string;
    if (!tenant) {
      const role = await db.from('user_roles').select('tenant_id').eq('user_id', user.id)
        .not('tenant_id', 'is', null).limit(1).maybeSingle();
      tenant = (role.data?.tenant_id as string) ?? null;
    }
    if (!tenant) tenant = (user.app_metadata as { tenant_id?: string } | undefined)?.tenant_id ?? null;
    tenantCache.set(user.id, tenant);
    return tenant;
  } catch {
    return null;
  }
}

/** Fire-and-forget guard: swallow everything — offline, undeployed, RLS-denied.
 *  Accepts PromiseLike: a raw Supabase query builder is a THENABLE without
 *  .catch — passing one straight in threw "p.catch is not a function" on every
 *  consent click (found on the 5 Aug audit). Promise.resolve() normalises it. */
function quiet(p: PromiseLike<unknown>) {
  Promise.resolve(p).catch(() => { /* dual-write is best-effort until cutover flips the order */ });
}

type TenantSettingKey = 'tenant_brand' | 'proposal_terms' | 'finance_config' | 'company_compliance' | 'pricing' | 'ai_knowledge';

/** tenant_settings upsert — the server home for the five owner-settings stores.
 *  Tenant via resolveTenantId (user_roles-backed — works TODAY, no JWT claim). */
export function pushTenantSetting(key: TenantSettingKey, value: unknown) {
  quiet((async () => {
    if (!(await hasSession())) return;
    const tenantId = await resolveTenantId();
    if (!tenantId) return; // platform admin with no tenant home yet — localStorage remains the record
    await db.from('tenant_settings').upsert(
      { tenant_id: tenantId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,key' },
    );
  })());
}

/** DB key ↔ the localStorage key each store reads + the event its UIs listen on. */
const SETTING_STORES: Record<TenantSettingKey, { storageKey: string; event: string }> = {
  tenant_brand:       { storageKey: 'aisolar_tenant_brand',       event: 'tenant-brand-changed' },
  company_compliance: { storageKey: 'aisolar_company_compliance', event: 'company-compliance-changed' },
  finance_config:     { storageKey: 'aisolar.finance.v1',         event: 'finance-config-changed' },
  proposal_terms:     { storageKey: 'aisolar.proposalTerms.v1',   event: 'proposal-terms-changed' },
  pricing:            { storageKey: 'aisolar.pricing.v1',         event: 'pricing-config-changed' },
  ai_knowledge:       { storageKey: 'aisolar_ai_knowledge',       event: 'ai-knowledge-changed' },
};

/**
 * hydrateTenantSettings — THE READ-FLIP (GO_LIVE ②, 3 Aug).
 *
 * On sign-in, the tenant's SAVED settings become the source of truth: every
 * tenant_settings row for the resolved tenant is written into the exact
 * localStorage key its store reads, and the store's change event fires so any
 * mounted UI updates live. From that moment the stores are a CACHE of the DB
 * (dual-write keeps them in step); a key with no DB row keeps its local value
 * (offline-first grace, and nothing to hydrate on a fresh tenant). Same-device
 * work never regresses; cross-device finally converges. Fire-and-forget —
 * an offline boot or an undeployed table changes nothing.
 */
let hydratedFor: string | null = null; // once per signed-in user (useAuth mounts everywhere)
export function hydrateTenantSettings() {
  quiet((async () => {
    if (!(await hasSession())) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || hydratedFor === u.user.id) return;
    hydratedFor = u.user.id;
    const tenantId = await resolveTenantId();
    if (!tenantId) return;
    const { data } = await db.from('tenant_settings').select('key, value').eq('tenant_id', tenantId);
    for (const row of (data ?? []) as Array<{ key: TenantSettingKey; value: unknown }>) {
      const store = SETTING_STORES[row.key];
      if (!store || row.value == null) continue;
      try {
        localStorage.setItem(store.storageKey, JSON.stringify(row.value));
        window.dispatchEvent(new CustomEvent(store.event));
      } catch { /* private mode — the getters fall back to defaults */ }
    }
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
