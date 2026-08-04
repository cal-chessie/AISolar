/**
 * companyCompliance — the company-level facts every statutory form needs.
 *
 * These were sitting in `brand.legal` as empty strings with no way to fill
 * them, which meant the RECI number blocked EVERY NC6 and nobody could clear
 * it. They're true for the whole company, not per job, so they're captured
 * once in Owner → Settings and read by every template.
 *
 * Storage mirrors tenantBrand: localStorage now, the tenants table at launch —
 * same shape, so the swap is one function.
 */
import { brand } from '@/config/brand';
import { pushTenantSetting } from '@/lib/serverStore';

const KEY = 'aisolar_company_compliance';

export interface CompanyCompliance {
  /** Safe Electric / RECI electrical contractor registration. NC6 §3, RECI cert. */
  reciNumber: string;
  /** SEAI registered installer ID — the SEAI grant application. */
  seaiInstallerId: string;
  /** CRO company number — Declaration of Works, invoices. */
  croNumber: string;
  /** VAT registration — invoices. */
  vatNumber: string;
  /** Correspondence details ESB want for the installer (NC6 §3). */
  companyLandline: string;
  companyMobile: string;
  companyEmail: string;
  registeredAddress: string;
  /** The owner / authorised signatory who signs applications on the customer's
   *  behalf (NC7 §7). Name + their role in the business. */
  authorisedSignatory: string;
  signatoryPosition: string;
}

const DEFAULTS: CompanyCompliance = {
  reciNumber: brand.legal?.reciNumber ?? '',
  seaiInstallerId: '',
  croNumber: brand.legal?.companyNumber ?? '',
  vatNumber: brand.legal?.vatNumber ?? '',
  companyLandline: brand.contact?.phoneDisplay ?? '',
  companyMobile: '',
  companyEmail: brand.contact?.email ?? '',
  registeredAddress: brand.legal?.registeredAddress ?? '',
  authorisedSignatory: '',
  signatoryPosition: '',
};

export function getCompanyCompliance(): CompanyCompliance {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveCompanyCompliance(patch: Partial<CompanyCompliance>): CompanyCompliance {
  const next = { ...getCompanyCompliance(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  pushTenantSetting('company_compliance', next); // dual-write → tenant_settings (cutover)
  window.dispatchEvent(new CustomEvent('company-compliance-changed'));
  return next;
}

/** Which company-level fields are still blocking statutory forms. */
export function complianceGaps(): Array<{ field: string; why: string }> {
  const c = getCompanyCompliance();
  const gaps: Array<{ field: string; why: string }> = [];
  if (!c.reciNumber.trim()) gaps.push({ field: 'Safe Electric / RECI number', why: 'blocks every ESB NC6/NC7' });
  if (!c.seaiInstallerId.trim()) gaps.push({ field: 'SEAI installer ID', why: 'blocks the grant application' });
  if (!c.croNumber.trim()) gaps.push({ field: 'CRO number', why: 'Declaration of Works, invoices' });
  return gaps;
}

/** React hook — re-renders when the values change in this tab or another. */
import { useEffect, useState } from 'react';
export function useCompanyCompliance(): CompanyCompliance {
  const [c, setC] = useState<CompanyCompliance>(() => getCompanyCompliance());
  useEffect(() => {
    const update = () => setC(getCompanyCompliance());
    window.addEventListener('company-compliance-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('company-compliance-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return c;
}
