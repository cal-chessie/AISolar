-- 20260804_a1_tenants.sql
-- A1 DB foundation. The tenant MODEL already exists on V5 (has_tenant_access reads
-- user_roles.tenant_id; leads.tenant_id present) — the only gap is the parent
-- `tenants` table + the signup→tenant provisioning path. This adds both. Add-only.
--
-- Decisions locked (Cal, 4 Aug): one tenant per user (user_roles.tenant_id) ·
-- first-admin = whoever enters the card (the provision caller) · 7-day trial ·
-- per-seat billing (extra seat per added non-owner email — the `seats` field).

create table if not exists public.tenants (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  trading_name           text,
  county                 text,
  accent                 text,                       -- brand accent (white-label)
  logo_url               text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  seats                  int  not null default 1,    -- per-seat: +1 per added non-owner email
  trial_ends_at          timestamptz,
  created_by             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- FK user_roles.tenant_id → tenants(id). NOT VALID skips legacy rows (add-only,
-- can't fail on existing data); new rows are enforced.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_roles_tenant_id_fkey') then
    alter table public.user_roles
      add constraint user_roles_tenant_id_fkey
      foreign key (tenant_id) references public.tenants(id) on delete cascade not valid;
  end if;
end $$;

-- provision_tenant — the signup seam. The CARD-PAYER (the authenticated caller)
-- becomes admin of a fresh tenant with a 7-day trial. Idempotent: one tenant per
-- user, so a repeat call returns the existing tenant. Security-definer so it can
-- write past RLS; only ever call it for the caller's own signup.
create or replace function public.provision_tenant(
  p_name text, p_county text default null, p_trading_name text default null
) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare v_tenant uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'tenant name required'; end if;

  select tenant_id into v_tenant from public.user_roles
    where user_id = v_uid and tenant_id is not null limit 1;
  if v_tenant is not null then return v_tenant; end if;   -- already provisioned

  insert into public.tenants(name, county, trading_name, created_by, trial_ends_at)
    values (btrim(p_name), p_county, coalesce(nullif(btrim(p_trading_name), ''), btrim(p_name)),
            v_uid, now() + interval '7 days')
    returning id into v_tenant;

  -- card-payer = admin: grant the owner hats, tenant-stamped.
  insert into public.user_roles(user_id, role, tenant_id)
    select v_uid, r, v_tenant
    from unnest(array['admin','consultant','installer']::app_role[]) r
    where not exists (select 1 from public.user_roles ur where ur.user_id = v_uid and ur.role = r);
  -- the signup default is 'customer'; a tenant owner is staff, not a customer.
  delete from public.user_roles where user_id = v_uid and role = 'customer';

  return v_tenant;
end $$;

grant execute on function public.provision_tenant(text, text, text) to authenticated;

-- RLS: see/patch only your own tenant (platform admin sees all). INSERT is via the
-- security-definer RPC only, so direct inserts stay denied (no insert policy).
alter table public.tenants enable row level security;
drop policy if exists tenants_sel on public.tenants;
create policy tenants_sel on public.tenants for select
  using (public.is_platform_admin(auth.uid()) or public.has_tenant_access(auth.uid(), id));
drop policy if exists tenants_upd on public.tenants;
create policy tenants_upd on public.tenants for update
  using (public.has_tenant_access(auth.uid(), id))
  with check (public.has_tenant_access(auth.uid(), id));
