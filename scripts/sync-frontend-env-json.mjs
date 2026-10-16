#!/usr/bin/env node
/**
 * Merge public Vite env from .env.production into env.json (served at /env.json).
 * Lets ops update drop studio tunnel URL via upload without a full JS rebuild.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PROD = join(ROOT, "src/frontend/.env.production");
const ENV_JSON = join(ROOT, "src/frontend/env.json");
const TUNNEL_LOG = join(
  homedir(),
  "Library/Logs/icspicy/drop-studio-tunnel.err.log",
);
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/g;

function latestTunnelUrl() {
  if (!existsSync(TUNNEL_LOG)) return "";
  const matches = readFileSync(TUNNEL_LOG, "utf8").match(URL_RE);
  return matches?.at(-1) || "";
}

function parseDotEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const base = existsSync(ENV_JSON)
  ? JSON.parse(readFileSync(ENV_JSON, "utf8"))
  : {};
const prod = existsSync(ENV_PROD) ? parseDotEnv(readFileSync(ENV_PROD, "utf8")) : {};

const next = {
  ...base,
  backend_canister_id:
    base.backend_canister_id ||
    prod.VITE_BACKEND_CANISTER_ID ||
    "ghxmp-xiaaa-aaaao-ba4sq-cai",
  agent_hub_canister_id:
    base.agent_hub_canister_id || prod.VITE_AGENT_HUB_CANISTER_ID || "",
  walletconnect_project_id:
    prod.VITE_WALLETCONNECT_PROJECT_ID?.trim() ||
    base.walletconnect_project_id ||
    "",
  drop_studio_url:
    latestTunnelUrl() ||
    prod.VITE_DROP_STUDIO_URL?.trim() ||
    base.drop_studio_url ||
    "",
  hedera_drop_token_id:
    prod.VITE_HEDERA_DROP_TOKEN_ID?.trim() || base.hedera_drop_token_id || "",
};

writeFileSync(ENV_JSON, `${JSON.stringify(next, null, 2)}\n`);
console.log(`[sync-frontend-env-json] wrote ${ENV_JSON}`);
