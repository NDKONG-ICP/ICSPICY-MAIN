/**
 * Integer-only slicer score recompute — mirrors lib/slicer-score.mo exactly.
 */
import {
  deriveSpawnSequence,
  type SpawnEvent,
} from "./spawn-sequence.ts";

export const COMBO_WINDOW_MS = 900;

export const MAX_FLIGHT_MS = 10_000;
/** Max game-ms after last slice before game-over (3 lives × flight + stagger buffer). */
export const MAX_END_TAIL_MS = 45_000;
export const RARE_CHILI_KIND = 6;

const SHU_BASE = [100, 150, 150, 200, 250, 500, 2500] as const;

export interface SliceLogEntry {
  objectIndex: number;
  sliceTimeMs: number;
}

export interface ParsedRun {
  durationMs: number;
  livesLost: number;
  slices: SliceLogEntry[];
}

export interface ComputeOk {
  score: number;
  bestCombo: number;
  tier: string;
  rareChilisSliced: number;
}

export function comboMultiplier(combo: number): number {
  if (combo <= 1) return 1;
  if (combo === 2) return 2;
  if (combo === 3) return 3;
  if (combo === 4) return 5;
  if (combo === 5) return 7;
  return 10;
}

export function shuBase(kind: number): number {
  return kind >= 0 && kind < SHU_BASE.length ? SHU_BASE[kind]! : 0;
}

export function scoreToTier(score: number): string {
  if (score >= 100_000) return "Legendary Small Batch";
  if (score >= 50_000) return "Reserve Batch";
  if (score >= 10_000) return "Craft Batch";
  return "Mild Batch";
}

function sortSlices(slices: SliceLogEntry[]): SliceLogEntry[] {
  return [...slices].sort((a, b) => {
    if (a.sliceTimeMs !== b.sliceTimeMs) return a.sliceTimeMs - b.sliceTimeMs;
    return a.objectIndex - b.objectIndex;
  });
}

function eventAtIndex(
  events: SpawnEvent[],
  idx: number,
): SpawnEvent | undefined {
  return events.find((ev) => ev.index === idx);
}

function theoreticalMaxForSlice(kind: number, isFrenzy: boolean): number {
  return shuBase(kind) * 10 * (isFrenzy ? 2 : 1);
}

export function recomputeScore(
  events: SpawnEvent[],
  slices: SliceLogEntry[],
): { ok: ComputeOk } | { err: string } {
  if (slices.length === 0) return { err: "Empty slice log" };

  const sorted = sortSlices(slices);
  let lastSliceMs = 0;
  let combo = 0;
  let bestCombo = 0;
  let score = 0;
  let rareChilisSliced = 0;
  let theoreticalMax = 0;

  for (const entry of sorted) {
    const ev = eventAtIndex(events, entry.objectIndex);
    if (!ev) return { err: "Unknown objectIndex" };
    if (entry.sliceTimeMs < ev.spawnTimeMs) {
      return { err: "sliceTimeMs before spawnTimeMs" };
    }
    if (entry.sliceTimeMs > ev.spawnTimeMs + MAX_FLIGHT_MS) {
      return { err: "sliceTimeMs outside flight window" };
    }
    theoreticalMax += theoreticalMaxForSlice(ev.kind, ev.isFrenzy);
    if (entry.sliceTimeMs < lastSliceMs) {
      return { err: "sliceTimeMs not monotonic" };
    }
    if (entry.sliceTimeMs > lastSliceMs + COMBO_WINDOW_MS && lastSliceMs > 0) {
      combo = 0;
    }
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    const mult = comboMultiplier(combo);
    const frenzy = ev.isFrenzy ? 2 : 1;
    score += shuBase(ev.kind) * mult * frenzy;
    if (ev.kind === RARE_CHILI_KIND) rareChilisSliced += 1;
    lastSliceMs = entry.sliceTimeMs;
  }

  if (score > theoreticalMax) {
    return { err: "Score exceeds theoretical maximum for sliced objects" };
  }

  return {
    ok: {
      score,
      bestCombo,
      tier: scoreToTier(score),
      rareChilisSliced,
    },
  };
}

export function validateRun(
  seed: bigint,
  run: ParsedRun,
): { ok: ComputeOk } | { err: string } {
  if (run.slices.length === 0) return { err: "Empty slice log" };

  let maxIndex = 0;
  for (const s of run.slices) {
    if (s.objectIndex > maxIndex) maxIndex = s.objectIndex;
  }
  const events = deriveSpawnSequence(seed, maxIndex + 1);

  const seen = new Set<number>();
  for (const s of run.slices) {
    if (seen.has(s.objectIndex)) return { err: "Duplicate objectIndex" };
    seen.add(s.objectIndex);
  }

  const sorted = sortSlices(run.slices);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.sliceTimeMs < sorted[i - 1]!.sliceTimeMs) {
      return { err: "sliceTimeMs not monotonic" };
    }
  }

  const lastSlice = sorted[sorted.length - 1]!.sliceTimeMs;
  if (run.durationMs < lastSlice) {
    return { err: "durationMs shorter than last slice" };
  }
  if (run.durationMs > lastSlice + MAX_END_TAIL_MS) {
    return { err: "durationMs implausible" };
  }

  return recomputeScore(events, run.slices);
}

export function buildSliceLogJson(run: ParsedRun): string {
  const sorted = sortSlices(run.slices);
  return JSON.stringify({
    durationMs: run.durationMs,
    livesLost: run.livesLost,
    slices: sorted.map((s) => ({
      objectIndex: s.objectIndex,
      sliceTimeMs: s.sliceTimeMs,
    })),
  });
}

/** Deterministic JSON matching lib/slicer-log.mo canonicalSliceLogJson. */
export function canonicalSliceLogJson(run: ParsedRun): string {
  const sorted = sortSlices(run.slices);
  const sliceParts = sorted.map(
    (s) =>
      `{"objectIndex":${s.objectIndex},"sliceTimeMs":${s.sliceTimeMs}}`,
  );
  return `{"durationMs":${run.durationMs},"livesLost":${run.livesLost},"slices":[${sliceParts.join(",")}]}`;
}

export async function sliceLogHash(run: ParsedRun): Promise<string> {
  const canonical = canonicalSliceLogJson(run);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
