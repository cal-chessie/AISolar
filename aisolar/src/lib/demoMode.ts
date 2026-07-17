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
    group: 'NEW — v3 Integration Build',
    routes: [
      { path: '/installer-v4', label: 'Installer Portal V4 (NEWEST — smooth)', desc: 'Simplified: today\'s jobs as cards → click → ONE scrollable JobView with BOM + site notes + install steps + handover signature. No more tab-hopping.' },
      { path: '/job', label: 'JobView (NEWEST)', desc: 'The single scrollable job page: BOM checklist + survey notes + 6-phase install steps (pre-install, roof, inverter, electrical, commissioning, handover) + photo capture + customer signature. Everything in the right order.' },
      { path: '/consultant', label: 'Consultant Cockpit V2', desc: 'Today\'s priorities, hot leads, auto-drafted proposals, stale leads, all tools' },
      { path: '/comms', label: 'Communication Hub', desc: 'Unified inbox: every customer touchpoint (email, SMS, calls, AI chat history) in one place' },
      { path: '/installer-bom', label: 'Installer BOM (legacy)', desc: 'Standalone BOM page — superseded by JobView which has BOM built in' },
      { path: '/intelligence', label: 'Intelligence Builder', desc: 'Installer drops in their own products, pricing, rules, labour rates. CSV import.' },
      { path: '/auth', label: 'Prestigious Auth', desc: 'Split-screen premium login — two paths: customer (book consultation) vs staff (sign in)' },
    ],
  },
  {
    group: 'NEW — v3 Customer + Installer Build',
    routes: [
      { path: '/installer-v3', label: 'Installer Portal V3', desc: 'Best-in-class field installer app: OSM map, route optimisation, materials, weather, mobile-first' },
      { path: '/customer-mobile', label: 'Customer Mobile Portal', desc: 'Mobile-first customer experience: timeline, paperwork, AI chat — what customers see on their phone' },
      { path: '/products', label: 'Professional Products', desc: 'Categorised product catalogue with bundles, margins, stock, "add to proposal" integration' },
      { path: '/analytics', label: 'Analytics Dashboard', desc: 'BI overhaul: revenue funnel, conversion rates, team performance, agent impact, SEAI pipeline' },
      { path: '/system-settings', label: 'System Settings', desc: 'The bedrock: email/SMS channels, kernel/Supabase, Vault secrets, pg_cron, integrations, audit log' },
    ],
  },
  {
    group: 'NEW — Installer-First Build (v2)',
    routes: [
      { path: '/installer', label: 'Installer Cockpit (v2)', desc: 'Today\'s jobs, surveys, materials, agents, handovers — installer-first build with role-aware AI coach' },
      { path: '/pipeline', label: 'Unified Pipeline', desc: 'Kanban of all leads with touchpoints + next automation that will fire' },
      { path: '/agents', label: 'Agent Foundation', desc: 'All 10 autonomous agents with status, last run, queue depth, manual trigger' },
    ],
  },
  {
    group: 'Public / Customer-Facing',
    routes: [
      { path: '/', label: 'Landing Page', desc: 'Marketing home — installer-first reframed (still needs audit refinement)' },
      { path: '/upload', label: 'Bill Upload + Calendar + Estimate Comparison', desc: 'Full flow: bill extract → AI estimate → lead capture → estimate-vs-proposal comparison → calendar booking' },
      { path: '/about', label: 'About Us (rewritten)', desc: 'Now matches the SaaS positioning — what AISOLAR actually does + the 10 agents' },
      { path: '/auth', label: 'Auth (Prestigious)', desc: 'Premium split-screen login — customer path (book consult) vs staff path (sign in)' },
      { path: '/customer/demo-token', label: 'Customer Portal (token)', desc: 'Token-gated customer view of one lead — proposal, contract, invoice, SEAI' },
    ],
  },
  {
    group: 'Onboarding / Demo',
    routes: [
      { path: '/demo', label: 'Browse All Views', desc: 'Adapt for launch: new installer signups can test-drive every view before committing' },
    ],
  },
  {
    group: 'Legacy (kept for reference)',
    routes: [
      { path: '/consultant-legacy', label: 'Old Consultant Dashboard', desc: 'The v1 PremiumDashboard — for comparison' },
      { path: '/installer-v2', label: 'Old Installer Dashboard', desc: 'The v2 InstallerFirstDashboard — for comparison' },
      { path: '/auth-legacy', label: 'Old Auth', desc: 'The v1 Auth page — for comparison' },
      { path: '/admin/settings', label: 'Old Admin Settings', desc: 'The v1 AdminSettings — replaced by /system-settings' },
      { path: '/admin/audit', label: 'Audit Dashboard', desc: 'Data integrity checks, workflow stats, entity counts' },
    ],
  },
];
