import {
  getCompanionLinks,
  getPlantPlacementHalos,
} from "@/lib/garden-companion-viz";
import { PLANT_CATALOG, getPlantById } from "@/lib/garden-plant-catalog";
import { buildSunShadeGrid, sunShadeColor } from "@/lib/garden-sun-shade";
import { distanceMeters, polygonAreaM2 } from "@/lib/garden-tool-state";
import type {
  GardenDesign,
  GardenMeasurement,
  GardenToolExtras,
  LayerVisibility,
} from "@/lib/garden-types";
import { type ReactElement, useMemo } from "react";

const PX = 50;

type Props = {
  design: GardenDesign;
  layers: LayerVisibility;
  extras: GardenToolExtras;
  pxPerM?: number;
  sunLat: number;
  sunLng: number;
  timeOfDayHour: number;
  ghost: { x: number; y: number } | null;
  pendingCatalogId?: string | null;
};

function mToFt(m: number) {
  return m * 3.28084;
}

function m2ToFt2(m2: number) {
  return m2 * 10.7639;
}

export function GardenProOverlays({
  design,
  layers,
  extras,
  pxPerM = PX,
  sunLat,
  sunLng,
  timeOfDayHour,
  ghost,
  pendingCatalogId,
}: Props) {
  const w = design.widthMeters * pxPerM;
  const h = design.depthMeters * pxPerM;

  const companionLinks = useMemo(
    () =>
      layers.companions ? getCompanionLinks(design.plants, PLANT_CATALOG) : [],
    [design.plants, layers.companions],
  );

  const placementHalos = useMemo(
    () =>
      layers.companions
        ? getPlantPlacementHalos(design.plants, PLANT_CATALOG)
        : [],
    [design.plants, layers.companions],
  );

  const pendingCat = pendingCatalogId ? getPlantById(pendingCatalogId) : null;

  const spacingWarning = useMemo(() => {
    if (!layers.spacing || !ghost || !pendingCatalogId || !pendingCat)
      return null;
    const need = pendingCat.spacing;
    for (const p of design.plants) {
      const other = p.catalogId ? getPlantById(p.catalogId) : null;
      const minDist = Math.max(need, other?.spacing ?? 0.6) * 0.85;
      const d = distanceMeters(ghost, { x: p.x, y: p.y });
      if (d < minDist) {
        return `Too close to ${p.label} (needs ${mToFt(minDist).toFixed(1)}ft clearance)`;
      }
    }
    return null;
  }, [design.plants, ghost, layers.spacing, pendingCatalogId, pendingCat]);

  const sunGrid = useMemo(() => {
    if (!layers.sunShade) return null;
    return buildSunShadeGrid(design, sunLat, sunLng, timeOfDayHour, 24, 24);
  }, [design, layers.sunShade, sunLat, sunLng, timeOfDayHour]);

  const els: ReactElement[] = [];

  if (layers.contours) {
    for (let i = 1; i <= 4; i += 1) {
      const y = (h / 5) * i;
      els.push(
        <line
          key={`contour-${i}`}
          x1={0}
          y1={y}
          x2={w}
          y2={y}
          stroke="#64748b"
          strokeWidth={1}
          strokeDasharray="6 4"
          opacity={0.5}
        />,
      );
    }
  }

  if (sunGrid) {
    const cols = sunGrid[0]?.length ?? 0;
    const rows = sunGrid.length;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const v = sunGrid[r]![c]!;
        els.push(
          <rect
            key={`sun-${r}-${c}`}
            x={(c / cols) * w}
            y={(r / rows) * h}
            width={w / cols + 1}
            height={h / rows + 1}
            fill={sunShadeColor(v)}
            pointerEvents="none"
          />,
        );
      }
    }
  }

  if (extras.sitePhotoUrl) {
    els.push(
      <image
        key="site-photo"
        href={extras.sitePhotoUrl}
        x={0}
        y={0}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid slice"
        opacity={0.55}
      />,
    );
  }

  if (layers.spacing) {
    for (const p of design.plants) {
      const cat = p.catalogId ? getPlantById(p.catalogId) : null;
      const r = (cat?.spacing ?? 0.6) * pxPerM * (p.scale ?? 1);
      els.push(
        <circle
          key={`sp-${p.id}`}
          cx={p.x * pxPerM}
          cy={p.y * pxPerM}
          r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.45}
        />,
      );
    }
    if (ghost && pendingCatalogId) {
      const cat = getPlantById(pendingCatalogId);
      const r = (cat?.spacing ?? 0.6) * pxPerM;
      els.push(
        <circle
          key="ghost-spacing"
          cx={ghost.x * pxPerM}
          cy={ghost.y * pxPerM}
          r={r}
          fill="none"
          stroke={spacingWarning ? "#ef4444" : "#22c55e"}
          strokeWidth={2}
          strokeDasharray="6 4"
        />,
      );
    }
  }

  if (layers.companions) {
    for (const halo of placementHalos) {
      const p = design.plants.find((pl) => pl.id === halo.plantId);
      if (!p) continue;
      const r = 14 * (p.scale ?? 1);
      els.push(
        <circle
          key={`halo-${p.id}`}
          cx={p.x * pxPerM}
          cy={p.y * pxPerM}
          r={r + 6}
          fill="none"
          stroke={halo.kind === "good" ? "#eab308" : "#ef4444"}
          strokeWidth={2}
          opacity={0.75}
        />,
      );
    }
    for (const link of companionLinks) {
      els.push(
        <line
          key={`${link.from.id}-${link.to.id}`}
          x1={link.from.x * pxPerM}
          y1={link.from.y * pxPerM}
          x2={link.to.x * pxPerM}
          y2={link.to.y * pxPerM}
          stroke={link.type === "companion" ? "#22c55e" : "#ef4444"}
          strokeWidth={2}
          strokeDasharray={link.type === "antagonist" ? "6 4" : undefined}
          opacity={0.7}
        >
          <title>{link.reason}</title>
        </line>,
      );
    }
  }

  if (layers.irrigation) {
    for (const line of extras.irrigationLines) {
      const pts = line.points;
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        els.push(
          <line
            key={`irr-${line.id}-${i}`}
            x1={a.x * pxPerM}
            y1={a.y * pxPerM}
            x2={b.x * pxPerM}
            y2={b.y * pxPerM}
            stroke="#3b82f6"
            strokeWidth={3}
            opacity={0.85}
          />,
        );
      }
      for (const p of design.plants) {
        const near = pts.some(
          (pt) => distanceMeters(pt, { x: p.x, y: p.y }) < 0.3,
        );
        if (near) {
          els.push(
            <circle
              key={`emitter-${line.id}-${p.id}`}
              cx={p.x * pxPerM}
              cy={p.y * pxPerM}
              r={4}
              fill="#60a5fa"
              opacity={0.9}
            />,
          );
        }
      }
    }
    const emitterCount =
      extras.irrigationLines.length * design.plants.length > 0
        ? design.plants.filter((p) =>
            extras.irrigationLines.some((line) =>
              line.points.some(
                (pt) => distanceMeters(pt, { x: p.x, y: p.y }) < 0.3,
              ),
            ),
          ).length
        : 0;
    if (emitterCount > 0) {
      els.push(
        <text x={8} y={16} fill="#60a5fa" fontSize={11}>
          Irrigation: ~{(emitterCount * 0.5).toFixed(1)} GPH ({emitterCount}{" "}
          emitters)
        </text>,
      );
    }
  }

  if (layers.dimensions) {
    for (const m of extras.measurements) {
      if (m.type === "distance" && m.points.length === 2) {
        const [a, b] = m.points;
        const dist = distanceMeters(a, b);
        els.push(
          <g key={`dim-${m.id}`}>
            <line
              x1={a.x * pxPerM}
              y1={a.y * pxPerM}
              x2={b.x * pxPerM}
              y2={b.y * pxPerM}
              stroke="#fbbf24"
              strokeWidth={2}
            />
            <text
              x={((a.x + b.x) / 2) * pxPerM}
              y={((a.y + b.y) / 2) * pxPerM - 6}
              fill="#fbbf24"
              fontSize={11}
              textAnchor="middle"
            >
              {dist.toFixed(1)}m ({mToFt(dist).toFixed(1)} ft)
            </text>
          </g>,
        );
      }
      if (m.type === "area" && m.points.length >= 3) {
        const area = polygonAreaM2(m.points);
        const d =
          m.points
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"} ${p.x * pxPerM} ${p.y * pxPerM}`,
            )
            .join(" ") + " Z";
        els.push(
          <g key={`area-${m.id}`}>
            <path
              d={d}
              fill="#fbbf24"
              fillOpacity={0.2}
              stroke="#fbbf24"
              strokeWidth={1.5}
            />
            <text
              x={
                (m.points.reduce((s, p) => s + p.x, 0) / m.points.length) *
                pxPerM
              }
              y={
                (m.points.reduce((s, p) => s + p.y, 0) / m.points.length) *
                pxPerM
              }
              fill="#fbbf24"
              fontSize={11}
              textAnchor="middle"
            >
              {area.toFixed(1)} m² ({m2ToFt2(area).toFixed(0)} ft²)
            </text>
          </g>,
        );
      }
    }
  }

  if (layers.annotations) {
    for (const n of extras.annotations) {
      els.push(
        <g
          key={`note-${n.id}`}
          transform={`translate(${n.x * pxPerM}, ${n.y * pxPerM})`}
        >
          <circle r={8} fill="#f59e0b" stroke="#fff" strokeWidth={1} />
          <text textAnchor="middle" dy={3} fontSize={10} fill="#000">
            📝
          </text>
          <text x={12} y={4} fontSize={10} fill="#e2e8f0">
            {n.text.slice(0, 40)}
          </text>
        </g>,
      );
    }
  }

  if (spacingWarning && ghost) {
    els.push(
      <text
        x={ghost.x * pxPerM}
        y={ghost.y * pxPerM - 18}
        fill="#ef4444"
        fontSize={10}
        textAnchor="middle"
      >
        {spacingWarning}
      </text>,
    );
  }

  if (extras.sectionCutY != null && layers.dimensions) {
    const y = extras.sectionCutY * pxPerM;
    els.push(
      <line
        key="section-cut"
        x1={0}
        y1={y}
        x2={w}
        y2={y}
        stroke="#a855f7"
        strokeWidth={2}
        strokeDasharray="8 4"
      />,
    );
  }

  return <g pointerEvents="none">{els}</g>;
}

export function renderSectionProfile(
  design: GardenDesign,
  cutY: number,
): { label: string; heightM: number; color: string }[] {
  const slice = design.plants.filter((p) => Math.abs(p.y - cutY) < 2);
  return slice
    .map((p) => {
      const cat = p.catalogId ? getPlantById(p.catalogId) : null;
      const heightM =
        cat?.modelType === "large_tree" || cat?.modelType === "palm"
          ? 8
          : cat?.modelType === "small_tree"
            ? 4
            : cat?.modelType === "shrub"
              ? 2
              : 0.6;
      return { label: p.label, heightM, color: p.color };
    })
    .sort((a, b) => b.heightM - a.heightM);
}
