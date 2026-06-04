import type { WeatherData } from "./weather-service";

export type SuggestionType = "info" | "warning" | "tip" | "action";

export interface WeatherSuggestion {
  text: string;
  type: SuggestionType;
}

export interface NimsPlantHint {
  variety: string;
  lastWateredDays?: number;
  daysSincePlanted?: number;
  daysToGermination?: number;
}

function daysSincePlanted(plantingDateNs: bigint): number {
  const plantedMs = Number(plantingDateNs / 1_000_000n);
  return Math.floor((Date.now() - plantedMs) / 86_400_000);
}

/** Weather + NIMS-aware planting suggestions for Schedule Builder. */
export function getWeatherSuggestions(
  weather: WeatherData,
  plants: NimsPlantHint[] = [],
): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];

  if (weather.daily.totalRainInches > 0.5) {
    suggestions.push({
      text: "Heavy rain today — skip manual watering",
      type: "info",
    });
  }

  if (weather.current.tempF > 95) {
    suggestions.push({
      text: "Extreme heat — water deeply in early morning or evening",
      type: "warning",
    });
  }

  if (weather.current.uvIndex >= 8) {
    suggestions.push({
      text: "Very high UV — consider shade cloth for seedlings",
      type: "warning",
    });
  }

  if (weather.current.windSpeedMph > 25) {
    suggestions.push({
      text: "High winds — avoid foliar spraying today",
      type: "warning",
    });
  }

  if (weather.moon.phase === "New Moon" || weather.moon.phase === "Full Moon") {
    suggestions.push({
      text: `${weather.moon.phase} — good time for planting root crops`,
      type: "tip",
    });
  }

  for (const plant of plants) {
    if (
      plant.lastWateredDays != null &&
      plant.lastWateredDays > 3 &&
      weather.daily.totalRainInches < 0.1
    ) {
      suggestions.push({
        text: `${plant.variety} needs watering — last watered ${plant.lastWateredDays} days ago`,
        type: "action",
      });
    }

    if (
      plant.daysSincePlanted != null &&
      plant.daysToGermination != null &&
      plant.daysSincePlanted >= plant.daysToGermination - 2 &&
      plant.daysSincePlanted <= plant.daysToGermination + 3
    ) {
      suggestions.push({
        text: `Your ${plant.variety} was planted ${plant.daysSincePlanted} days ago — expect germination soon`,
        type: "tip",
      });
    }
  }

  return suggestions;
}

export { daysSincePlanted };
