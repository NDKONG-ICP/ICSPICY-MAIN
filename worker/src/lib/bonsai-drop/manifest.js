import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BONSAI_COLLECTION_ID,
  CAPTAIN_PRINCIPAL,
  DROP_PRICE_E8S,
  DROP_SIZE,
} from "./constants.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const MANIFEST_DIR = join(HERE, "..", "..", "..", "data", "bonsai-drop");
export const MANIFEST_PATH = join(MANIFEST_DIR, "manifest.json");

export function emptyManifest() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    seedHex: "",
    seedHash: "",
    eligibleCount: 0,
    tokenIds: [],
    rarity: {},
    priceE8s: Number(DROP_PRICE_E8S),
    seller: CAPTAIN_PRINCIPAL,
    collectionId: Number(BONSAI_COLLECTION_ID),
    phases: {
      transferred: [],
      approved: [],
      listings: {},
    },
  };
}

export function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

export function saveManifest(manifest) {
  mkdirSync(MANIFEST_DIR, { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function assertManifestReady(manifest) {
  if (!manifest?.tokenIds?.length) {
    throw new Error(`No manifest at ${MANIFEST_PATH} — run bonsai-drop-select.js first`);
  }
  if (manifest.tokenIds.length !== DROP_SIZE) {
    throw new Error(
      `Manifest has ${manifest.tokenIds.length} tokens, expected ${DROP_SIZE}`,
    );
  }
}
