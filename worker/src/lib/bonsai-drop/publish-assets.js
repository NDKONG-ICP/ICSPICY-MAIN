import { readFileSync } from "node:fs";
import { HttpAgent } from "@dfinity/agent";
import { AssetManager } from "@dfinity/assets";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { DEFAULT_FRONTEND_CANISTER } from "../images/host-frontend.js";

function loadIdentityFromPem(pemPath) {
  const pem = readFileSync(pemPath, "utf8");
  return Secp256k1KeyIdentity.fromPem(pem);
}

async function createAssets() {
  const pemPath =
    process.env.FRONTEND_ASSET_IDENTITY_PEM?.trim() ||
    process.env.DFX_IDENTITY_PEM?.trim() ||
    `${process.env.HOME}/.config/dfx/identity/ic_deploy_plain/identity.pem`;
  const identity = loadIdentityFromPem(pemPath);
  const host = process.env.IC_HOST?.trim() || "https://icp-api.io";
  const agent = await HttpAgent.create({ host, identity });
  const canisterId =
    process.env.FRONTEND_CANISTER_ID?.trim() || DEFAULT_FRONTEND_CANISTER;
  return {
    canisterId,
    assets: new AssetManager({ canisterId, agent }),
  };
}

/**
 * @param {string} key e.g. /bonsai-drop/manifest.json
 * @param {unknown} obj
 */
export async function uploadPublicJson(key, obj) {
  const parts = key.split("/").filter(Boolean);
  const fileName = parts.pop();
  const path = parts.length ? `/${parts.join("/")}` : "";
  const bytes = Buffer.from(`${JSON.stringify(obj, null, 2)}\n`, "utf8");
  const { assets } = await createAssets();
  const config = {
    path,
    fileName,
    contentType: "application/json",
    headers: [["Cache-Control", "public, max-age=60"]],
  };
  try {
    const batch = assets.batch();
    await batch.store(new Uint8Array(bytes), config);
    await batch.commit();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("already exists")) throw err;
    const batch = assets.batch();
    batch.delete(key);
    await batch.store(new Uint8Array(bytes), config);
    await batch.commit();
  }
  console.log(`[bonsai-drop-assets] uploaded ${key} (${bytes.length} B)`);
}
