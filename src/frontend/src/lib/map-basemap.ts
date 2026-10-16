/**
 * Dark basemap for weather / radar Leaflet maps.
 *
 * CARTO raster tiles now watermark "API KEY REQUIRED" without `?key=`.
 * Prefer a free key via VITE_CARTO_API_KEY when available; otherwise fall
 * back to Esri World Dark Gray Canvas (no key, fair-use).
 */
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

export function cartoApiKey(): string {
  return String(import.meta.env.VITE_CARTO_API_KEY ?? "").trim();
}

/** Add a dark basemap layer to an existing Leaflet map. */
export function addDarkBasemap(map: LeafletMap): L.TileLayer {
  const key = cartoApiKey();
  if (key) {
    return L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
      {
        maxZoom: 19,
        subdomains: "abcd",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    ).addTo(map);
  }

  return L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 16,
      attribution: "&copy; Esri",
    },
  ).addTo(map);
}
