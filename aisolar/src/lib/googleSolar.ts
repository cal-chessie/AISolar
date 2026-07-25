/**
 * googleSolar.ts — Level 2 roof auto-detect (Google Maps Geocoding + Solar API).
 *
 * Eircode/address → lat,lng (Geocoding) → building insights (Solar API): real
 * roof geometry, max panels that fit, and sunshine potential. Where Google has
 * the roof (mostly urban Ireland), the calculator offers "auto-detect"; where it
 * doesn't (rural — Roscommon), these return null and we fall back to the keyless
 * draw-your-roof (Level 1). Never throws — every failure (no key, 404 no
 * coverage, CORS) resolves to null so the UI degrades gracefully.
 *
 * The key is a VITE_ (browser) var, so it ships in the bundle — it MUST be
 * HTTP-referrer + API restricted in Google Cloud. Production should proxy these
 * calls through an edge function so the key never ships; this client path is the
 * proof/coverage test.
 */
const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

export const hasMapsKey = () => !!KEY;

/**
 * A reliable satellite IMAGE (Static Maps API) for a lat/lng — unlike the
 * maps.google.com `output=embed` iframe, this always renders. The key stays in
 * this module (never handed to a component). `scale=2` = retina; zoom 20 ≈ a
 * single rooftop. Returns null with no key so the UI can fall back cleanly.
 */
export function staticMapUrl(lat: number, lng: number, opts?: { zoom?: number; w?: number; h?: number }): string | null {
  if (!KEY) return null;
  const { zoom = 20, w = 640, h = 384 } = opts ?? {};
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&scale=2&maptype=satellite&key=${KEY}`;
}

/**
 * Static Maps keyed to an ADDRESS / eircode string. Google geocodes the center
 * server-side, so the satellite image loads without a client-side geocode fetch
 * (which localhost CORS often blocks). This is what actually paints the roof.
 */
export function staticMapUrlForQuery(query: string, opts?: { zoom?: number; w?: number; h?: number }): string | null {
  if (!KEY || !query.trim()) return null;
  const { zoom = 20, w = 640, h = 384 } = opts ?? {};
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(query)}&zoom=${zoom}&size=${w}x${h}&scale=2&maptype=satellite&key=${KEY}`;
}

export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!KEY || !address.trim()) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=ie&key=${KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') { console.warn('[solar] geocode status', data.status, data.error_message ?? ''); return null; }
    const loc = data.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch (e) { console.warn('[solar] geocode failed (CORS?)', e); return null; }
}

export interface RoofInsight {
  panels: number;      // max panels that physically fit the roof
  kwp: number;         // that array's DC capacity
  sunshineHours: number;
  panelWatts: number;
}

export async function buildingInsights(lat: number, lng: number): Promise<RoofInsight | null> {
  if (!KEY) return null;
  try {
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=LOW&key=${KEY}`;
    const res = await fetch(url);
    if (!res.ok) { console.warn('[solar] buildingInsights', res.status, res.status === 404 ? '(no coverage here)' : ''); return null; }
    const d = await res.json();
    const sp = d.solarPotential;
    if (!sp?.maxArrayPanelsCount) return null;
    const panelWatts = sp.panelCapacityWatts || 400;
    return {
      panels: sp.maxArrayPanelsCount,
      kwp: Math.round((sp.maxArrayPanelsCount * panelWatts) / 100) / 10,
      sunshineHours: Math.round(sp.maxSunshineHoursPerYear || 0),
      panelWatts,
    };
  } catch (e) { console.warn('[solar] buildingInsights failed (CORS?)', e); return null; }
}

/** One call: address → roof insight, or null if unavailable. */
export async function detectRoof(address: string): Promise<RoofInsight | null> {
  const loc = await geocode(address);
  return loc ? buildingInsights(loc.lat, loc.lng) : null;
}
