-- ============================================================================
-- 20260722_survey_handoff.sql
-- ============================================================================
-- Makes the survey → estimate → proposal handoff airtight.
--
-- Problem found in audit: proposal_drafter read survey.confirmed_* columns
-- that never existed on site_surveys — every proposal silently fell back to
-- ballpark estimates and "no battery". lead_intake always had the confirmed_*
-- columns; nothing ever wrote them.
--
-- 1. Adds structured capture columns to site_surveys (battery, inverter,
--    shading level, usable area) the surveyor can fill.
-- 2. Adds richer extracted_* columns to lead_intake for the upgraded bill
--    extraction (provider, rates, standing charge, tariff, eircode, period).
-- 3. Trigger: when a survey is completed, copies its data into
--    lead_intake.confirmed_* server-side — no reliance on any UI path.
--    Runs in the same transaction as the completion, so by the time
--    proposal_drafter picks up the survey_complete job, confirmed data
--    is guaranteed present.
--
-- Safe to re-run.
-- ============================================================================

BEGIN;

-- 1. Structured survey capture columns (additive, all optional)
ALTER TABLE public.site_surveys
  ADD COLUMN IF NOT EXISTS shading_level TEXT CHECK (shading_level IN ('none','light','moderate','heavy')),
  ADD COLUMN IF NOT EXISTS available_area_m2 NUMERIC,
  ADD COLUMN IF NOT EXISTS recommended_battery_kwh NUMERIC,
  ADD COLUMN IF NOT EXISTS recommended_inverter_type TEXT;

-- 2. Richer bill-extraction columns on lead_intake
ALTER TABLE public.lead_intake
  ADD COLUMN IF NOT EXISTS extracted_provider TEXT,
  ADD COLUMN IF NOT EXISTS extracted_tariff_name TEXT,
  ADD COLUMN IF NOT EXISTS extracted_unit_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS extracted_night_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS extracted_standing_charge NUMERIC,
  ADD COLUMN IF NOT EXISTS extracted_day_night_meter BOOLEAN,
  ADD COLUMN IF NOT EXISTS extracted_eircode TEXT,
  ADD COLUMN IF NOT EXISTS extracted_billing_period TEXT;

-- 3. Survey-complete → lead_intake handoff trigger
CREATE OR REPLACE FUNCTION public.copy_survey_to_lead_intake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    -- Ensure the lead_intake row exists (manual leads may not have one yet)
    INSERT INTO public.lead_intake (lead_id, source)
    SELECT NEW.lead_id, 'manual'
    WHERE NOT EXISTS (SELECT 1 FROM public.lead_intake WHERE lead_id = NEW.lead_id);

    UPDATE public.lead_intake SET
      confirmed_roof_type        = COALESCE(NEW.roof_type, confirmed_roof_type),
      confirmed_roof_orientation = COALESCE(NEW.roof_orientation, confirmed_roof_orientation),
      confirmed_roof_pitch       = COALESCE(NEW.roof_pitch, confirmed_roof_pitch),
      confirmed_shading          = COALESCE(NEW.shading_level, confirmed_shading),
      confirmed_available_area_m2 = COALESCE(NEW.available_area_m2, confirmed_available_area_m2),
      confirmed_system_size_kw   = COALESCE(NEW.recommended_system_size, confirmed_system_size_kw),
      confirmed_panel_count      = COALESCE(NEW.recommended_panel_count, confirmed_panel_count),
      confirmed_battery_kwh      = COALESCE(NEW.recommended_battery_kwh, confirmed_battery_kwh),
      confirmed_inverter_type    = COALESCE(NEW.recommended_inverter_type, confirmed_inverter_type),
      updated_at                 = now()
    WHERE lead_id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_copy_survey_to_lead_intake ON public.site_surveys;
CREATE TRIGGER trg_copy_survey_to_lead_intake
  AFTER INSERT OR UPDATE ON public.site_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_survey_to_lead_intake();

COMMIT;
