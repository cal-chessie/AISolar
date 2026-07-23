-- Cal (23 Jul 2026): the consultant picks the gear ON SITE during the survey;
-- the picks flow straight into the proposal (no re-keying). Idempotent, add-only.
alter table if exists public.site_surveys
  add column if not exists recommended_panel_model text,
  add column if not exists recommended_inverter_model text,
  add column if not exists recommended_battery_model text;
