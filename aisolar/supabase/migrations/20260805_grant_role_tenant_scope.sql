-- 20260805_grant_role_tenant_scope.sql
-- 🚨 CRITICAL (deep sweep, 5 Aug): grant_role() was a PLATFORM-admin escalation
-- backdoor. SECURITY DEFINER (bypasses RLS), EXECUTE granted to `authenticated`,
-- its gate was the tenant-blind has_role(), and it inserted user_roles with NO
-- tenant_id → tenant_id NULL + 'admin' = PLATFORM admin (god mode over every
-- tenant). Any tenant admin could grant_role('own-email','admin') and own the
-- whole platform — bypassing the user_roles RLS fix entirely. Unused by the app
-- (legacy) but RPC-reachable.
--
-- FIX (belt + braces): (1) rewrite tenant-scoped — caller must be a tenant admin,
-- the grant is stamped to THAT tenant, never platform; (2) revoke EXECUTE from
-- anon/authenticated so it isn't RPC-reachable at all until a feature needs it.

create or replace function public.grant_role(p_target_email text, p_role app_role)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_target uuid; v_tenant uuid;
begin
  select tenant_id into v_tenant from public.user_roles
    where user_id = auth.uid() and role = 'admin' and tenant_id is not null
    order by tenant_id limit 1;
  if v_tenant is null then
    raise exception 'Only a tenant admin may grant roles';
  end if;
  select id into v_target from auth.users where lower(email) = lower(p_target_email) limit 1;
  if v_target is null then raise exception 'No user with email %', p_target_email; end if;
  insert into public.user_roles(user_id, role, tenant_id)   -- tenant-stamped; never platform
  values (v_target, p_role, v_tenant)
  on conflict do nothing;
end $$;

revoke execute on function public.grant_role(text, app_role) from anon, authenticated;
revoke execute on function public.provision_tenant(text, text, text) from anon;  -- self-guards on auth.uid() anyway
