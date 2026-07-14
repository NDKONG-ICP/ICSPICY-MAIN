import { GameSubmitStatus } from "../shared/GameSubmitStatus";
import type { GamePlayerStats, GameRank } from "../shared/useGameBackend";

export function SlicerSubmitStatus({
  isAuthenticated,
  rankedSession,
  isPending,
  submitError,
  submitOk,
  myRank,
  myStats,
  rankLoading,
  onTryAgain,
}: {
  isAuthenticated: boolean;
  rankedSession: boolean;
  isPending: boolean;
  submitError: string | null;
  submitOk: {
    score: bigint;
    bestScore: bigint;
    isNewBest: boolean;
  } | null;
  myRank: GameRank | null | undefined;
  myStats: GamePlayerStats | null | undefined;
  rankLoading: boolean;
  onTryAgain: () => void;
}) {
  return (
    <GameSubmitStatus
      isAuthenticated={isAuthenticated}
      isPending={isPending}
      submitError={submitError}
      submitOk={submitOk}
      myRank={myRank}
      myStats={myStats}
      rankLoading={rankLoading}
      onTryAgain={onTryAgain}
      rankedSessionUnavailable={!rankedSession}
      thisRunLabel="This run"
    />
  );
}
