#!/usr/bin/env node
/**
 * Smoke test: registerPlantBatch — 12 cells, shared trayId, grower provenance NFTs.
 * Run after local deploy: node scripts/verify-register-plant-batch.mjs
 */
import { execSync } from "node:child_process";

const NETWORK = process.env.DFX_NETWORK || "local";
const dfx = (method, args = "") => {
  const cmd = `TERM=xterm-256color NO_COLOR=1 dfx canister --network ${NETWORK} call backend ${method} '${args}'`;
  const out = execSync(cmd, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  return out.trim();
};

function parseNat(v) {
  const m = String(v).match(/(\d+)/);
  return m ? BigInt(m[1]) : 0n;
}

console.log("=== registerPlantBatch smoke ===\n");

let varietyId = 1n;
console.log("Adding test variety…");
const addVarOut = dfx(
  "addVariety",
  `("Smoke Test Pepper", "Capsicum annuum", 0 : nat, 5000 : nat, "batch smoke", null, null, null)`,
);
varietyId = BigInt(addVarOut.replace(/\D/g, "") || "1");
console.log("  varietyId:", varietyId.toString());

console.log("Creating tray…");
const trayOut = dfx(
  "createNimsTray",
  `("Batch Smoke Tray", ${BigInt(Date.now()) * 1_000_000n} : int, opt (${varietyId} : nat))`,
);
const trayMatch = trayOut.match(/(\d+)/);
if (!trayMatch) throw new Error("createNimsTray failed: " + trayOut);
const trayId = BigInt(trayMatch[1]);
console.log("  trayId:", trayId.toString());

const cellIndices = Array.from({ length: 12 }, (_, i) => i + 1);
const cellsArg = cellIndices
  .map(
    (n) =>
      `record { cell_index = ${n} : nat; overrides = null }`,
  )
  .join("; ");

console.log("registerPlantBatch (12 cells)…");
const batchOut = dfx(
  "registerPlantBatch",
  `(record {
    tray_id = ${trayId} : nat;
    variety_id = ${varietyId} : nat;
    container_size = opt variant { Cell72 };
    origin = opt "Port Charlotte, FL";
    planting_date = null;
    notes = "batch smoke";
    genetics = "smoke lot";
    common_name = null;
    latin_name = null;
  }, vec { ${cellsArg} })`,
);
console.log(batchOut.slice(0, 500));

const succeeded = parseNat(batchOut.match(/succeeded\s*=\s*(\d+)/)?.[1] ?? "0");
const failed = parseNat(batchOut.match(/failed\s*=\s*(\d+)/)?.[1] ?? "0");
if (succeeded < 12n || failed > 0n) {
  console.error("FAIL: expected 12 succeeded, 0 failed");
  process.exit(1);
}
console.log("  ✓ 12 cells registered\n");

console.log("getTrayGrid spot-check…");
const grid = dfx("getTrayGrid", `(${trayId} : nat)`);
const nftHits = (grid.match(/nftTokenId = opt \(\d+/g) || []).length;
if (nftHits < 12) {
  console.error("FAIL: expected 12 cells with nftTokenId in grid, got", nftHits);
  process.exit(1);
}
console.log("  ✓ grid shows NFTs on cells\n");

console.log("startGameSession (slicer)…");
dfx('startGameSession', '("slicer")');
console.log("  ✓ startGameSession ok\n");

console.log("=== ALL PASS ===");
