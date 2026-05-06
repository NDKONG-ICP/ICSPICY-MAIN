#!/usr/bin/env node
// Imports the generated seed-payload.json into the stateful docs_backend canister.
//
// Prerequisites:
//   1. `dfx start --background` is running
//   2. `dfx deploy --network <NETWORK> docs_backend` has succeeded
//   3. The calling dfx identity is in the canister's admin list (deployer is auto-admin)
//   4. `node scripts/generate-docs-catalog.mjs` has been run to generate seed-payload.json
//
// Usage:
//   node scripts/spicyai-seed.mjs [--network ic|local] [--also-pdfs]
//
// Options:
//   --network ic|local   defaults to "local"
//   --also-pdfs          also upload PDF bytes (slow; only do once)

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const network = args.includes("--network")
  ? args[args.indexOf("--network") + 1]
  : "local";
const uploadPdfs = args.includes("--also-pdfs");
const identityPathOverride = args.includes("--identity-path")
  ? args[args.indexOf("--identity-path") + 1]
  : null;

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";

console.log(`Network:   ${network} (${host})`);
console.log(`Upload PDFs: ${uploadPdfs}`);

// ── Load seed payload ─────────────────────────────────────────────────────────

const seedPath = path.join(__dirname, "seed-payload.json");
let seed;
try {
  seed = JSON.parse(await fs.readFile(seedPath, "utf8"));
} catch (e) {
  console.error(`❌  Cannot read ${seedPath} — run 'node scripts/generate-docs-catalog.mjs' first.`);
  process.exit(1);
}

console.log(`Loaded seed: ${seed.documents.length} documents, ${seed.categories.length} categories`);

// ── DFX identity ──────────────────────────────────────────────────────────────

// Get current dfx identity name.
let identityName;
try {
  identityName = execSync("dfx identity whoami", { cwd: ROOT }).toString().trim();
} catch (e) {
  console.error("❌  dfx not found or not running. Make sure dfx is in your PATH.");
  process.exit(1);
}
console.log(`DFX identity: ${identityName}`);

// Load PEM file.
const pemPath = identityPathOverride ?? path.join(
  process.env.HOME,
  ".config",
  "dfx",
  "identity",
  identityName,
  "identity.pem",
);
let pem;
try {
  pem = await fs.readFile(pemPath, "utf8");
} catch (e) {
  console.error(`❌  Cannot read PEM from ${pemPath}`);
  process.exit(1);
}

const identity = Secp256k1KeyIdentity.fromPem(pem);
console.log(`Principal: ${identity.getPrincipal().toText()}`);

// ── Canister ID ────────────────────────────────────────────────────────────────

let canisterId;
try {
  canisterId = execSync(`dfx canister --network ${network} id docs_backend`, { cwd: ROOT })
    .toString()
    .trim();
} catch (e) {
  console.error(`❌  Cannot resolve docs_backend canister ID. Is it deployed to ${network}?`);
  process.exit(1);
}
console.log(`Canister ID: ${canisterId}`);

// ── IDL factory ────────────────────────────────────────────────────────────────
// Minimal IDL for the admin seeding methods.

import { IDL } from "@dfinity/candid";

const Category = IDL.Record({
  id: IDL.Text,
  name: IDL.Text,
  description: IDL.Text,
});

const DocumentRecord = IDL.Record({
  slug: IDL.Text,
  title: IDL.Text,
  subtitle: IDL.Text,
  audience: IDL.Text,
  summary: IDL.Text,
  collection: IDL.Text,
  category: IDL.Text,
  pdfPath: IDL.Text,
  markdownPath: IDL.Text,
  tags: IDL.Vec(IDL.Text),
  featured: IDL.Bool,
  sortOrder: IDL.Nat,
  wordCount: IDL.Nat,
  readingMinutes: IDL.Nat,
  pdfBytes: IDL.Nat,
});

const seedIdlFactory = ({ IDL: _IDL }) => {
  return _IDL.Service({
    seedDocuments: _IDL.Func([_IDL.Vec(DocumentRecord)], [], []),
    seedCategories: _IDL.Func([_IDL.Vec(Category)], [], []),
    seedMarkdowns: _IDL.Func([_IDL.Vec(_IDL.Tuple(_IDL.Text, _IDL.Text))], [], []),
    uploadDocumentPdf: _IDL.Func([_IDL.Text, _IDL.Vec(_IDL.Nat8)], [], []),
    isAdmin: _IDL.Func([_IDL.Principal], [_IDL.Bool], ["query"]),
    getChunkCount: _IDL.Func([], [_IDL.Nat], ["query"]),
    getManifestVersion: _IDL.Func([], [_IDL.Text], ["query"]),
  });
};

// ── Agent + actor ──────────────────────────────────────────────────────────────

const agent = new HttpAgent({ identity, host });
if (isLocal) {
  await agent.fetchRootKey();
}

const actor = Actor.createActor(seedIdlFactory, { agent, canisterId });

// ── Verify admin ───────────────────────────────────────────────────────────────

const isAdm = await actor.isAdmin(identity.getPrincipal());
if (!isAdm) {
  console.error(`❌  Principal ${identity.getPrincipal().toText()} is NOT an admin of ${canisterId}.`);
  console.error("   Call addAdmin() first from an existing admin principal.");
  process.exit(1);
}
console.log("✓  Identity is admin — proceeding with seed.");

// ── Seed documents ─────────────────────────────────────────────────────────────

console.log(`\nSeeding ${seed.documents.length} documents…`);
// Convert to Candid-compatible types (BigInt for Nat fields).
const candidDocs = seed.documents.map((d) => ({
  slug: d.slug,
  title: d.title,
  subtitle: d.subtitle,
  audience: d.audience,
  summary: d.summary,
  collection: d.collection,
  category: d.category,
  pdfPath: d.pdfPath || "",
  markdownPath: d.markdownPath || "",
  tags: d.tags,
  featured: d.featured,
  sortOrder: BigInt(d.sortOrder),
  wordCount: BigInt(d.wordCount),
  readingMinutes: BigInt(d.readingMinutes),
  pdfBytes: BigInt(d.pdfBytes),
}));
await actor.seedDocuments(candidDocs);
console.log("✓  Documents seeded.");

// ── Seed categories ────────────────────────────────────────────────────────────

console.log(`Seeding ${seed.categories.length} categories…`);
await actor.seedCategories(seed.categories);
console.log("✓  Categories seeded.");

// ── Seed markdown bodies ───────────────────────────────────────────────────────

console.log(`Seeding ${seed.markdowns.length} markdown bodies (for BM25 index)…`);
// Batch in groups of 5 to stay under the 2MB message limit.
const BATCH = 5;
for (let i = 0; i < seed.markdowns.length; i += BATCH) {
  const batch = seed.markdowns.slice(i, i + BATCH);
  await actor.seedMarkdowns(batch);
  process.stdout.write(
    `  ${Math.min(i + BATCH, seed.markdowns.length)}/${seed.markdowns.length}\r`,
  );
}
console.log("\n✓  Markdowns seeded — BM25 index built in canister.");

// ── Upload PDFs (optional) ─────────────────────────────────────────────────────

if (uploadPdfs) {
  console.log("\nUploading PDF binaries…");
  const BRAND_PACK_DIR = path.join(ROOT, "docs", "brand-pack");
  const EXPANDED_DIR = path.join(BRAND_PACK_DIR, "expanded-library");

  let uploaded = 0;
  for (const doc of seed.documents) {
    if (!doc.pdfPath) continue;
    // Derive original file path from the doc's collection and pdfPath basename.
    const basename = path.basename(doc.pdfPath);
    const srcDir = doc.collection === "brand-pack" ? BRAND_PACK_DIR : EXPANDED_DIR;
    const pdfFile = path.join(srcDir, basename);
    try {
      const data = await fs.readFile(pdfFile);
      const bytes = [...data];  // convert Buffer to Nat8 array
      await actor.uploadDocumentPdf(doc.slug, bytes);
      uploaded++;
      process.stdout.write(`  ${uploaded} PDFs uploaded (${doc.slug})\r`);
    } catch (e) {
      console.warn(`  [skip] ${doc.slug}: ${e.message}`);
    }
  }
  console.log(`\n✓  ${uploaded} PDFs uploaded.`);
}

// ── Verify ─────────────────────────────────────────────────────────────────────

const chunkCount = await actor.getChunkCount();
const version = await actor.getManifestVersion();

console.log(`\n✅  Seed complete!`);
console.log(`   Manifest version: ${version}`);
console.log(`   BM25 chunk count: ${chunkCount}`);
console.log(`\nNext: open the docs frontend and try asking SpicyAi a question.`);
