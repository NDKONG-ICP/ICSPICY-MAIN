/**
 * Poll Hedera mirror for icspicy:<principal> memos and sync ICRC-7 twins.
 */

import { Principal } from "@dfinity/principal";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mirrorBase } from "../clients/hedera.js";
import { createIcspicyLedgerActor } from "./bonsai-drop/actors.js";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, "../../data/hedera-drop/manifest.json");
const MEMO_PREFIX = "icspicy:";

function loadAdminIdentity() {
  const pemPath =
    process.env.DFX_ADMIN_PEM?.trim() ||
    `${process.env.HOME}/.config/dfx/identity/ic_deploy_plain/identity.pem`;
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, "utf8"));
}

function parseMemoPrincipal(memoB64) {
  try {
    const text = Buffer.from(memoB64, "base64").toString("utf8");
    if (!text.startsWith(MEMO_PREFIX)) return null;
    const p = text.slice(MEMO_PREFIX.length).trim();
    Principal.fromText(p);
    return p;
  } catch {
    return null;
  }
}

async function fetchRecentTransactions(accountId, limit = 50) {
  const base = mirrorBase("mainnet");
  const res = await fetch(
    `${base}/api/v1/transactions?account.id=${accountId}&limit=${limit}&order=desc`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.transactions ?? [];
}

async function htsOwner(tokenId, serial) {
  const base = mirrorBase("mainnet");
  const res = await fetch(`${base}/api/v1/tokens/${tokenId}/nfts/${serial}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.account_id ?? null;
}

/**
 * @param {{ network?: string }} [opts]
 */
export async function runHederaTwinSync(opts = {}) {
  if (!existsSync(MANIFEST_PATH)) {
    return { synced: 0, skipped: "no hedera manifest" };
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const htsTokenId = manifest.htsTokenId;
  const captainAccount = manifest.captainAccountId;
  if (!htsTokenId) return { synced: 0, skipped: "no htsTokenId" };

  const accountForMemoScan = captainAccount || process.env.HEDERA_CAPTAIN_ACCOUNT;
  if (!accountForMemoScan) return { synced: 0, skipped: "no account to scan memos" };

  const txs = await fetchRecentTransactions(accountForMemoScan);
  const identity = loadAdminIdentity();
  const ledger = await createIcspicyLedgerActor(identity);

  const serialToIcToken = {};
  manifest.tokenIds.forEach((id, idx) => {
    serialToIcToken[idx + 1] = Number(id);
  });

  let synced = 0;
  for (const tx of txs) {
    const memo = tx.memo_base64;
    if (!memo) continue;
    const principalText = parseMemoPrincipal(memo);
    if (!principalText) continue;
    const sender = tx.transfers?.find((t) => t.amount < 0)?.account;
    if (!sender) continue;

    for (const [serialStr, icTokenId] of Object.entries(serialToIcToken)) {
      const serial = Number(serialStr);
      const owner = await htsOwner(htsTokenId, serial);
      if (owner !== sender) continue;

      const to = { owner: Principal.fromText(principalText), subaccount: [] };
      const res = await ledger.adminSyncHederaTwin(BigInt(icTokenId), to);
      if ("Ok" in res) synced += 1;
    }
  }

  return { synced, scanned: txs.length };
}
