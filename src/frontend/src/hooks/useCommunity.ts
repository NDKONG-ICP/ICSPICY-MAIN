import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type {
  CreateCommentInput,
  CreatePostInput,
  PostId,
  SaveProfileInput,
} from "../backend";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

function useBackendActor() {
  return useActor(createActor);
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export function usePosts() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();

  // Gate on actorReady when authenticated so posts don't fire against an
  // anonymous context before the identity is confirmed. When not authenticated,
  // listPosts() is a public query — allow it through once the actor exists.
  const enabled = isAuthenticated ? actorReady && !!actor : !!actor;

  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPosts();
    },
    enabled,
    refetchInterval: 30_000,
  });
}

export function useCommentsByPost(postId: PostId | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["comments", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === undefined) return [];
      return actor.listCommentsByPost(postId);
    },
    enabled: !!actor && !isFetching && postId !== undefined,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePost() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createPost(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useLikePost() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      liked,
    }: { postId: PostId; liked: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return liked ? actor.unlikePost(postId) : actor.likePost(postId);
    },
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: ["posts"] });
      const prev = qc.getQueryData<
        Array<{ id: PostId; like_count: bigint; caller_liked: boolean }>
      >(["posts"]);
      qc.setQueryData<
        Array<{ id: PostId; like_count: bigint; caller_liked: boolean }>
      >(
        ["posts"],
        (old) =>
          old?.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  caller_liked: !liked,
                  like_count: liked ? p.like_count - 1n : p.like_count + 1n,
                }
              : p,
          ) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["posts"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useUnlikePost() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: PostId) => {
      if (!actor) throw new Error("Not connected");
      return actor.unlikePost(postId);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useCreateComment() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createComment(input);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.post_id.toString()] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useFollowUser() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      target,
      following,
    }: {
      target: Principal;
      following: boolean;
    }) => {
      if (!actor) throw new Error("Not connected");
      return following ? actor.unfollowUser(target) : actor.followUser(target);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (target: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.unfollowUser(target);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export function useUserProfile(principal: Principal | undefined) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["userProfile", principal?.toText()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getPublicProfile(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useMyProfile() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveProfile() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveProfileInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useEditPost() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      newContent,
    }: { postId: PostId; newContent: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.editPost(postId, newContent);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useDeletePost() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: PostId) => {
      if (!actor) throw new Error("Not connected");
      return actor.deletePost(postId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}
