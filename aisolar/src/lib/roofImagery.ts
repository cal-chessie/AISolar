/**
 * roofImagery.ts — keyless satellite imagery for the Design Studio.
 *
 * Google Static Maps needs the "Maps Static API" enabled on the project and a
 * referrer-allowed key; the browser Geocoding/Solar calls also hit CORS from
 * localhost. This path sidesteps both: OpenStreetMap Nominatim geocodes the
 * address (CORS-enabled), and Esri World Imagery returns a satellite export as a
 * plain <img> (no key, no CORS). So the roof always paints.
 *
 * Note for production: the Esri World Imagery basemap requires attribution and a
 * licence for commercial use at volume. For the licensed path, enable Google
 * Maps Static API and proxy the key through an edge function.
 */

export async function osmGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ie&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = Array.isArray(data) ? data[0] : null;
    return hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
  } catch {
    return null;
  }
}

/** Esri World Imagery export centred on lat/lng, framed to roughly one rooftop. */
export function esriImageryUrl(lat: number, lng: number, opts?: { w?: number; h?: number; spanMeters?: number }): string {
  const { w = 720, h = 540, spanMeters = 70 } = opts ?? {};
  const R = 6378137;
  const x = (R * lng * Math.PI) / 180;
  const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  const halfH = spanMeters / 2;
  const halfW = (halfH * w) / h; // match ground aspect to image aspect so nothing stretches
  const bbox = [x - halfW, y - halfH, x + halfW, y + halfH].join(',');
  return `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${w},${h}&format=jpg&f=image`;
}
