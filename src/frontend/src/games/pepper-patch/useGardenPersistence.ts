import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { useAuth } from "../../hooks/useAuth";
import { requireBackendRaw } from "../../lib/backend-raw";
import { AUTOSAVE_MIN_MS, GUEST_STORAGE_KEY } from "./constants";
import {
  createInitialGarden,
  tryLoadGardenFromJson,
  wouldWipeServerSave,
  type GardenLoadErrorCode,
} from "./migrate";
import type { GardenState } from "./types";
import { simulateOfflineGrowth } from "./simulation";

function loadGuestGarden(): {
  state: GardenState | null;
  loadError: { code: GardenLoadErrorCode; message: string } | null;
  rawJson: string | null;
} {
  try {
    const local = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!local) return { state: null, loadError: null, rawJson: null };
    const result = tryLoadGardenFromJson(local);
    if (!result.ok) {
      console.error("[pepper-patch] guest save load failed:", result.message);
      return {
        state: null,
        loadError: { code: result.code, message: result.message },
        rawJson: result.rawJson,
      };
    }
    return {
      state: simulateOfflineGrowth(result.state),
      loadError: null,
      rawJson: local,
    };
  } catch (e) {
    console.error("[pepper-patch] guest save read failed:", e);
    return { state: null, loadError: null, rawJson: null };
  }
}

export function useGardenPersistence() {
  const { isAuthenticated } = useAuth();
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();

  const gardenRef = useRef<GardenState>(createInitialGarden());
  const serverRawRef = useRef<string | null>(null);
  const saveEnabledRef = useRef(false);
  const lastSaveRef = useRef(0);
  const hydratedOnceRef = useRef(false);
  const isAuthRef = useRef(isAuthenticated);
  const actorRef = useRef(actor);
  isAuthRef.current = isAuthenticated;
  actorRef.current = actor;

  const { data: serverJson, isPending: loadingServer, isError: serverLoadError } = useQuery({
    queryKey: ["games", "pepper-patch", "garden"],
    queryFn: async () => {
      const raw = requireBackendRaw(actor);
      const r = await raw.getMyGardenState();
      return r.length > 0 ? r[0]! : null;
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (json: string) => {
      const raw = requireBackendRaw(actorRef.current);
      const result = await raw.saveGardenState(json);
      const r = result as { ok?: null; err?: string };
      if (r.err) throw new Error(r.err);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["games", "pepper-patch", "garden"] });
    },
  });
  const saveMutateRef = useRef(saveMutation.mutateAsync);
  saveMutateRef.current = saveMutation.mutateAsync;

  const [garden, setGarden] = useState<GardenState>(createInitialGarden);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<{
    code: GardenLoadErrorCode | "fetch";
    message: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reportSaveError = useCallback((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Garden save failed";
    setSaveError(msg);
    console.warn("saveGardenState:", e);
  }, []);

  useEffect(() => {
    gardenRef.current = garden;
  }, [garden]);

  const persistThrottled = useCallback((state: GardenState) => {
    if (!saveEnabledRef.current) return;

    if (wouldWipeServerSave(state, serverRawRef.current)) {
      console.error(
        "[pepper-patch] blocked save: would replace non-empty server garden with fresh default",
      );
      setLoadError({
        code: "shape",
        message:
          "Your saved garden could not be loaded safely. Progress was NOT overwritten — refresh or contact support.",
      });
      return;
    }

    const now = Date.now();
    if (now - lastSaveRef.current < AUTOSAVE_MIN_MS) return;
    lastSaveRef.current = now;
    const json = JSON.stringify(state);

    if (isAuthRef.current && actorRef.current) {
      void saveMutateRef.current(json).catch(reportSaveError);
    } else {
      try {
        localStorage.setItem(GUEST_STORAGE_KEY, json);
      } catch {
        setSaveError("Could not save garden locally (browser storage full or blocked).");
      }
    }
  }, [reportSaveError]);

  // Hydrate once — never re-run on serverJson refetch after save.
  useEffect(() => {
    if (hydratedOnceRef.current) return;
    if (isAuthenticated && loadingServer) return;

    let initial = createInitialGarden();
    let error: typeof loadError = null;
    saveEnabledRef.current = false;

    if (isAuthenticated) {
      if (serverLoadError) {
        error = {
          code: "fetch",
          message: "Could not reach your saved garden. Progress was not overwritten.",
        };
        console.error("[pepper-patch] getMyGardenState query failed");
      } else if (serverJson) {
        serverRawRef.current = serverJson;
        const result = tryLoadGardenFromJson(serverJson);
        if (result.ok) {
          initial = simulateOfflineGrowth(result.state);
          saveEnabledRef.current = true;
        } else {
          error = { code: result.code, message: result.message };
          console.error("[pepper-patch] server save migration failed:", result.message);
          // Keep server blob intact — do not autosave a default over it.
        }
      } else {
        // No server save yet — safe to start fresh and persist.
        saveEnabledRef.current = true;
      }
    } else {
      const guest = loadGuestGarden();
      if (guest.rawJson) serverRawRef.current = guest.rawJson;
      if (guest.state) {
        initial = guest.state;
        saveEnabledRef.current = true;
      } else if (guest.loadError) {
        error = guest.loadError;
      } else {
        saveEnabledRef.current = true;
      }
    }

    gardenRef.current = initial;
    setGarden(initial);
    setLoadError(error);
    setHydrated(true);
    hydratedOnceRef.current = true;
  }, [isAuthenticated, loadingServer, serverJson, serverLoadError]);

  const updateGarden = useCallback(
    (updater: (g: GardenState) => GardenState, save = true) => {
      setGarden((prev) => {
        const next = simulateOfflineGrowth(updater(prev));
        gardenRef.current = next;
        if (save) persistThrottled(next);
        return next;
      });
    },
    [persistThrottled],
  );

  const mergeCatalogIds = useCallback(
    (ids: Record<string, string>) => {
      setGarden((prev) => {
        const merged = { ...prev.catalogIds, ...ids };
        const unchanged =
          Object.keys(merged).length === Object.keys(prev.catalogIds).length &&
          Object.entries(merged).every(([k, v]) => prev.catalogIds[k] === v);
        if (unchanged) return prev;
        const next = { ...prev, catalogIds: merged };
        gardenRef.current = next;
        return next;
      });
    },
    [],
  );

  const forceSave = useCallback(() => {
    if (!hydratedOnceRef.current || !saveEnabledRef.current) return;
    const state = gardenRef.current;
    if (wouldWipeServerSave(state, serverRawRef.current)) {
      console.error("[pepper-patch] blocked forceSave: would wipe server garden");
      return;
    }
    const json = JSON.stringify(state);
    lastSaveRef.current = Date.now();
    if (isAuthRef.current && actorRef.current) {
      void saveMutateRef.current(json).catch(reportSaveError);
    } else {
      try {
        localStorage.setItem(GUEST_STORAGE_KEY, json);
      } catch {
        setSaveError("Could not save garden locally (browser storage full or blocked).");
      }
    }
  }, [reportSaveError]);

  // Growth tick — created once; no autosave on tick (explicit actions + visibility only).
  useEffect(() => {
    const id = window.setInterval(() => {
      setGarden((g) => {
        const next = simulateOfflineGrowth(g);
        if (next === g) return g;
        gardenRef.current = next;
        return next;
      });
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") forceSave();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [forceSave]);

  return {
    garden,
    updateGarden,
    mergeCatalogIds,
    forceSave,
    hydrated,
    loadError,
    saveError,
    clearSaveError: () => setSaveError(null),
    saving: saveMutation.isPending,
    isAuthenticated,
  };
}
