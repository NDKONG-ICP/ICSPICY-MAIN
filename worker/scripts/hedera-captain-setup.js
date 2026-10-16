#!/usr/bin/env node
/**
 * Generate Captain Hedera key + print HashPack / SentX onboarding steps.
 *
 *   node scripts/hedera-captain-setup.js
 *   node scripts/hedera-captain-setup.js --resolve
 */

import "dotenv/config";
import {
  CAPTAIN_HEDERA_KEY_PATH,
  loadOrCreateCaptainHederaKey,
  resolveAccountForEvmAddress,
  resolveAccountForPublicKey,
} from "../src/clients/hedera.js";
import { writeFileSync } from "node:fs";
import { uploadPublicJson } from "../src/lib/bonsai-drop/publish-assets.js";

const RESOLVE = process.argv.includes("--resolve");

async function main() {
  const record = await loadOrCreateCaptainHederaKey();
  console.log(`[hedera] key file: ${CAPTAIN_HEDERA_KEY_PATH}`);
  console.log(`[hedera] keyType: ${record.keyType ?? "unknown"}`);
  if (record.evmAddress) console.log(`[hedera] evmAddress: ${record.evmAddress}`);
  if (record.accountId) {
    console.log(`[hedera] accountId=${record.accountId}`);
  } else if (record.evmAddress) {
    console.log(`
[hedera] FUNDING (HashPack creates the account — no memo):
  On the HashPack screen you have open, paste this address:
    ${record.evmAddress}
  Send ≥50 HBAR (plan: ~1000 HBAR) from 0.0.10351709.
  Send it as HBAR inside HashPack. Coinbase will not accept this address.
  Then: node scripts/hedera-captain-setup.js --resolve
`);
  }

  if (RESOLVE) {
    const accountId = record.evmAddress
      ? await resolveAccountForEvmAddress(record.evmAddress, "mainnet")
      : await resolveAccountForPublicKey(record.publicKeyDer, "mainnet");
    if (accountId) {
      record.accountId = accountId;
      writeFileSync(CAPTAIN_HEDERA_KEY_PATH, `${JSON.stringify(record, null, 2)}\n`, {
        mode: 0o600,
      });
      console.log(`[hedera] accountId=${accountId}`);
      // Publish PUBLIC info (account id + public key only — never the private key)
      // so the admin dashboard can poll live wallet data.
      await uploadPublicJson("/hedera/captain.json", {
        accountId,
        publicKey: record.publicKey,
        network: record.network ?? "mainnet",
        updatedAt: new Date().toISOString(),
      });
    } else {
      console.log(
        "[hedera] No account yet — send HBAR to the 0x address from HashPack, then re-run --resolve",
      );
    }
  }

  console.log(`
HashPack:
  1. Settings → Manage Keys → Import → paste private key from ${CAPTAIN_HEDERA_KEY_PATH}
  2. Fund the account via alias transfer if accountId is null

SentX:
  1. Connect HashPack at https://sentx.io/
  2. Creator profile → link same account
  3. After HTS mint, apply for verified collection with token id from hedera-drop manifest

Env for frontend admin tab:
  VITE_HEDERA_DROP_TOKEN_ID=<token id after mint>
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
