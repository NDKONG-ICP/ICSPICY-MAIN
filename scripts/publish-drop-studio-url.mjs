#!/usr/bin/env node
/**
 * Drop Studio's public address is a Cloudflare quick tunnel. A restart
 * issues a new hostname, and the live site keeps the old one until this
 * script rebuilds and uploads the frontend.
 *
 *   node scripts/publish-drop-studio-url.mjs           # rebuild + upload if needed
 *   node scripts/publish-drop-studio-url.mjs --check   # macOS notification if needed
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = join(ROOT, "src/frontend/.env.production");
const TUNNEL_LOG = join(homedir(), "Library/Logs/icspicy/drop-studio-tunnel.err.log");
const STATE_PATH = join(homedir(), "Library/Logs/icspicy/drop-studio-url-notified.txt");
const SITE = "https://www.icspicy.app";
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/g;

function latestTunnelUrl() {
  if (!existsSync(TUNNEL_LOG)) return "";
  const matches = readFileSync(TUNNEL_LOG, "utf8").match(URL_RE);
  return matches?.at(-1) || "";
}

function envUrl() {
  if (!existsSync(ENV_PATH)) return "";
  const line = readFileSync(ENV_PATH, "utf8")
    .split("\n")
    .find((row) => row.startsWith("VITE_DROP_STUDIO_URL="));
  return line?.slice("VITE_DROP_STUDIO_URL=".length).trim() || "";
}

function writeEnvUrl(url) {
  const text = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  const line = `VITE_DROP_STUDIO_URL=${url}`;
  const next = text.includes("VITE_DROP_STUDIO_URL=")
    ? text.replace(/^VITE_DROP_STUDIO_URL=.*$/m, line)
    : `${text.trimEnd()}\n${line}\n`;
  writeFileSync(ENV_PATH, next.endsWith("\n") ? next : `${next}\n`);
}

async function liveUrl() {
  const home = await fetch(SITE, { signal: AbortSignal.timeout(20_000) });
  if (!home.ok) return "";
  const indexPath = (await home.text()).match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!indexPath) return "";
  const indexJs = await fetch(`${SITE}${indexPath}`, { signal: AbortSignal.timeout(20_000) });
  const chunk = (await indexJs.text()).match(/drop-studio-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!chunk) return "";
  const studio = await fetch(`${SITE}/assets/${chunk}`, { signal: AbortSignal.timeout(20_000) });
  return (await studio.text()).match(URL_RE)?.[0] || "";
}

function notify(tunnelUrl) {
  const previous = existsSync(STATE_PATH) ? readFileSync(STATE_PATH, "utf8").trim() : "";
  if (previous === tunnelUrl) return;
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, `${tunnelUrl}\n`);
  const body =
    'In Terminal, from IC SPICY MAIN, run: node scripts/publish-drop-studio-url.mjs';
  spawnSync(
    "osascript",
    ["-e", `display notification ${JSON.stringify(body)} with title "Drop Studio needs an upload" sound name "Glass"`],
    { stdio: "ignore" },
  );
}

function clearNotice() {
  if (existsSync(STATE_PATH)) writeFileSync(STATE_PATH, "");
}

function run(cmd, args, cwd, extraEnv = {}) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const checkOnly = process.argv.includes("--check");
const tunnelUrl = latestTunnelUrl();

if (!tunnelUrl) {
  if (!checkOnly) {
    console.error(`No tunnel address in ${TUNNEL_LOG}`);
    process.exit(1);
  }
  process.exit(0);
}

const baked = envUrl();
let published = "";
try {
  published = await liveUrl();
} catch {
  published = "";
}

const envStale = baked !== tunnelUrl;
const siteStale = Boolean(published) && published !== tunnelUrl;
const needsUpload = envStale || siteStale;

if (checkOnly) {
  if (needsUpload) {
    console.log(`tunnel ${tunnelUrl}`);
    console.log(`env    ${baked || "(missing)"}`);
    console.log(`site   ${published || "(unread)"}`);
    notify(tunnelUrl);
    process.exit(2);
  }
  clearNotice();
  process.exit(0);
}

if (!needsUpload) {
  clearNotice();
  console.log(`Drop Studio is already ${tunnelUrl}`);
  process.exit(0);
}

console.log(`Tunnel address is ${tunnelUrl}`);
if (envStale) {
  writeEnvUrl(tunnelUrl);
  console.log("Updated src/frontend/.env.production");
}

run("pnpm", ["build"], join(ROOT, "src/frontend"), {
  NODE_OPTIONS: "--max-old-space-size=4096",
});
run(
  process.execPath,
  [
    "scripts/upload-frontend.mjs",
    "--network",
    "ic",
    "--canister",
    "7rukv-hqaaa-aaaao-ba6ma-cai",
    "--identity-name",
    "ic_deploy_plain",
    "--no-prune",
  ],
  ROOT,
  { DFX_WARNING: "-mainnet_plaintext_identity" },
);
clearNotice();
console.log(`Uploaded. Live studio address: ${tunnelUrl}`);
