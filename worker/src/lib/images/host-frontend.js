/**
 * Host Captain post JPEGs + public proof JSON on the IC SPICY frontend asset canister.
 * OWNER-PAID image bytes only — upload is cycles.
 *
 * Env (worker .env):
 *   FRONTEND_CANISTER_ID   default 7rukv-hqaaa-aaaao-ba6ma-cai
 *   FRONTEND_ASSET_IDENTITY_PEM  path to controller PEM (e.g. ic_deploy_plain)
 */

import { readFileSync } from "fs";
import { HttpAgent } from "@dfinity/agent";
import { AssetManager } from "@dfinity/assets";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { captainPostUrls } from "../captain-post-urls.js";

export const DEFAULT_FRONTEND_CANISTER = "7rukv-hqaaa-aaaao-ba6ma-cai";
export const CAPTAIN_AGENT_PRINCIPAL =
  "26mw6-xnm4d-zfj7n-rjrrj-pnr3u-jasxq-wnmkp-4gfgt-xrtma-i7ghg-6qe";
const INDEX_MAX = 50;

function loadIdentityFromPem(pemPath) {
  const pem = readFileSync(pemPath, "utf8");
  return Secp256k1KeyIdentity.fromPem(pem);
}

function canisterId() {
  return (
    process.env.FRONTEND_CANISTER_ID?.trim() || DEFAULT_FRONTEND_CANISTER
  );
}

function publicBase(cid = canisterId()) {
  return `https://${cid}.icp0.io`;
}

async function createAssets() {
  const pemPath =
    process.env.FRONTEND_ASSET_IDENTITY_PEM?.trim() ||
    process.env.DFX_IDENTITY_PEM?.trim() ||
    `${process.env.HOME}/.config/dfx/identity/ic_deploy_plain/identity.pem`;

  const identity = loadIdentityFromPem(pemPath);
  const host = process.env.IC_HOST?.trim() || "https://icp-api.io";
  const agent = await HttpAgent.create({ host, identity });
  return {
    canisterId: canisterId(),
    assets: new AssetManager({ canisterId: canisterId(), agent }),
  };
}

/**
 * @param {Buffer|Uint8Array} jpegBytes
 * @param {string} fileName e.g. "a1b2c3d4.jpg"
 * @returns {Promise<{ key: string, url: string, canisterId: string }>}
 */
export async function uploadCaptainPostJpeg(jpegBytes, fileName) {
  const { canisterId: cid, assets } = await createAssets();
  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const batch = assets.batch();
  await batch.store(new Uint8Array(jpegBytes), {
    path: "/captain-posts",
    fileName: safeName,
    contentType: "image/jpeg",
    headers: [["Cache-Control", "public, max-age=31536000, immutable"]],
  });
  await batch.commit();

  const key = `/captain-posts/${safeName}`;
  const url = `${publicBase(cid)}${key}`;
  console.log(`[captain-assets] uploaded ${key} (${jpegBytes.length} B)`);
  return { key, url, canisterId: cid };
}

/**
 * @typedef {{
 *   v: 1,
 *   id: string,
 *   at: string,
 *   agent: string,
 *   agentPrincipal: string,
 *   minirouter: {
 *     requestId: string|null,
 *     model: string|null,
 *     costEstimate?: number|null,
 *     activityUrl: string,
 *   },
 *   icp: {
 *     canisterId: string,
 *     imageUrl: string,
 *     imageKey: string,
 *     jpegBytes?: number|null,
 *   },
 *   posts: { crumbeatr: string|null, swop: string|null, community: string|null },
 *   urls?: { swop: string|null, crumbeatr: string|null },
 *   sharePath: string,
 *   shareUrl: string,
 * }} CaptainProof
 */

/**
 * @param {Partial<CaptainProof> & { id: string, imageUrl: string }} input
 * @returns {CaptainProof}
 */
export function buildCaptainProof(input) {
  const cid = input.icp?.canisterId || canisterId();
  const id = String(input.id).replace(/[^a-zA-Z0-9._-]/g, "_");
  const imageKey =
    input.icp?.imageKey || `/captain-posts/${id}.jpg`;
  const imageUrl =
    input.icp?.imageUrl || input.imageUrl || `${publicBase(cid)}${imageKey}`;
  const sharePath = `/p/captain/${id}`;
  return {
    v: 1,
    id,
    at: input.at || new Date().toISOString(),
    agent: input.agent || "Captain Capsaicin",
    agentPrincipal: input.agentPrincipal || CAPTAIN_AGENT_PRINCIPAL,
    minirouter: {
      requestId: input.minirouter?.requestId ?? null,
      model: input.minirouter?.model ?? null,
      costEstimate: input.minirouter?.costEstimate ?? null,
      activityUrl: input.minirouter?.activityUrl || "https://minirouter.sh",
    },
    icp: {
      canisterId: cid,
      imageUrl,
      imageKey,
      jpegBytes: input.icp?.jpegBytes ?? null,
    },
    posts: {
      crumbeatr: input.posts?.crumbeatr ?? null,
      swop: input.posts?.swop ?? null,
      community: input.posts?.community ?? null,
    },
    urls: input.urls ?? captainPostUrls({
      crumbeatrPostId: input.posts?.crumbeatr,
      swopPostId: input.posts?.swop,
    }),
    sharePath,
    shareUrl: `${publicBase(cid)}${sharePath}`,
  };
}

async function fetchPublicJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Write `{id}.proof.json` and merge into `/captain-posts/index.json`.
 * @param {CaptainProof} proof
 * @returns {Promise<CaptainProof>}
 */
export async function writeCaptainProof(proof) {
  const record = buildCaptainProof(proof);
  const { canisterId: cid, assets } = await createAssets();
  const body = Buffer.from(JSON.stringify(record, null, 2), "utf8");

  const prevIndex =
    (await fetchPublicJson(`${publicBase(cid)}/captain-posts/index.json`)) ||
    { v: 1, proofs: [] };
  const proofs = Array.isArray(prevIndex.proofs) ? [...prevIndex.proofs] : [];
  const nextEntry = {
    id: record.id,
    at: record.at,
    imageUrl: record.icp.imageUrl,
    requestId: record.minirouter.requestId,
    sharePath: record.sharePath,
  };
  const filtered = proofs.filter((p) => p && p.id !== record.id);
  filtered.unshift(nextEntry);
  const index = {
    v: 1,
    updatedAt: new Date().toISOString(),
    proofs: filtered.slice(0, INDEX_MAX),
  };
  const indexBody = Buffer.from(JSON.stringify(index, null, 2), "utf8");
  const proofKey = `/captain-posts/${record.id}.proof.json`;
  const indexKey = `/captain-posts/index.json`;

  // Asset canister traps on CreateAsset if key exists — delete first.
  for (const key of [proofKey, indexKey]) {
    try {
      const del = assets.batch();
      del.delete(key);
      await del.commit();
    } catch {
      /* missing key is fine */
    }
  }

  const batch = assets.batch();
  await batch.store(new Uint8Array(body), {
    path: "/captain-posts",
    fileName: `${record.id}.proof.json`,
    contentType: "application/json",
    headers: [["Cache-Control", "public, max-age=300"]],
  });
  await batch.store(new Uint8Array(indexBody), {
    path: "/captain-posts",
    fileName: "index.json",
    contentType: "application/json",
    headers: [["Cache-Control", "public, max-age=60"]],
  });
  await batch.commit();

  console.log(
    `[captain-assets] proof ${record.id} → ${record.shareUrl} (index=${index.proofs.length})`,
  );
  return record;
}

/**
 * Merge post ids into an existing proof (or create a minimal one).
 * @param {string} id
 * @param {{ crumbeatr?: string|null, swop?: string|null, community?: string|null }} posts
 * @param {Partial<CaptainProof>} [base]
 */
export async function patchCaptainProofPosts(id, posts, base = {}) {
  const cid = canisterId();
  const existing =
    (await fetchPublicJson(
      `${publicBase(cid)}/captain-posts/${id}.proof.json`,
    )) || {};
  return writeCaptainProof({
    ...existing,
    ...base,
    id,
    imageUrl: existing.icp?.imageUrl || base.icp?.imageUrl || base.imageUrl,
    posts: {
      crumbeatr: posts.crumbeatr ?? existing.posts?.crumbeatr ?? null,
      swop: posts.swop ?? existing.posts?.swop ?? null,
      community: posts.community ?? existing.posts?.community ?? null,
    },
    minirouter: {
      ...(existing.minirouter || {}),
      ...(base.minirouter || {}),
    },
    icp: {
      ...(existing.icp || {}),
      ...(base.icp || {}),
    },
  });
}
