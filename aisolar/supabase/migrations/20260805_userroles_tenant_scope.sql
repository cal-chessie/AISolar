-- 20260805_userroles_tenant_scope.sql
-- 🚨 CRITICAL FIX (deep hardening sweep, 5 Aug): cross-tenant privilege escalation.
--
-- The user_roles admin policies trusted `has_role(uid,'admin')`, which is NOT
-- tenant-scoped — it returns true if you are an admin of ANY tenant. Combined
-- with a permissive `ALL` policy whose WITH CHECK never referenced the NEW row's
-- tenant, any tenant admin could:
--     insert into user_roles(user_id, tenant_id, role)
--     values (own_uid, VICTIM_TENANT, 'admin');
-- …granting themselves admin on another tenant → full read/write of that tenant's
-- customers, surveys, grants, everything. Catastrophic with 40 installer-tenants.
--
-- FIX: a tenant-scoped admin check, and every admin policy re-scoped to the
-- TARGET row's tenant. The platform admin (role='admin', tenant_id IS NULL) still
-- manages everything (is_platform_admin short-circuits). Self-read is untouched,
-- so login / role resolution keep working. is_tenant_admin is SECURITY DEFINER
-- (bypasses RLS → no recursion), search_path pinned.

create or replace function public.is_tenant_admin(p_uid uuid, p_tenant uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select public.is_platform_admin(p_uid)
      or exists (
        select 1 from public.user_roles
        where user_id = p_uid and tenant_id = p_tenant and role = 'admin'
      );
$$;

-- Drop the tenant-blind admin policies (the vector).
drop policy if exists "Admins can manage all roles"     on public.user_roles;
drop policy if exists "Admins can grant roles"          on public.user_roles;
drop policy if exists "Admins can update roles"         on public.user_roles;
drop policy if exists "Admins can revoke roles"         on public.user_roles;
drop policy if exists "Admins can view all user roles"  on public.user_roles;

-- Recreate them TENANT-SCOPED — an admin manages roles only within their own
-- tenant; the platform admin manages all (via is_tenant_admin → is_platform_admin).
create policy "Tenant admins grant roles" on public.user_roles
  for insert with check (public.is_tenant_admin(auth.uid(), tenant_id));

create policy "Tenant admins update roles" on public.user_roles
  for update using (public.is_tenant_admin(auth.uid(), tenant_id))
         with check (public.is_tenant_admin(auth.uid(), tenant_id));

create policy "Tenant admins revoke roles" on public.user_roles
  for delete using (public.is_tenant_admin(auth.uid(), tenant_id));

create policy "Tenant admins view tenant roles" on public.user_roles
  for select using (public.is_tenant_admin(auth.uid(), tenant_id));

-- NOTE: the self-read policies ("Users can view own roles") are intentionally
-- KEPT — a user must always see their own roles for login + role resolution.
