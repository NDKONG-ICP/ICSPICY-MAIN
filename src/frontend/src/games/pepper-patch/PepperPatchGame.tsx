import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Backend } from "../../backend";
import { ConfettiBurst } from "../../components/checkout/ConfettiBurst";
import { useActor } from "../../hooks/useActor";
import { useAuth } from "../../hooks/useAuth";
import { useUsageTracking } from "../../hooks/useUsageTracking";
import { useAllVarietyProvenance } from "../../hooks/useVarietyProvenance";
import { useVarieties } from "../../hooks/useNims";
import { requireBackendRaw } from "../../lib/backend-raw";
import { formatShu } from "../config";
import { CarnivalBootTransition } from "../shared/CarnivalBootTransition";
import { GameShell } from "../shared/GameShell";
import { GameSubmitStatus } from "../shared/GameSubmitStatus";
import { GameTitleScreen } from "../shared/GameTitleScreen";
import { Leaderboard } from "../shared/Leaderboard";
import { PersistenceSaveAlert } from "../shared/PersistenceSaveAlert";
import { ScorePopup } from "../shared/ScorePopup";
import { playSfx } from "../shared/audio";
import {
  useGameLeaderboard,
  useMyGameStats,
  useSubmitGameScore,
} from "../shared/useGameBackend";
import { useGameTitleFlow } from "../shared/useGameTitleFlow";
import { AtlasSprite } from "./AtlasSprite";
import { PepperPatchOnboarding } from "./OnboardingTour";
import { PlotCell } from "./PlotCell";
import { VarietyDetailCard } from "./VarietyDetailCard";
import {
  BG_GARDEN_URL,
  preloadAtlas,
  USE_PLACEHOLDER_FALLBACK,
} from "./atlas";
import { COMPANIONS, COMPANION_BY_ID, UPGRADES } from "./constants";
import type { CompanionId } from "./constants";
import {
  GAME_VARIETIES,
  VARIETY_BY_ID,
} from "./varieties";
import {
  applyCare,
  buyUpgrade,
  expandPlots,
  harvestPlot,
  plantPlot,
  resolveCatalogIds,
  simulateOfflineGrowth,
  unlockVariety,
  type CareAction,
  type CareInputChoice,
} from "./simulation";
import { applySoilPrep, growthPhaseForStage, isCarePaused, startBrew } from "./simulation-v2";
import {
  CareInputPickerDialog,
  FieldNotesPanel,
  InputsShedDialog,
  InputInventoryBar,
  maybeRecordTip,
  MechanicTooltip,
  SoilPrepDialog,
  UpgradeIconRow,
  WeatherSeasonBar,
} from "./PepperPatchV2Panels";
import { estimatePlotCare } from "./plot-care-estimates";
import type { MechanicId, SoilAmendmentId } from "./v2-content";
import { CASUAL_PREP_DEFAULTS } from "./v2-content";
import { useGardenPersistence } from "./useGardenPersistence";
import { useIngredientInventory } from "../shared/useIngredientInventory";
import {
  makeRawPods,
  type PodColor,
} from "../shared/ingredient-types";

function claimLegendaryHarvest(actor: Backend | null): void {
  try {
    const raw = requireBackendRaw(actor);
    void raw
      .claimGameAchievement("pepper-patch", "legendary_harvest")
      .then((r) => {
        const res = r as { err?: string };
        if (res.err && res.err !== "not_active") {
          console.warn("claimGameAchievement:", res.err);
        }
      });
  } catch {
    /* guest */
  }
}

const CARE_FX: Record<CareAction, string> = {
  water: "fx_water",
  nutrient: "fx_sparkle",
  light: "fx_sparkle",
};

export function PepperPatchGame() {
  const { login, principal } = useAuth();
  const { actor } = useActor<Backend>();
  const { garden, updateGarden, mergeCatalogIds, hydrated, loadError, saveError, clearSaveError, isAuthenticated } =
    useGardenPersistence();
  const { addRaw, saveError: pantrySaveError, clearSaveError: clearPantrySaveError } = useIngredientInventory();
  const { data: catalog = [] } = useVarieties();
  const { data: provenanceMap } = useAllVarietyProvenance();
  const submitScore = useSubmitGameScore("pepper-patch");
  const { data: myStats } = useMyGameStats("pepper-patch");
  const { data: leaderboard, isPending: lbLoading } = useGameLeaderboard(
    "pepper-patch",
    5,
  );

  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [plantOpen, setPlantOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [pickVariety, setPickVariety] = useState<string>("jalapeno");
  const [pickCompanion, setPickCompanion] = useState<CompanionId | "">("");
  const [popup, setPopup] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [unlockFlip, setUnlockFlip] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [soilPrepOpen, setSoilPrepOpen] = useState(false);
  const [shedOpen, setShedOpen] = useState(false);
  const [prepPicked, setPrepPicked] = useState<SoilAmendmentId[]>([...CASUAL_PREP_DEFAULTS]);
  const [activeTip, setActiveTip] = useState<MechanicId | null>(null);
  const [eduToast, setEduToast] = useState<string | null>(null);
  const [atlasOk, setAtlasOk] = useState(false);
  const [plotFx, setPlotFx] = useState<{
    plotId: number;
    stem: string;
  } | null>(null);
  const [pantryToast, setPantryToast] = useState<string | null>(null);
  const [harvestSubmitError, setHarvestSubmitError] = useState<string | null>(null);
  const [lastHarvestSubmit, setLastHarvestSubmit] = useState<{
    score: number;
    ok: { bestScore: bigint; isNewBest: boolean };
  } | null>(null);
  const backfillDoneRef = useRef(false);
  const [carePickerOpen, setCarePickerOpen] = useState(false);
  const [pendingCareAction, setPendingCareAction] = useState<CareAction | null>(null);
  const [, setTick] = useState(0);

  const catalogMergedRef = useRef(false);
  const attentionPlayedRef = useRef<Set<number>>(new Set());

  const {
    showTitle,
    booting,
    titleEntering,
    onBootComplete,
    enterGameplay,
  } = useGameTitleFlow();
  const { track, USAGE } = useUsageTracking();
  const playTrackedRef = useRef(false);

  useEffect(() => {
    if (!showTitle && !booting && hydrated && !playTrackedRef.current) {
      playTrackedRef.current = true;
      track(
        USAGE.GAMES.PEPPER_PATCH_PLAY.feature,
        USAGE.GAMES.PEPPER_PATCH_PLAY.action,
        "pepper-patch:play",
      );
    }
  }, [showTitle, booting, hydrated, track, USAGE.GAMES.PEPPER_PATCH_PLAY]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      updateGarden((g) => simulateOfflineGrowth(g), false);
    }, 4000);
    return () => window.clearInterval(id);
  }, [updateGarden]);

  useEffect(() => {
    void preloadAtlas().then(setAtlasOk);
  }, []);

  // Sync onboarding after hydrate — avoid opening tour before garden loads.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (!garden.onboardingDone && !localStorage.getItem("pepper-patch-onboarding-done")) {
        setShowOnboarding(true);
      }
    } catch {
      setShowOnboarding(!garden.onboardingDone);
    }
  }, [hydrated, garden.onboardingDone]);

  // Catalog enrichment is non-blocking; guests get the local roster either way.
  useEffect(() => {
    if (!hydrated || catalog.length === 0 || catalogMergedRef.current) return;
    catalogMergedRef.current = true;
    try {
      const ids = resolveCatalogIds(
        catalog.map((c) => ({ id: c.id, name: c.name })),
      );
      mergeCatalogIds(ids);
    } catch (e) {
      console.warn("pepper-patch catalog enrich failed (non-blocking):", e);
    }
  }, [hydrated, catalog, mergeCatalogIds]);

  // Heal stale server best when local bestBatchShu advanced past a failed submit.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || backfillDoneRef.current) return;
    if (myStats == null) return;
    const serverBest = Number(myStats.bestScore);
    if (garden.bestBatchShu <= serverBest) {
      backfillDoneRef.current = true;
      return;
    }
    backfillDoneRef.current = true;
    void submitScore
      .mutateAsync({
        score: BigInt(garden.bestBatchShu),
        displayData: JSON.stringify({
          variety: "backfill",
          careQuality: 0,
          totalHeatReserve: garden.heatReserve,
          backfill: true,
        }),
      })
      .then((res) => {
        if ("err" in res) {
          setHarvestSubmitError(res.err);
          return;
        }
        setHarvestSubmitError(null);
        setLastHarvestSubmit({
          score: garden.bestBatchShu,
          ok: { bestScore: res.ok.bestScore, isNewBest: res.ok.isNewBest },
        });
      })
      .catch((e: unknown) => {
        setHarvestSubmitError(e instanceof Error ? e.message : "Backfill submit failed");
      });
  }, [hydrated, isAuthenticated, myStats, garden.bestBatchShu, garden.heatReserve, submitScore]);

  const flashFx = (plotId: number, stem: string) => {
    setPlotFx({ plotId, stem });
    window.setTimeout(() => setPlotFx(null), 700);
  };

  const activePlots = garden.plots.slice(0, garden.plotCount);
  const useSprites = atlasOk && !USE_PLACEHOLDER_FALLBACK;

  const handleCare = (action: CareAction, inputChoice: CareInputChoice = "plain") => {
    if (selectedPlot == null) return;
    if (isCarePaused(garden)) {
      setEduToast("Storm overhead — tending paused until it passes.");
      setActiveTip("storm");
      return;
    }
    const result = applyCare(garden, selectedPlot, action, inputChoice);
    updateGarden(() => {
      let next = result.state;
      if (action === "water" && result.toast) {
        next = maybeRecordTip(next, "overwater");
        setActiveTip("overwater");
      }
      if (action === "nutrient" && result.usedInput && result.usedInput !== "generic") {
        next = maybeRecordTip(next, "phase_feeding");
        if (!result.phaseMatch) setActiveTip("phase_feeding");
      }
      return next;
    });
    if (result.toast) setEduToast(result.toast);
    playSfx(action === "nutrient" ? "harvest" : "water");
    flashFx(
      selectedPlot,
      action === "nutrient" && result.usedInput && result.usedInput !== "generic"
        ? `input_${result.usedInput === "jms" ? "jlf" : result.usedInput}`
        : CARE_FX[action],
    );
  };

  const openCarePicker = (action: CareAction) => {
    if (selectedPlot == null) return;
    if (isCarePaused(garden)) {
      setEduToast("Storm overhead — tending paused until it passes.");
      setActiveTip("storm");
      return;
    }
    if (action === "light") {
      handleCare("light");
      return;
    }
    setPendingCareAction(action);
    setCarePickerOpen(true);
  };

  const onCareInputPicked = (choice: CareInputChoice) => {
    if (!pendingCareAction) return;
    handleCare(pendingCareAction, choice);
    setPendingCareAction(null);
  };

  const handlePlant = () => {
    if (selectedPlot == null) return;
    updateGarden((g) =>
      plantPlot(
        g,
        selectedPlot,
        pickVariety,
        pickCompanion || null,
      ),
    );
    setPlantOpen(false);
    playSfx("water");
  };

  const handleHarvest = () => {
    if (selectedPlot == null) return;
    const plotBefore = garden.plots[selectedPlot];
    const companionId = plotBefore?.companionId ?? null;
    const { state, result } = harvestPlot(garden, selectedPlot);
    if (!result) return;
    updateGarden(() => state);

    // Soft-bridge: deposit raw pods (additive — scoring unchanged).
    const variety = VARIETY_BY_ID[result.varietyId];
    if (variety) {
      const podCount = 1 + Math.floor(Math.random() * 3); // 1–3
      const pods = makeRawPods({
        variety: variety.id,
        varietyName: variety.name,
        podColor: variety.podColor as PodColor,
        shu: Math.round(result.shu / podCount),
        careQuality: result.careQuality,
        count: podCount,
      });
      // Occasional companion yield (~25%).
      if (companionId && Math.random() < 0.25) {
        const c = COMPANION_BY_ID[companionId];
        pods.push(
          ...makeRawPods({
            variety: companionId,
            varietyName: c.label,
            podColor: "companion",
            shu: 0,
            careQuality: result.careQuality,
            count: 1,
          }),
        );
      }
      addRaw(pods);
      const pepperPods = pods.filter((p) => p.podColor !== "companion");
      setPantryToast(
        `+${formatShu(result.shu)} batch → Heat Reserve · +${pepperPods.length} ${variety.name} pod${pepperPods.length === 1 ? "" : "s"} → Pantry`,
      );
      window.setTimeout(() => setPantryToast(null), 2800);
    }

    playSfx("harvest");
    flashFx(selectedPlot, "fx_harvest");
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2200);

    if (!garden.firstHarvestDone) {
      setPopup("First Harvest!");
    }
    if (result.legendary) {
      setPopup("Legendary Harvest!");
      claimLegendaryHarvest(actor);
    }

    if (isAuthenticated && result.shu > 0) {
      setHarvestSubmitError(null);
      setLastHarvestSubmit(null);
      void submitScore
        .mutateAsync({
          score: BigInt(result.shu),
          displayData: JSON.stringify({
            variety: result.varietyName,
            careQuality: result.careQuality,
            totalHeatReserve: state.heatReserve,
          }),
        })
        .then((res) => {
          if ("err" in res) {
            setHarvestSubmitError(res.err);
            return;
          }
          setHarvestSubmitError(null);
          setLastHarvestSubmit({
            score: result.shu,
            ok: { bestScore: res.ok.bestScore, isNewBest: res.ok.isNewBest },
          });
        })
        .catch((e: unknown) => {
          setHarvestSubmitError(
            e instanceof Error ? e.message : "Harvest score submit failed",
          );
        });
    }
  };

  const onPlotClick = (plotId: number) => {
    setSelectedPlot(plotId);
    const plot = garden.plots[plotId];
    if (plot?.stage === "empty" && !plot.prepDone) {
      setPrepPicked([...CASUAL_PREP_DEFAULTS]);
      setSoilPrepOpen(true);
      if (!garden.seenTips.includes("soil_prep")) {
        setActiveTip("soil_prep");
        updateGarden((g) => maybeRecordTip(g, "soil_prep"), false);
      }
      return;
    }
    if (plot?.stage === "empty" && plot.prepDone) setPlantOpen(true);
  };

  const confirmSoilPrep = (amendments: SoilAmendmentId[]) => {
    if (selectedPlot == null) return;
    updateGarden((g) => {
      let next = applySoilPrep(g, selectedPlot, amendments);
      next = maybeRecordTip(next, "soil_biology");
      if (amendments.includes("mulch")) next = maybeRecordTip(next, "mulch");
      return next;
    });
    setSoilPrepOpen(false);
    setActiveTip("soil_biology");
    flashFx(selectedPlot, "fx_microbes");
    setPlantOpen(true);
  };

  const finishOnboarding = useCallback(() => {
    updateGarden((g) => ({ ...g, onboardingDone: true, onboardingV2Done: true }));
    setShowOnboarding(false);
    if (!garden.seenTips.includes("weather")) {
      setActiveTip("weather");
      updateGarden((g) => maybeRecordTip(g, "weather"), false);
    }
  }, [updateGarden, garden.seenTips]);

  const lbRows =
    leaderboard?.map((e, i) => ({
      rank: i + 1,
      principal: e.principal,
      score: e.score,
      displayData: e.displayData,
    })) ?? [];

  const selected = selectedPlot != null ? garden.plots[selectedPlot] : null;
  const selectedPhase = selected
    ? growthPhaseForStage(selected.stage)
    : null;
  const selectedCompanion = selected?.companionId
    ? COMPANION_BY_ID[selected.companionId]
    : null;

  useEffect(() => {
    for (const plot of activePlots) {
      const est = estimatePlotCare(garden, plot);
      if (est?.needsAttention && !attentionPlayedRef.current.has(plot.id)) {
        attentionPlayedRef.current.add(plot.id);
        playSfx("water");
      }
      if (!est?.needsAttention) {
        attentionPlayedRef.current.delete(plot.id);
      }
    }
  }, [garden, activePlots]);

  if (booting) {
    return <CarnivalBootTransition onComplete={onBootComplete} />;
  }

  if (showTitle) {
    return (
      <GameTitleScreen
        gameId="pepper-patch"
        onPlay={enterGameplay}
        assetsReady={hydrated}
        assetsLoading={!hydrated}
        loadingMessage="Loading your garden…"
        entering={titleEntering}
      />
    );
  }

  return (
    <GameShell
      title="ICSPICY Pepper Patch"
      scoreSlot={
        <span className="inline-flex flex-col items-end text-emerald-400">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-emerald-300/80">
            Heat Reserve
          </span>
          <span className="inline-flex items-center gap-1">
            {useSprites ? (
              <AtlasSprite stem="icon_heatreserve" maxEdge={18} alt="Heat reserve" />
            ) : null}
            {formatShu(garden.heatReserve)} 🔥
          </span>
        </span>
      }
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <p className="shrink-0 py-1 text-center text-[10px] tracking-wide text-emerald-400/80">
          Grow Rare Heat • Harvest Your Legacy
        </p>

        {loadError && (
          <div
            role="alert"
            className="mx-2 mb-2 shrink-0 rounded-lg border border-amber-500/40 bg-amber-950/50 px-3 py-2 text-xs text-amber-100"
          >
            <p className="font-semibold">Garden save needs attention</p>
            <p className="mt-1 text-amber-100/90">{loadError.message}</p>
            <p className="mt-1 text-[10px] text-amber-200/70">
              Your on-chain save was left untouched. Try refreshing; if this persists, note code{" "}
              {loadError.code} for support.
            </p>
          </div>
        )}

        <PersistenceSaveAlert message={saveError} onDismiss={clearSaveError} />
        <PersistenceSaveAlert message={pantrySaveError} onDismiss={clearPantrySaveError} />

        {isAuthenticated &&
          (submitScore.isPending ||
            harvestSubmitError ||
            lastHarvestSubmit) && (
            <div className="mx-3 mb-2 shrink-0">
              <GameSubmitStatus
                isAuthenticated={isAuthenticated}
                isPending={submitScore.isPending}
                submitError={harvestSubmitError}
                submitOk={
                  lastHarvestSubmit
                    ? {
                        score: lastHarvestSubmit.score,
                        bestScore: lastHarvestSubmit.ok.bestScore,
                        isNewBest: lastHarvestSubmit.ok.isNewBest,
                      }
                    : null
                }
                myStats={myStats ?? null}
                showRank={false}
                successHeadline="✓ Batch recorded"
                bestLabel="Best batch"
                thisRunLabel="This harvest"
              />
            </div>
          )}

        {!isAuthenticated && (
          <div className="mx-3 mb-2 shrink-0 rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 text-center text-[11px] text-amber-200/90">
            Sign in to save your garden on-chain.{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={login}
            >
              Internet Identity
            </button>
          </div>
        )}

        <WeatherSeasonBar garden={garden} useSprites={useSprites} />

        {activeTip ? (
          <MechanicTooltip
            tipId={activeTip}
            onDismiss={() => setActiveTip(null)}
          />
        ) : null}

        <FieldNotesPanel garden={garden} />

        <InputInventoryBar garden={garden} useSprites={useSprites} />
        <UpgradeIconRow garden={garden} useSprites={useSprites} />
        {/* Garden scene — bg_garden standalone WebP when atlas loads */}
        <div
          className="relative mx-3 shrink-0 overflow-y-auto rounded-2xl border border-amber-900/50 p-3 shadow-inner"
          style={
            useSprites
              ? {
                  backgroundImage: `linear-gradient(rgba(20,30,18,0.35), rgba(40,28,16,0.45)), url(${BG_GARDEN_URL})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  backgroundImage:
                    "linear-gradient(to bottom, #2d4a2d, #3d5c3d, #4a3728)",
                }
          }
          data-ocid="pepper-patch-garden"
        >
          {confetti && <ConfettiBurst />}
          <div className="grid grid-cols-2 content-start gap-3">
            {activePlots.map((plot) => (
              <PlotCell
                key={plot.id}
                {...plot}
                selected={selectedPlot === plot.id}
                onSelect={() => onPlotClick(plot.id)}
                fxStem={plotFx?.plotId === plot.id ? plotFx.stem : null}
                showMicrobes={plot.soilBiology >= 55}
                companionId={plot.companionId}
                careEstimates={estimatePlotCare(garden, plot)}
                stageProgress={plot.stageProgress}
              />
            ))}
          </div>
        </div>

        {/* Care bar */}
        {selected && selected.stage !== "empty" && (
          <div className="mx-3 mt-2 flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => openCarePicker("water")}
              disabled={selected.waterNeed < 30}
            >
              {useSprites ? (
                <AtlasSprite stem="icon_water" maxEdge={18} />
              ) : (
                "💧"
              )}{" "}
              Water
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => openCarePicker("nutrient")}
              disabled={selected.nutrientNeed < 30}
            >
              {useSprites ? (
                <AtlasSprite stem="icon_feed" maxEdge={18} />
              ) : (
                "🌿"
              )}{" "}
              Feed
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => openCarePicker("light")}
              disabled={selected.lightNeed < 30}
            >
              {useSprites ? (
                <AtlasSprite stem="icon_light" maxEdge={18} />
              ) : (
                "☀️"
              )}{" "}
              Light
            </Button>
            {selected.readyToHarvest && (
              <Button
                size="sm"
                className="flex-1 gap-1 bg-orange-600 hover:bg-orange-500"
                onClick={handleHarvest}
                data-ocid="pepper-patch-harvest"
              >
                {useSprites ? (
                  <AtlasSprite stem="icon_smallbatch" maxEdge={18} />
                ) : (
                  "🫙"
                )}{" "}
                Harvest
              </Button>
            )}
          </div>
        )}

        {selected && selected.varietyId && (
          <div className="mx-3 mt-2 shrink-0 space-y-1">
            <p className="text-center text-[10px] text-muted-foreground">
              {VARIETY_BY_ID[selected.varietyId]?.name} · Care{" "}
              {Math.round(selected.careQuality)}% · Best batch{" "}
              {formatShu(garden.bestBatchShu)}
            </p>
            {selectedCompanion && (
              <p className="text-center text-[10px] text-emerald-300/90">
                Companion: {selectedCompanion.label} — active buff{" "}
                {selectedCompanion.buffLabel}
              </p>
            )}
          </div>
        )}

        <div className="mx-3 mt-2 flex shrink-0 gap-2 pb-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1"
            onClick={() => {
              setShedOpen(true);
              if (!garden.seenTips.includes("inputs_shed")) {
                setActiveTip("inputs_shed");
                updateGarden((g) => maybeRecordTip(g, "inputs_shed"), false);
              }
            }}
          >
            {useSprites ? <AtlasSprite stem="shed" maxEdge={18} /> : "🧪"} Inputs Shed
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => setShopOpen(true)}
            data-ocid="pepper-patch-shop"
          >
            🛒 Shop & Upgrades
          </Button>
        </div>

        <div className="mx-3 mb-2 shrink-0 rounded-xl border border-white/[0.06] bg-black/30 p-2">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Best Batch Leaderboard
          </p>
          <p className="mb-1 text-[9px] text-muted-foreground/70">
            Single-harvest personal best — not Heat Reserve
          </p>
          <Leaderboard
            rows={lbRows}
            currentPrincipal={principal?.toText()}
            loading={lbLoading}
            compact
            scoreLabel="best batch"
          />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mt-1.5 w-full text-amber-300/90"
          >
            <Link
              to="/games/leaderboard"
              search={{ game: "pepper-patch" }}
              data-ocid="pepper-patch-full-leaderboard"
            >
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              Full Scoreboard
            </Link>
          </Button>
        </div>

        <ScorePopup
          text={popup ?? ""}
          visible={popup != null}
          onDismiss={() => setPopup(null)}
        />
        <ScorePopup
          text={pantryToast ?? ""}
          visible={pantryToast != null}
          onDismiss={() => setPantryToast(null)}
        />

        <ScorePopup
          text={eduToast ?? ""}
          visible={eduToast != null}
          onDismiss={() => setEduToast(null)}
        />

        <SoilPrepDialog
          open={soilPrepOpen}
          onOpenChange={setSoilPrepOpen}
          plotLabel={`Plot ${(selectedPlot ?? 0) + 1}`}
          picked={prepPicked}
          onToggle={(id) =>
            setPrepPicked((p) =>
              p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
            )
          }
          onConfirm={() => confirmSoilPrep(prepPicked)}
          onQuickPrep={() => confirmSoilPrep([...CASUAL_PREP_DEFAULTS])}
          useSprites={useSprites}
        />

        <InputsShedDialog
          open={shedOpen}
          onOpenChange={setShedOpen}
          garden={garden}
          onBrew={(kind) => updateGarden((g) => startBrew(g, kind))}
          useSprites={useSprites}
        />

        <CareInputPickerDialog
          open={carePickerOpen}
          onOpenChange={setCarePickerOpen}
          action={pendingCareAction ?? "nutrient"}
          garden={garden}
          plotPhase={selectedPhase}
          onPick={onCareInputPicked}
          useSprites={useSprites}
        />

        {showOnboarding && (
          <PepperPatchOnboarding onComplete={finishOnboarding} />
        )}

        {/* Plant dialog */}
        <Dialog open={plantOpen} onOpenChange={setPlantOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Plant Plot {(selectedPlot ?? 0) + 1}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Variety</p>
              <div className="grid max-h-40 gap-1 overflow-y-auto">
                {GAME_VARIETIES.filter((v) =>
                  garden.unlockedVarieties.includes(v.id),
                ).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setPickVariety(v.id)}
                    className={[
                      "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs",
                      pickVariety === v.id
                        ? "border-orange-500/50 bg-orange-500/10"
                        : "border-white/10",
                    ].join(" ")}
                  >
                    {useSprites ? (
                      <AtlasSprite
                        stem={`fruiting_${v.podColor}`}
                        maxEdge={22}
                      />
                    ) : (
                      "🌶️"
                    )}{" "}
                    {v.name}{" "}
                    <span className="text-muted-foreground">
                      ({Math.round(v.growthTimeMs / 60_000)}m)
                    </span>
                  </button>
                ))}
              </div>
              {VARIETY_BY_ID[pickVariety] && (
                <VarietyDetailCard
                  variety={VARIETY_BY_ID[pickVariety]!}
                  catalogId={garden.catalogIds[pickVariety]}
                  provenance={
                    garden.catalogIds[pickVariety]
                      ? provenanceMap?.get(BigInt(garden.catalogIds[pickVariety]!))
                      : null
                  }
                />
              )}
              <p className="text-xs text-muted-foreground">Companion (optional)</p>
              <div className="flex flex-wrap gap-1">
                {COMPANIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.tooltip}
                    onClick={() =>
                      setPickCompanion(pickCompanion === c.id ? "" : c.id)
                    }
                    className={[
                      "rounded-lg border px-2 py-1 text-xs",
                      pickCompanion === c.id
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-white/10",
                    ].join(" ")}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
              <Button className="w-full" onClick={handlePlant}>
                Plant 🌱
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Shop dialog */}
        <Dialog open={shopOpen} onOpenChange={setShopOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="inline-flex items-center gap-2">
                {useSprites ? (
                  <AtlasSprite stem="icon_heatreserve" maxEdge={22} />
                ) : null}
                Heat Reserve: {formatShu(garden.heatReserve)} 🔥
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {garden.plotCount < 12 && (
                <div>
                  <p className="mb-1 text-sm font-semibold">Expand Garden</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateGarden(expandPlots)}
                  >
                    {garden.plotCount === 4
                      ? "4 → 8 plots (5K)"
                      : "8 → 12 plots (15K)"}
                  </Button>
                </div>
              )}
              <div>
                <p className="mb-1 text-sm font-semibold">Unlock Varieties</p>
                <div className="space-y-1">
                  {GAME_VARIETIES.filter(
                    (v) => !garden.unlockedVarieties.includes(v.id),
                  ).map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        {useSprites ? (
                          <AtlasSprite
                            stem={`fruiting_${v.podColor}`}
                            maxEdge={18}
                          />
                        ) : null}
                        {v.name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={garden.heatReserve < v.unlockCost}
                        onClick={() => {
                          updateGarden((g) => unlockVariety(g, v.id));
                          setUnlockFlip(v.id);
                          setTimeout(() => setUnlockFlip(null), 2000);
                        }}
                      >
                        {v.unlockCost.toLocaleString()} 🔥
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold">Upgrades</p>
                {UPGRADES.map((u) => (
                  <Button
                    key={u.id}
                    size="sm"
                    variant="outline"
                    className="mb-1 w-full justify-between"
                    disabled={
                      garden.upgrades[u.id] || garden.heatReserve < u.cost
                    }
                    onClick={() =>
                      updateGarden((g) => buyUpgrade(g, u.id, u.cost))
                    }
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {useSprites ? (
                        <AtlasSprite stem={u.sprite} maxEdge={20} />
                      ) : (
                        u.emoji
                      )}{" "}
                      {u.label}
                    </span>
                    <span>{u.cost.toLocaleString()} 🔥</span>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {unlockFlip && (
          <motion.div
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            className="pointer-events-none fixed left-1/2 top-1/3 z-[90] -translate-x-1/2 rounded-xl border border-orange-500/40 bg-black/90 px-6 py-4 text-center shadow-2xl"
          >
            {useSprites && VARIETY_BY_ID[unlockFlip] ? (
              <AtlasSprite
                stem={`fruiting_${VARIETY_BY_ID[unlockFlip]!.podColor}`}
                maxEdge={48}
                className="mx-auto mb-1"
              />
            ) : (
              <p className="text-2xl">🌶️</p>
            )}
            <p className="font-display font-bold text-orange-300">
              {VARIETY_BY_ID[unlockFlip]?.name} Unlocked!
            </p>
          </motion.div>
        )}
      </div>
    </GameShell>
  );
}
