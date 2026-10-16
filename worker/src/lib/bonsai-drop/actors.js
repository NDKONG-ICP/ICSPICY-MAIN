import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { ICSPICY_BACKEND } from "./constants.js";
import { icspicyLedgerIdlFactory } from "../../idl/icspicy-ledger.js";
import {
  BONSAI_MARKETPLACE,
  marketplaceIdlFactory,
} from "../../clients/bonsai.js";

/**
 * @param {import("@dfinity/identity").Identity} [identity]
 */
export async function createIcspicyLedgerActor(identity, host = "https://icp-api.io") {
  const agent = await HttpAgent.create({ identity, host });
  return Actor.createActor(icspicyLedgerIdlFactory, {
    agent,
    canisterId: ICSPICY_BACKEND,
  });
}

/**
 * @param {import("@dfinity/identity").Identity} identity
 */
export async function createMarketplaceActor(identity, host = "https://icp-api.io") {
  const agent = await HttpAgent.create({ identity, host });
  return Actor.createActor(marketplaceIdlFactory, {
    agent,
    canisterId: BONSAI_MARKETPLACE,
  });
}

export function poolAccount(canisterId = ICSPICY_BACKEND) {
  return {
    owner: Principal.fromText(canisterId),
    subaccount: [],
  };
}

export function captainAccount(principalText) {
  return {
    owner: Principal.fromText(principalText),
    subaccount: [],
  };
}

export function marketplaceSpenderAccount() {
  return {
    owner: Principal.fromText(BONSAI_MARKETPLACE),
    subaccount: [],
  };
}
