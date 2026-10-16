#!/usr/bin/env node
/**
 * Lock Hedera-drop tokens in canister subaccount `hedera-lock` (admin).
 *
 *   node scripts/hedera-drop-lock.js --pem ~/.config/dfx/identity/ic_deploy_plain/identity.pem
 */

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { Principal } from "@dfinity/principal";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ICSPICY_BACKEND } from "../src/lib/bonsai-drop/constants.js";
import { subaccountFromLabel } from "../src/lib/bonsai-drop/subaccount.js";
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
  manifest.phases = manifest.phases ?? {};
  manifest.phases.locked = manifest.phases.locked ?? [];
  manifest.phases.skipped = manifest.phases.skipped ?? [];
  const locked = new Set(manifest.phases.locked.map(Number));
  const skipped = new Set(manifest.phases.skipped.map(Number));
  const sub = Array.from(subaccountFromLabel("hedera-lock"));
  const to = {
    owner: Principal.fromText(ICSPICY_BACKEND),
    subaccount: [sub],
  };

  const identity = loadAdminIdentity();
  const ledger = await createIcspicyLedgerActor(identity);

  for (const tokenId of manifest.tokenIds) {
    const id = Number(tokenId);
    if (locked.has(id) || skipped.has(id)) continue;
    const res = await ledger.adminTransferFromPool(BigInt(id), to);
    if ("Err" in res) {
      const err = res.Err;
      const notInPool = err && ("Unauthorized" in err || "NonExistingTokenId" in err);
      if (!notInPool) throw new Error(`lock ${id}: ${JSON.stringify(err)}`);
      manifest.phases.skipped.push(id);
      skipped.add(id);
      persistLock(manifest.phases.locked, manifest.phases.skipped);
      continue;
    }
    manifest.phases.locked.push(id);
    locked.add(id);
    persistLock(manifest.phases.locked, manifest.phases.skipped);
    process.stdout.write(`\r[hedera-drop-lock] ${manifest.phases.locked.length}/${manifest.tokenIds.length}`);
  }
  console.log(
    `\n[hedera-drop-lock] done locked=${manifest.phases.locked.length} skipped=${manifest.phases.skipped.length}`,
  );
}

function persistLock(lockedIds, skippedIds) {
  const current = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  current.phases = current.phases ?? {};
  current.phases.locked = lockedIds;
  current.phases.skipped = skippedIds;
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(current, null, 2)}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
