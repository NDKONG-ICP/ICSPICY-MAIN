import type {
  GardenDesign,
  PlantPlacement,
  StructurePlacement,
  StructurePreset,
} from "./garden-types";

export function varietyColor(scovilleMax: number): string {
  if (scovilleMax === 0) return "#22c55e";
  if (scovilleMax < 10_000) return "#84cc16";
  if (scovilleMax < 100_000) return "#eab308";
  if (scovilleMax < 500_000) return "#f97316";
  if (scovilleMax < 1_000_000) return "#ef4444";
  return "#dc2626";
}

export function varietyIcon(scovilleMax: number): string {
  if (scovilleMax >= 100_000) return "🌶️";
  if (scovilleMax >= 10_000) return "🔥";
  return "🫑";
}

export function formatScoville(min: bigint, max: bigint): string {
  const fmt = (n: bigint) => {
    const v = Number(n);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
    return String(v);
  };
  if (min === max) return `${fmt(max)} SHU`;
  return `${fmt(min)}–${fmt(max)} SHU`;
}

export const STRUCTURE_PRESETS: StructurePreset[] = [
  {
    structureType: "raised_bed",
    label: "Raised Bed",
    emoji: "🟫",
    width: 2,
    depth: 1,
    color: "#8B4513",
  },
  {
    structureType: "path",
    label: "Path",
    emoji: "⬜",
    width: 3,
    depth: 0.5,
    color: "#6b7280",
  },
  {
    structureType: "greenhouse",
    label: "Greenhouse",
    emoji: "🏠",
    width: 4,
    depth: 2,
    color: "#86efac",
  },
  {
    structureType: "fence",
    label: "Fence",
    emoji: "🪵",
    width: 2,
    depth: 0.1,
    color: "#a16207",
  },
  {
    structureType: "trellis",
    label: "Trellis",
    emoji: "🪜",
    width: 1,
    depth: 0.2,
    color: "#78716c",
  },
  {
    structureType: "compost_bin",
    label: "Compost Bin",
    emoji: "♻️",
    width: 1,
    depth: 1,
    color: "#44403c",
  },
  {
    structureType: "water_source",
    label: "Water Source",
    emoji: "💧",
    width: 0.5,
    depth: 0.5,
    color: "#3b82f6",
  },
  {
    structureType: "shade_sail",
    label: "Shade Sail",
    emoji: "⛱️",
    width: 3,
    depth: 3,
    color: "#94a3b8",
  },
];

export function createEmptyDesign(): GardenDesign {
  return {
    id: null,
    name: "My Garden",
    description: null,
    plants: [],
    structures: [],
    widthMeters: 10,
    depthMeters: 10,
    gridSizeMeters: 1,
    isPublic: false,
  };
}

export function cloneDesign(d: GardenDesign): GardenDesign {
  return {
    ...d,
    plants: d.plants.map((p) => ({ ...p })),
    structures: d.structures.map((s) => ({ ...s })),
  };
}

export function nextItemId(plants: PlantPlacement[], structures: StructurePlacement[]): number {
  let max = 0;
  for (const p of plants) max = Math.max(max, p.id);
  for (const s of structures) max = Math.max(max, s.id);
  return max + 1;
}

export function snapToGrid(value: number, grid: number, enabled: boolean): number {
  if (!enabled || grid <= 0) return value;
  return Math.round(value / grid) * grid;
}

export function clampPlot(value: number): number {
  return Math.min(100, Math.max(2, value));
}

export function clampScale(value: number): number {
  return Math.min(2, Math.max(0.5, value));
}

export function normalizeRotation(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

export function spacingRecommendation(scovilleMax: number): string {
  if (scovilleMax >= 500_000) return "45–60 cm (superhots need room)";
  if (scovilleMax >= 100_000) return "40–50 cm";
  if (scovilleMax >= 10_000) return "35–45 cm";
  return "30–40 cm";
}

export function plantSummary(design: GardenDesign): string {
  const n = design.plants.length;
  const s = design.structures.length;
  if (n === 0 && s === 0) return "Empty plot";
  const parts: string[] = [];
  if (n > 0) parts.push(`${n} plant${n === 1 ? "" : "s"}`);
  if (s > 0) parts.push(`${s} structure${s === 1 ? "" : "s"}`);
  return parts.join(" · ");
}
