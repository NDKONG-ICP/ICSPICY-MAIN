/**
 * /s/slicer/:principal — human-facing share landing (crawlers use published HTML).
 */
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { Seo } from "@/components/Seo";
import type { Backend } from "@/backend";
import { ARCADE_ASSETS } from "@/games/shared/arcade-assets";
import { PrizePlaque } from "@/games/shared/PrizePlaque";
import { TicketStub } from "@/games/shared/TicketStub";
import { MiniLeaderboardSign } from "@/games/shared/MiniLeaderboardSign";
import type { LeaderboardRow } from "@/games/shared/Leaderboard";
import {
  LEADERBOARD_MAX,
  useGameLeaderboard,
} from "@/games/shared/useGameBackend";
import { gameEntrySearch } from "@/games/shared/game-route-search";
import {
  bestSlicerVerification,
  countSlicerBadges,
  heatTierLabel,
  parseSlicerDisplayData,
  SLICER_DETERMINISM_DOCS_URL,
} from "@/games/slicer/slicer-share-page-helpers";
import {
  ogTitle,
  slicerShareUrl,
  tauntForTier,
  tierOgImage,
  type SlicerTierSlug,
} from "@/games/slicer/slicer-share-copy";
import "@/games/shared/arcade-theme.css";
import "@/games/shared/arcade-results.css";
import "@/games/slicer/slicer-share-page.css";
import { useActor } from "@/hooks/useActor";
import { useActorReady } from "@/hooks/useActorReady";
import { usePublicProfileFull } from "@/hooks/usePublicProfilePage";
import { requireBackendRaw } from "@/lib/backend-raw";
import type { BadgePublic } from "@/declarations/backend.did";
import { Principal } from "@icp-sdk/core/principal";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

function ShareShell({
  children,
  ocid,
}: {
  children: ReactNode;
  ocid: string;
}) {
  return (
    <div className="slicer-share arcade-theme" data-ocid={ocid}>
      <img
        src={ARCADE_ASSETS.midwayBg}
        alt=""
        className="slicer-share__midway-bg"
        aria-hidden
        decoding="async"
        fetchPriority="high"
      />
      <div className="slicer-share__midway-scrim" aria-hidden />
      <div className="slicer-share__ember" aria-hidden />
      <div className="slicer-share__content arcade-wood-brass">{children}</div>
    </div>
  );
}

export default function SlicerSharePage() {
  const { principal: principalParam } = useParams({ strict: false }) as {
    principal?: string;
  };
  const { actor, isFetching } = useActor<Backend>();
  const { actorReady } = useActorReady();
  const [verifyOpen, setVerifyOpen] = useState(false);

  const principal = useMemo(() => {
    if (!principalParam) return null;
    try {
      return Principal.fromText(principalParam);
    } catch {
      return null;
    }
  }, [principalParam]);

  const actorUp = !!actor && !isFetching && actorReady;

  const { data, isPending, isError } = useQuery({
    queryKey: ["games", "slicerShare", principalParam],
    queryFn: async () => {
      if (!principal) return null;
      const raw = requireBackendRaw(actor);
      const r = await raw.getSlicerSharePublic(principal);
      return r.length === 1 ? r[0]! : null;
    },
    enabled: actorUp && !!principal,
  });

  const { data: profile } = usePublicProfileFull(principal ?? undefined);

  const { data: badges = [] } = useQuery({
    queryKey: ["achievements", "badges", principalParam],
    queryFn: async (): Promise<BadgePublic[]> => {
      if (!principal) return [];
      const raw = requireBackendRaw(actor);
      return (await raw.getBadgesByPrincipal(principal)) as BadgePublic[];
    },
    enabled: actorUp && !!principal,
  });

  const { data: leaderboard, isPending: lbLoading } = useGameLeaderboard(
    "slicer",
    LEADERBOARD_MAX,
  );

  const lbRows: LeaderboardRow[] = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard.map((row, index) => ({
      rank: index + 1,
      principal: row.principal,
      score: row.score,
      displayData: row.displayData,
    }));
  }, [leaderboard]);

  if (!principalParam || !principal) {
    return (
      <ShareShell ocid="slicer-share-invalid">
        <header className="slicer-share__header">
          <p className="slicer-share__kicker arcade-painted-text">Prize Board</p>
          <h1 className="slicer-share__headline arcade-painted-text">
            Invalid Link
          </h1>
        </header>
        <p className="slicer-share__taunt">This share URL is not valid.</p>
        <Link
          to="/games/slicer"
          search={gameEntrySearch({})}
          className="slicer-share__cta"
        >
          <span className="slicer-share__cta-label">Play Slicer</span>
        </Link>
      </ShareShell>
    );
  }

  if (!actorUp || isPending) {
    return (
      <ShareShell ocid="slicer-share-loading">
        <header className="slicer-share__header">
          <p className="slicer-share__kicker arcade-painted-text">
            ICSPICY Slicer
          </p>
          <h1 className="slicer-share__headline arcade-painted-text">
            Prize Board
          </h1>
        </header>
        <div className="slicer-share__hero" aria-busy="true">
          <div className="slicer-share__plaque-wrap slicer-share__plaque-wrap--loading">
            <div className="slicer-share__loading-plaque" />
          </div>
        </div>
        <p className="slicer-share__loading-text arcade-painted-text">
          Unfurling the trophy…
        </p>
      </ShareShell>
    );
  }

  if (isError || !data) {
    return (
      <ShareShell ocid="slicer-share-empty">
        <header className="slicer-share__header">
          <p className="slicer-share__kicker arcade-painted-text">
            ICSPICY Slicer
          </p>
          <h1 className="slicer-share__headline arcade-painted-text">
            No Score Yet
          </h1>
        </header>
        <p className="slicer-share__taunt">
          No ranked Slicer score on-chain for this grower yet.
        </p>
        <Link
          to="/games/slicer"
          search={gameEntrySearch({})}
          className="slicer-share__cta"
          data-ocid="slicer-share-cta-empty"
        >
          <span className="slicer-share__cta-label">Play ICSPICY Slicer</span>
        </Link>
      </ShareShell>
    );
  }

  const tier = data.tierSlug as SlicerTierSlug;
  const score = Number(data.bestScore);
  const displayData = parseSlicerDisplayData(data.displayData);
  const heatTier = heatTierLabel(tier, displayData);
  const bestCombo = displayData.bestCombo ?? 0;
  const rank = Number(data.rank);
  const rankedTotal = Number(data.rankedTotal);
  const slicerBadgeCount = countSlicerBadges(badges);
  const verification = bestSlicerVerification(badges);

  const profileUsername = profile?.profile?.username?.trim();
  const username =
    profileUsername && profileUsername.length > 0
      ? profileUsername
      : data.username;
  const displayHandle =
    profileUsername && profileUsername.length > 0
      ? `@${profileUsername}`
      : data.username.startsWith("…")
        ? data.username
        : `@${data.username}`;
  const avatarKey =
    profile?.profile?.avatar_key.length === 1
      ? profile.profile.avatar_key[0]
      : undefined;

  const shareUrl = slicerShareUrl(principalParam, data.lastPlayed);
  const title = ogTitle(username, score);
  const description = tauntForTier(tier, score);
  const ogImage = tierOgImage(tier);

  const rankLabel =
    rank > 0 && rankedTotal > 0
      ? `#${rank} of ${rankedTotal.toLocaleString("en-US")}`
      : rank > 0
        ? `#${rank}`
        : "—";

  return (
    <>
      <Seo
        title={title}
        description={description}
        path={`/s/slicer/${principalParam}`}
        ogImage={ogImage}
        ogType="website"
      />
      <ShareShell ocid="slicer-share-page">
        <header className="slicer-share__header">
          <p className="slicer-share__kicker arcade-painted-text">
            ICSPICY Slicer — Prize Board
          </p>
          <h1 className="slicer-share__headline arcade-painted-text">
            Trophy Case
          </h1>
        </header>

        <section className="slicer-share__hero" aria-label="Score plaque">
          <div className="slicer-share__plaque-wrap">
            <PrizePlaque
              score={score}
              label="Final Score"
              celebrate
              isNewBest={false}
              className="slicer-share__plaque"
            />
          </div>
        </section>

        <section
          className="slicer-share__stats arcade-results__stats"
          aria-label="Run stats"
        >
          <TicketStub variant="chip" data-ocid="slicer-share-tier">
            <span className="arcade-results__stat-label">Heat Tier</span>
            <span className="arcade-results__stat-value">{heatTier}</span>
          </TicketStub>
          <TicketStub variant="chip" data-ocid="slicer-share-combo">
            <span className="arcade-results__stat-label">Best Combo</span>
            <span className="arcade-results__stat-value">
              {bestCombo > 0 ? `×${bestCombo}` : "—"}
            </span>
          </TicketStub>
          <TicketStub variant="chip" data-ocid="slicer-share-rank">
            <span className="arcade-results__stat-label">Rank</span>
            <span className="arcade-results__stat-value">{rankLabel}</span>
          </TicketStub>
          <TicketStub variant="chip" data-ocid="slicer-share-badges">
            <span className="arcade-results__stat-label">Badges Earned</span>
            <span className="arcade-results__stat-value">
              {slicerBadgeCount}
            </span>
          </TicketStub>
        </section>

        <section className="slicer-share__player" aria-label="Player">
          <Link
            to="/u/$user"
            params={{ user: principalParam }}
            className="slicer-share__player-link"
            data-ocid="slicer-share-profile"
          >
            <CommunityAvatar
              principalText={principalParam}
              username={username}
              avatarKey={avatarKey}
              size="lg"
            />
            <div className="slicer-share__player-meta">
              <span className="slicer-share__player-label">Champion</span>
              <span className="slicer-share__player-name arcade-painted-text">
                {displayHandle}
              </span>
            </div>
          </Link>
        </section>

        {verification ? (
          <section
            className="slicer-share__verify"
            data-ocid="slicer-share-verify"
            aria-label="On-chain verification"
          >
            <button
              type="button"
              className="slicer-share__verify-badge"
              onClick={() => setVerifyOpen((o) => !o)}
              aria-expanded={verifyOpen}
            >
              <ShieldCheck className="slicer-share__verify-icon" aria-hidden />
              <span className="slicer-share__verify-title">
                Replay-validated on-chain
              </span>
              <span className="slicer-share__verify-sub">
                Seed + slice log pinned to badge metadata
              </span>
              {verifyOpen ? (
                <ChevronUp className="slicer-share__verify-chevron" aria-hidden />
              ) : (
                <ChevronDown
                  className="slicer-share__verify-chevron"
                  aria-hidden
                />
              )}
            </button>
            {verifyOpen ? (
              <div className="slicer-share__verify-detail">
                <dl>
                  <dt>Seed</dt>
                  <dd>{verification.seed}</dd>
                  <dt>Slice log hash</dt>
                  <dd>{verification.sliceLogHash}</dd>
                </dl>
                <a
                  href={SLICER_DETERMINISM_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="slicer-share__verify-link"
                >
                  How we verify →
                </a>
              </div>
            ) : null}
          </section>
        ) : null}

        <p className="slicer-share__taunt">{description}</p>

        <Link
          to="/games/slicer"
          search={gameEntrySearch({})}
          className="slicer-share__cta"
          data-ocid="slicer-share-cta"
        >
          <span className="slicer-share__cta-glow" aria-hidden />
          <span className="slicer-share__cta-label">Beat This Score</span>
        </Link>

        <section
          className="slicer-share__lb arcade-results__lb"
          aria-label="Leaderboard"
        >
          <MiniLeaderboardSign
            gameId="slicer"
            rows={lbRows}
            loading={lbLoading}
            currentPrincipal={principalParam}
            maxRows={6}
          />
        </section>

        <p className="slicer-share__url-foot" title={shareUrl}>
          {shareUrl}
        </p>
      </ShareShell>
    </>
  );
}
