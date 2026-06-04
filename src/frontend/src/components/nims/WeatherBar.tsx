import { ChevronDown, ChevronUp } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useSpring,
} from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { LocationPreference } from "../../hooks/useNimsLocation";
import type { WeatherData } from "../../hooks/useWeather";
import { NURSERY_LAT, NURSERY_LNG } from "../../lib/weather-service";
import { weatherIcon } from "../../lib/weather-service";
import { NimsLocationSelector } from "./NimsLocationSelector";
import { WeatherImmersivePanel } from "./WeatherImmersivePanel";

type WeatherBarProps = {
  data: WeatherData | undefined;
  isLoading: boolean;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  locationPreference?: LocationPreference;
  onChooseGps?: () => void;
  onChooseNursery?: () => void;
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
  lat = NURSERY_LAT,
  lng = NURSERY_LNG,
  locationPreference = null,
  onChooseGps,
  onChooseNursery,
  expanded,
  onExpandedChange,
}: WeatherBarProps) {
  const [radarReady, setRadarReady] = useState(false);

  useEffect(() => {
    if (!expanded) setRadarReady(false);
  }, [expanded]);

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
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 3,
                  ease: "easeInOut",
                }}
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
            onAnimationComplete={() => {
              if (expanded) setRadarReady(true);
            }}
          >
            <WeatherImmersivePanel
              data={data}
              locationLabel={locationLabel}
              lat={lat}
              lng={lng}
              radarReady={radarReady}
              locationPreference={locationPreference}
              onChooseGps={onChooseGps}
              onChooseNursery={onChooseNursery}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
