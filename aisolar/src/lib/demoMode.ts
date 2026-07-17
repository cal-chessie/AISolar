/**
 * Demo Mode helper — lets you browse all internal views without auth.
 *
 * Activate:   visit /#/demo (sets localStorage flag)  OR  ?demo=1 on any URL
 * Deactivate: click "Exit Demo" in the demo banner
 *
 * When active, guarded pages (ConsultantDashboard, InstallerPortal, AdminSettings,
 * AuditDashboard, CustomerDashboard) skip the `supabase.auth.getSession()` redirect
 * to /auth so the UI renders. Data fetches will return empty/error states because
 * there's no real Supabase session, but the layout, components, and interactions
 * are all visible for review.
 */

const DEMO_KEY = 'aisolar_demo_mode';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  // URL param wins
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') {
    try { localStorage.setItem(DEMO_KEY, '1'); } catch { /* ignore */ }
    return true;
  }
  if (params.get('demo') === '0') {
    try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
    return false;
  }
  try {
    return localStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}

export function enableDemoMode(): void {
  try { localStorage.setItem(DEMO_KEY, '1'); } catch { /* ignore */ }
}

export function disableDemoMode(): void {
  try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
}

/** Routes that exist in App.tsx, grouped for the demo navigation hub. */
export const ALL_ROUTES = [
  {
    group: 'Public / Customer-Facing',
    routes: [
      { path: '/', label: 'Landing Page', desc: 'Marketing home — AI bill analyser CTA, savings calc, FAQ' },
      { path: '/upload', label: 'Bill Upload', desc: 'AIBillAnalyser flow — lead capture from bill photo' },
      { path: '/upsell', label: 'Value Upsell', desc: 'Post-lead value-add upsell page' },
      { path: '/about', label: 'About Us', desc: 'Company info page' },
      { path: '/auth', label: 'Auth (Sign In / Sign Up)', desc: 'Login form with role picker (owner/consultant/installer/customer)' },
      { path: '/portal', label: 'Client Portal Lookup', desc: 'Email-based portal link finder (BROKEN: leaks access_token to anyone)' },
      { path: '/customer/demo-token', label: 'Customer Portal (token)', desc: 'Token-gated customer view of one lead — proposal, contract, invoice, SEAI' },
    ],
  },
  {
    group: 'Internal — Consultant / Owner',
    routes: [
      { path: '/consultant', label: 'Consultant Dashboard', desc: 'PremiumDashboard — leads, surveys, proposals, installations, calendar, follow-ups, analytics' },
      { path: '/my-projects', label: 'My Projects (Customer)', desc: 'CustomerDashboard — same email-based project list customers see' },
    ],
  },
  {
    group: 'Internal — Installer',
    routes: [
      { path: '/installer', label: 'Installer Portal', desc: 'InstallerDashboard — assignments, map view, availability, mobile companion' },
    ],
  },
  {
    group: 'Internal — Admin',
    routes: [
      { path: '/admin/settings', label: 'Admin Settings', desc: 'User management, follow-up thresholds, email templates (broken: not persisted), products' },
      { path: '/admin/audit', label: 'Audit Dashboard', desc: 'Data integrity checks, workflow stats, entity counts (BROKEN: no auth check)' },
    ],
  },
];
