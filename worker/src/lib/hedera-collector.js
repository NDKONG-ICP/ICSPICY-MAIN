/**
 * Budgeted Hedera NFT collection purchases (allowlist only).
 */

import { recordSpend } from "./spend-ledger.js";
import { collectionFacts } from "../clients/sentx-public.js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(HERE, "../../data/dapp-registry.json");

const DEFAULT_COLLECTIONS = [
  { id: "wild-tigers", name: "Wild Tigers", htsTokenId: "0.0.6024491", status: "approved", budgetHbar: 100 },
  { id: "rooster-cartel", name: "Rooster Cartel", htsTokenId: "0.0.855050", status: "approved", budgetHbar: 100 },
  { id: "gilmore-estates", name: "Gilmore Estates", htsTokenId: "0.0.2145122", status: "approved", budgetHbar: 100 },
  { id: "grumpy-ducks", name: "Grumpy Ducks", htsTokenId: "0.0.10818349", status: "approved", budgetHbar: 100 },
];

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) {
    return { collections: DEFAULT_COLLECTIONS };
  }
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
}

/**
 * Reads SentX floors for approved collections. Does not buy.
 * 0.0.10910751 is the drop treasury, so a floor buy would spend listing HBAR.
 */
export async function runHederaCollectorTick() {
  const reg = loadRegistry();
  const rows = reg.collections ?? DEFAULT_COLLECTIONS;
  const alerts = [];
  for (const col of rows.filter((c) => c.status === "approved")) {
    if (!col.htsTokenId) {
      alerts.push({
        type: "token_missing",
        collection: col.name,
        note: "Set htsTokenId in worker/data/dapp-registry.json",
      });
      continue;
    }
    try {
      const facts = await collectionFacts(col.htsTokenId);
      const budget = Number(col.budgetHbar ?? 100);
      const above = !Number.isFinite(facts.floor) || facts.floor > budget;
      alerts.push({
        type: above ? "floor_above_budget" : "floor_inside_budget",
        collection: facts.name || col.name,
        tokenId: col.htsTokenId,
        floor: facts.floor,
        budgetHbar: budget,
        marketplaceUrl: facts.marketplaceUrl,
        note: above
          ? "Floor is above the collection budget, so no buy is sent."
          : "Floor is inside the budget. Buys stay off while 0.0.10910751 is the drop treasury.",
      });
    } catch (e) {
      alerts.push({
        type: "facts_failed",
        collection: col.name,
        tokenId: col.htsTokenId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { alerts, approvedCount: alerts.length };
}

export function recordManualHederaBuy(collectionId, hbarSpent, txId) {
  return recordSpend("hbar", hbarSpent, `hedera_nft:${collectionId}`, txId);
}
