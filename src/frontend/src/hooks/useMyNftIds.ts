import { Actor, type ActorSubclass, HttpAgent } from "@icp-sdk/core/agent";
import { Principal as DfinityPrincipal } from "@dfinity/principal";
import { useQuery } from "@tanstack/react-query";
import { type _SERVICE, idlFactory } from "../declarations/backend.did";
import { useIcrc7Actor } from "../lib/icrc7-actor";
import { BACKEND_CANISTER_ID, IC_HOST } from "../lib/auth-config";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

/**
 * Query NFT token IDs for any principal (no II session needed).
 * Backend icrc7_tokens_of is a public query.
 */
export function useNftTokenIdsForPrincipal(
  ownerPrincipal: DfinityPrincipal | undefined,
) {
  const principalText = ownerPrincipal?.toText() ?? "";
  const enabled = !!ownerPrincipal && !ownerPrincipal.isAnonymous();

  return useQuery({
    queryKey: ["icrc7_tokens_of_external", principalText],
    enabled,
    queryFn: async () => {
      if (!ownerPrincipal) return [];
      const agent = new HttpAgent({ host: IC_HOST });
      if (import.meta.env.DEV) {
        await agent.fetchRootKey().catch(() => {});
      }
      const actor = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      }) as ActorSubclass<_SERVICE>;
      const account = {
        owner: ownerPrincipal,
        subaccount: [] as [],
      };
      return actor.icrc7_tokens_of(account, [], []);
    },
  });
}

/** ICRC-7 token IDs owned by the connected principal (query). */
export function useMyNftTokenIds() {
  const { principal, isAuthenticated } = useAuth();
  const { actor, isFetching } = useIcrc7Actor();
  const { actorReady } = useActorReady();
  const pid = principal?.toText() ?? "";

  return useQuery({
    queryKey: ["icrc7_tokens_of", pid],
    enabled:
      !!actor &&
      actorReady &&
      isAuthenticated &&
      !!principal &&
      !principal.isAnonymous() &&
      !isFetching,
    queryFn: async () => {
      if (!actor || !principal) return [];
      const account = {
        owner: DfinityPrincipal.fromText(principal.toText()),
        subaccount: [] as [],
      };
      const ids = await actor.icrc7_tokens_of(account, [], []);
      return ids;
    },
  });
}
