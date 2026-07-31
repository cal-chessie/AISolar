-- 20260731_gate_bridge.sql -- PURE kernel adapter (offer/project/verify). Routing lives in aigrids. See docs/GATE_BRIDGE.md.

create schema if not exists gate_bridge;
comment on schema gate_bridge is 'PURE kernel adapter. A domain OFFERS; this records (hash-chained, refs-only) ready to bind to the live kernel. NO routing/business logic - that is aigrids. See docs/GATE_BRIDGE.md.';
create table if not exists gate_bridge.events (
  event_id uuid primary key default gen_random_uuid(),
  boundary_ref uuid not null, actor_ref uuid, event_type text not null,
  payload jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default clock_timestamp(),
  prev_hash text, row_hash text, bound_to_kernel boolean not null default false);
create index if not exists gb_events_boundary on gate_bridge.events(boundary_ref, occurred_at);
alter table gate_bridge.events enable row level security;
create or replace function gate_bridge.offer(p_boundary uuid, p_event_type text, p_payload jsonb, p_actor uuid default null)
  returns uuid language plpgsql security definer set search_path to 'gate_bridge','public','extensions' as $offer$
declare v_prev text; v_id uuid;
begin
  if p_boundary is null then raise exception 'offer: boundary required'; end if;
  if coalesce(p_event_type,'')='' then raise exception 'offer: event_type required'; end if;
  if octet_length(coalesce(p_payload,'{}'::jsonb)::text) > 65536 then raise exception 'offer: payload over 64KiB'; end if;
  perform pg_advisory_xact_lock(hashtext('gate_bridge.events:'||p_boundary::text));
  select row_hash into v_prev from gate_bridge.events where boundary_ref=p_boundary and row_hash is not null order by occurred_at desc, event_id desc limit 1;
  insert into gate_bridge.events (boundary_ref, actor_ref, event_type, payload, prev_hash)
    values (p_boundary,p_actor,p_event_type,coalesce(p_payload,'{}'::jsonb),v_prev) returning event_id into v_id;
  update gate_bridge.events set row_hash = encode(digest(event_id::text||boundary_ref::text||coalesce(actor_ref::text,'')||event_type||payload::text||occurred_at::text||coalesce(v_prev,'GENESIS'),'sha256'),'hex') where event_id=v_id;
  return v_id;
end $offer$;
create or replace function gate_bridge.project(p_boundary uuid, p_limit int default 100)
  returns setof gate_bridge.events language sql stable security definer set search_path to 'gate_bridge','public' as $proj$
  select * from gate_bridge.events where boundary_ref=p_boundary order by occurred_at desc, event_id desc limit p_limit;
$proj$;
create or replace function gate_bridge.verify(p_boundary uuid)
  returns jsonb language plpgsql stable security definer set search_path to 'gate_bridge','public','extensions' as $ver$
declare r record; v_prev text:=null; v_n int:=0; v_expect text;
begin
  for r in select * from gate_bridge.events where boundary_ref=p_boundary order by occurred_at asc, event_id asc loop
    v_expect := encode(digest(r.event_id::text||r.boundary_ref::text||coalesce(r.actor_ref::text,'')||r.event_type||r.payload::text||r.occurred_at::text||coalesce(v_prev,'GENESIS'),'sha256'),'hex');
    if r.row_hash is distinct from v_expect then return jsonb_build_object('ok',false,'at',r.event_id,'reason','row_hash','checked',v_n); end if;
    if r.prev_hash is distinct from v_prev then return jsonb_build_object('ok',false,'at',r.event_id,'reason','prev_hash','checked',v_n); end if;
    v_prev := r.row_hash; v_n := v_n+1;
  end loop;
  return jsonb_build_object('ok',true,'checked',v_n);
end $ver$;
