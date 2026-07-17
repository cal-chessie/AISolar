/**
 * Demo Mode helper — lets you browse all internal views without auth.
 *
 * v3 SECURITY UPDATE: Demo mode is now GATED BEHIND `import.meta.env.DEV`.
 * In production builds, `isDemoMode()` always returns `false`. The `?demo=1`
 * URL trick and localStorage flag no longer work in production — they were
 * an auth bypass on production deployments.
 *
 * In dev (vite dev server, `npm run dev`), demo mode works as before.
 *
 * For staging/QA without auth, run a separate deployment on a separate domain
 * with `VITE_ENABLE_DEMO=true` (a build-time flag).
 *
 * Activate:   visit /#/demo (sets localStorage flag)  OR  ?demo=1 on any URL — DEV ONLY
 * Deactivate: click "Exit Demo" in the demo banner
 */

const DEMO_KEY = 'aisolar_demo_mode';

/** Demo mode is only ever available in dev builds OR if explicitly enabled
 * at build time via VITE_ENABLE_DEMO=true. Production builds ALWAYS return false. */
const DEMO_AVAILABLE: boolean =
  (import.meta as any).env?.DEV === true ||
  (import.meta as any).env?.VITE_ENABLE_DEMO === 'true';

export function isDemoMode(): boolean {
  if (!DEMO_AVAILABLE) return false; // hard gate — no escape in production
  if (typeof window === 'undefined') return false;

  // URL param wins (dev only)
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
  if (!DEMO_AVAILABLE) return; // no-op in production
  try { localStorage.setItem(DEMO_KEY, '1'); } catch { /* ignore */ }
}

export function disableDemoMode(): void {
  try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
}

/** Returns true if demo mode is available in this build (for UI hints). */
export function isDemoAvailable(): boolean {
  return DEMO_AVAILABLE;
}

/** Routes that exist in App.tsx, grouped for the demo navigation hub. */
export const ALL_ROUTES = [
  {
    group: 'NEW — v3 Customer + Installer Build',
    routes: [
      { path: '/installer-v3', label: 'Installer Portal V3 (NEW)', desc: 'Best-in-class field installer app: OSM map, route optimisation, materials, weather, mobile-first' },
      { path: '/customer-mobile', label: 'Customer Mobile Portal (NEW)', desc: 'Mobile-first customer experience: timeline, paperwork, AI chat — what customers see on their phone' },
      { path: '/products', label: 'Professional Products (NEW)', desc: 'Categorised product catalogue with bundles, margins, stock, "add to proposal" integration' },
      { path: '/analytics', label: 'Analytics Dashboard (NEW)', desc: 'BI overhaul: revenue funnel, conversion rates, team performance, agent impact, SEAI pipeline' },
      { path: '/system-settings', label: 'System Settings (NEW)', desc: 'The bedrock: email/SMS channels, kernel/Supabase, Vault secrets, pg_cron, integrations, audit log' },
    ],
  },
  {
    group: 'NEW — Installer-First Build (v2)',
    routes: [
      { path: '/installer', label: 'Installer Cockpit', desc: 'Today\'s jobs, surveys, materials, agents, handovers — installer-first build with role-aware AI coach' },
      { path: '/pipeline', label: 'Unified Pipeline', desc: 'Kanban of all leads with touchpoints + next automation that will fire' },
      { path: '/agents', label: 'Agent Foundation', desc: 'All 10 autonomous agents with status, last run, queue depth, manual trigger' },
    ],
  },
  {
    group: 'Public / Customer-Facing',
    routes: [
      { path: '/', label: 'Landing Page', desc: 'Marketing home — AI bill analyser CTA, savings calc, FAQ' },
      { path: '/upload', label: 'Bill Upload + Calendar Booking', desc: 'AIBillAnalyser flow → calendar booking after lead capture (NEW in v3)' },
      { path: '/upsell', label: 'Value Upsell', desc: 'Post-lead value-add upsell page' },
      { path: '/about', label: 'About Us', desc: 'Company info page' },
      { path: '/auth', label: 'Auth (Sign In / Sign Up)', desc: 'Login form with role picker (owner/consultant/installer/customer)' },
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
    group: 'Internal — Installer (legacy)',
    routes: [
      { path: '/installer-v2', label: 'Legacy Installer Dashboard', desc: 'Old thin-shell installer view (kept for comparison)' },
    ],
  },
  {
    group: 'Internal — Admin',
    routes: [
      { path: '/admin/settings', label: 'Admin Settings (legacy)', desc: 'User management, follow-up thresholds, email templates, products' },
      { path: '/admin/audit', label: 'Audit Dashboard', desc: 'Data integrity checks, workflow stats, entity counts' },
    ],
  },
];
