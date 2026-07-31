-- 20260731_lead_doors.sql -- per-door source keys + resolve_lead_door(): multi-tenant, secure lead ingestion. Each brand gets a keyed website door; the key resolves brand+tenant, so ingest-lead sets origin_brand_id + tenant correctly. See docs/AIGRIDS.md (front door).

-- one keyed website door per brand (the secure, multi-tenant front door)
insert into public.sources (brand_id, tenant_id, source_key, kind, label, active)
select b.id, b.tenant_id, 'src_'||encode(gen_random_bytes(18),'hex'), 'website', b.name||' website', true
from public.brands b
where not exists (select 1 from public.sources s where s.brand_id=b.id and s.kind='website');

-- the resolver: a door key -> its brand + tenant. security definer so ingest-lead (anon) can call it.
create or replace function public.resolve_lead_door(p_source_key text)
 returns table(brand_id uuid, tenant_id uuid, brand_name text, source_kind text)
 language sql stable security definer set search_path to 'public' as $f$
  select s.brand_id, coalesce(s.tenant_id, b.tenant_id), b.name, s.kind
  from public.sources s join public.brands b on b.id=s.brand_id
  where s.source_key=p_source_key and s.active and b.active
  limit 1;
$f$;
