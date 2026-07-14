import type { IngredientId } from "./constants";
import { INGREDIENT_BY_ID } from "./constants";
import type { BatchMixEntry } from "./scoring";
import type { MeterSnapshot } from "./harmony";

export interface DailyChallenge {
  dateKey: string;
  title: string;
  targetShuMin: number;
  targetShuMax: number;
  requiredIngredient: IngredientId;
  bonusMultiplier: number;
  description: string;
}

function hashDate(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const CHALLENGE_POOL: IngredientId[] = [
  "mango",
  "lime",
  "chili",
  "scotch_bonnet",
  "tomato",
  "garlic",
];

export function getDailyChallenge(date = new Date()): DailyChallenge {
  const dateKey = date.toISOString().slice(0, 10);
  const h = hashDate(dateKey);
  const required = CHALLENGE_POOL[h % CHALLENGE_POOL.length]!;
  const ing = INGREDIENT_BY_ID[required];
  const tier = h % 4;
  const ranges = [
    [5_000, 25_000],
    [25_000, 100_000],
    [100_000, 500_000],
    [500_000, 2_000_000],
  ] as const;
  const [min, max] = ranges[tier]!;
  const bonus = 1.1 + (h % 5) * 0.05;

  return {
    dateKey,
    title: "Today's Perfect Heat",
    targetShuMin: min,
    targetShuMax: max,
    requiredIngredient: required,
    bonusMultiplier: bonus,
    description: `Include ${ing.label} and land ${min.toLocaleString()}–${max.toLocaleString()} SHU for a ${Math.round((bonus - 1) * 100)}% score bonus.`,
  };
}

export function dailyChallengeBonus(
  mix: BatchMixEntry[],
  meters: MeterSnapshot,
  challenge: DailyChallenge,
): number {
  const hasRequired = mix.some(
    (m) => m.id === challenge.requiredIngredient && m.count > 0,
  );
  if (!hasRequired) return 1;
  const shu = meters.heatShu;
  if (shu >= challenge.targetShuMin && shu <= challenge.targetShuMax) {
    return challenge.bonusMultiplier;
  }
  return 1;
}
