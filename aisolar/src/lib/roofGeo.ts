/**
 * roofGeo — the ONE Web-Mercator projection the roof surfaces share.
 *
 * The Design Studio places arrays by real lat/lng on a Static Maps image; the
 * customer proposal re-renders that EXACT view + arrays as the design snapshot.
 * One module so the studio and the proposal can never disagree about where a
 * panel sits on the roof.
 */
export type MapView = { lat: number; lng: number; zoom: number };

export const EARTH_R = 6378137;
/** Logical pixel size the studio requests its map image at (scale=2 retina). */
export const IMG_LOGICAL_W = 640;
export const IMG_LOGICAL_H = 360;
/** Row/column gap between panels on the roof, metres. */
export const PANEL_GAP_M = 0.02;

/** Web-Mercator metres per logical map pixel at a latitude + zoom. */
export const mppAt = (lat: number, zoom: number) =>
  (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);

/** Where a geo point lands on the canvas (in %) for a view. */
export function geoToPct(view: MapView, lat: number, lng: number): { x: number; y: number } {
  const mpp = mppAt(view.lat, view.zoom);
  const dxM = ((lng - view.lng) * Math.PI / 180) * EARTH_R * Math.cos((view.lat * Math.PI) / 180);
  const dyM = ((view.lat - lat) * Math.PI / 180) * EARTH_R;
  return { x: 50 + (dxM / (mpp * IMG_LOGICAL_W)) * 100, y: 50 + (dyM / (mpp * IMG_LOGICAL_H)) * 100 };
}

/** The geo point under a canvas position (in %) for a view. */
export function pctToGeo(view: MapView, xPct: number, yPct: number): { lat: number; lng: number } {
  const mpp = mppAt(view.lat, view.zoom);
  const dxM = ((xPct - 50) / 100) * mpp * IMG_LOGICAL_W;
  const dyM = ((yPct - 50) / 100) * mpp * IMG_LOGICAL_H;
  return {
    lng: view.lng + (dxM / (EARTH_R * Math.cos((view.lat * Math.PI) / 180))) * 180 / Math.PI,
    lat: view.lat - (dyM / EARTH_R) * 180 / Math.PI,
  };
}

/** One placed string of panels — the design snapshot's unit. */
export interface PlacedArray {
  id: string;
  name: string;
  panelCount: number;
  cols: number;
  rot: number;
  xPct: number;
  yPct: number;
  lat: number | null;
  lng: number | null;
}

/** Everything the proposal needs to redraw the studio's design, exactly. */
export interface DesignSnapshot {
  view: MapView;
  arrays: PlacedArray[];
  panelWm: number;
  panelHm: number;
}
