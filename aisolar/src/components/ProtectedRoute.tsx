/**
 * ProtectedRoute — client-side auth guard for staff/customer routes.
 *
 * Phase 1 P0-9 fix: previously, /owner /consultant /installer /my-projects
 * rendered unconditionally. Anyone navigating there saw the full UI (with
 * dummy data, but still exposing consultant lists, settings panels, agent
 * monitors, etc.).
 *
 * Behaviour:
 *   1. While `useAuth()` is loading, show a minimal spinner.
 *   2. If demo mode is on (DEV or VITE_ENABLE_DEMO=true), allow through —
 *      demo mode is the explicit "let me browse without auth" escape hatch.
 *   3. If no session, redirect to /auth.
 *   4. If session exists but `roles` is required and the user lacks it,
 *      redirect to /auth with a `?reason=forbidden` query.
 *   5. If session + roles OK, render the children.
 *
 * Note: this is a *UX* guard, not a security boundary. The real security
 * boundary is RLS on the database (see 20260719_rls_lockdown.sql) and
 * requireRole() on every edge function. ProtectedRoute prevents accidental
 * exposure of staff UI to logged-in customers; it does not protect data.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { isDemoMode } from '@/lib/demoMode';
import { Sun } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Roles allowed to view this route. Empty = any authenticated user. */
  roles?: AppRole[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, roles: userRoles, loading } = useAuth();
  const location = useLocation();

  // Demo mode bypasses auth (only available in DEV or when explicitly enabled)
  if (isDemoMode()) {
    return <>{children}</>;
  }

  // While auth state is loading, show a branded spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary mb-3 shadow-lg shadow-card">
            <Sun className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  // No session → redirect to /auth, preserving the intended destination
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Session exists but role check fails → redirect with forbidden reason
  if (roles && roles.length > 0) {
    const hasRequiredRole = userRoles.some(r => roles.includes(r));
    if (!hasRequiredRole) {
      return <Navigate to="/auth?reason=forbidden" state={{ from: location.pathname }} replace />;
    }
  }

  return <>{children}</>;
}
