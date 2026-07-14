import type { IngredientId } from "./constants";
import { INGREDIENT_BY_ID } from "./constants";

export interface BatchCounts {
  heat: number;
  sweet: number;
  acid: number;
  savory: number;
  total: number;
}

export interface MeterSnapshot {
  heatShu: number;
  sweetAcidScore: number;
  harmonyScore: number;
  isScorched: boolean;
}

export type HarmonyGrade = "C" | "B" | "A" | "S";

/**
 * FLAVOR HARMONY — golden-ratio band targets (φ ≈ 1.618).
 *
 * Ingredients bucket into four roles (see constants.ts):
 *   heat   = chili variants
 *   sweet  = mango
 *   acid   = lime + tomato
 *   savory = onion + garlic
 *
 * Ideal portion shares derived from normalized φ-powers:
 *   heat   = 1/φ² ≈ 0.382
 *   sweet  = 1/φ³ ≈ 0.236
 *   acid   = 1/φ³ ≈ 0.236
 *   savory = 1 − sum ≈ 0.146
 *
 * harmonyBase = 100 × (1 − mean(|actualᵢ − idealᵢ|) / 0.5)
 * varietyBonus = min(40, 5 × distinct ingredient types)
 * harmonyScore = clamp(0, 100, harmonyBase + varietyBonus)
 *
 * Multiplier applied at bottle: 0.5 + (harmonyScore/100) × 2.5  → 0.5×–3×
 */
const PHI = 1.6180339887;
const IDEAL = {
  heat: 1 / (PHI * PHI),
  sweet: 1 / (PHI * PHI * PHI),
  acid: 1 / (PHI * PHI * PHI),
  savory: 1 - 2 / (PHI * PHI * PHI) - 1 / (PHI * PHI),
};

export function countRoles(
  mix: { id: IngredientId; count: number }[],
): BatchCounts {
  let heat = 0;
  let sweet = 0;
  let acid = 0;
  let savory = 0;
  for (const { id, count } of mix) {
    const role = INGREDIENT_BY_ID[id].role;
    switch (role) {
      case "heat":
        heat += count;
        break;
      case "sweet":
        sweet += count;
        break;
      case "acid":
        acid += count;
        break;
      case "savory":
        savory += count;
        break;
    }
  }
  return { heat, sweet, acid, savory, total: heat + sweet + acid + savory };
}

export function computeHarmonyScore(
  mix: { id: IngredientId; count: number }[],
): number {
  const c = countRoles(mix);
  if (c.total === 0) return 0;

  const actual = {
    heat: c.heat / c.total,
    sweet: c.sweet / c.total,
    acid: c.acid / c.total,
    savory: c.savory / c.total,
  };

  const deviations = [
    Math.abs(actual.heat - IDEAL.heat),
    Math.abs(actual.sweet - IDEAL.sweet),
    Math.abs(actual.acid - IDEAL.acid),
    Math.abs(actual.savory - IDEAL.savory),
  ];
  const meanDev =
    deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const harmonyBase = Math.max(0, 1 - meanDev / 0.5) * 100;

  const distinct = mix.filter((m) => m.count > 0).length;
  const varietyBonus = Math.min(40, distinct * 5);

  return Math.min(100, Math.round(harmonyBase + varietyBonus));
}

/** SWEET/ACID balance: mango vs lime+tomato, ideal 50/50 split. */
export function computeSweetAcidScore(
  mix: { id: IngredientId; count: number }[],
): number {
  const c = countRoles(mix);
  const saTotal = c.sweet + c.acid;
  if (saTotal === 0) return 50;
  const sweetRatio = c.sweet / saTotal;
  return Math.round(Math.max(0, (1 - Math.abs(sweetRatio - 0.5) * 2) * 100));
}

export function computeHeatShu(
  mix: { id: IngredientId; count: number }[],
): number {
  let total = 0;
  for (const { id, count } of mix) {
    total += INGREDIENT_BY_ID[id].shu * count;
  }
  return total;
}

export function isScorchedBatch(
  mix: { id: IngredientId; count: number }[],
): boolean {
  const c = countRoles(mix);
  if (c.total === 0) return false;
  const heatShu = computeHeatShu(mix);
  if (heatShu < 50_000) return false;
  const coolingPortions = c.sweet + c.acid;
  return coolingPortions / c.total < 0.15;
}

export function harmonyMultiplier(harmonyScore: number): number {
  return 0.5 + (harmonyScore / 100) * 2.5;
}

export function harmonyGrade(score: number): HarmonyGrade {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 50) return "B";
  return "C";
}

export function computeMeters(
  mix: { id: IngredientId; count: number }[],
): MeterSnapshot {
  return {
    heatShu: computeHeatShu(mix),
    sweetAcidScore: computeSweetAcidScore(mix),
    harmonyScore: computeHarmonyScore(mix),
    isScorched: isScorchedBatch(mix),
  };
}

export function isLegendaryBatch(meters: MeterSnapshot): boolean {
  return (
    meters.harmonyScore >= 85 &&
    meters.sweetAcidScore >= 75 &&
    !meters.isScorched &&
    meters.heatShu >= 10_000
  );
}
