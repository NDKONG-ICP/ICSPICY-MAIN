import floridaPlants from "../data/florida-plants.json";
import gardenStructures from "../data/garden-structures.json";

export type PlantCategory =
  | "pepper"
  | "tropical_fruit"
  | "citrus"
  | "berry"
  | "herb"
  | "vegetable"
  | "leafy_green"
  | "root_crop"
  | "vine"
  | "native_tree"
  | "native_shrub"
  | "native_ground"
  | "palm"
  | "nitrogen_fixer"
  | "pollinator"
  | "cover_crop"
  | "ornamental";

export type ModelType =
  | "pepper"
  | "herb"
  | "shrub"
  | "small_tree"
  | "large_tree"
  | "vine"
  | "groundcover"
  | "grass"
  | "palm"
  | "succulent";

export type PepperProfile = "upright" | "bushy" | "superhot" | "sweet";

export type CatalogPlant = {
  id: string;
  name: string;
  latinName: string;
  category: PlantCategory;
  subcategory: string;
  usdaZones: string[];
  sunRequirement: "full" | "partial" | "shade";
  waterNeed: "low" | "medium" | "high";
  matureHeight: number;
  matureWidth: number;
  spacing: number;
  daysToHarvest: number | null;
  perennial: boolean;
  nativeFlorida: boolean;
  edible: boolean;
  modelType: ModelType;
  color: string;
  fruitColor: string | null;
  iconEmoji: string;
  companions: string[];
  antagonists: string[];
  description: string;
  funFact: string;
  scovilleMax?: number;
  profile?: PepperProfile;
};

export type StructureCategory =
  | "beds"
  | "irrigation"
  | "paths"
  | "fencing"
  | "buildings"
  | "composting"
  | "water"
  | "support"
  | "cover"
  | "animals"
  | "decor";

export type CatalogStructure = {
  id: string;
  name: string;
  category: StructureCategory;
  description: string;
  defaultWidth: number;
  defaultDepth: number;
  resizable: boolean;
  color: string;
  iconEmoji: string;
};

export type GardenEnvironment = {
  usdaZone: "9b" | "10a" | "10b" | "11a";
  soilType: "sandy" | "clay" | "loam" | "muck";
  sunExposure: "full" | "partial" | "shade" | "mixed";
  gardenStyle:
    | "food_forest"
    | "permaculture"
    | "traditional_row"
    | "container"
    | "raised_bed"
    | "native";
};

export const PLANT_CATALOG = floridaPlants as CatalogPlant[];
export const STRUCTURE_CATALOG = gardenStructures as CatalogStructure[];

const plantById = new Map(PLANT_CATALOG.map((p) => [p.id, p]));
const structureById = new Map(STRUCTURE_CATALOG.map((s) => [s.id, s]));

export function getPlantById(id: string): CatalogPlant | undefined {
  return plantById.get(id);
}

export function getStructureById(id: string): CatalogStructure | undefined {
  return structureById.get(id);
}

export function filterPlants(opts: {
  query?: string;
  category?: PlantCategory | "all";
  sun?: "full" | "partial" | "shade" | "all";
  nativeOnly?: boolean;
  edibleOnly?: boolean;
  zone?: string;
}): CatalogPlant[] {
  const q = opts.query?.trim().toLowerCase() ?? "";
  return PLANT_CATALOG.filter((p) => {
    if (
      opts.category &&
      opts.category !== "all" &&
      p.category !== opts.category
    )
      return false;
    if (opts.sun && opts.sun !== "all" && p.sunRequirement !== opts.sun)
      return false;
    if (opts.nativeOnly && !p.nativeFlorida) return false;
    if (opts.edibleOnly && !p.edible) return false;
    if (opts.zone && !p.usdaZones.includes(opts.zone)) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.latinName.toLowerCase().includes(q) ||
      p.subcategory.toLowerCase().includes(q) ||
      p.category.includes(q)
    );
  });
}

export function filterStructures(opts: {
  query?: string;
  category?: StructureCategory | "all";
}): CatalogStructure[] {
  const q = opts.query?.trim().toLowerCase() ?? "";
  return STRUCTURE_CATALOG.filter((s) => {
    if (
      opts.category &&
      opts.category !== "all" &&
      s.category !== opts.category
    )
      return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.category.includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  });
}

export const CATEGORY_LABELS: Record<PlantCategory, string> = {
  pepper: "IC SPICY Peppers",
  tropical_fruit: "Tropical Fruit",
  citrus: "Citrus",
  berry: "Berries",
  herb: "Herbs",
  vegetable: "Vegetables",
  leafy_green: "Leafy Greens",
  root_crop: "Root Crops",
  vine: "Vines",
  native_tree: "Native Trees",
  native_shrub: "Native Shrubs",
  native_ground: "Native Groundcover",
  palm: "Palms",
  nitrogen_fixer: "Nitrogen Fixers",
  pollinator: "Pollinators",
  cover_crop: "Cover Crops",
  ornamental: "Ornamentals",
};

export const STRUCTURE_CATEGORY_LABELS: Record<StructureCategory, string> = {
  beds: "Beds & Growing",
  irrigation: "Irrigation",
  paths: "Paths",
  fencing: "Fencing",
  buildings: "Buildings",
  composting: "Composting",
  water: "Water Features",
  support: "Support",
  cover: "Shade & Cover",
  animals: "Animal Housing",
  decor: "Decor",
};

export const DEFAULT_ENVIRONMENT: GardenEnvironment = {
  usdaZone: "10a",
  soilType: "sandy",
  sunExposure: "full",
  gardenStyle: "food_forest",
};

const ENV_KEY = "garden-environment";

export function loadEnvironment(): GardenEnvironment {
  try {
    const raw = localStorage.getItem(ENV_KEY);
    if (raw) return { ...DEFAULT_ENVIRONMENT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_ENVIRONMENT;
}

export function saveEnvironment(env: GardenEnvironment) {
  localStorage.setItem(ENV_KEY, JSON.stringify(env));
}
