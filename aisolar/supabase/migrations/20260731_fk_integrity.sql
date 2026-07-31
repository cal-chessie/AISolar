-- 20260731_fk_integrity.sql -- declare the missing child FKs so PostgREST can embed AND the schema visualiser lays out by relationship (no orphan blob). Add-only.

do $mig$ begin
  if not exists (select 1 from pg_constraint where conname='contracts_lead_id_fkey') then
    alter table public.contracts add constraint contracts_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname='invoices_lead_id_fkey') then
    alter table public.invoices add constraint invoices_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete cascade; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='sources' and column_name='brand_id')
     and not exists (select 1 from pg_constraint where conname='sources_brand_id_fkey') then
    alter table public.sources add constraint sources_brand_id_fkey foreign key (brand_id) references public.brands(id) on delete cascade; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='brands' and column_name='tenant_id')
     and exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id')
     and not exists (select 1 from pg_constraint where conname='brands_tenant_profile_fkey') then
    null; -- tenant_id is a free uuid (four-layer model), no tenants table to reference; intentionally left unconstrained
  end if;
end $mig$;

-- hub connection: a lead originates from a brand (SET NULL so deleting a brand never deletes leads)

do $mig$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='origin_brand_id')
     and not exists (select 1 from pg_constraint where conname='leads_origin_brand_id_fkey') then
    alter table public.leads add constraint leads_origin_brand_id_fkey foreign key (origin_brand_id) references public.brands(id) on delete set null; end if;
end $mig$;
