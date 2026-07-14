import type { CompanionId } from "./constants";
import {
  CASUAL_PREP_DEFAULTS,
  type InputKind,
  type SoilAmendmentId,
} from "./v2-content";
import type { GrowthStage } from "./varieties";
import {
  GARDEN_STATE_VERSION,
  type GardenState,
  type GardenUpgrades,
  type InputBatch,
  type PlotState,
  type Season,
  type SoilMoisture,
  type WeatherKind,
} from "./types";

function defaultPlot(id: number): PlotState {
  return {
    id,
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
  };
}

function emptyInventory(): Record<InputKind, number> {
  return { fpj: 0, ohn: 0, jms: 0, calcium: 0, imo: 0 };
}

export function createV2PlotExtras(): Pick<
  PlotState,
  "prepDone" | "soilBiology" | "soilMoisture" | "mulched" | "amendments"
> {
  return {
    prepDone: false,
    soilBiology: 45,
    soilMoisture: "dry",
    mulched: false,
    amendments: [],
  };
}

/** Migrate v1 save → v2 without discarding progress. */
export function migrateV1ToV2(v1: GardenState): GardenState {
  const plots: PlotState[] = v1.plots.map((p) => ({
    ...p,
    prepDone: p.stage !== "empty" || Boolean(p.varietyId),
    soilBiology: p.stage === "empty" && !p.varietyId ? 45 : 58,
    soilMoisture: "moist" as SoilMoisture,
    mulched: false,
    amendments: p.stage === "empty" ? [] : [...CASUAL_PREP_DEFAULTS],
  }));

  while (plots.length < v1.plotCount) {
    plots.push(defaultPlot(plots.length));
  }

  return {
    ...v1,
    version: GARDEN_STATE_VERSION,
    plots: plots.slice(0, Math.max(plots.length, v1.plotCount)),
    weather: "sunny",
    season: "summer",
    weatherChangedAt: Date.now(),
    seasonChangedAt: Date.now(),
    carePausedUntil: 0,
    inputInventory: { ...emptyInventory(), fpj: 1, jms: 1 },
    brewing: [],
    seenTips: v1.onboardingDone ? ["soil_prep", "inputs_shed"] : [],
    fieldNotes: [],
    onboardingV2Done: false,
  };
}

export type GardenLoadErrorCode = "parse" | "shape" | "unknown_version";

export type GardenLoadResult =
  | { ok: true; state: GardenState }
  | {
      ok: false;
      code: GardenLoadErrorCode;
      message: string;
      /** Original blob preserved for recovery — never write a default over this. */
      rawJson: string;
    };

/** Loose progress probe — used to block destructive empty saves. */
export function rawBlobShowsProgress(json: string): boolean {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (typeof o.heatReserve === "number" && o.heatReserve > 0) return true;
    if (typeof o.bestBatchShu === "number" && o.bestBatchShu > 0) return true;
    if (o.firstHarvestDone === true) return true;
    if (Array.isArray(o.plots)) {
      for (const p of o.plots) {
        if (p && typeof p === "object" && (p as PlotState).varietyId) return true;
      }
    }
    return false;
  } catch {
    // Unparseable server blob — treat as precious; never overwrite blindly.
    return true;
  }
}

/** True when state matches a brand-new garden (no player progress). */
export function isLikelyFreshGarden(state: GardenState): boolean {
  const fresh = createInitialGardenV2();
  if (state.heatReserve > 0 || state.bestBatchShu > 0 || state.firstHarvestDone) {
    return false;
  }
  const planted = state.plots.some((p) => p.varietyId && p.stage !== "empty");
  if (planted) return false;
  if (state.plotCount > fresh.plotCount) return false;
  if (state.unlockedVarieties.length > fresh.unlockedVarieties.length) return false;
  for (const on of Object.values(state.upgrades)) {
    if (on) return false;
  }
  return true;
}

export function wouldWipeServerSave(
  next: GardenState,
  serverRawJson: string | null,
): boolean {
  if (!serverRawJson) return false;
  if (!rawBlobShowsProgress(serverRawJson)) return false;
  return isLikelyFreshGarden(next);
}

export function tryLoadGardenFromJson(json: string): GardenLoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return {
      ok: false,
      code: "parse",
      message: e instanceof Error ? e.message : "JSON parse failed",
      rawJson: json,
    };
  }

  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      code: "shape",
      message: "Garden save is not a JSON object",
      rawJson: json,
    };
  }

  const o = raw as GardenState & { version?: number };
  if (!Array.isArray(o.plots)) {
    return {
      ok: false,
      code: "shape",
      message: "Garden save missing plots array",
      rawJson: json,
    };
  }

  if (
    o.version != null &&
    o.version !== 1 &&
    o.version !== 2
  ) {
    return {
      ok: false,
      code: "unknown_version",
      message: `Unsupported garden version: ${o.version}`,
      rawJson: json,
    };
  }

  return { ok: true, state: normalizeGardenState(raw) };
}

export function normalizeGardenState(raw: unknown): GardenState {
  if (!raw || typeof raw !== "object") return createInitialGardenV2();
  const o = raw as GardenState & { version?: number };
  if (!Array.isArray(o.plots)) return createInitialGardenV2();

  if (o.version === 2) {
    return hydrateV2(o);
  }
  if (o.version === 1 || o.version == null) {
    const v1 = o as GardenState;
    const base: GardenState = {
      version: 1,
      heatReserve: v1.heatReserve ?? 0,
      bestBatchShu: v1.bestBatchShu ?? 0,
      plotCount: v1.plotCount ?? 4,
      unlockedVarieties: v1.unlockedVarieties ?? ["jalapeno", "serrano"],
      upgrades: v1.upgrades ?? {
        autoWaterer: false,
        growLight: false,
        compostBin: false,
      },
      plots: v1.plots,
      firstHarvestDone: v1.firstHarvestDone ?? false,
      onboardingDone: v1.onboardingDone ?? false,
      lastSimulatedAt: v1.lastSimulatedAt ?? Date.now(),
      catalogIds: v1.catalogIds ?? {},
      weather: "sunny",
      season: "summer",
      weatherChangedAt: Date.now(),
      seasonChangedAt: Date.now(),
      carePausedUntil: 0,
      inputInventory: emptyInventory(),
      brewing: [],
      seenTips: [],
      fieldNotes: [],
      onboardingV2Done: false,
    };
    return migrateV1ToV2(base);
  }
  return createInitialGardenV2();
}

function hydrateV2(o: GardenState): GardenState {
  const inv = { ...emptyInventory(), ...o.inputInventory };
  return {
    ...o,
    version: 2,
    inputInventory: inv,
    brewing: Array.isArray(o.brewing) ? o.brewing : [],
    seenTips: Array.isArray(o.seenTips) ? o.seenTips : [],
    fieldNotes: Array.isArray(o.fieldNotes) ? o.fieldNotes : [],
    plots: o.plots.map((p, i) => ({
      ...defaultPlot(i),
      ...p,
      amendments: Array.isArray(p.amendments) ? p.amendments : [],
    })),
  };
}

export function createInitialGardenV2(): GardenState {
  const now = Date.now();
  const plots = Array.from({ length: 4 }, (_, i) => defaultPlot(i));
  return {
    version: GARDEN_STATE_VERSION,
    heatReserve: 0,
    bestBatchShu: 0,
    plotCount: 4,
    unlockedVarieties: ["jalapeno", "serrano"],
    upgrades: { autoWaterer: false, growLight: false, compostBin: false },
    plots,
    firstHarvestDone: false,
    onboardingDone: false,
    lastSimulatedAt: now,
    catalogIds: {},
    weather: "sunny",
    season: "summer",
    weatherChangedAt: now,
    seasonChangedAt: now,
    carePausedUntil: 0,
    inputInventory: { ...emptyInventory(), fpj: 2, jms: 1 },
    brewing: [],
    seenTips: [],
    fieldNotes: [],
    onboardingV2Done: false,
  };
}

export { createInitialGardenV2 as createInitialGarden };
