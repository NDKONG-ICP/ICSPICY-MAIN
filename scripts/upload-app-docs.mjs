#!/usr/bin/env node
// Upload IC SPICY app guide markdown files to docs_backend (incremental — does NOT wipe catalog).
//
// Usage:
//   node scripts/upload-app-docs.mjs [--network ic|local] [--verify-query "What is NIMS?"]
//
// Requires: dfx identity must be a docs_backend admin.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { IDL } from "@dfinity/candid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");

const args = process.argv.slice(2);
const network = args.includes("--network")
  ? args[args.indexOf("--network") + 1]
  : "local";
const verifyQuery = args.includes("--verify-query")
  ? args[args.indexOf("--verify-query") + 1]
  : null;

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";

/** @type {Array<{ slug: string; file: string; title: string; subtitle: string; audience: string; summary: string; collection: string; category: string; tags: string[]; featured: boolean; sortOrder: number }>} */
const MANIFEST = [
  {
    slug: "nims-guide",
    file: "nims-guide.md",
    title: "NIMS — Nursery Inventory Management System",
    subtitle: "IC SPICY's free plant tracking and NFT provenance tool",
    audience: "All users — gardeners, nursery staff, and plant buyers",
    summary:
      "NIMS tracks plant lifecycles, weather, seed banks, and tray grids. It powers IC SPICY's RWA NFT provenance — not Korean Natural Farming's Nutrient Input Management System.",
    collection: "app-guides",
    category: "app",
    tags: ["nims", "nursery", "inventory", "plants", "nft", "provenance", "tracking", "garden"],
    featured: true,
    sortOrder: 1,
  },
  {
    slug: "ic-spicy-overview",
    file: "ic-spicy-overview.md",
    title: "What is IC SPICY?",
    subtitle: "RWA e-commerce, FDACS nursery, and blockchain plant provenance",
    audience: "New visitors and community members",
    summary:
      "IC SPICY is an Internet Computer dapp connecting a Florida pepper nursery to ICRC-7 NFT provenance, shop, NIMS tracking, and SpicyAI.",
    collection: "app-guides",
    category: "app",
    tags: ["ic-spicy", "overview", "rwa", "fdacs", "nft", "nursery", "icp"],
    featured: true,
    sortOrder: 2,
  },
  {
    slug: "shop-guide",
    file: "shop-guide.md",
    title: "IC SPICY Shop Guide",
    subtitle: "How to buy plants, pay, claim QR codes, and receive NFTs",
    audience: "Customers and collectors",
    summary:
      "Browse live plants, checkout with ICP, ckBTC, Stripe, or ICPay, scan QR claims at markets, and adopt purchased plants into NIMS.",
    collection: "app-guides",
    category: "app",
    tags: ["shop", "buy", "payment", "shipping", "qr", "checkout"],
    featured: false,
    sortOrder: 3,
  },
  {
    slug: "wallet-guide",
    file: "wallet-guide.md",
    title: "IC SPICY Wallet Guide",
    subtitle: "Internet Identity, OISY/Plug connection, balances, and NFT gallery",
    audience: "Users paying with crypto or holding NFTs",
    summary:
      "Sign in with II, connect OISY or Plug for self-custody payments and NFT transfers. View ICP, ckBTC, SPICY, and your ICRC-7 gallery.",
    collection: "app-guides",
    category: "app",
    tags: ["wallet", "oisy", "plug", "icp", "nft", "internet-identity"],
    featured: false,
    sortOrder: 4,
  },
  {
    slug: "pepperhead-membership",
    file: "pepperhead-membership.md",
    title: "PepperHead Membership",
    subtitle: "888 membership NFTs — benefits, discounts, and community access",
    audience: "Collectors and early supporters",
    summary:
      "PepperHeads are 888 membership NFTs in the IC SPICY collection with shop discounts, premium SpicyAI, whitelist access, and OHSHII governance links.",
    collection: "app-guides",
    category: "token",
    tags: ["pepperhead", "membership", "nft", "discount", "dao", "community"],
    featured: true,
    sortOrder: 5,
  },
];

const APP_CATEGORY = {
  id: "app",
  name: "App Guides",
  description:
    "User guides for the IC SPICY application — NIMS, shop, wallet, membership, and how the platform works.",
};

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

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

const idlFactory = ({ IDL: _IDL }) =>
  _IDL.Service({
    upsertCategory: _IDL.Func([Category], [], []),
    upsertDocument: _IDL.Func([DocumentRecord], [], []),
    uploadDocumentMarkdown: _IDL.Func([_IDL.Text, _IDL.Text], [], []),
    isAdmin: _IDL.Func([_IDL.Principal], [_IDL.Bool], ["query"]),
    getChunkCount: _IDL.Func([], [_IDL.Nat], ["query"]),
    getManifestVersion: _IDL.Func([], [_IDL.Text], ["query"]),
    getDocument: _IDL.Func([_IDL.Text], [_IDL.Opt(DocumentRecord)], ["query"]),
    queryChunks: _IDL.Func(
      [_IDL.Text, _IDL.Nat],
      [
        _IDL.Record({
          chunks: _IDL.Vec(_IDL.Text),
          slugs: _IDL.Vec(_IDL.Text),
        }),
      ],
      ["query"],
    ),
  });

async function main() {
  console.log(`Network: ${network} (${host})`);

  const identityName = execSync("dfx identity whoami", { cwd: ROOT }).toString().trim();
  const pemPath = path.join(
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
  } catch {
    // Keyring-backed identities (no plaintext PEM on disk).
    pem = execSync(`dfx identity export ${identityName}`, { cwd: ROOT }).toString();
  }
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  console.log(`Identity: ${identityName} (${identity.getPrincipal().toText()})`);

  const canisterId = execSync(`dfx canister --network ${network} id docs_backend`, {
    cwd: ROOT,
  })
    .toString()
    .trim();
  console.log(`Canister: ${canisterId}`);

  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();

  const actor = Actor.createActor(idlFactory, { agent, canisterId });

  const isAdm = await actor.isAdmin(identity.getPrincipal());
  if (!isAdm) {
    console.error("❌  Current identity is not a docs_backend admin.");
    process.exit(1);
  }

  const chunksBefore = await actor.getChunkCount();
  console.log(`BM25 chunks before: ${chunksBefore}`);

  console.log("\nUpserting App Guides category…");
  await actor.upsertCategory(APP_CATEGORY);

  for (const entry of MANIFEST) {
    const filePath = path.join(DOCS_DIR, entry.file);
    const text = await fs.readFile(filePath, "utf8");
    const words = wordCount(text);
    const readingMinutes = Math.max(1, Math.ceil(words / 200));

    const doc = {
      slug: entry.slug,
      title: entry.title,
      subtitle: entry.subtitle,
      audience: entry.audience,
      summary: entry.summary,
      collection: entry.collection,
      category: entry.category,
      pdfPath: "",
      markdownPath: `/documents/app-guides/${entry.file}`,
      tags: entry.tags,
      featured: entry.featured,
      sortOrder: BigInt(entry.sortOrder),
      wordCount: BigInt(words),
      readingMinutes: BigInt(readingMinutes),
      pdfBytes: BigInt(0),
    };

    console.log(`\nUploading ${entry.slug} (${words} words)…`);
    await actor.upsertDocument(doc);
    await actor.uploadDocumentMarkdown(entry.slug, text);

    const stored = await actor.getDocument(entry.slug);
    if (!stored?.[0]) {
      console.error(`❌  Metadata missing after upload: ${entry.slug}`);
      process.exit(1);
    }
    console.log(`✓  ${entry.slug} indexed`);
  }

  const chunksAfter = await actor.getChunkCount();
  const version = await actor.getManifestVersion();
  console.log(`\n✅  Upload complete`);
  console.log(`   Manifest version: ${version}`);
  console.log(`   BM25 chunks: ${chunksBefore} → ${chunksAfter} (+${Number(chunksAfter) - Number(chunksBefore)})`);

  if (verifyQuery) {
    console.log(`\nBM25 retrieval test: "${verifyQuery}"`);
    const { chunks, slugs } = await actor.queryChunks(verifyQuery, BigInt(5));
    const uniqueSlugs = [...new Set(slugs)];
    console.log(`   Slugs returned: ${uniqueSlugs.join(", ") || "(none)"}`);
    console.log(`   Top chunk preview: ${(chunks[0] ?? "").slice(0, 120)}…`);
    if (!uniqueSlugs.includes("nims-guide") && verifyQuery.toLowerCase().includes("nims")) {
      console.warn("⚠️  nims-guide not in top results — check BM25 ranking.");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
