import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cloud,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { WeatherData } from "../../hooks/useWeather";
import { weatherToContext } from "../../lib/weather-service";

type WeatherBarProps = {
  data: WeatherData | undefined;
  isLoading: boolean;
  /** From parent; wire to `useWeather()` + local `useState` */
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
};

function oneLineSummary(d: WeatherData): string {
  const { current, daily, moon } = d;
  const rain = daily.totalRainInches.toFixed(1);
  const uv = Math.round(current.uvIndex);
  const wind = Math.round(current.windSpeedMph);
  return `${Math.round(current.tempF)}°F 💧${Math.round(current.humidity)}% ☀️UV${uv} 🌬️${current.windDirection}${wind}mph 🌧️${rain}" ${moon.emoji} ${moon.phase}`;
}

export function WeatherBar({
  data,
  isLoading,
  expanded,
  onExpandedChange,
}: WeatherBarProps) {
  return (
    <section
      data-ocid="nims-weather-bar"
      className="rounded-lg border border-border bg-card/80 text-sm text-foreground shadow-sm"
    >
      <button
        type="button"
        data-ocid="nims-weather-bar-toggle"
        onClick={() => onExpandedChange(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent/40"
      >
        <span className="min-w-0 flex-1 truncate font-medium">
          {isLoading && (
            <span className="text-muted-foreground">Loading nursery weather…</span>
          )}
          {!isLoading && data && (
            <span className="text-xs sm:text-sm">{oneLineSummary(data)}</span>
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

      {expanded && data && (
        <ExpandedWeatherPanel data={data} />
      )}
    </section>
  );
}

function formatHm(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ExpandedWeatherPanel({ data }: { data: WeatherData }) {
  const ctx = weatherToContext(data);
  return (
    <div
      data-ocid="nims-weather-bar-panel"
      className="border-t border-border px-3 py-3 text-xs text-muted-foreground space-y-2"
    >
      {data.extremeWeather && (
        <p
          data-ocid="nims-weather-extreme"
          className="flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-1 font-medium text-amber-400"
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          Extreme conditions flagged — extra plant care advised.
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Feels like{" "}
          <strong className="text-foreground">
            {Math.round(data.current.feelsLikeF)}°F
          </strong>
        </span>
        <span className="flex items-center gap-1">
          <Cloud className="size-3.5 shrink-0" aria-hidden />
          {data.current.weatherDescription}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Gusts{" "}
          <strong className="text-foreground">
            {Math.round(data.current.windGustsMph)} mph
          </strong>
        </span>
        <span>
          Pressure{" "}
          <strong className="text-foreground">
            {Math.round(data.current.pressureHpa)} hPa
          </strong>
        </span>
        <span>
          AQI{" "}
          <strong className="text-foreground">{data.airQuality.aqi}</strong> (
          {data.airQuality.level})
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Today high / low:{" "}
          <strong className="text-foreground">
            {Math.round(data.daily.highF)}° / {Math.round(data.daily.lowF)}°
          </strong>
        </span>
        <span>
          Sun ↑ {formatHm(data.daily.sunrise)} · ↓{" "}
          {formatHm(data.daily.sunset)}
        </span>
      </div>
      <p className={cn("pt-1 text-[11px]", "opacity-80")}>
        Grower snapshot · temp {ctx.tempF}° · RH {ctx.humidity}% · moon{" "}
        {ctx.moonPhase}
        <br />
        Updated{" "}
        {data.lastUpdated.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
