#!/usr/bin/env node
// Bootstrap Capsaicin on BonsaiOS: bookmark Canopy principal, CRM, mint Orbit Spot.
//
//   node scripts/bonsai-bootstrap.js
//   node scripts/bonsai-bootstrap.js --status
//   node scripts/bonsai-bootstrap.js --crm-only
//   node scripts/bonsai-bootstrap.js --mint-only
//
// Limits (hard): 1 Orbit Spot, unit price ≤ 0.05 ICP (phase price).

import "dotenv/config";
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCaptainIdentity, loadMnemonicFromEnv } from "../src/identity.js";
import {
  createBonsaiClient,
  ORBIT_SPOTS_COLLECTION_ID,
  ORBIT_SPOTS_PHASE_ID,
  ORBIT_SPOTS_MINT_E8S,
  BONSAI_REGISTRY,
  BONSAI_LAUNCHPAD,
  BONSAI_TREASURY,
  BONSAI_CANOPY_UI,
} from "../src/clients/bonsai.js";
import {
  buildWalletBook,
  formatWalletBook,
  canopyNeedsFunding,
} from "../src/lib/wallets.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(HERE, "..", ".env");
const STATUS_ONLY = process.argv.includes("--status");
const CRM_ONLY = process.argv.includes("--crm-only");
const MINT_ONLY = process.argv.includes("--mint-only");

function ensureEnvCanopyPrincipal(principalText) {
  if (!existsSync(ENV_PATH)) {
    console.warn(`[bonsai] no .env at ${ENV_PATH} — set CANOPY_WALLET_PRINCIPAL manually`);
    return;
  }
  const raw = readFileSync(ENV_PATH, "utf8");
  if (/^CANOPY_WALLET_PRINCIPAL=/m.test(raw)) {
    const next = raw.replace(
      /^CANOPY_WALLET_PRINCIPAL=.*$/m,
      `CANOPY_WALLET_PRINCIPAL=${principalText}`,
    );
    if (next !== raw) writeFileSync(ENV_PATH, next);
    return;
  }
  appendFileSync(
    ENV_PATH,
    `\n# Capsaicin Canopy / BonsaiOS plain principal (same as operating until separate Canopy login exists)\nCANOPY_WALLET_PRINCIPAL=${principalText}\n`,
  );
}

async function main() {
  const identity = await loadCaptainIdentity(loadMnemonicFromEnv());
  const principalText = identity.getPrincipal().toText();
  ensureEnvCanopyPrincipal(principalText);
  process.env.CANOPY_WALLET_PRINCIPAL = principalText;

  const book = buildWalletBook({
    captainPrincipal: principalText,
    secrets: {
      canopy_wallet_principal: principalText,
      ambassador_sweep_principal: process.env.AMBASSADOR_SWEEP_PRINCIPAL,
    },
  });
  console.log(formatWalletBook(book));
  console.log(
    `\n[bonsai] Canopy UI: https://${BONSAI_CANOPY_UI}.icp0.io/\n` +
      `[bonsai] Registry: ${BONSAI_REGISTRY}\n` +
      `[bonsai] Launchpad: ${BONSAI_LAUNCHPAD} · Treasury: ${BONSAI_TREASURY}\n` +
      `[bonsai] Orbit Spots collection ${ORBIT_SPOTS_COLLECTION_ID} phase ${ORBIT_SPOTS_PHASE_ID} @ ${ORBIT_SPOTS_MINT_E8S} e8s\n`,
  );
  if (canopyNeedsFunding(book)) {
    console.log("[bonsai] Canopy ≠ operating — fund Canopy before mint (not needed: same principal).");
  }

  const client = await createBonsaiClient({ identity });
  const bal = await client.icpBalance();
  const orbitBal = await client.orbitBalance();
  console.log(`[bonsai] ICP balance: ${bal} e8s (${Number(bal) / 1e8} ICP)`);
  console.log(`[bonsai] Orbit Spots held: ${orbitBal}`);

  let crm = await client.getCrmStatus();
  console.log(`[bonsai] CRM before: ${JSON.stringify(crm, (_, v) => (typeof v === "bigint" ? v.toString() : v))}`);

  if (STATUS_ONLY) return;

  if (!MINT_ONLY) {
    console.log("[bonsai] Saving registry CRM profile…");
    crm = await client.saveCaptainProfile();
    console.log(
      `[bonsai] CRM after: ${JSON.stringify(crm, (_, v) => (typeof v === "bigint" ? v.toString() : v))}`,
    );
  }

  if (CRM_ONLY) return;

  if (orbitBal >= 1n) {
    console.log("[bonsai] Already hold ≥1 Orbit Spot — skipping mint (limit: 1).");
    return;
  }

  if (bal < ORBIT_SPOTS_MINT_E8S + 10_000n) {
    throw new Error(
      `Need ≥ ${ORBIT_SPOTS_MINT_E8S + 10_000n} e8s for mint+fee; have ${bal}`,
    );
  }

  console.log("[bonsai] Minting 1× Orbit Spot (hard limit)…");
  const minted = await client.mintPhase({
    phaseId: ORBIT_SPOTS_PHASE_ID,
    quantity: 1n,
    maxQty: 1n,
    maxUnitE8s: ORBIT_SPOTS_MINT_E8S,
  });
  console.log(
    `[bonsai] Minted: ${JSON.stringify(minted, (_, v) => (typeof v === "bigint" ? v.toString() : v))}`,
  );
  console.log(`[bonsai] Orbit Spots held now: ${await client.orbitBalance()}`);
  console.log(`[bonsai] ICP left: ${await client.icpBalance()} e8s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
