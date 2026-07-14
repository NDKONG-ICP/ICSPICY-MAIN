import { Link } from "@tanstack/react-router";
import {
  Gamepad2,
  LayoutGrid,
  LogIn,
  Trophy,
  User,
} from "lucide-react";
import { useMemo } from "react";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useBackend";
import type { GameId } from "../config";
import { getArcadeEffectsTier } from "./arcade-device-tier";
import {
  TITLE_ASSETS,
  TITLE_COPY,
  TITLE_EMBERS,
} from "./title-assets";
import { prefersReducedMotion } from "./useCarnivalEntry";
import "./game-title-screen.css";

export interface TitleSecondaryMode {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
  dataOcid?: string;
}

export function GameTitleScreen({
  gameId,
  primaryLabel = "PLAY",
  onPlay,
  secondaryModes = [],
  assetsReady = true,
  assetsLoading = false,
  assetsError,
  loadingMessage = "Loading…",
  entering = false,
}: {
  gameId: GameId;
  primaryLabel?: string;
  onPlay: () => void;
  secondaryModes?: TitleSecondaryMode[];
  assetsReady?: boolean;
  assetsLoading?: boolean;
  assetsError?: string;
  loadingMessage?: string;
  /** Fade-in after carnival boot transition. */
  entering?: boolean;
}) {
  const { isAuthenticated, login, principal } = useAuth();
  const { data: profile, isPending: profilePending } = useProfile();
  const copy = TITLE_COPY[gameId];
  const heroSrc = TITLE_ASSETS[gameId];

  const motionOn = useMemo(() => {
    if (prefersReducedMotion()) return false;
    return getArcadeEffectsTier() !== "static";
  }, []);

  const handleLabel =
    profile?.username.trim().length
      ? `@${profile!.username.trim()}`
      : principal
        ? `…${principal.toText().slice(-5)}`
        : "";

  const avatarKey =
    profile?.avatar_key?.length === 1 ? profile.avatar_key[0] : undefined;

  return (
    <div
      className={[
        "game-title",
        motionOn ? "game-title--motion" : "",
        entering ? "game-title--enter" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-ocid={`game-title-${gameId}`}
    >
      <div className="game-title__hero-wrap" aria-hidden>
        <img
          src={heroSrc}
          alt=""
          className="game-title__hero"
          decoding="async"
          fetchPriority="high"
        />
        <div className="game-title__scrim" />
        {motionOn && (
          <div className="game-title__embers">
            {TITLE_EMBERS.map((e, i) => (
              <span
                key={i}
                className="game-title__ember"
                style={{
                  left: `${e.x}%`,
                  top: `${e.y}%`,
                  animationDelay: `${e.delay}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="game-title__content">
        <header className="game-title__top">
          <h1 className="game-title__heading">{copy.title}</h1>
          <p className="game-title__tagline">{copy.tagline}</p>
        </header>

        <div className="game-title__spacer" aria-hidden />

        <section className="game-title__menu">
          {assetsLoading || !assetsReady ? (
            <div className="game-title__loading">
              <div className="game-title__spinner" aria-hidden />
              <p>{loadingMessage}</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="game-title__play"
                onClick={onPlay}
                data-ocid={`game-title-play-${gameId}`}
              >
                <Gamepad2 className="h-5 w-5" aria-hidden />
                {primaryLabel}
              </button>

              {secondaryModes.map((mode) => (
                <button
                  key={mode.label}
                  type="button"
                  className="game-title__secondary"
                  onClick={mode.onClick}
                  disabled={mode.disabled}
                  data-ocid={mode.dataOcid}
                >
                  {mode.label}
                </button>
              ))}

              {secondaryModes.some((m) => m.hint) && (
                <p className="game-title__hint">
                  {secondaryModes.find((m) => m.hint)?.hint}
                </p>
              )}

              {assetsError && (
                <p className="game-title__hint">{assetsError}</p>
              )}
            </>
          )}
        </section>

        <div className="game-title__player">
          {isAuthenticated && principal ? (
            <div className="game-title__player-inner">
              <CommunityAvatar
                principalText={principal.toText()}
                username={profile?.username}
                avatarKey={avatarKey}
                size="sm"
              />
              <span className="truncate text-amber-100/90">
                {profilePending ? "…" : handleLabel}
              </span>
            </div>
          ) : (
            <div className="game-title__player-inner">
              <span className="game-title__player-guest">
                GUEST — sign in to save your score
              </span>
              <button
                type="button"
                className="game-title__nav-link"
                onClick={() => login()}
                data-ocid="game-title-sign-in"
              >
                <LogIn className="h-3 w-3" aria-hidden />
                Sign In
              </button>
            </div>
          )}
        </div>

        <nav className="game-title__nav" aria-label="Game navigation">
          <Link
            to="/games/leaderboard"
            search={{ game: copy.leaderboardGame }}
            className="game-title__nav-link"
            data-ocid="game-title-leaderboard"
          >
            <Trophy className="h-3 w-3" aria-hidden />
            Leaderboard
          </Link>
          <Link
            to="/games"
            className="game-title__nav-link"
            data-ocid="game-title-hub"
          >
            <LayoutGrid className="h-3 w-3" aria-hidden />
            Games Hub
          </Link>
          {isAuthenticated && principal ? (
            <Link
              to="/u/$user"
              params={{ user: principal.toText() }}
              className="game-title__nav-link"
              data-ocid="game-title-profile"
            >
              <User className="h-3 w-3" aria-hidden />
              Profile
            </Link>
          ) : (
            <button
              type="button"
              className="game-title__nav-link"
              onClick={() => login()}
              data-ocid="game-title-nav-sign-in"
            >
              <LogIn className="h-3 w-3" aria-hidden />
              Sign In
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
