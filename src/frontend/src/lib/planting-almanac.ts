export interface PlantingRecommendation {
  name: string;
  action: "Start Indoors" | "Direct Sow" | "Transplant Outdoors" | "Harvest";
  emoji: string;
  notes: string;
}

export type SupportedZone = "9b" | "10a" | "10b";

/** Zone 10a (Port Charlotte FL) — UF/IFAS-style monthly guide. */
const ZONE_10A_CALENDAR: Record<number, PlantingRecommendation[]> = {
  1: [
    { name: "Peppers", action: "Start Indoors", emoji: "🌶️", notes: "Start seeds indoors for spring transplant" },
    { name: "Tomatoes", action: "Transplant Outdoors", emoji: "🍅", notes: "Cool-season transplant window" },
    { name: "Lettuce", action: "Direct Sow", emoji: "🥬", notes: "Cool weather crop, direct sow" },
    { name: "Herbs", action: "Start Indoors", emoji: "🌿", notes: "Basil, cilantro, parsley" },
  ],
  2: [
    { name: "Peppers", action: "Start Indoors", emoji: "🌶️", notes: "Last chance to start for spring" },
    { name: "Tomatoes", action: "Transplant Outdoors", emoji: "🍅", notes: "Prime transplant window" },
    { name: "Squash", action: "Direct Sow", emoji: "🎃", notes: "Start squash and cucumber" },
    { name: "Beans", action: "Direct Sow", emoji: "🫘", notes: "Bush beans direct sow" },
  ],
  3: [
    { name: "Peppers", action: "Transplant Outdoors", emoji: "🌶️", notes: "Transplant seedlings after last frost" },
    { name: "Eggplant", action: "Transplant Outdoors", emoji: "🍆", notes: "Warm season begins" },
    { name: "Sweet Potato", action: "Direct Sow", emoji: "🍠", notes: "Plant slips" },
    { name: "Watermelon", action: "Direct Sow", emoji: "🍉", notes: "Direct sow after frost risk passes" },
  ],
  4: [
    { name: "Peppers", action: "Transplant Outdoors", emoji: "🌶️", notes: "Full sun, warm soil" },
    { name: "Okra", action: "Direct Sow", emoji: "🌱", notes: "Loves FL heat" },
    { name: "Southern Peas", action: "Direct Sow", emoji: "🫛", notes: "Black-eyed peas, cowpeas" },
    { name: "Malabar Spinach", action: "Direct Sow", emoji: "🥬", notes: "Heat-tolerant green" },
  ],
  5: [
    { name: "Peppers", action: "Harvest", emoji: "🌶️", notes: "Early varieties producing" },
    { name: "Sweet Potato", action: "Direct Sow", emoji: "🍠", notes: "Still time for slips" },
    { name: "Seminole Pumpkin", action: "Direct Sow", emoji: "🎃", notes: "FL native, heat tolerant" },
    { name: "Katuk", action: "Transplant Outdoors", emoji: "🌿", notes: "Tropical perennial" },
  ],
  6: [
    { name: "Peppers", action: "Harvest", emoji: "🌶️", notes: "Peak harvest season" },
    { name: "Cherry Tomatoes", action: "Start Indoors", emoji: "🍅", notes: "Heat-set varieties for fall" },
    { name: "Moringa", action: "Direct Sow", emoji: "🌳", notes: "Superfood tree, loves FL summers" },
    { name: "Lemongrass", action: "Transplant Outdoors", emoji: "🌿", notes: "Divide and plant" },
  ],
  7: [
    { name: "Peppers", action: "Harvest", emoji: "🌶️", notes: "Continuous harvest" },
    { name: "Cherry Tomatoes", action: "Transplant Outdoors", emoji: "🍅", notes: "Heat-tolerant varieties" },
    { name: "Calabaza", action: "Direct Sow", emoji: "🎃", notes: "Tropical squash" },
    { name: "Turmeric", action: "Direct Sow", emoji: "🌿", notes: "Plant rhizomes" },
  ],
  8: [
    { name: "Peppers", action: "Start Indoors", emoji: "🌶️", notes: "Start fall/winter crop indoors" },
    { name: "Tomatoes", action: "Start Indoors", emoji: "🍅", notes: "Start seeds for fall transplant" },
    { name: "Bush Beans", action: "Direct Sow", emoji: "🫘", notes: "Quick 60-day crop" },
    { name: "Collards", action: "Start Indoors", emoji: "🥬", notes: "Fall cool-season prep" },
  ],
  9: [
    { name: "Peppers", action: "Transplant Outdoors", emoji: "🌶️", notes: "Fall crop transplant" },
    { name: "Tomatoes", action: "Transplant Outdoors", emoji: "🍅", notes: "Fall transplant window opens" },
    { name: "Broccoli", action: "Start Indoors", emoji: "🥦", notes: "Cool-season crop" },
    { name: "Lettuce", action: "Direct Sow", emoji: "🥬", notes: "Temps starting to cool" },
  ],
  10: [
    { name: "Peppers", action: "Harvest", emoji: "🌶️", notes: "Fall harvest begins" },
    { name: "Strawberries", action: "Transplant Outdoors", emoji: "🍓", notes: "FL strawberry season" },
    { name: "Kale", action: "Direct Sow", emoji: "🥬", notes: "Cool weather green" },
    { name: "Carrots", action: "Direct Sow", emoji: "🥕", notes: "Fall/winter crop" },
  ],
  11: [
    { name: "Peppers", action: "Harvest", emoji: "🌶️", notes: "Late season pods" },
    { name: "Peas", action: "Direct Sow", emoji: "🫛", notes: "Snow peas, sugar snap" },
    { name: "Onions", action: "Direct Sow", emoji: "🧅", notes: "Short-day varieties for FL" },
    { name: "Radishes", action: "Direct Sow", emoji: "🌱", notes: "Quick 30-day crop" },
  ],
  12: [
    { name: "Peppers", action: "Start Indoors", emoji: "🌶️", notes: "Start superhots early" },
    { name: "Tomatoes", action: "Start Indoors", emoji: "🍅", notes: "Get a head start on spring" },
    { name: "Herbs", action: "Start Indoors", emoji: "🌿", notes: "Dill, cilantro, parsley" },
    { name: "Beets", action: "Direct Sow", emoji: "🫒", notes: "Cool-season root crop" },
  ],
};

const ZONE_OVERLAY: Record<SupportedZone, string> = {
  "9b": "(9b cooler) ",
  "10a": "",
  "10b": "(10b hottest) ",
};

export const ZONE_LABELS: Record<SupportedZone, string> = {
  "9b": "Zone 9b — Central FL",
  "10a": "Zone 10a — Port Charlotte, FL",
  "10b": "Zone 10b — South FL",
};

export const SUPPORTED_ZONES: SupportedZone[] = ["9b", "10a", "10b"];

export const PLANTING_ZONE_LABEL = ZONE_LABELS["10a"];

export function normalizeZone(zone: string): SupportedZone {
  const z = zone.trim().toLowerCase();
  if (z === "9b" || z === "10a" || z === "10b") return z;
  return "10a";
}

export function getPlantingRecommendations(
  month?: number,
  zone: SupportedZone = "10a",
): PlantingRecommendation[] {
  const m = month ?? new Date().getMonth() + 1;
  const base = ZONE_10A_CALENDAR[m] ?? [];
  const overlay = ZONE_OVERLAY[zone];
  if (!overlay) return base;
  return base.map((row) => ({
    ...row,
    notes: `${overlay}${row.notes}`,
  }));
}
