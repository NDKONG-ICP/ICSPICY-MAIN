#!/usr/bin/env node
/**
 * Draw 888 pool tokens for Hedera mirror (excludes PepperHeads + Bonsai manifest).
 *
 *   node scripts/hedera-drop-select.js
 *   node scripts/hedera-drop-select.js --force
 */

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { HttpAgent, Actor } from "@dfinity/agent";
import { loadManifest as loadBonsaiManifest } from "../src/lib/bonsai-drop/manifest.js";
import {
  DROP_SIZE,
  ICRC7_BATCH,
  ICSPICY_BACKEND,
  isEligiblePlantPoolToken,
  isPepperHeadToken,
} from "../src/lib/bonsai-drop/constants.js";
import { seedHashHex, seededShuffle } from "../src/lib/bonsai-drop/prng.js";
import { poolAccount } from "../src/lib/bonsai-drop/actors.js";
import { rarityFromMetadataEntries } from "../src/lib/bonsai-drop/metadata.js";
import { icspicyLedgerIdlFactory } from "../src/idl/icspicy-ledger.js";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_DIR = join(HERE, "..", "data", "hedera-drop");
const MANIFEST_PATH = join(MANIFEST_DIR, "manifest.json");
const FORCE = process.argv.includes("--force");

async function main() {
  if (existsSync(MANIFEST_PATH) && !FORCE) {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    console.log(`[hedera-drop-select] manifest exists (${m.tokenIds?.length} tokens)`);
    return;
  }

  const bonsai = loadBonsaiManifest();
  const exclude = new Set(bonsai?.tokenIds?.map(Number) ?? []);

  const host = process.env.IC_HOST?.trim() || "https://icp-api.io";
  const agent = await HttpAgent.create({ host });
  const ledger = Actor.createActor(icspicyLedgerIdlFactory, {
    agent,
    canisterId: ICSPICY_BACKEND,
  });

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
      if (exclude.has(n)) continue;
      owned.push(n);
    }
    if (page.length < take) break;
    offset += page.length;
  }

  const uniqueOwned = [...new Set(owned)];
  if (uniqueOwned.length < DROP_SIZE) {
    throw new Error(`Need ${DROP_SIZE} unique tokens, found ${uniqueOwned.length}`);
  }

  const seed = randomBytes(32);
  const tokenIds = seededShuffle(uniqueOwned, seed).slice(0, DROP_SIZE);
  const rarity = {};
  for (let i = 0; i < tokenIds.length; i += ICRC7_BATCH) {
    const batch = tokenIds.slice(i, i + ICRC7_BATCH);
    const meta = await ledger.icrc7_token_metadata(batch.map((t) => BigInt(t)));
    for (let j = 0; j < batch.length; j += 1) {
      rarity[String(batch[j])] = rarityFromMetadataEntries(meta[j]?.[0]);
    }
  }

  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    seedHex: seed.toString("hex"),
    seedHash: seedHashHex(seed),
    eligibleCount: uniqueOwned.length,
    excludedBonsai: exclude.size,
    tokenIds,
    rarity,
    phases: { locked: [], mirrored: [] },
    htsTokenId: null,
  };

  mkdirSync(MANIFEST_DIR, { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[hedera-drop-select] wrote ${MANIFEST_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
