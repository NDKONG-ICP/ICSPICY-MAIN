import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/ConnectButton";
import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useUsageTracking } from "../../hooks/useUsageTracking";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useBackend";
import { formatShu } from "../config";
import { BadgeCelebrationQueue } from "../shared/BadgeCelebrationQueue";
import {
  newBadgesFromEarned,
  nextScoreMilestoneProgress,
  type BadgeEarned,
} from "./slicer-badges";
import { ArcadeResultsPanel } from "../shared/ArcadeResultsPanel";
import { CarnivalBootTransition } from "../shared/CarnivalBootTransition";
import { GameShell } from "../shared/GameShell";
import { GameTitleScreen } from "../shared/GameTitleScreen";
import { ScorePopup } from "../shared/ScorePopup";
import { playSfx } from "../shared/audio";
import {
  ogTitle,
  sharePrefillText,
} from "./slicer-share-copy";
import {
  useGameLeaderboard,
  useMyGameRank,
  useMyGameStats,
  usePublishSlicerSharePage,
  useStartGameSession,
  useSubmitSlicerRun,
} from "../shared/useGameBackend";
import { guestSpawnSeed } from "./spawn-sequence";
import { useGameLoop } from "../shared/useGameLoop";
import { useGameTouchGuard } from "../shared/useGameTouchGuard";
import { useGameCanvasFit } from "../shared/useGameCanvasFit";
import { useGameTitleFlow } from "../shared/useGameTitleFlow";
import { preloadAtlas } from "./atlas";
import { SWIPE_VELOCITY_MIN } from "./constants";
import { initFxSprites } from "./draw";
import {
  SlicerEngine,
  type FrenzyCinematicTier,
  type PopupEvent,
  type PrepSpawnItem,
  type SlicerMode,
} from "./engine";
import { getArcadeEffectsTier } from "../shared/arcade-device-tier";
import { PersistenceSaveAlert } from "../shared/PersistenceSaveAlert";
import { SlicerSubmitStatus } from "./SlicerSubmitStatus";
import { useIngredientInventory } from "../shared/useIngredientInventory";
import {
  computeSliceQuality,
  pantryToSlicerKind,
} from "../shared/ingredient-types";

interface HudState {
  score: number;
  combo: number;
  lives: number;
  level: number;
  phase: string;
}

export function SlicerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playAreaRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SlicerEngine>(new SlicerEngine());
  const lastPointerRef = useRef<{ x: number; y: number; t: number } | null>(
    null,
  );

  const [popup, setPopup] = useState<PopupEvent | null>(null);
  const [started, setStarted] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetsError, setAssetsError] = useState(false);
  const [playMode, setPlayMode] = useState<SlicerMode>("arcade");
  const [hud, setHud] = useState<HudState>({
    score: 0,
    combo: 0,
    lives: 3,
    level: 1,
    phase: "ready",
  });

  const { isAuthenticated, login, principal } = useAuth();
  const { data: profile } = useProfile();
  const { track, USAGE } = useUsageTracking();
  const { inventory, convertRawToSliced, forceSave, saveError: pantrySaveError, clearSaveError } = useIngredientInventory();
  const submitRun = useSubmitSlicerRun();
  const publishShare = usePublishSlicerSharePage();
  const startSession = useStartGameSession("slicer");
  const { data: myRank, isFetching: rankLoading } = useMyGameRank("slicer");
  const { data: myStats } = useMyGameStats("slicer");
  const { data: leaderboard, isPending: lbLoading } = useGameLeaderboard(
    "slicer",
    10,
  );
  const submittedRef = useRef(false);
  const gameOverTrackedRef = useRef(false);
  const [serverScore, setServerScore] = useState<number | null>(null);
  const [celebratingBadges, setCelebratingBadges] = useState<BadgeEarned[]>([]);
  const [celebrationDone, setCelebrationDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rankedSession, setRankedSession] = useState(false);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);
  const [sharePublishing, setSharePublishing] = useState(false);

  const milestoneProgress = useMemo(
    () =>
      playMode === "arcade" && isAuthenticated
        ? nextScoreMilestoneProgress(hud.score)
        : null,
    [playMode, isAuthenticated, hud.score],
  );

  const displayUsername =
    profile?.username && profile.username.trim().length > 0
      ? profile.username.trim()
      : principal && !principal.isAnonymous()
        ? principal.toText().slice(0, 12)
        : "grower";

  const {
    showTitle,
    booting,
    titleEntering,
    onBootComplete,
    enterGameplay,
    returnToTitle,
  } = useGameTitleFlow();

  const engine = engineRef.current;

  const canShareScore =
    playMode === "arcade" &&
    isAuthenticated &&
    !submitRun.isPending &&
    !sharePublishing &&
    ((serverScore ?? engine.score) > 0 ||
      (myStats != null && Number(myStats.bestScore) > 0));

  const handleShareScore = useCallback(async () => {
    if (!canShareScore || sharePublishing) return;
    setSharePublishing(true);
    try {
      const bestScore = Number(
        myStats?.bestScore ?? serverScore ?? engine.score,
      );
      const res = await publishShare.mutateAsync({
        principalText: principal!.toText(),
        username: displayUsername,
        score: bestScore,
        lastPlayedNs: myStats?.lastPlayed ?? BigInt(Date.now() * 1_000_000),
      });
      if ("err" in res) {
        toast.error(res.err);
        return;
      }
      const url = res.ok.url;
      const score = Number(res.ok.score);
      track(USAGE.SHARE.CLICK.feature, USAGE.SHARE.CLICK.action, "slicer:share");
      const title = ogTitle(displayUsername, score);
      const text = sharePrefillText(score, url);
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch {
          // user dismissed — fall through to clipboard
        }
      }
      await navigator.clipboard.writeText(text);
      toast.success("Share text copied — paste into your feed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish share card");
    } finally {
      setSharePublishing(false);
    }
  }, [
    canShareScore,
    sharePublishing,
    publishShare,
    track,
    USAGE.SHARE.CLICK,
    displayUsername,
    myStats,
    serverScore,
    engine.score,
    principal,
  ]);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const frenzyCinematicTier = useMemo((): FrenzyCinematicTier => {
    if (reducedMotion) return "off";
    return getArcadeEffectsTier() === "full" ? "full" : "lite";
  }, [reducedMotion]);

  useEffect(() => {
    engine.frenzyCinematicTier = frenzyCinematicTier;
  }, [engine, frenzyCinematicTier]);
  const playing = started && engine.phase !== "over";
  const gameplayVisible = !booting && !showTitle;
  useGameTouchGuard(playAreaRef, playing);

  const fitCanvas = useGameCanvasFit(canvasRef, gameplayVisible, (w, h, dpr) => {
    engine.resize(w, h, dpr);
  });

  useEffect(() => {
    if (!gameplayVisible || !started) return;
    const id = requestAnimationFrame(() => {
      fitCanvas();
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) engine.draw(ctx);
    });
    return () => cancelAnimationFrame(id);
  }, [gameplayVisible, started, fitCanvas, engine]);

  useEffect(() => {
    let cancelled = false;
    void preloadAtlas().then((ok) => {
      if (cancelled) return;
      initFxSprites();
      setAssetsReady(true);
      setAssetsError(!ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const syncHud = useCallback(() => {
    setHud({
      score: engine.score,
      combo: engine.combo,
      lives: engine.lives,
      level: engine.level,
      phase: engine.phase,
    });
  }, [engine]);

  const drainPopups = useCallback(() => {
    let next = engine.consumePopup();
    if (!next) return;
    let latest = next;
    while ((next = engine.consumePopup())) {
      latest = next;
    }
    setPopup(latest);
  }, [engine]);

  const handleGameOver = useCallback(() => {
    syncHud();
    if (engine.mode === "prep") {
      // Session end only — unsliced raws stay in pantry (never removed until slice).
      forceSave();
      return;
    }
    if (!gameOverTrackedRef.current) {
      gameOverTrackedRef.current = true;
      track(
        USAGE.GAMES.GAME_OVER.feature,
        USAGE.GAMES.GAME_OVER.action,
        `slicer:over:${engine.sessionId ?? "guest"}`,
      );
    }
    if (submittedRef.current) return;
    const sliceLogJson = engine.buildSliceLogJson();
    if (isAuthenticated && engine.sessionId && sliceLogJson) {
      engine.syncAuthoritativeScore();
      syncHud();
      submittedRef.current = true;
      void submitRun
        .mutateAsync({
          sessionId: engine.sessionId,
          sliceLogJson,
        })
        .then((res) => {
          if ("err" in res) {
            setSubmitError(res.err);
            console.warn("submitSlicerRun:", res.err);
            return;
          }
          setSubmitError(null);
          setServerScore(Number(res.ok.score));
          const fresh = newBadgesFromEarned(res.ok.badgesEarned);
          if (fresh.length > 0) {
            for (const badge of fresh) {
              track(
                USAGE.GAMES.BADGE_EARNED.feature,
                USAGE.GAMES.BADGE_EARNED.action,
                `slicer:badge:${badge.badgeType}`,
              );
            }
            setCelebratingBadges(fresh);
            setCelebrationDone(false);
          } else {
            setCelebrationDone(true);
          }
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "Submit failed";
          setSubmitError(msg);
          console.warn("submitSlicerRun failed", e);
        });
    } else {
      setCelebrationDone(true);
    }
  }, [engine, forceSave, isAuthenticated, submitRun, syncHud, track, USAGE.GAMES.GAME_OVER, USAGE.GAMES.BADGE_EARNED]);

  useGameLoop(
    (state) => {
      if (engine.phase === "playing") {
        engine.update(state.deltaMs);
        drainPopups();
      }
      if (engine.phase === "over") handleGameOver();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) engine.draw(ctx);
      if (state.frame % 4 === 0) syncHud();
    },
    started && engine.phase !== "over",
  );

  useEffect(() => {
    if (!started || engine.phase === "playing") return;
    const id = requestAnimationFrame(() => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) engine.draw(ctx);
    });
    return () => cancelAnimationFrame(id);
  });

  const startGame = async (mode: SlicerMode = "arcade") => {
    if (!assetsReady) return;
    submittedRef.current = false;
    gameOverTrackedRef.current = false;
    setServerScore(null);
    setSubmitError(null);
    setRankedSession(false);
    setSessionWarning(null);
    setCelebratingBadges([]);
    setCelebrationDone(false);
    setPlayMode(mode);
    let prepItems: PrepSpawnItem[] = [];
    if (mode === "prep") {
      prepItems = inventory.raw.map((r) => ({
        pantryId: r.id,
        kind: pantryToSlicerKind(r.variety, r.podColor),
      }));
    }

    let spawnSeed: bigint | undefined;
    let sessionId: string | undefined;

    if (mode === "arcade") {
      if (isAuthenticated) {
        try {
          const res = await startSession.mutateAsync();
          if ("err" in res) {
            setSessionWarning(res.err);
            setRankedSession(false);
            console.warn("startGameSession:", res.err);
            spawnSeed = guestSpawnSeed();
          } else {
            spawnSeed = res.ok.seed;
            sessionId = res.ok.sessionId;
            setRankedSession(true);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Session start failed";
          setSessionWarning(msg);
          console.warn("startGameSession failed", e);
          setRankedSession(false);
          spawnSeed = guestSpawnSeed();
        }
      } else {
        spawnSeed = guestSpawnSeed();
      }
    }

    engine.reset(mode, prepItems, { spawnSeed, sessionId });
    setStarted(true);
    track(
      USAGE.GAMES.SLICER_PLAY.feature,
      USAGE.GAMES.SLICER_PLAY.action,
      `slicer:play:${sessionId ?? mode}`,
    );
    syncHud();
  };

  const clientPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return engine.screenToWorld(sx, sy);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = clientPos(e);
    lastPointerRef.current = { x, y, t: performance.now() };
    engine.pointerStart(x, y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = clientPos(e);
    const prev = lastPointerRef.current;
    const now = performance.now();
    const dt = prev ? now - prev.t : 16;
    const dist = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
    const vel = dist / Math.max(dt, 1);
    if (vel >= SWIPE_VELOCITY_MIN) playSfx("whoosh");
    const res = engine.pointerMove(x, y, dt);
    if (res && res.scoreGain > 0) {
      playSfx("splat");
      if (res.slicedPantryIds) {
        const sq = computeSliceQuality(engine.combo, 0);
        for (const id of res.slicedPantryIds) {
          convertRawToSliced(id, sq);
        }
      }
    }
    lastPointerRef.current = { x, y, t: now };
  };

  const onPointerUp = () => {
    engine.pointerEnd();
    lastPointerRef.current = null;
  };

  const lbRows =
    leaderboard?.map((e, i) => ({
      rank: i + 1,
      principal: e.principal,
      score: e.score,
      displayData: e.displayData,
    })) ?? [];

  const showOver = hud.phase === "over";
  const showPause = hud.phase === "paused";

  const submitOk =
    submitRun.data != null && "ok" in submitRun.data ? submitRun.data.ok : null;

  if (booting) {
    return <CarnivalBootTransition onComplete={onBootComplete} />;
  }

  if (showTitle) {
    return (
      <GameTitleScreen
        gameId="slicer"
        primaryLabel="Endless Arcade"
        onPlay={() => {
          if (!assetsReady) return;
          enterGameplay();
          startGame("arcade");
        }}
        secondaryModes={[
          {
            label: `Prep Mode${inventory.raw.length > 0 ? ` · ${inventory.raw.length} raw` : ""}`,
            onClick: () => {
              if (!assetsReady || inventory.raw.length === 0) return;
              enterGameplay();
              startGame("prep");
            },
            disabled: inventory.raw.length === 0,
            hint:
              "Prep Mode slices your pantry pods (soft boost for Crafter). Misses keep raws — session ends only.",
            dataOcid: "slicer-prep-start",
          },
        ]}
        assetsReady={assetsReady}
        assetsLoading={!assetsReady}
        loadingMessage="Loading spice sprites…"
        assetsError={
          assetsError
            ? "Sprites unavailable — vector fallback active."
            : undefined
        }
        entering={titleEntering}
      />
    );
  }

  return (
    <GameShell title="ICSPICY Slicer">
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <p className="pointer-events-none absolute left-0 right-0 top-1 z-20 text-center text-[10px] tracking-wide text-emerald-400/80">
          Slice the Heat • Build Your Small-Batch Legend
        </p>

        <div className="absolute inset-x-2 top-6 z-25 pointer-events-auto">
          <PersistenceSaveAlert message={pantrySaveError} onDismiss={clearSaveError} />
        </div>

        {sessionWarning && playMode === "arcade" && started && hud.phase !== "over" && (
          <div
            role="alert"
            className="pointer-events-none absolute inset-x-3 top-8 z-30 rounded-lg border border-amber-500/45 bg-amber-950/75 px-3 py-2 text-center text-[11px] text-amber-100 backdrop-blur-sm"
          >
            <p className="font-semibold">Unranked run — score won&apos;t save</p>
            <p className="mt-0.5 text-amber-100/85">
              Ranked session unavailable ({sessionWarning}). Play again to retry.
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex flex-col items-center gap-0.5">
          <div
            className="font-display text-3xl font-bold tabular-nums text-orange-300 drop-shadow-[0_0_18px_rgba(251,146,60,0.65)] sm:text-4xl"
            data-ocid="slicer-score"
          >
            {formatShu(hud.score)} <span className="text-lg">🔥</span>
          </div>
          <p
            className="text-[10px] font-semibold tracking-[0.2em] text-orange-200/80"
            data-ocid="slicer-level"
          >
            LV {hud.level}
          </p>
          {milestoneProgress && (
            <p className="text-[9px] tracking-wide text-amber-200/70">
              {milestoneProgress}
            </p>
          )}
          {hud.combo > 1 && (
            <p className="text-xs font-bold text-amber-400/90">
              COMBO x{hud.combo}
            </p>
          )}
          <div className="mt-1 flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={
                  i < hud.lives
                    ? "text-sm text-emerald-400"
                    : "text-sm text-red-500/60"
                }
                aria-hidden
              >
                {i < hud.lives ? "❤️" : "❌"}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="absolute right-2 top-2 z-30 rounded-lg border border-white/10 bg-black/40 p-2 backdrop-blur-md"
          onClick={() => {
            engine.togglePause();
            syncHud();
          }}
          aria-label="Pause"
          data-ocid="slicer-pause"
        >
          <Pause className="h-4 w-4 text-orange-300" />
        </button>

        <div
          ref={playAreaRef}
          className="relative min-h-0 flex-1 touch-none select-none overscroll-none pt-14"
          style={{
            touchAction: "none",
            overscrollBehavior: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none select-none"
            style={{
              touchAction: "none",
              overscrollBehavior: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTouchCallout: "none",
              WebkitTapHighlightColor: "transparent",
            }}
            data-ocid="slicer-canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>

        <ScorePopup
          text={popup?.text ?? ""}
          serial={popup?.id ?? 0}
          visible={popup != null}
          onDismiss={() => setPopup(null)}
        />

        {showPause && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/75 backdrop-blur-sm">
            <p className="font-display text-xl font-bold">Paused</p>
            <Button
              onClick={() => {
                engine.togglePause();
                syncHud();
              }}
            >
              Resume
            </Button>
          </div>
        )}

        {showOver && (
          <div className="absolute inset-0 z-40 overflow-y-auto bg-black/80 px-3 py-5 backdrop-blur-sm">
            {celebratingBadges.length > 0 && !celebrationDone && (
              <BadgeCelebrationQueue
                badges={celebratingBadges}
                onDone={() => setCelebrationDone(true)}
              />
            )}
            {(celebrationDone || celebratingBadges.length === 0) && (
            <ArcadeResultsPanel
              title={playMode === "prep" ? "Prep Complete" : "Batch Complete"}
              score={serverScore ?? engine.score}
              isNewBest={playMode === "arcade" && submitOk?.isNewBest === true}
              stats={[
                ...(playMode === "arcade"
                  ? [{ label: "Heat Tier", value: engine.tier }]
                  : []),
                { label: "Best Combo", value: `×${engine.bestCombo}` },
              ]}
              isAuthenticated={isAuthenticated}
              onSignIn={login}
              scoreConfirmation={
                playMode === "arcade" ? (
                  <SlicerSubmitStatus
                    isAuthenticated={isAuthenticated}
                    rankedSession={rankedSession}
                    isPending={submitRun.isPending}
                    submitError={submitError}
                    submitOk={submitOk}
                    myRank={myRank}
                    myStats={myStats}
                    rankLoading={rankLoading}
                    onTryAgain={() => startGame(playMode)}
                  />
                ) : undefined
              }
              onPlayAgain={() => startGame(playMode)}
              onShare={
                playMode === "arcade" && isAuthenticated
                  ? () => void handleShareScore()
                  : undefined
              }
              sharePending={sharePublishing}
              shareDisabled={!canShareScore || submitRun.isPending}
              shareLabel="Share score"
              onModeSelect={() => {
                setStarted(false);
                engine.phase = "ready";
                syncHud();
                returnToTitle();
              }}
              modeSelectLabel="Mode Select"
              gameId={playMode === "arcade" ? "slicer" : undefined}
              lbRows={playMode === "arcade" ? lbRows : undefined}
              lbLoading={playMode === "arcade" ? lbLoading : undefined}
              currentPrincipal={principal?.toText()}
              signInPrompt={
                playMode === "prep"
                  ? "Sign in to track pantry and leaderboard progress."
                  : "Sign in to earn badges for runs like this."
              }
            >
              {playMode === "prep" && (
                <p className="text-center text-[0.65rem] text-emerald-300/90">
                  Unsliced raws stay in your pantry — session only.
                </p>
              )}
              {!isAuthenticated && playMode === "arcade" && (
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              )}
            </ArcadeResultsPanel>
            )}
          </div>
        )}
      </div>
    </GameShell>
  );
}
