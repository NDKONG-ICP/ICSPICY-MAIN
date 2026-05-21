import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useSpring } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { WeatherData } from "../../hooks/useWeather";
import {
  getPlantingRecommendations,
  PLANTING_ZONE_LABEL,
} from "../../lib/planting-almanac";
import {
  uvIndexClass,
  weatherIcon,
  weatherToContext,
} from "../../lib/weather-service";

type WeatherBarProps = {
  data: WeatherData | undefined;
  isLoading: boolean;
  locationLabel?: string;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
};

function AnimatedTemp({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 80, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useMotionValueEvent(spring, "change", (v) => {
    setDisplay(Math.round(v));
  });

  return (
    <span className="text-lg font-semibold tabular-nums text-foreground">
      {display}°F
    </span>
  );
}

function oneLineSummary(d: WeatherData): string {
  const { current, daily, moon } = d;
  const rain = daily.totalRainInches.toFixed(1);
  const uv = Math.round(current.uvIndex);
  const wind = Math.round(current.windSpeedMph);
  const icon = weatherIcon(current.weatherCode);
  return `${icon} ${Math.round(current.tempF)}°F · 💧${Math.round(current.humidity)}% · UV${uv} · 🌬️${wind}mph · 🌧️${rain}" · ${moon.emoji}`;
}

export function WeatherBar({
  data,
  isLoading,
  locationLabel,
  expanded,
  onExpandedChange,
}: WeatherBarProps) {
  const hasRain = (data?.daily.totalRainInches ?? 0) > 0;

  return (
    <section
      data-ocid="nims-weather-bar"
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-sm text-foreground shadow-2xl backdrop-blur-xl",
      )}
    >
      <button
        type="button"
        data-ocid="nims-weather-bar-toggle"
        onClick={() => onExpandedChange(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/5"
      >
        <span className="min-w-0 flex-1 truncate font-medium">
          {isLoading && (
            <span className="text-muted-foreground">Loading weather…</span>
          )}
          {!isLoading && data && (
            <span className="flex items-center gap-2 text-xs sm:text-sm">
              <motion.span
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="text-base"
                aria-hidden
              >
                {weatherIcon(data.current.weatherCode)}
              </motion.span>
              <AnimatedTemp value={data.current.tempF} />
              <span className="truncate text-muted-foreground">
                {oneLineSummary(data).split("·").slice(1).join("·")}
              </span>
            </span>
          )}
          {!isLoading && !data && (
            <span className="text-destructive">Weather unavailable</span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="size-4 shrink-0 opacity-70" aria-hidden />
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && data && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <ExpandedWeatherPanel
              data={data}
              locationLabel={locationLabel}
              hasRain={hasRain}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function formatHm(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ExpandedWeatherPanel({
  data,
  locationLabel,
  hasRain,
}: {
  data: WeatherData;
  locationLabel?: string;
  hasRain: boolean;
}) {
  const ctx = weatherToContext(data);
  const uv = Math.round(data.current.uvIndex);
  const uvClass = uvIndexClass(uv);
  const planting = getPlantingRecommendations();
  const monthName = new Date().toLocaleString(undefined, { month: "long" });

  return (
    <div
      data-ocid="nims-weather-bar-panel"
      className="space-y-3 border-t border-white/10 px-3 py-3 text-xs text-muted-foreground"
    >
      {locationLabel && (
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
          {locationLabel}
        </p>
      )}

      {data.extremeWeather && (
        <p className="flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-1 font-medium text-amber-400">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          Extreme conditions flagged — extra plant care advised.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {data.moon.emoji}
          </span>
          <div>
            <p className="font-medium text-foreground">{data.moon.phase}</p>
            <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-primary/70"
                initial={{ width: 0 }}
                animate={{ width: `${data.moon.illumination}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="mt-0.5 text-[10px]">{data.moon.illumination}% lit</p>
          </div>
        </div>

        <span className={cn("rounded-full border border-white/10 px-2 py-1 font-semibold", uvClass)}>
          UV {uv}
          {uv >= 11 ? " ⚠️" : ""}
        </span>

        {hasRain && (
          <motion.span
            animate={{ y: [0, 2, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-1 text-cyan-300"
          >
            🌧️ {data.daily.totalRainInches.toFixed(2)}″ today
          </motion.span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Feels like{" "}
          <strong className="text-foreground">
            {Math.round(data.current.feelsLikeF)}°F
          </strong>
        </span>
        <span>{data.current.weatherDescription}</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Gusts{" "}
          <strong className="text-foreground">
            {Math.round(data.current.windGustsMph)} mph
          </strong>{" "}
          {data.current.windDirection}
        </span>
        <span>
          AQI{" "}
          <strong className="text-foreground">{data.airQuality.aqi}</strong> (
          {data.airQuality.level})
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Today{" "}
          <strong className="text-foreground">
            {Math.round(data.daily.highF)}° / {Math.round(data.daily.lowF)}°
          </strong>
        </span>
        <span>
          Sun ↑ {formatHm(data.daily.sunrise)} · ↓ {formatHm(data.daily.sunset)}
        </span>
      </div>

      <p className="pt-1 text-[11px] opacity-80">
        Grower snapshot · RH {ctx.humidity}% · moon {ctx.moonPhase} · updated{" "}
        {data.lastUpdated.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      {planting.length > 0 && (
        <div className="mt-2 border-t border-white/10 pt-3">
          <p className="mb-2 font-semibold text-foreground">
            🌱 What to Plant This Month
          </p>
          <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground/80">
            {monthName} · {PLANTING_ZONE_LABEL}
          </p>
          <ul className="space-y-1.5">
            {planting.map((rec) => (
              <li
                key={rec.name}
                className="flex items-start gap-2 rounded-md bg-white/5 px-2 py-1.5"
              >
                <span aria-hidden>{rec.emoji}</span>
                <span>
                  <strong className="text-foreground">{rec.name}</strong>
                  {" — "}
                  <span className="text-primary/90">{rec.action}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {rec.notes}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
