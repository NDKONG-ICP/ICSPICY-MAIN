import type { CompanionId } from "./constants";
import type { GrowthStage } from "./varieties";
import type { InputKind, SoilAmendmentId } from "./v2-content";

export const GARDEN_STATE_VERSION = 2;

export type SoilMoisture = "dry" | "moist" | "wet";
export type WeatherKind = "sunny" | "overcast" | "rain" | "storm";
export type Season = "spring" | "summer" | "fall" | "winter";

export interface PlotState {
  id: number;
  varietyId: string | null;
  companionId: CompanionId | null;
  stage: GrowthStage;
  plantedAt: number;
  careQuality: number;
  waterNeed: number;
  nutrientNeed: number;
  lightNeed: number;
  /** 0–1 progress within current growth stage */
  stageProgress: number;
  readyToHarvest: boolean;
  /** v2 — soil prep complete; required before planting */
  prepDone: boolean;
  /** v2 — 0–100; boosts growth + SHU */
  soilBiology: number;
  soilMoisture: SoilMoisture;
  mulched: boolean;
  amendments: SoilAmendmentId[];
}

export interface GardenUpgrades {
  autoWaterer: boolean;
  growLight: boolean;
  compostBin: boolean;
}

export interface InputBatch {
  kind: InputKind;
  readyAt: number;
  startedAt: number;
}

export interface GardenState {
  version: number;
  heatReserve: number;
  bestBatchShu: number;
  plotCount: number;
  unlockedVarieties: string[];
  upgrades: GardenUpgrades;
  plots: PlotState[];
  firstHarvestDone: boolean;
  onboardingDone: boolean;
  lastSimulatedAt: number;
  catalogIds: Record<string, string>;
  /** v2 weather + seasons */
  weather: WeatherKind;
  season: Season;
  weatherChangedAt: number;
  seasonChangedAt: number;
  /** Storms pause care until this timestamp */
  carePausedUntil: number;
  inputInventory: Record<InputKind, number>;
  brewing: InputBatch[];
  seenTips: string[];
  fieldNotes: string[];
  /** v2 onboarding extension (soil + weather steps) */
  onboardingV2Done: boolean;
}
