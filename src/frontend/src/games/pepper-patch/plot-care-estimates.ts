/**
 * Per-plot care / growth ETA helpers for progress UI.
 */
import { COMPANION_BY_ID } from "./constants";
import type { GardenState, PlotState } from "./types";
import { v2GrowthMultiplier } from "./simulation-v2";
import { VARIETY_BY_ID } from "./varieties";

const CARE_READY_THRESHOLD = 30;

function needRisePerMs(sensitivity: number, upgradeMult: number) {
  const base = sensitivity * 0.00012;
  return {
    water: base * upgradeMult,
    nutrient: base * 0.7,
    light: base * 0.85,
  };
}

function upgradeMults(upgrades: GardenState["upgrades"]) {
  return {
    water: upgrades.autoWaterer ? 0.65 : 1,
    nutrient: upgrades.compostBin ? 0.65 : 1,
    light: upgrades.growLight ? 0.6 : 1,
  };
}

function etaToThreshold(need: number, risePerMs: number): number {
  if (need >= CARE_READY_THRESHOLD) return 0;
  if (risePerMs <= 0) return Number.POSITIVE_INFINITY;
  return (CARE_READY_THRESHOLD - need) / risePerMs;
}

export interface PlotCareEstimates {
  waterEtaMs: number;
  nutrientEtaMs: number;
  lightEtaMs: number;
  stageEtaMs: number;
  needsAttention: boolean;
  nextCareLabel: string;
}

export function estimatePlotCare(
  garden: GardenState,
  plot: PlotState,
): PlotCareEstimates | null {
  if (!plot.varietyId || plot.stage === "empty" || plot.stage === "wilted") {
    return null;
  }
  const variety = VARIETY_BY_ID[plot.varietyId];
  if (!variety) return null;

  const um = upgradeMults(garden.upgrades);
  const cm = plot.companionId
    ? COMPANION_BY_ID[plot.companionId].careDecayMult
    : 1;
  const rise = needRisePerMs(variety.careSensitivity, 1);

  const waterEtaMs = etaToThreshold(plot.waterNeed, rise.water * um.water * cm);
  const nutrientEtaMs = etaToThreshold(
    plot.nutrientNeed,
    rise.nutrient * um.nutrient * cm,
  );
  const lightEtaMs = etaToThreshold(plot.lightNeed, rise.light * um.light * cm);

  const careFactor = 0.5 + (plot.careQuality / 100) * 0.5;
  const growthPerMs =
    (careFactor / variety.growthTimeMs) *
    careFactor *
    v2GrowthMultiplier(garden, plot);
  const stageRemaining = Math.max(0, 1 - plot.stageProgress);
  const stageEtaMs =
    growthPerMs > 0 ? stageRemaining / growthPerMs : Number.POSITIVE_INFINITY;

  const minEta = Math.min(waterEtaMs, nutrientEtaMs, lightEtaMs);
  const needsAttention =
    plot.readyToHarvest ||
    plot.waterNeed >= CARE_READY_THRESHOLD ||
    plot.nutrientNeed >= CARE_READY_THRESHOLD ||
    plot.lightNeed >= CARE_READY_THRESHOLD;

  let nextCareLabel = "Growing";
  if (plot.readyToHarvest) nextCareLabel = "Harvest ready";
  else if (needsAttention) {
    if (waterEtaMs === 0) nextCareLabel = "Needs water";
    else if (nutrientEtaMs === 0) nextCareLabel = "Needs feed";
    else if (lightEtaMs === 0) nextCareLabel = "Needs light";
    else nextCareLabel = "Care soon";
  } else {
    nextCareLabel =
      minEta === waterEtaMs
        ? "Water next"
        : minEta === nutrientEtaMs
          ? "Feed next"
          : "Light next";
  }

  return {
    waterEtaMs,
    nutrientEtaMs,
    lightEtaMs,
    stageEtaMs,
    needsAttention,
    nextCareLabel,
  };
}

export function formatEtaShort(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "now";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.ceil(sec / 60);
  return `${min}m`;
}
