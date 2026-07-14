#!/usr/bin/env node
/**
 * Verify submitSlicerRun accepts post-last-slice tail (15s) and multi-slice frenzy-style logs.
 */
import { readFileSync } from "node:fs";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { idlFactory } from "../src/declarations/backend/backend.did.js";

const network = process.argv.includes("--network")
  ? process.argv[process.argv.indexOf("--network") + 1]
  : "local";
const canisterId =
  process.argv.includes("--canister")
    ? process.argv[process.argv.indexOf("--canister") + 1]
    : network === "ic"
      ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
      : "uxrrr-q7777-77774-qaaaq-cai";

const host =
  network === "ic" ? "https://icp0.io" : "http://127.0.0.1:4943";

const identityName = process.argv.includes("--identity")
  ? process.argv[process.argv.indexOf("--identity") + 1]
  : "default";
const pem = readFileSync(
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`,
  "utf8",
);
const identity = Secp256k1KeyIdentity.fromPem(pem);

const agent = new HttpAgent({ host, identity });
if (network !== "ic") await agent.fetchRootKey();
const backend = Actor.createActor(idlFactory, { agent, canisterId });

async function startSession() {
  const r = await backend.startGameSession("slicer");
  if ("err" in r) throw new Error(`startGameSession: ${r.err}`);
  return r.ok;
}

function buildMultiSliceLog(events, count) {
  const slices = [];
  for (let i = 0; i < count; i++) {
    const ev = events[i];
    const spawn = Number(ev.spawnTimeMs);
    slices.push({
      objectIndex: Number(ev.index),
      sliceTimeMs: spawn + 600 + i * 50,
    });
  }
  const lastSlice = slices[slices.length - 1].sliceTimeMs;
  return JSON.stringify({
    durationMs: lastSlice + 15_000,
    livesLost: 2,
    slices,
  });
}

async function main() {
  console.log(`Network: ${network} canister: ${canisterId}`);

  const { sessionId, seed } = await startSession();
  const events = await backend.getSpawnSequence(seed, 80n);

  const frenzyEvents = events.filter((e) => e.isFrenzy);
  console.log(`Frenzy spawns in first 80: ${frenzyEvents.length}`);

  const json = buildMultiSliceLog(events, 25);
  const r = await backend.submitSlicerRun(sessionId, json);
  if ("err" in r) {
    console.error("FAIL:", r.err);
    process.exit(1);
  }
  console.log(
    `PASS: multi-slice + 15s tail + frenzy spawns → score=${r.ok.score} tier=${r.ok.tier}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
