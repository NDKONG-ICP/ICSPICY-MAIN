import { COMPANION_BY_ID } from "./constants";
import type { GardenState, PlotState } from "./types";
import {
  applyOverwaterPenalty,
  tickV2Environment,
  v2GrowthMultiplier,
  v2HarvestMultiplier,
  type FeedResult,
} from "./simulation-v2";
import type { InputKind } from "./v2-content";
import { INPUT_BY_KIND } from "./v2-content";
import {
  GAME_VARIETIES,
  VARIETY_BY_ID,
  type GrowthStage,
} from "./varieties";

const STAGE_ORDER = [
  "seedling",
  "vegetative",
  "flowering",
  "fruiting",
] as const;
type GrowStage = (typeof STAGE_ORDER)[number];

function needRisePerMs(sensitivity: number, upgradeMult: number): {
  water: number;
  nutrient: number;
  light: number;
} {
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

function companionCareMult(companionId: PlotState["companionId"]): number {
  if (!companionId) return 1;
  return COMPANION_BY_ID[companionId].careDecayMult;
}

/** Apply elapsed real time since lastSimulatedAt to all plots. */
export function simulateOfflineGrowth(
  state: GardenState,
  now = Date.now(),
): GardenState {
  let s = tickV2Environment(state, now);
  const elapsed = Math.max(0, now - s.lastSimulatedAt);
  if (elapsed < 1000) return { ...s, lastSimulatedAt: now };

  const um = upgradeMults(s.upgrades);
  const plots = s.plots.map((plot) => {
    if (!plot.varietyId || plot.stage === "empty") return plot;
    const variety = VARIETY_BY_ID[plot.varietyId];
    if (!variety) return plot;

    type ActiveStage = GrowStage | "wilted";

    let {
      waterNeed,
      nutrientNeed,
      lightNeed,
      careQuality,
      stageProgress,
      readyToHarvest,
    } = plot;
    let stage: ActiveStage = plot.stage as ActiveStage;

    const rise = needRisePerMs(variety.careSensitivity, 1);
    const cm = companionCareMult(plot.companionId);
    waterNeed = Math.min(100, waterNeed + rise.water * elapsed * um.water * cm);
    nutrientNeed = Math.min(
      100,
      nutrientNeed + rise.nutrient * elapsed * um.nutrient * cm,
    );
    lightNeed = Math.min(100, lightNeed + rise.light * elapsed * um.light * cm);

    const neglected =
      waterNeed >= 100 || nutrientNeed >= 100 || lightNeed >= 100;
    if (neglected) {
      careQuality = Math.max(0, careQuality - (elapsed / 60_000) * 8 * variety.careSensitivity);
      if (careQuality < 15 && stage !== "wilted") {
        stage = "wilted";
        readyToHarvest = false;
      }
    }

    if (stage !== "wilted") {
      let growStage: ActiveStage = stage;
      const careFactor = 0.5 + (careQuality / 100) * 0.5;
      const growthDelta =
        (elapsed / variety.growthTimeMs) *
        careFactor *
        v2GrowthMultiplier(s, plot);
      stageProgress += growthDelta * careFactor;

      while (stageProgress >= 1 && growStage !== "fruiting") {
        stageProgress -= 1;
        const idx = STAGE_ORDER.indexOf(growStage as GrowStage);
        if (idx >= 0 && idx < STAGE_ORDER.length - 1) {
          growStage = STAGE_ORDER[idx + 1]!;
        } else break;
      }
      if (growStage === "fruiting" && stageProgress >= 1) {
        stageProgress = 1;
        readyToHarvest = true;
      }
      stage = growStage;
    }

    return {
      ...plot,
      waterNeed,
      nutrientNeed,
      lightNeed,
      careQuality,
      stage,
      stageProgress,
      readyToHarvest,
    };
  });

  return { ...s, plots, lastSimulatedAt: now };
}

export type CareAction = "water" | "nutrient" | "light";

export type CareInputChoice = InputKind | "plain";

/** Inputs that can be applied as a soil drench when watering. */
export const WATER_DRENCH_INPUTS: InputKind[] = ["jms", "imo"];

export function applyCare(
  state: GardenState,
  plotId: number,
  action: CareAction,
  inputChoice: CareInputChoice = "plain",
): FeedResult & { state: GardenState } {
  const plot = state.plots.find((p) => p.id === plotId);
  if (!plot?.varietyId) return { state, usedInput: null, phaseMatch: true };

  let toast: string | undefined;
  let usedInput: InputKind | "generic" | null = null;
  let phaseMatch = true;
  let nextInventory = state.inputInventory;

  if (action === "nutrient") {
    if (inputChoice !== "plain") {
      const count = state.inputInventory[inputChoice] ?? 0;
      if (count > 0) {
        usedInput = inputChoice;
        const recipe = INPUT_BY_KIND[inputChoice];
        const phase = growthPhaseForPlot(plot);
        phaseMatch = phase ? recipe.phases.includes(phase) : true;
        if (!phaseMatch) {
          toast = `${recipe.label} works harder in other phases — ${phase === "vegetative" ? "try FPJ for leaf power" : "calcium shines at flower and fruit"}.`;
        }
        nextInventory = {
          ...state.inputInventory,
          [inputChoice]: count - 1,
        };
      } else {
        usedInput = "generic";
      }
    } else {
      usedInput = "generic";
    }
  } else if (
    action === "water" &&
    inputChoice !== "plain" &&
    WATER_DRENCH_INPUTS.includes(inputChoice)
  ) {
    const count = state.inputInventory[inputChoice] ?? 0;
    if (count > 0) {
      usedInput = inputChoice;
      nextInventory = {
        ...state.inputInventory,
        [inputChoice]: count - 1,
      };
      const recipe = INPUT_BY_KIND[inputChoice];
      toast = `${recipe.label} soil drench — biology gets a drink.`;
    }
  }

  const plots = state.plots.map((p) => {
    if (p.id !== plotId || !p.varietyId) return p;

    if (action === "water") {
      const { plot: updated, penalized } = applyOverwaterPenalty(p);
      if (penalized) {
        toast =
          "Soil was already moist — easy on the hose. Overwatering drowns soil biology.";
      }
      const needKey = "waterNeed" as const;
      let careGain = updated[needKey] >= 70 ? 14 : updated[needKey] >= 40 ? 8 : 2;
      if (usedInput && usedInput !== "generic") {
        careGain += 6;
      }
      let stage = updated.stage;
      let careQuality = Math.min(100, updated.careQuality + careGain);
      let soilBiology = updated.soilBiology;
      if (usedInput === "jms" || usedInput === "imo") {
        soilBiology = Math.min(100, soilBiology + 4);
      }
      if (stage === "wilted" && updated[needKey] >= 50) {
        stage = "seedling";
        careQuality = 30;
      }
      return {
        ...updated,
        [needKey]: Math.max(0, updated[needKey] - 55),
        careQuality,
        stage,
        soilBiology,
        soilMoisture:
          updated.soilMoisture === "dry"
            ? ("moist" as const)
            : updated.soilMoisture,
      };
    }

    const needKey =
      action === "nutrient"
        ? "nutrientNeed"
        : "lightNeed";
    const need = p[needKey];
    let careGain = need >= 70 ? 14 : need >= 40 ? 8 : 2;

    if (action === "nutrient") {
      const phase = growthPhaseForPlot(p);
      const usedBrewed =
        inputChoice !== "plain" &&
        usedInput !== "generic" &&
        usedInput !== null;
      if (usedBrewed) {
        const recipe = INPUT_BY_KIND[inputChoice as InputKind];
        phaseMatch = phase ? recipe.phases.includes(phase) : true;
        careGain += phaseMatch ? 10 : 4;
      } else if (state.upgrades.compostBin) {
        careGain += 3;
      }
      if (p.soilBiology < 90 && usedBrewed && phaseMatch) {
        return {
          ...p,
          [needKey]: Math.max(0, need - 55),
          careQuality: Math.min(100, p.careQuality + careGain),
          soilBiology: Math.min(100, p.soilBiology + 2),
        };
      }
    } else if (state.upgrades.growLight) {
      careGain += 2;
    }

    return {
      ...p,
      [needKey]: Math.max(0, need - 55),
      careQuality: Math.min(100, p.careQuality + careGain),
    };
  });

  return {
    state: {
      ...state,
      plots,
      inputInventory: nextInventory,
      lastSimulatedAt: Date.now(),
    },
    usedInput,
    phaseMatch,
    toast,
  };
}

function growthPhaseForPlot(
  plot: PlotState,
): "vegetative" | "flowering" | "fruiting" | null {
  if (plot.stage === "seedling" || plot.stage === "vegetative") return "vegetative";
  if (plot.stage === "flowering") return "flowering";
  if (plot.stage === "fruiting") return "fruiting";
  return null;
}

export function plantPlot(
  state: GardenState,
  plotId: number,
  varietyId: string,
  companionId: PlotState["companionId"],
): GardenState {
  const plots = state.plots.map((p) => {
    if (p.id !== plotId || p.stage !== "empty" || !p.prepDone) return p;
    return {
      ...p,
      varietyId,
      companionId,
      stage: "seedling" as GrowthStage,
      plantedAt: Date.now(),
      careQuality: 100,
      waterNeed: 20,
      nutrientNeed: 15,
      lightNeed: 18,
      stageProgress: 0,
      readyToHarvest: false,
    };
  });
  return { ...state, plots, lastSimulatedAt: Date.now() };
}

export interface HarvestResult {
  shu: number;
  careQuality: number;
  varietyId: string;
  varietyName: string;
  legendary: boolean;
}

export function harvestPlot(
  state: GardenState,
  plotId: number,
): { state: GardenState; result: HarvestResult | null } {
  const plot = state.plots.find((p) => p.id === plotId);
  if (!plot?.readyToHarvest || !plot.varietyId) {
    return { state, result: null };
  }
  const variety = VARIETY_BY_ID[plot.varietyId]!;
  let companionBonus = 1;
  if (plot.companionId) {
    companionBonus += COMPANION_BY_ID[plot.companionId].harvestBonus;
  }
  const base =
    variety.shuMin +
    Math.random() * (variety.shuMax - variety.shuMin);
  const shu = Math.floor(
    base *
      (plot.careQuality / 100) *
      companionBonus *
      v2HarvestMultiplier(plot),
  );

  const plots = state.plots.map((p) =>
    p.id === plotId
      ? {
          ...p,
          varietyId: null,
          companionId: null,
          stage: "empty" as GrowthStage,
          plantedAt: 0,
          careQuality: 100,
          waterNeed: 0,
          nutrientNeed: 0,
          lightNeed: 0,
          stageProgress: 0,
          readyToHarvest: false,
          prepDone: false,
          soilBiology: 45,
          soilMoisture: "dry" as const,
          mulched: false,
          amendments: [],
        }
      : p,
  );

  const heatReserve = state.heatReserve + shu;
  const bestBatchShu = Math.max(state.bestBatchShu, shu);
  const legendary =
    variety.tier === "legendary" && plot.careQuality >= 95;

  return {
    state: {
      ...state,
      plots,
      heatReserve,
      bestBatchShu,
      firstHarvestDone: true,
      lastSimulatedAt: Date.now(),
    },
    result: {
      shu,
      careQuality: plot.careQuality,
      varietyId: plot.varietyId,
      varietyName: variety.name,
      legendary,
    },
  };
}

export function unlockVariety(state: GardenState, varietyId: string): GardenState {
  const v = VARIETY_BY_ID[varietyId];
  if (!v || state.unlockedVarieties.includes(varietyId)) return state;
  if (state.heatReserve < v.unlockCost) return state;
  return {
    ...state,
    heatReserve: state.heatReserve - v.unlockCost,
    unlockedVarieties: [...state.unlockedVarieties, varietyId],
  };
}

export function expandPlots(state: GardenState): GardenState {
  let cost = 0;
  let newCount = state.plotCount;
  if (state.plotCount === 4) {
    cost = 5_000;
    newCount = 8;
  } else if (state.plotCount === 8) {
    cost = 15_000;
    newCount = 12;
  } else return state;
  if (state.heatReserve < cost) return state;

  const plots = [...state.plots];
  while (plots.length < newCount) {
    plots.push({
      id: plots.length,
      varietyId: null,
      companionId: null,
      stage: "empty",
      plantedAt: 0,
      careQuality: 100,
      waterNeed: 0,
      nutrientNeed: 0,
      lightNeed: 0,
      stageProgress: 0,
      readyToHarvest: false,
      prepDone: false,
      soilBiology: 45,
      soilMoisture: "dry",
      mulched: false,
      amendments: [],
    });
  }
  return {
    ...state,
    heatReserve: state.heatReserve - cost,
    plotCount: newCount,
    plots,
  };
}

export function buyUpgrade(
  state: GardenState,
  upgradeId: keyof GardenState["upgrades"],
  cost: number,
): GardenState {
  if (state.upgrades[upgradeId] || state.heatReserve < cost) return state;
  return {
    ...state,
    heatReserve: state.heatReserve - cost,
    upgrades: { ...state.upgrades, [upgradeId]: true },
  };
}

/** Match game varieties to NIMS catalog IDs by name. */
export function resolveCatalogIds(
  catalogNames: { id: bigint; name: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const gv of GAME_VARIETIES) {
    const match = catalogNames.find((c) =>
      c.name.toLowerCase().includes(gv.catalogMatch.toLowerCase()),
    );
    if (match) map[gv.id] = match.id.toString();
  }
  return map;
}
