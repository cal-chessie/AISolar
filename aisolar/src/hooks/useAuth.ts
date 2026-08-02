import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hydrateTenantSettings } from '@/lib/serverStore';
import { User, Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'owner' | 'consultant' | 'installer' | 'customer';

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    loading: true,
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));
        
        // Defer role fetching with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchRoles(session.user.id);
            hydrateTenantSettings(); // READ-FLIP: DB settings become truth on sign-in (once per user)
          }, 0);
        } else {
          setAuthState(prev => ({ ...prev, roles: [], loading: false }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));
      
      if (session?.user) {
        fetchRoles(session.user.id);
        hydrateTenantSettings(); // READ-FLIP on app boot with an existing session
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;

      const roles = (data || []).map(r => r.role as AppRole);
      setAuthState(prev => ({ ...prev, roles, loading: false }));
    } catch (error) {
      console.error('Error fetching roles:', error);
      setAuthState(prev => ({ ...prev, roles: [], loading: false }));
    }
  };

  const hasRole = (role: AppRole): boolean => {
    return authState.roles.includes(role);
  };

  const isOwner = (): boolean => {
    // Owner = the explicit 'owner' role (all views in their org).
    // Legacy fallback: a solo account holding admin+consultant+installer.
    return authState.roles.includes('owner') ||
           (authState.roles.includes('admin') &&
            authState.roles.includes('consultant') &&
            authState.roles.includes('installer'));
  };

  const isSoloMode = (): boolean => {
    // Solo mode = has multiple roles
    return authState.roles.length > 1;
  };

  const getDefaultRoute = (): string => {
    // Owner lands in the owner cockpit (all views)
    if (authState.roles.includes('owner')) {
      return '/owner';
    }
    // If only installer role, go to installer portal
    if (authState.roles.length === 1 && authState.roles.includes('installer')) {
      return '/installer';
    }
    if (authState.roles.length === 1 && authState.roles.includes('customer')) {
      return '/my-projects';
    }
    // Otherwise go to consultant dashboard (unified for owners and consultants)
    return '/consultant';
  };

  return {
    ...authState,
    hasRole,
    isOwner,
    isSoloMode,
    getDefaultRoute,
  };
}
