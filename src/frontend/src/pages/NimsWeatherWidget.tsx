import { Button } from "@/components/ui/button";
import { CloudRain, MapPin, Thermometer, Wind } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { WeatherRecord } from "../backend";
import { useAddWeatherRecord, useMyWeatherRecords } from "../hooks/useBackend";

interface WeatherWidgetProps {
  compact?: boolean;
}

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
  };
}

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    () => {
      const stored = sessionStorage.getItem("nims-location");
      return stored ? JSON.parse(stored) : null;
    },
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const polledRef = useRef(false);

  const { data: weatherRecords = [] } = useMyWeatherRecords(14);
  const addWeatherRecord = useAddWeatherRecord();

  const pollWeather = useCallback(
    async (lat: number, lon: number) => {
      if (polledRef.current) return;
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto&past_days=7`;
        const res = await fetch(url);
        const data: OpenMeteoResponse = await res.json();

        const today = new Date().toISOString().split("T")[0];
        const todayIdx = data.daily.time.findIndex((d) => d === today);

        if (todayIdx === -1) return;

        const existingDates = new Set(
          (weatherRecords as WeatherRecord[]).map((r) => r.date),
        );
        if (existingDates.has(today)) return;

        await addWeatherRecord.mutateAsync({
          latitude: lat,
          longitude: lon,
          date: today,
          temperature_max: data.daily.temperature_2m_max[todayIdx],
          temperature_min: data.daily.temperature_2m_min[todayIdx],
          precipitation: data.daily.precipitation_sum[todayIdx],
          wind_speed: data.daily.windspeed_10m_max[todayIdx] || undefined,
        });
        polledRef.current = true;
      } catch (_e) {
        // Silent fail — weather is non-critical
      }
    },
    [weatherRecords, addWeatherRecord],
  );

  useEffect(() => {
    if (location) {
      pollWeather(location.lat, location.lon);
    }
  }, [location, pollWeather]);

  function requestLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation(loc);
        sessionStorage.setItem("nims-location", JSON.stringify(loc));
        setIsRequesting(false);
        toast.success("Location enabled! Fetching weather data…");
      },
      (_err) => {
        setIsRequesting(false);
        toast.error("Location access denied. Enable in browser settings.");
      },
      { timeout: 10_000 },
    );
  }

  const records = weatherRecords as WeatherRecord[];
  const sorted = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  if (!location) {
    return (
      <div
        className="bg-card border border-border rounded-lg p-4 space-y-3"
        data-ocid="weather-widget"
      >
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Weather Tracking
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Enable location sharing to automatically record daily weather data for
          your plants.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={requestLocation}
          disabled={isRequesting}
          className="border-border text-muted-foreground hover:text-foreground w-full"
          data-ocid="weather-enable-btn"
        >
          <MapPin className="w-3.5 h-3.5 mr-1.5" />
          {isRequesting ? "Requesting…" : "Enable Weather Tracking"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 space-y-3"
      data-ocid="weather-widget-active"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Weather Log
          </span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {location.lat.toFixed(2)}, {location.lon.toFixed(2)}
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">Fetching weather data…</p>
      ) : compact ? (
        // Compact: just show latest
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground">
              {Math.round(sorted[0].temperature_max)}° /{" "}
              {Math.round(sorted[0].temperature_min)}°C
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CloudRain className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {sorted[0].precipitation.toFixed(1)} mm
            </span>
          </div>
          {sorted[0].wind_speed && (
            <div className="flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {Math.round(sorted[0].wind_speed)} km/h
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium whitespace-nowrap">
                  Date
                </th>
                <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">
                  High
                </th>
                <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">
                  Low
                </th>
                <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">
                  Precip
                </th>
                <th className="text-right py-1.5 pl-2 text-muted-foreground font-medium">
                  Wind
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sorted.map((rec) => (
                <tr key={rec.id.toString()}>
                  <td className="py-1.5 pr-3 text-foreground font-medium whitespace-nowrap">
                    {new Date(rec.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="py-1.5 px-2 text-right text-orange-400">
                    {Math.round(rec.temperature_max)}°C
                  </td>
                  <td className="py-1.5 px-2 text-right text-cyan-400">
                    {Math.round(rec.temperature_min)}°C
                  </td>
                  <td className="py-1.5 px-2 text-right text-muted-foreground">
                    {rec.precipitation.toFixed(1)} mm
                  </td>
                  <td className="py-1.5 pl-2 text-right text-muted-foreground">
                    {rec.wind_speed
                      ? `${Math.round(rec.wind_speed)} km/h`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
