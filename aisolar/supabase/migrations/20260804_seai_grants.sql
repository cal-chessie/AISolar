-- 20260804_seai_grants.sql
-- The SEAI Domestic Solar PV grant LIFECYCLE, one row per lead. Backs
-- src/lib/seaiGrant.ts (localStorage-first in the demo, this table when authed).
-- Tenant-scoped by the shared RLS floor: the customer can SEE their grant status
-- (can_see_lead — staff OR the lead's access-token), only staff can advance it
-- (own_lead). Idempotent + add-only.

create table if not exists public.seai_grants (
  lead_id    uuid primary key references public.leads(id) on delete cascade,
  status     text not null default 'not_started'
             check (status in (
               'not_started','offer_applied','offer_received','installed',
               'docs_shared','ber_booked','ber_published','dow_submitted',
               'paid','ineligible','offer_expired')),
  data       jsonb not null default '{}'::jsonb,  -- the full SeaiGrantRecord (refs, dates, proofs)
  updated_at timestamptz not null default now()
);

alter table public.seai_grants enable row level security;

-- SELECT: tenant staff OR the customer (their access-token) — grant status is
-- shown on the customer portal. WRITE: staff only (they advance the stages).
drop policy if exists seai_grants_sel on public.seai_grants;
create policy seai_grants_sel on public.seai_grants for select using (public.can_see_lead(lead_id));

drop policy if exists seai_grants_ins on public.seai_grants;
create policy seai_grants_ins on public.seai_grants for insert with check (public.own_lead(lead_id));

drop policy if exists seai_grants_upd on public.seai_grants;
create policy seai_grants_upd on public.seai_grants for update using (public.own_lead(lead_id)) with check (public.own_lead(lead_id));

drop policy if exists seai_grants_del on public.seai_grants;
create policy seai_grants_del on public.seai_grants for delete using (public.own_lead(lead_id));
