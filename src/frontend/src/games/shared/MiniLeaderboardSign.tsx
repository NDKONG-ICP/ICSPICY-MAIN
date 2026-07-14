import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { GameId } from "../config";
import type { LeaderboardRow } from "./Leaderboard";
import {
  SignAtmosphere,
  SignBulbGlows,
  SignRowOverlay,
} from "./leaderboard-sign-ui";
import { getLeaderboardSignMap } from "./leaderboard-sign-map";
import { getArcadeEffectsTier } from "./arcade-device-tier";
import "./arcade-leaderboard.css";
import "./mini-leaderboard-sign.css";

export function MiniLeaderboardSign({
  gameId,
  rows,
  loading,
  currentPrincipal,
  maxRows = 6,
}: {
  gameId: GameId;
  rows: LeaderboardRow[];
  loading?: boolean;
  currentPrincipal?: string;
  maxRows?: number;
}) {
  const sign = useMemo(() => getLeaderboardSignMap(gameId), [gameId]);
  const effects = useMemo(() => getArcadeEffectsTier(), []);
  const signRows = rows.slice(0, maxRows);

  return (
    <div className="mini-lb-sign" data-ocid="arcade-results-mini-lb">
      <p className="mini-lb-sign__label">Top Scores</p>
      <div className="mini-lb-sign__stage">
        <div
          className="sign-canvas mini-lb-sign__canvas"
          style={{
            aspectRatio: `${sign.intrinsicWidth} / ${sign.intrinsicHeight}`,
          }}
        >
          <img
            src={sign.src}
            alt={sign.alt}
            className="sign-photo"
            width={sign.intrinsicWidth}
            height={sign.intrinsicHeight}
            decoding="async"
          />
          <SignBulbGlows effects={effects === "static" ? "static" : "lite"} sign={sign} />
          <SignAtmosphere effects={effects === "static" ? "static" : "lite"} sign={sign} />
          {loading ? (
            <p className="sign-empty" aria-busy="true">
              Loading…
            </p>
          ) : signRows.length === 0 ? (
            <p className="sign-empty">{sign.emptyMessage}</p>
          ) : (
            <div className="sign-rows">
              {signRows.map((row, index) => {
                const isYou =
                  currentPrincipal != null &&
                  row.principal.toText() === currentPrincipal;
                return (
                  <SignRowOverlay
                    key={`mini-${row.rank}-${row.principal.toText()}`}
                    rank={row.rank}
                    principal={row.principal}
                    score={row.score}
                    isYou={isYou}
                    effects="lite"
                    index={index}
                    sign={sign}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mini-lb-sign__link"
      >
        <Link to="/games/leaderboard" search={{ game: gameId }}>
          <Trophy className="mr-1.5 h-3.5 w-3.5" />
          Full Scoreboard
        </Link>
      </Button>
    </div>
  );
}
