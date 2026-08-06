-- 20260806_perf_indexes.sql
-- Perf hardening (senior-team pre-flight, 6 Aug): two RLS-hot columns were
-- unindexed. has_tenant_access/is_tenant_admin query user_roles by
-- (user_id, tenant_id) on EVERY tenant-gated request — the single hottest path
-- in the app — and user_roles.tenant_id had no index. notifications.lead_id
-- (RLS can_see_lead/own_lead + the bell) was also unindexed. Add-only.
create index if not exists idx_user_roles_user_tenant on public.user_roles(user_id, tenant_id);
create index if not exists idx_notifications_lead_id on public.notifications(lead_id);
