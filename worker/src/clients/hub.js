import { Actor, HttpAgent } from "@dfinity/agent";
import { agentHubIdlFactory } from "../idl/agent-hub.js";
import { backendIdlFactory } from "../idl/backend.js";

export function getHost(network) {
  if (network === "local") {
    return process.env.IC_HOST ?? "http://127.0.0.1:4943";
  }
  return "https://icp0.io";
}

export async function createHubActor(identity) {
  const canisterId = process.env.AGENT_HUB_CANISTER_ID?.trim();
  if (!canisterId) throw new Error("AGENT_HUB_CANISTER_ID required");
  const host = getHost(process.env.DFX_NETWORK ?? "ic");
  const agent = new HttpAgent({ host, identity });
  if (host.includes("127.0.0.1")) await agent.fetchRootKey();
  return Actor.createActor(agentHubIdlFactory, { agent, canisterId });
}

export async function createBackendActor(identity) {
  const canisterId =
    process.env.BACKEND_CANISTER_ID?.trim() ?? "ghxmp-xiaaa-aaaao-ba4sq-cai";
  const host = getHost(process.env.DFX_NETWORK ?? "ic");
  const agent = new HttpAgent({ host, identity });
  if (host.includes("127.0.0.1")) await agent.fetchRootKey();
  return Actor.createActor(backendIdlFactory, { agent, canisterId });
}

export async function loadSecrets(hub, names) {
  const pairs = await hub.getSecrets(names);
  const map = Object.fromEntries(pairs);
  return map;
}
