-- 20260802_tenant_settings_pricing_key.sql — admit the 'pricing' key.
-- VERIFIED LIVE (1–2 Aug audits): the CHECK allows 4 keys; pushTenantSetting
-- writes 5. 'pricing' (the admin equipment-pricing dial) violates the CHECK →
-- silently rejected by the fire-and-forget dual-write → the dial never persists
-- server-side and the proposal-drafter edge fn never sees a custom price.
-- Same widen pattern 20260730 used to admit 'company_compliance'.
-- Idempotent · non-destructive (constraint-only, no data touched).
alter table public.tenant_settings drop constraint if exists tenant_settings_key_check;
alter table public.tenant_settings add constraint tenant_settings_key_check
  check (key in ('proposal_terms','finance_config','tenant_brand','company_compliance','pricing'));
