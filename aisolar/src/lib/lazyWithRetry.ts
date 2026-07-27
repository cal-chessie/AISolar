import { lazy, type ComponentType } from 'react';

/**
 * lazy() that survives a failed chunk fetch — the durable fix for
 * "Failed to fetch dynamically imported module".
 *
 * TWO failure modes, one error:
 *  - DEV: Vite re-optimises dependencies mid-session (a heavy dep like
 *    framer-motion / recharts gets discovered on a lazy route). Any dynamic
 *    import() in flight during the re-optimise 404s. (optimizeDeps.include in
 *    vite.config now pre-bundles those, so this should no longer fire — this is
 *    the belt to that braces.)
 *  - PROD: after a deploy, a browser tab opened on the OLD build asks for a
 *    lazy chunk whose hashed filename no longer exists. Same error, and
 *    optimizeDeps can't help there — this wrapper is the only fix.
 *
 * Strategy: one silent retry (covers a re-optimise that just finished), then a
 * single guarded hard reload so the user lands on the fresh module graph
 * instead of a dead screen. The sessionStorage guard makes a reload loop
 * impossible if the module is genuinely broken.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch {
      try {
        // transient: the re-optimise/network blip is usually over by now
        return await factory();
      } catch (err) {
        const KEY = 'aisolar_chunk_reload_at';
        const last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(KEY, String(Date.now()));
          window.location.reload();
        }
        throw err;
      }
    }
  });
}
