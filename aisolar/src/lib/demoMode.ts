/**
 * Demo Mode helper — lets you browse all internal views without auth.
 *
 * v3 SECURITY: Demo mode is GATED BEHIND `import.meta.env.DEV`.
 * In production builds, `isDemoMode()` always returns `false`.
 */

const DEMO_KEY = 'aisolar_demo_mode';

const DEMO_AVAILABLE: boolean =
  (import.meta as any).env?.DEV === true ||
  (import.meta as any).env?.VITE_ENABLE_DEMO === 'true';

export function isDemoMode(): boolean {
  if (!DEMO_AVAILABLE) return false;
  if (typeof window === 'undefined') return false;

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
  if (!DEMO_AVAILABLE) return;
  try { localStorage.setItem(DEMO_KEY, '1'); } catch { /* ignore */ }
}

export function disableDemoMode(): void {
  try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
}

export function isDemoAvailable(): boolean {
  return DEMO_AVAILABLE;
}

/** Routes that exist in App.tsx, grouped for the demo navigation hub. */
export const ALL_ROUTES = [
  {
    group: 'Main Views',
    routes: [
      { path: '/owner', label: 'Owner Cockpit', desc: 'Sidebar + cockpit: pipeline, calendar, consultants, installers, clients, products, SEAI, agents, analytics, settings, CRM' },
      { path: '/consultant', label: 'Consultant', desc: '11 header tabs: Leads, Chats, Estimates, Surveys, Proposals, Installations, Calendar, Follow-ups, Products, Documents, Analytics' },
      { path: '/installer', label: 'Installer', desc: '3 tabs: Jobs (Active/Completed), Materials (Per Customer/Stock), Map' },
      { path: '/my-projects', label: 'Customer Portal', desc: 'Conversation-first chat with AI + documents + GDPR rights' },
    ],
  },
  {
    group: 'Workflow',
    routes: [
      { path: '/lead-flow', label: 'LeadFlow', desc: '5-step pipeline: Estimate → Eircode/Satellite → Survey → Design → Proposal → Send' },
      { path: '/job', label: 'JobView', desc: 'Tabbed installer checklist: Overview, Pre-install, Roof, Electrical, Commissioning, Handover' },
    ],
  },
  {
    group: 'Public',
    routes: [
      { path: '/', label: 'Landing Page', desc: 'Marketing home — installer-first' },
      { path: '/calculator', label: 'ROI Calculator', desc: 'Public, no signup. Monthly bill → instant estimate' },
      { path: '/about', label: 'About Us', desc: 'What AISOLAR does + the 10 agents' },
      { path: '/auth', label: 'Sign In / Sign Up', desc: 'Prestigious split-screen login' },
      { path: '/onboarding', label: 'Onboarding Tour', desc: '10-step guided tour for new signups' },
      { path: '/privacy', label: 'Privacy Policy', desc: 'GDPR compliant' },
      { path: '/terms', label: 'Terms of Service', desc: 'Irish consumer law' },
    ],
  },
];
