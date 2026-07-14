#!/usr/bin/env node
/**
 * Mainnet verify: long tail submit using dedicated smoke identity (not rate-limited ic_deploy).
 */
import { createHash } from "node:crypto";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { idlFactory } from "../src/declarations/backend/backend.did.js";

const BACKEND = "ghxmp-xiaaa-aaaao-ba4sq-cai";
const SMOKE_SEED = createHash("sha256")
  .update("ic-spicy-slicer-leaderboard-smoke-v1")
  .digest();
const identity = Ed25519KeyIdentity.fromSecretKey(SMOKE_SEED);
const principal = identity.getPrincipal().toText();
const agent = new HttpAgent({ host: "https://icp0.io", identity });
const backend = Actor.createActor(idlFactory, { agent, canisterId: BACKEND });

const TAIL_MS = 20_000;

async function main() {
  console.log(`Smoke principal: ${principal}`);

  const stats0 = await backend.getSlicerSubmitRejectionStats();
  console.log("Rejection stats (before):", stats0);

  const { sessionId, seed } = (await backend.startGameSession("slicer")).ok;
  const events = await backend.getSpawnSequence(seed, 120n);
  const frenzyCount = events.filter((e) => e.isFrenzy).length;

  const slices = [];
  for (let i = 0; i < 40; i++) {
    const ev = events[i];
    const spawn = Number(ev.spawnTimeMs);
    slices.push({
      objectIndex: Number(ev.index),
      sliceTimeMs: spawn + 800 + i * 40,
    });
  }
  const lastSlice = slices[slices.length - 1].sliceTimeMs;
  const json = JSON.stringify({
    durationMs: lastSlice + TAIL_MS,
    livesLost: 3,
    slices,
  });

  const r = await backend.submitSlicerRun(sessionId, json);
  if ("err" in r) {
    console.error("SUBMIT FAIL:", r.err);
    console.log("Rejection stats:", await backend.getSlicerSubmitRejectionStats());
    process.exit(1);
  }
  console.log(`SUBMIT OK: score=${r.ok.score} isNewBest=${r.ok.isNewBest}`);

  const stats1 = await backend.getSlicerSubmitRejectionStats();
  console.log("Rejection stats (after):", stats1);

  const myStats = await backend.getMyGameStats("slicer");
  if (!myStats) {
    console.error("FAIL: getMyGameStats returned null");
    process.exit(1);
  }
  console.log(`MY STATS OK: bestScore=${myStats.bestScore} totalPlays=${myStats.totalPlays}`);

  // Also prove the old 11s tail would pass now
  const s2 = (await backend.startGameSession("slicer")).ok;
  const ev = (await backend.getSpawnSequence(s2.seed, 10n))[0];
  const spawn = Number(ev.spawnTimeMs);
  const idx = Number(ev.index);
  const tail11 = JSON.stringify({
    durationMs: spawn + 500 + 11_000,
    livesLost: 2,
    slices: [{ objectIndex: idx, sliceTimeMs: spawn + 500 }],
  });
  const r2 = await backend.submitSlicerRun(s2.sessionId, tail11);
  console.log(
    "11s tail single-slice:",
    "err" in r2 ? `FAIL ${r2.err}` : `OK score=${r2.ok.score}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
