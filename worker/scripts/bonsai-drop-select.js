#!/usr/bin/env node
/**
 * Draw 888 random non-PepperHead pool tokens for the Bonsai Bazaar drop.
 *
 *   node scripts/bonsai-drop-select.js
 *   node scripts/bonsai-drop-select.js --force
 *   node scripts/bonsai-drop-select.js --dry-run
 */

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { HttpAgent } from "@dfinity/agent";
import { Actor } from "@dfinity/agent";
import {
  BONSAI_COLLECTION_ID,
  CAPTAIN_PRINCIPAL,
  DROP_SIZE,
  ICRC7_BATCH,
  ICSPICY_BACKEND,
  isEligiblePlantPoolToken,
  isPepperHeadToken,
} from "../src/lib/bonsai-drop/constants.js";
import {
  emptyManifest,
  loadManifest,
  saveManifest,
  MANIFEST_PATH,
} from "../src/lib/bonsai-drop/manifest.js";
import { seedHashHex, seededShuffle } from "../src/lib/bonsai-drop/prng.js";
import { poolAccount } from "../src/lib/bonsai-drop/actors.js";
import { rarityFromMetadataEntries } from "../src/lib/bonsai-drop/metadata.js";
import { icspicyLedgerIdlFactory } from "../src/idl/icspicy-ledger.js";
import {
  BONSAI_MARKETPLACE,
  marketplaceIdlFactory,
} from "../src/clients/bonsai.js";

const FORCE = process.argv.includes("--force");
const DRY = process.argv.includes("--dry-run");

async function main() {
  const existing = loadManifest();
  if (existing?.tokenIds?.length && !FORCE) {
    console.log(
      `[bonsai-drop-select] manifest already has ${existing.tokenIds.length} tokens at ${MANIFEST_PATH}`,
    );
    console.log("[bonsai-drop-select] use --force to re-draw");
    process.exit(0);
  }

  const host = process.env.IC_HOST?.trim() || "https://icp-api.io";
  const agent = await HttpAgent.create({ host });
  const ledger = Actor.createActor(icspicyLedgerIdlFactory, {
    agent,
    canisterId: ICSPICY_BACKEND,
  });
  const marketplace = Actor.createActor(marketplaceIdlFactory, {
    agent,
    canisterId: BONSAI_MARKETPLACE,
  });

  const listed = new Set();
  const listings = await marketplace.listCollectionListings(BONSAI_COLLECTION_ID);
  for (const row of listings) {
    if (row.active) listed.add(Number(row.tokenId));
  }
  console.log(`[bonsai-drop-select] active listings on collection 1: ${listed.size}`);

  const pool = poolAccount();
  const owned = [];
  let offset = 0;
  const take = 1000;
  for (;;) {
    const page = await ledger.icrc7_tokens_of(pool, [offset], [take]);
    if (!page.length) break;
    for (const id of page) {
      const n = Number(id);
      if (!isEligiblePlantPoolToken(n)) continue;
      if (isPepperHeadToken(n)) continue;
      if (listed.has(n)) continue;
      owned.push(n);
    }
    if (page.length < take) break;
    offset += page.length;
  }

  console.log(`[bonsai-drop-select] eligible in pool: ${owned.length}`);
  if (owned.length < DROP_SIZE) {
    throw new Error(`Need ${DROP_SIZE} eligible tokens, found ${owned.length}`);
  }

  const seed = randomBytes(32);
  const shuffled = seededShuffle(owned, seed);
  const tokenIds = shuffled.slice(0, DROP_SIZE);

  const rarity = {};
  for (let i = 0; i < tokenIds.length; i += ICRC7_BATCH) {
    const batch = tokenIds.slice(i, i + ICRC7_BATCH);
    const meta = await ledger.icrc7_token_metadata(batch.map((t) => BigInt(t)));
    for (let j = 0; j < batch.length; j += 1) {
      const entries = meta[j]?.[0];
      rarity[String(batch[j])] = rarityFromMetadataEntries(entries);
    }
    process.stdout.write(`\r[bonsai-drop-select] rarity ${Math.min(i + ICRC7_BATCH, tokenIds.length)}/${tokenIds.length}`);
  }
  console.log("");

  const manifest = existing ?? emptyManifest();
  manifest.createdAt = new Date().toISOString();
  manifest.seedHex = seed.toString("hex");
  manifest.seedHash = seedHashHex(seed);
  manifest.eligibleCount = owned.length;
  manifest.tokenIds = tokenIds;
  manifest.rarity = rarity;
  manifest.seller = CAPTAIN_PRINCIPAL;
  manifest.collectionId = Number(BONSAI_COLLECTION_ID);
  manifest.phases = { transferred: [], approved: [], listings: {} };

  if (DRY) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  saveManifest(manifest);
  console.log(`[bonsai-drop-select] wrote ${MANIFEST_PATH}`);
  console.log(`[bonsai-drop-select] seedHash=${manifest.seedHash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
