import { AlertTriangle, Droplets, Wind } from "lucide-react";
import { motion, useMotionValueEvent, useSpring } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { WeatherData } from "../../hooks/useWeather";
import {
  getPlantingRecommendations,
  PLANTING_ZONE_LABEL,
} from "../../lib/planting-almanac";
import {
  aqiRingColor,
  sunDayProgress,
  uvIndexClass,
} from "../../lib/weather-service";
import { WeatherRadarMap } from "./WeatherRadarMap";

function CountUpTemp({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 70, damping: 20 });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  useMotionValueEvent(spring, "change", (v) => setDisplay(Math.round(v)));
  return (
    <span className="font-display text-5xl font-black tabular-nums text-foreground">
      {display}°F
    </span>
  );
}

function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ThermometerFill({ temp, high, low }: { temp: number; high: number; low: number }) {
  const span = Math.max(high - low, 1);
  const pct = Math.min(100, Math.max(0, ((temp - low) / span) * 100));
  return (
    <div className="relative mx-auto h-24 w-4 overflow-hidden rounded-full border border-white/20 bg-zinc-900/80">
      <motion.div
        className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-red-600 via-orange-500 to-amber-300"
        initial={{ height: 0 }}
        animate={{ height: `${pct}%` }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </div>
  );
}

function RainDrops({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="weather-rain-drop absolute text-cyan-400/70"
          style={{
            left: `${10 + i * 11}%`,
            animationDelay: `${i * 0.15}s`,
          }}
        >
          💧
        </span>
      ))}
    </div>
  );
}

function AqiRing({ aqi, level }: { aqi: number; level: string }) {
  const max = 300;
  const pct = Math.min(aqi / max, 1);
  const circumference = 2 * Math.PI * 42;
  const color = aqiRingColor(aqi);
  return (
    <div className="relative mx-auto size-28">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold tabular-nums">{aqi}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {level}
        </span>
      </div>
    </div>
  );
}

function MoonGlow({ emoji, illumination }: { emoji: string; illumination: number }) {
  return (
    <div className="relative flex flex-col items-center">
      <motion.span
        className="text-5xl"
        animate={{
          filter: [
            "drop-shadow(0 0 8px rgba(251,191,36,0.4))",
            "drop-shadow(0 0 18px rgba(251,191,36,0.75))",
            "drop-shadow(0 0 8px rgba(251,191,36,0.4))",
          ],
        }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        aria-hidden
      >
        {emoji}
      </motion.span>
      <svg viewBox="0 0 100 100" className="mt-2 size-16">
        <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.06)" />
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="rgba(251,191,36,0.5)"
          strokeWidth="3"
          strokeDasharray={`${(illumination / 100) * 276} 276`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
      </svg>
    </div>
  );
}

function formatHm(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function WeatherImmersivePanel({
  data,
  locationLabel,
  lat,
  lng,
}: {
  data: WeatherData;
  locationLabel?: string;
  lat: number;
  lng: number;
}) {
  const planting = getPlantingRecommendations();
  const monthName = new Date().toLocaleString(undefined, { month: "long" });
  const uv = Math.round(data.current.uvIndex);
  const uvClass = uvIndexClass(uv);
  const hasRain =
    data.daily.totalRainInches > 0 || data.current.precipitationInches > 0;
  const sunProgress = sunDayProgress(data.daily.sunrise, data.daily.sunset);
  const extremeHeat = data.daily.highF > 100 || data.current.tempF > 100;
  const extremeWind = data.current.windSpeedMph > 30;
  const extremeRain = data.daily.totalRainInches > 2;

  return (
    <div
      data-ocid="nims-weather-immersive-panel"
      className="space-y-4 border-t border-white/10 px-3 py-4"
    >
      {locationLabel && (
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
          {locationLabel}
        </p>
      )}

      <WeatherRadarMap lat={lat} lng={lng} />

      <div className="grid gap-3 sm:grid-cols-3">
        <GlassCard className="relative overflow-hidden">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-red-400/90">
            Temperature
          </p>
          <div className="flex items-center gap-4">
            <ThermometerFill
              temp={data.current.tempF}
              high={data.daily.highF}
              low={data.daily.lowF}
            />
            <div>
              <CountUpTemp value={data.current.tempF} />
              <p className="text-sm text-muted-foreground">
                Feels like {Math.round(data.current.feelsLikeF)}°F
              </p>
              <p className="mt-1 text-xs text-foreground/80">
                High {Math.round(data.daily.highF)}° · Low{" "}
                {Math.round(data.daily.lowF)}°
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden">
          <RainDrops active={hasRain} />
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-cyan-400/90">
            Moisture
          </p>
          <div className="flex items-center gap-3">
            <motion.div
              animate={hasRain ? { y: [0, -4, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Droplets className="size-10 text-cyan-400" aria-hidden />
            </motion.div>
            <div>
              <p className="font-display text-3xl font-bold tabular-nums">
                {Math.round(data.current.humidity)}%
              </p>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="mt-1 text-sm text-foreground/90">
                Rain today {data.daily.totalRainInches.toFixed(2)}″
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-400/90">
            Sun & Wind
          </p>
          <div className="flex items-start justify-between gap-2">
            <div>
              <motion.span
                className={cn(
                  "inline-flex rounded-full border border-white/10 px-2.5 py-1 text-sm font-bold",
                  uvClass,
                )}
                animate={uv >= 6 ? { scale: [1, 1.06, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                UV {uv}
              </motion.span>
              <p className="mt-2 flex items-center gap-1 text-sm">
                <motion.span
                  style={{ display: "inline-block" }}
                  animate={{ rotate: data.current.windDirectionDeg }}
                  transition={{ type: "spring", stiffness: 60, damping: 12 }}
                >
                  <Wind className="size-4 text-zinc-300" aria-hidden />
                </motion.span>
                {data.current.windDirection}{" "}
                {Math.round(data.current.windSpeedMph)} mph
              </p>
            </div>
            <div className="min-w-[88px] text-right text-[10px] text-muted-foreground">
              <div className="relative mx-auto mb-1 h-8 w-16 overflow-hidden rounded-t-full border border-b-0 border-white/15 bg-zinc-900/50">
                <motion.div
                  className="absolute bottom-0 size-2.5 -translate-x-1/2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  style={{ left: `${sunProgress * 100}%` }}
                  animate={{ left: `${sunProgress * 100}%` }}
                />
              </div>
              <p>↑ {formatHm(data.daily.sunrise)}</p>
              <p>↓ {formatHm(data.daily.sunset)}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <GlassCard>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/90">
            Air Quality
          </p>
          <AqiRing aqi={data.airQuality.aqi} level={data.airQuality.level} />
          <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
            <span>PM2.5 {data.airQuality.pm25.toFixed(1)}</span>
            <span>PM10 {data.airQuality.pm10.toFixed(1)}</span>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-indigo-300/90">
            Moon Phase
          </p>
          <MoonGlow emoji={data.moon.emoji} illumination={data.moon.illumination} />
          <p className="mt-2 text-center font-medium text-foreground">
            {data.moon.phase}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            {data.moon.illumination}% illuminated
          </p>
        </GlassCard>
      </div>

      {(extremeHeat || extremeWind || extremeRain || data.extremeWeather) && (
        <div className="space-y-2">
          {extremeHeat && (
            <p className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              <AlertTriangle className="size-4 shrink-0" />
              Extreme heat — {Math.round(data.daily.highF)}°F high today
            </p>
          )}
          {extremeWind && (
            <p className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
              <AlertTriangle className="size-4 shrink-0" />
              High wind — {Math.round(data.current.windSpeedMph)} mph sustained
            </p>
          )}
          {extremeRain && (
            <p className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-200">
              <AlertTriangle className="size-4 shrink-0" />
              Heavy rain — {data.daily.totalRainInches.toFixed(2)}″ today
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/80">
        Updated{" "}
        {data.lastUpdated.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
        {" · "}
        {data.current.weatherDescription}
      </p>

      {planting.length > 0 && (
        <div className="border-t border-white/10 pt-3">
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
                className="flex items-start gap-2 rounded-md bg-white/5 px-2 py-1.5 text-xs"
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
