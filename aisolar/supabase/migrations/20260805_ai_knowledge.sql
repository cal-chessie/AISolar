-- 20260805_ai_knowledge.sql
-- The owner's business-intelligence feed for the brain ("teach your AI"):
-- story, edge, offers + taught FAQ answers. Stored as ONE tenant_settings row
-- (key 'ai_knowledge') so it rides the existing dual-write + sign-in hydration.
-- Add-only: widens the key CHECK.
do $$ begin
  alter table public.tenant_settings drop constraint if exists tenant_settings_key_check;
  alter table public.tenant_settings add constraint tenant_settings_key_check
    check (key = any (array['proposal_terms','finance_config','tenant_brand','company_compliance','pricing','ai_knowledge']::text[]));
end $$;
