-- ============================================================================
-- 20260723_role_management.sql
-- ============================================================================
-- Closes the day-one auth wall found 2026-07-18:
--
--   1. handle_new_user assigns 'customer' to everyone (correct — never trust
--      client-supplied signup metadata for privilege, or anyone could sign up
--      as admin). But there was NO in-app path to grant staff roles, and no
--      INSERT policy on user_roles — so not even an admin could promote a
--      consultant/installer. The business was un-staffable without raw SQL.
--
--   2. The admin SELECT policies on user_roles/profiles used inline
--      EXISTS(SELECT 1 FROM user_roles …) *inside a user_roles policy* — the
--      recursive-RLS footgun (Supabase warns: can silently return no rows).
--      Replaced with the SECURITY DEFINER helper public.has_role(), which
--      bypasses RLS and cannot recurse.
--
-- This migration:
--   a. Recreates admin read policies on user_roles + profiles via has_role().
--   b. Adds admin-only INSERT/UPDATE/DELETE on user_roles (in-app role grants).
--   c. Adds a guarded grant_role() RPC for the UI to call.
--   d. Documents the first-admin bootstrap (see AUTH_RUNBOOK.md — run once).
--
-- handle_new_user is intentionally NOT changed: 'customer' default stays.
-- Safe to re-run.
-- ============================================================================

BEGIN;

-- ── a. Recursion-safe admin read policies ──────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── b. Admin-only writes to user_roles (the in-app grant path) ──────────────
-- Only an existing admin may grant/revoke roles. Customers and staff cannot
-- touch their own roles → no self-escalation.
DROP POLICY IF EXISTS "Admins can grant roles" ON public.user_roles;
CREATE POLICY "Admins can grant roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;
CREATE POLICY "Admins can revoke roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── c. Guarded RPC for the UI (admin grants a role by email) ────────────────
CREATE OR REPLACE FUNCTION public.grant_role(p_target_email text, p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target uuid;
BEGIN
  -- Caller must be an admin (defence in depth on top of the RLS policies).
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins may grant roles';
  END IF;

  SELECT id INTO v_target FROM auth.users WHERE lower(email) = lower(p_target_email) LIMIT 1;
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'No user with email %', p_target_email;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_target, p_role)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_role(text, app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.grant_role(text, app_role) TO authenticated;

COMMIT;

-- ============================================================================
-- FIRST-ADMIN BOOTSTRAP — run ONCE, manually, after Cal signs up.
-- There is deliberately no in-app way to mint the first admin (chicken/egg;
-- an in-app path would be an escalation hole). Do it in the SQL editor:
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'cal@renewably.ie'
--   ON CONFLICT DO NOTHING;
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'consultant' FROM auth.users WHERE email = 'cal@renewably.ie'
--   ON CONFLICT DO NOTHING;
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'installer' FROM auth.users WHERE email = 'cal@renewably.ie'
--   ON CONFLICT DO NOTHING;
--
-- Then Cal is owner (admin+consultant+installer) and can grant everyone else
-- from inside the app via grant_role().
-- ============================================================================
