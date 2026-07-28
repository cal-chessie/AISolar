/**
 * routeOptimize — an ACTUAL vehicle-routing solve, not a slogan.
 *
 * Cal, 28 Jul: "you're driving the whole way around Dublin to get 15km?" —
 * because the old map sorted stops by APPOINTMENT TIME and then claimed it was
 * "one loop, never back twice." That was copy written over code that did no
 * such thing. This module does the thing: nearest-neighbour + 2-opt over real
 * positions, an open path (the crew goes HOME from the last job, not back to
 * the start), and a saved-distance figure that is COMPUTED — or not shown.
 *
 * Positions today: a gazetteer of the demo's real Dublin neighbourhoods
 * (below). At launch this swaps for the Google Distance Matrix (real drive
 * time, via the Maps key already in env, proxied) — the optimiser is
 * unchanged; only the cost function gets more accurate. Truth-pass: distances
 * are ROAD-approximate (straight-line × detour factor) and labelled "~".
 */

export interface GeoPoint { lat: number; lng: number }

/** Straight-line distance km (haversine). */
function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180, la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** City roads aren't straight lines. ~1.35× is the standard urban detour
 *  factor — good enough to ORDER stops and to state an honest "~X km". Real
 *  drive time replaces this at launch (Distance Matrix). */
const DETOUR = 1.35;
const roadKm = (a: GeoPoint, b: GeoPoint) => haversineKm(a, b) * DETOUR;

/** Effective urban speed incl. stops/lights — for a rough minutes figure. */
const URBAN_KMH = 28;

/** Total length of an OPEN path (start → … → end, no return leg). */
function pathKm(pts: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += roadKm(pts[i - 1], pts[i]);
  return total;
}

/** Nearest-neighbour from a given start index, then 2-opt on the open path. */
function nnThen2opt(points: GeoPoint[], start: number, pinStart: boolean): number[] {
  const n = points.length;
  const visited = new Array(n).fill(false);
  const order = [start];
  visited[start] = true;
  for (let step = 1; step < n; step++) {
    const last = order[order.length - 1];
    let best = -1, bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const d = roadKm(points[last], points[j]);
      if (d < bestD) { bestD = d; best = j; }
    }
    order.push(best); visited[best] = true;
  }
  // 2-opt: reverse open-path segments; index 0 only fixed when pinStart.
  const dist = (o: number[]) => pathKm(o.map(i => points[i]));
  const lo = pinStart ? 1 : 0;
  let improved = true, bestLen = dist(order);
  while (improved) {
    improved = false;
    for (let i = Math.max(lo, 1); i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const cand = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        const len = dist(cand);
        if (len < bestLen - 1e-6) { order.splice(0, n, ...cand); bestLen = len; improved = true; }
      }
    }
  }
  return order;
}

/** Solve the open-route visiting order (indices into `points`).
 *  - pinnedStart=true (a depot pickup): index 0 is fixed as the start; the crew
 *    MUST collect gear first, so we optimise the rest after it.
 *  - pinnedStart=false (no depot): the crew leaves from home, so there is no
 *    natural start — try every node as the start and keep the shortest open
 *    path. For ≤~10 stops this is near-optimal and instant. */
export function solveOrder(points: GeoPoint[], pinnedStart = true): number[] {
  const n = points.length;
  if (n <= 2) return points.map((_, i) => i);
  const dist = (o: number[]) => pathKm(o.map(i => points[i]));
  if (pinnedStart) return nnThen2opt(points, 0, true);
  let best = nnThen2opt(points, 0, false), bestLen = dist(best);
  for (let s = 1; s < n; s++) {
    const cand = nnThen2opt(points, s, false);
    const len = dist(cand);
    if (len < bestLen - 1e-6) { best = cand; bestLen = len; }
  }
  return best;
}

export interface RouteResult {
  /** input indices in the optimised visiting order */
  order: number[];
  optimisedKm: number;
  /** the length of the order they'd otherwise drive (input/as-listed order) */
  asListedKm: number;
  savedKm: number;
  savedMin: number;
}

/** Optimise an open route over points in "as-listed" (time/insertion) order.
 *  `pinnedStart` fixes points[0] as the start (a depot pickup). Returns null
 *  under 3 stops (nothing to optimise) — callers then show honest neutral
 *  copy, never an optimisation claim. */
export function optimiseRoute(points: GeoPoint[], pinnedStart = true): RouteResult | null {
  if (points.length < 3) return null;
  const order = solveOrder(points, pinnedStart);
  const optimisedKm = pathKm(order.map(i => points[i]));
  const asListedKm = pathKm(points);
  const savedKm = Math.max(0, asListedKm - optimisedKm);
  return {
    order,
    optimisedKm,
    asListedKm,
    savedKm,
    savedMin: Math.round((savedKm / URBAN_KMH) * 60),
  };
}

/**
 * Demo gazetteer — the real positions of the seeded Dublin addresses, so the
 * solve runs on truth in demo mode. Matched by neighbourhood substring so it
 * survives house-number edits. Unknown address → null → caller falls back to
 * as-listed order WITHOUT claiming optimisation (truth-pass).
 * At launch: delete this, geocode/Distance-Matrix the real lead addresses.
 */
const GAZETTEER: Array<{ key: RegExp; at: GeoPoint }> = [
  { key: /donnybrook/i, at: { lat: 53.3200, lng: -6.2350 } },
  { key: /ballsbridge|shrewsbury/i, at: { lat: 53.3270, lng: -6.2280 } },
  { key: /sandymount/i, at: { lat: 53.3350, lng: -6.2170 } },
  { key: /bray/i, at: { lat: 53.2010, lng: -6.1100 } },
  { key: /foxrock/i, at: { lat: 53.2620, lng: -6.1720 } },
  { key: /dundrum/i, at: { lat: 53.2940, lng: -6.2410 } },
  { key: /clontarf/i, at: { lat: 53.3630, lng: -6.2000 } },
  { key: /howth/i, at: { lat: 53.3870, lng: -6.0650 } },
  { key: /ranelagh/i, at: { lat: 53.3245, lng: -6.2560 } },
  { key: /rathgar|orwell/i, at: { lat: 53.3080, lng: -6.2680 } },
  { key: /glasnevin/i, at: { lat: 53.3720, lng: -6.2720 } },
  { key: /rathmines/i, at: { lat: 53.3230, lng: -6.2650 } },
  { key: /citywest/i, at: { lat: 53.2838, lng: -6.4239 } }, // the depot
];

export function coordsForAddress(address: string): GeoPoint | null {
  return GAZETTEER.find(g => g.key.test(address))?.at ?? null;
}
