-- 20260802_gdpr_erasure_extension.sql — FULL AUDIT finding (30 Jul, GDPR dept).
-- The Sweep-8 tables added on 30 Jul (esb_submissions, conversation_messages,
-- lead_touchpoints, installed_equipment) carry lead-linked personal data that
-- anonymise_lead() (20260724) predates. An Article 17 erasure would have left
-- MPRN on the submission record and free-text message bodies behind.
-- Fix follows the 20260724 precedent: body is the original VERBATIM plus the
-- new scrubs appended. Add-only, idempotent, safe to re-run.

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

  -- ── ADDED 20260802 (Sweep-8 tables, full-audit finding) ────────────────────
  -- ESB submission record: keep the compliance lifecycle + seal, remove the
  -- personal identifiers (MPRN is personal data; the customer name is on the
  -- leads row already scrubbed above).
  UPDATE public.esb_submissions
  SET mprn = NULL
  WHERE lead_id = p_lead_id;

  -- The centralised conversation: keep the thread shape for audit, redact
  -- every body (free text — quotes names, addresses, eircodes).
  UPDATE public.conversation_messages
  SET body = '[redacted]', metadata = '{}'::jsonb
  WHERE conversation_id IN (
    SELECT id FROM public.conversations WHERE lead_id = p_lead_id
  );

  -- New touchpoints table (20260801): same redaction rule as the original.
  UPDATE public.lead_touchpoints
  SET summary = '[redacted]'
  WHERE lead_id = p_lead_id AND summary IS NOT NULL;

  -- installed_equipment: device facts (serial, ratings) are equipment data,
  -- not personal data — retained for the statutory record. The installer's
  -- note is free text and could reference the household: redact it.
  UPDATE public.installed_equipment
  SET note = '[redacted]'
  WHERE lead_id = p_lead_id AND note <> '';

  RAISE NOTICE 'Lead % anonymised (incl. Sweep-8 tables)', p_lead_id;
END;
$$;
