/** Port Charlotte, FL — admin nursery default */
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
  return dirs[Math.round(deg / 45) % 8];
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

export async function fetchWeatherData(
  latitude = NURSERY_LAT,
  longitude = NURSERY_LNG,
): Promise<WeatherData> {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,` +
    `surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,` +
    `wind_speed_10m_max,sunrise,sunset` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation,uv_index,surface_pressure` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=America/New_York`;

  const aqUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
    `&current=us_aqi,pm2_5,pm10&timezone=America/New_York`;

  const [forecastRes, aqRes] = await Promise.all([
    fetch(forecastUrl),
    fetch(aqUrl),
  ]);

  if (!forecastRes.ok) throw new Error(`Weather API error: ${forecastRes.status}`);
  const forecast = (await forecastRes.json()) as {
    current: Record<string, number>;
    daily: Record<string, (number | string)[]>;
  };

  let aqi = 42;
  let pm25 = 0;
  let pm10 = 0;
  if (aqRes.ok) {
    const aq = (await aqRes.json()) as { current: Record<string, number> };
    aqi = aq.current.us_aqi ?? 42;
    pm25 = aq.current.pm2_5 ?? 0;
    pm10 = aq.current.pm10 ?? 0;
  }

  const now = new Date();
  const moon = getMoonPhase(now);
  const cur = forecast.current;
  const daily = forecast.daily;

  const tempF = cur.temperature_2m ?? 0;
  const feelsLikeF = cur.apparent_temperature ?? tempF;
  const heatIndex = feelsLikeF;
  const windSpeedMph = cur.wind_speed_10m ?? 0;
  const totalRainInches = Number(daily.precipitation_sum?.[0] ?? 0);

  const extremeWeather =
    heatIndex > 105 || windSpeedMph > 40 || totalRainInches > 2;

  return {
    current: {
      tempF,
      feelsLikeF,
      humidity: cur.relative_humidity_2m ?? 0,
      precipitationInches: cur.precipitation ?? 0,
      uvIndex: cur.uv_index ?? 0,
      windSpeedMph,
      windDirection: degreesToCompass(cur.wind_direction_10m ?? 0),
      windDirectionDeg: cur.wind_direction_10m ?? 0,
      windGustsMph: cur.wind_gusts_10m ?? 0,
      pressureHpa: cur.surface_pressure ?? 0,
      weatherCode: cur.weather_code ?? 0,
      weatherDescription: wmoDescription(cur.weather_code ?? 0),
    },
    daily: {
      highF: Number(daily.temperature_2m_max?.[0] ?? tempF),
      lowF: Number(daily.temperature_2m_min?.[0] ?? tempF),
      totalRainInches,
      maxUvIndex: Number(daily.uv_index_max?.[0] ?? 0),
      maxWindMph: Number(daily.wind_speed_10m_max?.[0] ?? 0),
      sunrise: String(daily.sunrise?.[0] ?? ""),
      sunset: String(daily.sunset?.[0] ?? ""),
    },
    airQuality: { aqi, pm25, pm10, level: aqiLevel(aqi) },
    moon,
    extremeWeather,
    lastUpdated: now,
  };
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

export function sunDayProgress(sunriseIso: string, sunsetIso: string, now = new Date()): number {
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
