/**
 * Hedera drop holder image studio.
 * 10 generations per NFT held per rolling 24 hours.
 * Site ceiling defaults to 200 UTC-day images and can be raised by an admin.
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PublicKey } from "@hashgraph/sdk";
import { generateHolderImage } from "../clients/minirouter-images.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH =
  process.env.HEDERA_DROP_STUDIO_LEDGER?.trim() ||
  join(__dirname, "../../data/hedera-drop-studio.json");

export const DROP_TOKEN_ID = "0.0.10910756";
export const PER_NFT = 10;
export const DEFAULT_SITE_CAP = 200;
export const MIN_SITE_CAP = 200;
export const MAX_SITE_CAP = 10000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const CHALLENGE_MS = 5 * 60 * 1000;
const MIRROR = "https://mainnet-public.mirrornode.hedera.com/api/v1";

const STYLES = {
  photo: "photographed, warm light, shallow depth of field",
  ink: "bold ink illustration, high contrast, cream paper",
  night: "night-market neon, rich shadows, cinematic",
  still: "still life on a dark wooden table, painterly",
};

const challenges = new Map();
let chain = Promise.resolve();

function withLedger(fn) {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => {},
    () => {},
  );
  return run;
}

function emptyLedger() {
  return {
    siteCap: DEFAULT_SITE_CAP,
    siteDay: utcDay(),
    siteUsed: 0,
    accounts: {},
  };
}

function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function readLedger() {
  try {
    if (!existsSync(LEDGER_PATH)) return emptyLedger();
    const raw = JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
    return {
      siteCap: clampCap(raw.siteCap ?? DEFAULT_SITE_CAP),
      siteDay: typeof raw.siteDay === "string" ? raw.siteDay : utcDay(),
      siteUsed: Number(raw.siteUsed) || 0,
      accounts: raw.accounts && typeof raw.accounts === "object" ? raw.accounts : {},
    };
  } catch {
    return emptyLedger();
  }
}

function writeLedger(data) {
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  writeFileSync(LEDGER_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

export function clampCap(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_SITE_CAP;
  return Math.min(MAX_SITE_CAP, Math.max(MIN_SITE_CAP, n));
}

export function normalizeAccountId(value) {
  const text = String(value || "").trim().toLowerCase();
  const match = /^(0\.0\.\d+)(?:-[a-z]{5})?$/.exec(text);
  if (!match) throw new Error("Connect a Hedera account id like 0.0.123");
  return match[1];
}

function rollSite(data, now = new Date()) {
  const day = utcDay(now);
  if (data.siteDay !== day) {
    data.siteDay = day;
    data.siteUsed = 0;
  }
  return data;
}

function accountRow(data, accountId, now) {
  const row = data.accounts[accountId] || { windowStart: now.toISOString(), used: 0 };
  const start = Date.parse(row.windowStart);
  if (!Number.isFinite(start) || now.getTime() - start >= WINDOW_MS) {
    row.windowStart = now.toISOString();
    row.used = 0;
  }
  data.accounts[accountId] = row;
  return row;
}

export async function fetchHeldCount(accountId) {
  const url = `${MIRROR}/accounts/${accountId}/tokens?token.id=${DROP_TOKEN_ID}&limit=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (res.status === 404) return 0;
  if (!res.ok) throw new Error(`Mirror ${res.status}`);
  const body = await res.json();
  const row = (body.tokens || []).find((token) => token.token_id === DROP_TOKEN_ID);
  return Number(row?.balance ?? 0);
}

export async function fetchAccountKey(accountId) {
  const res = await fetch(`${MIRROR}/accounts/${accountId}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Mirror account ${res.status}`);
  const body = await res.json();
  if (!body.key?.key || !body.key?._type) {
    throw new Error("This account has no single public key the studio can check");
  }
  return body.key;
}

export function verifyAccountSignature(message, signatureB64, mirrorKey) {
  const sig = Buffer.from(String(signatureB64 || ""), "base64");
  if (sig.length < 64) return false;
  const raw = Buffer.from(String(mirrorKey.key || ""), "hex");
  let pub;
  if (mirrorKey._type === "ED25519") pub = PublicKey.fromBytesED25519(raw);
  else if (mirrorKey._type === "ECDSA_SECP256K1") pub = PublicKey.fromBytesECDSA(raw);
  else return false;
  const bytes = Buffer.from(message, "utf8");
  if (pub.verify(bytes, sig)) return true;
  const prefixed = Buffer.from(
    `\x19Hedera Signed Message:\n${bytes.length}${message}`,
    "utf8",
  );
  return pub.verify(prefixed, sig);
}

function statusFrom(data) {
  return {
    tokenId: DROP_TOKEN_ID,
    perNft: PER_NFT,
    windowHours: 24,
    siteCap: data.siteCap,
    siteUsed: data.siteUsed,
    siteRemaining: Math.max(0, data.siteCap - data.siteUsed),
    minSiteCap: MIN_SITE_CAP,
    maxSiteCap: MAX_SITE_CAP,
  };
}

export function publicStatus() {
  return withLedger(async () => {
    const data = rollSite(readLedger());
    writeLedger(data);
    return statusFrom(data);
  });
}

export async function allowanceFor(accountId) {
  const id = normalizeAccountId(accountId);
  const held = await fetchHeldCount(id);
  return withLedger(async () => {
    const data = rollSite(readLedger());
    const row = accountRow(data, id, new Date());
    writeLedger(data);
    const allowance = held * PER_NFT;
    return {
      accountId: id,
      held,
      allowance,
      used: row.used,
      remaining: Math.max(0, allowance - row.used),
      siteRemaining: Math.max(0, data.siteCap - data.siteUsed),
      siteCap: data.siteCap,
    };
  });
}

export function createChallenge(accountId) {
  const id = normalizeAccountId(accountId);
  const challengeId = randomBytes(16).toString("hex");
  const exp = Date.now() + CHALLENGE_MS;
  const message = [
    "IC SPICY drop studio",
    `account: ${id}`,
    `nonce: ${challengeId}`,
    `expires: ${exp}`,
  ].join("\n");
  challenges.set(challengeId, { accountId: id, message, exp });
  return { challengeId, message, expiresAt: exp };
}

function takeChallenge(challengeId, accountId) {
  const row = challenges.get(challengeId);
  challenges.delete(challengeId);
  if (!row || row.accountId !== accountId || row.exp < Date.now()) {
    throw new Error("Sign in again. That studio challenge expired.");
  }
  return row.message;
}

export const PROMPT_MAX_JSON = 8000;

export function composePrompt(style, subject) {
  const look = STYLES[style] || STYLES.photo;
  const text = String(subject || "").replace(/\s+/g, " ").trim();
  if (text.length < 3) throw new Error("Describe the image in a few words");
  if (text.length > 280) throw new Error("Keep the description under 280 characters");
  return `Square artwork, no text, no watermark, no logo. Style: ${look}. Subject: ${text}.`;
}

/**
 * @param {{ style?: string, subject?: string, promptMode?: string }} input
 * @returns {string}
 */
export function resolvePrompt({ style, subject, promptMode }) {
  const mode = String(promptMode || "describe").toLowerCase();
  const raw = String(subject ?? "").trim();
  if (mode === "json") {
    if (raw.length < 3) throw new Error("Paste a JSON prompt or full prompt text");
    if (raw.length > PROMPT_MAX_JSON) {
      throw new Error(`JSON prompt must be under ${PROMPT_MAX_JSON} characters`);
    }
    if (raw.startsWith("{") || raw.startsWith("[")) {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("Invalid JSON — fix syntax or switch to Describe mode");
      }
      if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
      if (parsed && typeof parsed === "object" && typeof parsed.prompt === "string") {
        const p = parsed.prompt.trim();
        if (p.length >= 3) return p.slice(0, PROMPT_MAX_JSON);
      }
      return JSON.stringify(parsed).slice(0, PROMPT_MAX_JSON);
    }
    return raw;
  }
  return composePrompt(style, subject);
}

/** @param {unknown} err */
export function friendlyImageError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    /503|Image requests are currently unavailable|not sent to the provider/i.test(msg)
  ) {
    return new Error(
      "MiniRouter image generation is temporarily unavailable (provider outage). " +
        "Check https://minirouter.sh/status and try again later. " +
        "Your holder credit for this attempt was restored.",
    );
  }
  if (/429|rate limit/i.test(msg)) {
    return new Error("MiniRouter rate limit — wait a minute and try again.");
  }
  if (/MiniRouter \d+:/.test(msg) && msg.length > 120) {
    return new Error(msg.slice(0, 220) + (msg.length > 220 ? "…" : ""));
  }
  return err instanceof Error ? err : new Error(msg);
}

function adminToken() {
  return process.env.DROP_STUDIO_ADMIN_TOKEN?.trim() || "";
}

export function assertAdminToken(header) {
  const expected = adminToken();
  const got = String(header || "").replace(/^Bearer\s+/i, "").trim();
  if (!expected || !got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function setSiteCap(nextCap) {
  const cap = Math.floor(Number(nextCap));
  if (!Number.isFinite(cap) || cap < MIN_SITE_CAP || cap > MAX_SITE_CAP) {
    throw new Error(`Ceiling must be from ${MIN_SITE_CAP} to ${MAX_SITE_CAP}`);
  }
  return withLedger(async () => {
    const data = rollSite(readLedger());
    data.siteCap = cap;
    writeLedger(data);
    return statusFrom(data);
  });
}

export async function generateForHolder({
  accountId,
  challengeId,
  signature,
  style,
  subject,
  promptMode,
}) {
  const id = normalizeAccountId(accountId);
  const message = takeChallenge(String(challengeId || ""), id);
  const key = await fetchAccountKey(id);
  if (!verifyAccountSignature(message, signature, key)) {
    throw new Error("HashPack signature did not match this account");
  }
  const prompt = resolvePrompt({ style, subject, promptMode });
  const held = await fetchHeldCount(id);
  if (held < 1) throw new Error("Hold an IC SPICY Hedera Drop NFT to generate");

  await withLedger(async () => {
    const data = rollSite(readLedger());
    const row = accountRow(data, id, new Date());
    const allowance = held * PER_NFT;
    if (row.used >= allowance) {
      throw new Error(`Daily holder limit reached (${row.used}/${allowance})`);
    }
    if (data.siteUsed >= data.siteCap) {
      throw new Error(`Studio ceiling reached (${data.siteUsed}/${data.siteCap} today)`);
    }
    row.used += 1;
    data.siteUsed += 1;
    writeLedger(data);
  });

  try {
    const image = await generateHolderImage(prompt);
    const status = await allowanceFor(id);
    return {
      prompt,
      mimeType: image.mimeType || "image/png",
      imageBase64: image.base64,
      mock: Boolean(image.mock),
      ...status,
    };
  } catch (err) {
    await withLedger(async () => {
      const data = readLedger();
      const row = data.accounts[id];
      if (row && row.used > 0) row.used -= 1;
      if (data.siteUsed > 0) data.siteUsed -= 1;
      writeLedger(data);
    });
    throw friendlyImageError(err);
  }
}
