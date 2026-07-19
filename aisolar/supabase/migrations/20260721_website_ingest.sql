-- ============================================================================
-- 20260721_website_ingest.sql
-- ============================================================================
-- Website → AISOLAR lead ingestion support.
--
-- 1. Extends enqueue_lead_intake() so leads arriving from the marketing sites
--    (website_contact, website_chat, website_survey, website_qualified,
--    exit_intent, bill_analyser) also enqueue the lead_intake agent — every
--    external lead gets AI processing, not just in-app bill uploads.
-- 2. Index on leads(brand) for per-site funnel analytics.
--
-- Safe to re-run.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enqueue_lead_intake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In-app bill uploads + all external website sources get agent processing.
  -- 'manual' (staff-entered) and 'referral' stay human-driven.
  IF NEW.source IN (
    'bill_upload', 'ai_analyser',
    'website_contact', 'website_chat', 'website_survey',
    'website_qualified', 'exit_intent', 'bill_analyser'
  ) THEN
    PERFORM public.enqueue_agent(
      'lead_intake',
      NEW.id,
      jsonb_build_object('trigger_type', 'db_trigger', 'lead_source', NEW.source, 'brand', NEW.brand)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_leads_brand ON public.leads(brand) WHERE brand IS NOT NULL;

COMMIT;
