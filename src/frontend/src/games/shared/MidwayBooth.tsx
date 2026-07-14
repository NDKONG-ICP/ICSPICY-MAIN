import { Link } from "@tanstack/react-router";
import { Principal } from "@icp-sdk/core/principal";
import { Crown, Gamepad2, Trophy } from "lucide-react";
import type { GameDefinition } from "../config";
import { formatShu } from "../config";
import { ARCADE_BOOTH_BY_GAME } from "./arcade-assets";
import { useGameLeaderboard } from "./useGameBackend";
import { useQuery } from "@tanstack/react-query";
import type { Backend } from "@/backend";
import { useActor } from "@/hooks/useActor";
import { requireBackendRaw } from "@/lib/backend-raw";
import { Skeleton } from "@/components/ui/skeleton";
import "./midway-booth.css";

function useProfileLabel(principal: Principal) {
  const { actor } = useActor<Backend>();
  return useQuery({
    queryKey: ["games", "midwayLabel", principal.toText()],
    queryFn: async () => {
      const raw = requireBackendRaw(actor);
      const r = await raw.getPublicProfile(principal);
      if (r.length === 0) return null;
      const un = r[0]!.username.trim();
      return un.length > 0 ? `@${un}` : `…${principal.toText().slice(-5)}`;
    },
    enabled: !!actor,
    staleTime: 120_000,
  });
}

function SlatRow({
  rank,
  principal,
  score,
}: {
  rank: number;
  principal: Principal;
  score: bigint;
}) {
  const { data: label, isPending } = useProfileLabel(principal);
  const pid = principal.toText();
  return (
    <li className="arcade-midway-slat">
      <span className="arcade-midway-slat__rank">{rank}</span>
      <Link to="/u/$user" params={{ user: pid }} className="arcade-midway-slat__name">
        {isPending ? "…" : (label ?? pid.slice(0, 8))}
      </Link>
      <span className="arcade-midway-slat__score">{formatShu(score)}</span>
    </li>
  );
}

export function MidwayBooth({ game }: { game: GameDefinition }) {
  const { data: board, isPending } = useGameLeaderboard(game.id, 3);
  const boothSrc = ARCADE_BOOTH_BY_GAME[game.id];

  const rows =
    board?.map((e, i) => ({
      rank: i + 1,
      principal: e.principal,
      score: e.score,
    })) ?? [];

  return (
    <article className="arcade-midway-booth" data-ocid={`games-booth-${game.id}`}>
      <div className="arcade-midway-booth__sign-wrap">
        {game.available ? (
          <Link
            to={game.route}
            search={{ from: "midway" }}
            className="arcade-midway-booth__sign-link"
            data-ocid={`games-play-${game.id}`}
          >
            <img
              src={boothSrc}
              alt={`${game.name} booth`}
              className="arcade-midway-booth__sign"
              loading="lazy"
              decoding="async"
            />
          </Link>
        ) : (
          <img
            src={boothSrc}
            alt={`${game.name} booth — coming soon`}
            className="arcade-midway-booth__sign arcade-midway-booth__sign--disabled"
            loading="lazy"
          />
        )}
        {game.flagship && (
          <span className="arcade-midway-booth__flagship">
            <Crown className="h-3 w-3" aria-hidden />
            Flagship
          </span>
        )}
      </div>

      <div className="arcade-midway-booth__slats">
        <p className="arcade-midway-booth__slats-label">Top 3 🔥</p>
        {isPending ? (
          <div className="space-y-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-7 w-full rounded bg-black/20" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="arcade-midway-booth__empty arcade-painted-text">
            No scores yet
          </p>
        ) : (
          <ol className="arcade-midway-booth__slat-list">
            {rows.map((row) => (
              <SlatRow
                key={row.principal.toText()}
                rank={row.rank}
                principal={row.principal}
                score={row.score}
              />
            ))}
          </ol>
        )}
      </div>

      <div className="arcade-midway-booth__actions">
        {game.available ? (
          <>
            <Link
              to={game.route}
              search={{ from: "midway" }}
              className="arcade-btn arcade-midway-booth__btn"
              data-ocid={`games-play-btn-${game.id}`}
            >
              <Gamepad2 className="mr-1.5 h-3.5 w-3.5" />
              Play
            </Link>
            <Link
              to="/games/leaderboard"
              search={{ game: game.id }}
              className="arcade-btn arcade-btn--ghost arcade-midway-booth__btn"
              data-ocid={`games-leaderboard-${game.id}`}
            >
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              Scoreboard
            </Link>
          </>
        ) : (
          <span className="arcade-btn arcade-btn--ghost arcade-midway-booth__btn opacity-60">
            Coming Soon
          </span>
        )}
      </div>
    </article>
  );
}
