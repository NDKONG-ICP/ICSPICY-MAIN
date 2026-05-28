import type { GardenDesign, GardenToolExtras } from "./garden-types";
import { DEFAULT_TOOL_EXTRAS } from "./garden-types";

const KEY = "garden-tool-extras";

export function loadToolExtras(designId: number | null): GardenToolExtras {
  try {
    const raw = localStorage.getItem(`${KEY}-${designId ?? "draft"}`);
    if (raw) return { ...DEFAULT_TOOL_EXTRAS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_TOOL_EXTRAS };
}

export function saveToolExtras(designId: number | null, extras: GardenToolExtras) {
  localStorage.setItem(`${KEY}-${designId ?? "draft"}`, JSON.stringify(extras));
}

export function distanceMeters(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function polygonAreaM2(points: { x: number; y: number }[]) {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    sum += points[i]!.x * points[j]!.y - points[j]!.x * points[i]!.y;
  }
  return Math.abs(sum / 2);
}

export function nearestPlantSpacingWarning(
  design: GardenDesign,
  x: number,
  y: number,
  catalogId?: string | null,
): string | null {
  const cat = catalogId ? design.plants.find((p) => p.catalogId === catalogId) : null;
  const spacing = 0.6;
  for (const p of design.plants) {
    const d = distanceMeters({ x, y }, { x: p.x, y: p.y });
    const need = (p.scale ?? 1) * 0.6;
    if (d < need * 0.8) {
      return `Too close to ${p.label} (needs ${(need * 3.28).toFixed(1)}ft clearance)`;
    }
  }
  return null;
}
