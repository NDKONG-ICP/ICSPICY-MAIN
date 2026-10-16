import type { ActorSubclass } from "@dfinity/agent";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type {
  CompeteCategory,
  CreatePostInput,
  JoinChallengeInput,
  SubmitMetricsInput,
  _SERVICE,
} from "../declarations/backend.did";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

export const WINTER_GROW_ID = "winter-grow";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function useChallengeActor() {
  return useActor<Backend>(createActor);
}

function normalizeCreatePostInput(input: CreatePostInput): CreatePostInput {
  return {
    content: input.content,
    image_keys: input.image_keys ?? [],
    anonymous: input.anonymous,
    image_key: input.image_key ?? [],
    plant_id: input.plant_id ?? [],
    nft_token_id: input.nft_token_id ?? [],
  };
}

export function useChallenge(challengeId = WINTER_GROW_ID) {
  const { actor, isFetching } = useChallengeActor();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["challenge", challengeId],
    queryFn: async () => {
      if (!svc) return null;
      const res = await svc.getChallenge(challengeId);
      return res.length === 1 ? res[0]! : null;
    },
    enabled: !!svc && !isFetching,
  });
}

export function useMyChallengeMembership(challengeId = WINTER_GROW_ID) {
  const { actor, isFetching } = useChallengeActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["challenge", challengeId, "membership"],
    queryFn: async () => {
      if (!svc) return null;
      const res = await svc.getMyChallengeMembership(challengeId);
      return res.length === 1 ? res[0]! : null;
    },
    enabled: !!svc && !isFetching && isAuthenticated && actorReady,
  });
}

export function useJoinChallenge() {
  const { actor } = useChallengeActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: JoinChallengeInput) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.joinChallenge(input);
    },
    onSuccess: (_m, input) => {
      void qc.invalidateQueries({ queryKey: ["challenge", input.challengeId] });
      void qc.invalidateQueries({
        queryKey: ["challenge", input.challengeId, "membership"],
      });
      void qc.invalidateQueries({
        queryKey: ["challenge", input.challengeId, "members"],
      });
    },
  });
}

export function useChallengeFeed(challengeId = WINTER_GROW_ID) {
  const { actor, isFetching } = useChallengeActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);
  const pageSize = 20n;

  return useInfiniteQuery({
    queryKey: ["challenge", challengeId, "feed", isAuthenticated],
    queryFn: async ({ pageParam }) => {
      if (!svc) return [];
      return svc.getChallengeFeed(challengeId, pageParam, pageSize);
    },
    initialPageParam: 0n,
    getNextPageParam: (lastPage, _pages, lastOffset) => {
      if (lastPage.length < Number(pageSize)) return undefined;
      return lastOffset + pageSize;
    },
    enabled: !!svc && !isFetching && (isAuthenticated ? actorReady : true),
  });
}

export function useCreateChallengePost(challengeId = WINTER_GROW_ID) {
  const { actor } = useChallengeActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.createChallengePost(
        challengeId,
        normalizeCreatePostInput(input),
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["challenge", challengeId, "feed"] });
    },
  });
}

export function useChallengeLeaderboard(
  category: CompeteCategory,
  challengeId = WINTER_GROW_ID,
) {
  const { actor, isFetching } = useChallengeActor();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["challenge", challengeId, "leaderboard", JSON.stringify(category)],
    queryFn: async () => {
      if (!svc) return [];
      return svc.getChallengeLeaderboard(challengeId, category, 50n);
    },
    enabled: !!svc && !isFetching,
  });
}

export function useMyChallengeMetrics(challengeId = WINTER_GROW_ID) {
  const { actor, isFetching } = useChallengeActor();
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["challenge", challengeId, "my-metrics"],
    queryFn: async () => {
      if (!svc) return null;
      const res = await svc.getMyChallengeMetrics(challengeId);
      return res.length === 1 ? res[0]! : null;
    },
    enabled: !!svc && !isFetching && isAuthenticated && actorReady,
  });
}

export function useSubmitChallengeMetrics(challengeId = WINTER_GROW_ID) {
  const { actor } = useChallengeActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<SubmitMetricsInput, "challengeId">) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.submitChallengeMetrics({ ...input, challengeId });
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["challenge", challengeId, "my-metrics"],
      });
      void qc.invalidateQueries({
        queryKey: ["challenge", challengeId, "leaderboard"],
      });
    },
  });
}

export function flattenChallengeFeedPages(
  pages: { pages: Awaited<ReturnType<_SERVICE["getChallengeFeed"]>>[] } | undefined,
) {
  if (!pages) return [];
  return pages.pages.flat();
}
