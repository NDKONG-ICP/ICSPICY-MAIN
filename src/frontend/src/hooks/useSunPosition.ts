import { useMemo } from "react";
import SunCalc from "suncalc";

export type SunLighting = {
  position: [number, number, number];
  altitude: number;
  ambientIntensity: number;
  directionalIntensity: number;
  skyTurbidity: number;
  skyColor: string;
  hour: number;
};

export function useSunPosition(
  lat: number,
  lng: number,
  hour: number,
): SunLighting {
  return useMemo(() => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    const pos = SunCalc.getPosition(date, lat, lng);
    const distance = 30;
    const x = distance * Math.cos(pos.altitude) * Math.sin(pos.azimuth);
    const y = Math.max(0.5, distance * Math.sin(pos.altitude));
    const z = distance * Math.cos(pos.altitude) * Math.cos(pos.azimuth);

    let ambient = 0.45;
    let directional = 1.2;
    let turbidity = 8;
    let skyColor = "#87CEEB";

    if (hour < 7 || hour > 19) {
      ambient = 0.15;
      directional = 0.3;
      turbidity = 10;
      skyColor = "#1e3a5f";
    } else if (hour < 9 || hour > 17) {
      ambient = 0.35;
      directional = 0.9;
      turbidity = 6;
      skyColor = hour < 9 ? "#ffb4a2" : "#c084fc";
    }

    return {
      position: [x, y, z],
      altitude: pos.altitude,
      ambientIntensity: ambient,
      directionalIntensity: directional,
      skyTurbidity: turbidity,
      skyColor,
      hour,
    };
  }, [lat, lng, hour]);
}
