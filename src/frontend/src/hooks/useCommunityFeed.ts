import type { ActorSubclass } from "@dfinity/agent";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type { PostPublic, _SERVICE } from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

export type FeedMode = "global" | "following" | "trending";

/** Page length for infinite community feeds — matches `_SERVICE.getGlobalFeed(offset, limit)` pattern. */
export const COMMUNITY_FEED_PAGE_SIZE = 20n;

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function useCommunityBackendActor() {
  return useActor<Backend>(createActor);
}

/**
 * Infinite feed for Phase 7 community timelines.
 *
 * - `global` / `following`: offset/limit paging on canister queries.
 * - `trending`: canister exposes only `limit` (no offset); we page by requesting a cumulative top-N slice and slicing client-side.
 */
export function useInfiniteCommunityFeed(mode: FeedMode) {
  const { actor } = useCommunityBackendActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated, principal } = useAuth();
  const svc = rawService(actor);

  const principalText = principal?.toText() ?? "";

  const enabled =
    !!svc && (mode !== "following" || (isAuthenticated && actorReady));

  return useInfiniteQuery({
    queryKey: ["community", "feed", mode, actorReady, principalText],
    initialPageParam: 0,
    enabled,
    queryFn: async ({
      pageParam,
    }: { pageParam: number }): Promise<PostPublic[]> => {
      if (!svc) throw new Error("Backend actor not connected");

      switch (mode) {
        case "global": {
          const offset = BigInt(pageParam) * COMMUNITY_FEED_PAGE_SIZE;
          return svc.getGlobalFeed(offset, COMMUNITY_FEED_PAGE_SIZE);
        }
        case "following": {
          const offset = BigInt(pageParam) * COMMUNITY_FEED_PAGE_SIZE;
          return svc.getFollowingFeed(offset, COMMUNITY_FEED_PAGE_SIZE);
        }
        case "trending": {
          const lim = Number(COMMUNITY_FEED_PAGE_SIZE) * (pageParam + 1);
          const all = await svc.getTrendingPosts(BigInt(lim));
          const start = pageParam * Number(COMMUNITY_FEED_PAGE_SIZE);
          return all.slice(start, start + Number(COMMUNITY_FEED_PAGE_SIZE));
        }
      }
    },
    getNextPageParam: (
      lastPage: PostPublic[],
      _pages: unknown,
      pageParam: number,
    ) => {
      if (lastPage.length < Number(COMMUNITY_FEED_PAGE_SIZE)) return undefined;
      return pageParam + 1;
    },
  });
}

/** Flatten infinite pages for simple list rendering. */
export function flattenCommunityFeedPages(
  pages: PostPublic[][] | undefined,
): PostPublic[] {
  if (!pages?.length) return [];
  return pages.flat();
}

export function useFlattenedCommunityFeed(mode: FeedMode) {
  const q = useInfiniteCommunityFeed(mode);
  const posts = useMemo(
    () => flattenCommunityFeedPages(q.data?.pages),
    [q.data?.pages],
  );
  return { ...q, posts };
}

/** Alias matching request naming (`useCommunityFeed.ts`). */
export { useInfiniteCommunityFeed as useCommunityFeed };
