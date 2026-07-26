#!/usr/bin/env node
/**
 * Mainnet post-deploy verification for registerPlant / registerPlantBatch.
 * Usage: DFX_NETWORK=ic node scripts/verify-mainnet-nims-batch.mjs
 */
import { execSync } from "node:child_process";

const NETWORK = process.env.DFX_NETWORK || "ic";
const dfx = (method, args = "", opts = {}) => {
  const cmd = `DFX_WARNING=-mainnet_plaintext_identity TERM=xterm-256color NO_COLOR=1 dfx canister --network ${NETWORK} call backend ${method} '${args}'`;
  const out = execSync(cmd, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    ...opts,
  });
  return out.trim();
};

function parseNat(v) {
  const m = String(v).match(/(\d+)/);
  return m ? BigInt(m[1]) : 0n;
}

function extractNftIds(grid) {
  return [...grid.matchAll(/nftTokenId = opt \((\d[\d_]*)/g)].map((m) =>
    BigInt(m[1].replace(/_/g, "")),
  );
}

function extractCellPositions(grid) {
  return [...grid.matchAll(/cellPosition = (\d+)/g)].map((m) => BigInt(m[1]));
}

const failures = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failures.push(msg);
};

console.log("=== Mainnet NIMS batch verification ===\n");

// 0. Cycle balance
console.log("0. Backend cycle balance…");
const statusOut = execSync(
  `DFX_WARNING=-mainnet_plaintext_identity dfx canister --network ${NETWORK} status backend`,
  { encoding: "utf8" },
);
const balanceMatch = statusOut.match(/Balance: ([\d_]+)/);
const balance = balanceMatch ? BigInt(balanceMatch[1].replace(/_/g, "")) : 0n;
console.log(`  Balance: ${balance.toLocaleString()} cycles (~${(Number(balance) / 1e12).toFixed(3)} T)`);
if (balance < 200_000_000_000n) {
  fail("Cycle balance below 200B — may struggle with full 72-cell batch");
} else {
  ok("Cycle balance healthy for batch operations");
}

// 1. Existing trays snapshot (regression)
console.log("\n1. Existing trays snapshot (pre-batch regression)…");
let existingTrayId = null;
let existingGridBefore = "";
try {
  const trays = dfx("getMyTrays", "()");
  const trayIds = [...trays.matchAll(/id = (\d+)/g)].map((m) => BigInt(m[1]));
  if (trayIds.length > 0) {
    existingTrayId = trayIds[0];
    existingGridBefore = dfx("getTrayGrid", `(${existingTrayId} : nat)`);
    const existingNfts = extractNftIds(existingGridBefore).length;
    ok(`Found ${trayIds.length} tray(s); tray ${existingTrayId} has ${existingNfts} cells with NFT`);
  } else {
    console.log("  (no existing trays for deploy identity — skip regression grid compare)");
  }
} catch (e) {
  fail(`getMyTrays/getTrayGrid: ${e.message?.slice(0, 200)}`);
}

// 2. startGameSession + getGameLeaderboard
console.log("\n2. Game smoke (startGameSession + getGameLeaderboard)…");
try {
  dfx("startGameSession", '("slicer")');
  ok("startGameSession(slicer)");
} catch (e) {
  fail(`startGameSession: ${e.message?.slice(0, 200)}`);
}
try {
  const lb = dfx("getGameLeaderboard", '("slicer", 5 : nat)');
  const entries = (lb.match(/record \{/g) || []).length;
  ok(`getGameLeaderboard(slicer, 5) → ${entries} entries`);
} catch (e) {
  fail(`getGameLeaderboard: ${e.message?.slice(0, 200)}`);
}

// 3. Setup variety + tray
console.log("\n3. Create test variety + tray…");
let varietyId = 1n;
let trayId = 1n;
try {
  const addVarOut = dfx(
    "addVariety",
    `("Mainnet Batch Pepper", "Capsicum annuum", 0 : nat, 5000 : nat, "mainnet batch verify", null, null, null)`,
  );
  varietyId = BigInt(addVarOut.replace(/\D/g, "") || "1");
  ok(`addVariety → id ${varietyId}`);
} catch (e) {
  fail(`addVariety: ${e.message?.slice(0, 200)}`);
}

try {
  const trayOut = dfx(
    "createNimsTray",
    `("Mainnet Batch Verify ${Date.now()}", ${BigInt(Date.now()) * 1_000_000n} : int, opt (${varietyId} : nat))`,
  );
  trayId = BigInt(trayOut.match(/(\d+)/)?.[1] ?? "0");
  ok(`createNimsTray → id ${trayId}`);
} catch (e) {
  fail(`createNimsTray: ${e.message?.slice(0, 200)}`);
}

// 4. NIMS tray read
console.log("\n4. NIMS tray read (getTrayGrid on new tray)…");
try {
  const grid = dfx("getTrayGrid", `(${trayId} : nat)`);
  const cells = (grid.match(/cellPosition/g) || []).length;
  if (cells >= 72) ok(`getTrayGrid → ${cells} cells`);
  else fail(`getTrayGrid expected 72 cells, got ${cells}`);
} catch (e) {
  fail(`getTrayGrid: ${e.message?.slice(0, 200)}`);
}

// 5. registerPlant single cell
console.log("\n5. registerPlant (single cell 1)…");
let singleNft = null;
let singlePlant = null;
try {
  const out = dfx(
    "registerPlant",
    `(record {
      tray_id = ${trayId} : nat;
      variety_id = ${varietyId} : nat;
      container_size = opt variant { Cell72 };
      origin = opt "Port Charlotte, FL";
      planting_date = null;
      notes = "mainnet single smoke";
      genetics = "single smoke";
      common_name = null;
      latin_name = null;
    }, 1 : nat, null)`,
  );
  singleNft = parseNat(out.match(/nft_token_id\s*=\s*(\d[\d_]*)/)?.[1]);
  singlePlant = parseNat(out.match(/plant_id\s*=\s*(\d[\d_]*)/)?.[1]);
  ok(`registerPlant cell 1 → plant ${singlePlant}, NFT ${singleNft}`);
} catch (e) {
  fail(`registerPlant: ${e.message?.slice(0, 300)}`);
}

// 6. registerPlantBatch 6 cells (cells 2-7; cell 1 already registered)
console.log("\n6. registerPlantBatch (6 cells: 2–7)…");
const batchCells = [2, 3, 4, 5, 6, 7];
const cellsArg = batchCells
  .map((n) => `record { cell_index = ${n} : nat; overrides = null }`)
  .join("; ");
let batchOut = "";
try {
  batchOut = dfx(
    "registerPlantBatch",
    `(record {
      tray_id = ${trayId} : nat;
      variety_id = ${varietyId} : nat;
      container_size = opt variant { Cell72 };
      origin = opt "Port Charlotte, FL";
      planting_date = null;
      notes = "mainnet batch verify";
      genetics = "batch smoke";
      common_name = null;
      latin_name = null;
    }, vec { ${cellsArg} })`,
  );
  const succeeded = parseNat(batchOut.match(/succeeded\s*=\s*(\d+)/)?.[1] ?? "0");
  const failed = parseNat(batchOut.match(/failed\s*=\s*(\d+)/)?.[1] ?? "0");
  const skipped = parseNat(batchOut.match(/skipped\s*=\s*(\d+)/)?.[1] ?? "0");
  console.log(`  succeeded=${succeeded} failed=${failed} skipped=${skipped}`);
  if (succeeded === 6n && failed === 0n) {
    ok("6-cell batch succeeded");
  } else {
    fail(`Expected succeeded=6 failed=0, got succeeded=${succeeded} failed=${failed}`);
  }
  const nftMatches = [...batchOut.matchAll(/nft_token_id\s*=\s*opt\s*\((\d[\d_]*)/g)].map((m) =>
    BigInt(m[1].replace(/_/g, "")),
  );
  if (nftMatches.length >= 6) {
    ok(`Batch NFT IDs: ${nftMatches.join(", ")}`);
  }
} catch (e) {
  fail(`registerPlantBatch: ${e.message?.slice(0, 300)}`);
}

// 7. Verify grid: 7 cells with NFT, sequential positions, shared tray_id
console.log("\n7. getTrayGrid verification (7 plants + NFTs)…");
try {
  const grid = dfx("getTrayGrid", `(${trayId} : nat)`);
  const nftIds = extractNftIds(grid);
  const positions = extractCellPositions(grid);
  const trayMatches = (grid.match(new RegExp(`trayId = ${trayId}`)) || []).length;

  console.log(`  Cells with nftTokenId: ${nftIds.length}`);
  console.log(`  NFT token IDs: ${nftIds.sort((a, b) => (a < b ? -1 : 1)).join(", ")}`);

  if (nftIds.length >= 7) ok("7 cells show nftTokenId in grid");
  else fail(`Expected ≥7 NFT cells in grid, got ${nftIds.length}`);

  // Check sequential NFT IDs if we have single + batch
  if (singleNft && nftIds.length >= 7) {
    const sorted = [...nftIds].sort((a, b) => (a < b ? -1 : 1));
    let sequential = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1n) sequential = false;
    }
    if (sequential) ok("NFT token IDs are sequential");
    else console.log("  (NFT IDs not strictly sequential — may reflect prior mainnet mints)");
  }
} catch (e) {
  fail(`getTrayGrid verify: ${e.message?.slice(0, 200)}`);
}

// 8. Existing trays unchanged
console.log("\n8. Existing plants regression check…");
if (existingTrayId && existingGridBefore) {
  try {
    const gridAfter = dfx("getTrayGrid", `(${existingTrayId} : nat)`);
    const nftsBefore = extractNftIds(existingGridBefore).sort((a, b) => (a < b ? -1 : 1)).join(",");
    const nftsAfter = extractNftIds(gridAfter).sort((a, b) => (a < b ? -1 : 1)).join(",");
    if (nftsBefore === nftsAfter && existingGridBefore.length === gridAfter.length) {
      ok(`Existing tray ${existingTrayId} unchanged (${extractNftIds(existingGridBefore).length} NFT cells)`);
    } else {
      fail(`Existing tray ${existingTrayId} changed after deploy/batch test`);
    }
  } catch (e) {
    fail(`Regression grid compare: ${e.message?.slice(0, 200)}`);
  }
} else {
  console.log("  (skipped — no pre-existing tray for deploy identity)");
}

// Final cycle balance
console.log("\n9. Post-test cycle balance…");
const statusAfter = execSync(
  `DFX_WARNING=-mainnet_plaintext_identity dfx canister --network ${NETWORK} status backend`,
  { encoding: "utf8" },
);
const balAfter = statusAfter.match(/Balance: ([\d_]+)/)?.[1]?.replace(/_/g, "") ?? "?";
console.log(`  Balance after tests: ${balAfter} cycles`);
const spent = balance - BigInt(balAfter.replace(/\D/g, "") || "0");
console.log(`  Cycles consumed by this test run: ~${spent.toLocaleString()}`);

console.log("\n=== SUMMARY ===");
if (failures.length === 0) {
  console.log("ALL PASS");
  process.exit(0);
} else {
  console.log(`FAIL (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
