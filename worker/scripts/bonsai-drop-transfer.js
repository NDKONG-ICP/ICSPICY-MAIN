#!/usr/bin/env node
/**
 * Transfer manifest tokens from backend pool → Captain (admin).
 *
 *   node scripts/bonsai-drop-transfer.js --pem ~/.config/dfx/identity/ic_deploy_plain/identity.pem
 *   node scripts/bonsai-drop-transfer.js --pem ... --dry-run
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import {
  assertManifestReady,
  loadManifest,
  saveManifest,
} from "../src/lib/bonsai-drop/manifest.js";
import {
  CAPTAIN_PRINCIPAL,
  isPepperHeadToken,
} from "../src/lib/bonsai-drop/constants.js";
import {
  captainAccount,
  createIcspicyLedgerActor,
} from "../src/lib/bonsai-drop/actors.js";

function loadAdminIdentity() {
  const pemArg = process.argv.find((a) => a.startsWith("--pem="));
  const pemIdx = process.argv.indexOf("--pem");
  const pemPath =
    pemArg?.slice("--pem=".length) ||
    (pemIdx >= 0 ? process.argv[pemIdx + 1] : null) ||
    process.env.DFX_ADMIN_PEM?.trim() ||
    `${process.env.HOME}/.config/dfx/identity/ic_deploy_plain/identity.pem`;
  const pem = readFileSync(pemPath, "utf8");
  return Secp256k1KeyIdentity.fromPem(pem);
}

const DRY = process.argv.includes("--dry-run");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const manifest = loadManifest();
  assertManifestReady(manifest);
  const done = new Set(manifest.phases.transferred.map(Number));
  const pending = manifest.tokenIds.filter((id) => !done.has(Number(id)));

  console.log(
    `[bonsai-drop-transfer] ${done.size}/${manifest.tokenIds.length} already transferred; ${pending.length} pending`,
  );
  if (!pending.length) {
    console.log("[bonsai-drop-transfer] nothing to do");
    return;
  }

  const identity = loadAdminIdentity();
  console.log(`[bonsai-drop-transfer] admin=${identity.getPrincipal().toText()}`);
  const ledger = await createIcspicyLedgerActor(identity);
  const to = captainAccount(CAPTAIN_PRINCIPAL);

  for (const tokenId of pending) {
    const id = Number(tokenId);
    if (isPepperHeadToken(id)) {
      throw new Error(`Refusing PepperHead token ${id}`);
    }
    if (DRY) {
      console.log(`[dry-run] adminTransferFromPool(${id}, Captain)`);
      continue;
    }
    const res = await ledger.adminTransferFromPool(BigInt(id), to);
    if ("Err" in res) {
      throw new Error(`adminTransferFromPool(${id}) failed: ${JSON.stringify(res.Err)}`);
    }
    manifest.phases.transferred.push(id);
    saveManifest(manifest);
    process.stdout.write(`\r[bonsai-drop-transfer] ok ${manifest.phases.transferred.length}/${manifest.tokenIds.length}`);
    await sleep(150);
  }
  console.log("");

  const owners = await ledger.icrc7_owner_of(
    manifest.tokenIds.map((t) => BigInt(t)),
  );
  let captainCount = 0;
  for (const accOpt of owners) {
    const acc = accOpt?.[0];
    if (acc?.owner?.toText?.() === CAPTAIN_PRINCIPAL) captainCount += 1;
  }
  console.log(`[bonsai-drop-transfer] Captain owns ${captainCount}/${manifest.tokenIds.length}`);
  if (captainCount !== manifest.tokenIds.length && !DRY) {
    throw new Error("Ownership verification failed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
