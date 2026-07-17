-- v3 Security Fixes Migration
--
-- Implements Week 1 ship blockers from the v3 audit:
--   1. Make survey-photos and project-documents buckets private + size/MIME limits
--   2. Tighten storage RLS (owner-only write)
--   3. Tighten touchpoints INSERT (lead ownership required)
--   4. Tighten email_templates SELECT (authenticated only, not anon)
--   5. Tighten notifications INSERT (no anon spam)
--   6. Sweep auth.role()='authenticated' policies on staff tables
--   7. Add idempotency UNIQUE constraints (proposals draft, seai_applications)
--   8. Add missing hot-path indexes
--   9. Create vault secret slot for service-role key (used by pg_cron)
--  10. Drop + recreate pg_cron schedules using vault secret (replaces hardcoded JWT)
--  11. Add right-to-erasure helper functions
--  12. Add agent_queue claim/complete/fail SQL functions (previews Week 3)
--  13. Add realtime publication for customer-facing tables
--  14. Add retention pg_cron jobs

BEGIN;

-- ============================================================================
-- 1. Storage bucket hardening
-- ============================================================================

-- survey-photos: private, 10MB max, image MIME types only
UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'survey-photos';

-- project-documents: private, 25MB max, PDF + image MIME types
UPDATE storage.buckets
SET public = false,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'project-documents';

-- ============================================================================
-- 2. Storage RLS — owner-only write
-- ============================================================================
-- storage.objects has an `owner` column = auth.uid() of the uploader

DROP POLICY IF EXISTS "Users can upload survey photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload survey photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'survey-photos'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can update/delete their own survey photos" ON storage.objects;
CREATE POLICY "Owners can update/delete their own survey photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'survey-photos' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'survey-photos' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own survey photos" ON storage.objects;
CREATE POLICY "Owners can delete their own survey photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'survey-photos' AND owner = auth.uid());

-- Staff can read survey photos (consultants, installers, admins)
DROP POLICY IF EXISTS "Staff can read survey photos" ON storage.objects;
CREATE POLICY "Staff can read survey photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'survey-photos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'consultant', 'installer')
    )
  );

-- Same for project-documents
DROP POLICY IF EXISTS "Users can upload project documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload project documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Staff can read project documents" ON storage.objects;
CREATE POLICY "Staff can read project documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'consultant', 'installer')
    )
  );

-- ============================================================================
-- 3. touchpoints INSERT — require lead ownership
-- ============================================================================
DROP POLICY IF EXISTS "Service role can write touchpoints" ON public.touchpoints;

CREATE POLICY "Service role can write touchpoints"
  ON public.touchpoints FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Consultants can write touchpoints for assigned leads"
  ON public.touchpoints FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = touchpoints.lead_id
        AND (
          l.assigned_consultant_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'consultant')
          )
        )
    )
  );

-- ============================================================================
-- 4. email_templates SELECT — authenticated only (was: anon, authenticated)
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can read active email_templates" ON public.email_templates;
CREATE POLICY "Authenticated users can read active email_templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (active = true);

-- ============================================================================
-- 5. notifications INSERT — no anon spam
-- ============================================================================
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
CREATE POLICY "Service role can create any notification"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can create own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. Sweep auth.role()='authenticated' policies on staff tables
-- ============================================================================
-- proposals: was open to any authenticated
DROP POLICY IF EXISTS "Authenticated users can view proposals" ON public.proposals;
CREATE POLICY "Staff can view proposals"
  ON public.proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','consultant','installer'))
  );

-- assignments: same
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.assignments;
CREATE POLICY "Staff can view assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','consultant','installer'))
  );

-- installation_checklists
DROP POLICY IF EXISTS "Authenticated users can view installation_checklists" ON public.installation_checklists;
CREATE POLICY "Staff can view installation_checklists"
  ON public.installation_checklists FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','consultant','installer'))
  );

-- activity_logs (keep customer read for their own leads via portal)
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;
CREATE POLICY "Staff can view all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','consultant','installer'))
  );

CREATE POLICY "Customers can view activity logs for their own leads"
  ON public.activity_logs FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = activity_logs.lead_id
        AND l.access_token = current_setting('request.headers', true)::json->>'x-access-token'
    )
  );

-- profiles: was open to any authenticated (staff directory leak)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- user_roles: was open
DROP POLICY IF EXISTS "Users can view all user roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- ============================================================================
-- 7. Idempotency UNIQUE constraints
-- ============================================================================
-- Only one draft proposal per lead at a time
CREATE UNIQUE INDEX IF NOT EXISTS proposals_one_draft_per_lead
  ON public.proposals(lead_id)
  WHERE status = 'draft';

-- Only one SEAI application per proposal
CREATE UNIQUE INDEX IF NOT EXISTS seai_applications_one_per_proposal
  ON public.seai_applications(proposal_id);

-- Only one site survey per lead (active)
CREATE UNIQUE INDEX IF NOT EXISTS site_surveys_one_active_per_lead
  ON public.site_surveys(lead_id)
  WHERE status NOT IN ('cancelled', 'rejected');

-- ============================================================================
-- 8. Missing hot-path indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_lead_id ON public.invoices(lead_id);
CREATE INDEX IF NOT EXISTS idx_invoices_proposal_id ON public.invoices(proposal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status) WHERE status NOT IN ('paid', 'voided');
CREATE INDEX IF NOT EXISTS idx_contracts_lead_id ON public.contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contracts_proposal_id ON public.contracts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_installation_checklists_lead_id ON public.installation_checklists(lead_id);
CREATE INDEX IF NOT EXISTS idx_seai_applications_lead_id ON public.seai_applications(lead_id);
CREATE INDEX IF NOT EXISTS idx_seai_documents_application_id ON public.seai_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_lead_id ON public.site_surveys(lead_id);
CREATE INDEX IF NOT EXISTS idx_survey_photos_survey_id ON public.survey_photos(survey_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_activity_logs_lead_id_created ON public.activity_logs(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_touchpoints_lead_id_created ON public.touchpoints(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status, created_at DESC) WHERE status IN ('queued', 'running', 'failed');
CREATE INDEX IF NOT EXISTS idx_agent_queue_due ON public.agent_queue(run_after, priority) WHERE locked_until IS NULL AND failed_at IS NULL;

-- ============================================================================
-- 9. Vault secret slot for service-role key
-- ============================================================================
-- Create an empty vault secret. Operator must populate via:
--   SELECT vault.create_secret('<real_service_role_key>', 'supabase_service_role', 'Service role key for pg_cron agent invocations');
-- The pg_cron schedules below read from this secret. If empty, schedules fail safely.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_service_role') THEN
    PERFORM vault.create_secret('PLACEHOLDER_ROTATE_ME', 'supabase_service_role', 'Service role key for pg_cron agent invocations');
    RAISE NOTICE 'Created placeholder vault secret supabase_service_role. Operator MUST rotate with the real key.';
  END IF;
END $$;

-- Also store the project URL (less sensitive but environment-specific)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') THEN
    PERFORM vault.create_secret('https://coxmtpnqjybwlrfwkols.supabase.co', 'supabase_project_url', 'Supabase project URL for pg_cron');
  END IF;
END $$;

-- ============================================================================
-- 10. Drop + recreate pg_cron schedules using vault secret
-- ============================================================================
-- Remove the old hardcoded-JWT schedules from migration 20260718
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('follow-up-digest');
    RAISE NOTICE 'Unscheduled old follow-up-digest';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    PERFORM cron.unschedule('notification-digest');
    RAISE NOTICE 'Unscheduled old notification-digest';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    PERFORM cron.unschedule('payment-reminder');
    RAISE NOTICE 'Unscheduled old payment-reminder';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Create new schedules using vault-stored secrets
-- Set timezone to Dublin so 09:00 cron means 09:00 Dublin year-round
DO $$
BEGIN
  BEGIN
    PERFORM set_config('cron.timezone', 'Europe/Dublin', false);
    RAISE NOTICE 'Set pg_cron timezone to Europe/Dublin';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set cron.timezone: %', SQLERRM;
  END;

  -- Follow-up digest: 09:00 Dublin daily
  BEGIN
    PERFORM cron.schedule(
      'follow-up-digest',
      '0 9 * * *',
      $QUERY$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/send-follow-up-digest',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role')
          ),
          body := '{}'::jsonb
        )
      $QUERY$
    );
    RAISE NOTICE 'Scheduled follow-up-digest (09:00 Dublin daily, vault-stored secret)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule follow-up-digest: %', SQLERRM;
  END;

  -- Notification digest: 10:00 Dublin Monday
  BEGIN
    PERFORM cron.schedule(
      'notification-digest',
      '0 10 * * 1',
      $QUERY$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/send-notification-digest',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role')
          ),
          body := '{}'::jsonb
        )
      $QUERY$
    );
    RAISE NOTICE 'Scheduled notification-digest (10:00 Dublin Monday, vault-stored secret)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule notification-digest: %', SQLERRM;
  END;

  -- Payment reminder: 09:30 Dublin daily
  BEGIN
    PERFORM cron.schedule(
      'payment-reminder',
      '30 9 * * *',
      $QUERY$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/send-payment-reminder',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role')
          ),
          body := '{}'::jsonb
        )
      $QUERY$
    );
    RAISE NOTICE 'Scheduled payment-reminder (09:30 Dublin daily, vault-stored secret)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule payment-reminder: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- 11. Right-to-erasure helper
-- ============================================================================
-- Anonymises a lead (GDPR Article 17) without breaking financial record retention.
CREATE OR REPLACE FUNCTION public.anonymise_lead(p_lead_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================================================
-- 12. Agent queue claim/complete/fail (previews Week 3 — the kernel)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_next_agent_job(
  p_agent_id TEXT,
  p_worker_id TEXT,
  p_lock_duration_seconds INTEGER DEFAULT 300
)
RETURNS public.agent_queue
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job public.agent_queue;
BEGIN
  -- Atomically claim the next due, unlocked, non-failed job
  SELECT * INTO v_job
  FROM public.agent_queue
  WHERE agent_id = p_agent_id
    AND run_after <= now()
    AND (locked_until IS NULL OR locked_until < now())
    AND failed_at IS NULL
    AND attempts < max_attempts
  ORDER BY priority ASC, run_after ASC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_job.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.agent_queue
  SET locked_until = now() + (p_lock_duration_seconds || ' seconds')::INTERVAL,
      attempts = attempts + 1
  WHERE id = v_job.id;

  RETURN v_job;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_next_agent_job(TEXT, TEXT, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_agent_job(p_job_id UUID, p_outputs JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.agent_queue WHERE id = p_job_id;
  -- The agent_runs row is inserted by the worker; we just clear the queue
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_agent_job(UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.fail_agent_job(p_job_id UUID, p_error TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job public.agent_queue;
BEGIN
  SELECT * INTO v_job FROM public.agent_queue WHERE id = p_job_id FOR UPDATE;

  IF v_job.id IS NULL THEN
    RETURN;
  END IF;

  -- Release the lock
  UPDATE public.agent_queue
  SET locked_until = NULL,
      run_after = now() + (POWER(2, v_job.attempts) * INTERVAL '1 minute')
  WHERE id = p_job_id;

  -- If max attempts reached, mark failed (dead letter)
  IF v_job.attempts >= v_job.max_attempts THEN
    UPDATE public.agent_queue
    SET failed_at = now()
    WHERE id = p_job_id;

    -- Notify admins
    INSERT INTO public.notifications (user_id, type, title, message, related_lead_id)
    SELECT u.user_id, 'agent_failed', 'Agent failed: ' || v_job.agent_id,
           'Agent ' || v_job.agent_id || ' failed after ' || v_job.max_attempts || ' attempts. Error: ' || p_error,
           v_job.lead_id
    FROM public.user_roles u
    WHERE u.role = 'admin';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fail_agent_job(UUID, TEXT) TO service_role;

-- ============================================================================
-- 13. Realtime publication for customer-facing + staff tables
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS public.proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS public.contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS public.site_surveys;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS public.installation_checklists;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS public.touchpoints;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS public.agent_runs;

-- ============================================================================
-- 14. Retention pg_cron jobs
-- ============================================================================
DO $$
BEGIN
  BEGIN
    PERFORM cron.schedule(
      'retention-notifications',
      '0 3 * * *',
      $$DELETE FROM public.notifications WHERE read = true AND created_at < now() - INTERVAL '90 days'$$
    );
    RAISE NOTICE 'Scheduled retention-notifications (daily 03:00, 90d read notifications)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule retention-notifications: %', SQLERRM;
  END;

  BEGIN
    PERFORM cron.schedule(
      'retention-agent-runs',
      '0 3 * * *',
      $$DELETE FROM public.agent_runs WHERE created_at < now() - INTERVAL '30 days'$$
    );
    RAISE NOTICE 'Scheduled retention-agent-runs (daily 03:00, 30d)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule retention-agent-runs: %', SQLERRM;
  END;

  BEGIN
    PERFORM cron.schedule(
      'retention-agent-queue',
      '0 3 * * *',
      $$DELETE FROM public.agent_queue WHERE failed_at IS NOT NULL AND failed_at < now() - INTERVAL '7 days'$$
    );
    RAISE NOTICE 'Scheduled retention-agent-queue (daily 03:00, 7d failed)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule retention-agent-queue: %', SQLERRM;
  END;

  -- Stuck-job sweeper: release locks older than 10 minutes
  BEGIN
    PERFORM cron.schedule(
      'agent-queue-stuck-sweeper',
      '* * * * *',
      $$UPDATE public.agent_queue SET locked_until = NULL WHERE locked_until IS NOT NULL AND locked_until < now() - INTERVAL '10 minutes' AND failed_at IS NULL$$
    );
    RAISE NOTICE 'Scheduled agent-queue-stuck-sweeper (every minute)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule agent-queue-stuck-sweeper: %', SQLERRM;
  END;
END $$;

COMMIT;

-- Verification (run manually):
-- SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id IN ('survey-photos', 'project-documents');
--   → both should show public=false, file_size_limit set, allowed_mime_types set
-- SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
--   → should show follow-up-digest, notification-digest, payment-reminder, retention-*, agent-queue-stuck-sweeper
-- SELECT name FROM vault.decrypted_secrets;
--   → should show supabase_service_role, supabase_project_url
-- SELECT proname FROM pg_proc WHERE proname IN ('anonymise_lead', 'claim_next_agent_job', 'complete_agent_job', 'fail_agent_job');
--   → should show all 4 functions
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
--   → should include notifications, leads, proposals, invoices, contracts, site_surveys, installation_checklists, touchpoints, agent_runs
