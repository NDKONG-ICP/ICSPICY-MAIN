import type { WeatherSnapshot } from "../declarations/backend.did";
import type { WeatherData } from "./weather-service";

const SOURCE_PREFIX = "open-meteo";

/** Encode extended provenance fields in `source` without a backend schema change. */
export function weatherDataToSnapshot(data: WeatherData): WeatherSnapshot {
  const date = data.lastUpdated.toISOString().slice(0, 10);
  const source = [
    SOURCE_PREFIX,
    `wind:${data.current.windSpeedMph.toFixed(1)}`,
    `aqi:${Math.round(data.airQuality.aqi)}`,
    `moon:${encodeURIComponent(data.moon.phase)}`,
  ].join("|");

  return {
    date,
    tempHighF: data.daily.highF,
    tempLowF: data.daily.lowF,
    humidity: data.current.humidity,
    rainfallInches: data.daily.totalRainInches,
    uvIndex: data.current.uvIndex,
    source,
  };
}

export type ParsedWeatherSource = {
  provider: string;
  windMph?: number;
  aqi?: number;
  moonPhase?: string;
};

export function parseWeatherSource(source: string): ParsedWeatherSource {
  const parts = source.split("|");
  const provider = parts[0] ?? source;
  const out: ParsedWeatherSource = { provider };
  for (const part of parts.slice(1)) {
    const [key, ...rest] = part.split(":");
    const value = rest.join(":");
    if (key === "wind") out.windMph = Number.parseFloat(value);
    if (key === "aqi") out.aqi = Number.parseInt(value, 10);
    if (key === "moon") out.moonPhase = decodeURIComponent(value);
  }
  return out;
}
