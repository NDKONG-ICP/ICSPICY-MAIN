/** ICSPICY Small Batch Crafter — ingredient catalog and SHU values. */

export type IngredientId =
  | "lime"
  | "tomato"
  | "onion"
  | "garlic"
  | "mango"
  | "chili"
  | "scotch_bonnet"
  | "seven_pot_primo"
  | "carolina_reaper";

export type FlavorRole = "heat" | "sweet" | "acid" | "savory";

export interface IngredientDef {
  id: IngredientId;
  label: string;
  emoji: string;
  /** Approximate real-world SHU (display + scoring). */
  shu: number;
  role: FlavorRole;
  /** Sauce color contribution [r,g,b] weight 0–1 */
  color: [number, number, number];
  /** Real IC SPICY variety badge */
  varietyBadge?: string;
}

export const MAX_BATCH_SIZE = 12;

export const INGREDIENTS: IngredientDef[] = [
  {
    id: "lime",
    label: "Lime",
    emoji: "🍋‍🟩",
    shu: 0,
    role: "acid",
    color: [0.2, 0.85, 0.35],
  },
  {
    id: "tomato",
    label: "Tomato",
    emoji: "🍅",
    shu: 0,
    role: "acid",
    color: [0.9, 0.15, 0.1],
  },
  {
    id: "onion",
    label: "Onion",
    emoji: "🧅",
    shu: 0,
    role: "savory",
    color: [0.75, 0.55, 0.85],
  },
  {
    id: "garlic",
    label: "Garlic",
    emoji: "🧄",
    shu: 0,
    role: "savory",
    color: [0.95, 0.95, 0.88],
  },
  {
    id: "mango",
    label: "Mango",
    emoji: "🥭",
    shu: 0,
    role: "sweet",
    color: [1, 0.72, 0.2],
  },
  {
    id: "chili",
    label: "Chili",
    emoji: "🌶️",
    shu: 500,
    role: "heat",
    color: [0.85, 0.12, 0.08],
  },
  {
    id: "scotch_bonnet",
    label: "Scotch Bonnet",
    emoji: "🌶️",
    shu: 350_000,
    role: "heat",
    color: [0.75, 0.08, 0.12],
    varietyBadge: "Real ICSPICY variety · ~350K SHU",
  },
  {
    id: "seven_pot_primo",
    label: "7 Pot Primo",
    emoji: "🌶️",
    shu: 1_200_000,
    role: "heat",
    color: [0.55, 0.05, 0.18],
    varietyBadge: "Real ICSPICY variety · ~1.2M SHU",
  },
  {
    id: "carolina_reaper",
    label: "Carolina Reaper",
    emoji: "🌶️",
    shu: 2_200_000,
    role: "heat",
    color: [0.45, 0.02, 0.12],
    varietyBadge: "Real ICSPICY variety · ~2.2M SHU",
  },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((i) => [i.id, i]),
) as Record<IngredientId, IngredientDef>;

export const TRAY_INGREDIENTS = INGREDIENTS;

export function formatShuDisplay(shu: number): string {
  if (shu >= 1_000_000) return `${(shu / 1_000_000).toFixed(1)}M`;
  if (shu >= 1_000) return `${(shu / 1_000).toFixed(0)}K`;
  return shu.toLocaleString();
}
