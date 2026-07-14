import { Link } from "@tanstack/react-router";
import { Principal } from "@icp-sdk/core/principal";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { GameId } from "../config";
import { GAMES, formatShu } from "../config";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  LEADERBOARD_MAX,
  useGameLeaderboard,
  useMyGameRank,
} from "./useGameBackend";
import {
  getArcadeEffectsTier,
  logArcadeDeviceTier,
  type ArcadeEffectsTier,
} from "./arcade-device-tier";
import {
  getLeaderboardSignMap,
  isLeaderboardSignDebug,
} from "./leaderboard-sign-map";
import {
  SignAtmosphere,
  SignBulbGlows,
  SignDebugOverlay,
  SignPlayer,
  SignRowOverlay,
} from "./leaderboard-sign-ui";
import "./arcade-leaderboard.css";

function TicketSlatRow({
  rank,
  principal,
  score,
  isYou,
  effects,
  index,
  rowRef,
}: {
  rank: number;
  principal: Principal;
  score: bigint;
  isYou: boolean;
  effects: ArcadeEffectsTier;
  index: number;
  rowRef?: RefObject<HTMLLIElement | null>;
}) {
  const flip = effects === "full";
  const lite = effects === "lite";
  const instant = effects === "static";

  return (
    <motion.li
      ref={rowRef}
      initial={
        instant
          ? false
          : flip
            ? { rotateX: -82, opacity: 0, y: 6 }
            : lite
              ? { opacity: 0, y: 4 }
              : { opacity: 0 }
      }
      animate={
        instant ? undefined : flip ? { rotateX: 0, opacity: 1, y: 0 } : { opacity: 1, y: 0 }
      }
      transition={
        instant
          ? undefined
          : {
              delay: Math.min(index * 0.02, 1),
              duration: flip ? 0.32 : 0.18,
              type: "spring",
              stiffness: 320,
              damping: 26,
            }
      }
      className={[
        "sign-ticket",
        isYou ? "sign-ticket--you" : "",
        rank <= 3 ? `sign-ticket--top${rank}` : "",
      ].join(" ")}
      data-ocid={isYou ? "arcade-lb-you-row" : undefined}
    >
      <span className="sign-ticket__rank">{rank}</span>
      <div className="sign-ticket__name">
        <SignPlayer principal={principal} />
      </div>
      <span className="sign-ticket__score">{formatShu(score)}</span>
      {isYou && <span className="sign-ticket__you-tag">You</span>}
    </motion.li>
  );
}

export function ArcadeLeaderboard({
  gameId,
  onGameChange,
  className = "",
}: {
  gameId: GameId;
  onGameChange: (id: GameId) => void;
  className?: string;
}) {
  const { principal, isAuthenticated } = useAuth();
  const principalText = principal?.toText();
  const effects = useMemo(() => getArcadeEffectsTier(), []);
  const reducedMotion = useReducedMotion() ?? false;
  const motionEffects: ArcadeEffectsTier = reducedMotion ? "static" : effects;
  const sign = useMemo(() => getLeaderboardSignMap(gameId), [gameId]);

  useEffect(() => {
    logArcadeDeviceTier();
  }, []);
  const [debug] = useState(() => isLeaderboardSignDebug());
  const scrollRef = useRef<HTMLDivElement>(null);
  const youSignRef = useRef<HTMLDivElement>(null);
  const youTicketRef = useRef<HTMLLIElement>(null);

  const { data: board, isPending: boardLoading } = useGameLeaderboard(
    gameId,
    LEADERBOARD_MAX,
  );
  const { data: myRank, isPending: rankLoading } = useMyGameRank(gameId);

  const rows = useMemo(
    () =>
      board?.map((e, i) => ({
        rank: i + 1,
        principal: e.principal,
        score: e.score,
        displayData: e.displayData,
      })) ?? [],
    [board],
  );

  const signRows = rows.slice(0, sign.rowsOnSign);
  const ticketRows = rows.slice(sign.rowsOnSign);

  const youOnBoard = useMemo(() => {
    if (!principalText) return false;
    return rows.some((r) => r.principal.toText() === principalText);
  }, [rows, principalText]);

  const yourBoardRank = useMemo(() => {
    if (!principalText) return null;
    const hit = rows.find((r) => r.principal.toText() === principalText);
    return hit?.rank ?? null;
  }, [rows, principalText]);

  const showPinnedYou =
    isAuthenticated &&
    myRank != null &&
    (myRank.rank > LEADERBOARD_MAX || !youOnBoard);

  const loading = boardLoading || (isAuthenticated && rankLoading);

  useEffect(() => {
    if (loading) return;
    const target =
      yourBoardRank != null && yourBoardRank <= sign.rowsOnSign
        ? youSignRef.current
        : yourBoardRank != null && yourBoardRank <= LEADERBOARD_MAX
          ? youTicketRef.current
          : null;
    if (!target) return;
    const id = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [gameId, loading, principalText, rows.length, sign.rowsOnSign, yourBoardRank]);

  const gameMeta = GAMES.find((g) => g.id === gameId);

  return (
    <div
      className={[
        "sign-board",
        effects === "lite" ? "sign-board--lite" : "",
        effects === "static" || reducedMotion ? "sign-board--static" : "",
        debug ? "sign-board--debug" : "",
        className,
      ].join(" ")}
      data-ocid="arcade-leaderboard"
      data-effects-tier={motionEffects}
    >
      <div
        className="mb-3 flex flex-wrap justify-center gap-1.5"
        role="tablist"
        aria-label="Game leaderboards"
      >
        {GAMES.filter((g) => g.available).map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === gameId}
            onClick={() => onGameChange(g.id)}
            className={[
              "sign-tab rounded-lg border px-2.5 py-1.5 text-[11px] transition sm:px-3 sm:text-xs",
              g.id === gameId
                ? "sign-tab--active"
                : "border-amber-900/40 bg-black/30 text-amber-200/70 hover:border-amber-700/50",
            ].join(" ")}
            data-ocid={`arcade-lb-tab-${g.id}`}
          >
            {g.emoji} {g.name.replace("ICSPICY ", "")}
          </button>
        ))}
      </div>

      {gameMeta && gameId === "crafter" && (
        <p className="sign-caption mb-3 text-center" aria-live="polite">
          Showing <strong>{gameMeta.name.replace("ICSPICY ", "")}</strong> scores
          — Crafter board photo until game board arrives
        </p>
      )}

      <div className="sign-stage">
        <div
          className="sign-canvas"
          style={{ aspectRatio: `${sign.intrinsicWidth} / ${sign.intrinsicHeight}` }}
        >
          <img
            src={sign.src}
            alt={sign.alt}
            className="sign-photo"
            width={sign.intrinsicWidth}
            height={sign.intrinsicHeight}
            decoding="async"
            fetchPriority="high"
          />

          <SignBulbGlows effects={motionEffects} sign={sign} />
          <SignAtmosphere effects={motionEffects} sign={sign} />

          {loading ? (
            <div className="sign-loading" aria-busy="true">
              {sign.rows.map((row, i) => (
                <Skeleton
                  key={i}
                  className="sign-loading__row"
                  style={{
                    top: `${row.y - row.height / 2}%`,
                    height: `${row.height}%`,
                  }}
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="sign-empty">{sign.emptyMessage}</p>
          ) : (
            <div className="sign-rows">
              {signRows.map((row, index) => {
                const isYou =
                  principalText != null &&
                  row.principal.toText() === principalText;
                return (
                  <SignRowOverlay
                    key={`sign-${row.rank}-${row.principal.toText()}`}
                    rank={row.rank}
                    principal={row.principal}
                    score={row.score}
                    isYou={isYou}
                    effects={motionEffects}
                    index={index}
                    rowRef={isYou ? youSignRef : undefined}
                    sign={sign}
                  />
                );
              })}
            </div>
          )}

          {debug && <SignDebugOverlay sign={sign} />}
        </div>

        {!loading && ticketRows.length > 0 && (
          <div
            ref={scrollRef}
            className="sign-tickets"
            data-ocid="arcade-lb-scroll"
          >
            <p className="sign-tickets__label">Ranks 9–{LEADERBOARD_MAX}</p>
            <ol className="sign-tickets__list">
              {ticketRows.map((row, index) => {
                const isYou =
                  principalText != null &&
                  row.principal.toText() === principalText;
                return (
                  <TicketSlatRow
                    key={`ticket-${row.rank}-${row.principal.toText()}`}
                    rank={row.rank}
                    principal={row.principal}
                    score={row.score}
                    isYou={isYou}
                    effects={motionEffects}
                    index={index}
                    rowRef={isYou ? youTicketRef : undefined}
                  />
                );
              })}
            </ol>
          </div>
        )}

        {showPinnedYou && myRank && principal && (
          <div className="sign-pinned" data-ocid="arcade-lb-pinned-you">
            <p className="sign-pinned__label">
              Your rank (outside top {LEADERBOARD_MAX})
            </p>
            <ol className="sign-tickets__list">
              <TicketSlatRow
                rank={Number(myRank.rank)}
                principal={principal}
                score={myRank.score}
                isYou
                effects={motionEffects}
                index={0}
              />
            </ol>
          </div>
        )}
      </div>

      {!isAuthenticated && (
        <p className="sign-auth-hint">
          Sign in with Internet Identity to highlight your row and track your
          rank.
        </p>
      )}
    </div>
  );
}
