/**
 * Convert Candid variant values ({ Seedling: null }) to display strings.
 * Safe for plain strings and enum values already normalized by the actor wrapper.
 */
export function variantToString(v: unknown): string {
  if (v == null) return "Unknown";
  if (typeof v === "string") return v;
  if (typeof v === "object" && !Array.isArray(v)) {
    const keys = Object.keys(v as Record<string, unknown>);
    if (keys.length > 0) return keys[0]!;
  }
  return String(v);
}

export function isCandidVariant(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.keys(v).length === 1
  );
}

const PLANT_STAGE_LABELS: Record<string, string> = {
  Seed: "Germinated",
  Seedling: "Seedling (1 gal)",
  Mature: "Mature (5 gal)",
};

export function plantStageLabel(stage: unknown): string {
  const key = variantToString(stage);
  return PLANT_STAGE_LABELS[key] ?? key;
}

const PLANT_STAGE_EMOJI: Record<string, string> = {
  Seed: "🌱",
  Seedling: "🌿",
  Mature: "🌶️",
};

export function plantStageEmoji(stage: unknown): string {
  return PLANT_STAGE_EMOJI[variantToString(stage)] ?? "🌱";
}

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  LivePlant: "Live Plant",
  Seedling: "Seedling",
  Gallon1: "1-Gallon",
  Gallon5: "5-Gallon",
  DriedPods: "Dried Pods",
  Spice: "Artisan Spice",
  GardenInputs: "Garden Inputs",
};

export function productCategoryLabel(category: unknown): string {
  const key = variantToString(category);
  return PRODUCT_CATEGORY_LABELS[key] ?? key;
}

export function plantStageAdminLabel(stage: unknown): string {
  const key = variantToString(stage);
  const labels: Record<string, string> = {
    Seed: "🌱 Seed",
    Seedling: "🌿 Seedling",
    Mature: "🌶️ Mature",
  };
  return labels[key] ?? key;
}

export function orderStatusLabel(status: unknown): string {
  const key = variantToString(status);
  const labels: Record<string, string> = {
    Pending: "Pending",
    Paid: "Paid",
    Shipped: "Shipped",
    PickedUp: "Picked Up",
    Cancelled: "Cancelled",
  };
  return labels[key] ?? key;
}

export function offerStatusLabel(status: unknown): string {
  return orderStatusLabel(status);
}

export function pestSeverityLabel(severity: unknown): string {
  return variantToString(severity);
}

export function seedSourceLabel(source: unknown): string {
  const key = variantToString(source);
  if (key === "OwnHarvest") return "Own Harvest";
  if (key === "Vendor") return "Vendor";
  return key;
}

export function difficultyLabel(difficulty: unknown): string {
  return variantToString(difficulty);
}

export function proposalCategoryLabel(category: unknown): string {
  const key = variantToString(category);
  const labels: Record<string, string> = {
    CommunityDecision: "Community",
    Treasury: "Treasury",
    Product: "Product",
    Governance: "Governance",
  };
  return labels[key] ?? key;
}

export function proposalStatusLabel(status: unknown): string {
  return variantToString(status);
}
