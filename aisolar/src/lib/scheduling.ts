/**
 * scheduling — the agent's ahead-of-time plan (Cal, 28 Jul .note → 7.1).
 *
 * Agents plan the best schedule ahead: the CONSULTANT'S surveys a WEEK out
 * (≤3/day, cluster nearby ones onto the same day), the INSTALLER'S installs a
 * FORTNIGHT out (1/day, sequence so consecutive days are geographically
 * adjacent — never crisscross the county from a home base).
 *
 * One engine, two configs — order the jobs into the shortest path from HOME
 * (reusing the route solver), then slice that path into working days by
 * capacity. Because the path is geographically coherent, each day's jobs sit
 * together AND adjacent days sit together. Pure + testable; the agent (Sweep 8)
 * runs it on a schedule and proposes the plan for a human to approve
 * (draft-never-send holds — a proposed schedule is a draft).
 *
 * BUSINESS OWNER FIRST, CUSTOMER ACCOMMODATED (Cal, 28 Jul). Start RIGID: this
 * function returns the plan that is best for the OWNER (least driving, tightest
 * days) — get that logic right first. The customer layer sits ON TOP and is
 * NOT in this rigid core: the messaging agent OFFERS the owner-optimal days to
 * the customer ("we can come Tue or Thu"), the customer picks, and only a
 * customer who can't take any offered day bends the plan — re-run with that
 * job's date locked (extension point: PlannableJob.lockedDate, honoured before
 * the solve; everything else optimises around it). The agent proposes, never
 * imposes; the owner approves. See docs/SWEEP_7.1.md.
 */
import { solveOrder, coordsForAddress, type GeoPoint } from '@/lib/routeOptimize';

export interface PlannableJob {
  id: string;
  address: string;
  /** free label for the caller (name, kind…) — not used by the solve */
  label?: string;
}

export interface PlannedDay {
  /** ISO date (00:00) the agent proposes for this day's work */
  date: string;
  jobs: PlannableJob[];
}

export interface SchedulePlan {
  days: PlannedDay[];
  /** jobs with no known position — surfaced, never silently dropped */
  unplaceable: PlannableJob[];
}

export interface PlanOptions {
  /** the consultant's / installer's base — every day starts here */
  home: GeoPoint;
  /** jobs per working day: consultant surveys ≈ 3, installs = 1 */
  perDayCapacity: number;
  /** first working day to place work on (defaults to the next working day) */
  startDate?: Date;
  /** skip Sat/Sun (default true) */
  workingDaysOnly?: boolean;
}

function nextWorkingDay(d: Date, workingDaysOnly: boolean): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  if (workingDaysOnly) while (n.getDay() === 0 || n.getDay() === 6) n.setDate(n.getDate() + 1);
  return n;
}
function advanceWorkingDay(d: Date, workingDaysOnly: boolean): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + 1);
  return nextWorkingDay(n, workingDaysOnly);
}

/**
 * Plan a set of jobs into day-by-day work from a home base.
 * Consultant week-ahead: planSchedule(surveys, { home, perDayCapacity: 3 }).
 * Installer fortnight-ahead: planSchedule(installs, { home, perDayCapacity: 1 }).
 */
export function planSchedule(jobs: PlannableJob[], opts: PlanOptions): SchedulePlan {
  const { home, perDayCapacity, workingDaysOnly = true } = opts;
  const cap = Math.max(1, perDayCapacity);

  // Separate jobs we can position from those we can't (honest — surfaced).
  const placeable: PlannableJob[] = [];
  const placeablePts: GeoPoint[] = [];
  const unplaceable: PlannableJob[] = [];
  for (const j of jobs) {
    const at = coordsForAddress(j.address);
    if (at) { placeable.push(j); placeablePts.push(at); }
    else unplaceable.push(j);
  }
  if (placeable.length === 0) return { days: [], unplaceable };

  // One efficient path from home (home pinned as the start), then drop home.
  const order = solveOrder([home, ...placeablePts], true);
  const sequence = order.slice(1).map(i => placeable[i - 1]);

  // Slice the geographically-ordered sequence into working days by capacity.
  const days: PlannedDay[] = [];
  let day = nextWorkingDay(opts.startDate ?? advanceWorkingDay(new Date(), workingDaysOnly), workingDaysOnly);
  for (let i = 0; i < sequence.length; i += cap) {
    days.push({ date: day.toISOString(), jobs: sequence.slice(i, i + cap) });
    day = advanceWorkingDay(day, workingDaysOnly);
  }
  return { days, unplaceable };
}
