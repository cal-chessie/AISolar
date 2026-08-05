-- 20260805_assignments_roster_ref.sql — 2C ⭐ deposit→installer routing (cohort).
-- Cohort installers are OWNER-ROSTER entries (Settings → Installers), not auth
-- users yet — so the assignment carries a roster ref + display name, and
-- installer_id (uuid, for when installers become users) widens to nullable.
-- Add-only / widening; idempotent.
alter table public.assignments add column if not exists installer_ref text;
alter table public.assignments add column if not exists installer_name text;
alter table public.assignments alter column installer_id drop not null;
