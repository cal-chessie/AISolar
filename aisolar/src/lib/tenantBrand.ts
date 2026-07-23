/**
 * tenantBrand — makes per-tenant branding ACTUALLY work (Cal's #19).
 *
 * The static `brand` config is the default. The owner's Brand tab saves
 * overrides here (localStorage now; the tenants table at launch — same shape,
 * so the swap is one function). Cockpit headers and customer surfaces read
 * through getTenantBrand() so a new tenant's name/logo apply everywhere
 * without touching code.
 */
import { brand } from '@/config/brand';

const KEY = 'aisolar_tenant_brand';

export interface TenantBrand {
  name: string;
  tagline: string;
  logoDataUrl: string | null;   // uploaded logo (data URL); null = use default mark
  proposalCompanyName: string;
  portalTitle: string;
}

const DEFAULTS: TenantBrand = {
  name: brand.name,
  tagline: brand.tagline,
  logoDataUrl: null,
  proposalCompanyName: brand.legal?.tradingName ?? brand.name,
  portalTitle: `${brand.name} — My Project`,
};

export function getTenantBrand(): TenantBrand {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveTenantBrand(patch: Partial<TenantBrand>): TenantBrand {
  const next = { ...getTenantBrand(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  // same-tab listeners (storage events only fire cross-tab)
  window.dispatchEvent(new CustomEvent('tenant-brand-changed'));
  return next;
}

/** React hook — re-renders when branding changes (same tab or another tab). */
import { useEffect, useState } from 'react';
export function useTenantBrand(): TenantBrand {
  const [b, setB] = useState<TenantBrand>(() => getTenantBrand());
  useEffect(() => {
    const update = () => setB(getTenantBrand());
    window.addEventListener('tenant-brand-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('tenant-brand-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return b;
}
