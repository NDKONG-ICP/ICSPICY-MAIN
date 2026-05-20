import { ProductCategory } from "../backend";

/** Categories shown on the Plants tab via NIMS — excluded from Products catalog. */
export const PLANT_SHOP_CATEGORIES = new Set<string>([
  ProductCategory.LivePlant,
  ProductCategory.Seedling,
  ProductCategory.Gallon1,
  ProductCategory.Gallon5,
]);

export function isCatalogProduct(category: string): boolean {
  return !PLANT_SHOP_CATEGORIES.has(category);
}

export const CATALOG_CATEGORY_TABS: Array<{
  label: string;
  emoji: string;
  value: ProductCategory | null;
}> = [
  { label: "All", emoji: "🌶️", value: null },
  { label: "Dried Pods", emoji: "🫑", value: ProductCategory.DriedPods },
  { label: "Fresh Pods (lb)", emoji: "🌶️", value: ProductCategory.FreshPodsByLb },
  { label: "Fresh Pods (box)", emoji: "📦", value: ProductCategory.FreshPodsFlatRate },
  { label: "Spices", emoji: "🧂", value: ProductCategory.Spice },
  { label: "Amendments", emoji: "🌿", value: ProductCategory.GardenAmendment },
  { label: "Garden Inputs", emoji: "🪴", value: ProductCategory.GardenInputs },
];

export const CATEGORY_DISPLAY: Record<string, { label: string; color: string }> = {
  [ProductCategory.Spice]: {
    label: "Spice",
    color: "bg-amber-950/60 text-amber-300 border-amber-700/40",
  },
  [ProductCategory.GardenInputs]: {
    label: "Garden Input",
    color: "bg-green-950/60 text-green-400 border-green-700/40",
  },
  [ProductCategory.GardenAmendment]: {
    label: "Amendment",
    color: "bg-lime-950/60 text-lime-300 border-lime-700/40",
  },
  [ProductCategory.DriedPods]: {
    label: "Dried Pods",
    color: "bg-orange-950/60 text-orange-400 border-orange-700/40",
  },
  [ProductCategory.FreshPodsByLb]: {
    label: "Fresh Pods / lb",
    color: "bg-red-950/60 text-red-400 border-red-700/40",
  },
  [ProductCategory.FreshPodsFlatRate]: {
    label: "Fresh Pods Box",
    color: "bg-rose-950/60 text-rose-300 border-rose-700/40",
  },
  [ProductCategory.LivePlant]: {
    label: "Live Plant",
    color: "bg-emerald-950/60 text-emerald-400 border-emerald-700/40",
  },
};
