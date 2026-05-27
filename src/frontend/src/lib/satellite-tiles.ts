const TILE_SIZE = 256;

export type TileCoord = { x: number; y: number; z: number };

export type SatelliteSource = "esri" | "google";

export function latLngToTile(lat: number, lng: number, zoom: number): TileCoord {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y, z: zoom };
}

export function tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n = 2 ** zoom;
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { lat: (latRad * 180) / Math.PI, lng };
}

export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

export function chooseZoom(lat: number, widthMeters: number, depthMeters: number): number {
  const maxDim = Math.max(widthMeters, depthMeters);
  for (let z = 20; z >= 15; z -= 1) {
    const mpp = metersPerPixel(lat, z);
    const px = maxDim / mpp;
    if (px <= TILE_SIZE * 2.5) return z;
  }
  return 18;
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

export function tilesForPlot(
  lat: number,
  lng: number,
  widthMeters: number,
  depthMeters: number,
  zoom?: number,
): { tiles: TileCoord[]; zoom: number; centerTile: TileCoord } {
  const z = zoom ?? chooseZoom(lat, widthMeters, depthMeters);
  const center = latLngToTile(lat, lng, z);
  const mpp = metersPerPixel(lat, z);
  const wPx = widthMeters / mpp;
  const hPx = depthMeters / mpp;
  const tilesX = Math.max(1, Math.ceil(wPx / TILE_SIZE));
  const tilesY = Math.max(1, Math.ceil(hPx / TILE_SIZE));
  const halfX = Math.floor(tilesX / 2);
  const halfY = Math.floor(tilesY / 2);

  const tiles: TileCoord[] = [];
  for (let dy = -halfY; dy <= halfY; dy += 1) {
    for (let dx = -halfX; dx <= halfX; dx += 1) {
      tiles.push({ x: center.x + dx, y: center.y + dy, z });
    }
  }
  return { tiles, zoom: z, centerTile: center };
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

export async function stitchSatelliteTexture(
  lat: number,
  lng: number,
  widthMeters: number,
  depthMeters: number,
  source: SatelliteSource = "esri",
): Promise<{ url: string; revoke: () => void } | null> {
  try {
    const { tiles, zoom, centerTile } = tilesForPlot(lat, lng, widthMeters, depthMeters);
    const cols = Math.ceil(Math.sqrt(tiles.length));
    const rows = Math.ceil(tiles.length / cols);
    const canvas = document.createElement("canvas");
    canvas.width = cols * TILE_SIZE;
    canvas.height = rows * TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await Promise.all(
      tiles.map(async (t, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const img = await loadImage(tileUrl(t.x, t.y, t.z, source));
        ctx.drawImage(img, col * TILE_SIZE, row * TILE_SIZE);
      }),
    );

    const mpp = metersPerPixel(lat, zoom);
    const centerPx = tileToPixelInTile(lat, lng, centerTile);
    const cropW = Math.min(canvas.width, Math.max(TILE_SIZE, widthMeters / mpp));
    const cropH = Math.min(canvas.height, Math.max(TILE_SIZE, depthMeters / mpp));
    const cropX = Math.max(
      0,
      Math.min(
        canvas.width - cropW,
        centerPx.x + (cols > 1 ? TILE_SIZE * Math.floor(cols / 2) : 0) - cropW / 2,
      ),
    );
    const cropY = Math.max(
      0,
      Math.min(
        canvas.height - cropH,
        centerPx.y + (rows > 1 ? TILE_SIZE * Math.floor(rows / 2) : 0) - cropH / 2,
      ),
    );

    const cropped = document.createElement("canvas");
    cropped.width = cropW;
    cropped.height = cropH;
    const cctx = cropped.getContext("2d");
    if (!cctx) return null;
    cctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const blob = await new Promise<Blob | null>((res) => cropped.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  } catch {
    return null;
  }
}

function tileToPixelInTile(
  lat: number,
  lng: number,
  tile: TileCoord,
): { x: number; y: number } {
  const n = 2 ** tile.z;
  const latRad = (lat * Math.PI) / 180;
  const worldX = ((lng + 180) / 360) * n;
  const worldY =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return {
    x: (worldX - tile.x) * TILE_SIZE,
    y: (worldY - tile.y) * TILE_SIZE,
  };
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
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

export function singleTileUrl(lat: number, lng: number, zoom = 20): string {
  const t = latLngToTile(lat, lng, zoom);
  return tileUrl(t.x, t.y, t.z, "esri");
}
