/** 12 growable game varieties — catalog names resolved at runtime via listVarieties. */

import type { PodColor } from "./atlas";

export type VarietyTier = "starter" | "rare" | "legendary";
export type GrowthStage = "empty" | "seedling" | "vegetative" | "flowering" | "fruiting" | "wilted";
export type { PodColor };

export interface GameVarietyDef {
  id: string;
  /** Substring match against VarietyPublic.name from NIMS catalog. */
  catalogMatch: string;
  name: string;
  tier: VarietyTier;
  /** Total ms seed → harvest */
  growthTimeMs: number;
  shuMin: number;
  shuMax: number;
  /** 0–1; higher = faster care decay */
  careSensitivity: number;
  unlockCost: number;
  origin?: string;
  breeder?: string;
  hotFruit: boolean;
  /** Maps to fruiting_{podColor} atlas frame when stage === fruiting. */
  podColor: PodColor;
}

export const GAME_VARIETIES: GameVarietyDef[] = [
  {
    id: "jalapeno",
    catalogMatch: "Jalapeño",
    name: "Jalapeño",
    tier: "starter",
    growthTimeMs: 120_000,
    shuMin: 2_500,
    shuMax: 8_000,
    careSensitivity: 0.35,
    unlockCost: 0,
    origin: "Mexico",
    hotFruit: false,
    podColor: "green",
  },
  {
    id: "serrano",
    catalogMatch: "Serrano",
    name: "Serrano",
    tier: "starter",
    growthTimeMs: 150_000,
    shuMin: 10_000,
    shuMax: 23_000,
    careSensitivity: 0.38,
    unlockCost: 0,
    origin: "Mexico",
    hotFruit: false,
    podColor: "green",
  },
  {
    id: "cayenne",
    catalogMatch: "Cayenne",
    name: "Cayenne",
    tier: "starter",
    growthTimeMs: 210_000,
    shuMin: 30_000,
    shuMax: 50_000,
    careSensitivity: 0.4,
    unlockCost: 500,
    origin: "French Guiana",
    hotFruit: true,
    podColor: "red",
  },
  {
    id: "habanero",
    catalogMatch: "Habanero",
    name: "Habanero",
    tier: "starter",
    growthTimeMs: 240_000,
    shuMin: 100_000,
    shuMax: 350_000,
    careSensitivity: 0.45,
    unlockCost: 800,
    origin: "Amazon Basin",
    hotFruit: true,
    podColor: "orange",
  },
  {
    id: "scotch_bonnet",
    catalogMatch: "Scotch Bonnet",
    name: "Scotch Bonnet",
    tier: "starter",
    growthTimeMs: 270_000,
    shuMin: 100_000,
    shuMax: 350_000,
    careSensitivity: 0.48,
    unlockCost: 1_200,
    origin: "Caribbean",
    breeder: "Landrace",
    hotFruit: true,
    podColor: "yellow",
  },
  {
    id: "ghost_pepper",
    catalogMatch: "Ghost",
    name: "Ghost Pepper",
    tier: "rare",
    growthTimeMs: 480_000,
    shuMin: 800_000,
    shuMax: 1_100_000,
    careSensitivity: 0.55,
    unlockCost: 4_000,
    origin: "India",
    hotFruit: true,
    podColor: "red",
  },
  {
    id: "seven_pot_primo",
    catalogMatch: "7 Pot Primo",
    name: "7 Pot Primo",
    tier: "rare",
    growthTimeMs: 540_000,
    shuMin: 800_000,
    shuMax: 1_200_000,
    careSensitivity: 0.58,
    unlockCost: 6_000,
    origin: "Trinidad",
    breeder: "Troy Primeaux",
    hotFruit: true,
    podColor: "superhot",
  },
  {
    id: "trinidad_scorpion",
    catalogMatch: "Trinidad Scorpion",
    name: "Trinidad Scorpion",
    tier: "rare",
    growthTimeMs: 600_000,
    shuMin: 1_200_000,
    shuMax: 1_500_000,
    careSensitivity: 0.6,
    unlockCost: 8_000,
    origin: "Trinidad",
    hotFruit: true,
    podColor: "red",
  },
  {
    id: "chocolate_habanero",
    catalogMatch: "Chocolate Habanero",
    name: "Chocolate Habanero",
    tier: "rare",
    growthTimeMs: 420_000,
    shuMin: 300_000,
    shuMax: 450_000,
    careSensitivity: 0.52,
    unlockCost: 5_000,
    origin: "Jamaica",
    hotFruit: true,
    podColor: "orange",
  },
  {
    id: "carolina_reaper",
    catalogMatch: "Carolina Reaper",
    name: "Carolina Reaper",
    tier: "rare",
    growthTimeMs: 660_000,
    shuMin: 1_500_000,
    shuMax: 2_200_000,
    careSensitivity: 0.62,
    unlockCost: 12_000,
    origin: "South Carolina, USA",
    breeder: "Ed Currie",
    hotFruit: true,
    podColor: "red",
  },
  {
    id: "pepper_x",
    catalogMatch: "Pepper X",
    name: "Pepper X",
    tier: "legendary",
    growthTimeMs: 1_200_000,
    shuMin: 2_500_000,
    shuMax: 3_000_000,
    careSensitivity: 0.7,
    unlockCost: 25_000,
    origin: "South Carolina, USA",
    breeder: "Ed Currie",
    hotFruit: true,
    podColor: "superhot",
  },
  {
    id: "apollo",
    catalogMatch: "Apollo",
    name: "Apollo Pepper",
    tier: "legendary",
    growthTimeMs: 1_200_000,
    shuMin: 2_000_000,
    shuMax: 2_800_000,
    careSensitivity: 0.68,
    unlockCost: 30_000,
    origin: "United Kingdom",
    breeder: "Mike Smith",
    hotFruit: true,
    podColor: "superhot",
  },
];

export const VARIETY_BY_ID = Object.fromEntries(
  GAME_VARIETIES.map((v) => [v.id, v]),
) as Record<string, GameVarietyDef>;

export const STARTER_UNLOCKED = ["jalapeno", "serrano"];
