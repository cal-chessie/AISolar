-- 20260803_leads_eircode.sql — capture the Eircode on the lead itself.
-- Cal (3 Aug): "no eircode capture on the add lead." The manual add-lead form
-- writes into `leads`, which had address + county + mprn but NO eircode — yet
-- the eircode drives the roof read (Design Studio geocode) and the NC6 §2 box.
-- Store it on the lead so a hand-typed lead carries it before any bill read;
-- realLeads surfaces it as intake.extracted_eircode so every reader sees it.
-- Add-only · idempotent · nullable.
alter table if exists public.leads
  add column if not exists eircode text;
comment on column public.leads.eircode is 'Eircode captured at manual add (or copied from the bill read). Drives roof geocode + NC6 §2.';
