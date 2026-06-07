import {
  type LatLng,
  latLngToMeters,
  metersToFeetInches,
  metersToLatLng,
} from "@/lib/garden-geo";
import { getPlantById } from "@/lib/garden-plant-catalog";
import type {
  GardenDesign,
  PendingPlacement,
  PlantPlacement,
  SelectedType,
  StructurePlacement,
} from "@/lib/garden-types";
import {
  ESRI_SATELLITE_URL,
  GOOGLE_SATELLITE_URL,
  MAPBOX_SATELLITE_URL,
} from "@/lib/satellite-tiles";
import { cn } from "@/lib/utils";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { GardenCursorReadout } from "./GardenStatusBar";

type Props = {
  design: GardenDesign;
  /** South-west corner of the plot in lat/lng. */
  swCorner: LatLng;
  center: LatLng;
  zoom: number;
  /** Optional user-drawn boundary (lat/lng ring). Falls back to plot rect. */
  boundary?: LatLng[] | null;
  selectedId: number | null;
  selectedType: SelectedType;
  pending: PendingPlacement | null;
  gridOn: boolean;
  readOnly?: boolean;
  onPlaceAt: (east: number, north: number) => void;
  onSelectPlant: (id: number) => void;
  onSelectStructure: (id: number) => void;
  onMoveItem: (id: number, type: "plant" | "structure", east: number, north: number) => void;
  onClearSelection: () => void;
  onCursor: (c: GardenCursorReadout | null) => void;
  onZoomChange?: (z: number) => void;
};

const PEPPER = "#ef4444";
const TREE = "#22c55e";
const HERB = "#a3e635";
const STRUCTURE = "#d4a843";

function plantColor(p: PlantPlacement): string {
  const cat = p.catalogId ? getPlantById(p.catalogId)?.category : undefined;
  if (!cat) return p.color || TREE;
  if (cat === "pepper") return PEPPER;
  if (
    cat === "native_tree" ||
    cat === "palm" ||
    cat === "tropical_fruit" ||
    cat === "citrus" ||
    cat === "berry"
  )
    return TREE;
  if (
    cat === "herb" ||
    cat === "pollinator" ||
    cat === "native_ground" ||
    cat === "cover_crop"
  )
    return HERB;
  return p.color || TREE;
}

function plantSpacingMeters(p: PlantPlacement): number {
  const cat = p.catalogId ? getPlantById(p.catalogId) : undefined;
  return cat?.spacing ?? cat?.matureWidth ?? 0.5;
}

/**
 * Georeferenced 2D satellite canvas. Leaflet is mounted imperatively (no
 * react-leaflet) so we keep full control of the lifecycle, the grid overlay,
 * and the custom markers.
 */
export function GardenSatelliteCanvas({
  design,
  swCorner,
  center,
  zoom,
  boundary,
  selectedId,
  selectedType,
  pending,
  gridOn,
  readOnly,
  onPlaceAt,
  onSelectPlant,
  onSelectStructure,
  onMoveItem,
  onClearSelection,
  onCursor,
  onZoomChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const boundaryRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const ghostRef = useRef<L.Marker | null>(null);

  // Keep latest callbacks/props in refs so the map's event handlers (bound once)
  // always see fresh values without re-mounting the map.
  const stable = useRef({
    design,
    swCorner,
    pending,
    readOnly,
    onPlaceAt,
    onClearSelection,
    onCursor,
  });
  stable.current = {
    design,
    swCorner,
    pending,
    readOnly,
    onPlaceAt,
    onClearSelection,
    onCursor,
  };

  const [scale, setScale] = useState<{ widthPx: number; label: string }>({
    widthPx: 80,
    label: "—",
  });

  // ── Mount Leaflet once ───────────────────────────────────────────────────
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [center.lat, center.lng],
      // Auto-fit never exceeds zoom 20 — 21 often has no native tiles and looks
      // blurry. The user can still manually zoom to 21.
      zoom: Math.min(zoom, 20),
      minZoom: 17,
      maxZoom: 21,
      zoomControl: true,
      attributionControl: true,
      dragging: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: false,
    });
    mapRef.current = map;

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

    markersRef.current = L.layerGroup().addTo(map);

    const drawGrid = () => drawGridOverlay();
    const handleScale = () => updateScale();

    map.on("move", drawGrid);
    map.on("zoom", drawGrid);
    map.on("moveend", () => {
      drawGrid();
      handleScale();
    });
    map.on("zoomend", () => {
      drawGrid();
      handleScale();
      onZoomChange?.(Math.round(map.getZoom()));
    });
    map.on("resize", () => {
      sizeGridCanvas();
      drawGrid();
    });

    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      const m = latLngToMeters(stable.current.swCorner, {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
      stable.current.onCursor({
        east: m.east,
        north: m.north,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
      const ghost = ghostRef.current;
      if (ghost && stable.current.pending) ghost.setLatLng(e.latlng);
    });

    map.on("mouseout", () => stable.current.onCursor(null));

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (stable.current.readOnly) return;
      if (stable.current.pending) {
        const m = latLngToMeters(stable.current.swCorner, {
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
        stable.current.onPlaceAt(m.east, m.north);
      } else {
        stable.current.onClearSelection();
      }
    });

    requestAnimationFrame(() => {
      map.invalidateSize();
      sizeGridCanvas();
      drawGridOverlay();
      updateScale();
    });
    window.setTimeout(() => {
      map.invalidateSize();
      sizeGridCanvas();
      drawGridOverlay();
    }, 300);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      boundaryRef.current = null;
      ghostRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-frame when the LOCATION or BOUNDARY changes. Deliberately not keyed on
  // `zoom` so a user manually zooming (e.g. to 21) is never snapped back here.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (boundary && boundary.length >= 3) {
      // Frame the exact drawn polygon with a little breathing room.
      const bounds = L.latLngBounds(
        boundary.map((p) => L.latLng(p.lat, p.lng)),
      );
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 21,
        animate: false,
      });
    } else {
      // No boundary — center on the point. Don't auto-fit above zoom 20; 21
      // often has no tiles and looks blurry.
      map.setView([center.lat, center.lng], Math.min(zoom, 20), {
        animate: false,
      });
    }
    requestAnimationFrame(() => {
      sizeGridCanvas();
      drawGridOverlay();
      updateScale();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, boundary]);

  // ── Boundary polygon ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (boundaryRef.current) {
      boundaryRef.current.remove();
      boundaryRef.current = null;
    }
    // Draw from the raw boundary vertices when present (preserves the exact drawn
    // shape); only fall back to a center+dimensions box when no boundary exists.
    const ring: [number, number][] = (
      boundary && boundary.length >= 3
        ? boundary
        : rectRing(swCorner, design.widthMeters, design.depthMeters)
    ).map((p) => [p.lat, p.lng]);
    boundaryRef.current = L.polygon(ring, {
      color: "#22c55e",
      weight: 2,
      fillColor: "#22c55e",
      fillOpacity: 0.15,
      interactive: false,
    }).addTo(map);
    drawGridOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    boundary,
    swCorner.lat,
    swCorner.lng,
    design.widthMeters,
    design.depthMeters,
  ]);

  // ── Markers (plants + structures) ───────────────────────────────────────────
  useEffect(() => {
    rebuildMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.plants, design.structures, selectedId, selectedType, readOnly]);

  // ── Ghost preview + crosshair cursor ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
    if (pending) {
      const icon =
        pending.kind === "plant" ? pending.icon : (pending.label ?? "▦");
      const html = `<div class="garden-plant-marker" style="--marker-color:${
        pending.kind === "plant" ? pending.color : STRUCTURE
      };opacity:0.6"><div class="marker-icon">${icon}</div></div>`;
      ghostRef.current = L.marker(map.getCenter(), {
        icon: L.divIcon({ html, className: "", iconSize: [0, 0] }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function sizeGridCanvas() {
    const map = mapRef.current;
    const canvas = gridCanvasRef.current;
    if (!map || !canvas) return;
    const size = map.getSize();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.x * dpr;
    canvas.height = size.y * dpr;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function gridSpacingForZoom(z: number): number {
    if (z >= 21) return 0.25;
    if (z >= 20) return 0.5;
    return 1;
  }

  function drawGridOverlay() {
    const map = mapRef.current;
    const canvas = gridCanvasRef.current;
    if (!map || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = map.getSize();
    ctx.clearRect(0, 0, size.x, size.y);
    if (!gridOnRef.current) return;

    const sw = swCornerRef.current;
    const w = designRef.current.widthMeters;
    const d = designRef.current.depthMeters;
    const zoom = map.getZoom();
    const step = gridSpacingForZoom(zoom);

    // Only label every N metres (denser as you zoom in), and never closer than
    // 40px apart, so labels don't crowd or fight the imagery.
    const labelInterval = zoom >= 21 ? 1 : zoom >= 20 ? 2 : 5;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(34,197,94,0.15)";
    ctx.font = "11px 'DM Mono', monospace";
    ctx.fillStyle = "rgba(212,168,67,0.7)";

    const toPt = (east: number, north: number) => {
      const ll = metersToLatLng(sw, east, north);
      return map.latLngToContainerPoint([ll.lat, ll.lng]);
    };

    // Vertical lines (constant east).
    let lastLabelX = Number.NEGATIVE_INFINITY;
    for (let e = 0; e <= w + 1e-6; e += step) {
      const a = toPt(e, 0);
      const b = toPt(e, d);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      const meters = Math.round(e);
      if (
        e > 0 &&
        Math.abs(e - meters) < 1e-6 &&
        meters % labelInterval === 0 &&
        Math.abs(b.x - lastLabelX) >= 40
      ) {
        ctx.fillText(`${meters}m`, b.x + 2, b.y - 2);
        lastLabelX = b.x;
      }
    }
    // Horizontal lines (constant north).
    let lastLabelY = Number.NEGATIVE_INFINITY;
    for (let n = 0; n <= d + 1e-6; n += step) {
      const a = toPt(0, n);
      const b = toPt(w, n);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      const meters = Math.round(n);
      if (
        n > 0 &&
        Math.abs(n - meters) < 1e-6 &&
        meters % labelInterval === 0 &&
        Math.abs(a.y - lastLabelY) >= 40
      ) {
        ctx.fillText(`${meters}m`, a.x + 2, a.y - 2);
        lastLabelY = a.y;
      }
    }
  }

  function updateScale() {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const p1 = map.latLngToContainerPoint(c);
    const ll2 = map.containerPointToLatLng(L.point(p1.x + 100, p1.y));
    const metersPer100 = map.distance(c, ll2);
    const metersPerPx = metersPer100 / 100;
    // Pick a "nice" round number close to 80px wide.
    const targetMeters = metersPerPx * 80;
    const nice = niceNumber(targetMeters);
    const widthPx = nice / metersPerPx;
    const feet = nice * 3.28084;
    const label =
      nice >= 1
        ? `${nice} m  ·  ${feet.toFixed(feet >= 10 ? 0 : 1)} ft`
        : `${(nice * 100).toFixed(0)} cm  ·  ${(feet * 12).toFixed(0)} in`;
    setScale({ widthPx, label });
  }

  function rebuildMarkers() {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const sw = swCorner;
    const all = design.plants;

    for (const s of design.structures) {
      const ll = metersToLatLng(sw, s.x, s.y);
      const selected = selectedType === "structure" && selectedId === s.id;
      const html = `<div class="garden-plant-marker" data-category="structure" data-selected="${selected}" style="--marker-color:${STRUCTURE}"><div class="marker-icon">▦</div><div class="marker-label">${escapeHtml(
        s.structureType.replace(/[-_]/g, " "),
      )}</div></div>`;
      const marker = L.marker([ll.lat, ll.lng], {
        icon: L.divIcon({ html, className: "", iconSize: [0, 0] }),
        draggable: !readOnly,
        zIndexOffset: selected ? 600 : 200,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectStructure(s.id);
      });
      marker.on("dragend", () => {
        const m = latLngToMeters(sw, marker.getLatLng());
        onMoveItem(s.id, "structure", m.east, m.north);
      });
      marker.addTo(layer);
    }

    for (const p of all) {
      const ll = metersToLatLng(sw, p.x, p.y);
      const selected = selectedType === "plant" && selectedId === p.id;
      const color = plantColor(p);
      const spacing = plantSpacingMeters(p);
      const overlap = all.some(
        (o) =>
          o.id !== p.id &&
          Math.hypot(o.x - p.x, o.y - p.y) <
            (spacing + plantSpacingMeters(o)) / 2,
      );
      // Spacing ring diameter in pixels at current zoom.
      const edge = metersToLatLng(sw, p.x + spacing, p.y);
      const pc = map.latLngToContainerPoint([ll.lat, ll.lng]);
      const pe = map.latLngToContainerPoint([edge.lat, edge.lng]);
      const ringPx = Math.max(20, Math.abs(pe.x - pc.x) * 2);
      const html = `<div class="garden-plant-marker" data-category="plant" data-overlap="${overlap}" data-selected="${selected}" style="--marker-color:${color}"><div class="marker-ring" style="width:${ringPx}px;height:${ringPx}px"></div><div class="marker-icon">${
        p.icon || "🌱"
      }</div><div class="marker-label">${escapeHtml(p.label)}</div></div>`;
      const marker = L.marker([ll.lat, ll.lng], {
        icon: L.divIcon({ html, className: "", iconSize: [0, 0] }),
        draggable: !readOnly && !pending,
        zIndexOffset: selected ? 700 : 400,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectPlant(p.id);
      });
      marker.on("dragend", () => {
        const m = latLngToMeters(sw, marker.getLatLng());
        onMoveItem(p.id, "plant", m.east, m.north);
      });
      marker.addTo(layer);
    }
  }

  // refs read inside imperative draw functions
  const gridOnRef = useRef(gridOn);
  gridOnRef.current = gridOn;
  const swCornerRef = useRef(swCorner);
  swCornerRef.current = swCorner;
  const designRef = useRef(design);
  designRef.current = design;

  // Redraw grid when toggled.
  useEffect(() => {
    drawGridOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridOn]);

  return (
    <div
      className={cn(
        "garden-leaflet relative h-full w-full overflow-hidden",
        pending && "garden-placing",
      )}
    >
      <div ref={hostRef} className="absolute inset-0" />
      <canvas
        ref={gridCanvasRef}
        className="pointer-events-none absolute inset-0 z-[450]"
      />
      {/* Scale bar — survey-instrument style */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] select-none">
        <div
          className="flex h-2 overflow-hidden rounded-sm border border-white/70"
          style={{ width: scale.widthPx }}
        >
          <div className="h-full flex-1 bg-black" />
          <div className="h-full flex-1 bg-white" />
          <div className="h-full flex-1 bg-black" />
          <div className="h-full flex-1 bg-white" />
        </div>
        <div className="garden-font-mono mt-0.5 text-[10px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {scale.label}
        </div>
      </div>
      {pending && (
        <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-md bg-black/70 px-3 py-1.5 text-xs text-white garden-font-mono">
          Click to place {pending.kind === "plant" ? pending.label : pending.label ?? "item"} · Esc to cancel
        </div>
      )}
    </div>
  );
}

function rectRing(sw: LatLng, w: number, d: number): LatLng[] {
  return [
    metersToLatLng(sw, 0, 0),
    metersToLatLng(sw, w, 0),
    metersToLatLng(sw, w, d),
    metersToLatLng(sw, 0, d),
  ];
}

function niceNumber(x: number): number {
  const pow = 10 ** Math.floor(Math.log10(x));
  const f = x / pow;
  const nice = f >= 5 ? 5 : f >= 2 ? 2 : 1;
  return nice * pow;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// re-export so the orchestrator can show feet readouts alongside metres
export { metersToFeetInches };
