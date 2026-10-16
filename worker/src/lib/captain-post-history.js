import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH =
  process.env.CAPTAIN_POST_HISTORY?.trim() ||
  join(__dirname, "../../data/captain-post-history.json");
const MAX_ENTRIES = 2000;

function normalizeBody(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function bodyHash(text) {
  return createHash("sha256").update(normalizeBody(text)).digest("hex");
}

function eightGrams(text) {
  const words = normalizeBody(text).split(" ").filter(Boolean);
  const grams = new Set();
  for (let i = 0; i <= words.length - 8; i += 1) {
    grams.add(words.slice(i, i + 8).join(" "));
  }
  return grams;
}

function readHistory() {
  try {
    if (!existsSync(HISTORY_PATH)) return { entries: [] };
    const raw = JSON.parse(readFileSync(HISTORY_PATH, "utf8"));
    return { entries: Array.isArray(raw.entries) ? raw.entries : [] };
  } catch {
    return { entries: [] };
  }
}

function writeHistory(data) {
  mkdirSync(dirname(HISTORY_PATH), { recursive: true });
  writeFileSync(HISTORY_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

export function getRecentTopics(limit = 14) {
  const { entries } = readHistory();
  return entries
    .slice(-limit)
    .map((e) => e.topic)
    .filter(Boolean);
}

export function isDuplicatePostBody(body) {
  const hash = bodyHash(body);
  const grams = eightGrams(body);
  const { entries } = readHistory();
  for (const e of entries) {
    if (e.hash === hash) return true;
    if (e.grams && grams.size) {
      const prev = new Set(e.grams);
      for (const g of grams) {
        if (prev.has(g)) return true;
      }
    }
  }
  return false;
}

export function recordPublishedPost({ body, topic, slot }) {
  const hash = bodyHash(body);
  const grams = [...eightGrams(body)].slice(0, 40);
  const { entries } = readHistory();
  entries.push({
    at: new Date().toISOString(),
    hash,
    topic: topic ?? null,
    slot: slot ?? null,
    preview: normalizeBody(body).slice(0, 120),
    grams,
  });
  while (entries.length > MAX_ENTRIES) entries.shift();
  writeHistory({ version: 1, entries });
  return hash;
}
