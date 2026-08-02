-- 20260802_rls_floor_extension.sql — close the tables the 20260731 tenant-RLS
-- floor MISSED. Found by the 2 Aug live audit (pg_policies census): the floor
-- covered leads + 19 children, but five config/comms tables kept pre-floor
-- policies that are role-scoped or authenticated-any — NOT tenant-scoped:
--
--   tenant_settings        auth.role()='authenticated'  ← ANY signed-in user,
--                          ANY tenant, read AND write every tenant's pricing /
--                          brand / finance / RECI block. THE worst bleed.
--   conversation_messages  has_role staff (any tenant)  ← cross-tenant customer
--                          PII (the per-lead consultant+installer+coach thread).
--   sources                has_role staff (any tenant)  ← cross-tenant DOOR KEYS.
--   products               has_role staff (any tenant)  ← cross-tenant price
--                          overrides between competing installers.
--   feedback               has_role staff (any tenant)  ← cross-tenant owner feedback.
--
-- Pattern identical to 20260731_tenant_rls_floor: drop the loose policy, create
-- tenant-scoped ones on has_tenant_access (user_roles-backed; platform admin =
-- global). conversation_messages scopes through its conversation's lead via
-- can_see_lead (tenant staff OR the customer's x-access-token — same law as leads).
-- Idempotent. Policy-only — no data touched.

-- ── tenant_settings: the owner's own dials, the owner's tenant only ──────────
drop policy if exists tenant_settings_staff on public.tenant_settings;
drop policy if exists tenant_settings_sel on public.tenant_settings;
drop policy if exists tenant_settings_ins on public.tenant_settings;
drop policy if exists tenant_settings_upd on public.tenant_settings;
drop policy if exists tenant_settings_del on public.tenant_settings;
create policy tenant_settings_sel on public.tenant_settings for select
  using (public.has_tenant_access(auth.uid(), tenant_id));
create policy tenant_settings_ins on public.tenant_settings for insert
  with check (public.has_tenant_access(auth.uid(), tenant_id));
create policy tenant_settings_upd on public.tenant_settings for update
  using (public.has_tenant_access(auth.uid(), tenant_id))
  with check (public.has_tenant_access(auth.uid(), tenant_id));
create policy tenant_settings_del on public.tenant_settings for delete
  using (public.has_tenant_access(auth.uid(), tenant_id));

-- ── conversation_messages: through the conversation's lead (tenant or token) ─
drop policy if exists conv_messages_staff on public.conversation_messages;
drop policy if exists conv_messages_sel on public.conversation_messages;
drop policy if exists conv_messages_ins on public.conversation_messages;
create policy conv_messages_sel on public.conversation_messages for select
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id and public.can_see_lead(c.lead_id)));
create policy conv_messages_ins on public.conversation_messages for insert
  with check (exists (select 1 from public.conversations c
                      where c.id = conversation_id and public.can_see_lead(c.lead_id)));

-- ── sources: the door keys — the owning tenant only ──────────────────────────
drop policy if exists sources_staff on public.sources;
drop policy if exists sources_sel on public.sources;
drop policy if exists sources_write on public.sources;
create policy sources_sel on public.sources for select
  using (public.has_tenant_access(auth.uid(), tenant_id));
create policy sources_write on public.sources for all
  using (public.has_tenant_access(auth.uid(), tenant_id))
  with check (public.has_tenant_access(auth.uid(), tenant_id));

-- ── products: global catalog rows (tenant_id null) readable by all staff;
--    a tenant's own rows (custom products, price overrides) = that tenant only ─
drop policy if exists products_staff on public.products;
drop policy if exists products_sel on public.products;
drop policy if exists products_write on public.products;
create policy products_sel on public.products for select
  using (tenant_id is null or public.has_tenant_access(auth.uid(), tenant_id));
create policy products_write on public.products for all
  using (tenant_id is not null and public.has_tenant_access(auth.uid(), tenant_id))
  with check (tenant_id is not null and public.has_tenant_access(auth.uid(), tenant_id));

-- ── feedback: the tenant's own ───────────────────────────────────────────────
drop policy if exists feedback_staff on public.feedback;
drop policy if exists feedback_own on public.feedback;
create policy feedback_own on public.feedback for all
  using (public.has_tenant_access(auth.uid(), tenant_id))
  with check (public.has_tenant_access(auth.uid(), tenant_id));

-- NOTE deliberately untouched: brands (name/colour only — semi-public, writes
-- already admin-gated) · consent_records (admin-only already). Edge functions
-- run service_role and bypass RLS — agent-drain/ingest-lead unaffected.
