import type { ActorSubclass } from "@dfinity/agent";
import type { Principal } from "@icp-sdk/core/principal";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type { _SERVICE } from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return actor as unknown as ActorSubclass<_SERVICE>;
}

function useCommunityBackendActor() {
  return useActor<Backend>(createActor);
}

function invalidateAfterFollowMutation(
  qc: QueryClient,
  target: Principal,
): void {
  void qc.invalidateQueries({ queryKey: ["community", "follow"] });
  void qc.invalidateQueries({
    queryKey: ["community", "follow", target.toText()],
  });
  void qc.invalidateQueries({ queryKey: ["community", "feed", "following"] });
  void qc.invalidateQueries({ queryKey: ["community", "profile"] });
}

export function useIsFollowing(target: Principal | undefined) {
  const { actor } = useCommunityBackendActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["community", "follow", target?.toText() ?? "__none__"],
    queryFn: async (): Promise<boolean> => {
      if (!svc || !target) return false;
      return svc.isFollowing(target);
    },
    enabled: !!svc && actorReady && target !== undefined && isAuthenticated,
  });
}

/**
 * Set explicit follow/unfollow (`followUser` / `unfollowUser`).
 */
export function useFollowMutation() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      target,
      follow,
    }: {
      target: Principal;
      follow: boolean;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      if (follow) return svc.followUser(target);
      return svc.unfollowUser(target);
    },
    onSuccess: (_ok, { target }) => {
      invalidateAfterFollowMutation(qc, target);
    },
  });
}

/** @deprecated Prefer `useFollowMutation` with explicit `{ follow }` — `followUser` only adds edges. */
export function useToggleFollow() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (target: Principal) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.followUser(target);
    },
    onSuccess: (_ok, target) => {
      invalidateAfterFollowMutation(qc, target);
    },
  });
}
