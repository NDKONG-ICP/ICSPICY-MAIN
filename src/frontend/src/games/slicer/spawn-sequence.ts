/**
 * Integer-only deterministic slicer spawn sequence.
 * Spec: docs/slicer-determinism.md — must match lib/slicer-spawn.mo exactly.
 */
import type { IngredientKind } from "./constants";

export const LCG_MOD = 2_147_483_648n;
export const LCG_MULT = 1_103_515_245n;
export const LCG_INC = 12_345n;
export const FRENZY_INTERVAL_MS = 45_000n;
export const VIRTUAL_SCORE_PER_SPAWN = 150n;

const SCORE_THRESHOLDS = [0n, 5_000n, 15_000n, 35_000n, 75_000n, 150_000n] as const;
const SCORE_PER_LEVEL_AFTER = 100_000n;

/** kind Nat → IngredientKind (see docs/slicer-determinism.md) */
export const KIND_FROM_NAT: readonly IngredientKind[] = [
  "lime",
  "tomato",
  "onion",
  "garlic",
  "mango",
  "chili",
  "rare_chili",
];

const KIND_WEIGHTS = [18n, 16n, 14n, 12n, 10n, 8n, 2n] as const;
const POOL_L1 = [1, 2, 0] as const;

export interface SpawnEvent {
  index: number;
  objectId: number;
  kind: number;
  spawnTimeMs: number;
  isFrenzy: boolean;
}

export function lcgNext(state: bigint): bigint {
  return (state * LCG_MULT + LCG_INC) % LCG_MOD;
}

export function powNat(base: bigint, exp: number): bigint {
  let result = 1n;
  let b = base;
  let e = BigInt(exp);
  while (e > 0n) {
    if (e % 2n === 1n) result *= b;
    b *= b;
    e /= 2n;
  }
  return result;
}

export function levelFromScore(score: bigint): number {
  let level = 1;
  for (let i = 1; i < SCORE_THRESHOLDS.length; i++) {
    if (score >= SCORE_THRESHOLDS[i]!) level = i + 1;
    else return level;
  }
  const last = SCORE_THRESHOLDS[SCORE_THRESHOLDS.length - 1]!;
  if (score >= last) {
    level =
      SCORE_THRESHOLDS.length +
      Number((score - last) / SCORE_PER_LEVEL_AFTER);
  }
  return Math.max(1, level);
}

export function spawnIntervalMs(level: number): number {
  const steps = Math.max(0, level - 1);
  const num = 1400n * powNat(9n, steps) + 5n * powNat(10n, steps);
  const den = powNat(10n, steps);
  const raw = Number(num / den);
  return Math.max(380, raw);
}

function frenzyBaseCount(level: number): number {
  const steps = Math.max(0, level - 1);
  const base = 6 + Math.floor((steps * 3) / 2);
  return Math.min(16, base);
}

function poolForLevel(level: number): number[] {
  const pool: number[] = [...POOL_L1];
  if (level >= 2) pool.push(3);
  if (level >= 3) pool.push(4);
  if (level >= 4) pool.push(5);
  if (level >= 5) pool.push(6);
  return pool;
}

function weightForKind(kind: number): bigint {
  return kind >= 0 && kind < KIND_WEIGHTS.length ? KIND_WEIGHTS[kind]! : 0n;
}

function pickWeightedKind(state: bigint, level: number): number {
  const pool = poolForLevel(level);
  let total = 0n;
  for (const k of pool) total += weightForKind(k);
  if (total === 0n) return 0;
  const roll = state % total;
  let acc = 0n;
  for (const k of pool) {
    acc += weightForKind(k);
    if (roll < acc) return k;
  }
  return pool[pool.length - 1] ?? 0;
}

/** Pure spawn schedule — same output as canister getSpawnSequence. */
export function deriveSpawnSequence(seed: bigint, count: number): SpawnEvent[] {
  if (count <= 0) return [];

  let state = seed % LCG_MOD;
  let virtualTime = 0n;
  let virtualScore = 0n;
  let objectId = 1;
  let spawnIndex = 0;
  let nextFrenzyAt = FRENZY_INTERVAL_MS + (seed % FRENZY_INTERVAL_MS);
  const events: SpawnEvent[] = [];

  while (events.length < count) {
    if (virtualTime >= nextFrenzyAt) {
      const level = levelFromScore(virtualScore);
      state = lcgNext(state);
      const extra = Number(state % 3n);
      const frenzyCount = frenzyBaseCount(level) + extra;
      for (let j = 0; j < frenzyCount && events.length < count; j++) {
        state = lcgNext(state);
        const kind = pickWeightedKind(state, level);
        events.push({
          index: spawnIndex,
          objectId,
          kind,
          spawnTimeMs: Number(virtualTime),
          isFrenzy: true,
        });
        spawnIndex += 1;
        objectId += 1;
      }
      nextFrenzyAt += FRENZY_INTERVAL_MS;
    } else {
      const level = levelFromScore(virtualScore);
      const interval = BigInt(spawnIntervalMs(level));
      state = lcgNext(state);
      const kind = pickWeightedKind(state, level);
      events.push({
        index: spawnIndex,
        objectId,
        kind,
        spawnTimeMs: Number(virtualTime),
        isFrenzy: false,
      });
      spawnIndex += 1;
      objectId += 1;
      virtualTime += interval;
      virtualScore += VIRTUAL_SCORE_PER_SPAWN;
    }
  }

  return events;
}

export function kindNatToIngredient(kind: number): IngredientKind {
  return KIND_FROM_NAT[kind] ?? "lime";
}

/** Unranked guest seed — crypto RNG, not used for leaderboard validation. */
export function guestSpawnSeed(): bigint {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  return (BigInt(buf[0]!) << 32n) | BigInt(buf[1]!);
}

/** Default pre-generated sequence length for a full arcade run. */
export const DEFAULT_SPAWN_SEQUENCE_LEN = 4_000;
