import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type LatLng,
  polygonMetrics,
  zoomForPlot,
} from "@/lib/garden-geo";
import {
  ESRI_SATELLITE_URL,
  GOOGLE_SATELLITE_URL,
  MAPBOX_SATELLITE_URL,
  geocodeAddress,
} from "@/lib/satellite-tiles";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Minus,
  PencilRuler,
  Plus,
  Search,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type PickedGardenLocation = {
  lat: number;
  lng: number;
  label: string;
  satelliteZoom: number;
  /** Present when the user drew a boundary. */
  widthMeters?: number;
  depthMeters?: number;
  boundary?: LatLng[];
  /** True SW corner of the boundary's bounding box (when a boundary was drawn). */
  swCorner?: LatLng;
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

export function GardenLocationPicker({
  open,
  initialLat,
  initialLng,
  widthMeters,
  depthMeters,
  onConfirm,
  onSkip,
}: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const verticesRef = useRef<L.LatLng[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const previewRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [vertexCount, setVertexCount] = useState(0);
  const [metrics, setMetrics] = useState<{
    w: number;
    d: number;
    center: LatLng;
  } | null>(null);

  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  // Mirror the boundary result synchronously so handleConfirm never reads stale
  // React state (the bug: `metrics` could still be null at confirm time).
  const metricsRef = useRef<{ w: number; d: number; center: LatLng } | null>(
    metrics,
  );
  metricsRef.current = metrics;
  const vertsBoundaryRef = useRef<L.LatLng[]>([]);

  const redrawInProgress = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts = verticesRef.current;
    polylineRef.current?.remove();
    markersRef.current?.clearLayers();
    if (pts.length > 0) {
      polylineRef.current = L.polyline(pts, {
        color: "#22c55e",
        weight: 2,
        dashArray: "4 4",
        interactive: false,
      }).addTo(map);
      for (const p of pts) {
        L.circleMarker(p, {
          radius: 4,
          color: "#22c55e",
          fillColor: "#0a0a0b",
          fillOpacity: 1,
          weight: 2,
          interactive: false,
        }).addTo(markersRef.current!);
      }
    }
    setVertexCount(pts.length);
  }, []);

  const finalizePolygon = useCallback(() => {
    const map = mapRef.current;
    const pts = verticesRef.current;
    if (!map || pts.length < 3) {
      toast.error("Place at least 3 points before closing the boundary.");
      return;
    }
    previewRef.current?.remove();
    previewRef.current = null;
    polylineRef.current?.remove();
    polylineRef.current = null;
    polygonRef.current?.remove();
    polygonRef.current = L.polygon(pts, {
      color: "#22c55e",
      weight: 2,
      fillColor: "#22c55e",
      fillOpacity: 0.2,
      // Non-interactive so the filled boundary never swallows map drag/pan
      // gestures once it's drawn.
      interactive: false,
    }).addTo(map);
    const verts: LatLng[] = pts.map((p) => ({ lat: p.lat, lng: p.lng }));
    const m = polygonMetrics(verts);
    const metricsValue = { w: m.widthMeters, d: m.depthMeters, center: m.center };
    setMetrics(metricsValue);
    metricsRef.current = metricsValue;
    vertsBoundaryRef.current = [...pts];
    setDrawMode(false);
    toast.success(
      `Boundary set: ${m.widthMeters.toFixed(1)}m × ${m.depthMeters.toFixed(1)}m`,
    );
  }, []);

  const resetDrawing = useCallback(() => {
    verticesRef.current = [];
    polylineRef.current?.remove();
    polylineRef.current = null;
    polygonRef.current?.remove();
    polygonRef.current = null;
    previewRef.current?.remove();
    previewRef.current = null;
    markersRef.current?.clearLayers();
    setMetrics(null);
    metricsRef.current = null;
    vertsBoundaryRef.current = [];
    setVertexCount(0);
  }, []);

  // Mount map when opened.
  useEffect(() => {
    if (!open) return;
    const el = mapEl.current;
    if (!el) return;

    const map = L.map(el, {
      center: [initialLat, initialLng],
      zoom: 20,
      minZoom: 4,
      maxZoom: 21,
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: false,
    });
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    // Primary: Google Maps satellite (most current imagery).
    const googleSat = L.tileLayer(GOOGLE_SATELLITE_URL, {
      subdomains: ["0", "1", "2", "3"],
      attribution: "© Google Maps",
      maxZoom: 21,
      maxNativeZoom: 21,
      tileSize: 256,
    });
    // Mapbox satellite — often sharper residential imagery.
    const mapboxSat = L.tileLayer(MAPBOX_SATELLITE_URL, {
      attribution: "© Mapbox © OpenStreetMap",
      maxZoom: 22,
      maxNativeZoom: 22,
      tileSize: 512,
      zoomOffset: -1,
    });
    // Fallback: ESRI World Imagery.
    const esriSat = L.tileLayer(ESRI_SATELLITE_URL, {
      attribution: "© Esri World Imagery",
      maxZoom: 21,
      maxNativeZoom: 19,
    });
    googleSat.addTo(map);
    L.control
      .layers(
        {
          "Google Satellite": googleSat,
          "Mapbox Satellite": mapboxSat,
          "ESRI Satellite": esriSat,
        },
        {},
        { position: "topright", collapsed: true },
      )
      .addTo(map);

    map.setView([initialLat, initialLng], 20);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!drawModeRef.current) return;
      verticesRef.current = [...verticesRef.current, e.latlng];
      redrawInProgress();
    });

    map.on("dblclick", () => {
      if (drawModeRef.current) finalizePolygon();
    });

    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      if (!drawModeRef.current) return;
      const pts = verticesRef.current;
      if (pts.length === 0) return;
      previewRef.current?.remove();
      previewRef.current = L.polyline([pts[pts.length - 1]!, e.latlng], {
        color: "#22c55e",
        weight: 1,
        dashArray: "2 4",
        opacity: 0.7,
        interactive: false,
      }).addTo(map);
    });

    // Force Leaflet to recalculate container size after React paints
    setTimeout(() => {
      map.invalidateSize({ animate: false });
      setTimeout(() => map.invalidateSize({ animate: false }), 500);
    }, 50);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      verticesRef.current = [];
      polylineRef.current = null;
      polygonRef.current = null;
      previewRef.current = null;
      setMetrics(null);
      setVertexCount(0);
      setDrawMode(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialLat, initialLng]);

  const handleSearch = async () => {
    if (!address.trim()) return;
    setSearching(true);
    try {
      const coords = await geocodeAddress(address);
      if (!coords) {
        toast.error("Address not found.");
        return;
      }
      mapRef.current?.setView([coords.lat, coords.lng], 20);
      toast.success("Found — draw your boundary or confirm the centre.");
    } finally {
      setSearching(false);
    }
  };

  const handleGps = () => {
    if (!navigator.geolocation) {
      toast.error("GPS not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setView(
          [pos.coords.latitude, pos.coords.longitude],
          20,
        );
        toast.success("Centered on your GPS location.");
      },
      () => toast.error("Could not get GPS location."),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  const handleConfirm = () => {
    const map = mapRef.current;
    if (!map) return;

    // Auto-finalize if the user drew vertices but didn't double-click to close.
    if (
      drawModeRef.current &&
      verticesRef.current.length >= 3 &&
      !metricsRef.current
    ) {
      finalizePolygon();
      // finalizePolygon writes the refs synchronously, so metricsRef.current and
      // vertsBoundaryRef.current are populated immediately below.
    }

    const m = metricsRef.current;
    const pts = vertsBoundaryRef.current;

    if (m && pts.length >= 3) {
      const verts: LatLng[] = pts.map((p) => ({ lat: p.lat, lng: p.lng }));
      onConfirm({
        lat: m.center.lat,
        lng: m.center.lng,
        label: `Garden plot (${m.center.lat.toFixed(5)}, ${m.center.lng.toFixed(5)})`,
        satelliteZoom: zoomForPlot(m.w, m.d),
        widthMeters: m.w,
        depthMeters: m.d,
        boundary: verts,
        swCorner: polygonMetrics(verts).sw,
      });
      return;
    }

    // No boundary drawn — confirm map center.
    const c = map.getCenter();
    onConfirm({
      lat: c.lat,
      lng: c.lng,
      label: `Garden plot (${c.lat.toFixed(5)}, ${c.lng.toFixed(5)})`,
      satelliteZoom: zoomForPlot(widthMeters, depthMeters),
    });
  };

  const undoVertex = () => {
    verticesRef.current = verticesRef.current.slice(0, -1);
    redrawInProgress();
  };

  if (!open) return null;

  return (
    <div className="garden-designer fixed inset-0 bg-black" style={{ zIndex: 80 }}>
      <div
        className="absolute left-4 top-4 max-w-sm rounded-xl border border-[color:var(--garden-border)] bg-[color:var(--garden-surface)]/95 p-4 text-[color:var(--garden-text)] shadow-2xl backdrop-blur-xl"
        style={{ zIndex: 1000, pointerEvents: "auto" }}
      >
        <h3 className="garden-font-display mb-1 flex items-center gap-2 text-lg font-bold">
          <MapPin className="h-5 w-5 text-[color:var(--garden-accent)]" />
          Position Your Garden
        </h3>
        <p className="mb-3 text-sm text-[color:var(--garden-text-muted)]">
          {drawMode &&
            vertexCount === 0 &&
            "Click the map to place boundary corners."}
          {drawMode &&
            vertexCount > 0 &&
            vertexCount < 3 &&
            `${vertexCount} point${vertexCount > 1 ? "s" : ""} placed — need at least 3.`}
          {drawMode &&
            vertexCount >= 3 &&
            !metrics &&
            "Double-click or press Confirm to close the boundary."}
          {metrics &&
            `✓ Boundary set: ${metrics.w.toFixed(1)}m × ${metrics.d.toFixed(1)}m — confirm to use this plot.`}
          {!drawMode &&
            !metrics &&
            "Pan to your property, then draw your garden boundary."}
        </p>

        <div className="mb-3 flex gap-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Search address…"
            className="border-[color:var(--garden-border)] bg-[color:var(--garden-surface-raised)]"
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

        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={handleGps}>
            📍 My GPS
          </Button>
          <Button
            size="sm"
            variant={drawMode ? "default" : "outline"}
            onClick={() => {
              if (!drawMode) resetDrawing();
              setDrawMode((v) => !v);
            }}
          >
            <PencilRuler className="mr-1 h-4 w-4" />
            {drawMode ? "Drawing…" : "Draw boundary"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() - 1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>

        {drawMode && (
          <div className="mb-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={vertexCount === 0}
              onClick={undoVertex}
            >
              <Undo2 className="mr-1 h-4 w-4" /> Undo point
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={vertexCount < 3}
              onClick={finalizePolygon}
            >
              Close ({vertexCount})
            </Button>
          </div>
        )}

        {(vertexCount > 0 || metrics) && (
          <div className="mb-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full border-[color:var(--garden-border)] text-[color:var(--garden-text-muted)] hover:text-[color:var(--garden-text)]"
              onClick={() => {
                resetDrawing();
                setDrawMode(false);
              }}
            >
              ↺ Clear &amp; Redraw
            </Button>
          </div>
        )}

        {metrics && (
          <p className="garden-font-mono mb-3 rounded-md bg-[color:var(--garden-accent)]/10 px-2 py-1 text-xs text-[color:var(--garden-accent)]">
            ▦ {metrics.w.toFixed(1)}m × {metrics.d.toFixed(1)}m boundary
          </p>
        )}

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-[color:var(--garden-accent)] text-black hover:brightness-110"
            onClick={handleConfirm}
          >
            {drawMode && vertexCount >= 3 && !metrics
              ? "✓ Close & Confirm"
              : "✓ Confirm Location"}
          </Button>
          <Button variant="secondary" onClick={onSkip}>
            Skip
          </Button>
        </div>
      </div>

      <div
        ref={mapEl}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
