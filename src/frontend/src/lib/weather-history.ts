import type { PlantLifecycle } from "../declarations/backend.did";
import { parseWeatherSource } from "./weather-snapshot";

export type WeatherHistoryPoint = {
  date: string;
  highF: number;
  lowF: number;
  humidity: number;
  rainInches: number;
  uvIndex: number;
  windMph?: number;
  aqi?: number;
  moonPhase?: string;
  watered: boolean;
  fed: boolean;
  pestLogged: boolean;
};

export type WeatherDateRange = "7d" | "30d" | "90d" | "all";

function icTsToDateKey(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toISOString().slice(0, 10);
}

function inRange(dateKey: string, range: WeatherDateRange): boolean {
  if (range === "all") return true;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(`${dateKey}T12:00:00`) >= cutoff;
}

export function buildWeatherHistory(
  lifecycle: PlantLifecycle,
  range: WeatherDateRange = "all",
): WeatherHistoryPoint[] {
  const byDate = new Map<string, WeatherHistoryPoint>();

  const ensure = (date: string): WeatherHistoryPoint => {
    let row = byDate.get(date);
    if (!row) {
      row = {
        date,
        highF: 0,
        lowF: 0,
        humidity: 0,
        rainInches: 0,
        uvIndex: 0,
        watered: false,
        fed: false,
        pestLogged: false,
      };
      byDate.set(date, row);
    }
    return row;
  };

  for (const snap of lifecycle.weatherSnapshots) {
    if (!inRange(snap.date, range)) continue;
    const row = ensure(snap.date);
    const parsed = parseWeatherSource(snap.source);
    row.highF = Math.max(row.highF, snap.tempHighF);
    row.lowF =
      row.lowF === 0 ? snap.tempLowF : Math.min(row.lowF, snap.tempLowF);
    row.humidity = snap.humidity;
    row.rainInches = Math.max(row.rainInches, snap.rainfallInches);
    row.uvIndex = Math.max(row.uvIndex, snap.uvIndex);
    if (parsed.windMph !== undefined) row.windMph = parsed.windMph;
    if (parsed.aqi !== undefined) row.aqi = parsed.aqi;
    if (parsed.moonPhase) row.moonPhase = parsed.moonPhase;
  }

  for (const w of lifecycle.wateringLog) {
    const date = icTsToDateKey(w.timestamp);
    if (!inRange(date, range)) continue;
    ensure(date).watered = true;
  }
  for (const f of lifecycle.feedingLog) {
    const date = icTsToDateKey(f.date);
    if (!inRange(date, range)) continue;
    ensure(date).fed = true;
  }
  for (const p of lifecycle.pestLog) {
    const date = icTsToDateKey(p.timestamp);
    if (!inRange(date, range)) continue;
    ensure(date).pestLogged = true;
  }

  return [...byDate.values()]
    .filter((row) => row.highF > 0 || row.lowF > 0 || row.humidity > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function weatherHistorySummary(points: WeatherHistoryPoint[]) {
  if (points.length === 0) {
    return { days: 0, avgTempF: 0, totalRainInches: 0 };
  }
  const avgTempF =
    points.reduce((sum, p) => sum + (p.highF + p.lowF) / 2, 0) / points.length;
  const totalRainInches = points.reduce((sum, p) => sum + p.rainInches, 0);
  return { days: points.length, avgTempF, totalRainInches };
}

export function weatherHistoryToCsv(points: WeatherHistoryPoint[]): string {
  const header =
    "Date,High (°F),Low (°F),Humidity (%),Rain (in),UV,Wind (mph),AQI,Moon,Watered,Fed,Pest";
  const rows = points.map((p) =>
    [
      p.date,
      p.highF.toFixed(1),
      p.lowF.toFixed(1),
      p.humidity.toFixed(0),
      p.rainInches.toFixed(2),
      p.uvIndex.toFixed(1),
      p.windMph?.toFixed(1) ?? "",
      p.aqi?.toString() ?? "",
      p.moonPhase ?? "",
      p.watered ? "yes" : "no",
      p.fed ? "yes" : "no",
      p.pestLogged ? "yes" : "no",
    ].join(","),
  );
  return [header, ...rows].join("\n");
}
