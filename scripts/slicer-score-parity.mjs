#!/usr/bin/env node
/**
 * TS ↔ Motoko slicer score recompute parity gate.
 * 200 seeds with simulated slice logs — must be 100% match.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveSpawnSequence } from "../src/frontend/src/games/slicer/spawn-sequence.ts";
import { validateRun } from "../src/frontend/src/games/slicer/slicer-scoring.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND = path.join(ROOT, "src/backend");
const SEED_COUNT = 200;
const MAX_EVENTS = 120;

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSeeds() {
  const seeds = [];
  const push = (n) => seeds.push(BigInt(n));
  push(0);
  push(1);
  push(42);
  push(2_147_483_647);
  push(9_999_999_999);
  const rand = mulberry32(0x5c0e);
  while (seeds.length < SEED_COUNT) {
    const hi = Math.floor(rand() * 0x1_0000_0000);
    const lo = Math.floor(rand() * 0x1_0000_0000);
    seeds.push((BigInt(hi) << 32n) | BigInt(lo));
  }
  return seeds.slice(0, SEED_COUNT);
}

function simulateRun(seed, rand) {
  const eventCount = 20 + Math.floor(rand() * (MAX_EVENTS - 20));
  const events = deriveSpawnSequence(seed, eventCount);
  const pickCount = 3 + Math.floor(rand() * Math.min(18, events.length));
  const indices = new Set();
  while (indices.size < pickCount) {
    indices.add(Math.floor(rand() * events.length));
  }
  const slices = [...indices].map((objectIndex) => {
    const ev = events[objectIndex];
    const offset = Math.floor(rand() * 4000) + 50;
    return {
      objectIndex: ev.index,
      sliceTimeMs: ev.spawnTimeMs + offset,
    };
  });
  slices.sort((a, b) => a.sliceTimeMs - b.sliceTimeMs || a.objectIndex - b.objectIndex);
  const last = slices[slices.length - 1].sliceTimeMs;
  return {
    durationMs: last + 500 + Math.floor(rand() * 2000),
    livesLost: Math.floor(rand() * 3),
    slices,
  };
}

function motokoText(s) {
  let out = '"';
  for (const ch of s) {
    if (ch === "\\" || ch === '"') out += `\\${ch}`;
    else out += ch;
  }
  return out + '"';
}

async function runMotokoBatch(cases) {
  const inputs = cases
    .map((c) => `(${c.seed.toString()} : Nat, ${motokoText(c.json)})`)
    .join(", ");
  const expected = cases
    .map((c) => `(${c.score} : Nat, ${c.bestCombo} : Nat, ${motokoText(c.tier)}, ${c.rare} : Nat)`)
    .join(", ");

  const mo = `import SlicerScore "../lib/slicer-score";
import Debug "mo:core/Debug";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

let cases : [(Nat, Text)] = [${inputs}];
let expected : [(Nat, Nat, Text, Nat)] = [${expected}];
var failed : Nat = 0;
var first : Nat = 0;
for (i in cases.keys()) {
  let (seed, json) = cases[i];
  switch (SlicerScore.parseRunJson(json)) {
    case (#err(_)) { failed += 1; if (first == 0) { first := seed } };
    case (#ok(run)) {
      switch (SlicerScore.validateRun(seed, run)) {
        case (#err(_)) { failed += 1; if (first == 0) { first := seed } };
        case (#ok(got)) {
          let (expScore, expCombo, expTier, expRare) = expected[i];
          if (got.score != expScore or got.bestCombo != expCombo or got.tier != expTier or got.rareChilisSliced != expRare) {
            failed += 1;
            if (first == 0) { first := seed };
          };
        };
      };
    };
  };
};
if (failed > 0) {
  Debug.print("MISMATCH count=" # Nat.toText(failed) # " firstSeed=" # Nat.toText(first));
} else {
  Debug.print("OK " # Nat.toText(cases.size()));
};
`;

  const tmp = path.join(BACKEND, "test", "slicer-score-parity-test.mo");
  await fs.mkdir(path.dirname(tmp), { recursive: true });
  await fs.writeFile(tmp, mo, "utf8");

  const moc = spawnSync(
    "bash",
    [
      "-lc",
      `cd "${BACKEND}" && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl test/slicer-score-parity-test.mo -r`,
    ],
    { encoding: "utf8", maxBuffer: 40 * 1024 * 1024 },
  );

  return {
    ok: moc.status === 0 && /^OK \d+/.test(moc.stdout?.trim() ?? ""),
    stdout: moc.stdout?.trim() ?? "",
    stderr: moc.stderr?.trim() ?? "",
  };
}

async function main() {
  const seeds = buildSeeds();
  const cases = [];
  let seedIdx = 0;
  for (const seed of seeds) {
    const rand = mulberry32(0xabad1ced + seedIdx);
    seedIdx += 1;
    const run = simulateRun(seed, rand);
    const ts = validateRun(seed, run);
    if ("err" in ts) {
      console.error(`TS validate failed seed=${seed}: ${ts.err}`);
      process.exit(1);
    }
    const json = JSON.stringify({
      durationMs: run.durationMs,
      livesLost: run.livesLost,
      slices: run.slices,
    });
    cases.push({
      seed,
      json,
      score: ts.ok.score,
      bestCombo: ts.ok.bestCombo,
      tier: ts.ok.tier,
      rare: ts.ok.rareChilisSliced,
    });
  }

  console.log(`Generated ${cases.length} simulated runs (integer-only TS scores)`);

  const motoko = await runMotokoBatch(cases);
  if (motoko.ok) {
    console.log(`Motoko -r: PASS ${cases.length}/${cases.length} (100%)`);
    if (motoko.stdout) console.log(`  ${motoko.stdout}`);
    console.log(`\n=== SCORE PARITY: ${cases.length}/${cases.length} (100.0%) ===`);
    process.exit(0);
  }

  console.error("Motoko score mismatch or compile error");
  if (motoko.stdout) console.error(`  stdout: ${motoko.stdout}`);
  if (motoko.stderr) console.error(motoko.stderr.slice(-2500));
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
