/**
 * tenant — the client seam onto the A1 multi-tenant foundation.
 *
 * The DB does the real work: provision_tenant() (security-definer) creates the
 * tenant and makes the CARD-PAYER its admin (see 20260804_a1_tenants.sql). The
 * model is one-tenant-per-user via user_roles.tenant_id, read by the RLS floor.
 */
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export interface Tenant {
  id: string;
  name: string;
  trading_name: string | null;
  county: string | null;
  accent: string | null;
  logo_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  seats: number;
  trial_ends_at: string | null;
  created_at: string;
}

/**
 * Provision the caller's tenant (idempotent — one per user). Call this once the
 * card-payer has completed signup + card. Returns the tenant id, or null on error.
 */
export async function provisionTenant(name: string, county?: string | null, tradingName?: string | null): Promise<string | null> {
  const { data, error } = await supabase.rpc('provision_tenant', {
    p_name: name, p_county: county ?? null, p_trading_name: tradingName ?? null,
  });
  if (error) { console.error('[tenant] provisionTenant', error.message); return null; }
  return (data as string) ?? null;
}

/** The signed-in user's tenant, or null (customer / not provisioned / demo). */
export async function getMyTenant(): Promise<Tenant | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return null;
    const { data: role } = await supabase
      .from('user_roles').select('tenant_id')
      .eq('user_id', uid).not('tenant_id', 'is', null).limit(1).maybeSingle();
    if (!role?.tenant_id) return null;
    const { data: tenant } = await supabase
      .from('tenants').select('*').eq('id', role.tenant_id).maybeSingle();
    return (tenant as Tenant) ?? null;
  } catch (e) {
    console.warn('[tenant] getMyTenant', e);
    return null;
  }
}

/** Days left on the trial (null if no trial / already ended handled by caller). */
export function trialDaysLeft(t: Tenant | null): number | null {
  if (!t?.trial_ends_at) return null;
  return Math.ceil((new Date(t.trial_ends_at).getTime() - Date.now()) / 86_400_000);
}

/** React hook — the current tenant, loaded once, refreshed on auth change. */
export function useTenant(): { tenant: Tenant | null; loading: boolean } {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    getMyTenant().then(t => { if (live) { setTenant(t); setLoading(false); } });
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      getMyTenant().then(t => { if (live) setTenant(t); });
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);
  return { tenant, loading };
}
