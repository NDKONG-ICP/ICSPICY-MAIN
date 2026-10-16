/**
 * Captain Capsaicin trader policy. Paper mode only.
 * A passing check never emits a live order. Hold is the default.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOTTER_PATH =
  process.env.CAPTAIN_POLICY_BLOTTER?.trim() ||
  join(__dirname, "../../data/captain-policy-blotter.json");

export const POLICY_MODE = "paper";
export const PROFIT_TARGET_USD = 1200;
export const MAX_LEVERAGE = 2;
export const DAILY_LOSS_HALT_PCT = 1;

export const SLEEVES = {
  retirement: {
    id: "retirement",
    purpose: "Long-term growth. Not the source of the monthly target.",
    liveTrading: false,
    leverage: false,
  },
  dryPowder: {
    id: "dryPowder",
    purpose: "Only sleeve that may seek the monthly target, and only on paper until funded.",
    liveTrading: false,
    maxLeverage: MAX_LEVERAGE,
    dailyLossHaltPct: DAILY_LOSS_HALT_PCT,
  },
  ops: {
    id: "ops",
    purpose: "Posts, images, mint fees, marketplace approvals.",
    liveTrading: false,
    monthlyCaps: { hbar: 1000, icp: 20 },
  },
};

const ACTIONS = new Set(["buy", "sell", "hold", "stake"]);

function check(checks, name, pass, detail) {
  checks.push({ name, pass, detail });
}

/**
 * @param {object} order
 * @param {object} [ctx]
 * @param {string[]} [ctx.allowlist]
 * @param {string[]} [ctx.stockAllowlist]
 * @param {boolean} [ctx.dailyLossHalted]
 */
export function evaluateOrder(order, ctx = {}) {
  const checks = [];
  const action = String(order?.action || "");
  const sleeve = String(order?.sleeve || "");
  const leverage = Number(order?.leverage ?? 1);

  if (!ACTIONS.has(action)) {
    check(checks, "action", false, "action must be buy, sell, hold, or stake");
  } else {
    check(checks, "action", true, action);
  }

  if (!SLEEVES[sleeve]) {
    check(checks, "sleeve", false, "unknown sleeve");
  } else {
    check(checks, "sleeve", true, sleeve);
  }

  if (action === "hold") {
    check(checks, "hold", true, "hold is the default and needs no venue");
  } else if (!order?.venue) {
    check(checks, "venue", false, "venue required");
  } else if (!(ctx.allowlist || []).includes(order.venue)) {
    check(checks, "allowlist", false, "venue is not on the admin allowlist");
  } else {
    check(checks, "allowlist", true, order.venue);
  }

  if (sleeve === "retirement" && action !== "hold" && action !== "stake") {
    check(checks, "retirement", false, "retirement does not buy or sell");
  } else if (sleeve === "retirement" && Number(order?.leverage) > 1) {
    check(checks, "retirement", false, "retirement does not use leverage");
  } else if (sleeve === "retirement") {
    check(checks, "retirement", true, "retirement sleeve stays intact");
  }

  if (sleeve === "ops" && action !== "hold") {
    check(checks, "ops", false, "ops sleeve does not trade or stake");
  }

  if (action === "stake") {
    if (sleeve !== "retirement" || order?.stakeable !== true) {
      check(checks, "stake", false, "stake only a retirement asset marked stakeable");
    } else {
      check(checks, "stake", true, "stakeable retirement slice");
    }
  }

  if (leverage > 1) {
    if (sleeve !== "dryPowder") {
      check(checks, "leverage", false, "leverage is only allowed in dry powder");
    } else if (leverage > MAX_LEVERAGE) {
      check(checks, "leverage", false, `leverage ${leverage} exceeds ${MAX_LEVERAGE}x`);
    } else if (!order?.stop) {
      check(checks, "stop", false, "a stop is required before any leverage");
    } else {
      check(checks, "leverage", true, `${leverage}x with a stop`);
    }
  } else {
    check(checks, "leverage", true, "unlevered");
  }

  if (sleeve === "dryPowder" && ctx.dailyLossHalted) {
    check(checks, "loss-halt", false, "daily loss halt is active");
  }

  if (order?.tokenizedStock) {
    const id = String(order.instrument || "");
    if (!(ctx.stockAllowlist || []).includes(id)) {
      check(checks, "stocks", false, "tokenized stock is not on the admin allowlist");
    } else {
      check(checks, "stocks", true, id);
    }
  }

  const passed = checks.every((c) => c.pass);
  let decision = "reject";
  let reason = "policy rejected";
  if (passed && action === "hold") {
    decision = "hold";
    reason = "accepted as hold";
  } else if (passed) {
    decision = "paper";
    reason = "paper mode: checks passed, live order blocked";
  }

  return {
    passed,
    execute: false,
    decision,
    reason,
    checks,
    mode: POLICY_MODE,
  };
}

function readBlotter() {
  try {
    if (!existsSync(BLOTTER_PATH)) return { entries: [] };
    const raw = JSON.parse(readFileSync(BLOTTER_PATH, "utf8"));
    if (Array.isArray(raw.entries)) return raw;
    return { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function writeBlotter(data) {
  mkdirSync(dirname(BLOTTER_PATH), { recursive: true });
  writeFileSync(BLOTTER_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

export function recordDecision(order, result) {
  const data = readBlotter();
  data.entries.push({
    at: new Date().toISOString(),
    order: {
      action: order.action,
      sleeve: order.sleeve,
      venue: order.venue ?? null,
      instrument: order.instrument ?? null,
      leverage: order.leverage ?? 1,
    },
    decision: result.decision,
    reason: result.reason,
    execute: false,
    checks: result.checks,
  });
  data.entries = data.entries.slice(-100);
  writeBlotter(data);
  return data.entries;
}

export function getBlotter() {
  return readBlotter().entries;
}

/** One hold row so the desk shows the engine is loaded and not trading. */
export function ensurePaperHold() {
  const entries = getBlotter();
  if (entries.some((e) => e.decision === "hold")) return entries;
  const order = {
    action: "hold",
    sleeve: "retirement",
    instrument: "core",
  };
  const result = evaluateOrder(order, {});
  return recordDecision(order, result);
}
