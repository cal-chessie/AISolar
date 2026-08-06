/**
 * errorReporting — the observability floor. Render crashes (ErrorBoundary) and
 * uncaught errors / unhandled rejections report to `client_errors` so there's a
 * place to SEE what breaks in production (query it as a platform admin). No Sentry
 * account needed; Sentry is the richer upgrade later.
 *
 * Rules: demo-guarded, deduped, size-bounded, TOKEN-MASKED (the customer
 * magic-link token must never land in a log — see #60), and it NEVER throws.
 */
import { supabase } from '@/integrations/supabase/client';
import { isDemoMode } from './demoMode';

/** /customer/<64-hex-token> → /customer/<token>. Keeps the token out of any log. */
export function maskPath(path: string): string {
  return (path || '').replace(/\/customer\/[^/?#]+/i, '/customer/<token>');
}

let lastKey = '';
let lastAt = 0;

/** Best-effort crash report. Demo-guarded, deduped (10s window), never throws. */
export function reportClientError(message: string, opts?: { source?: string; stack?: string }): void {
  try {
    if (isDemoMode()) return; // sandbox — don't log demo noise
    const msg = String(message || 'Unknown error').slice(0, 2000);
    const source = opts?.source ?? 'app';
    const key = source + '|' + msg.slice(0, 120);
    const now = Date.now();
    if (key === lastKey && now - lastAt < 10_000) return; // collapse repeats
    lastKey = key;
    lastAt = now;
    void supabase.from('client_errors').insert({
      message: msg,
      source,
      stack: opts?.stack ? opts.stack.slice(0, 8000) : null,
      path: maskPath(typeof location !== 'undefined' ? location.pathname : ''),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : null,
    });
  } catch {
    /* a logger that throws is worse than the bug — swallow */
  }
}

/** Install global handlers for uncaught errors + unhandled promise rejections.
 *  Call once at app startup. */
export function installGlobalErrorReporting(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    reportClientError(e.message || 'window.onerror', {
      source: 'window.onerror',
      stack: (e.error as Error | undefined)?.stack,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | string | undefined;
    const message = typeof r === 'string' ? r : (r?.message || 'unhandledrejection');
    reportClientError(message, {
      source: 'unhandledrejection',
      stack: typeof r === 'object' ? r?.stack : undefined,
    });
  });
}
