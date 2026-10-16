/**
 * Public Captain desk snapshot. No keys, no private balances from disk secrets.
 */

import { getSpendSummary, MONTHLY_CAPS } from "./spend-ledger.js";
import {
  easternDateKey,
  SLOT_LABELS,
  STANDALONE_SLOTS_PER_DAY,
} from "./captain-daily.js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DAILY_LOSS_HALT_PCT,
  ensurePaperHold,
  getBlotter,
  MAX_LEVERAGE,
  POLICY_MODE,
  PROFIT_TARGET_USD,
  SLEEVES,
} from "./captain-policy.js";
import { readCollectionStatus, readVenueStatus } from "./captain-venues.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DAILY_PATH = join(__dirname, "../../data/captain-daily.json");

function todaySlots() {
  const key = easternDateKey();
  let rec = null;
  try {
    if (existsSync(DAILY_PATH)) {
      const raw = JSON.parse(readFileSync(DAILY_PATH, "utf8"));
      rec = raw.days?.[key] ?? null;
    }
  } catch {
    rec = null;
  }
  return {
    dateET: key,
    slotsPerDay: STANDALONE_SLOTS_PER_DAY,
    labels: SLOT_LABELS,
    slotsPosted: rec?.slotsPosted ?? 0,
    slots: rec?.slots ?? [],
    platforms: ["IC SPICY Community", "Crumbeatr", "SWOP"],
    image: "MiniRouter image required on every post",
  };
}

export function buildDeskSnapshot() {
  ensurePaperHold();
  const spend = getSpendSummary();
  return {
    updatedAt: new Date().toISOString(),
    mode: POLICY_MODE,
    profitTargetUsd: PROFIT_TARGET_USD,
    profitTargetNote:
      "Target for the dry-powder sleeve after it is funded. Not a forecast, and not drawn from retirement.",
    agentAccounts: {
      status: "unavailable",
      testnet: "Q4 2026 limited partners, public testnet Q1 2027",
      mainnet: "Q2 2027, pending security review",
      url: "https://hedera.com/blog/introducing-hedera-agent-accounts/",
      note: "Live Hedera trading waits until an Agent Account enforces the rules. Captain's current key is ops-only.",
    },
    leverage: {
      max: MAX_LEVERAGE,
      dailyLossHaltPct: DAILY_LOSS_HALT_PCT,
      live: false,
    },
    sleeves: SLEEVES,
    posts: todaySlots(),
    spend: {
      month: spend.month,
      spentHbar: spend.spentHbar,
      spentIcp: spend.spentIcp,
      caps: MONTHLY_CAPS,
    },
    allocation: {
      retirement: [
        { bucket: "cash or stables", targetPct: 40 },
        { bucket: "ICP and HBAR", targetPct: 25 },
        { bucket: "NFT inventory, marked and not traded", targetPct: 20 },
        { bucket: "tokenized stocks, after an admin allowlist entry", targetPct: 15 },
      ],
      stockAllowlist: [],
      venueAllowlist: [],
    },
    venues: readVenueStatus(),
    collections: readCollectionStatus(),
    blotter: getBlotter().slice(-30).reverse(),
  };
}
