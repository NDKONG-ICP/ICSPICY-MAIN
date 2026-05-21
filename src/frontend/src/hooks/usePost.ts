import type { ActorSubclass } from "@dfinity/agent";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type {
  CommentId,
  CreateCommentInput,
  CreatePostInput,
  PostId,
  PostWithComments,
  _SERVICE,
} from "../declarations/backend.did";
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

/** Invalidate Phase 7 community feed caches after post/comment mutations. */
export function invalidateCommunityFeeds(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ["community", "feed"] });
}

export function invalidatePostDetail(qc: QueryClient, postId: PostId): void {
  void qc.invalidateQueries({
    queryKey: ["community", "post", postId.toString()],
  });
}

export function usePostWithComments(postId: PostId | undefined) {
  const { actor, isFetching } = useCommunityBackendActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);

  const enabled =
    !!svc &&
    postId !== undefined &&
    !isFetching &&
    (isAuthenticated ? actorReady : true);

  return useQuery({
    queryKey: ["community", "post", postId?.toString()],
    queryFn: async (): Promise<PostWithComments | null> => {
      if (!svc || postId === undefined) return null;
      const res = await svc.getPostWithComments(postId);
      if (res.length === 0) return null;
      return res[0]!;
    },
    enabled,
  });
}

/** List comments for one post (`["community", "comments", postId]` cache key). */
export function usePostComments(postId: PostId | undefined) {
  const { actor, isFetching } = useCommunityBackendActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);

  const enabled =
    !!svc &&
    postId !== undefined &&
    !isFetching &&
    (isAuthenticated ? actorReady : true);

  return useQuery({
    queryKey: ["community", "comments", postId?.toString()],
    queryFn: async () => {
      if (!svc || postId === undefined) return [];
      return svc.listCommentsByPost(postId);
    },
    enabled,
  });
}

function invalidatePostComments(qc: QueryClient, postId: PostId): void {
  void qc.invalidateQueries({
    queryKey: ["community", "comments", postId.toString()],
  });
}

export function useCreatePost() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.createPost(input);
    },
    onSuccess: () => {
      invalidateCommunityFeeds(qc);
    },
  });
}

export function useEditPost() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      newContent,
    }: {
      postId: PostId;
      newContent: string;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.editPost(postId, newContent);
    },
    onSuccess: (_ok, vars) => {
      invalidateCommunityFeeds(qc);
      invalidatePostDetail(qc, vars.postId);
    },
  });
}

export function useDeletePost() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: PostId) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.deletePost(postId);
    },
    onSuccess: (_ok, postId) => {
      invalidateCommunityFeeds(qc);
      invalidatePostDetail(qc, postId);
      void qc.removeQueries({
        queryKey: ["community", "post", postId.toString()],
      });
    },
  });
}

export function useToggleLikePost() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      callerLiked,
    }: {
      postId: PostId;
      callerLiked: boolean;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      if (callerLiked) {
        await svc.unlikePost(postId);
      } else {
        await svc.likePost(postId);
      }
    },
    onSuccess: (_res, vars) => {
      invalidateCommunityFeeds(qc);
      invalidatePostDetail(qc, vars.postId);
    },
  });
}

export function useCreateComment() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.createComment(input);
    },
    onSuccess: (_c, vars) => {
      invalidateCommunityFeeds(qc);
      invalidatePostDetail(qc, vars.post_id);
      invalidatePostComments(qc, vars.post_id);
    },
  });
}

/** Backend `likeComment` is a toggle (`toggleLikeComment`). */
export function useToggleLikeComment() {
  const { actor } = useCommunityBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      commentId: CommentId;
      postId: PostId;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.likeComment(vars.commentId);
    },
    onSuccess: (_ok, vars) => {
      invalidateCommunityFeeds(qc);
      invalidatePostDetail(qc, vars.postId);
      invalidatePostComments(qc, vars.postId);
    },
  });
}
