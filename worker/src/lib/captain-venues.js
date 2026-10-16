/**
 * Venues Captain watches. Reads and paper reviews only.
 * Live buys, sells, stakes, leverage, and X posting stay off.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchDvinitySnapshot } from "../clients/dvinity.js";
import { fetchIcpSwapQuotes } from "../clients/icpswap.js";
import { collectionFacts } from "../clients/sentx-public.js";
import { evaluateOrder, getBlotter, recordDecision } from "./captain-policy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATUS_PATH =
  process.env.CAPTAIN_VENUES_STATUS?.trim() ||
  join(__dirname, "../../data/captain-venues-status.json");

export const VENUES = [
  {
    id: "dvinity",
    name: "Dvinity",
    url: "https://dvinity.eu",
    chain: "icp",
    mode: "watch",
    spends: false,
    budgetIcp: 1,
    summary:
      "Live reads of slots, scratchcards, the yearly pot, and active lotteries. A paid spin or ticket still needs an ICRC deposit, and that transfer is not sent from the worker.",
  },
  {
    id: "icpixel",
    name: "ICPixel",
    url: "https://icpixel.org",
    chain: "icp",
    mode: "watch",
    spends: false,
    budgetIcp: 2,
    summary:
      "Layered pixel editor. Projects stay in the browser session. Captain does not mint a collection from an unauthenticated call.",
  },
  {
    id: "icpswap",
    name: "ICPSwap",
    url: "https://app.icpswap.com",
    chain: "icp",
    mode: "paper",
    spends: false,
    summary:
      "Public ICP, ckBTC, ckETH, and ckUSDC quotes. Swaps and staking are paper decisions and reject while the venue allowlist is empty.",
  },
  {
    id: "oisy",
    name: "Oisy",
    url: "https://oisy.com",
    chain: "icp",
    mode: "paper",
    spends: false,
    summary:
      "ckBTC, ckETH, and ckUSDC are the cash sleeve. Tokenized stocks stay off until an admin allowlist entry exists.",
  },
  {
    id: "clown",
    name: "Clown",
    url: "https://clown.it.com",
    chain: "social",
    mode: "manual",
    spends: false,
    summary:
      "Campaigns need an X account this project controls. Captain does not post, follow, or farm engagement.",
  },
  {
    id: "maptf",
    name: "MAPTF",
    url: "https://maptf.io",
    chain: "icp",
    mode: "paper",
    spends: false,
    summary:
      "Pro-trader ecosystem watch. Orders go through the paper policy. Live leverage stays off.",
  },
  {
    id: "caffeine",
    name: "Caffeine",
    url: "https://caffeine.ai",
    chain: "icp",
    mode: "manual",
    spends: false,
    summary:
      "App builds are started by an operator in Caffeine and linked from icspicy.app. Captain does not launch canisters on its own.",
  },
];

function catalogRow(venue, extra = {}) {
  return {
    id: venue.id,
    name: venue.name,
    url: venue.url,
    chain: venue.chain,
    mode: venue.mode,
    spends: false,
    budgetIcp: venue.budgetIcp ?? null,
    summary: venue.summary,
    reachable: null,
    detail: "Not probed yet",
    quotes: [],
    ...extra,
    spends: false,
  };
}

export function readCollectionStatus() {
  try {
    if (!existsSync(STATUS_PATH)) return [];
    const saved = JSON.parse(readFileSync(STATUS_PATH, "utf8"));
    return Array.isArray(saved.collections) ? saved.collections : [];
  } catch {
    return [];
  }
}

export function readVenueStatus() {
  try {
    if (!existsSync(STATUS_PATH)) return VENUES.map((v) => catalogRow(v));
    const saved = JSON.parse(readFileSync(STATUS_PATH, "utf8"));
    const byId = new Map((saved.venues || []).map((row) => [row.id, row]));
    return VENUES.map((venue) => catalogRow(venue, byId.get(venue.id) || {}));
  } catch {
    return VENUES.map((v) => catalogRow(v));
  }
}

async function ping(url) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  return res.status;
}

function reviewedToday(venueId) {
  const day = new Date().toISOString().slice(0, 10);
  return getBlotter().some(
    (entry) =>
      String(entry.at || "").startsWith(day) &&
      entry.order?.venue === venueId &&
      entry.order?.action === "buy",
  );
}

function reviewVenue(venue) {
  if (reviewedToday(venue.id)) return;
  const order = {
    action: "buy",
    sleeve: "dryPowder",
    venue: venue.id,
    instrument: venue.id,
    leverage: 1,
  };
  const result = evaluateOrder(order, { allowlist: [], stockAllowlist: [] });
  if (result.execute !== false) {
    throw new Error(`paper review tried to execute ${venue.id}`);
  }
  recordDecision(order, result);
}

async function collectionFloors() {
  const rows = [
    ["Wild Tigers", "0.0.6024491", 100],
    ["Rooster Cartel Gen 0", "0.0.855050", 100],
    ["Gilmore Estates Early Adaptor", "0.0.2145122", 100],
    ["Grumpy Ducks", "0.0.10818349", 100],
  ];
  const out = [];
  for (const [name, tokenId, budgetHbar] of rows) {
    try {
      const facts = await collectionFacts(tokenId);
      out.push({
        name,
        tokenId,
        floor: facts.floor,
        budgetHbar,
        aboveBudget: facts.floor > budgetHbar,
        marketplaceUrl: facts.marketplaceUrl,
      });
    } catch (err) {
      out.push({
        name,
        tokenId,
        error: err instanceof Error ? err.message : "facts failed",
      });
    }
  }
  return out;
}

export async function probeCaptainVenues() {
  const venues = [];
  let quotes = [];
  let dvinity = null;
  try {
    quotes = await fetchIcpSwapQuotes();
  } catch (err) {
    quotes = [];
    console.error("[venues] ICPSwap quotes", err instanceof Error ? err.message : err);
  }
  try {
    dvinity = await fetchDvinitySnapshot();
  } catch (err) {
    console.error("[venues] Dvinity", err instanceof Error ? err.message : err);
  }
  const collections = await collectionFloors();
  for (const venue of VENUES) {
    let reachable = false;
    let detail = "unreachable";
    try {
      const status = await ping(venue.url);
      reachable = status >= 200 && status < 400;
      detail = reachable ? `HTTP ${status}` : `HTTP ${status}`;
    } catch (err) {
      detail = err instanceof Error ? err.message : "probe failed";
    }
    if (venue.id === "dvinity" && dvinity?.summary) {
      detail = dvinity.summary;
      reachable = true;
    }
    const row = catalogRow(venue, {
      reachable,
      detail,
      quotes: venue.id === "icpswap" || venue.id === "oisy" ? quotes : [],
      probedAt: new Date().toISOString(),
    });
    venues.push(row);
    reviewVenue(venue);
  }
  const payload = { updatedAt: new Date().toISOString(), venues, collections };
  mkdirSync(dirname(STATUS_PATH), { recursive: true });
  writeFileSync(STATUS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  return venues;
}
