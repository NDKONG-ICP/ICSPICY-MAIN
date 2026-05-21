import { useCallback, useEffect, useState } from "react";

export type LocationPermission = "prompt" | "granted" | "denied";

const STORAGE_KEY = "nims-location";

export function useDeviceLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<LocationPermission>("prompt");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { lat: number; lng: number };
      if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
        setLocation(parsed);
        setPermission("granted");
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setPermission("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(next);
        setPermission("granted");
        setError(null);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      (err) => {
        setError(err.message);
        setPermission("denied");
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }, []);

  return { location, error, permission, requestLocation };
}
