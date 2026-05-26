import { useEffect, useRef } from "react";
import type { PlantLifecycle } from "../declarations/backend.did";
import type { WeatherData } from "@/lib/weather-service";
import { weatherDataToSnapshot } from "@/lib/weather-snapshot";
import { isPlantMarkedDead } from "@/lib/plant-lifecycle-utils";
import { useAddWeatherSnapshot } from "./useNimsDashboard";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isActivePlant(lc: PlantLifecycle): boolean {
  const plant = lc.plant;
  return !plant.is_cooked && !isPlantMarkedDead(lc);
}

function hasSnapshotForDate(lc: PlantLifecycle, date: string): boolean {
  const snapshots = lc.weatherSnapshots ?? [];
  return snapshots.some((s) => s.date === date);
}

/**
 * Auto-capture today's weather once per plant per session when NIMS or plant detail loads.
 */
export function useAutoWeatherCapture(
  plants: PlantLifecycle[] | undefined,
  weather: WeatherData | undefined,
  enabled: boolean,
) {
  const addWeatherSnapshot = useAddWeatherSnapshot();
  const capturedTodayRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !weather || !plants || plants.length === 0) return;

    const today = todayIsoDate();

    for (const lc of plants) {
      if (!isActivePlant(lc)) continue;

      const plantId = lc.plant.id;
      const key = `${plantId.toString()}-${today}`;
      if (capturedTodayRef.current.has(key)) continue;

      if (hasSnapshotForDate(lc, today)) {
        capturedTodayRef.current.add(key);
        continue;
      }

      capturedTodayRef.current.add(key);
      void addWeatherSnapshot
        .mutateAsync({
          plantId,
          snapshot: weatherDataToSnapshot(weather),
        })
        .catch(() => {
          capturedTodayRef.current.delete(key);
        });
    }
  }, [enabled, weather, plants, addWeatherSnapshot]);
}
