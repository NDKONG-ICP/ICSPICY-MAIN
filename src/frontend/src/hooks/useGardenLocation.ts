import { useCallback, useEffect, useMemo, useState } from "react";
import { NURSERY_LAT, NURSERY_LNG } from "../lib/weather-service";
import { useNimsLocation } from "./useNimsLocation";
import type { GardenLocationMode } from "../lib/garden-types";

const DRAFT_KEY = "garden-location-draft";

export type GardenLocationState = {
  lat: number;
  lng: number;
  mode: GardenLocationMode;
  label: string;
};

function storageKey(designId: number | null): string {
  return designId != null ? `garden-location-${designId}` : DRAFT_KEY;
}

function readStored(designId: number | null): GardenLocationState | null {
  try {
    const raw = localStorage.getItem(storageKey(designId));
    if (!raw) return null;
    return JSON.parse(raw) as GardenLocationState;
  } catch {
    return null;
  }
}

function writeStored(designId: number | null, loc: GardenLocationState | null) {
  const key = storageKey(designId);
  if (loc == null) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(loc));
}

export function useGardenLocation(designId: number | null) {
  const nims = useNimsLocation();
  const [stored, setStored] = useState<GardenLocationState | null>(() => readStored(designId));
  const [needsPrompt, setNeedsPrompt] = useState(() => readStored(designId) == null);
  const [addressDraft, setAddressDraft] = useState("");

  useEffect(() => {
    setStored(readStored(designId));
    setNeedsPrompt(readStored(designId) == null);
  }, [designId]);

  const persist = useCallback(
    (loc: GardenLocationState | null) => {
      setStored(loc);
      writeStored(designId, loc);
      setNeedsPrompt(loc == null);
    },
    [designId],
  );

  const chooseGps = useCallback(() => {
    nims.chooseGps();
    const lat = nims.coordinates.lat;
    const lng = nims.coordinates.lng;
    persist({
      lat,
      lng,
      mode: "gps",
      label: "My Location",
    });
  }, [nims, persist]);

  const chooseAddress = useCallback(
    async (address: string) => {
      const { geocodeAddress } = await import("../lib/satellite-tiles");
      const coords = await geocodeAddress(address);
      if (!coords) return false;
      persist({
        lat: coords.lat,
        lng: coords.lng,
        mode: "address",
        label: address.trim(),
      });
      return true;
    },
    [persist],
  );

  const chooseSkip = useCallback(() => {
    persist({
      lat: NURSERY_LAT,
      lng: NURSERY_LNG,
      mode: "skip",
      label: "Plain ground",
    });
  }, [persist]);

  const location = useMemo((): GardenLocationState | null => {
    if (stored) return stored;
    if (nims.preference === "gps" && nims.coordinates) {
      return {
        lat: nims.coordinates.lat,
        lng: nims.coordinates.lng,
        mode: "gps",
        label: nims.coordinates.label,
      };
    }
    return null;
  }, [stored, nims.coordinates, nims.preference]);

  const satelliteEnabled = location != null && location.mode !== "skip";

  return {
    location,
    satelliteEnabled,
    needsPrompt,
    addressDraft,
    setAddressDraft,
    chooseGps,
    chooseAddress,
    chooseSkip,
    dismissPrompt: () => setNeedsPrompt(false),
    setLocation: persist,
  };
}
