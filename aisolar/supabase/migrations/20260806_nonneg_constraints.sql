-- 20260806_nonneg_constraints — data-integrity floor (#28).
--
-- Non-negativity CHECKs on the columns where a negative value is UNAMBIGUOUSLY a
-- bug: physical quantities (counts, sizes, areas, kVA, kWh), raw costs, and rates.
-- Every column is nullable, so each guard is `x is null or x >= 0`.
--
-- Deliberately EXCLUDED: derived figures — savings, payback years, net_cost — a
-- strict CHECK there could reject a valid-but-pathological computed edge (e.g. a
-- poor-ROI commercial fit). Integrity, not a straitjacket. Tables are empty (fresh
-- V5), so these apply cleanly.

alter table public.proposals drop constraint if exists proposals_nonneg;
alter table public.proposals add constraint proposals_nonneg check (
      (panel_count                    is null or panel_count                    >= 0)
  and (system_size_kw                 is null or system_size_kw                 >= 0)
  and (battery_capacity_kwh           is null or battery_capacity_kwh           >= 0)
  and (installation_cost              is null or installation_cost              >= 0)
  and (system_cost                    is null or system_cost                    >= 0)
  and (seai_grant                     is null or seai_grant                     >= 0)
  and (current_annual_consumption_kwh is null or current_annual_consumption_kwh >= 0)
  and (estimated_annual_production_kwh is null or estimated_annual_production_kwh >= 0)
);

alter table public.site_surveys drop constraint if exists site_surveys_nonneg;
alter table public.site_surveys add constraint site_surveys_nonneg check (
      (available_area_m2          is null or available_area_m2          >= 0)
  and (confirmed_mic_kva          is null or confirmed_mic_kva          >= 0)
  and (confirmed_mec_kva          is null or confirmed_mec_kva          >= 0)
  and (estimated_installation_cost is null or estimated_installation_cost >= 0)
  and (recommended_battery_kwh    is null or recommended_battery_kwh    >= 0)
  and (recommended_panel_count    is null or recommended_panel_count    >= 0)
  and (recommended_system_size    is null or recommended_system_size    >= 0)
);

alter table public.leads drop constraint if exists leads_nonneg;
alter table public.leads add constraint leads_nonneg check (
  annual_consumption_kwh is null or annual_consumption_kwh >= 0
);

alter table public.lead_intake drop constraint if exists lead_intake_nonneg;
alter table public.lead_intake add constraint lead_intake_nonneg check (
      (confirmed_panel_count       is null or confirmed_panel_count       >= 0)
  and (confirmed_system_size_kw    is null or confirmed_system_size_kw    >= 0)
  and (confirmed_battery_kwh       is null or confirmed_battery_kwh       >= 0)
  and (confirmed_available_area_m2 is null or confirmed_available_area_m2 >= 0)
  and (estimated_system_size_kw    is null or estimated_system_size_kw    >= 0)
  and (extracted_annual_kwh        is null or extracted_annual_kwh        >= 0)
  and (extracted_billing_period_kwh is null or extracted_billing_period_kwh >= 0)
  and (extracted_day_usage_kwh     is null or extracted_day_usage_kwh     >= 0)
  and (extracted_night_usage_kwh   is null or extracted_night_usage_kwh   >= 0)
  and (extracted_unit_rate         is null or extracted_unit_rate         >= 0)
  and (extracted_night_rate        is null or extracted_night_rate        >= 0)
  and (extracted_vat_rate          is null or extracted_vat_rate          >= 0)
  and (finalized_total_cost        is null or finalized_total_cost        >= 0)
  and (finalized_seai_grant        is null or finalized_seai_grant        >= 0)
);
-- (finalized_net_cost excluded — a derived "net", same caution as proposals.net_cost)
