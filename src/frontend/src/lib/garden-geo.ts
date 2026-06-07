/**
 * garden-geo — georeferencing helpers for the satellite canvas.
 *
 * Coordinate contract:
 *   - Plant/structure positions in a GardenDesign are stored as { x, y } in
 *     METERS relative to the garden's SOUTH-WEST corner, where:
 *       x = metres EAST of the SW corner
 *       y = metres NORTH of the SW corner
 *   - The Leaflet view works in lat/lng (WGS84). These helpers convert between
 *     the two using a local equirectangular approximation, which is accurate to
 *     well under a centimetre across a typical backyard (< 100 m).
 */

export type LatLng = { lat: number; lng: number };

/** Metres per degree of latitude (very nearly constant). */
const METERS_PER_DEG_LAT = 111_320;

/** Metres per degree of longitude at a given latitude. */
export function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/**
 * Convert an offset in metres (east/north) from a SW corner to a lat/lng point.
 */
export function metersToLatLng(
  swCorner: LatLng,
  metersEast: number,
  metersNorth: number,
): LatLng {
  const lat = swCorner.lat + metersNorth / METERS_PER_DEG_LAT;
  const lng = swCorner.lng + metersEast / metersPerDegLng(swCorner.lat);
  return { lat, lng };
}

/**
 * Convert a lat/lng point to metres east/north from a SW corner.
 */
export function latLngToMeters(
  swCorner: LatLng,
  point: LatLng,
): { east: number; north: number } {
  const north = (point.lat - swCorner.lat) * METERS_PER_DEG_LAT;
  const east = (point.lng - swCorner.lng) * metersPerDegLng(swCorner.lat);
  return { east, north };
}

/** Great-circle distance between two points in metres (Haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Polygon ring of lat/lng vertices → bounding box + dimensions in metres. */
export function polygonMetrics(vertices: LatLng[]): {
  sw: LatLng;
  ne: LatLng;
  center: LatLng;
  widthMeters: number;
  depthMeters: number;
} {
  const lats = vertices.map((v) => v.lat);
  const lngs = vertices.map((v) => v.lng);
  const sw: LatLng = { lat: Math.min(...lats), lng: Math.min(...lngs) };
  const ne: LatLng = { lat: Math.max(...lats), lng: Math.max(...lngs) };
  const center: LatLng = {
    lat: (sw.lat + ne.lat) / 2,
    lng: (sw.lng + ne.lng) / 2,
  };
  // Width = east/west span at center latitude; depth = north/south span.
  const widthMeters = haversineMeters(
    { lat: center.lat, lng: sw.lng },
    { lat: center.lat, lng: ne.lng },
  );
  const depthMeters = haversineMeters(
    { lat: sw.lat, lng: center.lng },
    { lat: ne.lat, lng: center.lng },
  );
  return {
    sw,
    ne,
    center,
    widthMeters: Math.round(widthMeters * 10) / 10,
    depthMeters: Math.round(depthMeters * 10) / 10,
  };
}

/**
 * Given a center lat/lng plus plot dimensions, return the SW corner.
 * Used when a design only stores a center point (no drawn polygon).
 */
export function swCornerFromCenter(
  center: LatLng,
  widthMeters: number,
  depthMeters: number,
): LatLng {
  return metersToLatLng(center, -widthMeters / 2, -depthMeters / 2);
}

/** Choose a satellite zoom that frames the plot nicely (ESRI maxes at 21). */
export function zoomForPlot(widthMeters: number, depthMeters: number): number {
  const span = Math.max(widthMeters, depthMeters);
  if (span <= 12) return 21;
  if (span <= 25) return 20;
  if (span <= 60) return 19;
  return 18;
}

const FEET_PER_METER = 3.280839895;

/** Format a metre value as feet + inches, e.g. 13'9". */
export function metersToFeetInches(m: number): string {
  const totalInches = Math.round(m * FEET_PER_METER * 12);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

/** Format a metre value as plain feet with one decimal, e.g. 13.8ft. */
export function metersToFeet(m: number): number {
  return m * FEET_PER_METER;
}

/** Format inches from metres (for plant spacing badges). */
export function metersToInches(m: number): number {
  return m * FEET_PER_METER * 12;
}

/** Latitude in DMS-ish readable form, e.g. 27.9506° N. */
export function formatLat(lat: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
}

export function formatLng(lng: number): string {
  return `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}
