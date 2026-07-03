#!/usr/bin/env node
/**
 * Seeds the NIMS variety catalog from the garden designer's Florida plant
 * catalog (src/frontend/src/data/florida-plants.json, 385 plants).
 *
 * Prerequisites:
 *   - active dfx identity has a plaintext Secp256k1 PEM (addVariety only
 *     requires an authenticated caller, admin not needed)
 *   - `cd scripts && pnpm install` so @dfinity/* deps resolve
 *
 * Usage:
 *   node scripts/seed-nims-varieties.mjs                 # local
 *   node scripts/seed-nims-varieties.mjs --network ic    # mainnet
 *
 * Idempotency:
 *   Calls listVarieties first and skips any catalog plant whose name already
 *   exists (case-insensitive). Safe to re-run.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(
  ROOT,
  "src",
  "frontend",
  "src",
  "data",
  "florida-plants.json",
);

// ── Candid (matches src/backend/types/variety.mo) ────────────────────────────

const VarietyPublic = IDL.Record({
  id: IDL.Nat,
  name: IDL.Text,
  species: IDL.Text,
  scovilleMin: IDL.Nat,
  scovilleMax: IDL.Nat,
  description: IDL.Text,
  imageUrl: IDL.Opt(IDL.Text),
  daysToGermination: IDL.Opt(IDL.Nat),
  daysToMaturity: IDL.Opt(IDL.Nat),
  createdAt: IDL.Int,
});

const backendIDL = ({ IDL: I }) =>
  I.Service({
    listVarieties: I.Func([], [I.Vec(VarietyPublic)], ["query"]),
    addVariety: I.Func(
      [
        I.Text, // name
        I.Text, // species
        I.Nat, // scovilleMin
        I.Nat, // scovilleMax
        I.Text, // description
        I.Opt(I.Text), // imageUrl
        I.Opt(I.Nat), // daysToGermination
        I.Opt(I.Nat), // daysToMaturity
      ],
      [I.Nat],
      [],
    ),
  });

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let network = process.env.DFX_NETWORK || "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";

const CHUNK_SIZE = 8; // parallel update calls per batch

function toVarietyArgs(plant) {
  const scovilleMax = Number.isFinite(plant.scovilleMax)
    ? Math.max(0, Math.round(plant.scovilleMax))
    : 0;
  const daysToMaturity = Number.isFinite(plant.daysToHarvest)
    ? Math.max(0, Math.round(plant.daysToHarvest))
    : null;
  const typeLabel = [plant.category, plant.subcategory]
    .filter(Boolean)
    .join(" / ");
  const description = [
    plant.description,
    typeLabel ? `Type: ${typeLabel}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    plant.name,
    plant.latinName || plant.category || "Plant",
    0n,
    BigInt(scovilleMax),
    description,
    [], // imageUrl
    [], // daysToGermination
    daysToMaturity != null ? [BigInt(daysToMaturity)] : [],
  ];
}

async function main() {
  console.log(`NIMS variety seed — network: ${network} (${host})`);
  console.log(`Data file: ${DATA_PATH}`);

  const catalog = JSON.parse(await fs.readFile(DATA_PATH, "utf8"));
  if (!Array.isArray(catalog) || catalog.length === 0) {
    console.error("florida-plants.json: expected a non-empty array");
    process.exit(1);
  }

  const identityName = execSync("dfx identity whoami", { cwd: ROOT })
    .toString()
    .trim();
  const pemPath = path.join(
    process.env.HOME,
    ".config",
    "dfx",
    "identity",
    identityName,
    "identity.pem",
  );
  const pem = await fs.readFile(pemPath, "utf8");
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  console.log(`Identity: ${identityName} → ${identity.getPrincipal().toText()}`);

  const canisterId = execSync(
    `dfx canister --network ${network} id backend`,
    { cwd: ROOT },
  )
    .toString()
    .trim();
  console.log(`Backend canister: ${canisterId}`);

  const agent = new HttpAgent({ host, identity });
  if (isLocal) {
    await agent.fetchRootKey();
  }
  const actor = Actor.createActor(backendIDL, { agent, canisterId });

  const existing = await actor.listVarieties();
  const existingNames = new Set(
    existing.map((v) => v.name.trim().toLowerCase()),
  );
  console.log(`Existing varieties: ${existing.length}`);

  // Dedup against existing pool AND within the catalog itself.
  const toSeed = [];
  const seen = new Set(existingNames);
  for (const plant of catalog) {
    const key = String(plant.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    toSeed.push(plant);
  }
  const skipped = catalog.length - toSeed.length;
  console.log(`To seed: ${toSeed.length} (skipping ${skipped} already present/duplicate)`);

  let seeded = 0;
  let failed = 0;
  for (let i = 0; i < toSeed.length; i += CHUNK_SIZE) {
    const chunk = toSeed.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map((plant) => actor.addVariety(...toVarietyArgs(plant))),
    );
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        seeded += 1;
      } else {
        failed += 1;
        console.error(`  FAILED: ${chunk[idx].name} — ${r.reason?.message ?? r.reason}`);
      }
    });
    process.stdout.write(
      `\r  Progress: ${Math.min(i + CHUNK_SIZE, toSeed.length)}/${toSeed.length} (seeded ${seeded}, failed ${failed})`,
    );
  }
  console.log("");

  const finalList = await actor.listVarieties();
  console.log(
    `Done. Seeded ${seeded} new varieties, skipped ${skipped} existing, ${failed} failed. Total in catalog: ${finalList.length}.`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
