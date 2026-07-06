#!/usr/bin/env node
/**
 * audit-provenance-sources.mjs — report vendorName, URL domains, and breeder values.
 *
 * Usage: node scripts/audit-provenance-sources.mjs --network ic
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
  auditEntry,
  domainFromUrl,
  optText,
  photoCreditMatchesPrimarySource,
  photoCreditVendor,
} from "./lib/provenance-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();

const VarietySource = IDL.Record({ vendorName: IDL.Text, url: IDL.Text });
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
  });

function printCounts(label, map) {
  console.log(`\n── ${label} (${map.size} distinct) ──`);
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [k, n] of sorted) {
    console.log(`  ${n.toString().padStart(5)}  ${k}`);
  }
}

async function main() {
  console.log(`Audit varietyProvenance sources — ${network}`);

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

  const vendorNames = new Map();
  const domains = new Map();
  const breeders = new Map();
  let badSourceEntries = 0;
  let badPhotoCredit = 0;
  let retailerBreeders = 0;

  for (const p of all) {
    const a = auditEntry(p);
    for (const [k, n] of a.sourceVendorNames) {
      vendorNames.set(k, (vendorNames.get(k) ?? 0) + n);
    }
    for (const [k, n] of a.sourceDomains) {
      domains.set(k, (domains.get(k) ?? 0) + n);
    }
    for (const [k, n] of a.breeders) {
      breeders.set(k, (breeders.get(k) ?? 0) + n);
    }

    for (const s of p.sources ?? []) {
      const d = domainFromUrl(s.url);
      if (!d || !ALLOWED_DOMAINS.includes(d)) badSourceEntries++;
    }

    const credit = optText(p.photoCredit);
    if (credit && !photoCreditMatchesPrimarySource(credit, p.sources)) badPhotoCredit++;

    const b = optText(p.breeder);
    if (b && /pepper guru|puckerbutt|refining fire|super hot chiles/i.test(b)) {
      retailerBreeders++;
    }
  }

  console.log(`\nTotal provenance records: ${all.length}`);
  console.log(`Authorized domains only: ${ALLOWED_DOMAINS.join(", ")}`);
  console.log(`Bad source entries (wrong domain): ${badSourceEntries}`);
  console.log(`Photo credits not matching primary source: ${badPhotoCredit}`);
  console.log(`Likely retailer-as-breeder: ${retailerBreeders}`);

  printCounts("sources[].vendorName", vendorNames);
  printCounts("sources[].url domain", domains);
  printCounts("breeder values", breeders);

  const badDomains = [...domains.keys()].filter(
    (d) => d !== "(invalid)" && !ALLOWED_DOMAINS.includes(d),
  );
  if (badDomains.length) {
    console.log("\n⚠ Unauthorized domains found:");
    for (const d of badDomains.sort()) {
      console.log(`  ${d}: ${domains.get(d)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
