import type { GardenDesign } from "./garden-types";
import { getPlantById } from "./garden-plant-catalog";
import { calculateGardenCost } from "./garden-cost";
import type { YieldEstimate } from "./garden-rules";

export type SmartData = {
  totalPlotM2: number;
  plantedAreaM2: number;
  hardscapeM2: number;
  pathAreaM2: number;
  openAreaM2: number;
  totalPlants: number;
  trees: number;
  shrubs: number;
  herbs: number;
  ground: number;
  nativeCount: number;
  nativePct: number;
  edibleCount: number;
  ediblePct: number;
  pollinatorCount: number;
  droughtTolerantCount: number;
  droughtPct: number;
  weeklyWaterGal: number;
  rainBarrelGal: number;
  irrigationCoveragePct: number;
  sustainabilityScore: number;
  yieldMin: number;
  yieldMax: number;
  costTotalCents: number;
};

function circleArea(r: number) {
  return Math.PI * r * r;
}

export function computeSmartData(design: GardenDesign, yieldEst: YieldEstimate): SmartData {
  const totalPlotM2 = design.widthMeters * design.depthMeters;
  let plantedAreaM2 = 0;
  let trees = 0;
  let shrubs = 0;
  let herbs = 0;
  let ground = 0;
  let nativeCount = 0;
  let edibleCount = 0;
  let pollinatorCount = 0;
  let droughtTolerantCount = 0;
  let weeklyWaterGal = 0;

  for (const p of design.plants) {
    const cat = p.catalogId ? getPlantById(p.catalogId) : null;
    const spacing = cat?.spacing ?? 0.6;
    const area = circleArea(spacing / 2) * (p.scale ?? 1);
    plantedAreaM2 += area;
    if (cat?.modelType === "large_tree" || cat?.modelType === "palm") trees += 1;
    else if (cat?.modelType === "small_tree" || cat?.modelType === "shrub") shrubs += 1;
    else if (cat?.category === "herb") herbs += 1;
    else ground += 1;
    if (cat?.nativeFlorida) nativeCount += 1;
    if (cat?.edible !== false) edibleCount += 1;
    if (cat?.category === "pollinator") pollinatorCount += 1;
    if (cat?.waterNeed === "low") droughtTolerantCount += 1;
    const wk = cat?.waterNeed === "high" ? 3 : cat?.waterNeed === "medium" ? 1.5 : 0.5;
    weeklyWaterGal += wk;
  }

  let hardscapeM2 = 0;
  let pathAreaM2 = 0;
  let rainBarrelGal = 0;
  let hasIrrigation = false;
  let hasCompost = false;

  for (const s of design.structures) {
    const area = s.width * s.depth;
    hardscapeM2 += area;
    if (/path|gravel|mulch|brick|stepping/.test(s.structureType)) pathAreaM2 += area;
    if (/rain-barrel/.test(s.structureType)) rainBarrelGal += 55;
    if (/drip|irrigation|sprinkler/.test(s.structureType)) hasIrrigation = true;
    if (/compost/.test(s.structureType)) hasCompost = true;
  }

  const openAreaM2 = Math.max(0, totalPlotM2 - plantedAreaM2 - hardscapeM2);
  const totalPlants = design.plants.length;
  const nativePct = totalPlants > 0 ? (nativeCount / totalPlants) * 100 : 0;
  const ediblePct = totalPlants > 0 ? (edibleCount / totalPlants) * 100 : 0;
  const droughtPct = totalPlants > 0 ? (droughtTolerantCount / totalPlants) * 100 : 0;
  const irrigationCoveragePct = hasIrrigation ? Math.min(100, 40 + plantedAreaM2 / totalPlotM2 * 60) : 0;

  let score = 40;
  if (nativePct >= 50) score += 15;
  else if (nativePct >= 30) score += 8;
  if (pollinatorCount >= 8) score += 12;
  else if (pollinatorCount >= 4) score += 6;
  if (droughtPct >= 30) score += 10;
  if (ediblePct >= 60) score += 15;
  if (hasCompost) score += 8;
  if (hasIrrigation) score += 5;
  if (rainBarrelGal > 0) score += 5;

  const cost = calculateGardenCost(design, yieldEst.estimatedLbsMax);

  return {
    totalPlotM2,
    plantedAreaM2,
    hardscapeM2,
    pathAreaM2,
    openAreaM2,
    totalPlants,
    trees,
    shrubs,
    herbs,
    ground,
    nativeCount,
    nativePct,
    edibleCount,
    ediblePct,
    pollinatorCount,
    droughtTolerantCount,
    droughtPct,
    weeklyWaterGal: Math.round(weeklyWaterGal * 2.5),
    rainBarrelGal,
    irrigationCoveragePct: Math.round(irrigationCoveragePct),
    sustainabilityScore: Math.min(100, score),
    yieldMin: yieldEst.estimatedLbsMin,
    yieldMax: yieldEst.estimatedLbsMax,
    costTotalCents: cost.totalCents,
  };
}

export function m2ToFt2(m2: number) {
  return m2 * 10.7639;
}

export function exportPlantScheduleCsv(design: GardenDesign): string {
  const rows = [["ID", "Common Name", "Latin Name", "Qty", "Spacing", "Sun", "Water"]];
  const groups = new Map<string, { plant: ReturnType<typeof getPlantById> | undefined; qty: number }>();
  for (const p of design.plants) {
    const key = p.catalogId ?? p.label;
    const prev = groups.get(key);
    if (prev) prev.qty += 1;
    else groups.set(key, { plant: p.catalogId ? getPlantById(p.catalogId) : undefined, qty: 1 });
  }
  let i = 1;
  for (const [, { plant, qty }] of groups) {
    rows.push([
      `P${i++}`,
      plant?.name ?? "Unknown",
      plant?.latinName ?? "",
      String(qty),
      plant ? `${Math.round(plant.spacing * 39.37)}"` : "",
      plant?.sunRequirement ?? "",
      plant?.waterNeed ?? "",
    ]);
  }
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function generateProjectTimeline(design: GardenDesign): string[] {
  const lines: string[] = [];
  const hasTrees = design.plants.some((p) => {
    const c = getPlantById(p.catalogId ?? "");
    return c?.modelType === "large_tree" || c?.modelType === "small_tree";
  });
  const hasPeppers = design.plants.some((p) => getPlantById(p.catalogId ?? "")?.category === "pepper");
  const hasCoop = design.structures.some((s) => s.structureType.includes("chicken"));
  lines.push("Month 1: Site preparation — clear, grade, install beds & main irrigation");
  if (hasTrees) lines.push("Month 2: Plant canopy trees and nitrogen fixers");
  if (design.structures.some((s) => s.structureType.includes("rain"))) {
    lines.push("Month 2: Install rain barrels and swales");
  }
  lines.push("Month 3: Understory shrubs, citrus, and compost system");
  if (hasCoop) lines.push("Month 3: Build chicken coop and run");
  if (hasPeppers) lines.push("Month 4: Plant peppers, herbs, and vegetables (after last frost)");
  lines.push("Ongoing: Mulch quarterly, compost weekly, irrigation check monthly");
  return lines;
}
