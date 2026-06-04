import type { VarietyPublic } from "../declarations/backend.did";
import type { GardenDesign, PlantPlacement } from "./garden-types";

export type ValidationSeverity = "Info" | "Warning" | "Error";

export type ValidationWarning = {
  code: string;
  message: string;
  severity: ValidationSeverity;
  plantId: number | null;
  relatedPlantId: number | null;
};

export type YieldEstimate = {
  totalPlantCount: number;
  estimatedLbsMin: number;
  estimatedLbsMax: number;
  companionBonusPct: number;
  spacingPenaltyPct: number;
  notes: string;
};

const CM_PER_M = 100;

function minSpacingMeters(scovilleMax: number): number {
  if (scovilleMax >= 500_000) return 0.55;
  if (scovilleMax >= 100_000) return 0.45;
  if (scovilleMax >= 10_000) return 0.38;
  return 0.32;
}

function scovilleForPlant(
  plant: PlantPlacement,
  varieties: VarietyPublic[],
): number {
  if (plant.varietyId == null) return 100_000;
  const v = varieties.find((x) => Number(x.id) === plant.varietyId);
  return v ? Number(v.scovilleMax) : 100_000;
}

function speciesText(
  plant: PlantPlacement,
  varieties: VarietyPublic[],
): string {
  if (plant.varietyId == null) return plant.label;
  const v = varieties.find((x) => Number(x.id) === plant.varietyId);
  return v ? `${v.species} ${v.name}` : plant.label;
}

function lowerContains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function isPepper(text: string) {
  return lowerContains(text, "capsicum") || lowerContains(text, "pepper");
}
function isBasil(text: string) {
  return lowerContains(text, "basil") || lowerContains(text, "ocimum");
}
function isFennel(text: string) {
  return lowerContains(text, "fennel") || lowerContains(text, "foeniculum");
}
function isMarigold(text: string) {
  return lowerContains(text, "marigold") || lowerContains(text, "tagetes");
}

function distance(a: PlantPlacement, b: PlantPlacement): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function requiredSpacing(
  a: PlantPlacement,
  b: PlantPlacement,
  varieties: VarietyPublic[],
): number {
  return Math.max(
    minSpacingMeters(scovilleForPlant(a, varieties)),
    minSpacingMeters(scovilleForPlant(b, varieties)),
  );
}

function lbsPerPlant(scovilleMax: number): [number, number] {
  if (scovilleMax >= 500_000) return [0.15, 0.35];
  if (scovilleMax >= 100_000) return [0.25, 0.55];
  if (scovilleMax >= 10_000) return [0.35, 0.75];
  return [0.45, 1.0];
}

export function validateGardenLocally(
  design: GardenDesign,
  varieties: VarietyPublic[],
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { plants } = design;

  for (const p of plants) {
    if (
      p.x < 0 ||
      p.y < 0 ||
      p.x > design.widthMeters ||
      p.y > design.depthMeters
    ) {
      warnings.push({
        code: "out_of_bounds",
        message: `Plant "${p.label}" is outside the plot boundary`,
        severity: "Error",
        plantId: p.id,
        relatedPlantId: null,
      });
    }
  }

  for (let i = 0; i < plants.length; i++) {
    for (let j = i + 1; j < plants.length; j++) {
      const a = plants[i];
      const b = plants[j];
      const dist = distance(a, b);
      const req = requiredSpacing(a, b, varieties);
      if (dist < req) {
        warnings.push({
          code: "spacing",
          message: `Plants too close (${Math.round(dist * CM_PER_M)} cm) — need ≥ ${Math.round(req * CM_PER_M)} cm between "${a.label}" and "${b.label}"`,
          severity: "Warning",
          plantId: a.id,
          relatedPlantId: b.id,
        });
      }

      const sa = speciesText(a, varieties);
      const sb = speciesText(b, varieties);
      if ((isPepper(sa) && isFennel(sb)) || (isPepper(sb) && isFennel(sa))) {
        if (dist < 1.2) {
          warnings.push({
            code: "companion_bad",
            message: `Fennel inhibits peppers — keep away from "${isPepper(sa) ? a.label : b.label}"`,
            severity: "Error",
            plantId: a.id,
            relatedPlantId: b.id,
          });
        }
      }
      if ((isPepper(sa) && isBasil(sb)) || (isPepper(sb) && isBasil(sa))) {
        if (dist <= 0.9) {
          warnings.push({
            code: "companion_good",
            message: "Great companions! Basil near peppers can deter pests.",
            severity: "Info",
            plantId: a.id,
            relatedPlantId: b.id,
          });
        }
      }
      if (
        (isPepper(sa) && isMarigold(sb)) ||
        (isPepper(sb) && isMarigold(sa))
      ) {
        if (dist <= 1.0) {
          warnings.push({
            code: "companion_good",
            message: "Marigolds near peppers help repel pests.",
            severity: "Info",
            plantId: a.id,
            relatedPlantId: b.id,
          });
        }
      }
    }
  }

  return warnings;
}

export function calculateYieldLocally(
  design: GardenDesign,
  varieties: VarietyPublic[],
): YieldEstimate {
  const { plants } = design;
  if (plants.length === 0) {
    return {
      totalPlantCount: 0,
      estimatedLbsMin: 0,
      estimatedLbsMax: 0,
      companionBonusPct: 0,
      spacingPenaltyPct: 0,
      notes: "Add plants to estimate yield.",
    };
  }

  let minLbs = 0;
  let maxLbs = 0;
  let spacingViolations = 0;
  let companionPairs = 0;
  let pairChecks = 0;

  for (const p of plants) {
    const scov = scovilleForPlant(p, varieties);
    const [lo, hi] = lbsPerPlant(scov);
    minLbs += lo * p.scale;
    maxLbs += hi * p.scale;
  }

  for (let i = 0; i < plants.length; i++) {
    for (let j = i + 1; j < plants.length; j++) {
      pairChecks++;
      const a = plants[i];
      const b = plants[j];
      const dist = distance(a, b);
      if (dist < requiredSpacing(a, b, varieties)) spacingViolations++;
      const sa = speciesText(a, varieties);
      const sb = speciesText(b, varieties);
      if (
        ((isPepper(sa) && isBasil(sb)) ||
          (isPepper(sb) && isBasil(sa)) ||
          (isPepper(sa) && isMarigold(sb)) ||
          (isPepper(sb) && isMarigold(sa))) &&
        dist <= 1.0
      ) {
        companionPairs++;
      }
    }
  }

  const spacingPenaltyPct =
    pairChecks === 0 ? 0 : (spacingViolations / pairChecks) * 100;
  const companionBonusPct =
    plants.length <= 1 ? 0 : Math.min(15, companionPairs * 3);

  const penaltyFactor = 1 - spacingPenaltyPct / 200;
  const bonusFactor = 1 + companionBonusPct / 100;

  return {
    totalPlantCount: plants.length,
    estimatedLbsMin: minLbs * penaltyFactor * bonusFactor,
    estimatedLbsMax: maxLbs * penaltyFactor * bonusFactor,
    companionBonusPct,
    spacingPenaltyPct,
    notes:
      spacingViolations > 0
        ? "Tight spacing may reduce yield — consider thinning."
        : companionPairs > 0
          ? "Companion planting bonus applied."
          : "Estimate assumes mature plants with good care.",
  };
}

export const DEFAULT_NURSERY_COORDS = { lat: 28.5383, lng: -81.3792 };

export const GROWTH_STAGES = [
  { value: 0, label: "Seedling", emoji: "🌱" },
  { value: 0.25, label: "Young", emoji: "🌿" },
  { value: 0.5, label: "Vegetative", emoji: "🫑" },
  { value: 0.75, label: "Flowering", emoji: "🌸" },
  { value: 1, label: "Fruiting", emoji: "🌶️" },
] as const;
