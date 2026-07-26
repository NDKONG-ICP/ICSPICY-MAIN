import L from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

import {
  buildRainViewerTileTemplate,
  fetchRainViewerRadarData,
  type RainViewerFrame,
  RAINVIEWER_TILE_SIZE,
} from "@/lib/rainviewer-radar";

const MAX_NATIVE_ZOOM = 7;
const RADAR_OPACITY = 0.65;
const HIDDEN_OPACITY = 0.001;
const FRAME_MS = 700;
const REFRESH_MS = 5 * 60_000;
const MAP_INIT_RETRY_MS = 150;
const MAP_INIT_MAX_ATTEMPTS = 24;

function showRadarFrame(layers: L.TileLayer[], index: number) {
  for (let i = 0; i < layers.length; i++) {
    layers[i]?.setOpacity(i === index ? RADAR_OPACITY : HIDDEN_OPACITY);
  }
}

type RadarStatus = "loading" | "ready" | "unavailable";

export function WeatherRadarMap({
  lat,
  lng,
  locationLabel,
}: {
  lat: number;
  lng: number;
  locationLabel?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const radarLayersRef = useRef<L.TileLayer[]>([]);
  const [host, setHost] = useState("");
  const [frames, setFrames] = useState<RainViewerFrame[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [status, setStatus] = useState<RadarStatus>("loading");
  const [mapReady, setMapReady] = useState(false);

  const loadRadarFrames = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await fetchRainViewerRadarData();
      if (!data) {
        setStatus("unavailable");
        setFrames([]);
        return;
      }

      setHost(data.host);
      setFrames(data.frames);
      setCurrentFrame(data.liveFrameIndex);
      setStatus("ready");
    } catch {
      setStatus("unavailable");
      setFrames([]);
    }
  }, []);

  useEffect(() => {
    void loadRadarFrames();
    const refresh = window.setInterval(() => {
      void loadRadarFrames();
    }, REFRESH_MS);
    return () => window.clearInterval(refresh);
  }, [loadRadarFrames]);

  useEffect(() => {
    const el = mapRef.current;
    if (!el || mapInstanceRef.current) return;

    let attempts = 0;
    let retryTimer: number | undefined;

    const initMap = () => {
      if (mapInstanceRef.current) return true;
      if (el.clientWidth < 16 || el.clientHeight < 16) return false;

      const map = L.map(el, {
        center: [lat, lng],
        zoom: 7,
        maxZoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd",
        },
      ).addTo(map);

      markerRef.current = L.circleMarker([lat, lng], {
        radius: 8,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.85,
        weight: 2,
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);

      requestAnimationFrame(() => {
        map.invalidateSize();
        window.setTimeout(() => map.invalidateSize(), 400);
      });
      return true;
    };

    if (!initMap()) {
      retryTimer = window.setInterval(() => {
        attempts += 1;
        if (initMap() || attempts >= MAP_INIT_MAX_ATTEMPTS) {
          if (retryTimer) window.clearInterval(retryTimer);
        }
      }, MAP_INIT_RETRY_MS);
    }

    const ro = new ResizeObserver(() => {
      const map = mapInstanceRef.current;
      if (map) {
        map.invalidateSize();
      } else {
        initMap();
      }
    });
    ro.observe(el);

    return () => {
      if (retryTimer) window.clearInterval(retryTimer);
      ro.disconnect();
      for (const layer of radarLayersRef.current) {
        layer.remove();
      }
      radarLayersRef.current = [];
      markerRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapReady(false);
    };
  }, [lat, lng]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    map.setView([lat, lng], map.getZoom(), { animate: false });
    markerRef.current?.setLatLng([lat, lng]);
  }, [lat, lng, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || frames.length === 0 || !host) return;

    for (const layer of radarLayersRef.current) {
      map.removeLayer(layer);
    }

    radarLayersRef.current = frames.map((frame) =>
      L.tileLayer(buildRainViewerTileTemplate(host, frame.path), {
        tileSize: RAINVIEWER_TILE_SIZE,
        opacity: HIDDEN_OPACITY,
        maxNativeZoom: MAX_NATIVE_ZOOM,
        maxZoom: 12,
        updateWhenIdle: false,
        updateWhenZooming: false,
      }).addTo(map),
    );

    return () => {
      for (const layer of radarLayersRef.current) {
        map.removeLayer(layer);
      }
      radarLayersRef.current = [];
    };
  }, [frames, host, mapReady]);

  useEffect(() => {
    if (radarLayersRef.current.length === 0) return;
    showRadarFrame(radarLayersRef.current, currentFrame);
  }, [currentFrame, frames.length, mapReady]);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1 || status !== "ready") return;
    const timer = window.setInterval(() => {
      setCurrentFrame((c) => (c + 1) % frames.length);
    }, FRAME_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, frames.length, status]);

  const frameTime = frames[currentFrame]?.time;
  const timeLabel = frameTime
    ? new Date(frameTime * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const showOverlay = status === "loading" || status === "unavailable";
  const overlayMessage =
    status === "unavailable"
      ? "Radar unavailable — live tiles could not be loaded."
      : "Loading radar…";

  return (
    <div
      data-ocid="nims-weather-radar"
      className="relative min-h-64 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
    >
      <div
        ref={mapRef}
        className="h-64 w-full min-h-64 sm:h-80 [&_.leaflet-container]:!h-full [&_.leaflet-container]:!w-full [&_.leaflet-container]:min-h-64"
        aria-hidden={showOverlay}
      />
      {locationLabel && !showOverlay && (
        <div className="pointer-events-none absolute left-2 top-2 z-[500] rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          📍 {locationLabel}
        </div>
      )}
      {showOverlay && (
        <div
          className="absolute inset-0 z-[600] flex min-h-64 flex-col items-center justify-center gap-2 bg-zinc-950 px-4 text-center text-sm text-zinc-400"
          role="status"
        >
          <span>{overlayMessage}</span>
          {status === "unavailable" && (
            <button
              type="button"
              className="rounded-md bg-white/10 px-3 py-1 text-xs text-zinc-200 hover:bg-white/20"
              onClick={() => void loadRadarFrames()}
            >
              Retry
            </button>
          )}
        </div>
      )}
      {status === "ready" && frames.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-[500] bg-gradient-to-t from-black/85 to-transparent p-3">
          <div className="flex items-center justify-between text-sm text-white">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="rounded bg-white/20 px-2 py-1 text-xs hover:bg-white/30"
              aria-label={isPlaying ? "Pause radar" : "Play radar"}
            >
              {isPlaying ? "⏸" : "▶️"}
            </button>
            <div className="mx-3 flex-1">
              <input
                type="range"
                min={0}
                max={Math.max(frames.length - 1, 0)}
                value={currentFrame}
                onChange={(e) => {
                  setCurrentFrame(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full accent-red-500"
                aria-label="Radar timeline scrubber"
              />
            </div>
            <span className="text-xs text-zinc-300 tabular-nums">{timeLabel}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              🟢 Light → 🟡 Moderate → 🔴 Heavy Rain
            </span>
            <a
              href="https://www.rainviewer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Rain Viewer
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
