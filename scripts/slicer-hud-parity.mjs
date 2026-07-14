#!/usr/bin/env node
/**
 * HUD ↔ server score parity: engine scoring rules vs slicer-scoring.validateRun.
 * Must be 100% before badge milestones ship.
 */
import { deriveSpawnSequence } from "../src/frontend/src/games/slicer/spawn-sequence.ts";
import {
  comboMultiplier,
  shuBase,
  validateRun,
} from "../src/frontend/src/games/slicer/slicer-scoring.ts";

/** @typedef {{ objectIndex: number; sliceTimeMs: number }} SliceLogEntry */
const COMBO_WINDOW_MS = 900;
const CASES = 800;

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mirrors SlicerEngine.sliceAt scoring (spawnIndex order, integer-only). */
function scoreLikeEngine(events, slices) {
  const sorted = [...slices].sort((a, b) => {
    if (a.sliceTimeMs !== b.sliceTimeMs) return a.sliceTimeMs - b.sliceTimeMs;
    return a.objectIndex - b.objectIndex;
  });
  let lastSliceMs = 0;
  let combo = 0;
  let score = 0;
  for (const entry of sorted) {
    const ev = events.find((e) => e.index === entry.objectIndex);
    if (!ev) throw new Error("missing event");
    if (entry.sliceTimeMs > lastSliceMs + COMBO_WINDOW_MS && lastSliceMs > 0) {
      combo = 0;
    }
    combo += 1;
    const mult = comboMultiplier(combo);
    const frenzy = ev.isFrenzy ? 2 : 1;
    score += shuBase(ev.kind) * mult * frenzy;
    lastSliceMs = entry.sliceTimeMs;
  }
  return score;
}

function buildCase(seed, rand) {
  const count = 40 + Math.floor(rand() * 80);
  const events = deriveSpawnSequence(seed, count);
  const pickN = 3 + Math.floor(rand() * 12);
  const slices = [];
  const used = new Set();
  for (let i = 0; i < pickN; i++) {
    const ev = events[Math.floor(rand() * Math.min(events.length, 30))];
    if (!ev || used.has(ev.index)) continue;
    used.add(ev.index);
    const t = Number(ev.spawnTimeMs) + 100 + Math.floor(rand() * 2000);
    slices.push({ objectIndex: ev.index, sliceTimeMs: t });
  }
  // Multi-hit same timestamp cluster (engine tie-break stress)
  if (slices.length >= 2 && rand() > 0.4) {
    const t = slices[0].sliceTimeMs;
    const extra = events
      .filter((e) => !used.has(e.index))
      .slice(0, 2 + Math.floor(rand() * 3));
    for (const ev of extra) {
      slices.push({ objectIndex: ev.index, sliceTimeMs: t });
      used.add(ev.index);
    }
  }
  const last = slices.reduce((m, s) => Math.max(m, s.sliceTimeMs), 0);
  return {
    seed,
    run: {
      durationMs: last + 500,
      livesLost: 0,
      slices,
    },
  };
}

let fail = 0;
const rand = mulberry32(0xbad6e);
for (let i = 0; i < CASES; i++) {
  const seed = BigInt(1 + Math.floor(rand() * 2_000_000_000));
  const { run } = buildCase(seed, rand);
  if (run.slices.length === 0) continue;
  const engineScore = scoreLikeEngine(
    deriveSpawnSequence(seed, Math.max(...run.slices.map((s) => s.objectIndex)) + 1),
    run.slices,
  );
  const server = validateRun(seed, run);
  if ("err" in server) continue;
  if (engineScore !== server.ok.score) {
    fail += 1;
    if (fail <= 3) {
      console.error(
        `MISMATCH seed=${seed} engine=${engineScore} server=${server.ok.score}`,
      );
    }
  }
}

const tested = CASES - fail;
const rate = ((CASES - fail) / CASES) * 100;
console.log(`HUD parity: ${CASES - fail}/${CASES} (${rate.toFixed(1)}%)`);
process.exit(fail === 0 ? 0 : 1);
