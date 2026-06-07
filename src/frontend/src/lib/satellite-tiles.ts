const TILE_SIZE = 256;
export const DEFAULT_SATELLITE_ZOOM = 17;
export const SATELLITE_ZOOM = DEFAULT_SATELLITE_ZOOM;
export const MIN_SATELLITE_ZOOM = 15;
export const MAX_SATELLITE_ZOOM = 21;
export const MAX_TILE_TEXTURE_PX = 512;

export type TileCoord = { x: number; y: number; z: number };
export type SatelliteSource = "esri" | "google";

export function clampSatelliteZoom(zoom: number): number {
  return Math.max(
    MIN_SATELLITE_ZOOM,
    Math.min(MAX_SATELLITE_ZOOM, Math.round(zoom)),
  );
}

export function latLngToTile(
  lat: number,
  lng: number,
  zoom: number,
): TileCoord {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y, z: zoom };
}

export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

export function metersToLatLngDelta(
  lat: number,
  widthMeters: number,
  depthMeters: number,
): { latDelta: number; lngDelta: number } {
  const latDelta = depthMeters / 2 / 111_320;
  const lngDelta =
    widthMeters / 2 / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { latDelta, lngDelta };
}

export function boundsFromCenter(
  lat: number,
  lng: number,
  widthMeters: number,
  depthMeters: number,
): { south: number; west: number; north: number; east: number } {
  const { latDelta, lngDelta } = metersToLatLngDelta(
    lat,
    widthMeters,
    depthMeters,
  );
  return {
    south: lat - latDelta,
    north: lat + latDelta,
    west: lng - lngDelta,
    east: lng + lngDelta,
  };
}

export function tileUrl(
  x: number,
  y: number,
  z: number,
  source: SatelliteSource = "esri",
): string {
  if (source === "google") {
    return `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}`;
  }
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
}

export function singleTileUrl(
  lat: number,
  lng: number,
  zoom = DEFAULT_SATELLITE_ZOOM,
): string {
  const t = latLngToTile(lat, lng, clampSatelliteZoom(zoom));
  return tileUrl(t.x, t.y, t.z, "esri");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load tile: ${url}`));
    img.src = url;
  });
}

/** Single ESRI tile scaled to max 512×512 — safe for all GPUs. */
export async function loadSatelliteTileTexture(
  lat: number,
  lng: number,
  zoom: number,
): Promise<{ url: string; revoke: () => void } | null> {
  try {
    const z = clampSatelliteZoom(zoom);
    const url = singleTileUrl(lat, lng, z);
    const img = await loadImage(url);
    const size = Math.min(MAX_TILE_TEXTURE_PX, TILE_SIZE);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          resolve({ url: blobUrl, revoke: () => URL.revokeObjectURL(blobUrl) });
        },
        "image/jpeg",
        0.9,
      );
    });
  } catch {
    return null;
  }
}

/** @deprecated use loadSatelliteTileTexture */
export async function stitchSatelliteTexture(
  lat: number,
  lng: number,
  _widthMeters: number,
  _depthMeters: number,
  _source: SatelliteSource = "esri",
  zoomOverride?: number,
): Promise<{ url: string; revoke: () => void } | null> {
  return loadSatelliteTileTexture(
    lat,
    lng,
    zoomOverride ?? DEFAULT_SATELLITE_ZOOM,
  );
}

export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const q = encodeURIComponent(address.trim());
  if (!q) return null;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

export const ESRI_SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/**
 * Google Maps satellite — typically fresher/sharper imagery than ESRI in
 * residential areas. Uses the mt{s} subdomain template for load-balancing; the
 * Leaflet layer that consumes this MUST pass `subdomains: ["0","1","2","3"]`.
 */
export const GOOGLE_SATELLITE_URL =
  "https://mt{s}.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}";

/** Higher-resolution Google satellite variant (scale hint). */
export const GOOGLE_SATELLITE_HQ_URL =
  "https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}&s=Ga";

/**
 * Mapbox satellite — often sharper residential imagery. Uses the public sample
 * token (basic access, no project key required); the @2x/512 tiles need
 * `tileSize: 512` + `zoomOffset: -1` on the Leaflet layer.
 */
export const MAPBOX_SATELLITE_URL =
  "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcWJ3MmgifQ.gMGilFAVwcRywvV80L8YmA";
