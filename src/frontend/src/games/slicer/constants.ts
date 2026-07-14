export type IngredientKind =
  | "lime"
  | "tomato"
  | "onion"
  | "garlic"
  | "mango"
  | "chili"
  | "rare_chili";

export const SHU_BASE: Record<IngredientKind, number> = {
  lime: 100,
  tomato: 150,
  onion: 150,
  garlic: 200,
  mango: 250,
  chili: 500,
  rare_chili: 2500,
};

export const INGREDIENT_RADIUS: Record<IngredientKind, number> = {
  lime: 22,
  tomato: 26,
  onion: 28,
  garlic: 24,
  mango: 30,
  chili: 26,
  rare_chili: 30,
};

/** Spawn weight — higher = more common */
export const SPAWN_WEIGHTS: Record<IngredientKind, number> = {
  lime: 18,
  tomato: 16,
  onion: 14,
  garlic: 12,
  mango: 10,
  chili: 8,
  rare_chili: 2,
};

export const MAX_LIVES = 3;
export const COMBO_WINDOW_MS = 900;
export const FRENZY_INTERVAL_MS = 45_000;
export const FRENZY_DURATION_MS = 2_500;
export const SWIPE_VELOCITY_MIN = 0.35; // px/ms
export const GRAVITY = 0.00055; // px/ms²
export const MAX_PARTICLES = 300;
export const MAX_OBJECTS = 24;
export const BLADE_FADE_MS = 250;

/**
 * Level-based difficulty — single tuning table.
 * Level N (N≥1): interval *= 0.9^(N-1), speed *= 1.08^(N-1), maxSim = min(24, 2+(N-1)).
 */
export const DIFFICULTY = {
  /** Score thresholds for levels 1…6; beyond L6: +100k per level. */
  scoreThresholds: [0, 5_000, 15_000, 35_000, 75_000, 150_000] as const,
  scorePerLevelAfter: 100_000,

  l1: {
    spawnIntervalMs: 1400,
    launchSpeed: 1,
    maxSimultaneous: 2,
    pool: ["tomato", "lime", "onion"] as IngredientKind[],
  },

  /** Per level above L1 */
  spawnIntervalScale: 0.9,
  launchSpeedScale: 1.08,
  maxSimultaneousPerLevel: 1,

  /** Ingredient unlocks (announced once when level first reached). */
  unlocks: [
    { level: 2, kind: "garlic" as IngredientKind, popup: "🧄 GARLIC ENTERS THE PATCH!" },
    { level: 3, kind: "mango" as IngredientKind, popup: "🥭 MANGO ENTERS THE PATCH!" },
    { level: 4, kind: "chili" as IngredientKind, popup: "🌶️ CHILIS ENTER THE PATCH!" },
    { level: 5, kind: "rare_chili" as IngredientKind, popup: "🔥 SUPERHOT ENTERS THE PATCH!" },
  ] as const,

  /** Cumulative pool by level (L1 base + unlocks ≤ level). */
  poolForLevel(level: number): IngredientKind[] {
    const pool: IngredientKind[] = [...DIFFICULTY.l1.pool];
    for (const u of DIFFICULTY.unlocks) {
      if (level >= u.level) pool.push(u.kind);
    }
    return pool;
  },

  levelFromScore(score: number): number {
    const t = DIFFICULTY.scoreThresholds;
    let level = 1;
    for (let i = 1; i < t.length; i++) {
      if (score >= t[i]!) level = i + 1;
      else break;
    }
    const last = t[t.length - 1]!;
    if (score >= last) {
      level =
        t.length +
        Math.floor((score - last) / DIFFICULTY.scorePerLevelAfter);
    }
    return Math.max(1, level);
  },

  paramsForLevel(level: number): {
    spawnIntervalMs: number;
    launchSpeed: number;
    maxSimultaneous: number;
    pool: IngredientKind[];
    frenzyBaseCount: number;
  } {
    const n = Math.max(1, level);
    const steps = n - 1;
    const spawnIntervalMs = Math.max(
      380,
      Math.round(
        DIFFICULTY.l1.spawnIntervalMs *
          Math.pow(DIFFICULTY.spawnIntervalScale, steps),
      ),
    );
    const launchSpeed =
      DIFFICULTY.l1.launchSpeed *
      Math.pow(DIFFICULTY.launchSpeedScale, steps);
    const maxSimultaneous = Math.min(
      MAX_OBJECTS,
      DIFFICULTY.l1.maxSimultaneous +
        steps * DIFFICULTY.maxSimultaneousPerLevel,
    );
    // FRENZY intensity scales with level (L1 ~6 → more later)
    const frenzyBaseCount = Math.min(16, 6 + Math.floor(steps * 1.5));
    return {
      spawnIntervalMs,
      launchSpeed,
      maxSimultaneous,
      pool: DIFFICULTY.poolForLevel(n),
      frenzyBaseCount,
    };
  },
} as const;

export function comboMultiplier(combo: number): number {
  if (combo <= 1) return 1;
  if (combo === 2) return 2;
  if (combo === 3) return 3;
  if (combo === 4) return 5;
  if (combo === 5) return 7;
  return 10;
}

export type BatchTier =
  | "Mild Batch"
  | "Craft Batch"
  | "Reserve Batch"
  | "Legendary Small Batch";

export function scoreToTier(score: number): BatchTier {
  if (score >= 100_000) return "Legendary Small Batch";
  if (score >= 50_000) return "Reserve Batch";
  if (score >= 10_000) return "Craft Batch";
  return "Mild Batch";
}

export function tierIndex(tier: BatchTier): number {
  switch (tier) {
    case "Mild Batch":
      return 0;
    case "Craft Batch":
      return 1;
    case "Reserve Batch":
      return 2;
    case "Legendary Small Batch":
      return 3;
  }
}
