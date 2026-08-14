/** Interactive 7-day grower outlook — selectable days + SpicyAi CTA. */
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";

import { openSpicyAi } from "../SpicyAiWidget";
import {
  WeatherSkyIcon,
  skyStateFromWeather,
} from "./WeatherSkyStage";
import { SKY_STATE_LABEL } from "../../lib/weather-heroes";
import { cn } from "@/lib/utils";

export type OutlookDay = {
  date: string;
  highF: number;
  lowF: number;
  precipInches: number;
  uvIndexMax: number;
  windMphMax: number;
  weatherCode: number;
};

function dayLabel(iso: string): string {
  const parts = iso.split("-").map(Number);
  const d = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function fullDayLabel(iso: string): string {
  const parts = iso.split("-").map(Number);
  const d = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function growerHint(precip: number, high: number, uv: number, code: number): string {
  if (precip >= 1) return "Mulch + drain — skip foliar";
  if (precip >= 0.4) return "Light rain — hold sprays";
  if (high >= 98) return "Heat — water AM, shade PM";
  if (uv >= 8) return "High UV — protect seedlings";
  if (code >= 95) return "Storm risk — stake & mulch";
  return "Fair grower day";
}

export function WeatherOutlookInteractive({
  days,
  lat,
  lng,
}: {
  days: OutlookDay[];
  lat: number;
  lng: number;
}) {
  const reduce = useReducedMotion();
  const listId = useId();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected(0);
  }, [days[0]?.date]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelected((i) => Math.min(days.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelected((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [days.length]);

  if (days.length === 0) return null;

  const day = days[selected] ?? days[0]!;
  const maxRain = Math.max(...days.map((x) => x.precipInches), 0.01);
  const sky = skyStateFromWeather(day.weatherCode, day.highF);
  const hint = growerHint(
    day.precipInches,
    day.highF,
    day.uvIndexMax,
    day.weatherCode,
  );

  return (
    <div data-ocid="weather-outlook-interactive">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-[var(--wd-citrus)]">
            IC SPICY · Bed prep
          </p>
          <h2 className="font-display text-2xl font-bold mt-1">
            Seven-day grower outlook
          </h2>
          <p className="text-sm text-[var(--wd-muted)] mt-1 max-w-lg">
            Tap a day. On-chain forecast — not a news ticker. Use ← → keys too.
          </p>
        </div>
      </div>

      <div
        role="listbox"
        aria-label="Seven-day outlook"
        aria-activedescendant={`${listId}-${selected}`}
        className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((d, i) => {
          const barH = Math.max(6, (d.precipInches / maxRain) * 48);
          const active = i === selected;
          return (
            <button
              key={d.date}
              id={`${listId}-${i}`}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => setSelected(i)}
              className={cn(
                "snap-start shrink-0 w-[4.75rem] sm:w-[5.25rem] rounded-sm border px-2 py-3 text-center transition-colors",
                active
                  ? "border-[var(--wd-citrus)] bg-[var(--wd-citrus)]/10 ring-1 ring-[var(--wd-citrus)]/50"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-[var(--wd-muted)]">
                {dayLabel(d.date)}
              </p>
              <WeatherSkyIcon
                weatherCode={d.weatherCode}
                tempF={d.highF}
                className="mx-auto mt-1.5 size-10"
              />
              <p className="font-display text-sm font-semibold tabular-nums mt-1.5">
                {Math.round(d.highF)}°
              </p>
              <div className="mx-auto mt-2 flex h-12 items-end justify-center">
                <motion.div
                  className="w-2.5 rounded-t bg-gradient-to-t from-[var(--wd-rain)] to-cyan-300/80"
                  initial={reduce ? false : { height: 0 }}
                  animate={{ height: barH }}
                  transition={{ duration: 0.55 }}
                />
              </div>
              <p className="mt-1 text-[10px] tabular-nums text-cyan-300/90">
                {d.precipInches.toFixed(2)}″
              </p>
            </button>
          );
        })}
      </div>

      <motion.div
        key={day.date}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-6 relative overflow-hidden rounded-sm border border-white/12 bg-gradient-to-br from-[#1a1814] via-[#141210] to-[#0c1a22] p-5 sm:p-6"
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full opacity-30 blur-2xl"
          style={{
            background:
              day.precipInches >= 0.5
                ? "var(--wd-rain)"
                : day.highF >= 95
                  ? "var(--wd-heat)"
                  : "var(--wd-citrus)",
          }}
        />
        <div className="relative flex flex-wrap items-start gap-5">
          <WeatherSkyIcon
            weatherCode={day.weatherCode}
            tempF={day.highF}
            className="size-16 shrink-0 sm:size-20"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold sm:text-2xl">
              {fullDayLabel(day.date)}
            </p>
            <p className="text-sm text-[var(--wd-muted)] mt-0.5">
              {SKY_STATE_LABEL[sky]} · Charlotte County grower desk
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <Stat label="High / Low" value={`${Math.round(day.highF)}° / ${Math.round(day.lowF)}°`} />
              <Stat label="Rain" value={`${day.precipInches.toFixed(2)}″`} accent />
              <Stat label="UV max" value={String(Math.round(day.uvIndexMax))} />
              <Stat label="Wind max" value={`${Math.round(day.windMphMax)} mph`} />
            </div>
            <p className="mt-4 font-display text-base text-[var(--wd-citrus)]">
              {hint}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  openSpicyAi(
                    `For ${fullDayLabel(day.date)} in Port Charlotte / Charlotte County: high ${Math.round(day.highF)}°, low ${Math.round(day.lowF)}°, rain ${day.precipInches.toFixed(2)} inches, UV ${Math.round(day.uvIndexMax)}, wind max ${Math.round(day.windMphMax)} mph. Grower hint: ${hint}. What should I do for my pepper beds that day?`,
                    { weather: { lat, lng } },
                  )
                }
                className="rounded-sm bg-[var(--wd-citrus)] px-4 py-2.5 font-display text-sm font-semibold text-[#1a1510] hover:brightness-110"
              >
                Ask SpicyAi about this day
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelected((i) => Math.min(days.length - 1, i + 1))
                }
                disabled={selected >= days.length - 1}
                className="rounded-sm border border-white/20 px-4 py-2.5 text-sm text-white/85 hover:bg-white/5 disabled:opacity-40"
              >
                Next day →
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--wd-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "font-display text-lg font-semibold tabular-nums mt-0.5",
          accent && "text-cyan-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}
