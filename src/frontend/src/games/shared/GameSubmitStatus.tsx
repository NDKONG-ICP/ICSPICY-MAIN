import { Button } from "@/components/ui/button";
import { formatShu } from "../config";
import type { GamePlayerStats, GameRank } from "./useGameBackend";
import "./game-submit-status.css";

export function friendlyGameSubmitError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("durationms implausible")) {
    return "This run's timing didn't pass validation — nothing was lost, just try another ranked game.";
  }
  if (lower.includes("sliceTimeMs outside flight window")) {
    return "A slice timestamp looked off to the server — play another ranked run to save a score.";
  }
  if (lower.includes("rate limited")) {
    return "You're submitting a bit fast — wait about a minute, then try again.";
  }
  if (lower.includes("session expired") || lower.includes("session not found")) {
    return "Your ranked session timed out — start a fresh run to save a score.";
  }
  if (lower.includes("session already consumed")) {
    return "That session was already used — start a new ranked run.";
  }
  if (lower.includes("natural subtraction") || lower.includes("trap")) {
    return "The server hit a temporary glitch — try again in a moment.";
  }
  if (lower.includes("reject") || lower.includes("failed")) {
    return "We couldn't save this score right now — your progress on screen is still real.";
  }
  return "We couldn't save this score — try again in a moment.";
}

export function GameSubmitStatus({
  isAuthenticated,
  isPending,
  submitError,
  submitOk,
  myRank,
  myStats,
  rankLoading,
  onTryAgain,
  rankedSessionUnavailable,
  successHeadline = "✓ Score recorded",
  bestLabel = "Your best",
  thisRunLabel = "This run",
  showRank = true,
  tryAgainLabel = "Try again",
}: {
  isAuthenticated: boolean;
  isPending: boolean;
  submitError: string | null;
  submitOk: {
    score: bigint | number;
    bestScore: bigint | number;
    isNewBest: boolean;
  } | null;
  myRank?: GameRank | null;
  myStats?: GamePlayerStats | null;
  rankLoading?: boolean;
  onTryAgain?: () => void;
  /** Slicer: ranked session could not be started — run is unranked. */
  rankedSessionUnavailable?: boolean;
  successHeadline?: string;
  bestLabel?: string;
  thisRunLabel?: string;
  showRank?: boolean;
  tryAgainLabel?: string;
}) {
  if (!isAuthenticated) return null;

  if (rankedSessionUnavailable && !isPending && !submitOk && !submitError) {
    return (
      <div
        className="game-submit-status game-submit-status--warn"
        role="status"
      >
        <p className="game-submit-status__headline">Ranked session unavailable</p>
        <p className="game-submit-status__detail">
          This run was played offline — it won&apos;t appear on the leaderboard.
          Play again to retry a ranked session.
        </p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="game-submit-status game-submit-status--pending" role="status">
        <p className="game-submit-status__headline">Saving your score…</p>
        <p className="game-submit-status__detail">
          Hang tight — confirming with the server.
        </p>
      </div>
    );
  }

  if (submitError) {
    return (
      <div className="game-submit-status game-submit-status--error" role="alert">
        <p className="game-submit-status__headline">Score not saved</p>
        <p className="game-submit-status__detail">
          {friendlyGameSubmitError(submitError)}
        </p>
        {onTryAgain ? (
          <Button
            type="button"
            size="sm"
            className="mt-2 border-amber-700/50 bg-amber-950/40 text-amber-100 hover:bg-amber-900/50"
            onClick={onTryAgain}
          >
            {tryAgainLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!submitOk) return null;

  const best =
    myStats != null
      ? Number(myStats.bestScore)
      : Number(submitOk.bestScore);
  const rank = myRank != null ? Number(myRank.rank) : null;
  const totalPlays =
    myStats != null ? Number(myStats.totalPlays) : null;
  const runScore = Number(submitOk.score);

  return (
    <div className="game-submit-status game-submit-status--ok" role="status">
      {submitOk.isNewBest && (
        <p className="game-submit-status__celebration">🎉 New personal best!</p>
      )}
      <p className="game-submit-status__headline">{successHeadline}</p>
      <p className="game-submit-status__detail">
        {bestLabel}: <strong>{formatShu(best)}</strong>
        {showRank ? (
          rankLoading && rank == null ? (
            <> · looking up rank…</>
          ) : rank != null ? (
            <>
              {" "}
              · Rank <strong>#{rank}</strong> among all ranked players
            </>
          ) : (
            <> · ranked board position unavailable</>
          )
        ) : null}
        {totalPlays != null && totalPlays > 0 ? (
          <> · {totalPlays} run{totalPlays === 1 ? "" : "s"} played</>
        ) : null}
      </p>
      <p className="game-submit-status__run-score">
        {thisRunLabel}: {formatShu(runScore)}
      </p>
    </div>
  );
}
