/**
 * CareStreakHeatmap — GitHub-contributions-style "Care Streak" calendar.
 * Each day is a cell colored by care intensity:
 *   soil gray (nothing) → green (weather captured) → amber (watered)
 *   → ember red (watered + fed). Tap a cell for that day's detail.
 */
import { cn } from "@/lib/utils";
import { memo, useMemo, useState } from "react";
import type { PlantLifecycle } from "../../declarations/backend.did";
import {
  type WeatherHistoryPoint,
  buildWeatherHistory,
} from "../../lib/weather-history";

const WEEKS_SHOWN = 20; // ~5 months of cells, mobile-friendly

type DayCell = {
  date: string;
  intensity: 0 | 1 | 2 | 3;
  point?: WeatherHistoryPoint;
};

function intensityFor(p: WeatherHistoryPoint | undefined): 0 | 1 | 2 | 3 {
  if (!p) return 0;
  if (p.watered && p.fed) return 3;
  if (p.watered) return 2;
  return 1; // weather captured only
}

const CELL_CLASS: Record<0 | 1 | 2 | 3, string> = {
  0: "bg-stone-800/60",
  1: "bg-emerald-700/70",
  2: "bg-amber-500/80",
  3: "bg-red-600 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
};

const INTENSITY_LABEL: Record<0 | 1 | 2 | 3, string> = {
  0: "No activity",
  1: "Weather captured",
  2: "Watered",
  3: "Watered + fed",
};

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Consecutive days of care (watered or fed) ending today or yesterday. */
export function computeCareStreak(points: WeatherHistoryPoint[]): number {
  const cared = new Set(
    points.filter((p) => p.watered || p.fed).map((p) => p.date),
  );
  if (cared.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // A streak is "alive" if today OR yesterday had care.
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

const HeatCell = memo(function HeatCell({
  cell,
  selected,
  onSelect,
}: {
  cell: DayCell;
  selected: boolean;
  onSelect: (cell: DayCell) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(cell)}
      title={`${cell.date}: ${INTENSITY_LABEL[cell.intensity]}`}
      aria-label={`${cell.date}: ${INTENSITY_LABEL[cell.intensity]}`}
      className={cn(
        "size-3 rounded-[3px] transition sm:size-3.5",
        CELL_CLASS[cell.intensity],
        selected && "ring-2 ring-white/80",
      )}
    />
  );
});

export function CareStreakHeatmap({
  lifecycle,
}: {
  lifecycle: PlantLifecycle;
}) {
  const [selected, setSelected] = useState<DayCell | null>(null);

  const points = useMemo(
    () => buildWeatherHistory(lifecycle, "all"),
    [lifecycle],
  );

  const { weeks, streak } = useMemo(() => {
    const byDate = new Map(points.map((p) => [p.date, p]));
    const today = new Date();
    // Grid ends on today's column; columns are weeks, rows are weekdays.
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay())); // pad to Saturday
    const start = new Date(end);
    start.setDate(start.getDate() - WEEKS_SHOWN * 7 + 1);

    const cols: DayCell[][] = [];
    const cursor = new Date(start);
    for (let w = 0; w < WEEKS_SHOWN; w++) {
      const col: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const key = toKey(cursor);
        const isFuture = cursor > today;
        const point = byDate.get(key);
        col.push({
          date: key,
          intensity: isFuture ? 0 : intensityFor(point),
          point,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
    }
    return { weeks: cols, streak: computeCareStreak(points) };
  }, [points]);

  if (points.length === 0) return null;

  return (
    <div
      data-ocid="nims-care-streak"
      className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 backdrop-blur-sm"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          🔥 Care Streak
        </h3>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-bold",
            streak > 0
              ? "border-red-500/50 bg-red-500/10 text-red-300"
              : "border-border text-muted-foreground",
          )}
        >
          {streak > 0 ? `${streak}-day streak` : "Start your streak today"}
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          {weeks.map((col, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <HeatCell
                  key={cell.date}
                  cell={cell}
                  selected={selected?.date === cell.date}
                  onSelect={(c) =>
                    setSelected((prev) => (prev?.date === c.date ? null : c))
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {( [0, 1, 2, 3] as const ).map((i) => (
          <span key={i} className={cn("size-2.5 rounded-[2px]", CELL_CLASS[i])} />
        ))}
        <span>More</span>
      </div>

      {selected && (
        <div className="mt-3 rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-xs">
          <p className="font-semibold text-amber-200">
            {new Date(`${selected.date}T12:00:00`).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          {selected.point ? (
            <div className="mt-1 space-y-0.5 text-zinc-300">
              <p>
                {selected.point.highF.toFixed(0)}°F /{" "}
                {selected.point.lowF.toFixed(0)}°F · 💧{" "}
                {selected.point.humidity.toFixed(0)}% · 🌧️{" "}
                {selected.point.rainInches.toFixed(2)}&quot;
              </p>
              <p>
                {selected.point.watered && "💧 Watered "}
                {selected.point.fed && "🧪 Fed "}
                {selected.point.pestLogged && "🐛 Pest logged "}
                {!selected.point.watered &&
                  !selected.point.fed &&
                  !selected.point.pestLogged &&
                  "Weather captured — no care logged"}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-zinc-500">Nothing logged this day.</p>
          )}
        </div>
      )}
    </div>
  );
}
