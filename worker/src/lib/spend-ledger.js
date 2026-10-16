import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH =
  process.env.CAPTAIN_SPEND_LEDGER?.trim() ||
  join(__dirname, "../../data/captain-spend-ledger.json");

export const MONTHLY_CAPS = {
  hbar: 1000,
  icp: 20,
};

export const DEFAULT_PURCHASE_CAPS = {
  hbar: 100,
  icp: 2,
};

function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

function readLedger() {
  try {
    if (!existsSync(LEDGER_PATH)) {
      return { months: {}, purchaseCaps: { ...DEFAULT_PURCHASE_CAPS } };
    }
    return JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
  } catch {
    return { months: {}, purchaseCaps: { ...DEFAULT_PURCHASE_CAPS } };
  }
}

function writeLedger(data) {
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  writeFileSync(LEDGER_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

function monthBucket(data, key = monthKey()) {
  if (!data.months[key]) {
    data.months[key] = { hbar: 0, icp: 0, entries: [] };
  }
  return data.months[key];
}

export function getSpendSummary() {
  const data = readLedger();
  const bucket = monthBucket(data);
  return {
    month: monthKey(),
    spentHbar: bucket.hbar,
    spentIcp: bucket.icp,
    caps: MONTHLY_CAPS,
    purchaseCaps: data.purchaseCaps ?? DEFAULT_PURCHASE_CAPS,
    entries: bucket.entries.slice(-100),
  };
}

/**
 * @param {"hbar"|"icp"} asset
 * @param {number} amount
 * @param {string} purpose
 * @param {string} [txId]
 */
export function recordSpend(asset, amount, purpose, txId = "") {
  if (amount <= 0) throw new Error("amount must be positive");
  const data = readLedger();
  const bucket = monthBucket(data);
  const caps = data.purchaseCaps ?? DEFAULT_PURCHASE_CAPS;
  const perCap = caps[asset] ?? DEFAULT_PURCHASE_CAPS[asset];
  if (amount > perCap) {
    throw new Error(`${asset} purchase ${amount} exceeds per-purchase cap ${perCap}`);
  }
  const monthlyCap = MONTHLY_CAPS[asset];
  if (bucket[asset] + amount > monthlyCap) {
    throw new Error(`${asset} monthly cap ${monthlyCap} would be exceeded`);
  }
  bucket[asset] += amount;
  bucket.entries.push({
    at: new Date().toISOString(),
    asset,
    amount,
    purpose,
    txId,
  });
  writeLedger(data);
  return getSpendSummary();
}

export function assertCanSpend(asset, amount) {
  const data = readLedger();
  const bucket = monthBucket(data);
  const caps = data.purchaseCaps ?? DEFAULT_PURCHASE_CAPS;
  if (amount > (caps[asset] ?? DEFAULT_PURCHASE_CAPS[asset])) {
    throw new Error("per-purchase cap");
  }
  if (bucket[asset] + amount > MONTHLY_CAPS[asset]) {
    throw new Error("monthly cap");
  }
}
