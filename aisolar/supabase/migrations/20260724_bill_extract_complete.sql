-- ============================================================================
-- 20260724_bill_extract_complete.sql
-- ============================================================================
-- Closes the gap between what extract-bill-data READS and what we can KEEP.
--
-- The extractor returns 21 fields. lead_intake had columns for 13. The other
-- eight were parsed by the model, returned in the HTTP response, and then
-- dropped on the floor because nothing had anywhere to put them. Since the
-- customer proposal now states how many bill details we hold, every field we
-- fail to persist is a weaker claim on the most trust-critical page we print.
--
-- The eight matter commercially, not just for completeness. dayUsageKwh and
-- nightUsageKwh are the day/night split — the single number that decides
-- whether a battery pays for itself. Quoting storage without it is guesswork,
-- and it is the thing a generic quote tool cannot produce.
--
-- 1. Adds the eight missing extracted_* columns.
-- 2. Adds bill_extracted_at so we can say WHEN we read the bill, and so a
--    re-upload is distinguishable from a stale first pass.
-- 3. GDPR fix, found while writing this: anonymise_lead() clears
--    extracted_address and extracted_mprn but never cleared extracted_eircode,
--    which narrows a household to a handful of homes. An Article 17 erasure
--    request was leaving it behind. Fixed by extending the same UPDATE, and
--    extracted_notes goes with it since free text can quote name and address.
--
-- Add-only and idempotent. Safe to re-run.
-- ============================================================================

BEGIN;

-- 1. The eight fields that had nowhere to land -------------------------------
ALTER TABLE public.lead_intake
  -- usage for the billed period, before annualisation
  ADD COLUMN IF NOT EXISTS extracted_billing_period_kwh NUMERIC,
  -- 'per day' | 'per month' — without it a standing charge is meaningless
  ADD COLUMN IF NOT EXISTS extracted_standing_charge_unit TEXT,
  -- Irish domestic electricity is 9% VAT; a different rate signals a
  -- commercial supply and a different proposal path entirely
  ADD COLUMN IF NOT EXISTS extracted_vat_rate NUMERIC,
  -- THE BATTERY-SIZING PAIR. Night-heavy usage means storage pays back fast.
  ADD COLUMN IF NOT EXISTS extracted_day_usage_kwh NUMERIC,
  ADD COLUMN IF NOT EXISTS extracted_night_usage_kwh NUMERIC,
  -- estimated (E) readings are not measured usage; a proposal built on one
  -- deserves a caveat rather than silent confidence
  ADD COLUMN IF NOT EXISTS extracted_estimated_reading BOOLEAN,
  -- the model's own observations: unreadable sections, odd tariffs
  ADD COLUMN IF NOT EXISTS extracted_notes TEXT,
  -- 2. provenance: when we actually read the bill
  ADD COLUMN IF NOT EXISTS bill_extracted_at TIMESTAMPTZ;

-- Constrain the unit rather than accepting free text, so downstream maths can
-- trust it. NOT VALID keeps the migration safe against pre-existing rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_intake_standing_charge_unit_check'
  ) THEN
    ALTER TABLE public.lead_intake
      ADD CONSTRAINT lead_intake_standing_charge_unit_check
      CHECK (extracted_standing_charge_unit IN ('per day','per month'))
      NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN public.lead_intake.extracted_day_usage_kwh IS
  'Day-rate usage from the bill. With night_usage_kwh this is the day/night split that decides battery sizing.';
COMMENT ON COLUMN public.lead_intake.extracted_estimated_reading IS
  'TRUE when the bill reading was estimated (E), not measured. Proposals built on this should say so.';

-- 3. GDPR: erasure must take the eircode and the notes too -------------------
-- extracted_notes can quote the account holder and address verbatim, and an
-- eircode narrows a household to a handful of homes. Both are personal data,
-- and anonymise_lead() left both behind. Body is the original verbatim plus
-- the two new NULLs and a pinned search_path (it is SECURITY DEFINER and had
-- none, so a hostile schema on the caller's path could shadow a table name).
CREATE OR REPLACE FUNCTION public.anonymise_lead(p_lead_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Anonymise PII on leads
  UPDATE public.leads
  SET name = 'Deleted User',
      email = 'deleted_' || encode(gen_random_bytes(8), 'hex') || '@erased.local',
      phone = NULL,
      address = NULL,
      mprn = NULL,
      access_token = NULL,
      monthly_bill = NULL
  WHERE id = p_lead_id;

  -- Anonymise lead_intake
  UPDATE public.lead_intake
  SET extracted_account_name = NULL,
      extracted_address = NULL,
      extracted_mprn = NULL,
      extracted_eircode = NULL,   -- ADDED: was surviving erasure
      extracted_notes = NULL,     -- ADDED: free text, can quote name/address
      extraction_raw = NULL
  WHERE lead_id = p_lead_id;

  -- Anonymise contracts (keep financial record, remove signature image)
  UPDATE public.contracts
  SET signed_by_name = 'Deleted User',
      signed_by_email = NULL,
      signature_data = NULL
  WHERE lead_id = p_lead_id;

  -- Touchpoints: keep audit trail but redact PII in summary
  UPDATE public.touchpoints
  SET summary = '[redacted]'
  WHERE lead_id = p_lead_id AND summary LIKE '%@%';

  -- Activity logs: keep for audit
  -- Survey photos: delete from storage
  DELETE FROM public.survey_photos WHERE survey_id IN (
    SELECT id FROM public.site_surveys WHERE lead_id = p_lead_id
  );

  RAISE NOTICE 'Lead % anonymised', p_lead_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anonymise_lead(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymise_lead(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.anonymise_lead(UUID) TO authenticated;

COMMIT;
