/**
 * Soft-bridge pantry types — Grow → Slice → Craft.
 *
 * Soft bridge: pantry items are premium boosters, NOT requirements.
 * Empty pantry = full standalone play (guest or signed-in).
 *
 * ANTI-CHEAT: client-attested inventory; server caps + sanitize only.
 * Do NOT attach real-world value to pantry items yet.
 */

export type PodColor =
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "superhot"
  | "companion";

export interface RawIngredient {
  id: string;
  variety: string;
  varietyName: string;
  podColor: PodColor;
  shu: number;
  careQuality: number;
  harvestedAt: number;
}

export interface SlicedIngredient extends RawIngredient {
  sliceQuality: number;
  slicedAt: number;
}

export interface IngredientInventory {
  version: 1;
  raw: RawIngredient[];
  sliced: SlicedIngredient[];
}

export const INVENTORY_STORAGE_KEY = "icspicy-ingredient-inventory";
export const INVENTORY_AUTOSAVE_MS = 10_000;
export const MAX_RAW = 60;
export const MAX_SLICED = 60;

export function emptyInventory(): IngredientInventory {
  return { version: 1, raw: [], sliced: [] };
}

export function parseInventory(json: string): IngredientInventory | null {
  try {
    const raw = JSON.parse(json) as IngredientInventory;
    if (raw.version !== 1 || !Array.isArray(raw.raw) || !Array.isArray(raw.sliced)) {
      return null;
    }
    return {
      version: 1,
      raw: raw.raw.slice(0, MAX_RAW),
      sliced: raw.sliced.slice(0, MAX_SLICED),
    };
  } catch {
    return null;
  }
}

export function clampInventory(inv: IngredientInventory): IngredientInventory {
  return {
    version: 1,
    raw: inv.raw.slice(-MAX_RAW),
    sliced: inv.sliced.slice(-MAX_SLICED),
  };
}

/**
 * Prep Mode sliceQuality:
 *   accuracy = clamp(0, 1, 1 − missRadiusNorm)  // 0 = center hit, 1 = edge
 *   comboFactor = clamp(0.5, 1.25, 0.75 + combo × 0.05)
 *   sliceQuality = clamp(0.4, 1.0, 0.55 × accuracy + 0.45 × comboFactor)
 */
export function computeSliceQuality(
  combo: number,
  missRadiusNorm = 0,
): number {
  const accuracy = Math.max(0, Math.min(1, 1 - missRadiusNorm));
  const comboFactor = Math.max(0.5, Math.min(1.25, 0.75 + combo * 0.05));
  return Math.max(0.4, Math.min(1, 0.55 * accuracy + 0.45 * comboFactor));
}

/**
 * Homegrown quality multiplier — ALWAYS ≥ 1.0 (never worse than generic).
 * Perfect care + perfect slice → 1.5×.
 *   qualityMult = 1.0 + (careQuality/100) × sliceQuality × 0.5
 *   range: 1.0 – 1.5
 */
export function homegrownQualityMult(
  careQuality: number,
  sliceQuality: number,
): number {
  const cq = Math.max(0, Math.min(100, careQuality)) / 100;
  const sq = Math.max(0, Math.min(1, sliceQuality));
  return Math.min(1.5, 1.0 + cq * sq * 0.5);
}

/** TRUE SMALL BATCH: ≥80% pantry units → +25% score. */
export const TRUE_SMALL_BATCH_THRESHOLD = 0.8;
export const TRUE_SMALL_BATCH_BONUS = 1.25;

export function isTrueSmallBatch(
  pantryUnits: number,
  totalUnits: number,
): boolean {
  if (totalUnits <= 0) return false;
  return pantryUnits / totalUnits >= TRUE_SMALL_BATCH_THRESHOLD;
}

/** Map pantry podColor / companion variety → Slicer IngredientKind. */
export function pantryToSlicerKind(
  variety: string,
  podColor: PodColor,
):
  | "chili"
  | "rare_chili"
  | "onion"
  | "garlic"
  | "mango"
  | "tomato"
  | "lime" {
  const v = variety.toLowerCase();
  if (v === "onion" || podColor === "companion" && v.includes("onion"))
    return "onion";
  if (v === "garlic" || v.includes("garlic")) return "garlic";
  if (v === "mango" || v.includes("mango")) return "mango";
  if (v === "tomato" || v.includes("tomato")) return "tomato";
  if (v === "lime" || v.includes("lime")) return "lime";
  if (podColor === "superhot") return "rare_chili";
  return "chili";
}

/** Map pantry variety → Crafter IngredientId (closest tray match). */
export function pantryToCrafterId(
  variety: string,
  podColor: PodColor,
):
  | "lime"
  | "tomato"
  | "onion"
  | "garlic"
  | "mango"
  | "chili"
  | "scotch_bonnet"
  | "seven_pot_primo"
  | "carolina_reaper" {
  const v = variety.toLowerCase();
  if (v === "onion" || v.includes("onion")) return "onion";
  if (v === "garlic" || v.includes("garlic")) return "garlic";
  if (v === "mango" || v.includes("mango")) return "mango";
  if (v === "tomato" || v.includes("tomato")) return "tomato";
  if (v === "lime" || v.includes("lime")) return "lime";
  if (v.includes("scotch") || v.includes("bonnet")) return "scotch_bonnet";
  if (v.includes("7 pot") || v.includes("primo") || v.includes("seven_pot"))
    return "seven_pot_primo";
  if (v.includes("reaper") || v.includes("pepper_x") || v.includes("apollo"))
    return "carolina_reaper";
  if (podColor === "superhot") return "carolina_reaper";
  if (podColor === "yellow" || podColor === "orange") return "scotch_bonnet";
  return "chili";
}

function newId(): string {
  return `ing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeRawPods(args: {
  variety: string;
  varietyName: string;
  podColor: PodColor;
  shu: number;
  careQuality: number;
  count: number;
}): RawIngredient[] {
  const n = Math.max(1, Math.min(3, Math.floor(args.count)));
  const now = Date.now();
  return Array.from({ length: n }, () => ({
    id: newId(),
    variety: args.variety,
    varietyName: args.varietyName,
    podColor: args.podColor,
    shu: Math.max(0, Math.round(args.shu)),
    careQuality: Math.max(0, Math.min(100, args.careQuality)),
    harvestedAt: now,
  }));
}
