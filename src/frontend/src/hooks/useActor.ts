import type { createActorFunction } from "@caffeineai/core-infrastructure";
import { createActorWithConfig } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "./useAuth";

function hasAccessControl(actor: unknown): boolean {
  return (
    typeof actor === "object" &&
    actor !== null &&
    "_initializeAccessControl" in actor
  );
}

const ACTOR_QUERY_KEY = "actor";

/**
 * Replaces @caffeineai/core-infrastructure useActor: builds backend actor with
 * IdentityKit-derived identity from useAuth.
 */
export function useActor<T>(createActorFn: createActorFunction<T>): {
  actor: T | null;
  isFetching: boolean;
} {
  const { identity } = useAuth();
  const queryClient = useQueryClient();

  const principalText = identity?.getPrincipal().toText() ?? "anon";

  const actorQuery = useQuery({
    queryKey: [ACTOR_QUERY_KEY, principalText],
    queryFn: async () => {
      if (!identity) {
        return await createActorWithConfig<T>(createActorFn);
      }
      const actor = await createActorWithConfig<T>(createActorFn, {
        agentOptions: { identity },
      });
      if (hasAccessControl(actor)) {
        await (
          actor as { _initializeAccessControl: () => Promise<unknown> }
        )._initializeAccessControl();
      }
      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data ?? null,
    isFetching: actorQuery.isFetching,
  };
}
