-- 20260805_secdef_search_path.sql
-- Hardening (deep sweep, 5 Aug): 8 SECURITY DEFINER functions had a MUTABLE
-- search_path — the classic Postgres privilege-escalation vector. A definer
-- function that resolves unqualified names using the CALLER's search_path can be
-- hijacked by a malicious same-named object in an attacker-controlled schema,
-- then executes it with the definer's (superuser) rights. All 8 reference only
-- fully-qualified public.* objects, so pinning is safe + add-only. (This is the
-- exact issue Supabase's linter calls "Function Search Path Mutable".)
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname in ('claim_next_agent_job','complete_agent_job','enqueue_agent',
                        'enqueue_install_coordinator','enqueue_lead_intake','enqueue_stage_agent',
                        'fail_agent_job','handle_new_user')
      and not (p.proconfig is not null and exists(select 1 from unnest(p.proconfig) x where x like 'search_path=%'))
  loop
    execute format('alter function %s set search_path to ''public'', ''extensions''', r.sig);
  end loop;
end $$;
