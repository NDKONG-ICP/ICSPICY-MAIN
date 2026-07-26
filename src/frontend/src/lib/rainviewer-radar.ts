/**
 * RainViewer Weather Maps API v2
 * @see https://www.rainviewer.com/api/weather-maps-api.html
 *
 * Deprecated (do not use): https://api.rainviewer.com/public/maps.json
 */
import { WEATHER_FETCH_INIT } from "./weather-service";

export const RAINVIEWER_WEATHER_MAPS_URL =
  "https://api.rainviewer.com/public/weather-maps.json";

/** Tile size in pixels — RainViewer supports 256 or 512. */
export const RAINVIEWER_TILE_SIZE = 256;

/** Color scheme 2 = universal blue→green→yellow→red. Options 1_1 = smoothed + snow colors. */
export const RAINVIEWER_TILE_COLOR = 2;
export const RAINVIEWER_TILE_OPTIONS = "1_1";

export const RAINVIEWER_DEFAULT_HOST = "https://tilecache.rainviewer.com";

export type RainViewerFrame = {
  time: number;
  path: string;
};

export type RainViewerRadarData = {
  host: string;
  past: RainViewerFrame[];
  nowcast: RainViewerFrame[];
  /** past followed by nowcast — used for animation scrubber. */
  frames: RainViewerFrame[];
  /** Index of the latest past frame (live-ish frame). */
  liveFrameIndex: number;
};

type RainViewerApiResponse = {
  version?: string;
  host?: string;
  radar?: {
    past?: RainViewerFrame[];
    nowcast?: RainViewerFrame[];
  };
};

function normalizeHost(host: string | undefined): string {
  const h = (host ?? RAINVIEWER_DEFAULT_HOST).replace(/\/$/, "");
  return h.startsWith("http") ? h : `https://${h}`;
}

function isValidFrame(raw: unknown): raw is RainViewerFrame {
  if (typeof raw !== "object" || raw == null) return false;
  const f = raw as Record<string, unknown>;
  return typeof f.time === "number" && typeof f.path === "string" && f.path.length > 0;
}

/** Parse and validate the v2 weather-maps.json payload. */
export function parseRainViewerResponse(data: unknown): RainViewerRadarData | null {
  if (typeof data !== "object" || data == null) return null;
  const body = data as RainViewerApiResponse;
  const past = (body.radar?.past ?? []).filter(isValidFrame);
  const nowcast = (body.radar?.nowcast ?? []).filter(isValidFrame);
  const frames = [...past, ...nowcast];
  if (frames.length === 0) return null;
  return {
    host: normalizeHost(body.host),
    past,
    nowcast,
    frames,
    liveFrameIndex: Math.max(0, past.length - 1),
  };
}

/**
 * Standard slippy-map tile URL per RainViewer docs:
 * {host}{path}/{size}/{z}/{x}/{y}/{color}/{smooth}_{snow}.png
 */
export function buildRainViewerTileTemplate(
  host: string,
  framePath: string,
): string {
  const base = `${normalizeHost(host)}${framePath}/${RAINVIEWER_TILE_SIZE}/{z}/{x}/{y}/${RAINVIEWER_TILE_COLOR}/${RAINVIEWER_TILE_OPTIONS}.png`;
  return base;
}

export async function fetchRainViewerRadarData(): Promise<RainViewerRadarData | null> {
  const res = await fetch(RAINVIEWER_WEATHER_MAPS_URL, WEATHER_FETCH_INIT);
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return parseRainViewerResponse(json);
}
