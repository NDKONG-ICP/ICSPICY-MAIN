import type { IngredientId } from "./constants";
import { INGREDIENT_BY_ID } from "./constants";
import type { BatchMixEntry } from "./scoring";

const ADJECTIVES = [
  "Smoky",
  "Velvet",
  "Sunset",
  "Copper",
  "Ember",
  "Tropical",
  "Reserve",
  "Artisan",
  "Small-Batch",
  "Legendary",
];

const SUFFIXES = ["Reserve", "Small Batch", "Craft Batch", "Batch"];

export function generateBatchName(
  mix: BatchMixEntry[],
  batchNo: number,
): string {
  let dominant: IngredientId = "chili";
  let max = 0;
  for (const { id, count } of mix) {
    const weight = count * (INGREDIENT_BY_ID[id].shu + 100);
    if (weight > max) {
      max = weight;
      dominant = id;
    }
  }
  const adj = ADJECTIVES[batchNo % ADJECTIVES.length]!;
  const ing = INGREDIENT_BY_ID[dominant].label;
  const suffix = SUFFIXES[batchNo % SUFFIXES.length]!;
  return `${adj} ${ing} ${suffix} No. ${batchNo}`;
}
