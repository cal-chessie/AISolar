-- Cal (23 Jul 2026): two survey questions that decide the battery case.
-- How many people live in the home sets the load; whether anyone is home
-- during the day sets whether solar meets it directly or a battery has to
-- carry it to the evening peak. Idempotent, add-only.

alter table if exists public.site_surveys
  add column if not exists household_occupants text,
  add column if not exists home_during_day text;

comment on column public.site_surveys.household_occupants is 'How many people live in the home (1..5+) — sizes the load';
comment on column public.site_surveys.home_during_day is 'usually | mixed | out — out-all-day means evening peak, the strongest battery case';
