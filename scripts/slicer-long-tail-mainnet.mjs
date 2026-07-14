#!/usr/bin/env node
/**
 * Mainnet: submit ranked run with long post-last-slice tail (20s) and verify leaderboard.
 */
import { readFileSync } from "node:fs";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { idlFactory } from "../src/declarations/backend/backend.did.js";

const BACKEND = "ghxmp-xiaaa-aaaao-ba4sq-cai";
const identityName = process.argv.includes("--identity")
  ? process.argv[process.argv.indexOf("--identity") + 1]
  : "ic_deploy";
const pem = readFileSync(
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`,
  "utf8",
);
const identity = Secp256k1KeyIdentity.fromPem(pem);
const principal = identity.getPrincipal().toText();
const agent = new HttpAgent({ host: "https://icp0.io", identity });
const backend = Actor.createActor(idlFactory, { agent, canisterId: BACKEND });

const TAIL_MS = 20_000;

async function main() {
  console.log(`Principal: ${principal}`);

  const { sessionId, seed } = (await backend.startGameSession("slicer")).ok;
  const events = await backend.getSpawnSequence(seed, 120n);
  const frenzyCount = events.filter((e) => e.isFrenzy).length;
  console.log(`Session ${sessionId} seed=${seed} frenzySpawns=${frenzyCount}`);

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
  const durationMs = lastSlice + TAIL_MS;
  const json = JSON.stringify({
    durationMs,
    livesLost: 3,
    slices,
  });

  const r = await backend.submitSlicerRun(sessionId, json);
  if ("err" in r) {
    console.error("SUBMIT FAIL:", r.err);
    const stats = await backend.getSlicerSubmitRejectionStats();
    console.log("Rejection stats:", stats);
    process.exit(1);
  }
  console.log(`SUBMIT OK: score=${r.ok.score} tier=${r.ok.tier} isNewBest=${r.ok.isNewBest}`);

  const stats = await backend.getSlicerSubmitRejectionStats();
  console.log("Rejection stats:", stats);

  const lb = await backend.getGameLeaderboard("slicer", 200n);
  const hit = lb.find((e) => e.principal.toText() === principal);
  if (!hit) {
    console.error("FAIL: principal not on leaderboard");
    process.exit(1);
  }
  console.log(`LEADERBOARD OK: rank context score=${hit.score} (top has ${lb[0]?.score})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
