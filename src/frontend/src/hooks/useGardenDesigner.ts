import { useCallback, useEffect, useRef, useState } from "react";
import { playPlacementSound } from "@/lib/garden-export";
import { toast } from "sonner";
import type {
  GardenDesign,
  PendingPlacement,
  SelectedType,
  ViewMode,
} from "../lib/garden-types";
import { HISTORY_MAX } from "../lib/garden-types";
import {
  clampPlot,
  clampScale,
  cloneDesign,
  createEmptyDesign,
  nextItemId,
  normalizeRotation,
  snapToGrid,
} from "../lib/garden-utils";

type UseGardenDesignerOptions = {
  initialDesign?: GardenDesign;
  readOnly?: boolean;
  onSave?: (design: GardenDesign) => Promise<number | null>;
};

export function useGardenDesigner({
  initialDesign,
  readOnly = false,
  onSave,
}: UseGardenDesignerOptions = {}) {
  const [design, setDesign] = useState<GardenDesign>(
    () => initialDesign ?? createEmptyDesign(),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<SelectedType>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [gridSnap, setGridSnap] = useState(true);
  const [pending, setPending] = useState<PendingPlacement | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const historyRef = useRef<GardenDesign[]>([]);
  const futureRef = useRef<GardenDesign[]>([]);

  const pushHistory = useCallback((prev: GardenDesign) => {
    historyRef.current = [...historyRef.current.slice(-(HISTORY_MAX - 1)), cloneDesign(prev)];
    futureRef.current = [];
  }, []);

  const applyDesign = useCallback(
    (next: GardenDesign, recordHistory = true) => {
      setDesign((prev) => {
        if (recordHistory) pushHistory(prev);
        return next;
      });
      setIsDirty(true);
    },
    [pushHistory],
  );

  const selectItem = useCallback((id: number | null, type: SelectedType) => {
    setSelectedId(id);
    setSelectedType(type);
  }, []);

  const placePlant = useCallback(
    (
      opts: {
        varietyId?: number | null;
        catalogId?: string;
        label: string;
        color: string;
        icon: string;
        scoville?: number;
      },
      x: number,
      y: number,
    ) => {
      if (readOnly) return;
      const gx = snapToGrid(x, design.gridSizeMeters, gridSnap);
      const gy = snapToGrid(y, design.gridSizeMeters, gridSnap);
      const id = nextItemId(design.plants, design.structures);
      const plant = {
        id,
        varietyId: opts.varietyId ?? null,
        catalogId: opts.catalogId ?? null,
        label: opts.label,
        x: gx,
        y: gy,
        rotation: 0,
        scale: 1,
        color: opts.color,
        icon: opts.icon,
        scoville: opts.scoville,
      };
      applyDesign({ ...design, plants: [...design.plants, plant] });
      selectItem(id, "plant");
      playPlacementSound();
      toast.success(`${opts.icon} ${opts.label} placed!`);
      setPending(null);
      setGhost(null);
    },
    [applyDesign, design, gridSnap, readOnly, selectItem],
  );

  const placeStructure = useCallback(
    (
      structureType: string,
      width: number,
      depth: number,
      color: string,
      x: number,
      y: number,
    ) => {
      if (readOnly) return;
      const gx = snapToGrid(x, design.gridSizeMeters, gridSnap);
      const gy = snapToGrid(y, design.gridSizeMeters, gridSnap);
      const id = nextItemId(design.plants, design.structures);
      const structure = {
        id,
        structureType,
        x: gx,
        y: gy,
        width,
        depth,
        rotation: 0,
        color,
      };
      applyDesign({ ...design, structures: [...design.structures, structure] });
      selectItem(id, "structure");
      playPlacementSound();
      toast.success(`${structureType.replace(/_/g, " ")} placed!`);
      setPending(null);
      setGhost(null);
    },
    [applyDesign, design, gridSnap, readOnly, selectItem],
  );

  const placeAtGhost = useCallback(() => {
    if (!pending || !ghost) return;
    if (pending.kind === "plant") {
      placePlant(
        {
          varietyId: pending.varietyId,
          catalogId: pending.catalogId,
          label: pending.label,
          color: pending.color,
          icon: pending.icon,
          scoville: pending.scoville,
        },
        ghost.x,
        ghost.y,
      );
    } else {
      placeStructure(
        pending.structureType,
        pending.width,
        pending.depth,
        pending.color,
        ghost.x,
        ghost.y,
      );
    }
  }, [ghost, pending, placePlant, placeStructure]);

  const moveItem = useCallback(
    (id: number, type: SelectedType, x: number, y: number) => {
      if (readOnly || !type) return;
      const gx = snapToGrid(x, design.gridSizeMeters, gridSnap);
      const gy = snapToGrid(y, design.gridSizeMeters, gridSnap);
      if (type === "plant") {
        applyDesign({
          ...design,
          plants: design.plants.map((p) =>
            p.id === id ? { ...p, x: gx, y: gy } : p,
          ),
        });
      } else {
        applyDesign({
          ...design,
          structures: design.structures.map((s) =>
            s.id === id ? { ...s, x: gx, y: gy } : s,
          ),
        });
      }
    },
    [applyDesign, design, gridSnap, readOnly],
  );

  const rotateItem = useCallback(
    (id: number, type: SelectedType, degrees: number) => {
      if (readOnly || !type) return;
      if (type === "plant") {
        applyDesign({
          ...design,
          plants: design.plants.map((p) =>
            p.id === id
              ? { ...p, rotation: normalizeRotation(p.rotation + degrees) }
              : p,
          ),
        });
      } else {
        applyDesign({
          ...design,
          structures: design.structures.map((s) =>
            s.id === id
              ? { ...s, rotation: normalizeRotation(s.rotation + degrees) }
              : s,
          ),
        });
      }
    },
    [applyDesign, design, readOnly],
  );

  const scaleItem = useCallback(
    (id: number, type: SelectedType, scale: number) => {
      if (readOnly || type !== "plant") return;
      applyDesign({
        ...design,
        plants: design.plants.map((p) =>
          p.id === id ? { ...p, scale: clampScale(scale) } : p,
        ),
      });
    },
    [applyDesign, design, readOnly],
  );

  const deleteItem = useCallback(
    (id: number, type: SelectedType, confirmStructure = true) => {
      if (readOnly || !type) return;
      if (type === "structure" && confirmStructure) {
        const ok = window.confirm("Delete this structure?");
        if (!ok) return;
      }
      if (type === "plant") {
        applyDesign({
          ...design,
          plants: design.plants.filter((p) => p.id !== id),
        });
      } else {
        applyDesign({
          ...design,
          structures: design.structures.filter((s) => s.id !== id),
        });
      }
      selectItem(null, null);
      toast.message("Removed from garden");
    },
    [applyDesign, design, readOnly, selectItem],
  );

  const duplicateItem = useCallback(
    (id: number, type: SelectedType) => {
      if (readOnly || !type) return;
      const newId = nextItemId(design.plants, design.structures);
      const offset = design.gridSizeMeters || 0.5;
      if (type === "plant") {
        const src = design.plants.find((p) => p.id === id);
        if (!src) return;
        const copy = {
          ...src,
          id: newId,
          x: src.x + offset,
          y: src.y + offset,
        };
        applyDesign({ ...design, plants: [...design.plants, copy] });
        selectItem(newId, "plant");
      } else {
        const src = design.structures.find((s) => s.id === id);
        if (!src) return;
        const copy = {
          ...src,
          id: newId,
          x: src.x + offset,
          y: src.y + offset,
        };
        applyDesign({ ...design, structures: [...design.structures, copy] });
        selectItem(newId, "structure");
      }
    },
    [applyDesign, design, readOnly, selectItem],
  );

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push(cloneDesign(design));
    setDesign(prev);
    setIsDirty(true);
  }, [design]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(cloneDesign(design));
    setDesign(next);
    setIsDirty(true);
  }, [design]);

  const updateDesignMeta = useCallback(
    (patch: Partial<GardenDesign>, recordHistory = true) => {
      if (readOnly) return;
      applyDesign({ ...design, ...patch }, recordHistory);
    },
    [applyDesign, design, readOnly],
  );

  const loadDesign = useCallback((d: GardenDesign) => {
    historyRef.current = [];
    futureRef.current = [];
    setDesign(cloneDesign(d));
    setSelectedId(null);
    setSelectedType(null);
    setIsDirty(false);
    setPending(null);
    setGhost(null);
  }, []);

  const newDesign = useCallback(() => {
    loadDesign(createEmptyDesign());
  }, [loadDesign]);

  const saveDesign = useCallback(async () => {
    if (!onSave || readOnly) return;
    setIsSaving(true);
    try {
      const id = await onSave(design);
      if (id != null) {
        setDesign((d) => ({ ...d, id }));
      }
      setIsDirty(false);
      toast.success("Design saved!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [design, onSave, readOnly]);

  useEffect(() => {
    if (initialDesign) loadDesign(initialDesign);
  }, [initialDesign, loadDesign]);

  useEffect(() => {
    if (readOnly || !onSave) return;
    const t = window.setInterval(() => {
      if (isDirty && !isSaving) {
        void saveDesign();
      }
    }, 60_000);
    return () => window.clearInterval(t);
  }, [isDirty, isSaving, onSave, readOnly, saveDesign]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (readOnly) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (e.key === "r" || e.key === "R") {
        if (selectedId != null && selectedType) {
          rotateItem(selectedId, selectedType, 45);
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId != null && selectedType) {
          e.preventDefault();
          deleteItem(selectedId, selectedType, selectedType === "structure");
        }
      }
      if (e.key === "Shift") setGridSnap(false);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setGridSnap(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    deleteItem,
    readOnly,
    redo,
    rotateItem,
    selectedId,
    selectedType,
    undo,
  ]);

  const selectedPlant =
    selectedType === "plant"
      ? design.plants.find((p) => p.id === selectedId) ?? null
      : null;
  const selectedStructure =
    selectedType === "structure"
      ? design.structures.find((s) => s.id === selectedId) ?? null
      : null;

  return {
    design,
    selectedId,
    selectedType,
    selectedPlant,
    selectedStructure,
    viewMode,
    setViewMode,
    gridSnap,
    pending,
    setPending,
    ghost,
    setGhost,
    isDirty,
    isSaving,
    readOnly,
    selectItem,
    placePlant,
    placeStructure,
    placeAtGhost,
    moveItem,
    rotateItem,
    scaleItem,
    deleteItem,
    duplicateItem,
    undo,
    redo,
    updateDesignMeta,
    loadDesign,
    newDesign,
    saveDesign,
    setPlotSize: (widthMeters: number, depthMeters: number) =>
      updateDesignMeta({
        widthMeters: clampPlot(widthMeters),
        depthMeters: clampPlot(depthMeters),
      }),
    setGridSize: (gridSizeMeters: number) =>
      updateDesignMeta({ gridSizeMeters }),
    setName: (name: string) => updateDesignMeta({ name }, false),
    setIsPublic: (isPublic: boolean) => updateDesignMeta({ isPublic }),
  };
}

export type GardenDesignerState = ReturnType<typeof useGardenDesigner>;
