// ICRC-7 actor bridge — uses Internet Identity from useAuth.

import { loadConfig } from "@caffeineai/core-infrastructure";
import { Actor, type ActorSubclass, HttpAgent } from "@icp-sdk/core/agent";
import { useQuery } from "@tanstack/react-query";
import { type _SERVICE, idlFactory } from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";

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
      const config = await loadConfig();
      const agentOpts = isAuthenticated && identity ? { identity } : {};
      const backendHost =
        config.backend_host &&
        config.backend_host !== "undefined" &&
        config.backend_host !== ""
          ? config.backend_host
          : undefined;
      const agent = new HttpAgent({
        ...agentOpts,
        ...(backendHost ? { host: backendHost } : {}),
      });
      const isLocal =
        process.env.DFX_NETWORK === "local" ||
        !!(backendHost ?? window.location.hostname).match(
          /localhost|127\.0\.0\.1/,
        );
      if (isLocal) {
        await agent.fetchRootKey().catch(() => {});
      }
      return Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId: config.backend_canister_id,
      });
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: !isInitializing,
  });

  return { actor: q.data ?? null, isFetching: q.isFetching || isInitializing };
}
