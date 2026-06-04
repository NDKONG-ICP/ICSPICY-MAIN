import { getPlantById } from "./garden-plant-catalog";
import type { GardenDesign } from "./garden-types";

export function sunPositionFromHour(lat: number, lng: number, hour: number) {
  const decl =
    23.45 *
    Math.sin(((284 + new Date().getMonth() * 30) / 365) * (Math.PI / 180));
  const latRad = (lat * Math.PI) / 180;
  const hourAngle = ((hour - 12) * 15 * Math.PI) / 180;
  const elev = Math.asin(
    Math.sin(latRad) * Math.sin((decl * Math.PI) / 180) +
      Math.cos(latRad) * Math.cos((decl * Math.PI) / 180) * Math.cos(hourAngle),
  );
  const az =
    Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(latRad) -
        Math.tan((decl * Math.PI) / 180) * Math.cos(latRad),
    ) + Math.PI;
  return { elevation: elev, azimuth: az };
}

/** 0 = full shade, 1 = full sun */
export function buildSunShadeGrid(
  design: GardenDesign,
  lat: number,
  lng: number,
  hour: number,
  cols = 32,
  rows = 32,
): number[][] {
  const sun = sunPositionFromHour(lat, lng, hour);
  const grid: number[][] = [];
  const canopy = design.plants
    .map((p) => {
      const cat = p.catalogId ? getPlantById(p.catalogId) : null;
      const h =
        cat?.modelType === "large_tree" || cat?.modelType === "palm"
          ? 8
          : cat?.modelType === "small_tree"
            ? 4
            : cat?.modelType === "shrub"
              ? 2
              : 0;
      return h > 0 ? { x: p.x, y: p.y, r: (cat?.spacing ?? 1) * 0.5, h } : null;
    })
    .filter(Boolean) as { x: number; y: number; r: number; h: number }[];

  for (let row = 0; row < rows; row += 1) {
    const line: number[] = [];
    const gy = (row / rows) * design.depthMeters;
    for (let col = 0; col < cols; col += 1) {
      const gx = (col / cols) * design.widthMeters;
      let shade = 0;
      for (const c of canopy) {
        const d = Math.hypot(gx - c.x, gy - c.y);
        if (d < c.r) shade = Math.max(shade, 0.3 + (c.h / 10) * (1 - d / c.r));
      }
      const base = sun.elevation > 0 ? 0.85 : 0.2;
      line.push(Math.max(0, Math.min(1, base * (1 - shade))));
    }
    grid.push(line);
  }
  return grid;
}

export function sunShadeColor(v: number) {
  if (v > 0.75) return `rgba(250,204,21,${0.35})`;
  if (v > 0.45) return `rgba(74,222,128,${0.35})`;
  return `rgba(96,165,250,${0.4})`;
}
