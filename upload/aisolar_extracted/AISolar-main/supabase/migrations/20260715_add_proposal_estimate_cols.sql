-- ============================================================================
-- 20260715_add_proposal_estimate_cols.sql
-- Adds the 4 columns ProposalQuestionnaire.tsx now writes via the estimate engine.
-- REQUIRES MANUAL RUN in Supabase SQL editor (or supabase db push) — this file
-- alone does NOT alter the live DB. Run BEFORE relying on proposal generation
-- that stores lifetime_savings / co2 / solar_offset / yield_source.
-- Author: Cal + Hermes. 2026-07-15.
-- ============================================================================

alter table public.proposals
  add column if not exists lifetime_savings numeric,
  add column if not exists co2_saved_tonnes_per_year numeric,
  add column if not exists solar_offset_pct numeric,
  add column if not exists yield_source text;

-- Verify:
-- select column_name from information_schema.columns
--   where table_name = 'proposals'
--     and column_name in ('lifetime_savings','co2_saved_tonnes_per_year','solar_offset_pct','yield_source');
