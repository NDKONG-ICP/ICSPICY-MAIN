#!/usr/bin/env node
/**
 * Write Hedera mirror records onto ICRC-7 metadata (admin).
 *
 *   node scripts/hedera-drop-sync-icrc.js --pem <admin pem>
 *
 * Expects manifest with htsTokenId and mirrored serial mapping in phases.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { createIcspicyLedgerActor } from "../src/lib/bonsai-drop/actors.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, "..", "data", "hedera-drop", "manifest.json");

function loadAdminIdentity() {
  const pemIdx = process.argv.indexOf("--pem");
  const pemPath =
    (pemIdx >= 0 ? process.argv[pemIdx + 1] : null) ||
    `${process.env.HOME}/.config/dfx/identity/ic_deploy_plain/identity.pem`;
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, "utf8"));
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  if (!manifest.htsTokenId) throw new Error("manifest missing htsTokenId");
  const mirrors = manifest.mirrors ?? [];
  if (!mirrors.length) throw new Error("no minted serials in manifest.mirrors");
  const mintedAt = BigInt(Date.now());
  const entries = mirrors.map((row) => [
    BigInt(row.icTokenId),
    {
      htsTokenId: manifest.htsTokenId,
      serial: BigInt(row.serial),
      mintedAt,
    },
  ]);

  const identity = loadAdminIdentity();
  const ledger = await createIcspicyLedgerActor(identity);
  const batch = 100;
  let total = 0;
  for (let i = 0; i < entries.length; i += batch) {
    const slice = entries.slice(i, i + batch);
    const n = await ledger.adminSetHederaMirror(slice);
    total += Number(n);
    console.log(`[hedera-drop-sync-icrc] synced ${total}/${entries.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
