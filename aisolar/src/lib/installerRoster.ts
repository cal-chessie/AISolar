/**
 * installerRoster — the named installers the owner works with, and the
 * per-installer facts a statutory form needs that AREN'T company-wide.
 *
 * The company's Safe Electric / RECI *registration* number is one value for the
 * whole business (companyCompliance.reciNumber). But the NC7-01 also asks for a
 * "Safe Electric Cert Number" — that is the certifier/completion-cert number of
 * the specific electrician who signs off the job, and it differs per installer.
 * So it belongs on the installer, captured once when the owner adds them here,
 * and read onto the cert for whoever the job is assigned to.
 *
 * Storage mirrors companyCompliance/tenantBrand: localStorage now, the tenants
 * table at launch — same shape, dual-written to tenant_settings so the cutover
 * is one function. This is one tenant's roster; never shared across tenants.
 */
import { pushTenantSetting } from '@/lib/serverStore';

const KEY = 'aisolar_installer_roster';

export interface Installer {
  id: string;
  /** As it appears on the job assignment — the match key onto a lead. */
  name: string;
  /** Safe Electric completion-cert / certifier number — NC7-01 page 2. */
  safeElectricCert: string;
}

export function getInstallers(): Installer[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveInstallers(list: Installer[]): Installer[] {
  const clean = list.filter(i => i.name.trim() !== '' || i.safeElectricCert.trim() !== '');
  try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* ignore */ }
  pushTenantSetting('installer_roster', clean); // dual-write → tenant_settings (cutover)
  window.dispatchEvent(new CustomEvent('installer-roster-changed'));
  return clean;
}

/** The Safe Electric Cert number for a named installer, '' if unknown.
 *  Name match is case-insensitive + trimmed — the assignment carries the name. */
export function findInstallerCert(name: string | undefined | null): string {
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return '';
  const hit = getInstallers().find(i => i.name.trim().toLowerCase() === n);
  return hit?.safeElectricCert.trim() ?? '';
}

/** React hook — re-renders when the roster changes in this tab or another. */
import { useEffect, useState } from 'react';
export function useInstallers(): Installer[] {
  const [list, setList] = useState<Installer[]>(() => getInstallers());
  useEffect(() => {
    const update = () => setList(getInstallers());
    window.addEventListener('installer-roster-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('installer-roster-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return list;
}
