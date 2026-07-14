/**
 * Games backend hooks — uses requireBackendRaw (not the drifting backend.ts wrapper).
 */
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../../backend";
import { requireBackendRaw } from "../../lib/backend-raw";
import { useActor } from "../../hooks/useActor";
import { useAuth } from "../../hooks/useAuth";
import { publishSlicerShare } from "../slicer/slicer-share-publish";
import { slicerShareUrl } from "../slicer/slicer-share-copy";
import type { GameId } from "../config";

export const LEADERBOARD_MAX = 100;

export interface GameLeaderboardEntry {
  principal: Principal;
  score: bigint;
  displayData: string;
}

export interface GamePlayerStats {
  bestScore: bigint;
  totalPlays: bigint;
  lastPlayed: bigint;
  displayData: string;
}

export type SubmitScoreResult =
  | { ok: { bestScore: bigint; totalPlays: bigint; isNewBest: boolean } }
  | { err: string };

function parseSubmitResult(raw: unknown): SubmitScoreResult {
  const r = raw as { ok?: unknown; err?: string };
  if (r.err != null) return { err: r.err };
  const ok = r.ok as
    | { bestScore: bigint; totalPlays: bigint; isNewBest: boolean }
    | undefined;
  if (!ok) return { err: "Invalid response" };
  return { ok };
}

export interface GameRank {
  rank: bigint;
  score: bigint;
  displayData: string;
}

export function useGameLeaderboard(gameId: GameId, limit = 3) {
  const { actor } = useActor<Backend>();
  return useQuery({
    queryKey: ["games", "leaderboard", gameId, limit],
    queryFn: async (): Promise<GameLeaderboardEntry[]> => {
      const raw = requireBackendRaw(actor);
      const rows = await raw.getGameLeaderboard(gameId, BigInt(limit));
      return rows.map((row) => ({
        principal: row.principal,
        score: row.score,
        displayData: row.displayData,
      }));
    },
    enabled: !!actor,
    staleTime: 30_000,
  });
}

export function useMyGameRank(gameId: GameId) {
  const { actor } = useActor<Backend>();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["games", "myRank", gameId],
    queryFn: async (): Promise<GameRank | null> => {
      const raw = requireBackendRaw(actor);
      const r = await raw.getMyGameRank(gameId);
      if (r.length === 0) return null;
      const rank = r[0]!;
      return {
        rank: rank.rank,
        score: rank.score,
        displayData: rank.displayData,
      };
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 30_000,
  });
}

export function useMyGameStats(gameId: GameId) {
  const { actor } = useActor<Backend>();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["games", "myStats", gameId],
    queryFn: async (): Promise<GamePlayerStats | null> => {
      const raw = requireBackendRaw(actor);
      const r = await raw.getMyGameStats(gameId);
      if (r.length === 0) return null;
      const s = r[0]!;
      return {
        bestScore: s.bestScore,
        totalPlays: s.totalPlays,
        lastPlayed: s.lastPlayed,
        displayData: s.displayData,
      };
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 15_000,
  });
}

export function useStartGameSession(gameId: GameId) {
  const { actor } = useActor<Backend>();
  return useMutation({
    mutationFn: async (): Promise<
      { ok: { sessionId: string; seed: bigint } } | { err: string }
    > => {
      const raw = requireBackendRaw(actor);
      const result = await raw.startGameSession(gameId);
      const r = result as {
        ok?: { sessionId: string; seed: bigint };
        err?: string;
      };
      if (r.err != null) return { err: r.err };
      if (!r.ok) return { err: "Invalid response" };
      return { ok: r.ok };
    },
  });
}

export function useSubmitSlicerRun() {
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      sliceLogJson,
    }: {
      sessionId: string;
      sliceLogJson: string;
    }): Promise<
      | {
          ok: {
            score: bigint;
            bestCombo: bigint;
            tier: string;
            rareChilisSliced: bigint;
            isNewBest: boolean;
            bestScore: bigint;
            badgesEarned: Array<{
              badgeType: string;
              tokenId: bigint;
              isNew: boolean;
            }>;
          };
        }
      | { err: string }
    > => {
      const raw = requireBackendRaw(actor);
      const result = await raw.submitSlicerRun(sessionId, sliceLogJson);
      const r = result as {
        ok?: {
          score: bigint;
          bestCombo: bigint;
          tier: string;
          rareChilisSliced: bigint;
          isNewBest: boolean;
          bestScore: bigint;
          badgesEarned: Array<{
            badgeType: string;
            tokenId: bigint;
            isNew: boolean;
          }>;
        };
        err?: string;
      };
      if (r.err != null) return { err: r.err };
      if (!r.ok) return { err: "Invalid response" };
      return {
        ok: {
          ...r.ok,
          badgesEarned: r.ok.badgesEarned ?? [],
        },
      };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["games", "leaderboard", "slicer"] });
      void qc.invalidateQueries({ queryKey: ["games", "myStats", "slicer"] });
      void qc.invalidateQueries({ queryKey: ["games", "myRank", "slicer"] });
      void qc.invalidateQueries({ queryKey: ["achievements", "badges"] });
      void qc.invalidateQueries({ queryKey: ["achievements", "myBadges"] });
    },
  });
}

export function useSubmitGameScore(gameId: GameId) {
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      score,
      displayData,
    }: {
      score: bigint;
      displayData: string;
    }): Promise<SubmitScoreResult> => {
      const raw = requireBackendRaw(actor);
      const result = await raw.submitGameScore(gameId, score, displayData);
      return parseSubmitResult(result);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["games", "leaderboard", gameId] });
      void qc.invalidateQueries({ queryKey: ["games", "myStats", gameId] });
      void qc.invalidateQueries({ queryKey: ["games", "myRank", gameId] });
    },
  });
}

export interface PublishSlicerShareInput {
  principalText: string;
  username: string;
  score: number;
  lastPlayedNs: bigint;
}

export function usePublishSlicerSharePage() {
  const { actor } = useActor<Backend>();
  return useMutation({
    mutationFn: async (
      input: PublishSlicerShareInput,
    ): Promise<{ ok: { url: string; score: bigint } } | { err: string }> => {
      if (!actor) return { err: "Not connected" };
      const shareUrl = slicerShareUrl(input.principalText, input.lastPlayedNs);
      return publishSlicerShare(actor, { ...input, shareUrl });
    },
  });
}
