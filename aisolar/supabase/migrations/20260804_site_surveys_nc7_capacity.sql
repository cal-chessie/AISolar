-- 20260804_site_surveys_nc7_capacity.sql
-- NC7 §5 capture on the survey (4 Aug): the Connection Agreement's Maximum
-- Import / Export Capacity (kVA) for >6kW jobs, plus the three §5 assessment
-- answers. Written by SiteSurveyForm (bill-read correction AND the manual-route
-- full bill entry). Add-only, idempotent.
alter table public.site_surveys
  add column if not exists confirmed_mic_kva        numeric,   -- MIC (kVA) — NC7 §5
  add column if not exists confirmed_mec_kva        numeric,   -- MEC (kVA) — NC7 §5
  add column if not exists confirmed_nc7_mec_assess text,      -- Q1: assess nearest MEC (yes/no)
  add column if not exists confirmed_nc7_els_intend text,      -- Q2: intend an ELS (yes/no)
  add column if not exists confirmed_nc7_els_assess text;      -- Q2a: assess nearest ELS (yes/no)
