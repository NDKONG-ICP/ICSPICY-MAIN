import type { ShopProduct } from "./shop-products";
import { filterLivePlantProducts } from "./shop-products";
import type { CostLine } from "./garden-cost";
import { getPlantById } from "./garden-plant-catalog";

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchPepperProducts(
  pepperLines: CostLine[],
  products: ShopProduct[],
): { product: ShopProduct; qty: number }[] {
  const live = filterLivePlantProducts(products);
  const out: { product: ShopProduct; qty: number }[] = [];

  for (const line of pepperLines) {
    if (!line.isIcSpicyPepper) continue;
    const cat = line.catalogId ? getPlantById(line.catalogId) : null;
    const needle = normalizeName(cat?.name ?? line.label);
    const product =
      live.find((p) => normalizeName(p.name).includes(needle)) ??
      live.find((p) => normalizeName(p.variety ?? "").includes(needle)) ??
      live.find((p) => needle.split(" ").some((w) => w.length > 3 && normalizeName(p.name).includes(w)));
    if (product) out.push({ product, qty: line.qty });
  }
  return out;
}
