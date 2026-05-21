import { useCallback, useEffect, useMemo, useState } from "react";
import { NURSERY_LAT, NURSERY_LNG } from "../lib/weather-service";
import { useDeviceLocation } from "./useDeviceLocation";

const PREF_KEY = "nims-location-preference";

export type LocationPreference = "gps" | "default" | null;

export function useNimsLocation() {
  const device = useDeviceLocation();
  const [preference, setPreferenceState] = useState<LocationPreference>(() => {
    const stored = localStorage.getItem(PREF_KEY);
    if (stored === "gps" || stored === "default") return stored;
    return null;
  });

  const setPreference = useCallback((pref: LocationPreference) => {
    setPreferenceState(pref);
    if (pref == null) localStorage.removeItem(PREF_KEY);
    else localStorage.setItem(PREF_KEY, pref);
  }, []);

  const needsPrompt = preference == null;

  useEffect(() => {
    if (preference === "gps" && device.location == null && device.permission === "prompt") {
      device.requestLocation();
    }
  }, [preference, device.location, device.permission, device.requestLocation]);

  const coordinates = useMemo(() => {
    if (preference === "default") {
      return { lat: NURSERY_LAT, lng: NURSERY_LNG, label: "Port Charlotte, FL" };
    }
    if (preference === "gps" && device.location) {
      return {
        lat: device.location.lat,
        lng: device.location.lng,
        label: "Your location",
      };
    }
    if (preference === "gps") {
      return { lat: NURSERY_LAT, lng: NURSERY_LNG, label: "Port Charlotte, FL" };
    }
    return { lat: NURSERY_LAT, lng: NURSERY_LNG, label: "Port Charlotte, FL" };
  }, [preference, device.location]);

  const chooseGps = useCallback(() => {
    setPreference("gps");
    device.requestLocation();
  }, [device, setPreference]);

  const chooseDefault = useCallback(() => {
    setPreference("default");
  }, [setPreference]);

  return {
    coordinates,
    needsPrompt,
    chooseGps,
    chooseDefault,
    deviceError: device.error,
  };
}
