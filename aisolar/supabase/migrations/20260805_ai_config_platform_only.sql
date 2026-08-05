-- 20260805_ai_config_platform_only.sql
-- Hardening (deep sweep, 5 Aug): ai_config is GLOBAL (no tenant_id) and holds the
-- shared OpenRouter API key. Its policies trusted has_role(admin) = ANY tenant
-- admin, so once the key is set, every installer-tenant admin in the cohort could
-- read the platform's AI secret (and tamper the global config). Lock client
-- access to the PLATFORM admin only. Edge functions read via service role
-- (bypass RLS), so brain-voice / analyse-roof-photo / verify-artefact are
-- unaffected. (True per-tenant BYO keys = tenant_id + scope, post-cohort.)
drop policy if exists "ai_config_write_admin"  on public.ai_config;
drop policy if exists "ai_config_select_admin" on public.ai_config;
create policy "ai_config platform admin only" on public.ai_config
  for all
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));
