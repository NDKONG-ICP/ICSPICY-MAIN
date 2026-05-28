import { getPlantById } from "./garden-plant-catalog";
import type { PlantPlacement } from "./garden-types";
import { STRUCTURE_CATALOG } from "./garden-plant-catalog";

export type SeasonalState = {
  scale: number;
  hasLeaves: boolean;
  hasFruit: boolean;
  hasFlowers: boolean;
  color: string;
  maturity: number;
};

const PEPPER_PEAK = [5, 6, 7, 8, 9, 10];
const CITRUS_FRUIT = [11, 12, 1, 2, 3];
const MANGO_FLOWER = [2];
const MANGO_FRUIT = [6, 7, 8];
const DECIDUOUS = new Set(["moringa-tree", "fig-celeste", "fig-brown-turkey"]);

function inMonths(month: number, months: number[]): boolean {
  return months.includes(month);
}

export function getSeasonalState(plant: PlantPlacement, month: number): SeasonalState {
  const cat = plant.catalogId ? getPlantById(plant.catalogId) : null;
  const category = cat?.category ?? "pepper";
  const baseColor = plant.color || cat?.color || "#2d7d2d";
  let scale = plant.scale;
  let hasLeaves = true;
  let hasFruit = false;
  let hasFlowers = false;
  let color = baseColor;
  let maturity = 0.75;

  if (category === "pepper" || plant.icon === "🌶️") {
    maturity = inMonths(month, PEPPER_PEAK) ? 0.95 : month <= 3 || month >= 11 ? 0.45 : 0.7;
    hasFruit = inMonths(month, PEPPER_PEAK);
    hasFlowers = month >= 3 && month <= 6;
    scale *= month <= 2 ? 0.85 : 1;
  } else if (category === "citrus") {
    hasFruit = inMonths(month, CITRUS_FRUIT);
    maturity = hasFruit ? 0.9 : 0.65;
    hasFlowers = month >= 2 && month <= 4;
  } else if (category === "tropical_fruit" && cat?.name.toLowerCase().includes("mango")) {
    hasFlowers = inMonths(month, MANGO_FLOWER);
    hasFruit = inMonths(month, MANGO_FRUIT);
    maturity = hasFruit ? 1 : hasFlowers ? 0.6 : 0.7;
  } else if (cat && DECIDUOUS.has(cat.id)) {
    if (month === 12 || month <= 2) {
      hasLeaves = false;
      maturity = 0.35;
      color = "#8B7355";
    }
  } else if (category === "native_ground" || category === "pollinator") {
    hasFlowers = month >= 3 && month <= 10;
    maturity = hasFlowers ? 0.8 : 0.5;
  } else if (cat?.modelType === "large_tree" || cat?.modelType === "small_tree") {
    maturity = month >= 4 && month <= 10 ? 0.85 : 0.55;
    if (month >= 10 && month <= 11) color = "#c27803";
  }

  return { scale, hasLeaves, hasFruit, hasFlowers, color, maturity };
}

export function monthSkyTint(month: number): { hour: number; fogColor: string } {
  if (month >= 6 && month <= 9) return { hour: 14, fogColor: "#87CEEB" };
  if (month === 12 || month <= 2) return { hour: 11, fogColor: "#b8c5d6" };
  if (month >= 3 && month <= 5) return { hour: 13, fogColor: "#a8d4f0" };
  return { hour: 12, fogColor: "#c4b5a8" };
}

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function estimateStructureCost(structureType: string): number {
  const s = STRUCTURE_CATALOG.find((x) => x.id === structureType);
  if (!s) return 50;
  const cat = s.category;
  if (cat === "beds") return 120 * Math.max(1, s.defaultWidth * s.defaultDepth / 4);
  if (cat === "buildings") return 400;
  if (cat === "water") return 80;
  if (cat === "composting") return 60;
  if (cat === "irrigation") return 45;
  if (cat === "animals") return 350;
  return 40;
}

export function estimatePlantCost(catalogId: string | null | undefined, label: string): number {
  const cat = catalogId ? getPlantById(catalogId) : null;
  if (cat?.category === "pepper") return 5;
  if (cat?.category === "tropical_fruit") return 35;
  if (cat?.category === "citrus") return 28;
  if (cat?.category === "herb") return 3;
  if (cat?.category === "vegetable") return 4;
  if (cat?.modelType === "large_tree") return 45;
  if (cat?.modelType === "small_tree") return 25;
  if (label.toLowerCase().includes("reaper")) return 5;
  return 8;
}
