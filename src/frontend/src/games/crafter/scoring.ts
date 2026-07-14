import type { IngredientId } from "./constants";
import { INGREDIENT_BY_ID } from "./constants";
import {
  computeMeters,
  harmonyGrade,
  harmonyMultiplier,
  isLegendaryBatch,
  type HarmonyGrade,
  type MeterSnapshot,
} from "./harmony";
import { getDailyChallenge, dailyChallengeBonus } from "./dailyChallenge";
import {
  TRUE_SMALL_BATCH_BONUS,
  homegrownQualityMult,
  isTrueSmallBatch,
  type SlicedIngredient,
} from "../shared/ingredient-types";
import { pantryToCrafterId } from "../shared/ingredient-types";

export interface BatchMixEntry {
  id: IngredientId;
  count: number;
  /** Soft-bridge: per-unit pantry contributions (Homegrown). */
  pantryUnits?: PantryUnit[];
}

export interface PantryUnit {
  slicedId: string;
  varietyName: string;
  shu: number;
  careQuality: number;
  sliceQuality: number;
  qualityMult: number;
  effectiveShu: number;
}

export interface BatchResult {
  mix: BatchMixEntry[];
  meters: MeterSnapshot;
  baseShu: number;
  harmonyMult: number;
  dailyBonus: number;
  finalScore: number;
  grade: HarmonyGrade;
  legendary: boolean;
  scorched: boolean;
  trueSmallBatch: boolean;
  pantryShare: number;
}

export function mixToEntries(
  counts: Partial<Record<IngredientId, number>>,
): BatchMixEntry[] {
  return (Object.entries(counts) as [IngredientId, number][])
    .filter(([, n]) => n > 0)
    .map(([id, count]) => ({ id, count }));
}

/**
 * Build mix from generic tray counts + consumed pantry units.
 * Homegrown qualityMult = 1.0 + (care/100)×slice×0.5 → always ≥ generic (1.0), max 1.5.
 */
export function buildMixWithPantry(
  genericCounts: Partial<Record<IngredientId, number>>,
  pantryUsed: SlicedIngredient[],
): BatchMixEntry[] {
  const byId = new Map<IngredientId, BatchMixEntry>();

  for (const [id, count] of Object.entries(genericCounts) as [
    IngredientId,
    number,
  ][]) {
    if (count > 0) byId.set(id, { id, count, pantryUnits: [] });
  }

  for (const s of pantryUsed) {
    const id = pantryToCrafterId(s.variety, s.podColor);
    const qm = homegrownQualityMult(s.careQuality, s.sliceQuality);
    const unit: PantryUnit = {
      slicedId: s.id,
      varietyName: s.varietyName,
      shu: s.shu,
      careQuality: s.careQuality,
      sliceQuality: s.sliceQuality,
      qualityMult: qm,
      effectiveShu: Math.round(s.shu * qm),
    };
    const existing = byId.get(id);
    if (existing) {
      existing.count += 1;
      existing.pantryUnits = [...(existing.pantryUnits ?? []), unit];
    } else {
      byId.set(id, { id, count: 1, pantryUnits: [unit] });
    }
  }

  return [...byId.values()];
}

export function blendSauceColor(
  mix: BatchMixEntry[],
): [number, number, number] {
  let r = 0.12;
  let g = 0.04;
  let b = 0.06;
  let w = 0;
  for (const { id, count } of mix) {
    const [cr, cg, cb] = INGREDIENT_BY_ID[id].color;
    const weight = count * (id === "onion" || id === "garlic" ? 0.35 : 1);
    r += cr * weight;
    g += cg * weight;
    b += cb * weight;
    w += weight;
  }
  if (w <= 0) return [0.15, 0.05, 0.06];
  return [
    Math.min(1, r / w),
    Math.min(1, g / w),
    Math.min(1, b / w),
  ];
}

/** Heat SHU with pantry effectiveShu replacing generic for those units. */
export function computeHeatShuWithPantry(mix: BatchMixEntry[]): number {
  let total = 0;
  for (const entry of mix) {
    const pantry = entry.pantryUnits ?? [];
    const pantryCount = pantry.length;
    const genericCount = Math.max(0, entry.count - pantryCount);
    total += INGREDIENT_BY_ID[entry.id].shu * genericCount;
    for (const u of pantry) total += u.effectiveShu;
  }
  return total;
}

export function scoreBatch(
  mix: BatchMixEntry[],
  date = new Date(),
): BatchResult {
  const meters = {
    ...computeMeters(mix),
    heatShu: computeHeatShuWithPantry(mix),
  };
  const baseShu = meters.heatShu;
  const harmonyMult = harmonyMultiplier(meters.harmonyScore);
  let finalScore = Math.floor(baseShu * harmonyMult);

  const balanceBonus =
    meters.sweetAcidScore >= 80 ? Math.floor(baseShu * 0.08) : 0;
  finalScore += balanceBonus;

  const challenge = getDailyChallenge(date);
  const dailyBonus = dailyChallengeBonus(mix, meters, challenge);
  finalScore = Math.floor(finalScore * dailyBonus);

  if (meters.isScorched) {
    finalScore = Math.floor(finalScore * 0.35);
  }

  const totalUnits = mix.reduce((s, m) => s + m.count, 0);
  const pantryUnits = mix.reduce(
    (s, m) => s + (m.pantryUnits?.length ?? 0),
    0,
  );
  const pantryShare = totalUnits > 0 ? pantryUnits / totalUnits : 0;
  const trueSmallBatch = isTrueSmallBatch(pantryUnits, totalUnits);
  if (trueSmallBatch) {
    finalScore = Math.floor(finalScore * TRUE_SMALL_BATCH_BONUS);
  }

  const grade = harmonyGrade(meters.harmonyScore);
  const legendary = isLegendaryBatch(meters);

  return {
    mix,
    meters,
    baseShu,
    harmonyMult,
    dailyBonus,
    finalScore: Math.min(finalScore, 5_000_000),
    grade,
    legendary,
    scorched: meters.isScorched,
    trueSmallBatch,
    pantryShare,
  };
}
