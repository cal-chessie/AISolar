/**
 * SatTiles — satellite imagery for the roof surfaces WITHOUT Google Static Maps.
 *
 * Google's EEA change removed satellite/hybrid from the Static Maps API for
 * EEA-billed accounts (the API 403s: "satellite and hybrid map types are not
 * available for your account and region") — which blanked the Design Studio
 * and proposal roof views overnight (27 Jul). This renders the SAME logical
 * 640×360 Web-Mercator canvas (roofGeo) from Esri World Imagery XYZ tiles:
 * the projection is identical, so every PlacedArray overlay lands exactly
 * where the studio computed it. Tiles above z19 are overzoomed by scaling
 * (Esri coverage in Ireland is solid to 19, patchy above).
 *
 * Attribution bottom-right is required by Esri's terms.
 * LAUNCH NOTE (Sweep 8): move to a licensed ArcGIS API key, or Google Maps
 * JS API (interactive SKUs still serve satellite in the EEA).
 */
import { IMG_LOGICAL_W, IMG_LOGICAL_H, type MapView } from '@/lib/roofGeo';
import { cn } from '@/lib/utils';

const TILE = 256;
const MAX_TILE_Z = 19;

/** Global Web-Mercator pixel of a lat/lng at zoom z (256·2^z world). */
const worldPx = (lat: number, lng: number, z: number) => {
  const n = TILE * Math.pow(2, z);
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
};

export default function SatTiles({ view, className }: { view: MapView; className?: string }) {
  const tileZ = Math.min(Math.round(view.zoom), MAX_TILE_Z);
  const factor = Math.pow(2, view.zoom - tileZ); // ≥1 when overzoomed past Esri depth
  const c = worldPx(view.lat, view.lng, tileZ);
  // The logical canvas spans (W/factor × H/factor) world-px at tileZ.
  const ox = c.x - IMG_LOGICAL_W / 2 / factor;
  const oy = c.y - IMG_LOGICAL_H / 2 / factor;
  const n = Math.pow(2, tileZ);
  const txMin = Math.floor(ox / TILE), txMax = Math.floor((ox + IMG_LOGICAL_W / factor) / TILE);
  const tyMin = Math.floor(oy / TILE), tyMax = Math.floor((oy + IMG_LOGICAL_H / factor) / TILE);
  const tiles: { kx: number; ty: number; url: string }[] = [];
  for (let ty = Math.max(0, tyMin); ty <= Math.min(n - 1, tyMax); ty++) {
    for (let kx = txMin; kx <= txMax; kx++) {
      const tx = ((kx % n) + n) % n; // wrap x for the URL, keep kx for placement
      tiles.push({ kx, ty, url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tileZ}/${ty}/${tx}` });
    }
  }
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)} aria-hidden>
      {tiles.map(t => (
        <img
          key={`${tileZ}/${t.ty}/${t.kx}`} src={t.url} alt="" draggable={false}
          className="absolute select-none max-w-none [filter:saturate(1.08)_contrast(1.05)]"
          style={{
            left: `${(((t.kx * TILE - ox) * factor) / IMG_LOGICAL_W) * 100}%`,
            top: `${(((t.ty * TILE - oy) * factor) / IMG_LOGICAL_H) * 100}%`,
            width: `${((TILE * factor) / IMG_LOGICAL_W) * 100}%`,
            height: `${((TILE * factor) / IMG_LOGICAL_H) * 100}%`,
          }}
        />
      ))}
      <span className="absolute bottom-0.5 right-1 text-[9px] leading-none text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,.8)] pointer-events-none">
        Imagery © Esri · Maxar
      </span>
    </div>
  );
}

// ── RoofImagery — Google JS API satellite when available, Esri tiles if not ──
// The JS API map renders at exactly IMG_LOGICAL 640×360 CSS px and is scaled
// to fill the canvas, so its world-span matches roofGeo's projection and every
// placed array lands on the same pixels as the tile fallback. The map is inert
// (no gestures/UI) — the studio's own pan/zoom drives it via moveCamera.
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, gmapsAuthFailed } from '@/lib/googleSolar';

export function RoofImagery({ view, className }: { view: MapView; className?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [googleOk, setGoogleOk] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / IMG_LOGICAL_W));
    ro.observe(el);
    setScale(el.clientWidth / IMG_LOGICAL_W);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let live = true;
    const timeout = setTimeout(() => { if (live && !mapRef.current) setGoogleOk(false); }, 6000);
    loadGoogleMaps().then(g => {
      if (!live || !mapDiv.current || gmapsAuthFailed()) return;
      const m = new g.maps.Map(mapDiv.current, {
        center: { lat: view.lat, lng: view.lng }, zoom: view.zoom,
        mapTypeId: 'satellite', disableDefaultUI: true, gestureHandling: 'none',
        keyboardShortcuts: false, clickableIcons: false, tilt: 0,
      });
      m.addListener('tilesloaded', () => { if (live && !gmapsAuthFailed()) setGoogleOk(true); });
      mapRef.current = m;
    }).catch(() => { if (live) setGoogleOk(false); });
    return () => { live = false; clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    m.setCenter({ lat: view.lat, lng: view.lng });
    m.setZoom(view.zoom);
    m.setTilt(0);
  }, [view.lat, view.lng, view.zoom]);

  return (
    <div ref={holder} className={cn('absolute inset-0 overflow-hidden', className)} aria-hidden>
      {!googleOk && <SatTiles view={view} />}
      <div
        ref={mapDiv}
        className={cn('absolute top-0 left-0 origin-top-left', !googleOk && 'opacity-0 pointer-events-none')}
        style={{ width: IMG_LOGICAL_W, height: IMG_LOGICAL_H, transform: `scale(${scale})` }}
      />
    </div>
  );
}
