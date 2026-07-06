#!/usr/bin/env node
/**
 * merge-vendor-varieties.mjs — merge vendor catalogs into NIMS variety system.
 *
 * Usage:
 *   node scripts/merge-vendor-varieties.mjs --network ic [--dry-run] [--execute]
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { cleanSources, sanitizeBreeder } from "./lib/provenance-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];
const dryRun = args.includes("--dry-run") || !args.includes("--execute");

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();

const VarietySource = IDL.Record({ vendorName: IDL.Text, url: IDL.Text });
const VarietyProvenance = IDL.Record({
  breeder: IDL.Opt(IDL.Text),
  breederLocation: IDL.Opt(IDL.Text),
  origin: IDL.Opt(IDL.Text),
  species: IDL.Opt(IDL.Text),
  heatClass: IDL.Opt(IDL.Text),
  sources: IDL.Vec(VarietySource),
  photoKey: IDL.Opt(IDL.Text),
  photoCredit: IDL.Opt(IDL.Text),
});
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
      [I.Text, I.Text, I.Nat, I.Nat, I.Text, I.Opt(I.Text), I.Opt(I.Nat), I.Opt(I.Nat)],
      [I.Nat],
      [],
    ),
    setVarietyProvenance: I.Func([I.Nat, VarietyProvenance], [I.Bool], []),
  });

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function heatToScoville(heatClass, scoville) {
  if (scoville != null && scoville > 0) {
    const max = scoville;
    const min = Math.max(0, Math.floor(max * 0.7));
    return { min, max };
  }
  const h = (heatClass ?? "").toLowerCase();
  if (h.includes("super")) return { min: 800_000, max: 2_200_000 };
  if (h.includes("very")) return { min: 100_000, max: 500_000 };
  if (h.includes("hot")) return { min: 20_000, max: 100_000 };
  if (h.includes("medium")) return { min: 2_500, max: 20_000 };
  if (h.includes("mild")) return { min: 0, max: 2_500 };
  return { min: 0, max: 0 };
}

function optText(v) {
  return v != null && String(v).trim() ? [String(v).trim()] : [];
}

function trunc(s, max) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max);
}

function buildProvenance(row) {
  const rawSources =
    row.sources?.length > 0
      ? row.sources
      : row.sourceUrl
        ? [{ vendorName: row.vendorName ?? "Vendor", url: row.sourceUrl }]
        : [];
  const sources = cleanSources(
    rawSources.map((s) => ({
      vendorName: trunc(s.vendorName, 120) ?? "Vendor",
      url: trunc(s.url, 500) ?? "",
    })),
  );
  const breeder = sanitizeBreeder(trunc(row.breeder, 200));
  return {
    breeder: optText(breeder),
    breederLocation: optText(
      trunc(
        row.breederLocation ??
          (row.breeder?.includes("South Florida") ? "South Florida, USA" : null),
        200,
      ),
    ),
    origin: optText(trunc(row.origin, 200)),
    species: optText(trunc(row.species, 120)),
    heatClass: optText(trunc(row.heatClass, 40)),
    sources,
    photoKey: [],
    photoCredit: [],
  };
}

async function loadVendorFiles() {
  const files = [
    ["Towns-End", path.join(ROOT, "data", "vendor-townsend.json")],
    ["Super Hot Chiles", path.join(ROOT, "data", "vendor-superhotchiles.json")],
  ];
  const all = [];
  for (const [vendorName, fp] of files) {
    try {
      const rows = JSON.parse(await fs.readFile(fp, "utf8"));
      for (const row of rows) {
        all.push({ ...row, vendorName });
      }
      console.log(`  loaded ${rows.length} from ${vendorName}`);
    } catch {
      console.warn(`  ⚠ missing ${fp}`);
    }
  }
  return all;
}

async function poolMap(items, fn, concurrency = 8) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

async function main() {
  console.log(`Merge vendor varieties — ${dryRun ? "DRY RUN" : "EXECUTE"} (${network})`);

  const vendorRows = await loadVendorFiles();
  const byNorm = new Map();
  for (const row of vendorRows) {
    const key = normalizeName(row.name);
    if (!key) continue;
    if (!byNorm.has(key)) byNorm.set(key, { ...row, sources: [] });
    const entry = byNorm.get(key);
    const src =
      row.sources?.[0] ??
      (row.sourceUrl ? { vendorName: row.vendorName, url: row.sourceUrl } : null);
    if (src) entry.sources.push(src);
    if (!entry.species && row.species) entry.species = row.species;
    if (!entry.heatClass && row.heatClass) entry.heatClass = row.heatClass;
    if (!entry.breeder && row.breeder) entry.breeder = sanitizeBreeder(row.breeder) ?? row.breeder;
    if (!entry.origin && row.origin) entry.origin = row.origin;
    if (row.isOriginalCultivar) entry.isOriginalCultivar = true;
    if (row.scoville && !entry.scoville) entry.scoville = row.scoville;
  }
  const deduped = [...byNorm.values()];
  console.log(`Vendor unique names: ${deduped.length}`);

  const identityName = execSync("dfx identity whoami").toString().trim();
  const pem = await fs.readFile(
    path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem"),
    "utf8",
  );
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();

  const backend = Actor.createActor(backendIDL, { agent, canisterId: BACKEND });
  const existing = await backend.listVarieties();
  const nameToId = new Map(
    existing.map((v) => [normalizeName(v.name), v.id]),
  );

  let matched = 0;
  let wouldCreate = 0;
  const tasks = [];

  for (const row of deduped) {
    const key = normalizeName(row.name);
    const matchId = nameToId.get(key);
    if (matchId != null) matched++;
    else wouldCreate++;
    tasks.push({ row, matchId, key });
  }

  console.log(`Existing catalog: ${existing.length}`);
  console.log(`Matched: ${matched}, New: ${wouldCreate}`);

  if (dryRun) {
    console.log("\nDry run complete. Re-run with --execute to apply.");
    return;
  }

  let created = 0;
  let provenanceSet = 0;

  await poolMap(tasks, async ({ row, matchId }) => {
    let varietyId = matchId;
    const { min, max } = heatToScoville(row.heatClass, row.scoville);
    const species = row.species ?? "Capsicum spp.";
    if (varietyId == null) {
      varietyId = await backend.addVariety(
        row.name,
        species,
        BigInt(min),
        BigInt(max),
        "",
        [],
        [],
        [],
      );
      nameToId.set(normalizeName(row.name), varietyId);
      created++;
    }
    const prov = buildProvenance(row);
    if (prov.sources.length === 0) {
      console.warn(`  skip ${row.name}: no valid sources`);
      return;
    }
    try {
      const ok = await backend.setVarietyProvenance(varietyId, prov);
      if (ok) provenanceSet++;
    } catch (e) {
      console.warn(`  ⚠ provenance failed for ${row.name}: ${e.message?.slice(0, 120)}`);
    }
  }, 8);

  const finalList = await backend.listVarieties();
  console.log(`\n✓ Created ${created} varieties, set provenance on ${provenanceSet}`);
  console.log(`Final catalog size: ${finalList.length}`);
  console.log(
    "\nNext: refresh SpicyAI variety knowledge:\n  node scripts/upload-variety-knowledge.mjs --network ic",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
