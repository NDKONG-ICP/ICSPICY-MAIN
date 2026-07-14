import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Share2 } from "lucide-react";
import type { GameId } from "../config";
import type { LeaderboardRow } from "./Leaderboard";
import { PrizePlaque } from "./PrizePlaque";
import { TicketStub } from "./TicketStub";
import { MiniLeaderboardSign } from "./MiniLeaderboardSign";
import "./arcade-results.css";

export function ArcadeResultsPanel({
  title,
  score,
  isNewBest = false,
  stats,
  isAuthenticated,
  onSignIn,
  scoreSubmitted,
  scoreConfirmation,
  onPlayAgain,
  onModeSelect,
  playAgainLabel = "Play Again",
  modeSelectLabel,
  onShare,
  sharePending = false,
  shareDisabled = false,
  shareLabel = "Share score",
  gameId,
  lbRows,
  lbLoading,
  currentPrincipal,
  signInPrompt = "Sign in to save your score and join the leaderboard.",
  children,
}: {
  title: string;
  score: bigint | number;
  isNewBest?: boolean;
  stats?: { label: string; value: string }[];
  isAuthenticated: boolean;
  onSignIn?: () => void;
  scoreSubmitted?: boolean;
  /** Rich save confirmation (replaces generic scoreSubmitted line when set). */
  scoreConfirmation?: ReactNode;
  onPlayAgain: () => void;
  onModeSelect?: () => void;
  playAgainLabel?: string;
  modeSelectLabel?: string;
  onShare?: () => void;
  sharePending?: boolean;
  shareDisabled?: boolean;
  shareLabel?: string;
  gameId?: GameId;
  lbRows?: LeaderboardRow[];
  lbLoading?: boolean;
  currentPrincipal?: string;
  signInPrompt?: string;
  children?: ReactNode;
}) {
  return (
    <div className="arcade-results">
      <p className="arcade-results__title arcade-painted-text">{title}</p>

      <PrizePlaque score={score} isNewBest={isNewBest} />

      {stats && stats.length > 0 && (
        <div className="arcade-results__stats">
          {stats.map((s) => (
            <TicketStub key={s.label} variant="chip">
              <span className="arcade-results__stat-label">{s.label}</span>
              <span className="arcade-results__stat-value">{s.value}</span>
            </TicketStub>
          ))}
        </div>
      )}

      {!isAuthenticated && onSignIn && (
        <div className="arcade-results__signin">
          <p className="arcade-results__signin-text">{signInPrompt}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-amber-700/50 text-amber-100"
            onClick={onSignIn}
          >
            Sign in with Internet Identity
          </Button>
        </div>
      )}

      {scoreConfirmation ??
        (scoreSubmitted && (
          <p className="arcade-results__submitted">Score submitted!</p>
        ))}

      <div className="arcade-results__actions">
        {onShare ? (
          <button
            type="button"
            className="arcade-btn arcade-btn--ghost w-full gap-2 inline-flex items-center justify-center"
            onClick={onShare}
            disabled={sharePending || shareDisabled}
            data-ocid="arcade-results-share"
          >
            {sharePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {shareLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="arcade-btn w-full"
          onClick={onPlayAgain}
        >
          {playAgainLabel}
        </button>
        {onModeSelect && modeSelectLabel && (
          <button
            type="button"
            className="arcade-btn arcade-btn--ghost w-full"
            onClick={onModeSelect}
          >
            {modeSelectLabel}
          </button>
        )}
      </div>

      {children}

      {gameId && lbRows && (
        <MiniLeaderboardSign
          gameId={gameId}
          rows={lbRows}
          loading={lbLoading}
          currentPrincipal={currentPrincipal}
          maxRows={6}
        />
      )}
    </div>
  );
}
