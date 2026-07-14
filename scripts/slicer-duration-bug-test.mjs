#!/usr/bin/env node
/**
 * Tests whether post-last-slice survival time causes durationMs implausible rejection.
 * Also tests frenzy slow-mo dilation vs flight window.
 */
import { readFileSync } from "node:fs";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { idlFactory } from "../src/declarations/backend/backend.did.js";

const BACKEND = "ghxmp-xiaaa-aaaao-ba4sq-cai";
const MAX_FLIGHT_MS = 10_000;
const MAX_END_TAIL_MS = 30_000;
const COMBO_WINDOW_MS = 900;

// Minimal port of spawn-sequence.ts (must match backend)
const LCG_MOD = 2_147_483_648n;
const LCG_MULT = 1_103_515_245n;
const LCG_INC = 12_345n;
const FRENZY_INTERVAL_MS = 45_000n;
const VIRTUAL_SCORE_PER_SPAWN = 150n;
const SCORE_THRESHOLDS = [0n, 5_000n, 15_000n, 35_000n, 75_000n, 150_000n];
const SCORE_PER_LEVEL_AFTER = 100_000n;
const KIND_WEIGHTS = [18n, 16n, 14n, 12n, 10n, 8n, 2n];
const POOL_L1 = [1, 2, 0];

function lcgNext(state) {
  return (state * LCG_MULT + LCG_INC) % LCG_MOD;
}
function powNat(base, exp) {
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
function levelFromScore(score) {
  let level = 1;
  for (let i = 1; i < SCORE_THRESHOLDS.length; i++) {
    if (score >= SCORE_THRESHOLDS[i]) level = i + 1;
    else return level;
  }
  const last = SCORE_THRESHOLDS[SCORE_THRESHOLDS.length - 1];
  if (score >= last) {
    level = SCORE_THRESHOLDS.length + Number((score - last) / SCORE_PER_LEVEL_AFTER);
  }
  return Math.max(1, level);
}
function spawnIntervalMs(level) {
  const steps = Math.max(0, level - 1);
  const num = 1400n * powNat(9n, steps) + 5n * powNat(10n, steps);
  const den = powNat(10n, steps);
  return Math.max(380, Number(num / den));
}
function frenzyBaseCount(level) {
  const steps = Math.max(0, level - 1);
  return Math.min(16, 6 + Math.floor((steps * 3) / 2));
}
function poolForLevel(level) {
  let pool = [...POOL_L1];
  if (level >= 2) pool.push(3);
  if (level >= 3) pool.push(4);
  if (level >= 4) pool.push(5);
  if (level >= 5) pool.push(6);
  return pool;
}
function pickWeightedKind(state, level) {
  const pool = poolForLevel(level);
  let total = 0n;
  for (const k of pool) total += KIND_WEIGHTS[k];
  if (total === 0n) return 0;
  let roll = state % total;
  let acc = 0n;
  for (const k of pool) {
    acc += KIND_WEIGHTS[k];
    if (roll < acc) return k;
  }
  return pool[pool.length - 1];
}
function deriveSpawnSequence(seed, count) {
  if (count === 0) return [];
  let state = seed % LCG_MOD;
  let virtualTime = 0;
  let virtualScore = 0n;
  let objectId = 1;
  let spawnIndex = 0;
  let nextFrenzyAt = Number(FRENZY_INTERVAL_MS + (seed % LCG_MOD % FRENZY_INTERVAL_MS));
  const events = [];
  while (events.length < count) {
    if (virtualTime >= Number(nextFrenzyAt)) {
      const level = levelFromScore(virtualScore);
      state = lcgNext(state);
      const extra = Number(state % 3n);
      const frenzyCount = frenzyBaseCount(level) + extra;
      for (let j = 0; j < frenzyCount && events.length < count; j++) {
        state = lcgNext(state);
        const kind = pickWeightedKind(state, level);
        events.push({
          index: spawnIndex,
          spawnTimeMs: Number(virtualTime),
          isFrenzy: true,
          kind,
        });
        spawnIndex++;
        objectId++;
      }
      nextFrenzyAt += Number(FRENZY_INTERVAL_MS);
    } else {
      const level = levelFromScore(virtualScore);
      const interval = spawnIntervalMs(level);
      state = lcgNext(state);
      const kind = pickWeightedKind(state, level);
      events.push({
        index: spawnIndex,
        spawnTimeMs: Number(virtualTime),
        isFrenzy: false,
        kind,
      });
      spawnIndex++;
      objectId++;
      virtualTime += interval;
      virtualScore += VIRTUAL_SCORE_PER_SPAWN;
    }
  }
  return events;
}

const SHU_BASE = [100, 150, 150, 200, 250, 500, 2500];
function comboMultiplier(combo) {
  if (combo <= 1) return 1;
  if (combo === 2) return 2;
  if (combo === 3) return 3;
  if (combo === 4) return 5;
  if (combo === 5) return 7;
  return 10;
}
function validateRunLocal(seed, run) {
  const maxIndex = Math.max(...run.slices.map((s) => s.objectIndex));
  const events = deriveSpawnSequence(seed, maxIndex + 1);
  const sorted = [...run.slices].sort((a, b) =>
    a.sliceTimeMs !== b.sliceTimeMs ? a.sliceTimeMs - b.sliceTimeMs : a.objectIndex - b.objectIndex,
  );
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].sliceTimeMs < sorted[i - 1].sliceTimeMs) return "sliceTimeMs not monotonic";
  }
  const lastSlice = sorted[sorted.length - 1].sliceTimeMs;
  if (run.durationMs < lastSlice) return "durationMs shorter than last slice";
  if (run.durationMs > lastSlice + MAX_END_TAIL_MS) return "durationMs implausible";
  for (const entry of sorted) {
    const ev = events.find((e) => e.index === entry.objectIndex);
    if (!ev) return "Unknown objectIndex";
    if (entry.sliceTimeMs < ev.spawnTimeMs) return "sliceTimeMs before spawnTimeMs";
    if (entry.sliceTimeMs > ev.spawnTimeMs + MAX_FLIGHT_MS) return "sliceTimeMs outside flight window";
  }
  return null;
}

/** Simulate engine clock with optional slow-mo; slice objects on spawn+500ms until stopSliceAt. */
function simulateRun(seed, { slowMo = false, stopSliceAt = null, tailMs = 15_000 } = {}) {
  const events = deriveSpawnSequence(seed, 4000);
  let elapsedMs = 0;
  let slowMoUntil = 0;
  const frenzyWindowsSeen = new Set();
  const slices = [];
  const DT = 16;

  for (const ev of events) {
    while (elapsedMs < ev.spawnTimeMs) {
      let dt = DT;
      if (slowMo && elapsedMs < slowMoUntil) dt *= 0.55;
      elapsedMs += dt;
    }
    if (ev.isFrenzy && !frenzyWindowsSeen.has(ev.spawnTimeMs)) {
      frenzyWindowsSeen.add(ev.spawnTimeMs);
      if (slowMo) slowMoUntil = elapsedMs + 1200;
    }
    if (stopSliceAt === null || elapsedMs < stopSliceAt) {
      slices.push({ objectIndex: ev.index, sliceTimeMs: Math.floor(elapsedMs + 500) });
    }
    // advance a bit past slice
    let dt = DT;
    if (slowMo && elapsedMs < slowMoUntil) dt *= 0.55;
    elapsedMs += dt;
  }

  // Tail: player survives after last slice losing lives (no more slices)
  const tailEnd = elapsedMs + tailMs;
  while (elapsedMs < tailEnd) {
    let dt = DT;
    if (slowMo && elapsedMs < slowMoUntil) dt *= 0.55;
    elapsedMs += dt;
  }

  const lastSlice = slices.length ? Math.max(...slices.map((s) => s.sliceTimeMs)) : 0;
  const durationMs = Math.floor(elapsedMs);
  const run = { durationMs, livesLost: 2, slices };
  const err = validateRunLocal(seed, run);
  return { seed, sliceCount: slices.length, lastSlice, durationMs, gap: durationMs - lastSlice, err };
}

console.log("=== Local validation: post-last-slice tail ===");
for (const tailMs of [5_000, 8_000, 11_000, 15_000]) {
  const r = simulateRun(424242n, { slowMo: true, tailMs });
  console.log(`tailMs=${tailMs}: gap=${r.gap} err=${r.err ?? "OK"}`);
}

console.log("\n=== Frenzy slow-mo vs flight window (many seeds) ===");
let flightFails = 0;
for (let i = 0; i < 500; i++) {
  const seed = BigInt(1_000_000 + i * 9973);
  const r = simulateRun(seed, { slowMo: true, tailMs: 0 });
  if (r.err === "sliceTimeMs outside flight window") flightFails++;
}
console.log(`flight window failures with slowMo (tail=0): ${flightFails}/500`);

console.log("\n=== Mainnet: durationMs implausible submit ===");
const pem = readFileSync(`${process.env.HOME}/.config/dfx/identity/ic_deploy/identity.pem`, "utf8");
const identity = Secp256k1KeyIdentity.fromPem(pem);
const agent = new HttpAgent({ host: "https://icp0.io", identity });
const backend = Actor.createActor(idlFactory, { agent, canisterId: BACKEND });

const { sessionId, seed } = (await backend.startGameSession("slicer")).ok;
const events = await backend.getSpawnSequence(seed, 50n);
const ev = events[0];
const spawnMs = Number(ev.spawnTimeMs);
const idx = Number(ev.index);

const badDuration = JSON.stringify({
  durationMs: spawnMs + 500 + 12_000,
  livesLost: 2,
  slices: [{ objectIndex: idx, sliceTimeMs: spawnMs + 500 }],
});
const r1 = await backend.submitSlicerRun(sessionId, badDuration);
console.log("12s tail after single slice:", "err" in r1 ? r1.err : `ok score=${r1.ok.score}`);

const s2 = (await backend.startGameSession("slicer")).ok;
const ev2 = (await backend.getSpawnSequence(s2.seed, 50n))[0];
const spawn2 = Number(ev2.spawnTimeMs);
const idx2 = Number(ev2.index);
const okDuration = JSON.stringify({
  durationMs: spawn2 + 500 + 8_000,
  livesLost: 2,
  slices: [{ objectIndex: idx2, sliceTimeMs: spawn2 + 500 }],
});
const r2 = await backend.submitSlicerRun(s2.sessionId, okDuration);
console.log("8s tail after single slice:", "err" in r2 ? r2.err : `ok score=${r2.ok.score}`);
