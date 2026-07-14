/** Locked slicer milestone badge type IDs + display helpers. */

export const SLICER_BADGE_TYPES = [
  "slicer-first-blood",
  "slicer-craft-batch",
  "slicer-reserve-batch",
  "slicer-legendary-batch",
  "slicer-frenzy-master",
  "slicer-reaper-hunter",
] as const;

export type SlicerBadgeType = (typeof SLICER_BADGE_TYPES)[number];

export const SLICER_BADGE_LABELS: Record<SlicerBadgeType, string> = {
  "slicer-first-blood": "First Blood",
  "slicer-craft-batch": "Craft Batch",
  "slicer-reserve-batch": "Reserve Batch",
  "slicer-legendary-batch": "Legendary Batch",
  "slicer-frenzy-master": "Frenzy Master",
  "slicer-reaper-hunter": "Reaper Hunter",
};

export function slicerBadgeLabel(badgeType: string): string {
  return (
    SLICER_BADGE_LABELS[badgeType as SlicerBadgeType] ??
    badgeType.replace(/^slicer-/, "").replace(/-/g, " ")
  );
}

/** Score milestones in ascending order (SHU). */
export const SCORE_MILESTONES = [
  { threshold: 10_000, label: "First Blood", badge: "slicer-first-blood" },
  { threshold: 50_000, label: "Craft Batch", badge: "slicer-craft-batch" },
  { threshold: 100_000, label: "Reserve Batch", badge: "slicer-reserve-batch" },
  { threshold: 250_000, label: "Legendary Batch", badge: "slicer-legendary-batch" },
] as const;

export function formatShuCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k >= 100 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(n);
}

/** Progress text toward the next score milestone, e.g. "38.5K / 50K to Craft Batch". */
export function nextScoreMilestoneProgress(score: number): string | null {
  for (const m of SCORE_MILESTONES) {
    if (score < m.threshold) {
      return `${formatShuCompact(score)} / ${formatShuCompact(m.threshold)} to ${m.label}`;
    }
  }
  return null;
}

export interface BadgeEarned {
  badgeType: string;
  tokenId: bigint;
  isNew: boolean;
}

export function newBadgesFromEarned(earned: BadgeEarned[]): BadgeEarned[] {
  return earned.filter((b) => b.isNew);
}
