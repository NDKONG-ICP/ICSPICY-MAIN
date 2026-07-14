#!/usr/bin/env node
/**
 * Upload build/badges/*.webp to nft_assets at /badges/{badgeType}.webp
 *
 * Usage:
 *   node scripts/build-badge-assets.mjs
 *   node scripts/upload-badge-assets.mjs --network ic --canister gawk3-2qaaa-aaaao-ba4sa-cai
 */
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HttpAgent } from "@dfinity/agent";
import { AssetManager } from "@dfinity/assets";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BADGES_DIR = path.join(ROOT, "build/badges");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return !v || v.startsWith("--") ? true : v;
}

function required(name) {
  const v = arg(name);
  if (v === undefined || v === true) {
    console.error(`ERROR: --${name} <value> is required`);
    process.exit(1);
  }
  return v;
}

const network = required("network");
const canisterId = required("canister");
const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://ic0.app";

const identityPath =
  arg("identity-path") ??
  `${process.env.HOME}/.config/dfx/identity/${arg("identity-name") ?? "ic_deploy"}/identity.pem`;

let pem;
try {
  pem = readFileSync(identityPath, "utf8");
} catch {
  console.error(`ERROR: cannot read identity PEM from: ${identityPath}`);
  process.exit(1);
}

const identity = Secp256k1KeyIdentity.fromPem(pem);
const agent = await HttpAgent.create({ identity, host, shouldFetchRootKey: isLocal });
const assetManager = new AssetManager({ canisterId, agent });

const files = (await readdir(BADGES_DIR)).filter((f) => f.endsWith(".webp"));
if (files.length === 0) {
  console.error(`ERROR: no .webp files in ${BADGES_DIR} — run build-badge-assets.mjs first`);
  process.exit(1);
}

console.log("Checking existing assets…");
const existing = new Set((await assetManager.list()).map((a) => a.key));

const batch = assetManager.batch();
let queued = 0;

for (const file of files.sort()) {
  const assetKey = `/badges/${file}`;
  if (existing.has(assetKey)) {
    console.log(`SKIP (exists): ${assetKey}`);
    continue;
  }
  const content = await readFile(path.join(BADGES_DIR, file));
  await batch.store(content, {
    fileName: file,
    path: "/badges",
    contentType: "image/webp",
    headers: [
      ["Cache-Control", "public, max-age=31536000, immutable"],
      ["Access-Control-Allow-Origin", "*"],
    ],
  });
  console.log(`QUEUE: ${assetKey} (${(content.byteLength / 1024).toFixed(1)} KB)`);
  queued += 1;
}

if (queued === 0) {
  console.log("Nothing to upload.");
  process.exit(0);
}

await batch.commit();
console.log(`\nUpload complete: ${queued} badge asset(s).`);
