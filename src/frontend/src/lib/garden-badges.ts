import type { GardenDesign } from "./garden-types";
import { getPlantById, PLANT_CATALOG } from "./garden-plant-catalog";

export type BadgeId =
  | "first_seed"
  | "tree_hugger"
  | "spice_lord"
  | "pollinator"
  | "homesteader"
  | "water_wise"
  | "native_champion"
  | "master_designer"
  | "ai_architect"
  | "garden_walker"
  | "shutterbug"
  | "composter"
  | "food_forest_master"
  | "on_fire";

export type Badge = {
  id: BadgeId;
  emoji: string;
  title: string;
  description: string;
};

export const BADGES: Badge[] = [
  { id: "first_seed", emoji: "🌱", title: "First Seed", description: "Place your first plant" },
  { id: "tree_hugger", emoji: "🌳", title: "Tree Hugger", description: "Place 10 trees" },
  { id: "spice_lord", emoji: "🌶️", title: "Spice Lord", description: "Place 10+ pepper varieties" },
  { id: "pollinator", emoji: "🦋", title: "Pollinator Paradise", description: "10+ pollinator plants" },
  { id: "homesteader", emoji: "🐔", title: "Homesteader", description: "Coop + beds + fruit trees" },
  { id: "water_wise", emoji: "🌊", title: "Water Wise", description: "Rain barrels + swales + drip" },
  { id: "native_champion", emoji: "🍃", title: "Native Champion", description: "80%+ Florida natives" },
  { id: "master_designer", emoji: "🧑‍🌾", title: "Master Designer", description: "Save 10 designs" },
  { id: "ai_architect", emoji: "🤖", title: "AI Architect", description: "Generate a layout with AI" },
  { id: "garden_walker", emoji: "🚶", title: "Garden Walker", description: "Walk through in first-person" },
  { id: "shutterbug", emoji: "📸", title: "Shutterbug", description: "Export 5 screenshots" },
  { id: "composter", emoji: "♻️", title: "Composter", description: "Add compost infrastructure" },
  { id: "food_forest_master", emoji: "🏆", title: "Food Forest Master", description: "50+ edible plants" },
  { id: "on_fire", emoji: "🔥", title: "On Fire", description: "20+ pepper varieties" },
];

const STORAGE_KEY = "garden-badges-earned";
const STATS_KEY = "garden-badge-stats";

export type BadgeStats = {
  savedDesigns: number;
  screenshots: number;
  aiUsed: boolean;
  walked: boolean;
};

export function loadEarnedBadges(): Set<BadgeId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as BadgeId[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

export function saveEarnedBadges(ids: Set<BadgeId>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function loadBadgeStats(): BadgeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw) as BadgeStats;
  } catch {
    /* ignore */
  }
  return { savedDesigns: 0, screenshots: 0, aiUsed: false, walked: false };
}

export function saveBadgeStats(stats: BadgeStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function countTrees(design: GardenDesign): number {
  return design.plants.filter((p) => {
    const c = p.catalogId ? getPlantById(p.catalogId) : null;
    return c?.modelType === "large_tree" || c?.modelType === "small_tree" || c?.modelType === "palm";
  }).length;
}

function countPepperVarieties(design: GardenDesign): number {
  return new Set(
    design.plants
      .filter((p) => {
        const c = p.catalogId ? getPlantById(p.catalogId) : null;
        return c?.category === "pepper" || p.icon === "🌶️";
      })
      .map((p) => p.catalogId ?? p.label),
  ).size;
}

export function evaluateBadges(
  design: GardenDesign,
  stats: BadgeStats,
): BadgeId[] {
  const earned: BadgeId[] = [];
  if (design.plants.length >= 1) earned.push("first_seed");
  if (countTrees(design) >= 10) earned.push("tree_hugger");
  if (countPepperVarieties(design) >= 10) earned.push("spice_lord");
  if (countPepperVarieties(design) >= 20) earned.push("on_fire");

  const pollinators = design.plants.filter((p) => getPlantById(p.catalogId ?? "")?.category === "pollinator").length;
  if (pollinators >= 10) earned.push("pollinator");

  const hasCoop = design.structures.some((s) => s.structureType.includes("chicken"));
  const hasBeds = design.structures.some((s) => s.structureType.includes("bed"));
  const hasFruit = design.plants.some((p) => getPlantById(p.catalogId ?? "")?.category === "tropical_fruit");
  if (hasCoop && hasBeds && hasFruit) earned.push("homesteader");

  const water = design.structures.some((s) =>
    /rain|barrel|swale|drip|irrigation|pond/.test(s.structureType),
  );
  if (water) earned.push("water_wise");

  const edible = design.plants.filter((p) => getPlantById(p.catalogId ?? "")?.edible !== false).length;
  if (edible >= 50) earned.push("food_forest_master");

  const natives = design.plants.filter((p) => getPlantById(p.catalogId ?? "")?.nativeFlorida).length;
  if (design.plants.length > 0 && natives / design.plants.length >= 0.8) earned.push("native_champion");

  if (design.structures.some((s) => s.structureType.includes("compost"))) earned.push("composter");

  if (stats.savedDesigns >= 10) earned.push("master_designer");
  if (stats.aiUsed) earned.push("ai_architect");
  if (stats.walked) earned.push("garden_walker");
  if (stats.screenshots >= 5) earned.push("shutterbug");

  return earned;
}

export function checkNewBadges(
  design: GardenDesign,
  stats: BadgeStats,
  previously: Set<BadgeId>,
): Badge[] {
  const ids = evaluateBadges(design, stats);
  return BADGES.filter((b) => ids.includes(b.id) && !previously.has(b.id));
}
