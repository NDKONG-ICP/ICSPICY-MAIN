import { Link } from "@tanstack/react-router";
import { Principal } from "@icp-sdk/core/principal";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import type { RefObject } from "react";
import type { Backend } from "@/backend";
import { useActor } from "@/hooks/useActor";
import { requireBackendRaw } from "@/lib/backend-raw";
import { formatShu } from "../config";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import type { ArcadeEffectsTier } from "./arcade-device-tier";
import {
  getLeaderboardSignMap,
  type LeaderboardSignMap,
} from "./leaderboard-sign-map";

function useProfileLabel(principal: Principal) {
  const { actor } = useActor<Backend>();
  return useQuery({
    queryKey: ["games", "profileLabel", principal.toText()],
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

/** Only truncate handles longer than this; keep a long prefix so similar names stay distinct. */
const SIGN_NAME_TRUNCATE_AT = 16;
const SIGN_NAME_KEEP_CHARS = 14;

function formatSignDisplayName(label: string): string {
  if (label.length <= SIGN_NAME_TRUNCATE_AT) return label;
  return `${label.slice(0, SIGN_NAME_KEEP_CHARS)}…`;
}

function SignNameLink({ principal }: { principal: Principal }) {
  const { data: label, isPending } = useProfileLabel(principal);
  const pid = principal.toText();
  const display = label ? formatSignDisplayName(label) : pid.slice(0, 10);
  return (
    <Link
      to="/u/$user"
      params={{ user: pid }}
      className="sign-name-link"
      title={label && label.length > SIGN_NAME_TRUNCATE_AT ? label : undefined}
    >
      {isPending ? (
        <span className="sign-name-link__skeleton" aria-hidden />
      ) : (
        <span className="sign-name-link__label">{display}</span>
      )}
    </Link>
  );
}

export function SignBulbGlows({
  effects,
  sign,
}: {
  effects: ArcadeEffectsTier;
  sign: LeaderboardSignMap;
}) {
  if (effects === "static") return null;
  const { stepSec, cycleSec } = sign.bulbChase;

  return (
    <div className="sign-bulbs" aria-hidden>
      {sign.bulbsLeft.map((b, i) => (
        <span
          key={`l-${i}`}
          className="arcade-bulb-glow"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.r * 2}%`,
            height: `${b.r * 2}%`,
            animationDuration: `${cycleSec}s`,
            animationDelay: `${i * stepSec}s`,
            ["--bulb-delay" as string]: `${i * stepSec}s`,
            ["--bulb-cycle" as string]: `${cycleSec}s`,
          }}
        />
      ))}
      {sign.bulbsRight.map((b, i) => (
        <span
          key={`r-${i}`}
          className="arcade-bulb-glow"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.r * 2}%`,
            height: `${b.r * 2}%`,
            animationDuration: `${cycleSec}s`,
            animationDelay: `${i * stepSec}s`,
            ["--bulb-delay" as string]: `${i * stepSec}s`,
            ["--bulb-cycle" as string]: `${cycleSec}s`,
          }}
        />
      ))}
    </div>
  );
}

export function SignAtmosphere({
  effects,
  sign,
}: {
  effects: ArcadeEffectsTier;
  sign: LeaderboardSignMap;
}) {
  if (effects === "static") return null;

  return (
    <>
      <div className="sign-vignette" aria-hidden />
      <div className="sign-embers" aria-hidden>
        {sign.embers.map((e, i) => (
          <span
            key={i}
            className="sign-ember"
            style={{
              left: `${e.x}%`,
              top: `${e.y}%`,
              animationDelay: `${e.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

export function SignRowOverlay({
  rank,
  principal,
  score,
  isYou,
  effects,
  index,
  rowRef,
  sign,
}: {
  rank: number;
  principal: Principal;
  score: bigint;
  isYou: boolean;
  effects: ArcadeEffectsTier;
  index: number;
  rowRef?: RefObject<HTMLDivElement | null>;
  sign: LeaderboardSignMap;
}) {
  const rowMap = sign.rows[index];
  if (!rowMap) return null;

  const flip = effects === "full";
  const lite = effects === "lite";
  const instant = effects === "static";
  const cols = sign.columns;

  return (
    <motion.div
      ref={rowRef}
      className={[
        "sign-row",
        isYou ? "sign-row--you" : "",
        rank === 1 ? "sign-row--first" : "",
      ].join(" ")}
      style={{
        top: `${rowMap.y}%`,
        height: `${rowMap.height}%`,
        ["--sign-rotate" as string]: `${rowMap.rotate}deg`,
      }}
      initial={
        instant
          ? false
          : flip
            ? { rotateX: -88, opacity: 0 }
            : lite
              ? { opacity: 0, y: 4 }
              : { opacity: 0 }
      }
      animate={
        instant ? undefined : flip ? { rotateX: 0, opacity: 1 } : { opacity: 1, y: 0 }
      }
      transition={
        instant
          ? undefined
          : {
              delay: Math.min(index * 0.04, 0.9),
              duration: flip ? 0.36 : 0.2,
              type: "spring",
              stiffness: 300,
              damping: 28,
            }
      }
      data-ocid={isYou ? "arcade-lb-you-row" : undefined}
    >
      <span
        className="sign-row__rank"
        style={{
          left: `${cols.rank.left}%`,
          width: `${cols.rank.width}%`,
        }}
      >
        {rank}
      </span>
      <div
        className="sign-row__name"
        style={{
          left: `${cols.name.left}%`,
          width: `${cols.name.width}%`,
          maxWidth: `${cols.name.width}%`,
        }}
      >
        <SignNameLink principal={principal} />
      </div>
      <span
        className="sign-row__score"
        style={{
          left: `${cols.score.left}%`,
          width: `${cols.score.width}%`,
        }}
      >
        {formatShu(score)}
      </span>
    </motion.div>
  );
}

export function SignPlayer({ principal }: { principal: Principal }) {
  const { data: label, isPending } = useProfileLabel(principal);
  const pid = principal.toText();
  return (
    <Link to="/u/$user" params={{ user: pid }} className="sign-player">
      <CommunityAvatar principalText={pid} size="sm" />
      {isPending ? (
        <span className="sign-player__skeleton" aria-hidden />
      ) : (
        <span className="sign-player__label">{label ?? pid.slice(0, 8)}</span>
      )}
    </Link>
  );
}

export function SignDebugOverlay({ sign }: { sign: LeaderboardSignMap }) {
  const board = sign.board;
  return (
    <div className="sign-debug" aria-hidden>
      <span
        className="sign-debug__divider"
        style={{
          left: `${sign.columns.dividerX}%`,
          top: `${board.top}%`,
          bottom: `${board.bottom}%`,
        }}
      />
      <span
        className="sign-debug__col sign-debug__col--rank"
        style={{
          left: `${sign.columns.rank.left}%`,
          width: `${sign.columns.rank.width}%`,
          top: `${board.top}%`,
          bottom: `${board.bottom}%`,
        }}
      />
      <span
        className="sign-debug__col sign-debug__col--name"
        style={{
          left: `${sign.columns.name.left}%`,
          width: `${sign.columns.name.width}%`,
          top: `${board.top}%`,
          bottom: `${board.bottom}%`,
        }}
      />
      <span
        className="sign-debug__col sign-debug__col--score"
        style={{
          left: `${sign.columns.score.left}%`,
          width: `${sign.columns.score.width}%`,
          top: `${board.top}%`,
          bottom: `${board.bottom}%`,
        }}
      />
      {sign.rows.map((row, i) => (
        <span
          key={i}
          className="sign-debug__row"
          style={{
            top: `${row.y - row.height / 2}%`,
            height: `${row.height}%`,
          }}
        />
      ))}
    </div>
  );
}

export type { LeaderboardSignMap };
export { getLeaderboardSignMap };
