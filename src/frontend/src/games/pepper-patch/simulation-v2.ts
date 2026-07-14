/**
 * Pepper Patch v2 simulation — soil biology, weather, inputs, phase feeding.
 */
import { SOIL_AMENDMENTS } from "./v2-content";
import type { InputKind, SoilAmendmentId } from "./v2-content";
import {
  INPUT_BY_KIND,
  SEASON_CYCLE_MS,
  SOIL_BIO_DECAY_PER_MIN,
  STORM_PAUSE_MS,
  WEATHER_CYCLE_MS,
} from "./v2-content";
import type { GardenState, PlotState, Season, SoilMoisture, WeatherKind } from "./types";
import type { GrowthStage } from "./varieties";

const WEATHER_ORDER: WeatherKind[] = ["sunny", "overcast", "rain", "storm"];
const SEASON_ORDER: Season[] = ["spring", "summer", "fall", "winter"];

const MOISTURE_RANK: Record<SoilMoisture, number> = {
  dry: 0,
  moist: 1,
  wet: 2,
};

function bumpMoisture(m: SoilMoisture, delta: number): SoilMoisture {
  const r = Math.max(0, Math.min(2, MOISTURE_RANK[m] + delta));
  return r === 0 ? "dry" : r === 1 ? "moist" : "wet";
}

function seasonGrowthMult(season: Season): number {
  switch (season) {
    case "spring":
      return 1.08;
    case "summer":
      return 1.12;
    case "fall":
      return 0.95;
    case "winter":
      return 0.82;
  }
}

function weatherGrowthMult(weather: WeatherKind): number {
  switch (weather) {
    case "sunny":
      return 1.05;
    case "overcast":
      return 1;
    case "rain":
      return 0.92;
    case "storm":
      return 0.75;
  }
}

export function averageSoilBiology(state: GardenState): number {
  const active = state.plots.slice(0, state.plotCount).filter((p) => p.prepDone);
  if (active.length === 0) return 45;
  return active.reduce((s, p) => s + p.soilBiology, 0) / active.length;
}

export function soilBiologyMult(soilBiology: number): number {
  // Casual floor ~0.88 at 45 biology; master ~1.0+ at 90+
  return 0.82 + (soilBiology / 100) * 0.22;
}

export function isCarePaused(state: GardenState, now = Date.now()): boolean {
  return state.carePausedUntil > now;
}

function advanceWeather(state: GardenState, now: number): GardenState {
  if (now - state.weatherChangedAt < WEATHER_CYCLE_MS) return state;
  const idx = WEATHER_ORDER.indexOf(state.weather);
  const next = WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length]!;
  let carePausedUntil = state.carePausedUntil;
  if (next === "storm") {
    carePausedUntil = Math.max(carePausedUntil, now + STORM_PAUSE_MS);
  }
  return {
    ...state,
    weather: next,
    weatherChangedAt: now,
    carePausedUntil,
  };
}

function advanceSeason(state: GardenState, now: number): GardenState {
  if (now - state.seasonChangedAt < SEASON_CYCLE_MS) return state;
  const idx = SEASON_ORDER.indexOf(state.season);
  const next = SEASON_ORDER[(idx + 1) % SEASON_ORDER.length]!;
  return { ...state, season: next, seasonChangedAt: now };
}

function tickBrewing(state: GardenState, now: number): GardenState {
  if (state.brewing.length === 0) return state;
  const ready: InputKind[] = [];
  const still: typeof state.brewing = [];
  for (const b of state.brewing) {
    if (b.readyAt <= now) ready.push(b.kind);
    else still.push(b);
  }
  if (ready.length === 0) return { ...state, brewing: still };
  const inputInventory = { ...state.inputInventory };
  for (const k of ready) inputInventory[k] = (inputInventory[k] ?? 0) + 1;
  return { ...state, brewing: still, inputInventory };
}

function applyWeatherToPlots(state: GardenState, elapsedMin: number): PlotState[] {
  const { weather } = state;
  return state.plots.map((plot) => {
    if (!plot.prepDone && plot.stage === "empty") return plot;

    let { soilMoisture, soilBiology, mulched } = plot;
    if (weather === "rain") {
      soilMoisture = bumpMoisture(soilMoisture, 1);
    } else if (weather === "sunny") {
      soilMoisture = bumpMoisture(soilMoisture, -1);
    } else if (weather === "overcast") {
      soilMoisture = bumpMoisture(soilMoisture, 0);
    }

    if (weather === "storm" && !mulched && plot.stage !== "empty") {
      soilBiology = Math.max(0, soilBiology - elapsedMin * 1.2);
    }

    const decay =
      SOIL_BIO_DECAY_PER_MIN * elapsedMin * (mulched ? 0.55 : 1);
    soilBiology = Math.max(0, soilBiology - decay);

    return { ...plot, soilMoisture, soilBiology };
  });
}

/** v2 environmental tick — call inside simulateOfflineGrowth. */
export function tickV2Environment(
  state: GardenState,
  now = Date.now(),
): GardenState {
  let s = advanceWeather(state, now);
  s = advanceSeason(s, now);
  s = tickBrewing(s, now);

  const elapsed = Math.max(0, now - s.lastSimulatedAt);
  const elapsedMin = elapsed / 60_000;
  if (elapsedMin > 0) {
    s = { ...s, plots: applyWeatherToPlots(s, elapsedMin) };
  }
  return s;
}

export function applySoilPrep(
  state: GardenState,
  plotId: number,
  picked: SoilAmendmentId[],
): GardenState {
  const amendments =
    picked.length > 0 ? picked : (["compost", "mulch"] as SoilAmendmentId[]);
  let biology = 42;
  let mulched = false;
  for (const id of amendments) {
    const def = SOIL_AMENDMENTS.find((a) => a.id === id);
    if (def) biology += def.biologyBoost;
    if (id === "mulch") mulched = true;
  }
  biology = Math.min(100, biology);

  const plots = state.plots.map((p) => {
    if (p.id !== plotId || p.stage !== "empty") return p;
    return {
      ...p,
      prepDone: true,
      soilBiology: biology,
      soilMoisture: "moist" as SoilMoisture,
      mulched,
      amendments,
    };
  });
  return { ...state, plots, lastSimulatedAt: Date.now() };
}

export function startBrew(state: GardenState, kind: InputKind): GardenState {
  const recipe = INPUT_BY_KIND[kind];
  if (!recipe) return state;
  if (state.brewing.length >= 2) return state;
  const now = Date.now();
  return {
    ...state,
    brewing: [
      ...state.brewing,
      { kind, startedAt: now, readyAt: now + recipe.brewMs },
    ],
  };
}

export function growthPhaseForStage(stage: GrowthStage): "vegetative" | "flowering" | "fruiting" | null {
  if (stage === "seedling" || stage === "vegetative") return "vegetative";
  if (stage === "flowering") return "flowering";
  if (stage === "fruiting") return "fruiting";
  return null;
}

export interface FeedResult {
  state: GardenState;
  usedInput: InputKind | "generic" | null;
  phaseMatch: boolean;
  toast?: string;
}

export function pickBestInput(
  state: GardenState,
  phase: "vegetative" | "flowering" | "fruiting",
): { kind: InputKind; phaseMatch: boolean } | null {
  const priority: Record<typeof phase, InputKind[]> = {
    vegetative: ["fpj", "jms", "imo", "ohn"],
    flowering: ["calcium", "jms", "imo", "ohn"],
    fruiting: ["calcium", "imo", "ohn", "fpj"],
  };
  for (const kind of priority[phase]) {
    if ((state.inputInventory[kind] ?? 0) > 0) {
      const recipe = INPUT_BY_KIND[kind];
      const phaseMatch = recipe.phases.includes(phase);
      return { kind, phaseMatch };
    }
  }
  return null;
}

export function applyOverwaterPenalty(
  plot: PlotState,
): { plot: PlotState; penalized: boolean } {
  if (plot.soilMoisture !== "moist" && plot.soilMoisture !== "wet") {
    return { plot, penalized: false };
  }
  return {
    plot: {
      ...plot,
      soilBiology: Math.max(0, plot.soilBiology - (plot.soilMoisture === "wet" ? 8 : 4)),
      soilMoisture: bumpMoisture(plot.soilMoisture, 1),
    },
    penalized: true,
  };
}

export function v2GrowthMultiplier(state: GardenState, plot: PlotState): number {
  return (
    soilBiologyMult(plot.soilBiology) *
    seasonGrowthMult(state.season) *
    weatherGrowthMult(state.weather)
  );
}

export function v2HarvestMultiplier(plot: PlotState): number {
  return soilBiologyMult(plot.soilBiology);
}

export function recordTip(
  state: GardenState,
  tipId: string,
): GardenState {
  const seen = state.seenTips.includes(tipId)
    ? state.seenTips
    : [...state.seenTips, tipId];
  const notes = state.fieldNotes.includes(tipId)
    ? state.fieldNotes
    : [...state.fieldNotes, tipId];
  return { ...state, seenTips: seen, fieldNotes: notes };
}
