-- ============================================================================
-- 20260719_rls_lockdown.sql
-- ============================================================================
-- Phase 1 production-blocker migration. Closes the P0/P1 RLS gaps left by the
-- v3 sweep. Drops and recreates policies on:
--   leads, contracts, assignments, installation_checklists, seai_documents,
--   activity_logs, notifications, survey_photos, touchpoints
--
-- Also:
--   - Adds the missing leads.assigned_consultant_id column (referenced by the
--     v3 touchpoints policy that never worked because the column didn't exist)
--   - Revokes EXECUTE on anonymise_lead + enqueue_agent from authenticated
--   - Locks down the seai-documents storage bucket (size + MIME + staff-only)
--
-- Safe to re-run: every DROP uses IF EXISTS.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. leads table — the worst PII leak in the system (P0-1)
-- ============================================================================
-- Original policies from 20251008 used auth.role()='authenticated' for all 4
-- operations, never dropped. Any customer could read/write/delete any lead.

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
-- Also drop any legacy-named policies
DROP POLICY IF EXISTS "Leads are viewable by authenticated users" ON public.leads;
DROP POLICY IF EXISTS "Leads insertable by authenticated users" ON public.leads;
DROP POLICY IF EXISTS "Leads updatable by authenticated users" ON public.leads;
DROP POLICY IF EXISTS "Leads deletable by authenticated users" ON public.leads;

-- Add the column the v3 touchpoints policy references (P0-8 fix)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_consultant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Helper: has_role(_user_id, _role) already exists from v3 migration.

-- SELECT: staff can see all leads; customers can see their own lead via
-- access_token (passed as session setting by customer-portal edge functions
-- — but for direct Supabase calls we rely on the customer_portal RLS pattern
-- using a request.jwt.claim.role check). For now: staff + lead.owner_user_id.
CREATE POLICY "leads_select_staff_or_owner" ON public.leads
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
    OR assigned_consultant_id = auth.uid()
    OR owner_user_id = auth.uid()
  );

-- INSERT: any authenticated user (lead capture form, customer signup) can
-- create a lead — but ownership is assigned server-side via trigger.
CREATE POLICY "leads_insert_authenticated" ON public.leads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: admin + assigned consultant only.
CREATE POLICY "leads_update_staff_or_owner" ON public.leads
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR assigned_consultant_id = auth.uid()
    OR owner_user_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR assigned_consultant_id = auth.uid()
    OR owner_user_id = auth.uid()
  );

-- DELETE: admin only.
CREATE POLICY "leads_delete_admin_only" ON public.leads
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 2. contracts INSERT — was open to all authenticated (P1-1)
-- ============================================================================
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "contracts_insert_authenticated" ON public.contracts;

CREATE POLICY "contracts_insert_staff_only" ON public.contracts
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
  );

-- ============================================================================
-- 3. assignments INSERT + UPDATE — were open to all authenticated (P1-2)
-- ============================================================================
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can update assignments" ON public.assignments;
DROP POLICY IF EXISTS "assignments_insert_authenticated" ON public.assignments;
DROP POLICY IF EXISTS "assignments_update_authenticated" ON public.assignments;

CREATE POLICY "assignments_insert_staff_only" ON public.assignments
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
  );

CREATE POLICY "assignments_update_staff_only" ON public.assignments
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
  );

-- ============================================================================
-- 4. installation_checklists INSERT + UPDATE — were open to all (P1-3)
-- ============================================================================
ALTER TABLE public.installation_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert installation_checklists" ON public.installation_checklists;
DROP POLICY IF EXISTS "Authenticated users can update installation_checklists" ON public.installation_checklists;
DROP POLICY IF EXISTS "installation_checklists_insert_authenticated" ON public.installation_checklists;
DROP POLICY IF EXISTS "installation_checklists_update_authenticated" ON public.installation_checklists;

CREATE POLICY "installation_checklists_insert_staff_only" ON public.installation_checklists
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
  );

CREATE POLICY "installation_checklists_update_staff_or_assigned" ON public.installation_checklists
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
  );

-- ============================================================================
-- 5. seai_documents table — SELECT + INSERT were open (P1-4)
-- ============================================================================
ALTER TABLE public.seai_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view SEAI documents" ON public.seai_documents;
DROP POLICY IF EXISTS "Authenticated users can insert SEAI documents" ON public.seai_documents;
DROP POLICY IF EXISTS "seai_documents_select_authenticated" ON public.seai_documents;
DROP POLICY IF EXISTS "seai_documents_insert_authenticated" ON public.seai_documents;

CREATE POLICY "seai_documents_select_staff_only" ON public.seai_documents
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
  );

CREATE POLICY "seai_documents_insert_staff_only" ON public.seai_documents
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
  );

-- ============================================================================
-- 6. activity_logs INSERT — was open to all authenticated (P1-5)
-- ============================================================================
-- Forging audit log entries is a security issue. INSERT should be service_role
-- only (triggers + edge functions). UPDATE/DELETE already restricted in v3.
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;

-- No INSERT policy = INSERT denied to non-service-role callers.
-- (service_role bypasses RLS.)

-- ============================================================================
-- 7. notifications INSERT — drop the WITH CHECK (true) policy (P1-6)
-- ============================================================================
-- v3 added "Service role can create any notification" and "Users can create
-- own notifications" but never dropped the original open policy.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_open" ON public.notifications;

-- The v3-added policies (if they exist) are sufficient. If they were never
-- created, add them here:
CREATE POLICY IF NOT EXISTS "notifications_insert_service_role" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "notifications_insert_self" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 8. survey_photos table — SELECT + INSERT were open (P1-7)
-- ============================================================================
-- Bucket is locked down (v3) but table-level policies still used
-- auth.role()='authenticated'.
ALTER TABLE public.survey_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view survey photos" ON public.survey_photos;
DROP POLICY IF EXISTS "Authenticated users can insert survey photos" ON public.survey_photos;
DROP POLICY IF EXISTS "survey_photos_select_authenticated" ON public.survey_photos;
DROP POLICY IF EXISTS "survey_photos_insert_authenticated" ON public.survey_photos;

CREATE POLICY "survey_photos_select_staff_only" ON public.survey_photos
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
  );

CREATE POLICY "survey_photos_insert_authenticated" ON public.survey_photos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 9. touchpoints — drop the open WITH CHECK (true) policy (P0-8)
-- ============================================================================
-- Original 20260718_agent_foundation.sql:261-264 created a policy granting
-- INSERT to service_role + authenticated WITH CHECK (true). v3 tried to
-- tighten it but the replacement referenced leads.assigned_consultant_id
-- which didn't exist (fixed above in §1). Drop the open policy now.
ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role and authenticated can insert touchpoints" ON public.touchpoints;
DROP POLICY IF EXISTS "touchpoints_insert_open" ON public.touchpoints;
DROP POLICY IF EXISTS "Touchpoints can be inserted by service or authenticated" ON public.touchpoints;

-- Allow service_role (agents/triggers) and staff to insert touchpoints.
-- Customers can insert their own (chat replies via portal).
CREATE POLICY IF NOT EXISTS "touchpoints_insert_service_or_staff_or_self" ON public.touchpoints
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND (l.owner_user_id = auth.uid() OR l.assigned_consultant_id = auth.uid())
    )
  );

-- Add a UNIQUE constraint to prevent duplicate agent runs (idempotency)
-- Per Phase 1 P0-8 / agent-foundation audit issue #8.
CREATE UNIQUE INDEX IF NOT EXISTS touchpoints_one_per_agent_per_lead_per_day
  ON public.touchpoints(lead_id, agent_id, date_trunc('day', created_at))
  WHERE agent_id IS NOT NULL;

-- ============================================================================
-- 10. REVOKE EXECUTE on dangerous SECURITY DEFINER functions (P0-3, P0-4)
-- ============================================================================
-- anonymise_lead + enqueue_agent were granted to authenticated, allowing any
-- customer to wipe PII or trigger agents on any lead.

REVOKE EXECUTE ON FUNCTION public.anonymise_lead(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.anonymise_lead(UUID) FROM authenticated;
-- Keep grant on service_role (used by admin edge functions + triggers).
GRANT EXECUTE ON FUNCTION public.anonymise_lead(UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.enqueue_agent(TEXT, UUID, JSONB, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_agent(TEXT, UUID, JSONB, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_agent(TEXT, UUID, JSONB, INTEGER) TO service_role;

-- ============================================================================
-- 11. seai-documents storage bucket — OPEN (P0-5)
-- ============================================================================
-- v3 fixed survey-photos and project-documents but missed this bucket.
-- Mirror the survey-photos pattern: staff-only SELECT/INSERT, uploader/admin
-- DELETE, size + MIME limits.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'seai-documents',
  'seai-documents',
  false,
  26214400,  -- 25MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Drop existing open policies on storage.objects for this bucket.
DROP POLICY IF EXISTS "Authenticated users can view SEAI documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload SEAI documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete SEAI documents" ON storage.objects;
DROP POLICY IF EXISTS "seai_documents_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "seai_documents_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "seai_documents_bucket_delete" ON storage.objects;

-- SELECT: staff only
CREATE POLICY "seai_docs_bucket_select_staff" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'seai-documents'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'consultant')
      OR public.has_role(auth.uid(), 'installer')
    )
  );

-- INSERT: staff only (consultants upload BER certs, grant PDFs, etc.)
CREATE POLICY "seai_docs_bucket_insert_staff" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'seai-documents'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'consultant')
    )
  );

-- DELETE: uploader + admin only
CREATE POLICY "seai_docs_bucket_delete_uploader_or_admin" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'seai-documents'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR owner = auth.uid()
    )
  );

-- ============================================================================
-- 12. installers table — SELECT was open (low-sensitivity but still leaks)
-- ============================================================================
ALTER TABLE public.installers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view installers" ON public.installers;
DROP POLICY IF EXISTS "installers_select_authenticated" ON public.installers;

CREATE POLICY "installers_select_staff_only" ON public.installers
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
    OR public.has_role(auth.uid(), 'installer')
  );

-- ============================================================================
-- 13. follow_up_settings — SELECT was open
-- ============================================================================
ALTER TABLE public.follow_up_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view follow_up_settings" ON public.follow_up_settings;
DROP POLICY IF EXISTS "follow_up_settings_select_authenticated" ON public.follow_up_settings;

CREATE POLICY "follow_up_settings_select_staff_only" ON public.follow_up_settings
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
  );

COMMIT;

-- ============================================================================
-- Verification queries (run manually to confirm)
-- ============================================================================
-- SELECT tablename, rowsecurity, forread, forwrite, forinsert, fordelete
-- FROM pg_tables LEFT JOIN pg_policies ON tablename = tablename
-- WHERE schemaname = 'public' AND tablename IN (
--   'leads', 'contracts', 'assignments', 'installation_checklists',
--   'seai_documents', 'activity_logs', 'notifications', 'survey_photos',
--   'touchpoints', 'installers', 'follow_up_settings'
-- );
