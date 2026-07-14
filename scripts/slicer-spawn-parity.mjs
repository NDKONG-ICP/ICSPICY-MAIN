#!/usr/bin/env node
/**
 * TS ↔ Motoko slicer spawn sequence parity gate.
 * 300 seeds × 200 events — must be 100% match or deploy is blocked.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveSpawnSequence } from "../src/frontend/src/games/slicer/spawn-sequence.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND = path.join(ROOT, "src/backend");
const EVENTS_PER_SEED = 200;
const SEED_COUNT = 300;

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
  const push = (n, label) => seeds.push({ seed: BigInt(n), label });

  push(0, "seed-zero");
  push(1, "seed-one");
  push(2_147_483_646, "seed-lcg-mod-minus-2");
  push(2_147_483_647, "seed-mersenne");
  push(4_294_967_295, "seed-u32-max");
  push(18_446_744_073_709_551_615, "seed-u64-max");
  push(1_103_515_245, "seed-lcg-mult");
  push(12_345, "seed-lcg-inc");

  const rand = mulberry32(0x51c1ce);
  while (seeds.length < SEED_COUNT) {
    const hi = Math.floor(rand() * 0x1_0000_0000);
    const lo = Math.floor(rand() * 0x1_0000_0000);
    const seed = (BigInt(hi) << 32n) | BigInt(lo);
    seeds.push({ seed, label: `random-${seeds.length}` });
  }

  return seeds.slice(0, SEED_COUNT);
}

function eventToMotoko(ev) {
  return `({ index = ${ev.index} : Nat; objectId = ${ev.objectId} : Nat; kind = ${ev.kind} : Nat; spawnTimeMs = ${ev.spawnTimeMs} : Nat; isFrenzy = ${ev.isFrenzy} })`;
}

function eventsArrayMotoko(events) {
  return `[${events.map(eventToMotoko).join(", ")}]`;
}

async function runMotokoBatch(cases) {
  const inputs = cases
    .map((c) => `(${c.seed.toString()} : Nat)`)
    .join(", ");
  const expected = cases
    .map((c) => eventsArrayMotoko(c.tsEvents))
    .join(", ");

  const mo = `import SlicerSpawn "../lib/slicer-spawn";
import SpawnTypes "../types/slicer-spawn";
import Debug "mo:core/Debug";
import Nat "mo:core/Nat";

func eqEvent(a : SpawnTypes.SpawnEvent, b : SpawnTypes.SpawnEvent) : Bool {
  a.index == b.index and a.objectId == b.objectId and a.kind == b.kind
  and a.spawnTimeMs == b.spawnTimeMs and a.isFrenzy == b.isFrenzy
};

func eqSeq(a : [SpawnTypes.SpawnEvent], b : [SpawnTypes.SpawnEvent]) : Bool {
  if (a.size() != b.size()) return false;
  for (i in a.keys()) { if (not eqEvent(a[i], b[i])) return false };
  true;
};

let seeds : [Nat] = [${inputs}];
let expected : [[SpawnTypes.SpawnEvent]] = [${expected}];
var failed : Nat = 0;
var firstSeed : Nat = 0;
for (i in seeds.keys()) {
  let got = SlicerSpawn.getSpawnSequence(seeds[i], ${EVENTS_PER_SEED} : Nat);
  if (not eqSeq(got, expected[i])) {
    failed += 1;
    if (firstSeed == 0) { firstSeed := seeds[i] };
  };
};
if (failed > 0) {
  Debug.print("MISMATCH count=" # Nat.toText(failed) # " firstSeed=" # Nat.toText(firstSeed));
} else {
  Debug.print("OK " # Nat.toText(seeds.size()));
};
`;

  const tmp = path.join(BACKEND, "test", "slicer-spawn-parity-test.mo");
  await fs.mkdir(path.dirname(tmp), { recursive: true });
  await fs.writeFile(tmp, mo, "utf8");

  const moc = spawnSync(
    "bash",
    [
      "-lc",
      `cd "${BACKEND}" && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl test/slicer-spawn-parity-test.mo -r`,
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
  const seedCases = buildSeeds();
  const cases = seedCases.map(({ seed, label }) => ({
    seed,
    label,
    tsEvents: deriveSpawnSequence(seed, EVENTS_PER_SEED),
  }));

  console.log(
    `Generated ${cases.length} seeds × ${EVENTS_PER_SEED} events (integer-only TS)`,
  );

  const motoko = await runMotokoBatch(cases);
  if (motoko.ok) {
    console.log(`Motoko -r: PASS ${cases.length}/${cases.length} (100%)`);
    if (motoko.stdout) console.log(`  ${motoko.stdout}`);
    console.log(`\n=== PARITY RESULT: ${cases.length}/${cases.length} (100.0%) ===`);
    process.exit(0);
  }

  console.error("Motoko batch mismatch or compile error");
  if (motoko.stdout) console.error(`  stdout: ${motoko.stdout}`);
  if (motoko.stderr) console.error(motoko.stderr.slice(-2500));
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
