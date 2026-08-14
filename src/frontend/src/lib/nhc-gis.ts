/**
 * NHC tropical GIS layers — official cone of uncertainty, forecast track,
 * coastal watches/warnings, and past track from the NOAA MapServer.
 * The service supports CORS and GeoJSON, so the browser fetches directly;
 * the on-chain summary remains the certified source for advisory data.
 */
import type { FeatureCollection } from "geojson";

const NHC_BASE =
  "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer";

const LAYER_FORECAST_TRACK = 6;
const LAYER_FORECAST_CONE = 7;
const LAYER_WATCH_WARNING = 8;
const LAYER_PAST_TRACK = 11;

export type NhcGisLayers = {
  forecastTrack: FeatureCollection | null;
  cone: FeatureCollection | null;
  watchWarning: FeatureCollection | null;
  pastTrack: FeatureCollection | null;
};

/** TCWW codes on the Watch-Warning layer → display style. */
export const TCWW_STYLES: Record<string, { color: string; label: string }> = {
  HWR: { color: "#ef4444", label: "Hurricane Warning" },
  HWA: { color: "#f472b6", label: "Hurricane Watch" },
  TWR: { color: "#3b82f6", label: "Trop. Storm Warning" },
  TWA: { color: "#eab308", label: "Trop. Storm Watch" },
};

function layerQueryUrl(layerId: number, outFields: string): string {
  return (
    `${NHC_BASE}/${layerId}/query?where=1%3D1` +
    `&outFields=${encodeURIComponent(outFields)}` +
    `&returnGeometry=true&geometryPrecision=3&f=geojson`
  );
}

async function fetchLayer(
  layerId: number,
  outFields: string,
): Promise<FeatureCollection | null> {
  try {
    const res = await fetch(layerQueryUrl(layerId, outFields), {
      mode: "cors",
      credentials: "omit",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as FeatureCollection & {
      error?: unknown;
    };
    if (json.error || json.type !== "FeatureCollection") return null;
    return json;
  } catch {
    return null;
  }
}

/** Fetch all four layers concurrently; individual failures return null. */
export async function fetchNhcGisLayers(): Promise<NhcGisLayers> {
  const [forecastTrack, cone, watchWarning, pastTrack] = await Promise.all([
    fetchLayer(LAYER_FORECAST_TRACK, "stormname,basin"),
    fetchLayer(LAYER_FORECAST_CONE, "stormname,basin,fcstprd"),
    fetchLayer(LAYER_WATCH_WARNING, "stormname,basin,tcww"),
    fetchLayer(LAYER_PAST_TRACK, "stormname,basin"),
  ]);
  return { forecastTrack, cone, watchWarning, pastTrack };
}

export function hasAnyGisData(layers: NhcGisLayers): boolean {
  return [
    layers.forecastTrack,
    layers.cone,
    layers.watchWarning,
    layers.pastTrack,
  ].some((fc) => (fc?.features?.length ?? 0) > 0);
}
