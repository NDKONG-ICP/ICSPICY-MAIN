import type { SkyState } from "../components/weather/WeatherSkyStage";

/** Cinematic SWFL hero loops — served from public/weather-heroes/ */
export const WEATHER_HERO_BASE = "/weather-heroes";

export const WEATHER_HERO_VIDEOS: Record<SkyState, string> = {
  clear: `${WEATHER_HERO_BASE}/hero-clear.mp4`,
  partly: `${WEATHER_HERO_BASE}/hero-partly.mp4`,
  overcast: `${WEATHER_HERO_BASE}/hero-overcast.mp4`,
  fog: `${WEATHER_HERO_BASE}/hero-fog.mp4`,
  drizzle: `${WEATHER_HERO_BASE}/hero-drizzle.mp4`,
  rain: `${WEATHER_HERO_BASE}/hero-rain.mp4`,
  storm: `${WEATHER_HERO_BASE}/hero-storm.mp4`,
  heat: `${WEATHER_HERO_BASE}/hero-heat.mp4`,
};

/** Static poster frames — instant hero while video buffers on IC gateway. */
export const WEATHER_HERO_POSTERS: Record<SkyState, string> = {
  clear: `${WEATHER_HERO_BASE}/hero-clear.jpg`,
  partly: `${WEATHER_HERO_BASE}/hero-partly.jpg`,
  overcast: `${WEATHER_HERO_BASE}/hero-overcast.jpg`,
  fog: `${WEATHER_HERO_BASE}/hero-fog.jpg`,
  drizzle: `${WEATHER_HERO_BASE}/hero-drizzle.jpg`,
  rain: `${WEATHER_HERO_BASE}/hero-rain.jpg`,
  storm: `${WEATHER_HERO_BASE}/hero-storm.jpg`,
  heat: `${WEATHER_HERO_BASE}/hero-heat.jpg`,
};

export const SKY_STATE_LABEL: Record<SkyState, string> = {
  clear: "Clear SWFL skies",
  partly: "Partly cloudy",
  overcast: "Heavy overcast",
  fog: "Coastal fog",
  drizzle: "Light drizzle",
  rain: "Heavy rain",
  storm: "Thunderstorm",
  heat: "Extreme heat",
};

export function heroVideoForState(state: SkyState): string {
  return WEATHER_HERO_VIDEOS[state];
}

export function heroPosterForState(state: SkyState): string {
  return WEATHER_HERO_POSTERS[state];
}
