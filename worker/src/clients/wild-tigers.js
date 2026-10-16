/**
 * Wild Tigers on SentX. Staking / $PAWS still has no published contract call.
 * Floor reads are live. Buys are not sent from the drop treasury.
 */

import { collectionFacts } from "./sentx-public.js";

export const WILD_TIGERS_TOKEN = "0.0.6024491";

export async function wildTigersFloor() {
  return collectionFacts(WILD_TIGERS_TOKEN);
}

export async function stakeWildTiger() {
  const facts = await wildTigersFloor();
  throw new Error(
    `Wild Tigers floor is ${facts.floor} HBAR on ${facts.tokenId}. No staking contract is published, and the worker does not buy from the drop treasury.`,
  );
}

export async function claimPaws() {
  throw new Error("Wild Tigers $PAWS claim contract is not published.");
}
