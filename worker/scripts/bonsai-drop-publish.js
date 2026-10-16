#!/usr/bin/env node
/**
 * Publish drop manifest to frontend asset canister (/bonsai-drop/).
 *
 *   node scripts/bonsai-drop-publish.js
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { MANIFEST_PATH } from "../src/lib/bonsai-drop/manifest.js";
import { uploadPublicJson } from "../src/lib/bonsai-drop/publish-assets.js";

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const index = {
    version: 1,
    updatedAt: new Date().toISOString(),
    drop: "bonsai-888",
    collectionId: manifest.collectionId,
    priceE8s: manifest.priceE8s,
    seller: manifest.seller,
    seedHash: manifest.seedHash,
    tokenCount: manifest.tokenIds?.length ?? 0,
    transferred: manifest.phases?.transferred?.length ?? 0,
    listed: Object.keys(manifest.phases?.listings ?? {}).length,
  };

  await uploadPublicJson("/bonsai-drop/manifest.json", manifest);
  await uploadPublicJson("/bonsai-drop/index.json", index);
  console.log("[bonsai-drop-publish] uploaded /bonsai-drop/manifest.json and index.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
