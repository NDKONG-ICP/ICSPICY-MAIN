#!/usr/bin/env node
/**
 * HTS collection create + batch mint (testnet dry-run by default).
 *
 *   node scripts/hedera-drop-mint.js --dry-run
 *   node scripts/hedera-drop-mint.js --network testnet
 *
 * Requires CAPTAIN_HEDERA account funded + HEDERA_OPERATOR_ID matching account.
 */

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrivateKey } from "@hashgraph/sdk";
import {
  CAPTAIN_HEDERA_KEY_PATH,
  createHtsCollection,
  fetchAccountBalanceHbar,
  mintHtsBatch,
} from "../src/clients/hedera.js";
import { uploadPublicJson } from "../src/lib/bonsai-drop/publish-assets.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, "..", "data", "hedera-drop", "manifest.json");
const DRY = process.argv.includes("--dry-run");
const network = process.argv.includes("--network")
  ? process.argv[process.argv.indexOf("--network") + 1]
  : "testnet";

const FRONTEND = process.env.FRONTEND_CANISTER_ID?.trim() || "7rukv-hqaaa-aaaao-ba6ma-cai";
const META_BASE = `https://${FRONTEND}.icp0.io/hedera/metadata`;
/** Leave enough HBAR to cover one mint transaction's max fee. */
const FLOOR_RESERVE_HBAR = 6;

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const keyRecord = JSON.parse(readFileSync(CAPTAIN_HEDERA_KEY_PATH, "utf8"));
  const operatorId = keyRecord.accountId || process.env.HEDERA_OPERATOR_ID;
  if (!operatorId && !DRY) {
    throw new Error("Set accountId in captain key file or HEDERA_OPERATOR_ID");
  }
  const operatorKey = PrivateKey.fromString(keyRecord.privateKey);

  if (DRY) {
    console.log(
      `[hedera-drop-mint] dry-run: would mint ${manifest.tokenIds.length} NFTs on ${network}`,
    );
    console.log(`[hedera-drop-mint] sample metadata: ${META_BASE}/1.json`);
    return;
  }

  if (!manifest.htsTokenId) {
    const bal = await fetchAccountBalanceHbar(operatorId, network);
    if (bal != null && bal < FLOOR_RESERVE_HBAR + 14) {
      throw new Error(`Need more HBAR to create the collection (balance ${bal})`);
    }
    const { tokenId, supplyKey } = await createHtsCollection({
      name: "IC SPICY Hedera Drop",
      symbol: "ICSPICYH",
      maxSupply: manifest.tokenIds.length,
      treasuryAccountId: operatorId,
      operatorId,
      operatorKey,
      network,
    });
    manifest.htsTokenId = tokenId;
    manifest.supplyKey = supplyKey;
    persistMint(manifest);
    console.log(`[hedera-drop-mint] created token ${tokenId}`);
  }

  manifest.mirrors = manifest.mirrors ?? [];
  const batchSize = 10;
  let cursor = manifest.mirrors.length;
  for (; cursor < manifest.tokenIds.length; ) {
    const slice = manifest.tokenIds.slice(cursor, cursor + batchSize);
    const bal = await fetchAccountBalanceHbar(operatorId, network);
    if (bal != null && bal < FLOOR_RESERVE_HBAR) {
      console.log(
        `[hedera-drop-mint] pause at ${manifest.mirrors.length} serials — balance ${bal.toFixed(2)} HBAR. Send more HBAR to ${operatorId} and re-run.`,
      );
      break;
    }
    const cids = [];
    for (let j = 0; j < slice.length; j += 1) {
      const icToken = slice[j];
      const meta = {
        name: `IC SPICY #${icToken}`,
        description: `Hedera mirror of IC SPICY token ${icToken}`,
        image: `https://gawk3-2qaaa-aaaao-ba4sa-cai.icp0.io/images/nft_${icToken}.png`,
        attributes: [
          { trait_type: "icspicy_token_id", value: String(icToken) },
          { trait_type: "rarity", value: manifest.rarity[String(icToken)] ?? "Unknown" },
        ],
      };
      const path = `/hedera/metadata/ic-${icToken}.json`;
      if (!process.argv.includes("--skip-upload")) {
        await uploadPublicJson(path, meta);
      }
      const url = `${META_BASE}/ic-${icToken}.json`;
      cids.push(url.slice(0, 100));
    }
    const serials = await mintHtsBatch({
      tokenId: manifest.htsTokenId,
      metadataCids: cids,
      supplyKeyStr: manifest.supplyKey,
      operatorId,
      operatorKey: keyRecord.privateKey,
      network,
    });
    if (serials.length !== slice.length) {
      throw new Error(`mint returned ${serials.length} serials for ${slice.length} tokens`);
    }
    manifest.mirrors.push(
      ...slice.map((icTokenId, j) => ({
        icTokenId: Number(icTokenId),
        serial: Number(serials[j]),
      })),
    );
    manifest.phases.mirrored = manifest.phases.mirrored ?? [];
    manifest.phases.mirrored.push(cursor);
    manifest.lastMintSerials = serials;
    cursor += slice.length;
    persistMint(manifest);
    console.log(`[hedera-drop-mint] minted ${manifest.mirrors.length}/${manifest.tokenIds.length}`);
  }
}

function persistMint(manifest) {
  const current = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const locked = current.phases?.locked ?? [];
  current.htsTokenId = manifest.htsTokenId;
  current.supplyKey = manifest.supplyKey;
  current.mirrors = manifest.mirrors;
  current.lastMintSerials = manifest.lastMintSerials;
  current.phases = current.phases ?? {};
  current.phases.mirrored = manifest.phases?.mirrored ?? [];
  current.phases.locked = locked;
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(current, null, 2)}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
