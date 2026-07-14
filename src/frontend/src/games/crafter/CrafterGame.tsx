import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/ConnectButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useRef, useState } from "react";
import type { Backend } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { useAuth } from "../../hooks/useAuth";
import { useUsageTracking } from "../../hooks/useUsageTracking";
import { requireBackendRaw } from "../../lib/backend-raw";
import { formatShu } from "../config";
import { ArcadeResultsPanel } from "../shared/ArcadeResultsPanel";
import { CarnivalBootTransition } from "../shared/CarnivalBootTransition";
import { GameShell } from "../shared/GameShell";
import { GameSubmitStatus } from "../shared/GameSubmitStatus";
import { GameTitleScreen } from "../shared/GameTitleScreen";
import { ScorePopup } from "../shared/ScorePopup";
import {
  useGameLeaderboard,
  useMyGameStats,
  useSubmitGameScore,
} from "../shared/useGameBackend";
import { useGameTitleFlow } from "../shared/useGameTitleFlow";
import { useGameCanvasFit } from "../shared/useGameCanvasFit";
import { useGameLoop } from "../shared/useGameLoop";
import { generateBatchName } from "./batchNames";
import {
  INGREDIENT_BY_ID,
  MAX_BATCH_SIZE,
  TRAY_INGREDIENTS,
  formatShuDisplay,
  type IngredientId,
} from "./constants";
import { getDailyChallenge } from "./dailyChallenge";
import { computeMeters } from "./harmony";
import { PotEngine } from "./potEngine";
import {
  blendSauceColor,
  buildMixWithPantry,
  scoreBatch,
  type BatchResult,
} from "./scoring";
import {
  useMyCrafterRecipes,
  useSaveCrafterRecipe,
} from "./useCrafterRecipes";
import { useIngredientInventory } from "../shared/useIngredientInventory";
import {
  pantryToCrafterId,
  type SlicedIngredient,
} from "../shared/ingredient-types";

function claimLegendaryAchievement(actor: Backend | null): void {
  try {
    const raw = requireBackendRaw(actor);
    void raw.claimGameAchievement("crafter", "legendary_batch").then((r) => {
      const res = r as { err?: string };
      if (res.err && res.err !== "not_active") {
        console.warn("claimGameAchievement:", res.err);
      }
    });
  } catch {
    /* guest */
  }
}

function MeterGauge({
  label,
  value,
  max,
  unit,
  accent,
  icon,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  accent: string;
  icon?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>
          {icon} {label}
        </span>
        <span className="tabular-nums text-foreground">
          {unit === "shu" ? formatShuDisplay(value) : `${Math.round(value)}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: accent,
            boxShadow: `0 0 12px ${accent}`,
          }}
        />
      </div>
    </div>
  );
}

function BottleIllustration({
  color,
  trueSmallBatch,
}: {
  color: [number, number, number];
  trueSmallBatch?: boolean;
}) {
  const [r, g, b] = color;
  const fill = `rgb(${Math.floor(r * 255)},${Math.floor(g * 255)},${Math.floor(b * 255)})`;
  return (
    <div className="relative mx-auto">
      <svg viewBox="0 0 80 120" className="mx-auto h-28 w-20" aria-hidden>
        <rect x="28" y="0" width="24" height="12" rx="3" fill="rgba(255,255,255,0.2)" />
        <path
          d="M22 14h36l-6 18v70c0 8-6 14-12 14s-12-6-12-14V32L22 14z"
          fill="rgba(255,255,255,0.08)"
          stroke={trueSmallBatch ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.2)"}
          strokeWidth="1.5"
        />
        <path
          d="M26 48h28v52c0 5-4 9-9 9h-10c-5 0-9-4-9-9V48z"
          fill={fill}
          opacity="0.9"
        />
        <ellipse cx="40" cy="48" rx="14" ry="4" fill={fill} opacity="0.7" />
      </svg>
      {trueSmallBatch && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-400/50 bg-emerald-950/90 px-2 py-0.5 text-[8px] font-bold tracking-wide text-emerald-200">
          TRUE SMALL BATCH
        </span>
      )}
    </div>
  );
}

export function CrafterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const potRef = useRef(new PotEngine());
  const trayRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<IngredientId | null>(null);

  const [counts, setCounts] = useState<Partial<Record<IngredientId, number>>>(
    {},
  );
  const [pantryUsed, setPantryUsed] = useState<SlicedIngredient[]>([]);
  const [phase, setPhase] = useState<"craft" | "result">("craft");
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchName, setBatchName] = useState("");
  const [batchNo, setBatchNo] = useState(1);
  const [popup, setPopup] = useState<string | null>(null);
  const [tab, setTab] = useState("craft");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recipeSaveError, setRecipeSaveError] = useState<string | null>(null);

  const { isAuthenticated, login, principal } = useAuth();
  const { track, USAGE } = useUsageTracking();
  const playTrackedRef = useRef(false);
  const { actor } = useActor<Backend>();
  const { inventory, consumeSliced } = useIngredientInventory();
  const submitScore = useSubmitGameScore("crafter");
  const { data: myStats } = useMyGameStats("crafter");
  const saveRecipe = useSaveCrafterRecipe();
  const { data: myRecipes, isPending: recipesLoading } = useMyCrafterRecipes();
  const { data: leaderboard, isPending: lbLoading } = useGameLeaderboard(
    "crafter",
    10,
  );

  const {
    showTitle,
    booting,
    titleEntering,
    onBootComplete,
    enterGameplay,
  } = useGameTitleFlow();

  useEffect(() => {
    if (!showTitle && !booting && !playTrackedRef.current) {
      playTrackedRef.current = true;
      track(
        USAGE.GAMES.CRAFTER_PLAY.feature,
        USAGE.GAMES.CRAFTER_PLAY.action,
        "crafter:play",
      );
    }
  }, [showTitle, booting, track, USAGE.GAMES.CRAFTER_PLAY]);

  const challenge = getDailyChallenge();
  const mix = buildMixWithPantry(counts, pantryUsed);
  const totalAdded = mix.reduce((s, m) => s + m.count, 0);
  const meters = {
    ...computeMeters(mix),
  };
  // Live heat meter uses pantry-aware SHU
  const liveHeat = mix.reduce((s, e) => {
    const pantry = e.pantryUnits ?? [];
    const generic = Math.max(0, e.count - pantry.length);
    return (
      s +
      INGREDIENT_BY_ID[e.id].shu * generic +
      pantry.reduce((ps, u) => ps + u.effectiveShu, 0)
    );
  }, 0);
  meters.heatShu = liveHeat;

  const gameplayVisible = !booting && !showTitle;

  const fitCanvas = useGameCanvasFit(canvasRef, gameplayVisible, (w, h) => {
    potRef.current.resize(w, h);
  });

  useEffect(() => {
    if (!gameplayVisible) return;
    const id = requestAnimationFrame(() => {
      fitCanvas();
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) potRef.current.draw(ctx);
    });
    return () => cancelAnimationFrame(id);
  }, [gameplayVisible, fitCanvas]);

  useEffect(() => {
    potRef.current.setMix(mix, meters.heatShu, meters.isScorched);
  }, [mix, meters.heatShu, meters.isScorched]);

  useGameLoop((state) => {
    potRef.current.update(state.deltaMs);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) potRef.current.draw(ctx);
  }, phase === "craft" && gameplayVisible);

  const addIngredient = (id: IngredientId, fromX?: number, fromY?: number) => {
    if (totalAdded >= MAX_BATCH_SIZE) return;
    setCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const tx = fromX ?? (rect ? rect.left + rect.width * 0.5 : 200);
    const ty = fromY ?? (rect ? rect.top + rect.height * 0.7 : 300);
    const trayRect = trayRef.current?.getBoundingClientRect();
    const fx = trayRect ? trayRect.left + trayRect.width * 0.5 : tx;
    const fy = trayRect ? trayRect.bottom - 20 : ty;
    potRef.current.launchIngredient(id, fx - (rect?.left ?? 0), fy - (rect?.top ?? 0));
  };

  const addPantryIngredient = (item: SlicedIngredient) => {
    if (totalAdded >= MAX_BATCH_SIZE) return;
    const taken = consumeSliced(item.id);
    if (!taken) return;
    setPantryUsed((prev) => [...prev, taken]);
    const id = pantryToCrafterId(taken.variety, taken.podColor);
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    potRef.current.launchIngredient(
      id,
      (rect?.width ?? 200) * 0.5,
      (rect?.height ?? 300) * 0.7,
    );
  };

  const bottleIt = () => {
    if (mix.length === 0) return;
    const result = scoreBatch(mix);
    const name = generateBatchName(mix, batchNo);
    setBatchName(name);
    setBatchResult(result);
    setPhase("result");
    track(
      USAGE.GAMES.GAME_OVER.feature,
      USAGE.GAMES.GAME_OVER.action,
      `crafter:over:${batchNo}`,
    );
    setSubmitError(null);
    setRecipeSaveError(null);
    if (result.trueSmallBatch) {
      setPopup("TRUE SMALL BATCH!");
    }
    if (result.legendary) {
      setPopup("LEGENDARY BATCH!");
      if (result.grade === "S") claimLegendaryAchievement(actor);
    }
    if (isAuthenticated && result.finalScore > 0) {
      void submitScore
        .mutateAsync({
          score: BigInt(result.finalScore),
          displayData: JSON.stringify({
            batchName: name,
            harmonyGrade: result.grade,
            trueSmallBatch: result.trueSmallBatch,
          }),
        })
        .then((res) => {
          if ("err" in res) {
            setSubmitError(res.err);
            return;
          }
          setSubmitError(null);
        })
        .catch((e: unknown) => {
          setSubmitError(e instanceof Error ? e.message : "Score submit failed");
        });
    }
  };

  const craftAnother = () => {
    setCounts({});
    setPantryUsed([]);
    setBatchResult(null);
    setPhase("craft");
    setBatchNo((n) => n + 1);
    setPopup(null);
    setSubmitError(null);
    setRecipeSaveError(null);
  };

  const handleSaveRecipe = async () => {
    if (!batchResult || !isAuthenticated) return;
    setRecipeSaveError(null);
    const ingredients: [string, bigint][] = batchResult.mix.map((m) => [
      INGREDIENT_BY_ID[m.id].label,
      BigInt(m.count),
    ]);
    try {
      await saveRecipe.mutateAsync({
        name: batchName,
        ingredients,
        shu: BigInt(batchResult.finalScore),
        harmony: BigInt(batchResult.meters.harmonyScore),
      });
    } catch (e: unknown) {
      setRecipeSaveError(e instanceof Error ? e.message : "Recipe save failed");
    }
  };

  const submitOk =
    submitScore.data != null && "ok" in submitScore.data
      ? {
          score: batchResult?.finalScore ?? 0,
          bestScore: submitScore.data.ok.bestScore,
          isNewBest: submitScore.data.ok.isNewBest,
        }
      : null;

  const lbRows =
    leaderboard?.map((e, i) => ({
      rank: i + 1,
      principal: e.principal,
      score: e.score,
      displayData: e.displayData,
    })) ?? [];

  const resultColor = batchResult
    ? blendSauceColor(batchResult.mix)
    : blendSauceColor(mix);

  if (booting) {
    return <CarnivalBootTransition onComplete={onBootComplete} />;
  }

  if (showTitle) {
    return (
      <GameTitleScreen
        gameId="crafter"
        onPlay={enterGameplay}
        entering={titleEntering}
      />
    );
  }

  return (
    <GameShell title="ICSPICY Small Batch Crafter">
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <p className="shrink-0 py-1 text-center text-[10px] tracking-wide text-emerald-400/80">
          Craft Your Perfect Small-Batch Legend
        </p>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 grid w-auto shrink-0 grid-cols-2 bg-black/40">
            <TabsTrigger value="craft" data-ocid="crafter-tab-craft">
              Craft
            </TabsTrigger>
            <TabsTrigger value="batches" data-ocid="crafter-tab-batches">
              My Batches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="craft" className="mt-2 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            {phase === "craft" && (
              <>
                <div className="mx-3 mb-2 shrink-0 rounded-xl border border-orange-500/25 bg-orange-500/5 px-3 py-2 backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">
                    {challenge.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {challenge.description}
                  </p>
                </div>

                <div className="relative mx-3 min-h-0 flex-1 rounded-xl border border-white/[0.06] bg-black/30">
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full touch-none"
                    data-ocid="crafter-pot"
                    onPointerUp={(e) => {
                      if (dragIdRef.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        if (
                          e.clientX >= rect.left &&
                          e.clientX <= rect.right &&
                          e.clientY >= rect.top &&
                          e.clientY <= rect.bottom
                        ) {
                          addIngredient(
                            dragIdRef.current,
                            e.clientX - rect.left,
                            e.clientY - rect.top,
                          );
                        }
                        dragIdRef.current = null;
                      }
                    }}
                  />
                  {meters.isScorched && (
                    <p className="pointer-events-none absolute left-2 top-2 rounded bg-red-900/60 px-2 py-0.5 text-[10px] font-bold text-red-200">
                      Scorched Batch
                    </p>
                  )}
                </div>

                <div className="mx-3 mt-2 grid shrink-0 grid-cols-3 gap-1.5">
                  <MeterGauge
                    label="Heat"
                    value={meters.heatShu}
                    max={2_500_000}
                    unit="shu"
                    accent="linear-gradient(90deg,#ef4444,#f97316)"
                    icon="🔥"
                  />
                  <MeterGauge
                    label="Sweet/Acid"
                    value={meters.sweetAcidScore}
                    max={100}
                    accent="linear-gradient(90deg,#fbbf24,#4ade80)"
                    icon="⚖️"
                  />
                  <MeterGauge
                    label="Harmony"
                    value={meters.harmonyScore}
                    max={100}
                    accent="linear-gradient(90deg,#a855f7,#22c55e)"
                    icon="✨"
                  />
                </div>

                <div
                  ref={trayRef}
                  className="mx-2 mt-2 shrink-0 overflow-x-auto pb-2"
                  data-ocid="crafter-tray"
                >
                  {inventory.sliced.length > 0 && (
                    <div className="mb-2 px-1">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">
                        My Pantry · Homegrown
                      </p>
                      <div className="flex min-w-max gap-1.5">
                        {inventory.sliced.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            disabled={totalAdded >= MAX_BATCH_SIZE}
                            className="relative flex w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-1 py-2 backdrop-blur-md transition hover:border-emerald-400/50 active:scale-95 disabled:opacity-40"
                            onClick={() => addPantryIngredient(s)}
                            data-ocid={`crafter-pantry-${s.id}`}
                          >
                            <span className="text-xl">🌶️</span>
                            <span className="text-[8px] font-medium leading-tight text-center">
                              {s.varietyName}
                            </span>
                            <span className="text-[8px] text-emerald-300">
                              {formatShuDisplay(s.shu)}
                            </span>
                            <span className="absolute -top-1 right-0 rounded bg-emerald-600/90 px-1 text-[6px] font-bold text-white">
                              Homegrown
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tray · Always available
                  </p>
                  <div className="flex min-w-max gap-1.5 px-1">
                    {TRAY_INGREDIENTS.map((ing) => (
                      <button
                        key={ing.id}
                        type="button"
                        disabled={totalAdded >= MAX_BATCH_SIZE}
                        className="relative flex w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] px-1 py-2 backdrop-blur-md transition hover:border-orange-500/30 active:scale-95 disabled:opacity-40"
                        onClick={() => addIngredient(ing.id)}
                        onPointerDown={(e) => {
                          dragIdRef.current = ing.id;
                          e.currentTarget.setPointerCapture(e.pointerId);
                        }}
                        data-ocid={`crafter-ing-${ing.id}`}
                      >
                        <span className="text-xl">{ing.emoji}</span>
                        <span className="text-[9px] font-medium leading-tight text-center">
                          {ing.label}
                        </span>
                        {ing.shu > 0 && (
                          <span className="text-[8px] text-orange-400">
                            {formatShuDisplay(ing.shu)}
                          </span>
                        )}
                        {ing.varietyBadge && (
                          <span className="absolute -top-1 right-0 rounded bg-emerald-600/80 px-1 text-[6px] font-bold text-white">
                            ICSPICY
                          </span>
                        )}
                        {(counts[ing.id] ?? 0) > 0 && (
                          <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold">
                            {counts[ing.id]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mx-3 mb-2 mt-1 shrink-0">
                  <Button
                    className="w-full"
                    disabled={mix.length === 0}
                    onClick={bottleIt}
                    data-ocid="crafter-bottle"
                  >
                    Bottle It! ({totalAdded}/{MAX_BATCH_SIZE})
                  </Button>
                </div>
              </>
            )}

            {phase === "result" && batchResult && (
              <div className="mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-4">
                <ArcadeResultsPanel
                  title={batchName}
                  score={batchResult.finalScore}
                  isNewBest={
                    submitScore.data != null &&
                    "ok" in submitScore.data &&
                    submitScore.data.ok.isNewBest
                  }
                  stats={[
                    {
                      label: "Grade",
                      value: `${batchResult.grade} · Harmony ${batchResult.meters.harmonyScore}%`,
                    },
                    ...(batchResult.scorched
                      ? [{ label: "Note", value: "Scorched batch" }]
                      : []),
                    ...(batchResult.trueSmallBatch
                      ? [
                          {
                            label: "Small Batch",
                            value: `TRUE · ${Math.round(batchResult.pantryShare * 100)}% pantry`,
                          },
                        ]
                      : []),
                  ]}
                  isAuthenticated={isAuthenticated}
                  onSignIn={login}
                  scoreConfirmation={
                    <GameSubmitStatus
                      isAuthenticated={isAuthenticated}
                      isPending={submitScore.isPending}
                      submitError={submitError}
                      submitOk={submitOk}
                      myStats={myStats ?? null}
                      showRank={false}
                      successHeadline="✓ Batch recorded"
                      bestLabel="Best batch"
                      thisRunLabel="This batch"
                    />
                  }
                  onPlayAgain={craftAnother}
                  playAgainLabel="Craft Another"
                  gameId="crafter"
                  lbRows={lbRows}
                  lbLoading={lbLoading}
                  currentPrincipal={principal?.toText()}
                >
                  <BottleIllustration
                    color={resultColor}
                    trueSmallBatch={batchResult.trueSmallBatch}
                  />
                  <ul className="mt-2 flex flex-wrap justify-center gap-1 text-[10px] text-amber-100/80">
                    {batchResult.mix.map((m) => (
                      <li
                        key={m.id}
                        className="arcade-slat-panel px-2 py-0.5"
                      >
                        {INGREDIENT_BY_ID[m.id].emoji} ×{m.count}
                        {(m.pantryUnits?.length ?? 0) > 0 && (
                          <span className="ml-1 text-emerald-400">⌂</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {isAuthenticated && (
                    <>
                      <Button
                        variant="outline"
                        className="mt-2 w-full border-amber-700/40"
                        onClick={() => void handleSaveRecipe()}
                        disabled={saveRecipe.isPending}
                        data-ocid="crafter-save"
                      >
                        {saveRecipe.isSuccess && !recipeSaveError
                          ? "Recipe Saved!"
                          : "Save Recipe"}
                      </Button>
                      {recipeSaveError && (
                        <p className="mt-1 text-center text-[11px] text-red-300" role="alert">
                          Recipe not saved — {recipeSaveError}
                        </p>
                      )}
                    </>
                  )}
                  {!isAuthenticated && (
                    <div className="flex justify-center">
                      <ConnectButton />
                    </div>
                  )}
                </ArcadeResultsPanel>
              </div>
            )}
          </TabsContent>

          <TabsContent value="batches" className="mt-2 min-h-0 flex-1 overflow-y-auto px-3 data-[state=inactive]:hidden">
            {!isAuthenticated ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Sign in to view your saved batches.
                </p>
                <Button variant="outline" size="sm" onClick={login}>
                  Sign in
                </Button>
              </div>
            ) : recipesLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : !myRecipes?.length ? (
              <p className="text-xs text-muted-foreground">
                No saved batches yet — bottle a batch and tap Save Recipe.
              </p>
            ) : (
              <ul className="space-y-2 pb-4">
                {myRecipes.map((r, i) => (
                  <li
                    key={`${r.name}-${i}`}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
                  >
                    <p className="font-semibold text-orange-200">{r.name}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatShu(Number(r.shu))} SHU · Harmony {Number(r.harmony)}%
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {r.ingredients.map((ing) => `${ing.name}×${ing.amount}`).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <ScorePopup
          text={popup ?? ""}
          visible={popup != null}
          onDismiss={() => setPopup(null)}
        />
      </div>
    </GameShell>
  );
}
