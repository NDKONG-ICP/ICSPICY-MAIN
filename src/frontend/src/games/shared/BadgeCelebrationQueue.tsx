import { useEffect, useState } from "react";
import { ConfettiBurst } from "@/components/checkout/ConfettiBurst";
import { PrizePlaque } from "./PrizePlaque";
import { slicerBadgeLabel, type BadgeEarned } from "../slicer/slicer-badges";

const CELEBRATION_MS = 3200;

/**
 * Queues badge celebrations one at a time (no overlapping plaques).
 */
export function BadgeCelebrationQueue({
  badges,
  onDone,
}: {
  badges: BadgeEarned[];
  onDone?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const current = badges[index];

  useEffect(() => {
    if (badges.length === 0) {
      onDone?.();
      return;
    }
    setIndex(0);
  }, [badges, onDone]);

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => {
      if (index + 1 < badges.length) {
        setIndex((i) => i + 1);
      } else {
        onDone?.();
      }
    }, CELEBRATION_MS);
    return () => window.clearTimeout(t);
  }, [current, index, badges.length, onDone]);

  if (!current) return null;

  return (
    <div className="arcade-badge-celebration">
      <ConfettiBurst />
      <p className="arcade-badge-celebration__title arcade-painted-text">
        Badge Earned!
      </p>
      <PrizePlaque
        score={0}
        displayValue={slicerBadgeLabel(current.badgeType)}
        label="Milestone"
        celebrate
        className="arcade-badge-celebration__plaque"
      />
      {badges.length > 1 && (
        <p className="arcade-badge-celebration__queue text-center text-xs text-amber-200/80">
          {index + 1} of {badges.length}
        </p>
      )}
    </div>
  );
}
