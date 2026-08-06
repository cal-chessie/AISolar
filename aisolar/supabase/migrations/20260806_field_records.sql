-- 20260806_field_records — durable mirror of the AIField job record.
--
-- WHY: the field record (serial attestation, AI compliance verdicts, handover
-- sign-off — i.e. the COMMISSIONING GATE) lived only in the installer's browser
-- localStorage. A crew that cleared their cache lost the gate mid-job. This adds
-- a compact server mirror so the attestation survives a cache clear / new device.
--
-- SHAPE: localStorage stays the offline-first working cache (crews on roofs with
-- no signal). Every mutation best-effort upserts here; opening a job hydrates from
-- here when local is missing/older. Heavy cert data-URLs are NOT stored (photos go
-- to the project-documents bucket) — only the structured attestation + cert
-- presence. `installed_equipment` remains the Sweep-8 normalized target; this jsonb
-- mirror closes the data-loss hole now with minimal, reversible surface.

create table if not exists public.field_records (
  lead_id    uuid primary key references public.leads(id)   on delete cascade,
  tenant_id  uuid not null      references public.tenants(id) on delete cascade,
  record     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.field_records is
  'Durable mirror of the AIField job record (serials/verdicts/handover). Offline-first cache is localStorage; this survives a cache clear. Staff-only.';

-- tenant_id is stamped FROM the lead server-side (client can never set/spoof it);
-- updated_at is bumped on every write for last-write-wins hydrate.
create or replace function public.field_records_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select l.tenant_id into new.tenant_id from public.leads l where l.id = new.lead_id;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_field_records_stamp on public.field_records;
create trigger trg_field_records_stamp
  before insert or update on public.field_records
  for each row execute function public.field_records_stamp();

create index if not exists idx_field_records_tenant on public.field_records(tenant_id);

alter table public.field_records enable row level security;

-- Staff-only: own_lead() is the WRITE gate (tenant staff, NO customer-token path).
-- The field record is installer attestation — customers never read or write it.
drop policy if exists field_records_select on public.field_records;
create policy field_records_select on public.field_records
  for select using (public.own_lead(lead_id));

drop policy if exists field_records_write on public.field_records;
create policy field_records_write on public.field_records
  for all using (public.own_lead(lead_id)) with check (public.own_lead(lead_id));
