import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RadarFrame {
  time: number;
  path: string;
}

type RainViewerResponse = {
  radar?: {
    past?: RadarFrame[];
    nowcast?: RadarFrame[];
  };
};

export function WeatherRadarMap({ lat, lng }: { lat: number; lng: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((data: RainViewerResponse) => {
        if (cancelled) return;
        const past = data.radar?.past ?? [];
        const nowcast = data.radar?.nowcast ?? [];
        const all = [...past, ...nowcast];
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
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 8,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.circleMarker([lat, lng], {
      radius: 8,
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.85,
      weight: 2,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      radarLayerRef.current = null;
    };
  }, [lat, lng]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || frames.length === 0) return;

    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }

    const frame = frames[currentFrame];
    if (frame) {
      radarLayerRef.current = L.tileLayer(
        `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
        { opacity: 0.62, zIndex: 10 },
      ).addTo(map);
    }
  }, [currentFrame, frames]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    const timer = setInterval(() => {
      setCurrentFrame((c) => (c + 1) % frames.length);
    }, 500);
    return () => clearInterval(timer);
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
      <div ref={mapRef} className="h-64 w-full sm:h-80" />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-sm text-zinc-400">
          Radar tiles unavailable — try again shortly.
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
          <span className="text-xs text-zinc-300">{timeLabel}</span>
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
