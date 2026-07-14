#!/usr/bin/env node
/**
 * Mainnet smoke: submitSlicerRun rejection paths + submitGameScore slicer block.
 * Requires ic_deploy identity (authenticated caller).
 */
import { readFileSync } from "node:fs";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { idlFactory } from "../src/declarations/backend/backend.did.js";

const BACKEND = "ghxmp-xiaaa-aaaao-ba4sq-cai";
const identityPath = `${process.env.HOME}/.config/dfx/identity/ic_deploy/identity.pem`;
const pem = readFileSync(identityPath, "utf8");
const identity = Secp256k1KeyIdentity.fromPem(pem);

const agent = new HttpAgent({ host: "https://icp0.io", identity });
const backend = Actor.createActor(idlFactory, { agent, canisterId: BACKEND });

function ok(label, got, expected) {
  const pass = got === expected;
  console.log(`${pass ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(got)}${pass ? "" : ` (expected ${JSON.stringify(expected)})`}`);
  return pass;
}

async function startSession() {
  const r = await backend.startGameSession("slicer");
  if ("err" in r) throw new Error(`startGameSession: ${r.err}`);
  return r.ok;
}

async function submit(sessionId, json) {
  return backend.submitSlicerRun(sessionId, json);
}

async function main() {
  const results = [];

  // submitGameScore blocked for slicer
  const legacy = await backend.submitGameScore("slicer", 9999n, "");
  results.push(
    ok(
      "submitGameScore(slicer) rejected",
      "err" in legacy ? legacy.err : "ok",
      "Slicer scores must be submitted via submitSlicerRun",
    ),
  );

  const { sessionId, seed } = await startSession();
  console.log(`Session ${sessionId} seed=${seed}`);

  const events = await backend.getSpawnSequence(seed, 120n);
  const first = events[0];
  const spawnMs = Number(first.spawnTimeMs);
  const idx0 = Number(first.index);

  const validJson = JSON.stringify({
    durationMs: spawnMs + 2000,
    livesLost: 0,
    slices: [{ objectIndex: idx0, sliceTimeMs: spawnMs + 500 }],
  });

  // Unknown objectIndex
  const s1 = await startSession();
  const badIdx = JSON.stringify({
    durationMs: 5000,
    livesLost: 0,
    slices: [{ objectIndex: 99999, sliceTimeMs: 1000 }],
  });
  const r1 = await submit(s1.sessionId, badIdx);
  results.push(ok("unknown objectIndex", "err" in r1 ? r1.err : "ok", "Unknown objectIndex"));

  // Duplicate objectIndex
  const s2 = await startSession();
  const ev2 = (await backend.getSpawnSequence(s2.seed, 120n))[0];
  const spawn2 = Number(ev2.spawnTimeMs);
  const idx2 = Number(ev2.index);
  const dup = JSON.stringify({
    durationMs: spawn2 + 3000,
    livesLost: 0,
    slices: [
      { objectIndex: idx2, sliceTimeMs: spawn2 + 400 },
      { objectIndex: idx2, sliceTimeMs: spawn2 + 800 },
    ],
  });
  const r2 = await submit(s2.sessionId, dup);
  results.push(ok("duplicate objectIndex", "err" in r2 ? r2.err : "ok", "Duplicate objectIndex"));

  // Impossible sliceTime (before spawn)
  const s3 = await startSession();
  const ev3 = (await backend.getSpawnSequence(s3.seed, 120n))[0];
  const spawn3 = Number(ev3.spawnTimeMs);
  const idx3 = Number(ev3.index);
  const earlyMs = spawn3 > 0 ? spawn3 - 1 : spawn3 + 20_000;
  const expectedEarly =
    spawn3 > 0 ? "sliceTimeMs before spawnTimeMs" : "sliceTimeMs outside flight window";
  const early = JSON.stringify({
    durationMs: earlyMs + 1000,
    livesLost: 0,
    slices: [{ objectIndex: idx3, sliceTimeMs: earlyMs }],
  });
  const r3 = await submit(s3.sessionId, early);
  results.push(
    ok(
      "impossible sliceTime",
      "err" in r3 ? r3.err : "ok",
      expectedEarly,
    ),
  );

  // Valid submit on fresh session
  const s4 = await startSession();
  const ev4 = (await backend.getSpawnSequence(s4.seed, 120n))[0];
  const spawn4 = Number(ev4.spawnTimeMs);
  const idx4 = Number(ev4.index);
  const goodJson = JSON.stringify({
    durationMs: spawn4 + 2000,
    livesLost: 0,
    slices: [{ objectIndex: idx4, sliceTimeMs: spawn4 + 500 }],
  });
  const r4 = await submit(s4.sessionId, goodJson);
  const validOk = "ok" in r4;
  console.log(
    `${validOk ? "PASS" : "FAIL"} valid submit: ${validOk ? `score=${r4.ok.score}` : r4.err}`,
  );
  results.push(validOk);

  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`\n=== REJECTION SMOKE: ${passed}/${total} ===`);
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
