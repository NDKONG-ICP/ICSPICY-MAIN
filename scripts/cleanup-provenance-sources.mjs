#!/usr/bin/env node
/**
 * cleanup-provenance-sources.mjs — purge unauthorized sources, sanitize breeders.
 *
 * Usage:
 *   node scripts/cleanup-provenance-sources.mjs --network ic
 *   node scripts/cleanup-provenance-sources.mjs --network ic --execute
 *
 * Writes changed variety IDs to data/.provenance-cleanup-changed.json for downstream scripts.
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import {
  ALLOWED_DOMAINS,
  cleanProvenanceRecord,
  domainFromUrl,
  optText,
  provenanceFingerprint,
  rawProvenanceFingerprint,
  sanitizeBreeder,
} from "./lib/provenance-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHANGED_PATH = path.join(ROOT, "data", ".provenance-cleanup-changed.json");
const args = process.argv.slice(2);
let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];
const execute = args.includes("--execute");

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
const VarietyProvenancePublic = IDL.Record({
  variety_id: IDL.Nat,
  breeder: IDL.Opt(IDL.Text),
  breederLocation: IDL.Opt(IDL.Text),
  origin: IDL.Opt(IDL.Text),
  species: IDL.Opt(IDL.Text),
  heatClass: IDL.Opt(IDL.Text),
  sources: IDL.Vec(VarietySource),
  photoKey: IDL.Opt(IDL.Text),
  photoCredit: IDL.Opt(IDL.Text),
});

const backendIDL = ({ IDL: I }) =>
  I.Service({
    listVarietyProvenance: I.Func([I.Nat, I.Nat], [I.Vec(VarietyProvenancePublic)], ["query"]),
    setVarietyProvenance: I.Func([I.Nat, VarietyProvenance], [I.Bool], []),
  });

function countDomains(sources) {
  const m = new Map();
  for (const s of sources ?? []) {
    const d = domainFromUrl(s.url) ?? "(invalid)";
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

function formatDomainMap(m) {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([d, n]) => `${d}:${n}`)
    .join(", ");
}

async function main() {
  console.log(`Cleanup varietyProvenance — ${execute ? "EXECUTE" : "DRY RUN"} (${network})`);

  const identityName = execSync("dfx identity whoami").toString().trim();
  const pem = await fs.readFile(
    path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem"),
    "utf8",
  );
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();

  const backend = Actor.createActor(backendIDL, { agent, canisterId: BACKEND });

  const all = [];
  for (let off = 0n; ; off += 500n) {
    const page = await backend.listVarietyProvenance(off, 500n);
    all.push(...page);
    if (page.length < 500) break;
  }

  const beforeDomains = new Map();
  const beforeBreeders = new Map();
  let beforeBadSources = 0;
  let beforeBadBreeders = 0;

  for (const p of all) {
    for (const s of p.sources ?? []) {
      const d = domainFromUrl(s.url) ?? "(invalid)";
      beforeDomains.set(d, (beforeDomains.get(d) ?? 0) + 1);
      if (!ALLOWED_DOMAINS.includes(d)) beforeBadSources++;
    }
    const b = optText(p.breeder);
    if (b) {
      beforeBreeders.set(b, (beforeBreeders.get(b) ?? 0) + 1);
      if (!sanitizeBreeder(b)) beforeBadBreeders++;
    }
  }

  const changedIds = [];
  let wouldUpdate = 0;
  let sourcesPurged = 0;
  let breedersNulled = 0;

  for (const p of all) {
    const before = rawProvenanceFingerprint(p);
    const cleaned = cleanProvenanceRecord(p);
    const after = provenanceFingerprint(cleaned);

    if (before === after) continue;

    wouldUpdate++;
    changedIds.push(p.variety_id.toString());

    const srcBefore = p.sources?.length ?? 0;
    const srcAfter = cleaned.sources.length;
    if (srcAfter < srcBefore) sourcesPurged += srcBefore - srcAfter;

    const bBefore = optText(p.breeder);
    const bAfter = optText(cleaned.breeder);
    if (bBefore && !bAfter) breedersNulled++;

    if (execute) {
      await backend.setVarietyProvenance(p.variety_id, cleaned);
    }
  }

  const afterDomains = new Map();
  const afterBreeders = new Map();
  for (const p of all) {
    const cleaned = cleanProvenanceRecord(p);
    for (const s of cleaned.sources) {
      const d = domainFromUrl(s.url) ?? "(invalid)";
      afterDomains.set(d, (afterDomains.get(d) ?? 0) + 1);
    }
    const b = optText(cleaned.breeder);
    if (b) afterBreeders.set(b, (afterBreeders.get(b) ?? 0) + 1);
  }

  console.log(`\nRecords scanned: ${all.length}`);
  console.log(`Would update: ${wouldUpdate}`);
  console.log(`Source entries purged: ${sourcesPurged}`);
  console.log(`Breeder fields nulled: ${breedersNulled}`);

  console.log("\n── BEFORE source domains ──");
  console.log(`  ${formatDomainMap(beforeDomains)}`);
  console.log(`  unauthorized entries: ${beforeBadSources}`);

  console.log("\n── AFTER source domains (projected) ──");
  console.log(`  ${formatDomainMap(afterDomains)}`);

  console.log("\n── BEFORE breeder values (top) ──");
  for (const [k, n] of [...beforeBreeders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    const ok = sanitizeBreeder(k) ? "✓" : "✗";
    console.log(`  ${n.toString().padStart(5)}  ${ok} ${k}`);
  }

  console.log("\n── AFTER breeder values (top) ──");
  for (const [k, n] of [...afterBreeders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${n.toString().padStart(5)}  ${k}`);
  }

  await fs.mkdir(path.dirname(CHANGED_PATH), { recursive: true });
  await fs.writeFile(
    CHANGED_PATH,
    JSON.stringify({ network, changedAt: new Date().toISOString(), ids: changedIds }, null, 2),
  );
  console.log(`\nChanged IDs written: ${CHANGED_PATH} (${changedIds.length} varieties)`);

  if (!execute) {
    console.log("\nRe-run with --execute to apply.");
  } else {
    console.log(`\n✅ Updated ${wouldUpdate} provenance records`);
    console.log(
      "Next:\n  node scripts/generate-variety-descriptions.mjs --network ic --changed-file data/.provenance-cleanup-changed.json\n  node scripts/upload-variety-knowledge.mjs --network ic --changed-file data/.provenance-cleanup-changed.json",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
