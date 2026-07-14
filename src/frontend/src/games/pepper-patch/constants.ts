/** Pepper Patch — companions, upgrades, progression costs. */

import type { IngredientKind } from "../slicer/constants";

export type CompanionId = "onion" | "garlic" | "mango" | "tomato" | "lime";

export interface CompanionDef {
  id: CompanionId;
  label: string;
  emoji: string;
  /** Slicer atlas ingredient kind for whole sprite. */
  spriteKind: IngredientKind;
  buffLabel: string;
  tooltip: string;
  harvestBonus: number;
  careDecayMult: number;
}

export const COMPANIONS: CompanionDef[] = [
  {
    id: "onion",
    label: "Onion",
    emoji: "🧅",
    spriteKind: "onion",
    buffLabel: "−15% care decay",
    tooltip:
      "Companion planting: onions deter aphids and thrips near peppers — reduces care decay in-game.",
    harvestBonus: 0.05,
    careDecayMult: 0.85,
  },
  {
    id: "garlic",
    label: "Garlic",
    emoji: "🧄",
    spriteKind: "garlic",
    buffLabel: "−18% care decay",
    tooltip:
      "Garlic's sulfur compounds repel soft-bodied pests — pest-resistance buff for your plot.",
    harvestBonus: 0.05,
    careDecayMult: 0.82,
  },
  {
    id: "mango",
    label: "Mango",
    emoji: "🥭",
    spriteKind: "mango",
    buffLabel: "+10% SHU",
    tooltip:
      "Tropical polyculture harmony — mango understory shade patterns boost batch quality (+10% SHU).",
    harvestBonus: 0.1,
    careDecayMult: 1,
  },
  {
    id: "tomato",
    label: "Tomato",
    emoji: "🍅",
    spriteKind: "tomato",
    buffLabel: "+8% SHU",
    tooltip:
      "Nightshade guild planting — shared KNF nutrition cycles improve fruit quality (+8% SHU).",
    harvestBonus: 0.08,
    careDecayMult: 1,
  },
  {
    id: "lime",
    label: "Lime",
    emoji: "🍋‍🟩",
    spriteKind: "lime",
    buffLabel: "+6% SHU",
    tooltip:
      "Citrus aromatics confuse pests and balance soil pH in guild beds (+6% SHU).",
    harvestBonus: 0.06,
    careDecayMult: 1,
  },
];

export const COMPANION_BY_ID = Object.fromEntries(
  COMPANIONS.map((c) => [c.id, c]),
) as Record<CompanionId, CompanionDef>;

export type UpgradeId = "autoWaterer" | "growLight" | "compostBin";

export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  emoji: string;
  /** Atlas stem for shop / HUD icon. */
  sprite: string;
  cost: number;
  description: string;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "autoWaterer",
    label: "Auto-Waterer",
    emoji: "💧",
    sprite: "upgrade_sprinkler",
    cost: 3_000,
    description: "Slows water need rise by 35%.",
  },
  {
    id: "growLight",
    label: "Grow Light",
    emoji: "☀️",
    sprite: "upgrade_growlight",
    cost: 5_000,
    description: "Slows light need rise by 40%.",
  },
  {
    id: "compostBin",
    label: "Compost Bin",
    emoji: "🌿",
    sprite: "upgrade_compost",
    cost: 4_000,
    description: "Slows nutrient need rise by 35%; +3% care on feed.",
  },
];

export const PLOT_EXPANSION_COSTS: Record<4 | 8, number> = {
  4: 0,
  8: 5_000,
};

export const PLOT_MAX = 12;
export const PLOT_EXPAND_12_COST = 15_000;

export const GUEST_STORAGE_KEY = "icspicy-pepper-patch-garden";
export const AUTOSAVE_MIN_MS = 10_000;

/*
 * EXTENSIBILITY — future RWA bridge:
 * Harvest batches with careQuality ≥ 95 on legendary varieties will mint
 * grower-provenance tokens (IDs 100_000+) linking game batch JSON to on-chain
 * plant lifecycle. See grower provenance token range in PROJECT_CONTEXT.md.
 *
 * STUB: seasonal events — rotate `seasonEventId` in GardenState JSON.
 * STUB: community garden sharing — `sharedGardenId` field + public query.
 */
