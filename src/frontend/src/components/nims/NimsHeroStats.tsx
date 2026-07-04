/**
 * NimsHeroStats — three glassmorphism stat cards at the top of the NIMS
 * dashboard: plants growing, waterings this week, and the cross-garden
 * care streak. Numbers count up on mount (skipped for reduced motion).
 */
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { memo, useEffect, useMemo } from "react";
import type { PlantLifecycle } from "../../declarations/backend.did";
import { findDeathRecord } from "../../lib/plant-lifecycle-utils";

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Consecutive care days (any plant watered/fed) ending today or yesterday. */
function gardenCareStreak(plants: PlantLifecycle[]): number {
  const cared = new Set<string>();
  for (const lc of plants) {
    for (const w of lc.wateringLog) {
      cared.add(toKey(new Date(Number(w.timestamp / 1_000_000n))));
    }
    for (const f of lc.feedingLog) {
      cared.add(toKey(new Date(Number(f.date / 1_000_000n))));
    }
  }
  if (cared.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  if (!cared.has(toKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!cared.has(toKey(cursor))) return 0;
  }
  while (cared.has(toKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const CountUp = memo(function CountUp({
  value,
  reducedMotion,
}: {
  value: number;
  reducedMotion: boolean;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (reducedMotion) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return () => controls.stop();
  }, [value, reducedMotion, mv]);

  return <motion.span>{rounded}</motion.span>;
});

const CARD_STYLES = [
  "from-emerald-950/60 to-zinc-950/60 border-emerald-500/20",
  "from-sky-950/60 to-zinc-950/60 border-sky-500/20",
  "from-red-950/60 to-zinc-950/60 border-red-500/25",
];

export function NimsHeroStats({ plants }: { plants: PlantLifecycle[] }) {
  const reducedMotion = useReducedMotion() ?? false;

  const stats = useMemo(() => {
    const growing = plants.filter(
      (lc) => !findDeathRecord(lc.notes) && lc.soldAt.length === 0,
    ).length;

    const weekAgo = Date.now() - 7 * 86_400_000;
    let wateringsThisWeek = 0;
    for (const lc of plants) {
      for (const w of lc.wateringLog) {
        if (Number(w.timestamp / 1_000_000n) >= weekAgo) wateringsThisWeek++;
      }
    }
    return {
      growing,
      wateringsThisWeek,
      streak: gardenCareStreak(plants),
    };
  }, [plants]);

  if (plants.length === 0) return null;

  const cards = [
    { emoji: "🌱", value: stats.growing, label: "plants growing" },
    { emoji: "💧", value: stats.wateringsThisWeek, label: "waterings this week" },
    { emoji: "🔥", value: stats.streak, label: "day care streak" },
  ];

  return (
    <div data-ocid="nims-hero-stats" className="grid grid-cols-3 gap-2">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className={`rounded-xl border bg-gradient-to-br p-3 backdrop-blur-md ${CARD_STYLES[i]}`}
        >
          <p className="text-lg font-bold text-foreground sm:text-2xl">
            <span aria-hidden className="mr-1">
              {card.emoji}
            </span>
            <CountUp value={card.value} reducedMotion={reducedMotion} />
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:text-xs">
            {card.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
