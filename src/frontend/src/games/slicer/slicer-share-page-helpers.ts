import type { BadgePublic } from "@/declarations/backend.did";
import {
  SLICER_BADGE_TYPES,
  type SlicerBadgeType,
} from "./slicer-badges";
import type { SlicerTierSlug } from "./slicer-share-copy";

const TIER_SLUG_LABELS: Record<SlicerTierSlug, string> = {
  mild: "Mild Batch",
  craft: "Craft Batch",
  reserve: "Reserve Batch",
  legendary: "Legendary Small Batch",
};

export interface SlicerDisplayData {
  bestCombo?: number;
  tier?: string;
}

export function parseSlicerDisplayData(raw: string): SlicerDisplayData {
  if (!raw.trim()) return {};
  try {
    const j = JSON.parse(raw) as SlicerDisplayData;
    return j ?? {};
  } catch {
    return {};
  }
}

export function heatTierLabel(
  tierSlug: SlicerTierSlug,
  displayData: SlicerDisplayData,
): string {
  if (displayData.tier?.trim()) return displayData.tier.trim();
  return TIER_SLUG_LABELS[tierSlug] ?? tierSlug;
}

export interface SlicerVerificationProof {
  seed: number;
  sliceLogHash: string;
  score: number;
}

export function bestSlicerVerification(
  badges: BadgePublic[],
): SlicerVerificationProof | null {
  let best: SlicerVerificationProof | null = null;
  for (const badge of badges) {
    if (
      !SLICER_BADGE_TYPES.includes(badge.badgeType as SlicerBadgeType)
    ) {
      continue;
    }
    try {
      const meta = JSON.parse(badge.metadataJson) as {
        game?: string;
        score?: number;
        seed?: number;
        sliceLogHash?: string;
      };
      if (meta.game !== "slicer") continue;
      if (meta.seed == null || !meta.sliceLogHash?.trim()) continue;
      const score = meta.score ?? 0;
      if (!best || score > best.score) {
        best = {
          seed: meta.seed,
          sliceLogHash: meta.sliceLogHash.trim(),
          score,
        };
      }
    } catch {
      /* skip malformed metadata */
    }
  }
  return best;
}

export function countSlicerBadges(badges: BadgePublic[]): number {
  return badges.filter((b) =>
    SLICER_BADGE_TYPES.includes(b.badgeType as SlicerBadgeType),
  ).length;
}

export const SLICER_DETERMINISM_DOCS_URL =
  "https://pr3bu-6aaaa-aaaao-ba5ba-cai.icp0.io/library/slicer-determinism";
