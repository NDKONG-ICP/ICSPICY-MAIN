#!/usr/bin/env node
/**
 * Client engine determinism: same seed → identical spawn schedule twice.
 */
import { deriveSpawnSequence } from "../src/frontend/src/games/slicer/spawn-sequence.ts";

const TEST_SEEDS = [
  0n,
  1n,
  42n,
  2_147_483_647n,
  18_446_744_073_709_551_615n,
  9_876_543_210n,
];

const COUNT = 200;

function eventsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

let failed = 0;
for (const seed of TEST_SEEDS) {
  const a = deriveSpawnSequence(seed, COUNT);
  const b = deriveSpawnSequence(seed, COUNT);
  if (!eventsEqual(a, b)) {
    console.error(`FAIL seed=${seed.toString()}: non-deterministic client derivation`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`verify-slicer-determinism: ${failed}/${TEST_SEEDS.length} failed`);
  process.exit(1);
}

console.log(
  `verify-slicer-determinism: PASS ${TEST_SEEDS.length} seeds × ${COUNT} events (client idempotent)`,
);
