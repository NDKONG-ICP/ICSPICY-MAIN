/** IC SPICY Weather — canister-first (Phase 1 Weather Desk). */

import { Actor, HttpAgent } from "@dfinity/agent";
import type {
  WeatherAlert,
  WeatherOutlook,
  WeatherSnapshot,
} from "../declarations/backend.did";
import { type _SERVICE, idlFactory } from "../declarations/backend.did.js";
import { BACKEND_CANISTER_ID, IC_HOST } from "./auth-config";
import { parseWeatherSource } from "./weather-snapshot";

export const NURSERY_LAT = 26.9767;
export const NURSERY_LNG = -82.0837;

const KNOWN_NEW_MOON = new Date("2024-01-11T11:57:00Z").getTime();
const LUNAR_CYCLE = 29.53058867;

export interface WeatherData {
  current: {
    tempF: number;
    feelsLikeF: number;
    humidity: number;
    precipitationInches: number;
    uvIndex: number;
    windSpeedMph: number;
    windDirection: string;
    windDirectionDeg: number;
    windGustsMph: number;
    pressureHpa: number;
    weatherCode: number;
    weatherDescription: string;
  };
  daily: {
    highF: number;
    lowF: number;
    totalRainInches: number;
    maxUvIndex: number;
    maxWindMph: number;
    sunrise: string;
    sunset: string;
  };
  /** Full 7-day series when served from Weather Desk outlook. */
  outlookDays?: Array<{
    date: string;
    highF: number;
    lowF: number;
    precipInches: number;
    uvIndexMax: number;
    windMphMax: number;
    weatherCode: number;
  }>;
  airQuality: {
    aqi: number;
    pm25: number;
    pm10: number;
    level: string;
  };
  moon: {
    phase: string;
    illumination: number;
    emoji: string;
  };
  extremeWeather: boolean;
  lastUpdated: Date;
  onChain?: boolean;
  stale?: boolean;
  gridKey?: string;
  models?: {
    gfs: Array<{ date: string; precipInches: number; tempHighF: number }>;
    ecmwf: Array<{ date: string; precipInches: number; tempHighF: number }>;
    icon?: Array<{ date: string; precipInches: number; tempHighF: number }>;
    gem?: Array<{ date: string; precipInches: number; tempHighF: number }>;
    agreementScore?: number;
    ensemble?: {
      dates: string[];
      tempHighMembers: number[][];
      precipMembers: number[][];
      memberCount: number;
    };
  };
}

export interface WeatherContext {
  tempF: number;
  humidity: number;
  uvIndex: number;
  recentRainInches: number;
  moonPhase: string;
  airQuality?: number;
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime Fog",
  51: "Light Drizzle",
  61: "Light Rain",
  63: "Moderate Rain",
  65: "Heavy Rain",
  80: "Rain Showers",
  95: "Thunderstorm",
};

export function getMoonPhase(date: Date): {
  phase: string;
  illumination: number;
  emoji: string;
} {
  const daysSinceNew = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  const cyclePosition =
    ((daysSinceNew % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE;
  const illumination = Math.round(
    ((1 - Math.cos((2 * Math.PI * cyclePosition) / LUNAR_CYCLE)) / 2) * 100,
  );

  if (cyclePosition < 1.85)
    return { phase: "New Moon", illumination, emoji: "🌑" };
  if (cyclePosition < 7.38)
    return { phase: "Waxing Crescent", illumination, emoji: "🌒" };
  if (cyclePosition < 9.23)
    return { phase: "First Quarter", illumination, emoji: "🌓" };
  if (cyclePosition < 14.77)
    return { phase: "Waxing Gibbous", illumination, emoji: "🌔" };
  if (cyclePosition < 16.61)
    return { phase: "Full Moon", illumination, emoji: "🌕" };
  if (cyclePosition < 22.15)
    return { phase: "Waning Gibbous", illumination, emoji: "🌖" };
  if (cyclePosition < 23.99)
    return { phase: "Last Quarter", illumination, emoji: "🌗" };
  return { phase: "Waning Crescent", illumination, emoji: "🌘" };
}

function degreesToCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] ?? "N";
}

function aqiLevel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function wmoDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? "Unknown";
}

async function getBackendActor(): Promise<_SERVICE> {
  const agent = await HttpAgent.create({ host: IC_HOST });
  if (import.meta.env.DEV) {
    await agent.fetchRootKey();
  }
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
}

/** CORS init for optional attribution layers (e.g. RainViewer). Not used for forecast data. */
export const WEATHER_FETCH_INIT: RequestInit = {
  mode: "cors",
  cache: "no-cache",
  credentials: "omit",
};

function mapModelDay(d: Record<string, unknown>) {
  return {
    date: String(d.date),
    precipInches: Number(d.precipInches),
    tempHighF: Number(d.tempHighF),
  };
}

function mapModelSpread(raw: unknown): WeatherData["models"] {
  const spread = raw as Record<string, unknown>;
  const mapDays = (arr: unknown) =>
    ((arr as Array<Record<string, unknown>>) ?? []).map(mapModelDay);
  const ensembleRaw = spread.ensemble as
    | [Record<string, unknown>]
    | undefined;
  const ens = ensembleRaw?.[0];
  return {
    gfs: mapDays(spread.gfs),
    ecmwf: mapDays(spread.ecmwf),
    icon: mapDays(spread.icon),
    gem: mapDays(spread.gem),
    agreementScore: Number(spread.agreementScore ?? 50),
    ensemble: ens
      ? {
          dates: ((ens.dates as string[]) ?? []).map(String),
          tempHighMembers: (
            (ens.tempHighMembers as number[][]) ?? []
          ).map((row) => row.map(Number)),
          precipMembers: (
            (ens.precipMembers as number[][]) ?? []
          ).map((row) => row.map(Number)),
          memberCount: Number(ens.memberCount ?? 0),
        }
      : undefined,
  };
}

function weatherDataFromOutlook(outlook: WeatherOutlook): WeatherData {
  const aq = outlook.airQuality[0];
  const aqi = aq ? Number(aq.usAqi) : 42;
  const moon = getMoonPhase(new Date(Number(outlook.fetchedAt) / 1_000_000));
  const day0 = outlook.daily[0];
  const wind = outlook.current.windMph;
  const code = Number(outlook.current.weatherCode);

  return {
    current: {
      tempF: outlook.current.tempF,
      feelsLikeF: outlook.current.feelsLikeF,
      humidity: outlook.current.humidity,
      precipitationInches: outlook.current.precipInches,
      uvIndex: outlook.current.uvIndex,
      windSpeedMph: wind,
      windDirection: degreesToCompass(outlook.current.windDirDeg),
      windDirectionDeg: outlook.current.windDirDeg,
      windGustsMph: wind,
      pressureHpa: outlook.current.pressureHpa,
      weatherCode: code,
      weatherDescription: wmoDescription(code),
    },
    daily: {
      highF: day0?.tempHighF ?? outlook.current.tempF,
      lowF: day0?.tempLowF ?? outlook.current.tempF,
      totalRainInches: day0?.precipInches ?? 0,
      maxUvIndex: day0?.uvIndexMax ?? outlook.current.uvIndex,
      maxWindMph: day0?.windMphMax ?? wind,
      sunrise: "",
      sunset: "",
    },
    outlookDays: outlook.daily.map((d) => ({
      date: d.date,
      highF: d.tempHighF,
      lowF: d.tempLowF,
      precipInches: d.precipInches,
      uvIndexMax: d.uvIndexMax,
      windMphMax: d.windMphMax,
      weatherCode: Number(d.weatherCode),
    })),
    airQuality: {
      aqi,
      pm25: aq?.pm25 ?? 0,
      pm10: aq?.pm10 ?? 0,
      level: aqiLevel(aqi),
    },
    moon,
    extremeWeather:
      outlook.current.feelsLikeF > 105 ||
      wind > 40 ||
      (day0?.precipInches ?? 0) > 2,
    lastUpdated: new Date(Number(outlook.fetchedAt) / 1_000_000),
    onChain: true,
    stale: outlook.stale,
    gridKey: outlook.gridKey,
    models: outlook.models[0]
      ? mapModelSpread(outlook.models[0])
      : undefined,
  };
}

function weatherDataFromSnapshot(snapshot: WeatherSnapshot): WeatherData {
  const parsed = parseWeatherSource(snapshot.source);
  const windMph = parsed.windMph ?? 0;
  const aqi = parsed.aqi ?? 42;
  const parts = snapshot.date.split("-").map(Number);
  const snapshotDate = new Date(
    parts[0] ?? 0,
    (parts[1] ?? 1) - 1,
    parts[2] ?? 1,
    12,
  );
  const moon = parsed.moonPhase
    ? { phase: parsed.moonPhase, illumination: 0, emoji: "🌙" }
    : getMoonPhase(snapshotDate);
  const midTemp = (snapshot.tempHighF + snapshot.tempLowF) / 2;

  return {
    current: {
      tempF: midTemp,
      feelsLikeF: midTemp,
      humidity: snapshot.humidity,
      precipitationInches: snapshot.rainfallInches,
      uvIndex: snapshot.uvIndex,
      windSpeedMph: windMph,
      windDirection: "—",
      windDirectionDeg: 0,
      windGustsMph: windMph,
      pressureHpa: 0,
      weatherCode: 0,
      weatherDescription: "Cached nursery weather",
    },
    daily: {
      highF: snapshot.tempHighF,
      lowF: snapshot.tempLowF,
      totalRainInches: snapshot.rainfallInches,
      maxUvIndex: snapshot.uvIndex,
      maxWindMph: windMph,
      sunrise: "",
      sunset: "",
    },
    airQuality: { aqi, pm25: 0, pm10: 0, level: aqiLevel(aqi) },
    moon,
    extremeWeather: false,
    lastUpdated: snapshotDate,
    onChain: true,
    stale: true,
  };
}

function isNurseryCoords(latitude: number, longitude: number): boolean {
  return (
    Math.abs(latitude - NURSERY_LAT) < 0.01 &&
    Math.abs(longitude - NURSERY_LNG) < 0.01
  );
}

/**
 * Fetch weather from the on-chain Weather Desk hub.
 * Primary: ensureWeatherOutlook (update — fills cache if needed).
 * Fallback: getWeatherOutlook query, then legacy nursery snapshot.
 * No browser Open-Meteo calls.
 */
export async function fetchWeatherData(
  latitude = NURSERY_LAT,
  longitude = NURSERY_LNG,
): Promise<WeatherData> {
  const actor = await getBackendActor();

  try {
    const ensured = await actor.ensureWeatherOutlook(latitude, longitude);
    const outlook = ensured[0];
    if (outlook != null) {
      return weatherDataFromOutlook(outlook);
    }
  } catch {
    /* fall through to query / snapshot */
  }

  try {
    const cached = await actor.getWeatherOutlook(
      [latitude],
      [longitude],
    );
    const outlook = cached[0];
    if (outlook != null) {
      return weatherDataFromOutlook(outlook);
    }
  } catch {
    /* fall through */
  }

  if (isNurseryCoords(latitude, longitude)) {
    const snap = await actor.getLatestNurseryWeather();
    const snapshot = snap[0];
    if (snapshot != null) {
      return weatherDataFromSnapshot(snapshot);
    }
  }

  throw new Error(
    "On-chain weather unavailable for this location. Try again shortly.",
  );
}

/** Anonymous-friendly ZIP → coords via canister (D1). */
export async function resolveWeatherZip(zip: string): Promise<{
  lat: number;
  lng: number;
  displayLabel: string;
  zip: string;
}> {
  const actor = await getBackendActor();
  const cached = await actor.lookupCachedZip(zip);
  const hit = cached[0];
  if (hit != null) {
    return {
      lat: hit.lat,
      lng: hit.lng,
      displayLabel: hit.displayLabel,
      zip: hit.zip,
    };
  }
  const resolved = await actor.resolveZip(zip);
  return {
    lat: resolved.lat,
    lng: resolved.lng,
    displayLabel: resolved.displayLabel,
    zip: resolved.zip,
  };
}

export type TropicalStormData = {
  id: string;
  name: string;
  classification: string;
  basin: "atlantic" | "eastPacific";
  lat: number;
  lng: number;
  maxWindKt: number;
  pressureMb?: number;
  movementText: string;
  movementDirDeg?: number;
  movementSpeedKt?: number;
  advisoryNum: number;
  track: Array<{
    lat: number;
    lng: number;
    maxWindKt: number;
    timeUtc: string;
  }>;
  forecastTrack?: Array<{
    lat: number;
    lng: number;
    maxWindKt: number;
    pressureMb?: number;
    forecastHour: number;
    category: number;
    label: string;
  }>;
};

export type DevelopmentOutlookData = {
  basin: string;
  prob2Day: string;
  risk2Day: string;
  prob7Day: string;
  risk7Day: string;
  centroidLat: number;
  centroidLng: number;
};

export type AceSeasonStatsData = {
  seasonTotal: number;
  seasonAverage: number;
  seasonRecord: number;
  storms: Array<{ name: string; ace: number; maxWindKt: number }>;
  seasonNames: string[];
};

export type TropicalSummaryData = {
  fetchedAt: number;
  seasonActive: boolean;
  storms: TropicalStormData[];
  developmentOutlooks?: DevelopmentOutlookData[];
  aceStats?: AceSeasonStatsData;
  dataSource?: string;
  disclaimer: string;
};

export type DailyAlmanacData = {
  dateKey: string;
  publishedAt: number;
  title: string;
  body: string;
  recipeSlug?: string | null;
  varietyIds: number[];
};

export type GrowerAlertData = {
  id: number;
  title: string;
  body: string;
  severity: "info" | "watch" | "warning";
  kind: string;
};

/** On-chain NHC tropical desk (Phase 3). */
export async function fetchTropicalSummary(
  force = false,
): Promise<TropicalSummaryData | null> {
  const actor = await getBackendActor();
  try {
    const ensured = await actor.ensureTropicalSummary(force ? 1n : 0n);
    const hit = ensured[0];
    if (hit != null) return mapTropicalSummary(hit);
  } catch {
    /* fall through to query */
  }
  try {
    const cached = await actor.getTropicalSummary();
    const hit = cached[0];
    if (hit != null) return mapTropicalSummary(hit);
  } catch {
    /* empty */
  }
  return null;
}

function mapTropicalSummary(s: unknown): TropicalSummaryData {
  const raw = s as Record<string, unknown>;
  const storms = ((raw.storms as Array<Record<string, unknown>>) ?? []).map(
    (st) => ({
      id: String(st.id),
      name: String(st.name),
      classification: String(st.classification),
      basin:
        st.basin && typeof st.basin === "object" && "atlantic" in st.basin
          ? ("atlantic" as const)
          : ("eastPacific" as const),
      lat: Number(st.lat),
      lng: Number(st.lng),
      maxWindKt: Number(st.maxWindKt),
      pressureMb: st.pressureMb != null ? Number(st.pressureMb) : undefined,
      movementText: String(st.movementText),
      movementDirDeg:
        st.movementDirDeg != null ? Number(st.movementDirDeg) : undefined,
      movementSpeedKt:
        st.movementSpeedKt != null ? Number(st.movementSpeedKt) : undefined,
      advisoryNum: Number(st.advisoryNum),
      track: ((st.track as Array<Record<string, unknown>>) ?? []).map((p) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
        maxWindKt: Number(p.maxWindKt),
        timeUtc: String(p.timeUtc),
      })),
      forecastTrack: ((st.forecastTrack as Array<Record<string, unknown>>) ??
        []).map((p) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
        maxWindKt: Number(p.maxWindKt),
        pressureMb: p.pressureMb != null ? Number(p.pressureMb) : undefined,
        forecastHour: Number(p.forecastHour ?? 0),
        category: Number(p.category ?? 0),
        label: String(p.pointLabel ?? p.label ?? ""),
      })),
    }),
  );

  const aceRaw = raw.aceStats as Record<string, unknown> | undefined;
  const aceStats: AceSeasonStatsData | undefined = aceRaw
    ? {
        seasonTotal: Number(aceRaw.seasonTotal ?? 0),
        seasonAverage: Number(aceRaw.seasonAverage ?? 13),
        seasonRecord: Number(aceRaw.seasonRecord ?? 85),
        storms: ((aceRaw.storms as Array<Record<string, unknown>>) ?? []).map(
          (e) => ({
            name: String(e.name),
            ace: Number(e.ace),
            maxWindKt: Number(e.maxWindKt),
          }),
        ),
        seasonNames: ((aceRaw.seasonNames as string[]) ?? []).map(String),
      }
    : undefined;

  const developmentOutlooks = (
    (raw.developmentOutlooks as Array<Record<string, unknown>>) ?? []
  ).map((o) => ({
    basin: String(o.basin),
    prob2Day: String(o.prob2Day ?? ""),
    risk2Day: String(o.risk2Day ?? ""),
    prob7Day: String(o.prob7Day ?? ""),
    risk7Day: String(o.risk7Day ?? ""),
    centroidLat: Number(o.centroidLat ?? 0),
    centroidLng: Number(o.centroidLng ?? 0),
  }));

  return {
    fetchedAt: Number(raw.fetchedAt),
    seasonActive: Boolean(raw.seasonActive),
    disclaimer: String(raw.disclaimer),
    dataSource: raw.dataSource != null ? String(raw.dataSource) : undefined,
    storms,
    developmentOutlooks,
    aceStats,
  };
}

export type TropicalAdeckData = {
  wallet: string;
  stormName: string;
  fetchedAt: number;
  gz: Uint8Array;
};

/** Raw gzipped ATCF a-decks mirrored on-chain (spaghetti model source). */
export async function fetchTropicalAdecks(): Promise<TropicalAdeckData[]> {
  const actor = await getBackendActor();
  try {
    const raw = await actor.getTropicalAdecks();
    return (raw ?? []).map((a) => ({
      wallet: String(a.wallet),
      stormName: String(a.stormName),
      fetchedAt: Number(a.fetchedAt),
      gz: a.gz instanceof Uint8Array ? a.gz : new Uint8Array(a.gz),
    }));
  } catch {
    return [];
  }
}

export type ModelGustDayData = { date: string; windGustsMph: number };

export type ModelGustsData = {
  fetchedAt: number;
  gfs: ModelGustDayData[];
  ecmwf: ModelGustDayData[];
  icon: ModelGustDayData[];
  gem: ModelGustDayData[];
};

/** Per-model daily wind gusts (side channel to the outlook model spread). */
export async function fetchModelGusts(
  lat: number,
  lng: number,
): Promise<ModelGustsData | null> {
  const actor = await getBackendActor();
  try {
    const raw = await actor.getModelGusts([lat], [lng]);
    const hit = raw[0];
    if (hit == null) return null;
    const mapDays = (arr: Array<{ date: string; windGustsMph: number }>) =>
      (arr ?? []).map((d) => ({
        date: String(d.date),
        windGustsMph: Number(d.windGustsMph),
      }));
    return {
      fetchedAt: Number(hit.fetchedAt),
      gfs: mapDays(hit.gfs),
      ecmwf: mapDays(hit.ecmwf),
      icon: mapDays(hit.icon),
      gem: mapDays(hit.gem),
    };
  } catch {
    return null;
  }
}

export async function fetchGrowerAlerts(
  lat: number,
  lng: number,
): Promise<GrowerAlertData[]> {
  const actor = await getBackendActor();
  try {
    const raw = await actor.getGrowerAlerts([lat], [lng]);
    return (raw ?? []).map((a: WeatherAlert) => ({
      id: Number(a.id),
      title: String(a.title),
      body: String(a.body),
      severity:
        "warning" in a.severity
          ? "warning"
          : "watch" in a.severity
            ? "watch"
            : "info",
      kind: Object.keys(a.kind)[0] ?? "unknown",
    }));
  } catch {
    return [];
  }
}

export async function fetchDailyAlmanac(
  dateKey?: string,
): Promise<DailyAlmanacData | null> {
  const actor = await getBackendActor();
  try {
    const raw = await actor.getDailyAlmanac(dateKey ? [dateKey] : []);
    const hit = raw[0];
    if (!hit || hit.retracted) return null;
    return {
      dateKey: String(hit.dateKey),
      publishedAt: Number(hit.publishedAt),
      title: String(hit.title),
      body: String(hit.body),
      recipeSlug: hit.recipeSlug[0] ?? null,
      varietyIds: (hit.varietyIds ?? []).map((n) => Number(n)),
    };
  } catch {
    return null;
  }
}

export type WeatherSourceLedgerEntry = {
  id: number;
  fetchedAt: number;
  kind: string;
  sourceUrl: string;
  parserVersion: string;
  gridKey: string | null;
  bodyDigest: string;
  httpStatus: number;
  status: string;
};

function ledgerKindLabel(
  kind: { outlook?: null; tropical?: null; nws?: null; almanac?: null; airQuality?: null; model?: null; ensemble?: null; geocode?: null },
): string {
  if ("outlook" in kind) return "outlook";
  if ("tropical" in kind) return "tropical";
  if ("nws" in kind) return "nws";
  if ("almanac" in kind) return "almanac";
  if ("airQuality" in kind) return "airQuality";
  if ("model" in kind) return "model";
  if ("ensemble" in kind) return "ensemble";
  if ("geocode" in kind) return "geocode";
  return "unknown";
}

function ledgerStatusLabel(
  status: { fresh?: null; stale?: null; error?: null },
): string {
  if ("fresh" in status) return "fresh";
  if ("stale" in status) return "stale";
  if ("error" in status) return "error";
  return "unknown";
}

export async function fetchWeatherSourceLedger(
  limit = 20,
): Promise<WeatherSourceLedgerEntry[]> {
  const actor = await getBackendActor();
  try {
    const rows = await actor.getWeatherSourceLedger(BigInt(limit));
    return rows.map((row) => ({
      id: Number(row.id),
      fetchedAt: Number(row.fetchedAt),
      kind: ledgerKindLabel(row.kind),
      sourceUrl: String(row.sourceUrl),
      parserVersion: String(row.parserVersion),
      gridKey: row.gridKey.length ? (row.gridKey[0] ?? null) : null,
      bodyDigest: String(row.bodyDigest),
      httpStatus: Number(row.httpStatus),
      status: ledgerStatusLabel(row.status),
    }));
  } catch {
    return [];
  }
}

export type CertifiedOutlook = {
  outlook: WeatherData | null;
  bodyDigest: string;
  hasCertificate: boolean;
};

export async function fetchCertifiedWeatherOutlook(
  lat = NURSERY_LAT,
  lng = NURSERY_LNG,
): Promise<CertifiedOutlook> {
  const actor = await getBackendActor();
  try {
    const cert = await actor.getWeatherOutlookCertified([lat], [lng]);
    const outlook = cert.value[0] ? weatherDataFromOutlook(cert.value[0]) : null;
    return {
      outlook,
      bodyDigest: String(cert.bodyDigest),
      hasCertificate: cert.certificate.length > 0,
    };
  } catch {
    return { outlook: null, bodyDigest: "", hasCertificate: false };
  }
}

export function weatherToContext(data: WeatherData): WeatherContext {
  return {
    tempF: data.current.tempF,
    humidity: data.current.humidity,
    uvIndex: data.current.uvIndex,
    recentRainInches: data.daily.totalRainInches,
    moonPhase: data.moon.phase,
    airQuality: data.airQuality.aqi,
  };
}

export function compassToDegrees(dir: string): number {
  const map: Record<string, number> = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
  };
  return map[dir] ?? 0;
}

export function aqiRingColor(aqi: number): string {
  if (aqi <= 50) return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#a855f7";
  return "#7f1d1d";
}

export function sunDayProgress(
  sunriseIso: string,
  sunsetIso: string,
  now = new Date(),
): number {
  if (!sunriseIso || !sunsetIso) return 0.5;
  const rise = new Date(sunriseIso).getTime();
  const set = new Date(sunsetIso).getTime();
  const t = now.getTime();
  if (t <= rise) return 0;
  if (t >= set) return 1;
  return (t - rise) / (set - rise);
}

export function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "⛈️";
  if (code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

export function uvIndexClass(uv: number): string {
  if (uv <= 2) return "text-green-400";
  if (uv <= 5) return "text-yellow-400";
  if (uv <= 7) return "text-orange-400";
  if (uv <= 10) return "text-red-400";
  return "text-purple-400";
}
