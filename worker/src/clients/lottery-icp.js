/**
 * Dvinity lottery and slots. Queries are live. Paid play is not sent:
 * buy_tickets and spins require an ICRC deposit into the game canister first.
 */

import { assertCanSpend } from "../lib/spend-ledger.js";
import { fetchDvinitySnapshot } from "./dvinity.js";

export async function inspectDvinity() {
  return fetchDvinitySnapshot();
}

export async function playDvinityLottery({ amountIcp }) {
  assertCanSpend("icp", amountIcp);
  throw new Error(
    "Dvinity ticket buys call prepare_buy_deposit, then an ICRC transfer, then buy_tickets. That transfer is not sent from the worker.",
  );
}

export async function playRuggyRiches({ amountIcp }) {
  assertCanSpend("icp", amountIcp);
  throw new Error(
    "Ruggy Riches spins spend credits already deposited on qhfek-wyaaa-aaaad-qlfxq-cai. The worker does not deposit ICP.",
  );
}
