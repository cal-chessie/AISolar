-- 20260731_aigrids.sql -- the rails: any-industry routing, spec-as-data. Records via gate_bridge.offer (20260731_gate_bridge.sql). See docs/AIGRIDS.md.

create schema if not exists aigrids;
comment on schema aigrids is 'The rails. Any-industry routing intelligence. Reads a per-domain SPEC (data) and routes; records every decision via gate_bridge.offer. Industry-specific rules live in specs, not here. See docs/AIGRIDS.md.';
create table if not exists aigrids.specs (
  spec_id uuid primary key default gen_random_uuid(),
  tenant_id uuid, commercial_threshold numeric not null default 500,
  national_brand text not null default 'Renewable Ireland', notes text,
  created_at timestamptz not null default now());
insert into aigrids.specs (tenant_id, commercial_threshold, national_brand, notes)
  select null,500,'Renewable Ireland','AISolar Ireland default: >= EUR500 bi-monthly = commercial'
  where not exists (select 1 from aigrids.specs where tenant_id is null);
create or replace function aigrids.route_lead(p_lead_id uuid)
  returns jsonb language plpgsql security definer set search_path to 'aigrids','gate_bridge','public','extensions' as $route$
declare v_lead record; v_brand record; v_spec record; v_national uuid; v_commercial boolean; v_target uuid; v_decision text;
begin
  select * into v_lead from public.leads where id=p_lead_id;
  if v_lead is null then return jsonb_build_object('decision','not_found'); end if;
  select * into v_spec from aigrids.specs where tenant_id=v_lead.tenant_id or tenant_id is null order by tenant_id nulls last limit 1;
  select boundary_ref into v_national from public.brands where name=v_spec.national_brand limit 1;
  select * into v_brand from public.brands where id=v_lead.origin_brand_id;       -- prefer the FK
  if v_brand.id is null then
    select * into v_brand from public.brands
      where (v_lead.brand is not null and lower(name)=lower(v_lead.brand))
         or (v_lead.county is not null and lower(name)=lower('Solar '||v_lead.county))
      order by sort_order limit 1;
  end if;
  v_commercial := coalesce(v_lead.monthly_bill,0) >= v_spec.commercial_threshold;
  if v_commercial then
    v_target := v_national; v_decision := 'commercial_stays_national';
  elsif v_brand.boundary_ref is not null and v_brand.boundary_ref <> v_national then
    v_target := v_brand.boundary_ref; v_decision := 'domestic_owned_county';
  else
    v_target := v_national; v_decision := 'domestic_unowned_up_to_national';
  end if;
  update public.leads set segment = case when v_commercial then 'commercial' else 'residential' end,
    tenant_id = coalesce((select tenant_id from public.brands where boundary_ref=v_target order by sort_order limit 1), v_lead.tenant_id)
    where id=p_lead_id;
  perform gate_bridge.offer(v_target,'LeadRouted', jsonb_build_object('lead',p_lead_id,'decision',v_decision,'commercial',v_commercial,'brand',coalesce(v_brand.name,'unknown')), null);
  return jsonb_build_object('decision',v_decision,'boundary',v_target,'commercial',v_commercial,'brand',coalesce(v_brand.name,'unknown'));
end $route$;

-- RE-FORGED 31 Jul (faithful to kernel.transfer_lead): origin-kind fork (independent/county/national),
-- county-born holds ALL in patch, EUR500 national-born only, up-never-across, LeadHeld/Transferred/Received.
-- Depends on public.brands.kind. Supersedes the first EUR500-on-everything cut.

create or replace function aigrids.route_lead(p_lead_id uuid)
  returns jsonb language plpgsql security definer set search_path to 'aigrids','gate_bridge','public','extensions' as $route$
declare
  v_lead record; v_origin record; v_spec record; v_national uuid; v_from uuid;
  v_origin_kind text; v_county text; v_threshold numeric; v_commercial boolean; v_target record;
  v_counties text[] := array['Antrim','Armagh','Carlow','Cavan','Clare','Cork','Derry','Donegal','Down','Dublin','Fermanagh','Galway','Kerry','Kildare','Kilkenny','Laois','Leitrim','Limerick','Longford','Louth','Mayo','Meath','Monaghan','Offaly','Roscommon','Sligo','Tipperary','Tyrone','Waterford','Westmeath','Wexford','Wicklow'];
begin
  select * into v_lead from public.leads where id=p_lead_id;
  if not found then return jsonb_build_object('decision','not_found','lead',p_lead_id); end if;
  select * into v_spec from aigrids.specs where tenant_id=v_lead.tenant_id or tenant_id is null order by tenant_id nulls last limit 1;
  select boundary_ref into v_national from public.brands where name=v_spec.national_brand limit 1;
  v_county := initcap(trim(coalesce(v_lead.county,'')));
  select * into v_origin from public.brands where id=v_lead.origin_brand_id;
  if not found then select * into v_origin from public.brands where lower(name)=lower(coalesce(v_lead.brand,'')) order by sort_order limit 1; end if;
  v_origin_kind := coalesce(v_origin.kind,(select kind from public.brands where tenant_id=v_lead.tenant_id and kind is not null order by sort_order limit 1),'national');
  v_from := coalesce(v_origin.boundary_ref,(select boundary_ref from public.brands where tenant_id=v_lead.tenant_id order by sort_order limit 1),v_national);
  -- (1) independent-born -> never rerouted
  if v_origin_kind='independent' then
    perform gate_bridge.offer(v_from,'LeadRouted',jsonb_build_object('lead',p_lead_id,'decision','no_op','reason','independent holder - never rerouted','origin_brand',v_origin.name));
    return jsonb_build_object('decision','no_op','reason','independent','boundary',v_from);
  end if;
  -- (2) county-born
  if v_origin_kind='county' then
    if v_origin.boundary_ref is not null and v_origin.boundary_ref <> v_national then   -- OWNED: operator holds all in patch
      perform gate_bridge.offer(v_from,'LeadRouted',jsonb_build_object('lead',p_lead_id,'decision','no_op','reason','county-born - operator holds all leads in their patch','origin_brand',v_origin.name));
      return jsonb_build_object('decision','no_op','reason','county_born','boundary',v_from);
    else                                                                                 -- UNOWNED: up to national
      perform gate_bridge.offer(v_national,'LeadRouted',jsonb_build_object('lead',p_lead_id,'county',v_county,'decision','held_by_current','reason','unowned county - up to national; national holds and works it','origin_brand',v_origin.name));
      return jsonb_build_object('decision','held_by_current','reason','unowned_county','boundary',v_national);
    end if;
  end if;
  -- (3) national-born -> the EUR500 fork
  v_threshold := coalesce(v_spec.commercial_threshold,500);
  v_commercial := (v_lead.segment='commercial') or (coalesce(v_lead.monthly_bill,0) > v_threshold);
  if v_commercial then
    perform gate_bridge.offer(v_national,'LeadHeld',jsonb_build_object('lead',p_lead_id,'segment','commercial','county',v_lead.county,'monthly_bill',v_lead.monthly_bill,'reason','national-born commercial - national keeps, county kept for VPP'));
    return jsonb_build_object('decision','held_commercial','county',v_lead.county,'boundary',v_national);
  end if;
  if v_county='' or not (v_county = any(v_counties)) then
    perform gate_bridge.offer(v_national,'LeadHeld',jsonb_build_object('lead',p_lead_id,'county_given',v_lead.county,'reason','missing or unknown county'));
    return jsonb_build_object('decision','held','reason','missing_county','boundary',v_national);
  end if;
  select * into v_target from public.brands where kind='county' and active and lower(name)=lower('Solar '||v_county) and boundary_ref is not null and boundary_ref <> v_national order by sort_order limit 1;
  if not found then
    perform gate_bridge.offer(v_national,'LeadRouted',jsonb_build_object('lead',p_lead_id,'county',v_county,'decision','held_by_current','reason','no active operator - national holds and works it (reservoir); up, never across'));
    return jsonb_build_object('decision','held_by_current','county',v_county,'boundary',v_national);
  end if;
  if v_target.tenant_id = v_lead.tenant_id then return jsonb_build_object('decision','already_routed','tenant',v_target.name); end if;
  update public.leads set tenant_id=v_target.tenant_id where id=p_lead_id;   -- transfer DOWN (only place tenant moves)
  perform gate_bridge.offer(v_national,'LeadTransferred',jsonb_build_object('lead',p_lead_id,'to_tenant',v_target.tenant_id,'to_name',v_target.name,'county',v_county,'brand',v_lead.brand,'source',v_lead.source));
  perform gate_bridge.offer(v_target.boundary_ref,'LeadReceived',jsonb_build_object('lead',p_lead_id,'county',v_county,'brand',v_lead.brand,'source',v_lead.source));
  return jsonb_build_object('decision','transferred','to',v_target.name,'county',v_county,'to_boundary',v_target.boundary_ref);
end $route$;

-- v3 (31 Jul, Cal): small national -> AIGate gate call {send_to_county,keep,pool} (NO auto-route, keep control/fairness); commercial>threshold -> VPP hold; unowned county-born falls through to national gate. Supersedes v2. LATER: capped + county routing once density is known.

create or replace function aigrids.route_lead(p_lead_id uuid)
  returns jsonb language plpgsql security definer set search_path to 'aigrids','gate_bridge','public','extensions' as $route$
declare
  v_lead record; v_origin record; v_spec record; v_national uuid; v_from uuid;
  v_origin_kind text; v_county text; v_threshold numeric; v_commercial boolean; v_up boolean; v_county_owned boolean;
begin
  select * into v_lead from public.leads where id=p_lead_id;
  if not found then return jsonb_build_object('decision','not_found','lead',p_lead_id); end if;
  select * into v_spec from aigrids.specs where tenant_id=v_lead.tenant_id or tenant_id is null order by tenant_id nulls last limit 1;
  select boundary_ref into v_national from public.brands where name=v_spec.national_brand limit 1;
  v_county := initcap(trim(coalesce(v_lead.county,'')));
  select * into v_origin from public.brands where id=v_lead.origin_brand_id;
  if not found then select * into v_origin from public.brands where lower(name)=lower(coalesce(v_lead.brand,'')) order by sort_order limit 1; end if;
  v_origin_kind := coalesce(v_origin.kind,(select kind from public.brands where tenant_id=v_lead.tenant_id and kind is not null order by sort_order limit 1),'national');
  v_from := coalesce(v_origin.boundary_ref,(select boundary_ref from public.brands where tenant_id=v_lead.tenant_id order by sort_order limit 1),v_national);
  if v_origin_kind='independent' then
    perform gate_bridge.offer(v_from,'LeadRouted',jsonb_build_object('lead',p_lead_id,'decision','no_op','reason','independent holder - never rerouted','origin_brand',v_origin.name));
    return jsonb_build_object('decision','no_op','reason','independent'); end if;
  if v_origin_kind='county' and v_origin.boundary_ref is not null and v_origin.boundary_ref <> v_national then
    perform gate_bridge.offer(v_from,'LeadRouted',jsonb_build_object('lead',p_lead_id,'decision','no_op','reason','county-born - operator holds all in their patch','origin_brand',v_origin.name));
    return jsonb_build_object('decision','no_op','reason','county_born'); end if;
  v_up := (v_origin_kind='county');
  v_threshold := coalesce(v_spec.commercial_threshold,500);
  v_commercial := (v_lead.segment='commercial') or (coalesce(v_lead.monthly_bill,0) > v_threshold);
  if v_commercial then
    perform gate_bridge.offer(v_national,'LeadHeld',jsonb_build_object('lead',p_lead_id,'segment','commercial','monthly_bill',v_lead.monthly_bill,'up',v_up,'reason','national keeps for VPP - sold by national team'));
    return jsonb_build_object('decision','held_vpp','up',v_up); end if;
  v_county_owned := exists(select 1 from public.brands where kind='county' and active and lower(name)=lower('Solar '||v_county) and boundary_ref is not null and boundary_ref <> v_national);
  perform gate_bridge.offer(v_national,'LeadRouted',jsonb_build_object('lead',p_lead_id,'decision','gate_call','options',jsonb_build_array('send_to_county','keep','pool'),'county',v_lead.county,'county_owned',v_county_owned,'up',v_up,'reason','national gate - awaiting call: send to county / keep / pool'));
  return jsonb_build_object('decision','gate_call','county',v_lead.county,'county_owned',v_county_owned,'up',v_up);
end $route$;
