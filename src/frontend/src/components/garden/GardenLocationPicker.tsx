import L from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_SATELLITE_ZOOM,
  ESRI_SATELLITE_URL,
  MAX_SATELLITE_ZOOM,
  MIN_SATELLITE_ZOOM,
  boundsFromCenter,
  clampSatelliteZoom,
  geocodeAddress,
  metersToLatLngDelta,
} from "@/lib/satellite-tiles";
import { MapPin, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export type PickedGardenLocation = {
  lat: number;
  lng: number;
  label: string;
  satelliteZoom: number;
};

type Props = {
  open: boolean;
  initialLat: number;
  initialLng: number;
  widthMeters: number;
  depthMeters: number;
  onConfirm: (loc: PickedGardenLocation) => void;
  onSkip: () => void;
};

function boundsToLeaflet(
  b: ReturnType<typeof boundsFromCenter>,
): L.LatLngBoundsExpression {
  return [
    [b.south, b.west],
    [b.north, b.east],
  ];
}

export function GardenLocationPicker({
  open,
  initialLat,
  initialLng,
  widthMeters,
  depthMeters,
  onConfirm,
  onSkip,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [center, setCenter] = useState({ lat: initialLat, lng: initialLng });
  const [mapZoom, setMapZoom] = useState(DEFAULT_SATELLITE_ZOOM);
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const dragRectRef = useRef(false);

  const updateOverlay = useCallback(
    (map: L.Map, lat: number, lng: number) => {
      const bounds = boundsFromCenter(lat, lng, widthMeters, depthMeters);
      const llBounds = boundsToLeaflet(bounds);

      if (rectRef.current) {
        rectRef.current.setBounds(llBounds);
      } else {
        rectRef.current = L.rectangle(llBounds, {
          color: "#ef4444",
          weight: 2,
          fillColor: "#ef4444",
          fillOpacity: 0.12,
          interactive: true,
        }).addTo(map);

        rectRef.current.on("mousedown", () => {
          dragRectRef.current = true;
          map.dragging.disable();
        });
        map.on("mousemove", (e) => {
          if (!dragRectRef.current) return;
          setCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
        map.on("mouseup", () => {
          dragRectRef.current = false;
          map.dragging.enable();
        });
        map.on("zoomend", () => {
          setMapZoom(clampSatelliteZoom(map.getZoom()));
        });
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], {
          draggable: true,
          autoPan: true,
        }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) setCenter({ lat: pos.lat, lng: pos.lng });
        });
      }
    },
    [depthMeters, widthMeters],
  );

  useEffect(() => {
    if (!open) return;
    setCenter({ lat: initialLat, lng: initialLng });
  }, [open, initialLat, initialLng]);

  useEffect(() => {
    if (!open) return;
    const el = mapRef.current;
    if (!el) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
      rectRef.current = null;
      markerRef.current = null;
    }

    const map = L.map(el, {
      center: [initialLat, initialLng],
      zoom: DEFAULT_SATELLITE_ZOOM,
      maxZoom: MAX_SATELLITE_ZOOM + 1,
      minZoom: MIN_SATELLITE_ZOOM,
      zoomControl: false,
    });

    L.tileLayer(ESRI_SATELLITE_URL, {
      maxZoom: 20,
      attribution: "Esri World Imagery",
    }).addTo(map);

    updateOverlay(map, initialLat, initialLng);
    mapInstance.current = map;

    requestAnimationFrame(() => {
      map.invalidateSize();
      window.setTimeout(() => map.invalidateSize(), 300);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
      rectRef.current = null;
      markerRef.current = null;
    };
  }, [open, initialLat, initialLng, updateOverlay]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !open) return;
    updateOverlay(map, center.lat, center.lng);
  }, [center, open, updateOverlay]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      e.preventDefault();
      const step = e.shiftKey ? 0.000004 : 0.000015;
      setCenter((c) => {
        let { lat, lng } = c;
        if (e.key === "ArrowUp") lat += step;
        if (e.key === "ArrowDown") lat -= step;
        if (e.key === "ArrowRight") lng += step;
        if (e.key === "ArrowLeft") lng -= step;
        return { lat, lng };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleConfirm = () => {
    const z = mapInstance.current
      ? clampSatelliteZoom(mapInstance.current.getZoom())
      : mapZoom;
    onConfirm({
      lat: center.lat,
      lng: center.lng,
      label: `Garden plot (${center.lat.toFixed(5)}, ${center.lng.toFixed(5)})`,
      satelliteZoom: z,
    });
  };

  const handleGps = () => {
    if (!navigator.geolocation) {
      toast.error("GPS not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenter({ lat, lng });
        mapInstance.current?.setView([lat, lng], DEFAULT_SATELLITE_ZOOM);
        setMapZoom(DEFAULT_SATELLITE_ZOOM);
        toast.success("Centered on your GPS location.");
      },
      () => toast.error("Could not get GPS location."),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  const handleSearch = async () => {
    if (!address.trim()) return;
    setSearching(true);
    try {
      const coords = await geocodeAddress(address);
      if (!coords) {
        toast.error("Address not found.");
        return;
      }
      setCenter(coords);
      mapInstance.current?.setView(
        [coords.lat, coords.lng],
        DEFAULT_SATELLITE_ZOOM,
      );
      setMapZoom(DEFAULT_SATELLITE_ZOOM);
      toast.success("Address found — drag the pin to fine-tune.");
    } finally {
      setSearching(false);
    }
  };

  const nudgeZoom = (delta: number) => {
    const map = mapInstance.current;
    if (!map) return;
    const next = clampSatelliteZoom(map.getZoom() + delta);
    map.setZoom(next);
    setMapZoom(next);
  };

  if (!open) return null;

  const { latDelta, lngDelta } = metersToLatLngDelta(
    center.lat,
    widthMeters,
    depthMeters,
  );
  const plotAreaLabel = `${widthMeters}×${depthMeters}m`;

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <div className="absolute top-4 left-4 z-[1000] max-w-sm rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-4 text-white shadow-2xl">
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-red-500" />
          Position Your Garden
        </h3>
        <p className="text-sm text-zinc-400 mb-3">
          Pan and zoom to your property. Drag the red pin or use arrow keys
          (Shift = fine). Red box = your {plotAreaLabel} plot.
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Search address…"
            className="bg-zinc-800 border-zinc-700 text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSearch();
            }}
          />
          <Button
            size="icon"
            variant="secondary"
            disabled={searching}
            onClick={() => void handleSearch()}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <Button size="sm" variant="secondary" onClick={handleGps}>
            📍 My GPS
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-600"
            onClick={() => nudgeZoom(1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-600"
            onClick={() => nudgeZoom(-1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-zinc-500 mb-3 font-mono">
          {center.lat.toFixed(6)}, {center.lng.toFixed(6)} · zoom {mapZoom} · ±
          {(latDelta * 111320).toFixed(0)}m N/S
        </p>
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={handleConfirm}
          >
            ✓ Confirm Location
          </Button>
          <Button
            variant="secondary"
            className="bg-zinc-700 hover:bg-zinc-600"
            onClick={onSkip}
          >
            Skip
          </Button>
        </div>
      </div>
      <div
        ref={mapRef}
        className="h-full w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-zinc-900"
      />
    </div>
  );
}
