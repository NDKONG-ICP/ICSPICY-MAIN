import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Flame } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { staticRouteSeo } from "@/lib/seo-routes.mjs";
import { ArcadeLeaderboard } from "@/games/shared/ArcadeLeaderboard";
import type { GameId } from "@/games/config";
import { GAMES } from "@/games/config";

const VALID_GAMES = new Set<GameId>(GAMES.map((g) => g.id));

function parseGameId(raw: unknown): GameId {
  if (typeof raw === "string" && VALID_GAMES.has(raw as GameId)) {
    return raw as GameId;
  }
  return "slicer";
}

export default function GamesLeaderboardPage() {
  const seo = staticRouteSeo("/games/leaderboard");
  const { track, USAGE } = useUsageTracking();
  const search = useSearch({ strict: false }) as { game?: string };
  const navigate = useNavigate();
  const initial = parseGameId(search.game);
  const [gameId, setGameId] = useState<GameId>(initial);

  useEffect(() => {
    track(
      USAGE.GAMES.LEADERBOARD_VIEW.feature,
      USAGE.GAMES.LEADERBOARD_VIEW.action,
      "leaderboard:view",
    );
  }, [track, USAGE.GAMES.LEADERBOARD_VIEW]);

  useEffect(() => {
    setGameId(parseGameId(search.game));
  }, [search.game]);

  const onGameChange = useCallback(
    (id: GameId) => {
      setGameId(id);
      void navigate({
        to: "/games/leaderboard",
        search: { game: id },
        replace: true,
      });
    },
    [navigate],
  );

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        path="/games/leaderboard"
        jsonLd={seo.jsonLd ?? undefined}
      />

      <div
        className="games-lb-page min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#120606] via-[#1a0808] to-[#2a0a00]"
        data-ocid="games-leaderboard-page"
      >
        <div className="pointer-events-none absolute inset-x-0 top-16 h-56 bg-[radial-gradient(ellipse_at_center,rgba(234,88,12,0.14),transparent_70%)]" />

        <div className="relative px-4 pt-4 sm:px-6 sm:pt-6">
          <Link
            to="/games"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-amber-200/70 transition hover:text-amber-100 sm:mb-4"
            data-ocid="games-leaderboard-back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Games Hub
          </Link>

          <div className="mb-3 flex items-center justify-center gap-2 sm:mb-4">
            <Flame className="h-5 w-5 text-orange-500" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-400/90">
              ICSPICY Arcade
            </p>
          </div>
        </div>

        <ArcadeLeaderboard gameId={gameId} onGameChange={onGameChange} />
      </div>
    </>
  );
}
