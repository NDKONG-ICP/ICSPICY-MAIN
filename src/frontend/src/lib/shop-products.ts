import { ProductCategory } from "../backend";
import type { Product } from "../types/index";
import { lineIdForProduct, toNatBigInt, toOptionalNatBigInt } from "./cart-utils";
import type { CartItem } from "../types/index";

export type ShopProduct = Product & {
  active?: boolean;
  shippable?: boolean;
  weight_based?: boolean;
  price_per_unit_cents?: bigint;
  unit_label?: string;
  nft_token_id?: bigint;
  inventory_remaining?: bigint;
  image_keys?: string[];
};

export function filterActiveShopProducts(
  products: ShopProduct[] | undefined,
): ShopProduct[] {
  return (products ?? []).filter((p) => {
    if (!(p.active ?? true)) return false;
    const remaining = p.inventory_remaining;
    if (remaining !== undefined && remaining <= 0n) return false;
    return true;
  });
}

export function filterLivePlantProducts(products: ShopProduct[]): ShopProduct[] {
  return products.filter((p) => p.category === ProductCategory.LivePlant);
}

export function filterNonPlantProducts(products: ShopProduct[]): ShopProduct[] {
  return products.filter((p) => p.category !== ProductCategory.LivePlant);
}

export function productUnitPrice(p: ShopProduct): bigint {
  if (p.weight_based && p.price_per_unit_cents !== undefined) {
    return p.price_per_unit_cents;
  }
  return p.price_cents;
}

export function maxPurchasableQuantity(product: ShopProduct): number | null {
  if (product.weight_based || product.plant_id !== undefined) return null;
  if (product.inventory_remaining === undefined) return 1;
  return Number(product.inventory_remaining);
}

export function productToCartItem(p: ShopProduct, quantity: number): CartItem {
  const productId = toNatBigInt(p.id);
  const plantId = toOptionalNatBigInt(p.plant_id);
  const maxQty = maxPurchasableQuantity(p);
  const qty =
    maxQty === null ? quantity : Math.min(quantity, Math.max(1, maxQty));
  return {
    line_id: lineIdForProduct(productId, plantId),
    product_id: productId,
    plant_id: plantId,
    name: p.name,
    variety: p.variety,
    unit_price_cents: Number(productUnitPrice(p)),
    quantity: qty,
    category: p.category as string,
    shippable: p.shippable,
    weight_based: p.weight_based,
    unit_label: p.unit_label,
    unique_listing: p.plant_id !== undefined,
    nft_token_id: p.nft_token_id,
    inventory_remaining: p.inventory_remaining,
  };
}

export function getProductImageKeys(product: ShopProduct): string[] {
  if (product.image_keys && product.image_keys.length > 0) {
    return product.image_keys;
  }
  if (product.image_key) return [product.image_key];
  return [];
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
  [ProductCategory.Seedling]: {
    label: "Seedling",
    color: "bg-emerald-950/60 text-emerald-400 border-emerald-700/40",
  },
  [ProductCategory.Gallon1]: {
    label: "1 Gallon",
    color: "bg-emerald-950/60 text-emerald-400 border-emerald-700/40",
  },
  [ProductCategory.Gallon5]: {
    label: "5 Gallon",
    color: "bg-emerald-950/60 text-emerald-400 border-emerald-700/40",
  },
};
