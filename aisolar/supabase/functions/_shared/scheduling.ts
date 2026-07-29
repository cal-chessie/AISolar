/**
 * scheduling — the agents' date logic, server side.
 *
 * MIRRORS the intent of `src/lib/scheduling.ts`. Edge functions can't import from
 * `src/` (Deno vs Vite), so — exactly like the `PER_KWP` and `ndmg` mirrors in
 * agent-drain — the pure logic is copied here. KEEP IN STEP with
 * `src/lib/scheduling.ts` + `src/lib/routeOptimize.ts`.
 *
 * WHAT THIS DOES TODAY (needs no geocoding): find the NEXT FREE WORKING DAY for a
 * surveyor/installer — skip weekends, respect a lead time, and never exceed that
 * person's per-day capacity (surveys ≈ 3/day, installs = 1/day). This replaces
 * the old blind `today + 5` / `today + 28` stamps: the agent stops guessing a
 * date and finds the next day the person is actually free.
 *
 * WHAT'S DEFERRED to Sweep 8 (needs geocoded lat/lng on leads + Google Distance
 * Matrix): ordering the run geographically so consecutive days sit next to each
 * other (the routeOptimize half of the brain). Until lead addresses carry
 * coordinates, that ordering can't run server-side — so this module intentionally
 * does the working-day/capacity half only, and the geographic half stays a
 * documented hook (see `SWEEP8_DB_WIRING.md`, migration #12). No half-built code.
 *
 * Deterministic + pure: the agent PROPOSES the slot; a human still confirms
 * (draft-never-send holds — see the agent handlers).
 */

export interface FreeSlotOptions {
  /** earliest the work may happen, in whole days from now (notice / materials) */
  leadDays: number;
  /** ISO datetimes already booked for this resource (their upcoming jobs) */
  booked: string[];
  /** max jobs this resource does in a day (surveys ≈ 3, installs = 1) */
  perDayCapacity: number;
  /** hour to set on the slot, 24h (10 for surveys, 8 for installs) */
  hour: number;
  /** skip Sat/Sun (default true) */
  workingDaysOnly?: boolean;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Deno runs in UTC; use UTC day-of-week so weekend detection is stable. */
function isWorkingDay(d: Date): boolean {
  const g = d.getUTCDay();
  return g !== 0 && g !== 6;
}

/**
 * The next working day, at least `leadDays` out, that still has spare capacity
 * for this resource. Never double-books; never lands on a weekend.
 */
export function nextFreeWorkingDay(opts: FreeSlotOptions): Date {
  const { leadDays, booked, perDayCapacity, hour, workingDaysOnly = true } = opts;

  // Existing load per calendar day (so we don't overfill someone's day).
  const load = new Map<string, number>();
  for (const iso of booked) {
    if (!iso) continue;
    const k = dayKey(new Date(iso));
    load.set(k, (load.get(k) ?? 0) + 1);
  }

  // Start `leadDays` out, then walk forward to the first working day with room.
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() + Math.max(0, leadDays));

  for (let i = 0; i < 730; i++) { // 2-year safety bound — never loops forever
    const okDay = !workingDaysOnly || isWorkingDay(cursor);
    const hasRoom = (load.get(dayKey(cursor)) ?? 0) < Math.max(1, perDayCapacity);
    if (okDay && hasRoom) {
      const slot = new Date(cursor);
      slot.setUTCHours(hour, 0, 0, 0);
      return slot;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Unreachable in practice; degrade to lead-time at the hour.
  const fallback = new Date();
  fallback.setUTCDate(fallback.getUTCDate() + Math.max(0, leadDays));
  fallback.setUTCHours(hour, 0, 0, 0);
  return fallback;
}
