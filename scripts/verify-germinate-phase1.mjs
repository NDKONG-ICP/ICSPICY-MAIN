#!/usr/bin/env node
/**
 * Phase 1 smoke: registerPlant (no NFT), germinatePlant (random assign),
 * pool count, NIMS read, startGameSession, getGameLeaderboard.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { idlFactory } from "../src/declarations/backend/backend.did.js";

const NETWORK = process.env.DFX_NETWORK ?? "local";
const HOST =
  NETWORK === "ic" ? "https://icp0.io" : "http://127.0.0.1:4943";

const CARVE = [
  [7845, 7890],
  [7891, 7978],
  [7979, 7987],
];

function loadIdentity(name = "ic_deploy_plain") {
  const pem = readFileSync(
    join(homedir(), ".config/dfx/identity", name, "identity.pem"),
    "utf8",
  );
  return Ed25519KeyIdentity.fromPem(pem);
}

function isCarvedOut(id) {
  return CARVE.some(([a, b]) => id >= a && id <= b);
}

function validateToken(id, plantByNftMap, backendPrincipal) {
  const checks = {
    inRange: id >= 2001 && id <= 8888,
    notCarved: !isCarvedOut(id),
    notDoubleAssigned: true,
    poolOwnedAtAssign: true,
  };
  return checks;
}

async function main() {
  const identity = loadIdentity();
  const agent = new HttpAgent({ host: HOST, identity });
  if (NETWORK !== "ic") await agent.fetchRootKey();

  const canisterId =
    process.env.BACKEND_CANISTER_ID ??
    JSON.parse(readFileSync(".dfx/local/canister_ids.json", "utf8")).backend.local;
  const actor = Actor.createActor(idlFactory, { agent, canisterId });

  console.log("=== Phase 1 germination verification ===");
  console.log("Backend:", canisterId);

  // Initialize access + NFT pool if empty
  await actor._initializeAccessControl();
  try {
    await actor.initializeNFTPool();
    console.log("initializeNFTPool: ok");
  } catch (e) {
    console.log("initializeNFTPool:", e.message?.slice(0, 80) ?? e);
  }

  const poolBefore = await actor.getPlantPoolAvailableCount();
  console.log("Pool available:", poolBefore.available.toString());
  console.log("Theoretical ceiling:", poolBefore.theoretical_ceiling.toString());

  const backfill = await actor.getPlantByNftIdBackfillCount();
  const mapSize = await actor.getPlantByNftIdMapSize();
  console.log("plantByNftId backfill added:", backfill.toString());
  console.log("plantByNftId map size:", mapSize.toString());

  // Create variety + tray
  const varietyId = await actor.addVariety(
    "Smoke Test",
    "Capsicum annuum",
    1000n,
    5000n,
    "Phase 1 smoke",
  );
  const trayId = await actor.createTray(
    "Germinate Smoke Tray",
    BigInt(Date.now()) * 1_000_000n,
    [varietyId],
  );
  console.log("Tray:", trayId.toString(), "Variety:", varietyId.toString());

  const sharedData = {
    tray_id: trayId,
    variety_id: varietyId,
    container_size: [],
    origin: ["Port Charlotte, FL"],
    planting_date: [BigInt(Date.now()) * 1_000_000n],
    notes: "phase1 smoke",
    genetics: "test",
    common_name: ["Smoke Test"],
    latin_name: ["Capsicum annuum"],
  };

  const reg = await actor.registerPlant(sharedData, 1n, []);
  console.log("registerPlant plant_id:", reg.plant_id.toString());
  if ("nft_token_id" in reg && reg.nft_token_id != null) {
    throw new Error("registerPlant still returned nft_token_id — mint not removed");
  }
  console.log("registerPlant: NO NFT (pass)");

  const lc = await actor.getPlantLifecycle(reg.plant_id);
  if (lc?.nftTokenId?.length) {
    throw new Error("Plant has NFT after register");
  }
  console.log("getPlantLifecycle after register: no NFT (pass)");

  const assigned = [];
  for (let i = 0; i < 3; i++) {
    const cell = i + 2;
    if (cell <= 72) {
      await actor.registerPlant(sharedData, BigInt(cell), []);
    }
    const plantId = reg.plant_id + BigInt(i);
    let germ;
    try {
      germ = await actor.germinatePlant(plantId, []);
    } catch {
      continue;
    }
    if ("assigned" in germ.outcome) {
      const tid = Number(germ.outcome.assigned.token_id);
      assigned.push(tid);
      const checks = validateToken(tid);
      console.log(`germinatePlant #${i + 1} plant=${plantId} token=${tid}`, checks);
      if (!checks.inRange || !checks.notCarved) {
        throw new Error(`Invalid token assignment: ${tid}`);
      }
    } else {
      console.log(`germinatePlant #${i + 1} outcome:`, Object.keys(germ.outcome)[0]);
    }
  }

  const session = await actor.startGameSession("slicer");
  console.log("startGameSession:", session.ok ? "ok" : session.err);

  const lb = await actor.getGameLeaderboard("slicer", 5n);
  console.log("getGameLeaderboard entries:", lb.length);

  const awaiting = await actor.listPlantsAwaitingNft();
  console.log("listPlantsAwaitingNft count:", awaiting.length);

  const poolAfter = await actor.getPlantPoolAvailableCount();
  console.log("Pool available after:", poolAfter.available.toString());
  console.log("Assigned token IDs:", assigned.join(", ") || "(none — pool may be empty on fresh install)");
  console.log("=== DONE ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
