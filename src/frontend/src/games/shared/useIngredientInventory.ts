/**
 * Soft-bridge pantry hook — load on demand, throttled saves (≥10s).
 * Guest: localStorage. Signed-in: requireBackendRaw (not backend.ts wrapper).
 * Candid opt args = [] not null.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { useAuth } from "../../hooks/useAuth";
import { requireBackendRaw } from "../../lib/backend-raw";
import {
  INVENTORY_AUTOSAVE_MS,
  INVENTORY_STORAGE_KEY,
  clampInventory,
  emptyInventory,
  parseInventory,
  type IngredientInventory,
  type RawIngredient,
  type SlicedIngredient,
} from "./ingredient-types";

function loadGuest(): IngredientInventory {
  try {
    const local = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!local) return emptyInventory();
    return parseInventory(local) ?? emptyInventory();
  } catch {
    return emptyInventory();
  }
}

export function useIngredientInventory() {
  const { isAuthenticated } = useAuth();
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();

  const invRef = useRef<IngredientInventory>(emptyInventory());
  const lastSaveRef = useRef(0);
  const hydratedOnceRef = useRef(false);
  const isAuthRef = useRef(isAuthenticated);
  const actorRef = useRef(actor);
  isAuthRef.current = isAuthenticated;
  actorRef.current = actor;

  const { data: serverJson, isPending: loadingServer } = useQuery({
    queryKey: ["games", "ingredient-inventory"],
    queryFn: async () => {
      const raw = requireBackendRaw(actor);
      const r = await raw.getMyIngredientInventory();
      // Candid opt Text → [] | [text]
      return r.length > 0 ? r[0]! : null;
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (json: string) => {
      const raw = requireBackendRaw(actorRef.current);
      const result = await raw.saveIngredientInventory(json);
      const r = result as { ok?: null; err?: string };
      if (r.err) throw new Error(r.err);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["games", "ingredient-inventory"] });
    },
  });
  const saveMutateRef = useRef(saveMutation.mutateAsync);
  saveMutateRef.current = saveMutation.mutateAsync;

  const [inventory, setInventory] = useState<IngredientInventory>(emptyInventory);
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reportSaveError = useCallback((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Pantry save failed";
    setSaveError(msg);
    console.warn("saveIngredientInventory:", e);
  }, []);

  useEffect(() => {
    invRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    if (hydratedOnceRef.current) return;
    if (isAuthenticated && loadingServer) return;

    let initial = emptyInventory();
    if (isAuthenticated && serverJson) {
      initial = parseInventory(serverJson) ?? emptyInventory();
    } else if (!isAuthenticated) {
      initial = loadGuest();
    }

    invRef.current = initial;
    setInventory(initial);
    setHydrated(true);
    hydratedOnceRef.current = true;
  }, [isAuthenticated, loadingServer, serverJson]);

  const persistThrottled = useCallback((state: IngredientInventory) => {
    const now = Date.now();
    if (now - lastSaveRef.current < INVENTORY_AUTOSAVE_MS) return;
    lastSaveRef.current = now;
    const json = JSON.stringify(clampInventory(state));

    if (isAuthRef.current && actorRef.current) {
      void saveMutateRef.current(json).catch(reportSaveError);
    } else {
      try {
        localStorage.setItem(INVENTORY_STORAGE_KEY, json);
      } catch {
        setSaveError("Could not save pantry locally (browser storage full or blocked).");
      }
    }
  }, [reportSaveError]);

  const forceSave = useCallback(() => {
    const json = JSON.stringify(clampInventory(invRef.current));
    lastSaveRef.current = Date.now();
    if (isAuthRef.current && actorRef.current) {
      void saveMutateRef.current(json).catch(reportSaveError);
    } else {
      try {
        localStorage.setItem(INVENTORY_STORAGE_KEY, json);
      } catch {
        setSaveError("Could not save pantry locally (browser storage full or blocked).");
      }
    }
  }, [reportSaveError]);

  const updateInventory = useCallback(
    (updater: (inv: IngredientInventory) => IngredientInventory, save = true) => {
      setInventory((prev) => {
        const next = clampInventory(updater(prev));
        invRef.current = next;
        if (save) persistThrottled(next);
        return next;
      });
    },
    [persistThrottled],
  );

  const addRaw = useCallback(
    (items: RawIngredient[]) => {
      if (items.length === 0) return;
      updateInventory((inv) => ({
        ...inv,
        raw: [...inv.raw, ...items],
      }));
    },
    [updateInventory],
  );

  /** Convert raw → sliced. Returns false if raw id not found. */
  const convertRawToSliced = useCallback(
    (rawId: string, sliceQuality: number) => {
      let ok = false;
      updateInventory((inv) => {
        const idx = inv.raw.findIndex((r) => r.id === rawId);
        if (idx < 0) return inv;
        const raw = inv.raw[idx]!;
        const sliced: SlicedIngredient = {
          ...raw,
          sliceQuality: Math.max(0.4, Math.min(1, sliceQuality)),
          slicedAt: Date.now(),
        };
        ok = true;
        return {
          ...inv,
          raw: inv.raw.filter((_, i) => i !== idx),
          sliced: [...inv.sliced, sliced],
        };
      });
      return ok;
    },
    [updateInventory],
  );

  /** Consume a sliced pantry item (Crafter). Returns the item or null. */
  const consumeSliced = useCallback(
    (slicedId: string): SlicedIngredient | null => {
      let taken: SlicedIngredient | null = null;
      updateInventory((inv) => {
        const idx = inv.sliced.findIndex((s) => s.id === slicedId);
        if (idx < 0) return inv;
        taken = inv.sliced[idx]!;
        return {
          ...inv,
          sliced: inv.sliced.filter((_, i) => i !== idx),
        };
      });
      return taken;
    },
    [updateInventory],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") forceSave();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [forceSave]);

  return {
    inventory,
    hydrated,
    isAuthenticated,
    saving: saveMutation.isPending,
    saveError,
    clearSaveError: () => setSaveError(null),
    addRaw,
    convertRawToSliced,
    consumeSliced,
    forceSave,
    updateInventory,
  };
}
