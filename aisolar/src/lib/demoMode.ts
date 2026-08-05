/**
 * Demo Mode helper — lets you browse all internal views without auth.
 *
 * v3 SECURITY: Demo mode is GATED BEHIND `import.meta.env.DEV`.
 * In production builds, `isDemoMode()` always returns `false`.
 */

const DEMO_KEY = 'aisolar_demo_mode';
const IS_DEV: boolean = (import.meta as any).env?.DEV === true;

/* THE TIGHTENING (5 Aug): a REAL signed-in session forces demo data OFF —
 * whatever the sticky ?demo=1 flag or a leaked VITE_ENABLE_DEMO says. Before
 * this, useLeads chose demo-vs-real on the localStorage flag ALONE, so a stray
 * ?demo=1 could silently swap a paying tenant's real pipeline for the fabricated
 * cast and persist it across reloads. Now: signed in ⇒ your real data, full
 * stop. Demo is the signed-out / prospect-walkthrough state.
 *
 * A module-level cached flag (not an await) so the many SYNC callers
 * (coachBrain, installerRoster, dummyData seeds) all tighten at once. Seeded on
 * load and kept live by an auth listener — set up once, lazily, on first use. */
let realSessionActive = false;
let sessionWatchStarted = false;
function startSessionWatch(): void {
  if (sessionWatchStarted || typeof window === 'undefined') return;
  sessionWatchStarted = true;
  void (async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.auth.getSession();
      realSessionActive = !!data.session;
      supabase.auth.onAuthStateChange((_e, session) => { realSessionActive = !!session; });
    } catch { /* no client / offline — demo stays governed by the flag alone */ }
  })();
}

/** True when a real authenticated session is present. The data layer treats
 *  this as the override: a real operator never sees the demo cast. */
export function hasRealSession(): boolean { return realSessionActive; }

/* TWO different things were tangled behind one flag (found 3 Aug, A9/A10):
 *   1. DEMO DATA — the 10 archetypes + the guided tour. Cal WANTS this in
 *      production: every new user meets the cast and is walked round the spine
 *      as their onboarding + training. It is a FEATURE, opt-in, per user.
 *   2. AUTH BYPASS — walking straight into any cockpit with no session. That is
 *      a dev/staging convenience and must be IMPOSSIBLE in a production build,
 *      even if VITE_ENABLE_DEMO leaks into the env.
 * They are now separate switches. Demo data can never let someone skip login. */
const DEMO_AVAILABLE: boolean =
  (import.meta as any).env?.DEV === true ||
  (import.meta as any).env?.VITE_ENABLE_DEMO === 'true';

/** Auth bypass — DEV builds ONLY. A production bundle can never bypass login,
 *  whatever the env says. (import.meta.env.PROD is set by Vite at build time.) */
export function isAuthBypassAllowed(): boolean {
  if ((import.meta as any).env?.PROD === true) return false;
  return (import.meta as any).env?.DEV === true && isDemoMode();
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  startSessionWatch();

  // THE MODEL (Cal, 5 Aug — his spec): demo is the owner's SANDBOX, flicked from
  // a toggle in their sidebar. So the cast shows for a signed-in owner (in prod:
  // onboarding / training / sandbox) or in DEV (build work). An anonymous
  // production visitor NEVER sees fabricated leads. Note this is NOT gated on
  // DEMO_AVAILABLE (that's the dev/staging banner's gate) — the owner's sample
  // toggle is a real product feature that must work in production.
  if (!(IS_DEV || realSessionActive)) return false;

  // Controlled ONLY by the deliberate toggle (localStorage). The old ?demo=1
  // URL control is GONE — that sticky param was the footgun that could flip a
  // real tenant into demo behind their back. A URL can no longer touch it.
  try {
    return localStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}


/** Flip the sandbox ON. The sidebar toggle calls this; nothing else should. */
export function enableDemoMode(): void {
  try { localStorage.setItem(DEMO_KEY, '1'); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('demo-mode-changed')); } catch { /* ignore */ }
}

export function disableDemoMode(): void {
  try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('demo-mode-changed')); } catch { /* ignore */ }
}

/** The owner sidebar toggle is shown when the sandbox is usable here: a signed-in
 *  owner (the product feature) or DEV (build work). */
export function isDemoToggleAvailable(): boolean {
  return IS_DEV || realSessionActive;
}

/** THE safe accessor for fabricated leads. Returns [] unless demo is
 *  deliberately on, so no surface can ever show invented customers by accident
 *  (the coach was doing exactly that — ungated — before 3 Aug). */
export async function demoLeads() {
  if (!isDemoMode()) return [];
  const { generateDummyLeads } = await import('./dummyData');
  return generateDummyLeads();
}

/** Sync variant for pure libs that cannot await (coachBrain). Callers MUST
 *  handle an empty list — that is the honest state when demo is off. */
export function demoLeadsSync(gen: () => unknown[]): unknown[] {
  return isDemoMode() ? gen() : [];
}

export function isDemoAvailable(): boolean {
  return DEMO_AVAILABLE;
}
