// ICRC-7 actor bridge — uses Internet Identity from useAuth.

import { Actor, type ActorSubclass, HttpAgent } from "@icp-sdk/core/agent";
import { useQuery } from "@tanstack/react-query";
import { type _SERVICE, idlFactory } from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";
import { BACKEND_CANISTER_ID, IC_HOST } from "./auth-config";

const ICRC7_ACTOR_QUERY_KEY = "icrc7_actor";

export type Icrc7Actor = ActorSubclass<_SERVICE>;

export function useIcrc7Actor(): {
  actor: Icrc7Actor | null;
  isFetching: boolean;
} {
  const { identity, isAuthenticated, isInitializing } = useAuth();
  const principalText = identity?.getPrincipal().toText() ?? "anon";

  const q = useQuery({
    queryKey: [ICRC7_ACTOR_QUERY_KEY, principalText],
    queryFn: async () => {
      const agentOpts = isAuthenticated && identity ? { identity } : {};
      const agent = new HttpAgent({
        host: IC_HOST,
        ...agentOpts,
      });
      if (import.meta.env.DEV) {
        await agent.fetchRootKey().catch(() => {});
      }
      return Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: !isInitializing,
  });

  return { actor: q.data ?? null, isFetching: q.isFetching || isInitializing };
}
