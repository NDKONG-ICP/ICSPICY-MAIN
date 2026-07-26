#!/usr/bin/env node
/**
 * Phase 2 Graveyard verification:
 * pool count → germinate (−1) → markPlantDead (unchanged) → more germinations → dead token never reassigned.
 * Also: idempotent markPlantDead, awaiting-NFT death, sale/claim guard smoke.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { idlFactory } from "../src/declarations/backend/backend.did.js";

const NETWORK = process.env.DFX_NETWORK ?? "ic";
const HOST = NETWORK === "ic" ? "https://icp0.io" : "http://127.0.0.1:4943";
const BACKEND =
  process.env.BACKEND_CANISTER_ID ??
  (NETWORK === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : JSON.parse(readFileSync(".dfx/local/canister_ids.json", "utf8")).backend.local);

function loadIdentity(name = "ic_deploy_plain") {
  const pem = readFileSync(
    join(homedir(), ".config/dfx/identity", name, "identity.pem"),
    "utf8",
  );
  return Secp256k1KeyIdentity.fromPem(pem);
}

function tokenFromGerminate(germ) {
  if (germ?.outcome && "assigned" in germ.outcome) {
    return Number(germ.outcome.assigned.token_id);
  }
  if (germ?.outcome && "already_assigned" in germ.outcome) {
    return Number(germ.outcome.already_assigned.token_id);
  }
  return null;
}

function unwrapOpt(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.length > 0 ? v[0] : null;
  return v;
}

function nftTokenFromLc(lcOpt) {
  const lc = unwrapOpt(lcOpt);
  if (!lc?.nftTokenId) return null;
  const t = unwrapOpt(lc.nftTokenId);
  if (t == null) return null;
  return Number(t);
}

async function main() {
  const identity = loadIdentity();
  const agent = new HttpAgent({ host: HOST, identity });
  if (NETWORK !== "ic") await agent.fetchRootKey();

  const actor = Actor.createActor(idlFactory, { agent, canisterId: BACKEND });
  console.log("=== Phase 2 Graveyard verification ===");
  console.log("Backend:", BACKEND);
  console.log("Network:", NETWORK);

  await actor._initializeAccessControl();
  try {
    await actor.initializeNFTPool();
    console.log("initializeNFTPool: ok");
  } catch (e) {
    console.log("initializeNFTPool:", e.message?.slice(0, 80) ?? e);
  }

  const pool0 = await actor.getPlantPoolAvailableCount();
  console.log("\n[1] Pool available (start):", pool0.available.toString());

  const varietyId = await actor.addVariety(
    "Graveyard Smoke",
    "Capsicum annuum",
    1000n,
    5000n,
    "Phase 2 graveyard smoke",
    [],
    [],
    [],
  );
  const tray = await actor.createTray({
    name: "Graveyard Smoke Tray",
    planting_date: BigInt(Date.now()) * 1_000_000n,
    nft_standard: { ICRC37: null },
  });
  const trayId = tray.id;

  const sharedData = {
    tray_id: trayId,
    variety_id: varietyId,
    container_size: [],
    origin: ["Port Charlotte, FL"],
    planting_date: [BigInt(Date.now()) * 1_000_000n],
    notes: "graveyard phase2 smoke",
    genetics: "test",
    common_name: ["Graveyard Smoke"],
    latin_name: ["Capsicum annuum"],
  };

  const reg = await actor.registerPlant(sharedData, 1n, []);
  const plantId = reg.plant_id;
  console.log("[2] registerPlant plant_id:", plantId.toString());

  const pool1 = await actor.getPlantPoolAvailableCount();
  console.log("[3] Pool before germinate:", pool1.available.toString());

  const germ = await actor.germinatePlant(plantId, []);
  const deadToken = tokenFromGerminate(germ);
  console.log("[4] germinatePlant outcome:", Object.keys(germ.outcome)[0]);
  console.log("    assigned token T:", deadToken ?? "(none / awaiting_nft)");

  const pool2 = await actor.getPlantPoolAvailableCount();
  console.log("[5] Pool after germinate:", pool2.available.toString());
  if (deadToken != null && pool2.available !== pool1.available - 1n) {
    console.warn(
      "    WARN: expected pool −1 after germinate (may be already_assigned idempotent)",
    );
  }

  const lcBefore = await actor.getPlantLifecycle(plantId);
  console.log(
    "[6] NFT on plant before death:",
    nftTokenFromLc(lcBefore) ?? "null",
  );

  await actor.markPlantDead(plantId, { Unknown: null }, ["phase2 smoke death"], []);
  console.log("[7] markPlantDead: ok");

  const pool3 = await actor.getPlantPoolAvailableCount();
  console.log("[8] Pool after markPlantDead:", pool3.available.toString());
  if (pool3.available !== pool2.available) {
    throw new Error(
      `POOL REGRESSION: after death pool=${pool3.available} expected=${pool2.available}`,
    );
  }
  console.log("    POOL UNCHANGED after death: PASS");

  const lcDead = await actor.getPlantLifecycle(plantId);
  const nftAfter = nftTokenFromLc(lcDead);
  console.log("[9] NFT after death (must persist):", nftAfter ?? "null");
  if (deadToken != null && nftAfter !== deadToken) {
    throw new Error("NFT not preserved on dead plant");
  }

  const idempotent = await actor.markPlantDead(
    plantId,
    { Unknown: null },
    ["repeat"],
    [],
  );
  console.log("[10] markPlantDead idempotent (2nd call):", idempotent);

  const purchase = await actor.purchasePlant(plantId, { ckUSDC: null }, 0n);
  console.log("[11] purchasePlant on dead plant:", purchase.message);
  if (purchase.success) throw new Error("Dead plant purchase should fail");

  const assignedAfter = [];
  for (let cell = 2; cell <= 12; cell++) {
    try {
      const r = await actor.registerPlant(sharedData, BigInt(cell), []);
      const pid = r.plant_id;
      const g = await actor.germinatePlant(pid, []);
      const tid = tokenFromGerminate(g);
      if (tid != null) assignedAfter.push(tid);
    } catch {
      /* cell may be taken */
    }
  }
  console.log("[12] Additional germination tokens:", assignedAfter.join(", ") || "(none)");
  if (deadToken != null && assignedAfter.includes(deadToken)) {
    throw new Error(`Dead token ${deadToken} was reassigned!`);
  }
  console.log("    Dead token T never reassigned: PASS");

  const graveyard = await actor.listGraveyard();
  const gyList = Array.isArray(graveyard) ? graveyard : [];
  console.log("[13] listGraveyard count:", gyList.length);
  const found = gyList.some((g) => {
    const p = unwrapOpt(g)?.plant ?? g.plant;
    return p && Number(p.id) === Number(plantId);
  });
  console.log("    Contains test plant:", found);

  const session = await actor.startGameSession("slicer");
  console.log("[14] startGameSession:", session.ok ? "ok" : session.err);

  console.log("\n=== SUMMARY ===");
  console.log("pool0:", pool0.available.toString());
  console.log("pool after germinate:", pool2.available.toString());
  console.log("pool after death:", pool3.available.toString());
  console.log("dead token T:", deadToken ?? "n/a");
  console.log("reassigned tokens:", assignedAfter.join(", ") || "(none)");
  console.log("=== DONE ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
