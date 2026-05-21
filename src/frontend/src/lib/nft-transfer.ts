import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory, type _SERVICE } from "../declarations/backend.did.js";
import { BACKEND_CANISTER_ID } from "./auth-config";

const IC_HOST = import.meta.env.DEV
  ? "http://127.0.0.1:4943"
  : "https://icp-api.io";

async function backendActor(identity: Identity) {
  const agent = await HttpAgent.create({ host: IC_HOST, identity });
  if (import.meta.env.DEV) {
    await agent.fetchRootKey();
  }
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
}

export async function transferNft(
  identity: Identity,
  tokenId: bigint,
  recipientPrincipal: string,
): Promise<bigint> {
  const actor = await backendActor(identity);
  const toOwner = Principal.fromText(recipientPrincipal);
  const results = await actor.icrc7_transfer([
    {
      token_id: tokenId,
      from_subaccount: [],
      to: { owner: toOwner, subaccount: [] },
      memo: [],
      created_at_time: [],
    },
  ]);
  const first = results[0];
  if (first == null || first.length === 0) {
    throw new Error("Transfer returned no result");
  }
  const result = first[0];
  if (result == null) {
    throw new Error("NFT transfer rejected by canister");
  }
  if ("Err" in result) {
    throw new Error("NFT transfer failed");
  }
  return result.Ok;
}
