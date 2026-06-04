import type { PlantCategory, StructureCategory } from "./garden-plant-catalog";
import {
  CATEGORY_LABELS,
  STRUCTURE_CATEGORY_LABELS,
} from "./garden-plant-catalog";

export const PLANT_CATEGORY_ORDER: { id: PlantCategory; emoji: string }[] = [
  { id: "pepper", emoji: "🌶️" },
  { id: "tropical_fruit", emoji: "🌳" },
  { id: "citrus", emoji: "🍋" },
  { id: "berry", emoji: "🫐" },
  { id: "herb", emoji: "🌿" },
  { id: "vegetable", emoji: "🥬" },
  { id: "leafy_green", emoji: "🥗" },
  { id: "root_crop", emoji: "🥕" },
  { id: "palm", emoji: "🌴" },
  { id: "native_tree", emoji: "🌻" },
  { id: "native_shrub", emoji: "🌿" },
  { id: "native_ground", emoji: "🌱" },
  { id: "pollinator", emoji: "🦋" },
  { id: "nitrogen_fixer", emoji: "🌱" },
  { id: "vine", emoji: "🌿" },
  { id: "cover_crop", emoji: "🌾" },
  { id: "ornamental", emoji: "🏵️" },
];

export const STRUCTURE_CATEGORY_ORDER: {
  id: StructureCategory;
  emoji: string;
}[] = [
  { id: "beds", emoji: "🏗️" },
  { id: "irrigation", emoji: "💧" },
  { id: "composting", emoji: "♻️" },
  { id: "buildings", emoji: "🏠" },
  { id: "animals", emoji: "🐔" },
  { id: "support", emoji: "🪜" },
  { id: "cover", emoji: "☂️" },
  { id: "paths", emoji: "🛤️" },
  { id: "fencing", emoji: "🏰" },
  { id: "water", emoji: "💦" },
  { id: "decor", emoji: "🪑" },
];

export function plantCategoryLabel(id: PlantCategory): string {
  return CATEGORY_LABELS[id] ?? id;
}

export function structureCategoryLabel(id: StructureCategory): string {
  return STRUCTURE_CATEGORY_LABELS[id] ?? id;
}
