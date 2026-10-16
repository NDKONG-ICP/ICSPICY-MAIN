#!/usr/bin/env node
/**
 * List minted Hedera-drop serials on SentX.
 *
 *   SENTX_API_KEY=... node scripts/hedera-drop-list-sentx.js
 *
 * The key is an affiliate key from SentX → Profile → Affiliate
 * (or one line in worker/data/hedera/sentx-affiliate-key.txt).
 * Price matches the Bonsai ask: 1.2 ICP ≈ 39 HBAR at 2026-10-08 rates.
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrivateKey, Client, Transaction } from "@hashgraph/sdk";
import { CAPTAIN_HEDERA_KEY_PATH, fetchAccountBalanceHbar } from "../src/clients/hedera.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, "..", "data", "hedera-drop", "manifest.json");
const KEY_FILE = join(HERE, "..", "data", "hedera", "sentx-affiliate-key.txt");
const SENTX = "https://api.sentx.io";
const PRICE_HBAR = process.env.SENTX_LIST_PRICE_HBAR?.trim() || "39";
const MIN_BALANCE_HBAR = 2;

function loadApiKey() {
  const fromEnv = process.env.SENTX_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (existsSync(KEY_FILE)) return readFileSync(KEY_FILE, "utf8").trim();
  return "";
}

function save(manifest) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function sentxPost(apiKey, path, body) {
  const url = `${SENTX}${path}?apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.apimessage || `SentX ${res.status} ${path}`);
  }
  return json;
}

async function listOne({ apiKey, tokenId, serial, seller, privateKey, client }) {
  const prepared = await sentxPost(apiKey, "/v1/affiliate/market/listnft", {
    token_address: tokenId,
    serial_number: String(serial),
    price: PRICE_HBAR,
    user_address: seller,
  });
  const bytes = prepared.transBytes?.data;
  if (!bytes?.length) {
    throw new Error(`listnft serial ${serial}: no transaction bytes`);
  }
  const tx = Transaction.fromBytes(Uint8Array.from(bytes));
  const signed = await tx.sign(privateKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);
  const status = receipt.status.toString();
  if (status !== "SUCCESS") {
    throw new Error(`listnft serial ${serial} receipt ${status}`);
  }
  const transactionId = response.transactionId.toString();
  const done = await fetch(`${SENTX}/v1/affiliate/market/listnftres?${new URLSearchParams({
    apikey: apiKey,
    saleVerificationCode: prepared.saleVerificationCode,
  })}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      saleVerificationCode: prepared.saleVerificationCode,
      transactionId,
      user_address: seller,
    }),
  });
  const body = await done.json().catch(() => ({}));
  if (!done.ok || body.success === false) {
    throw new Error(body.apimessage || `listnftres ${done.status} serial ${serial}`);
  }
  return transactionId;
}

async function listWithRetry(args) {
  for (let attempt = 1; attempt <= 180; attempt += 1) {
    try {
      return await listOne(args);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/already listed/i.test(msg)) {
        console.log(`[sentx] serial ${args.serial} already on SentX`);
        return "already-listed";
      }
      const waitingOnIndex = /not indexed|not supported yet/i.test(msg);
      const transient =
        waitingOnIndex ||
        /retry in a minute|ECONNRESET|ETIMEDOUT|DEADLINE_EXCEEDED|UNAVAILABLE|429|503|fetch failed|max attempts/i.test(
          msg,
        );
      const limit = waitingOnIndex ? 180 : 8;
      if (!transient || attempt === limit) throw err;
      const waitMs = waitingOnIndex ? 60_000 : 20_000;
      console.log(`[sentx] retry serial ${args.serial} in ${waitMs / 1000}s (${msg})`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error(`list serial ${args.serial} failed`);
}

async function applyAddressBook(client) {
  const network = {};
  let url = "https://mainnet-public.mirrornode.hedera.com/api/v1/network/nodes?limit=100&order=asc";
  while (url) {
    const page = await fetch(url).then((res) => res.json());
    for (const node of page.nodes ?? []) {
      const endpoint = (node.service_endpoints ?? []).find(
        (item) => item.ip_address_v4 && item.port === 50211,
      );
      if (!endpoint) continue;
      network[`${endpoint.ip_address_v4}:${endpoint.port}`] = node.node_account_id;
    }
    const next = page.links?.next;
    url = next ? `https://mainnet-public.mirrornode.hedera.com${next}` : "";
  }
  if (Object.keys(network).length < 10) {
    throw new Error("Hedera address book was too small");
  }
  client.setNetwork(network);
  console.log(`[sentx] address book ${Object.keys(network).length} nodes`);
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error(
      "SentX affiliate API key missing. Create it at sentx.io → Profile → Affiliate, then set SENTX_API_KEY or write worker/data/hedera/sentx-affiliate-key.txt",
    );
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  if (!manifest.htsTokenId) throw new Error("Mint the HTS collection before listing");
  const keyRecord = JSON.parse(readFileSync(CAPTAIN_HEDERA_KEY_PATH, "utf8"));
  if (!keyRecord.accountId) throw new Error("Captain Hedera accountId is not resolved");
  const privateKey = PrivateKey.fromString(keyRecord.privateKey);
  const client = Client.forMainnet();
  client.setOperator(keyRecord.accountId, privateKey);
  client.setMaxAttempts(20);
  client.setRequestTimeout(30_000);
  await applyAddressBook(client);

  manifest.phases = manifest.phases ?? {};
  manifest.phases.sentx = manifest.phases.sentx ?? {};
  const mirrors = manifest.mirrors ?? [];
  let listed = 0;
  for (const row of mirrors) {
    const serial = String(row.serial);
    if (manifest.phases.sentx[serial]) continue;
    const bal = await fetchAccountBalanceHbar(keyRecord.accountId, "mainnet");
    if (bal != null && bal < MIN_BALANCE_HBAR) {
      console.log(`[sentx] pause: balance ${bal.toFixed(2)} HBAR`);
      break;
    }
    const txId = await listWithRetry({
      apiKey,
      tokenId: manifest.htsTokenId,
      serial,
      seller: keyRecord.accountId,
      privateKey,
      client,
    });
    manifest.phases.sentx[serial] = {
      txId,
      priceHbar: PRICE_HBAR,
      icTokenId: row.icTokenId,
      at: new Date().toISOString(),
    };
    save(manifest);
    listed += 1;
    console.log(`[sentx] listed serial ${serial} @ ${PRICE_HBAR} HBAR (${listed} this run)`);
    await new Promise((r) => setTimeout(r, 750));
  }
  const total = Object.keys(manifest.phases.sentx).length;
  console.log(`[sentx] ${total}/${mirrors.length} minted serials listed on SentX`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
