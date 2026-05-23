import type { ActorSubclass } from "@dfinity/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type {
  CommentId,
  PostId,
  PostPublic,
  _SERVICE,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function useCommunityBackendActor() {
  return useActor<Backend>(createActor);
}

/** Page size aligned with Phase 7 community feeds. */
export const ADMIN_COMMUNITY_PAGE_SIZE = 20n;

export function useAdminCommunityPosts(offset: bigint) {
  const { actor } = useCommunityBackendActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["admin", "community", "posts", offset.toString()],
    queryFn: async (): Promise<Array<PostPublic>> => {
      if (!svc) throw new Error("Backend actor not connected");
      return svc.listAllPostsAdmin(offset, ADMIN_COMMUNITY_PAGE_SIZE);
    },
    enabled: !!svc && actorReady && offset >= 0n,
  });
}

export function useAdminDeletePost() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: PostId) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.adminDeletePost(postId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "community", "posts"] });
      void qc.invalidateQueries({ queryKey: ["community"] });
    },
  });
}

export function useAdminDeleteComment() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: CommentId) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.adminDeleteComment(commentId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "community", "posts"] });
      void qc.invalidateQueries({ queryKey: ["community"] });
    },
  });
}

export function useBanUser() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.banUser(principal);
    },
    onSuccess: (_, principal) => {
      void qc.invalidateQueries({ queryKey: ["community"] });
      void qc.invalidateQueries({
        queryKey: ["admin", "community", "ban", principal.toText()],
      });
    },
  });
}

export function useUnbanUser() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.unbanUser(principal);
    },
    onSuccess: (_, principal) => {
      void qc.invalidateQueries({ queryKey: ["community"] });
      void qc.invalidateQueries({
        queryKey: ["admin", "community", "ban", principal.toText()],
      });
    },
  });
}

export function useIsUserBanned(target: Principal | undefined) {
  const { actor } = useCommunityBackendActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["admin", "community", "ban", target?.toText()],
    queryFn: async (): Promise<boolean> => {
      if (!svc || !target) return false;
      return svc.isUserBanned(target);
    },
    enabled: !!svc && actorReady && target !== undefined,
  });
}
