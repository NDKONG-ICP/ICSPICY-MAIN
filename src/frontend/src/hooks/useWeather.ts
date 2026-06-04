import { useQuery } from "@tanstack/react-query";
import {
  NURSERY_LAT,
  NURSERY_LNG,
  type WeatherData,
  fetchWeatherData,
} from "../lib/weather-service";

export function useWeather(lat?: number, lng?: number) {
  const latitude = lat ?? NURSERY_LAT;
  const longitude = lng ?? NURSERY_LNG;

  return useQuery<WeatherData>({
    queryKey: ["weather", latitude, longitude],
    queryFn: () => fetchWeatherData(latitude, longitude),
    staleTime: 5 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: 2,
  });
}

export type { WeatherData, WeatherContext } from "../lib/weather-service";
export {
  weatherToContext,
  NURSERY_LAT,
  NURSERY_LNG,
} from "../lib/weather-service";
