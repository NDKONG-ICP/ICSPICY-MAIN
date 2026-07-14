import { useEffect, useState } from "react";
import { AtlasSprite } from "./AtlasSprite";
import { CompanionSprite } from "./CompanionSprite";
import type { CompanionId } from "./constants";
import { COMPANION_BY_ID } from "./constants";
import {
  formatEtaShort,
  type PlotCareEstimates,
} from "./plot-care-estimates";
import {
  getAtlasState,
  preloadAtlas,
  stageSpriteKey,
  USE_PLACEHOLDER_FALLBACK,
} from "./atlas";
import type { GrowthStage } from "./varieties";
import { VARIETY_BY_ID } from "./varieties";

const STAGE_COLORS: Record<GrowthStage, string> = {
  empty: "#5c4033",
  seedling: "#4ade80",
  vegetative: "#22c55e",
  flowering: "#fbbf24",
  fruiting: "#ef4444",
  wilted: "#78716c",
};

interface Props {
  stage: GrowthStage;
  varietyId: string | null;
  careQuality: number;
  waterNeed: number;
  nutrientNeed: number;
  lightNeed: number;
  readyToHarvest: boolean;
  selected: boolean;
  onSelect: () => void;
  fxStem?: string | null;
  /** v2 */
  prepDone?: boolean;
  soilMoisture?: "dry" | "moist" | "wet";
  mulched?: boolean;
  soilBiology?: number;
  showMicrobes?: boolean;
  companionId?: CompanionId | null;
  careEstimates?: PlotCareEstimates | null;
  stageProgress?: number;
}

function PlaceholderPlant({
  stage,
  hot,
}: {
  stage: GrowthStage;
  hot: boolean;
}) {
  const h =
    stage === "empty"
      ? 8
      : stage === "seedling"
        ? 18
        : stage === "vegetative"
          ? 32
          : stage === "flowering"
            ? 38
            : 42;

  if (stage === "empty") return null;

  return (
    <svg
      viewBox="0 0 40 50"
      className="relative z-10 h-[70%] w-[55%] pepper-sway"
      aria-hidden
    >
      <line
        x1="20"
        y1="48"
        x2="20"
        y2={50 - h}
        stroke="#166534"
        strokeWidth="2"
      />
      {stage !== "seedling" && (
        <>
          <ellipse
            cx="14"
            cy={48 - h + 8}
            rx="10"
            ry="6"
            fill={STAGE_COLORS[stage]}
            opacity="0.85"
          />
          <ellipse
            cx="26"
            cy={48 - h + 10}
            rx="9"
            ry="5"
            fill={STAGE_COLORS[stage]}
            opacity="0.75"
          />
        </>
      )}
      {stage === "flowering" && (
        <>
          <circle cx="12" cy={48 - h} r="2" fill="#fef08a" />
          <circle cx="28" cy={48 - h - 2} r="2" fill="#fef08a" />
        </>
      )}
      {(stage === "fruiting") && (
        <>
          <ellipse cx="16" cy={48 - h - 4} rx="4" ry="5" fill="#dc2626" />
          <ellipse cx="24" cy={48 - h - 2} rx="3.5" ry="4.5" fill="#b91c1c" />
        </>
      )}
      {stage === "seedling" && (
        <ellipse cx="20" cy={48 - h} rx="6" ry="4" fill="#4ade80" />
      )}
      {hot && (
        <>
          <circle
            cx="14"
            cy={48 - h - 8}
            r="1.5"
            fill="#fb923c"
            className="flame-spark"
          />
          <circle
            cx="26"
            cy={48 - h - 6}
            r="1.2"
            fill="#f97316"
            className="flame-spark flame-spark-delay"
          />
        </>
      )}
    </svg>
  );
}

export function PlotCell({
  stage,
  varietyId,
  waterNeed,
  nutrientNeed,
  lightNeed,
  readyToHarvest,
  selected,
  onSelect,
  fxStem,
  prepDone = false,
  soilMoisture = "dry",
  mulched = false,
  soilBiology = 45,
  showMicrobes = false,
  companionId = null,
  careEstimates = null,
  stageProgress = 0,
}: Props) {
  const variety = varietyId ? VARIETY_BY_ID[varietyId] : null;
  const hot = Boolean(
    variety?.hotFruit && (stage === "fruiting" || readyToHarvest),
  );
  const [atlasReady, setAtlasReady] = useState(getAtlasState() === "ready");

  useEffect(() => {
    void preloadAtlas().then((ok) => setAtlasReady(ok));
  }, []);

  const useSprites = atlasReady && !USE_PLACEHOLDER_FALLBACK;
  const plantStem = stageSpriteKey(stage, variety?.podColor ?? null);
  const useFruitingSprite =
    stage === "fruiting" ||
    (readyToHarvest && stage !== "wilted" && stage !== "empty");
  const resolvedStem = useFruitingSprite
    ? stageSpriteKey("fruiting", variety?.podColor ?? "red")
    : plantStem;

  const soilStem =
    stage === "empty"
      ? prepDone
        ? mulched
          ? "soil_mulched"
          : soilMoisture === "wet" || soilMoisture === "moist"
            ? "soil_moist"
            : "soil_dry"
        : "soil_empty"
      : mulched
        ? "soil_mulched"
        : soilMoisture === "wet" || soilMoisture === "moist"
          ? "soil_moist"
          : "soil_dry";

  const needsAttention = careEstimates?.needsAttention ?? readyToHarvest;
  const careRingPct =
    careEstimates && !readyToHarvest
      ? careEstimates.needsAttention
        ? 100
        : Math.max(
            0,
            100 -
              (Math.min(
                careEstimates.waterEtaMs,
                careEstimates.nutrientEtaMs,
                careEstimates.lightEtaMs,
              ) /
                90_000) *
                100,
          )
      : 0;
  const stageRingPct =
    stage !== "empty" && stage !== "wilted"
      ? Math.min(100, Math.max(4, stageProgress * 100))
      : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "relative flex aspect-[1/1.1] w-full touch-manipulation flex-col items-center justify-end overflow-hidden rounded-lg border-2 pb-1 transition",
        selected
          ? "border-orange-400 bg-orange-500/10 shadow-[0_0_16px_rgba(251,146,60,0.35)]"
          : "border-amber-900/40 bg-gradient-to-b from-amber-950/30 to-amber-950/60",
        needsAttention ? "ring-2 ring-emerald-400/50 animate-[pulse_2s_ease-in-out_infinite]" : "",
        readyToHarvest ? "animate-pulse ring-2 ring-orange-400/60" : "",
      ].join(" ")}
      data-ocid={`plot-${stage}`}
    >
      {/* Progress rings — outer care urgency, inner stage */}
      {stage !== "empty" && careEstimates && (
        <svg
          className="pointer-events-none absolute inset-1 z-[1] h-[calc(100%-8px)] w-[calc(100%-8px)]"
          viewBox="0 0 36 36"
          aria-hidden
        >
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={needsAttention ? "#4ade80" : "#fbbf24"}
            strokeWidth="2"
            strokeDasharray={`${Math.max(4, careRingPct)} 100`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
            opacity="0.85"
          />
          <circle
            cx="18"
            cy="18"
            r="12"
            fill="none"
            stroke="#fb923c"
            strokeWidth="1.5"
            strokeDasharray={`${Math.max(4, stageRingPct)} 100`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
            opacity="0.7"
          />
        </svg>
      )}

      {companionId && stage !== "empty" && (
        <div
          className="absolute bottom-8 left-1 z-20 flex items-center gap-0.5 rounded-md border border-emerald-500/30 bg-black/50 px-1 py-0.5"
          title={COMPANION_BY_ID[companionId].tooltip}
        >
          <CompanionSprite companionId={companionId} maxEdge={18} />
        </div>
      )}

      {careEstimates && stage !== "empty" && (
        <span className="absolute left-1 top-1 z-20 max-w-[70%] truncate rounded bg-black/55 px-1 text-[7px] font-medium text-emerald-200/90">
          {careEstimates.nextCareLabel}
          {!careEstimates.needsAttention && !readyToHarvest
            ? ` · ${formatEtaShort(
                Math.min(
                  careEstimates.waterEtaMs,
                  careEstimates.nutrientEtaMs,
                  careEstimates.lightEtaMs,
                ),
              )}`
            : ""}
        </span>
      )}
      {/* Plot frame (atlas) */}
      {useSprites && (
        <AtlasSprite
          stem="plot_frame"
          maxEdge={160}
          className="pointer-events-none absolute inset-0 z-0 m-auto opacity-90"
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      )}

      {/* Soil bed */}
      {useSprites ? (
        <AtlasSprite
          stem={soilStem}
          maxEdge={72}
          className="relative z-10 mb-1"
          alt="Soil"
        />
      ) : (
        <div className="absolute inset-x-1 bottom-1 h-[18%] rounded-b-md bg-[#3d2817]" />
      )}

      {useSprites && showMicrobes && soilBiology >= 50 && (
        <AtlasSprite
          stem="fx_microbes"
          maxEdge={48}
          className="pointer-events-none absolute bottom-[22%] z-[5] opacity-70"
        />
      )}

      {/* Plant sprite or SVG placeholder */}
      {stage !== "empty" &&
        (useSprites && resolvedStem ? (
          <div className="relative z-10 flex h-[72%] w-full items-end justify-center pepper-sway">
            <AtlasSprite
              stem={resolvedStem}
              maxEdge={stage === "seedling" ? 56 : 78}
              alt={variety?.name ?? stage}
            />
            {hot && (
              <span className="pointer-events-none absolute top-1 right-2 text-[10px] flame-spark">
                🔥
              </span>
            )}
          </div>
        ) : (
          <PlaceholderPlant stage={stage} hot={hot} />
        ))}

      {stage === "empty" && (
        <span className="relative z-20 text-[10px] font-medium text-amber-100/70">
          {prepDone ? "+ Plant" : "Prep soil"}
        </span>
      )}

      {stage === "wilted" && (
        <span className="absolute top-1 z-20 text-[9px] font-bold text-stone-400">
          Wilted
        </span>
      )}

      {/* Need indicators */}
      {stage !== "empty" && (
        <div className="absolute right-0.5 top-0.5 z-20 flex flex-col gap-0.5">
          {waterNeed >= 50 &&
            (useSprites ? (
              <AtlasSprite stem="icon_water" maxEdge={16} alt="Needs water" />
            ) : (
              <span title="Needs water">💧</span>
            ))}
          {nutrientNeed >= 50 &&
            (useSprites ? (
              <AtlasSprite stem="icon_feed" maxEdge={16} alt="Needs nutrients" />
            ) : (
              <span title="Needs nutrients">🌿</span>
            ))}
          {lightNeed >= 50 &&
            (useSprites ? (
              <AtlasSprite stem="icon_light" maxEdge={16} alt="Needs light" />
            ) : (
              <span title="Needs light">☀️</span>
            ))}
        </div>
      )}

      {/* Care / harvest FX burst */}
      {useSprites && fxStem && (
        <AtlasSprite
          stem={fxStem}
          maxEdge={64}
          className="pointer-events-none absolute inset-0 z-30 m-auto animate-ping opacity-80"
          style={{ animationDuration: "0.7s", animationIterationCount: 1 }}
        />
      )}

      {readyToHarvest && (
        <span className="absolute bottom-0.5 left-0.5 z-20 rounded bg-orange-600/90 px-1 text-[7px] font-bold text-white">
          Harvest!
        </span>
      )}

      <style>{`
        .pepper-sway { animation: pepper-sway 3.5s ease-in-out infinite; transform-origin: bottom center; }
        @keyframes pepper-sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        .flame-spark { animation: flame-float 1.2s ease-out infinite; }
        .flame-spark-delay { animation-delay: 0.5s; }
        @keyframes flame-float {
          0% { opacity: 0.9; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>
    </button>
  );
}
