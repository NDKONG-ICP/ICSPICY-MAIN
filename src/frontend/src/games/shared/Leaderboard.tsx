import { Link } from "@tanstack/react-router";
import { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import type { Backend } from "../../backend";
import { CommunityAvatar } from "../../components/community/CommunityAvatar";
import { Skeleton } from "../../components/ui/skeleton";
import { useActor } from "../../hooks/useActor";
import { requireBackendRaw } from "../../lib/backend-raw";
import { formatShu } from "../config";

export interface LeaderboardRow {
  rank: number;
  principal: Principal;
  score: bigint;
  displayData: string;
}

function useProfileLabel(principal: Principal) {
  const { actor } = useActor<Backend>();
  return useQuery({
    queryKey: ["games", "profileLabel", principal.toText()],
    queryFn: async () => {
      const raw = requireBackendRaw(actor);
      const r = await raw.getPublicProfile(principal);
      if (r.length === 0) return null;
      const p = r[0]!;
      const un = p.username.trim();
      return un.length > 0 ? `@${un}` : `…${principal.toText().slice(-5)}`;
    },
    enabled: !!actor,
    staleTime: 120_000,
  });
}

function LeaderboardPlayer({
  principal,
  highlight,
  surface,
}: {
  principal: Principal;
  highlight: boolean;
  surface: "default" | "carnival";
}) {
  const { data: label, isPending } = useProfileLabel(principal);
  const pid = principal.toText();

  return (
    <Link
      to="/u/$user"
      params={{ user: pid }}
      className={[
        "flex min-w-0 items-center gap-2 rounded-md transition-smooth",
        surface === "carnival"
          ? highlight
            ? "text-[var(--arcade-ink)] font-semibold"
            : "text-[var(--arcade-ink-muted)] hover:text-[var(--arcade-ink)]"
          : [
              "hover:text-primary",
              highlight ? "text-orange-300" : "text-foreground",
            ].join(" "),
      ].join(" ")}
    >
      <CommunityAvatar principalText={pid} size="sm" />
      {isPending ? (
        <Skeleton className="h-3 w-16" />
      ) : (
        <span className="truncate text-xs font-medium">{label ?? pid.slice(0, 8)}</span>
      )}
    </Link>
  );
}

export function Leaderboard({
  rows,
  currentPrincipal,
  loading,
  compact = false,
  surface = "default",
  emptyMessage = "No scores yet — be the first!",
  scoreLabel,
}: {
  rows: LeaderboardRow[];
  currentPrincipal?: string;
  loading?: boolean;
  compact?: boolean;
  /** Cream carnival panel — dark ink for readability. */
  surface?: "default" | "carnival";
  emptyMessage?: string;
  /** Optional metric hint shown after score (e.g. "best batch"). */
  scoreLabel?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2" data-ocid="games-leaderboard-loading">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className={compact ? "h-8 w-full" : "h-10 w-full"} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground/80" data-ocid="games-leaderboard-empty">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ol
      className={compact ? "space-y-1.5" : "space-y-2"}
      data-ocid="games-leaderboard"
    >
      {rows.map((row) => {
        const isYou =
          currentPrincipal != null &&
          row.principal.toText() === currentPrincipal;
        const carnival = surface === "carnival";
        return (
          <li
            key={`${row.rank}-${row.principal.toText()}`}
            className={[
              "flex items-center gap-2 rounded-lg border px-2 py-1.5",
              carnival
                ? isYou
                  ? "border-[var(--arcade-wood)]/50 bg-[var(--arcade-cream-dark)]/80"
                  : "border-[var(--arcade-wood)]/25 bg-[var(--arcade-cream)]/55"
                : isYou
                  ? "border-orange-500/40 bg-orange-500/10"
                  : "border-white/[0.06] bg-white/[0.02]",
            ].join(" ")}
          >
            <span
              className={[
                "w-5 shrink-0 text-center text-[10px] font-bold tabular-nums",
                carnival
                  ? row.rank === 1
                    ? "text-[var(--arcade-brass)]"
                    : "text-[var(--arcade-ink-muted)]"
                  : row.rank === 1
                    ? "text-amber-400"
                    : "text-muted-foreground",
              ].join(" ")}
            >
              {row.rank}
            </span>
            <div className="min-w-0 flex-1">
              <LeaderboardPlayer
                principal={row.principal}
                highlight={!!isYou}
                surface={surface}
              />
            </div>
            <span
              className={[
                "shrink-0 text-xs font-bold tabular-nums",
                carnival ? "text-[var(--arcade-ink)]" : "text-orange-400",
              ].join(" ")}
              title={scoreLabel ? `${formatShu(row.score)} ${scoreLabel}` : undefined}
            >
              {formatShu(row.score)} 🔥
              {scoreLabel ? (
                <span className="ml-0.5 text-[8px] font-normal opacity-70">
                  {scoreLabel}
                </span>
              ) : null}
            </span>
            {isYou && (
              <span
                className={[
                  "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                  carnival
                    ? "bg-[var(--arcade-wood)]/15 text-[var(--arcade-ink)]"
                    : "bg-orange-500/20 text-orange-300",
                ].join(" ")}
              >
                You
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
