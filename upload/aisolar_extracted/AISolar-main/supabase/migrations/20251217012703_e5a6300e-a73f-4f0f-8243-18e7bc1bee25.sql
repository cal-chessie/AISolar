-- =====================================================
-- CRITICAL SECURITY FIX: Tighten RLS policies
-- =====================================================

-- 1. FIX PROFILES TABLE - Require authentication for viewing
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. FIX CONTRACTS TABLE - Restrict to related users only
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;
CREATE POLICY "Users can view related contracts" ON public.contracts
  FOR SELECT USING (
    -- Admins can see all
    public.has_role(auth.uid(), 'admin') OR
    -- Consultant who created the proposal can see
    EXISTS (
      SELECT 1 FROM proposals p 
      WHERE p.id = contracts.proposal_id 
      AND p.consultant_id = auth.uid()
    ) OR
    -- Assigned installer can see
    EXISTS (
      SELECT 1 FROM proposals p
      JOIN installers i ON p.assigned_installer_id = i.id
      WHERE p.id = contracts.proposal_id 
      AND i.user_id = auth.uid()
    )
  );

-- 3. FIX INVOICES TABLE - Restrict to related users only
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
CREATE POLICY "Users can view related invoices" ON public.invoices
  FOR SELECT USING (
    -- Admins can see all
    public.has_role(auth.uid(), 'admin') OR
    -- Consultant who created the proposal can see
    EXISTS (
      SELECT 1 FROM proposals p 
      WHERE p.id = invoices.proposal_id 
      AND p.consultant_id = auth.uid()
    ) OR
    -- Assigned installer can see
    EXISTS (
      SELECT 1 FROM proposals p
      JOIN installers i ON p.assigned_installer_id = i.id
      WHERE p.id = invoices.proposal_id 
      AND i.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
CREATE POLICY "Related users can update invoices" ON public.invoices
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM proposals p 
      WHERE p.id = invoices.proposal_id 
      AND p.consultant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create invoices" ON public.invoices;
CREATE POLICY "Consultants and admins can create invoices" ON public.invoices
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'consultant')
  );

-- 4. FIX SEAI_APPLICATIONS TABLE - Restrict modifications
DROP POLICY IF EXISTS "Authenticated users can view SEAI applications" ON public.seai_applications;
CREATE POLICY "Users can view related SEAI applications" ON public.seai_applications
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM proposals p 
      WHERE p.id = seai_applications.proposal_id 
      AND p.consultant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update SEAI applications" ON public.seai_applications;
CREATE POLICY "Consultants and admins can update SEAI applications" ON public.seai_applications
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM proposals p 
      WHERE p.id = seai_applications.proposal_id 
      AND p.consultant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create SEAI applications" ON public.seai_applications;
CREATE POLICY "Consultants and admins can create SEAI applications" ON public.seai_applications
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'consultant')
  );

-- 5. FIX SITE_SURVEYS TABLE - Restrict viewing
DROP POLICY IF EXISTS "Authenticated users can view all surveys" ON public.site_surveys;
CREATE POLICY "Users can view related surveys" ON public.site_surveys
  FOR SELECT USING (
    -- Admins and consultants can see all
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'consultant') OR
    -- Surveyor can see their own
    auth.uid() = surveyor_id OR
    -- Assigned installer can see
    EXISTS (
      SELECT 1 FROM proposals p
      JOIN installers i ON p.assigned_installer_id = i.id
      WHERE p.lead_id = site_surveys.lead_id 
      AND i.user_id = auth.uid()
    )
  );

-- 6. FIX SEAI_DOCUMENTS TABLE - Restrict deletion
DROP POLICY IF EXISTS "Authenticated users can delete SEAI documents" ON public.seai_documents;
CREATE POLICY "Uploaders and admins can delete SEAI documents" ON public.seai_documents
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    uploaded_by = auth.uid()
  );

-- 7. FIX PROJECT_DOCUMENTS TABLE - Restrict deletion
DROP POLICY IF EXISTS "Authenticated users can delete project documents" ON public.project_documents;
CREATE POLICY "Uploaders and admins can delete project documents" ON public.project_documents
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    uploaded_by = auth.uid()
  );