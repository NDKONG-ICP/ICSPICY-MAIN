import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogSidebar } from "@/components/garden/CatalogSidebar";
import { DesignerToolbar } from "@/components/garden/DesignerToolbar";
import { GardenCanvas3D } from "@/components/garden/GardenCanvas3D";
import { GardenTopDown } from "@/components/garden/GardenTopDown";
import { LoadDesignDialog } from "@/components/garden/LoadDesignDialog";
import { PropertiesPanel } from "@/components/garden/PropertiesPanel";
import { useAuth } from "@/hooks/useAuth";
import { useGardenDesigner } from "@/hooks/useGardenDesigner";
import {
  useGardenDesignLoader,
  useGardenDesignMutations,
  useMyGardenDesigns,
  usePublicGardenDesigns,
} from "@/hooks/useGardenDesigns";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useVarieties } from "@/hooks/useNims";
import type { DesignerMode } from "@/lib/garden-types";
import { snapToGrid } from "@/lib/garden-utils";
import { Leaf, Menu } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function designIdFromUrl(): number | null {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get("design");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export default function GardenDesignerPage() {
  usePageTitle("Garden Designer");
  const { isAuthenticated } = useAuth();
  const { data: varieties = [], isLoading: varietiesLoading } = useVarieties();
  const { data: myDesigns = [], refetch: refetchMine } = useMyGardenDesigns();
  const { data: publicDesigns = [] } = usePublicGardenDesigns();
  const loadDesignById = useGardenDesignLoader();
  const { saveMutation } = useGardenDesignMutations();

  const [mode, setMode] = useState<DesignerMode>("edit");
  const [mobileCatalog, setMobileCatalog] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [urlDesignId] = useState(() => designIdFromUrl());

  const onSave = useCallback(
    async (design: Parameters<typeof saveMutation.mutateAsync>[0]) => {
      if (!isAuthenticated) {
        toast.message("Sign in to save designs.");
        throw new Error("Not authenticated");
      }
      return saveMutation.mutateAsync(design);
    },
    [isAuthenticated, saveMutation],
  );

  const designer = useGardenDesigner({
    readOnly: mode === "view",
    onSave: mode === "edit" ? onSave : undefined,
  });

  const {
    design,
    pending,
    setPending,
    ghost,
    setGhost,
    placeAtGhost,
    selectItem,
    loadDesign,
    newDesign,
    viewMode,
    gridSnap,
    moveItem,
    deleteItem,
  } = designer;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPending(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPending]);

  useEffect(() => {
    if (urlDesignId == null) return;
    void (async () => {
      const d = await loadDesignById(urlDesignId);
      if (d) {
        loadDesign(d);
        toast.success(`Loaded "${d.name}"`);
      }
    })();
  }, [loadDesign, loadDesignById, urlDesignId]);

  const handlePointer = useCallback(
    (x: number, y: number) => {
      if (!pending) return;
      setGhost({
        x: snapToGrid(x, design.gridSizeMeters, gridSnap),
        y: snapToGrid(y, design.gridSizeMeters, gridSnap),
      });
    },
    [design.gridSizeMeters, gridSnap, pending, setGhost],
  );

  const handlePlace = useCallback(() => {
    if (pending && ghost) placeAtGhost();
  }, [ghost, pending, placeAtGhost]);

  const handleDelete = useCallback(
    (id: number, type: "plant" | "structure") => {
      deleteItem(id, type, type === "structure");
    },
    [deleteItem],
  );

  const pendingLabel = useMemo(() => {
    if (!pending) return null;
    return pending.kind === "plant" ? pending.label : pending.structureType;
  }, [pending]);

  const browseList = mode === "view" ? publicDesigns : myDesigns;

  const openLoad = () => {
    void refetchMine();
    setLoadOpen(true);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background">
      <DesignerToolbar
        designer={designer}
        mode={mode}
        onModeChange={setMode}
        onLoadClick={openLoad}
        isAuthenticated={isAuthenticated}
      />

      <LoadDesignDialog
        open={loadOpen}
        onOpenChange={setLoadOpen}
        designs={myDesigns}
        onLoad={loadDesign}
        onNew={() => {
          newDesign();
          setLoadOpen(false);
        }}
      />

      {mode === "view" && (
        <div className="border-b border-border px-4 py-2 flex flex-wrap gap-2">
          {browseList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No public designs yet.</p>
          ) : (
            browseList.map((d) => (
              <Button
                key={d.id ?? d.name}
                variant="outline"
                size="sm"
                onClick={() => loadDesign(d)}
              >
                <Leaf className="h-4 w-4 mr-1" />
                {d.name}
              </Button>
            ))
          )}
        </div>
      )}

      <div className="flex flex-1 min-h-0 relative">
        <CatalogSidebar
          varieties={varieties}
          myDesigns={myDesigns}
          readOnly={mode === "view"}
          onPending={setPending}
          onLoadDesign={loadDesign}
          onNewDesign={newDesign}
        />

        <main className="flex flex-1 flex-col min-w-0 p-2 sm:p-3">
          {varietiesLoading ? (
            <Skeleton className="flex-1 min-h-[320px]" />
          ) : viewMode === "3d" ? (
            <GardenCanvas3D
              design={design}
              varieties={varieties}
              selectedId={designer.selectedId}
              selectedType={designer.selectedType}
              ghost={ghost}
              pendingLabel={pendingLabel}
              readOnly={mode === "view"}
              onSelectPlant={(id) => selectItem(id, "plant")}
              onSelectStructure={(id) => selectItem(id, "structure")}
              onPointerMove={handlePointer}
              onPlace={handlePlace}
              onClearSelection={() => selectItem(null, null)}
              onMoveItem={moveItem}
              onDeleteItem={handleDelete}
            />
          ) : (
            <GardenTopDown
              design={design}
              selectedId={designer.selectedId}
              selectedType={designer.selectedType}
              ghost={ghost}
              gridSnap={gridSnap}
              readOnly={mode === "view"}
              onSelectPlant={(id) => selectItem(id, "plant")}
              onSelectStructure={(id) => selectItem(id, "structure")}
              onMove={moveItem}
              onPointerMove={handlePointer}
              onPlace={handlePlace}
              onClearSelection={() => selectItem(null, null)}
              hasPending={!!pending}
              onDeleteItem={handleDelete}
            />
          )}
          {pending && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Click the plot to place · Shift disables grid snap · Esc clears placement
            </p>
          )}
        </main>

        <PropertiesPanel designer={designer} varieties={varieties} />

        {designer.selectedId != null && (
          <PropertiesPanel designer={designer} varieties={varieties} mobile />
        )}
      </div>

      <div className="sm:hidden fixed bottom-4 right-4 z-50 flex gap-2">
        <Button size="icon" onClick={() => setMobileCatalog((v) => !v)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {mobileCatalog && (
        <CatalogSidebar
          varieties={varieties}
          myDesigns={myDesigns}
          readOnly={mode === "view"}
          mobileSheet
          onCloseSheet={() => setMobileCatalog(false)}
          onPending={setPending}
          onLoadDesign={loadDesign}
          onNewDesign={newDesign}
        />
      )}
    </div>
  );
}
