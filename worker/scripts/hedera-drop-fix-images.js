#!/usr/bin/env node
/**
 * Point Hedera-drop metadata at the real nft_assets PNGs, then set the
 * SentX collection image to serial 1's art.
 *
 *   node scripts/hedera-drop-fix-images.js
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpAgent } from "@dfinity/agent";
import { AssetManager } from "@dfinity/assets";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { PrivateKey } from "@hashgraph/sdk";
import { keccak_256 } from "@noble/hashes/sha3";
import { secp256k1 } from "@noble/curves/secp256k1";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, "..", "data", "hedera-drop", "manifest.json");
const KEY_PATH = join(HERE, "..", "data", "hedera", "captain-ed25519.json");
const NFT_ASSETS = "gawk3-2qaaa-aaaao-ba4sa-cai";
const FRONTEND = "7rukv-hqaaa-aaaao-ba6ma-cai";
const TOKEN = "0.0.10910756";
const EXPECT = "0x8b6a645b549723cc39a2ac76760b0031326e2005";
const CHUNK = 40;

function imageUrl(icTokenId) {
  return `https://${NFT_ASSETS}.icp0.io/images/nft_${icTokenId}.png`;
}

function metaFor(icTokenId, rarity) {
  return {
    name: `IC SPICY #${icTokenId}`,
    description: `Hedera mirror of IC SPICY token ${icTokenId}`,
    image: imageUrl(icTokenId),
    attributes: [
      { trait_type: "icspicy_token_id", value: String(icTokenId) },
      { trait_type: "rarity", value: rarity ?? "Unknown" },
    ],
  };
}

async function rewriteMetadata(manifest) {
  const pemPath =
    process.env.FRONTEND_ASSET_IDENTITY_PEM?.trim() ||
    `${process.env.HOME}/.config/dfx/identity/ic_deploy_plain/identity.pem`;
  const identity = Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, "utf8"));
  const agent = await HttpAgent.create({ host: "https://icp-api.io", identity });
  const assets = new AssetManager({ canisterId: FRONTEND, agent });
  const rarity = manifest.rarity ?? {};
  const rows = manifest.mirrors ?? [];
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const batch = assets.batch();
    for (const row of slice) {
      const key = `/hedera/metadata/ic-${row.icTokenId}.json`;
      batch.delete(key);
      const body = Buffer.from(
        `${JSON.stringify(metaFor(row.icTokenId, rarity[String(row.icTokenId)]), null, 2)}\n`,
        "utf8",
      );
      await batch.store(new Uint8Array(body), {
        path: "/hedera/metadata",
        fileName: `ic-${row.icTokenId}.json`,
        contentType: "application/json",
        headers: [["Cache-Control", "public, max-age=60"]],
      });
    }
    await batch.commit();
    done += slice.length;
    console.log(`[images] metadata ${done}/${rows.length}`);
  }
}

function concat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function personalSign(message, priv) {
  const msg = new TextEncoder().encode(message);
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${msg.length}`);
  const hash = keccak_256(concat(prefix, msg));
  const sig = secp256k1.sign(hash, priv, { lowS: true });
  const raw = sig.recoverPublicKey(hash).toRawBytes(false);
  const addr = `0x${Buffer.from(keccak_256(raw.subarray(1)).slice(-20)).toString("hex")}`;
  if (addr !== EXPECT) throw new Error("recovered address mismatch");
  return `0x${sig.r.toString(16).padStart(64, "0")}${sig.s.toString(16).padStart(64, "0")}${(sig.recovery + 27).toString(16).padStart(2, "0")}`;
}

async function gpost(path, body) {
  const res = await fetch(`https://gbackend.sentx.io${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return json;
}

async function sentxSession(accountId, priv) {
  const deviceId = crypto.randomUUID();
  const init = await gpost(`/initAuthentication3?cb=${Date.now()}`, {
    authToken: null,
    signingAcctId: accountId,
    evmAddress: EXPECT,
    ip: null,
    ei: null,
    rafcode: null,
    deviceId,
    walletType: 6,
  });
  if (!init.payload || !init.operationToken) {
    throw new Error(init.apimessage || "SentX auth init failed");
  }
  const message = JSON.stringify(init.payload);
  const ver = await gpost(`/submitVerification3?cb=${Date.now()}`, {
    prefixMessage: false,
    signingAcctId: accountId,
    evmAddress: EXPECT,
    deviceId,
    n: init.n,
    operationToken: init.operationToken,
    userSignature: personalSign(message, priv),
    message,
    ip: null,
    walletName: "MetaMask EVM",
    walletType: 6,
  });
  if (!ver.success || !ver.authToken) {
    throw new Error(ver.apimessage || "SentX auth verify failed");
  }
  return ver.authToken;
}

async function setCollectionImage(accountId, priv, cover) {
  const authToken = await sentxSession(accountId, priv);
  const owned = await gpost("/creator/getownedtokens", {
    signingAcct: accountId,
    authToken,
  });
  const cols = (owned.data || owned).ownedCollections || [];
  const col = cols.find((row) => row.address === TOKEN);
  if (!col) throw new Error("collection not in treasury creator list");
  const oldCol = structuredClone(col);
  const next = structuredClone(col);
  next.cidImageFirstSerial = cover;
  next.image = cover;
  next.previewImageUrl = cover;
  const edited = await gpost("/editor/editCol", {
    oldCol,
    col: next,
    signingAcct: accountId,
    authToken,
  });
  console.log("[images] editCol", edited.success, edited.apimessage || "");
  if (!edited.success) throw new Error(edited.apimessage || "editCol failed");
  const reindex = await gpost("/editor/reindex", {
    col: next,
    signingAcct: accountId,
    authToken,
  });
  console.log("[images] reindex", reindex.success, reindex.apimessage || "");
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const first = manifest.mirrors?.[0];
  if (!first) throw new Error("no mirrors");
  const cover = imageUrl(first.icTokenId);
  console.log(`[images] cover ${cover}`);
  await rewriteMetadata(manifest);
  const keyRecord = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  const pk = PrivateKey.fromString(keyRecord.privateKey);
  await setCollectionImage(keyRecord.accountId, pk.toBytesRaw(), cover);
  console.log("[images] done");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
