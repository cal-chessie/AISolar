/**
 * solar-roof — the "receptionist" for Level 2 roof auto-detect.
 *
 * The browser can't call Google's Geocoding/Solar REST APIs directly: those
 * APIs reject HTTP-referrer-restricted keys, and an unrestricted key must never
 * ship in the bundle. So this runs server-side: it takes an address/Eircode,
 * geocodes it, asks the Solar API for the roof, and returns just the numbers.
 *
 * The key lives ONLY here, as the GOOGLE_SOLAR_KEY secret (set it IP-restricted
 * to Supabase egress, or unrestricted — it never leaves the server). Deploy:
 *   supabase secrets set GOOGLE_SOLAR_KEY=...
 *   supabase functions deploy solar-roof --no-verify-jwt   (public calculator)
 *
 * Response: { covered: true, panels, kwp, sunshineHours } | { covered: false }.
 * Never leaks the key or Google's raw payload.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, log } from "../_shared/auth.ts";

const KEY = Deno.env.get("GOOGLE_SOLAR_KEY") ?? "";

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

  try {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    if (!KEY) return json({ error: "GOOGLE_SOLAR_KEY not configured" }, 500);

    const { address } = await req.json().catch(() => ({}));
    if (!address || typeof address !== "string") return json({ error: "address required" }, 400);

    // 1) address/Eircode → lat,lng
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=ie&key=${KEY}`,
    );
    const geo = await geoRes.json();
    if (geo.status !== "OK") {
      log("solar-roof geocode", { status: geo.status, msg: geo.error_message });
      return json({ covered: false, reason: "geocode_" + geo.status });
    }
    const loc = geo.results?.[0]?.geometry?.location;
    if (!loc) return json({ covered: false, reason: "no_location" });

    // 2) roof insights from the Solar API (LOW quality = widest coverage)
    const solRes = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${loc.lat}&location.longitude=${loc.lng}&requiredQuality=LOW&key=${KEY}`,
    );
    if (!solRes.ok) {
      log("solar-roof buildingInsights", { status: solRes.status });
      return json({ covered: false, reason: "solar_" + solRes.status }); // 404 = no coverage here
    }
    const d = await solRes.json();
    const sp = d.solarPotential;
    if (!sp?.maxArrayPanelsCount) return json({ covered: false, reason: "no_panels" });

    const panelWatts = sp.panelCapacityWatts || 400;
    return json({
      covered: true,
      panels: sp.maxArrayPanelsCount,
      kwp: Math.round((sp.maxArrayPanelsCount * panelWatts) / 100) / 10,
      sunshineHours: Math.round(sp.maxSunshineHoursPerYear || 0),
    });
  } catch (e) {
    log("solar-roof error", { error: String(e) });
    return json({ covered: false, reason: "server_error" }, 500);
  }
});
