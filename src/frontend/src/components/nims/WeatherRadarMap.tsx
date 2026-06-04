import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface RadarFrame {
  time: number;
  path: string;
}

type RainViewerResponse = {
  host?: string;
  radar?: {
    past?: RadarFrame[];
    nowcast?: RadarFrame[];
  };
};

const DEFAULT_HOST = "https://tilecache.rainviewer.com";
const TILE_SIZE = 256;
const MAX_NATIVE_ZOOM = 7;
const RADAR_OPACITY = 0.65;
const HIDDEN_OPACITY = 0.001;
const FRAME_MS = 700;

function showRadarFrame(layers: L.TileLayer[], index: number) {
  for (let i = 0; i < layers.length; i++) {
    layers[i]?.setOpacity(i === index ? RADAR_OPACITY : HIDDEN_OPACITY);
  }
}

export function WeatherRadarMap({
  lat,
  lng,
  locationLabel,
  active = true,
}: {
  lat: number;
  lng: number;
  locationLabel?: string;
  active?: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const radarLayersRef = useRef<L.TileLayer[]>([]);
  const [host, setHost] = useState(DEFAULT_HOST);
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => {
        if (!r.ok) throw new Error(`RainViewer API ${r.status}`);
        return r.json();
      })
      .then((data: RainViewerResponse) => {
        if (cancelled) return;
        const past = data.radar?.past ?? [];
        const nowcast = data.radar?.nowcast ?? [];
        const all = [...past, ...nowcast];
        if (data.host) setHost(data.host.replace(/\/$/, ""));
        setFrames(all);
        setCurrentFrame(Math.max(0, past.length - 1));
        setLoadError(all.length === 0);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const el = mapRef.current;
    if (!el || mapInstanceRef.current) return;

    const initMap = () => {
      if (mapInstanceRef.current) return;
      if (el.clientWidth < 16 || el.clientHeight < 16) return;

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
    };

    initMap();

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
  }, [active]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    map.setView([lat, lng], map.getZoom(), { animate: false });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || frames.length === 0) return;

    for (const layer of radarLayersRef.current) {
      map.removeLayer(layer);
    }
    radarLayersRef.current = frames.map((frame) =>
      L.tileLayer(`${host}${frame.path}/${TILE_SIZE}/{z}/{x}/{y}/2/1_1.png`, {
        tileSize: TILE_SIZE,
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
    if (!isPlaying || frames.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentFrame((c) => (c + 1) % frames.length);
    }, FRAME_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, frames.length]);

  const frameTime = frames[currentFrame]?.time;
  const timeLabel = frameTime
    ? new Date(frameTime * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      data-ocid="nims-weather-radar"
      className="relative overflow-hidden rounded-2xl border border-white/10"
    >
      <div
        ref={mapRef}
        className="h-64 w-full sm:h-80 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full"
      />
      {locationLabel && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          📍 {locationLabel}
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-sm text-zinc-400">
          Radar tiles unavailable — try again shortly.
        </div>
      )}
      {!loadError && frames.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-sm text-zinc-400">
          Loading radar…
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-3">
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
              disabled={frames.length === 0}
              aria-label="Radar timeline scrubber"
            />
          </div>
          <span className="text-xs text-zinc-300 tabular-nums">
            {timeLabel}
          </span>
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
    </div>
  );
}
