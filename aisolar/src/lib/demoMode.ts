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
    group: 'Main Views (what you get after sign-in)',
    routes: [
      { path: '/consultant', label: 'Consultant Inbox', desc: 'Messaging app: lead list → click → conversation thread. Click "Open flow" for the LeadFlow pipeline.' },
      { path: '/installer', label: 'Installer Portal', desc: 'Today\'s jobs as cards → click → tabbed JobView with BOM + install checklist + handover signature.' },
      { path: '/my-projects', label: 'Customer Portal', desc: 'Conversation-first: chat thread with the company. AI assistant, documents, GDPR rights.' },
      { path: '/lead-flow', label: 'LeadFlow (THE PIPELINE)', desc: '5-step flow: Estimate → Eircode/satellite → Survey (real SiteSurveyForm) → Design (panel layout on satellite) → Proposal (finance + AI coach) → Send.' },
      { path: '/job', label: 'JobView', desc: 'Tabbed installer checklist: Overview, Pre-install, Roof, Electrical, Commissioning, Handover. Toggles, named photos, customer signature.' },
    ],
  },
  {
    group: 'Tools + Analytics',
    routes: [
      { path: '/comms', label: 'Communication Hub', desc: 'Unified inbox across all leads — filter by channel, search, reply.' },
      { path: '/pipeline', label: 'Pipeline Kanban', desc: 'All leads by stage with touchpoints + next automation.' },
      { path: '/agents', label: 'Agent Foundation', desc: '10 autonomous agents with real runs, queue depth, manual trigger.' },
      { path: '/products', label: 'Product Catalogue', desc: 'Panels, inverters, batteries, bundles with margins + stock.' },
      { path: '/intelligence', label: 'Intelligence Builder', desc: 'Installer drops in their own products, pricing, rules. CSV import.' },
      { path: '/analytics', label: 'Analytics', desc: 'Funnel, team performance, agent impact, SEAI pipeline.' },
      { path: '/system-settings', label: 'System Settings', desc: 'Email/SMS channels, kernel, Vault secrets, pg_cron, integrations, audit.' },
      { path: '/customer-profile', label: 'Customer 360° Profile', desc: 'Full intelligence profile per customer.' },
      { path: '/calculator', label: 'ROI Calculator (public)', desc: 'No signup. Monthly bill slider → instant estimate. SEO + lead capture.' },
    ],
  },
  {
    group: 'Public + Onboarding',
    routes: [
      { path: '/', label: 'Landing Page', desc: 'Marketing home — installer-first.' },
      { path: '/upload', label: 'Bill Upload', desc: 'AI bill extract → estimate → comparison → calendar booking.' },
      { path: '/about', label: 'About Us', desc: 'What AISOLAR does + the 10 agents.' },
      { path: '/auth', label: 'Sign In / Sign Up', desc: 'Prestigious split-screen login. Customer path → bill upload. Staff path → dashboard.' },
      { path: '/onboarding', label: 'Onboarding Tour', desc: '10-step guided tour for new signups.' },
      { path: '/demo', label: 'Browse All Views', desc: 'Full route index.' },
      { path: '/privacy', label: 'Privacy Policy', desc: 'GDPR compliant.' },
      { path: '/terms', label: 'Terms of Service', desc: 'Irish consumer law.' },
    ],
  },
  {
    group: 'Legacy (for reference only)',
    routes: [
      { path: '/consultant-legacy', label: 'Old Consultant Dashboard', desc: 'v1 PremiumDashboard.' },
      { path: '/installer-legacy', label: 'Old Installer Portal', desc: 'v1 thin shell.' },
      { path: '/my-projects-legacy', label: 'Old Customer Dashboard', desc: 'v1 CustomerDashboard.' },
      { path: '/job-v1', label: 'Old JobView (scroll)', desc: 'v1 single-scroll.' },
    ],
  },
];
