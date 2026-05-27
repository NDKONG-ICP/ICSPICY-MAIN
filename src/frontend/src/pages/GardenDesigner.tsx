import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogSidebar } from "@/components/garden/CatalogSidebar";
import { DesignerToolbar } from "@/components/garden/DesignerToolbar";
import { GardenCanvas3D } from "@/components/garden/GardenCanvas3D";
import { CompanionSuggestions } from "@/components/garden/CompanionSuggestions";
import { DesignerStatusBar } from "@/components/garden/DesignerStatusBar";
import { GardenEnvironmentDialog } from "@/components/garden/GardenEnvironmentDialog";
import { GardenLocationPrompt } from "@/components/garden/GardenLocationPrompt";
import { GardenTopDown } from "@/components/garden/GardenTopDown";
import { LoadDesignDialog } from "@/components/garden/LoadDesignDialog";
import { PreviewPanel } from "@/components/garden/PreviewPanel";
import { PropertiesPanel } from "@/components/garden/PropertiesPanel";
import { ValidationPanel } from "@/components/garden/ValidationPanel";
import { YieldEstimator } from "@/components/garden/YieldEstimator";
import { useAuth } from "@/hooks/useAuth";
import { useGardenDesigner } from "@/hooks/useGardenDesigner";
import { useGardenLocation } from "@/hooks/useGardenLocation";
import {
  useGardenDesignLoader,
  useGardenDesignMutations,
  useMyGardenDesigns,
  usePublicGardenDesigns,
} from "@/hooks/useGardenDesigns";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useVarieties } from "@/hooks/useNims";
import type { CameraPresetId, DesignerMode, LayerVisibility } from "@/lib/garden-types";
import { DEFAULT_LAYERS as DEFAULT_LAYER_STATE } from "@/lib/garden-types";
import {
  getCompanionSuggestions,
  type CompanionSuggestion,
} from "@/lib/garden-companions";
import {
  captureCanvasScreenshot,
  downloadSvg,
  exportDesignSvg,
} from "@/lib/garden-export";
import {
  getPlantById,
  loadEnvironment,
  PLANT_CATALOG,
  type GardenEnvironment,
} from "@/lib/garden-plant-catalog";
import { snapToGrid } from "@/lib/garden-utils";
import {
  calculateYieldLocally,
  DEFAULT_NURSERY_COORDS,
  validateGardenLocally,
} from "@/lib/garden-rules";
import { Leaf, Menu } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [growthStage, setGrowthStage] = useState(0.75);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>("sims");
  const [sunCoords, setSunCoords] = useState(DEFAULT_NURSERY_COORDS);
  const [urlDesignId] = useState(() => designIdFromUrl());
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [environment, setEnvironment] = useState<GardenEnvironment>(() => loadEnvironment());
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYER_STATE);
  const [timeOfDayHour, setTimeOfDayHour] = useState(14);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [companions, setCompanions] = useState<CompanionSuggestion[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const gardenLocation = useGardenLocation(design.id);

  useEffect(() => {
    if (gardenLocation.needsPrompt) setLocationPromptOpen(true);
  }, [gardenLocation.needsPrompt]);

  useEffect(() => {
    if (gardenLocation.location && gardenLocation.location.mode !== "skip") {
      setSunCoords({ lat: gardenLocation.location.lat, lng: gardenLocation.location.lng });
    }
  }, [gardenLocation.location]);

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
      setCursorPos({ x, y });
      if (!pending) return;
      setGhost({
        x: snapToGrid(x, design.gridSizeMeters, gridSnap),
        y: snapToGrid(y, design.gridSizeMeters, gridSnap),
      });
    },
    [design.gridSizeMeters, gridSnap, pending, setGhost],
  );

  const handlePlace = useCallback(() => {
    if (!pending || !ghost) return;
    const catalogId = pending.kind === "plant" ? pending.catalogId : undefined;
    const cat = catalogId ? getPlantById(catalogId) : undefined;
    placeAtGhost();
    if (catalogId && cat) {
      setCompanions(
        getCompanionSuggestions(catalogId, design.plants, ghost, PLANT_CATALOG, cat.spacing),
      );
    }
  }, [ghost, pending, placeAtGhost, design.plants]);

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

  const validation = useMemo(
    () => validateGardenLocally(design, varieties),
    [design, varieties],
  );
  const yieldEst = useMemo(
    () => calculateYieldLocally(design, varieties),
    [design, varieties],
  );

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
        previewOpen={previewOpen}
        onPreviewToggle={() => setPreviewOpen((v) => !v)}
        cameraPreset={cameraPreset}
        onCameraPreset={setCameraPreset}
        yieldEstimate={yieldEst}
        locationLabel={gardenLocation.location?.label ?? null}
        onLocationClick={() => setLocationPromptOpen(true)}
        timeOfDayHour={timeOfDayHour}
        onTimeOfDayChange={setTimeOfDayHour}
        onEnvironmentClick={() => setEnvOpen(true)}
        onScreenshot={() => {
          if (canvasRef.current) void captureCanvasScreenshot(canvasRef.current);
          else toast.message("Switch to 3D view for screenshot.");
        }}
        onExportSvg={() => downloadSvg(exportDesignSvg(design), design.name)}
      />

      <GardenEnvironmentDialog
        open={envOpen}
        onOpenChange={setEnvOpen}
        environment={environment}
        onChange={setEnvironment}
      />

      <GardenLocationPrompt
        open={locationPromptOpen}
        address={gardenLocation.addressDraft}
        onAddressChange={gardenLocation.setAddressDraft}
        onGps={() => {
          gardenLocation.chooseGps();
          setLocationPromptOpen(false);
          toast.success("Using GPS location for satellite imagery.");
        }}
        onAddress={async (addr) => {
          const ok = await gardenLocation.chooseAddress(addr);
          if (ok) setLocationPromptOpen(false);
          return ok;
        }}
        onSkip={() => {
          gardenLocation.chooseSkip();
          setLocationPromptOpen(false);
          toast.message("Using stylized ground — no satellite imagery.");
        }}
      />

      {!previewOpen && validation.some((w) => w.severity === "Error") && (
        <div className="px-3 py-1 bg-destructive/10 border-b border-destructive/30 text-xs text-destructive">
          {validation.filter((w) => w.severity === "Error").length} layout error(s) — open Preview for details
        </div>
      )}

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
          layers={layers}
          onLayersChange={setLayers}
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
              pending={pending}
              pendingLabel={pendingLabel}
              readOnly={mode === "view" || previewOpen}
              useProcedural={previewOpen}
              growthStage={growthStage}
              sunLat={sunCoords.lat}
              sunLng={sunCoords.lng}
              showSun={previewOpen}
              satelliteEnabled={gardenLocation.satelliteEnabled}
              gardenLat={gardenLocation.location?.lat}
              gardenLng={gardenLocation.location?.lng}
              cameraPreset={cameraPreset}
              timeOfDayHour={timeOfDayHour}
              layers={layers}
              canvasRef={canvasRef}
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
              satelliteEnabled={gardenLocation.satelliteEnabled}
              gardenLat={gardenLocation.location?.lat}
              gardenLng={gardenLocation.location?.lng}
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

        {previewOpen && (
          <PreviewPanel
            design={design}
            varieties={varieties}
            growthStage={growthStage}
            onGrowthStageChange={setGrowthStage}
            sunLat={sunCoords.lat}
            sunLng={sunCoords.lng}
            onSunCoordsChange={(lat, lng) => setSunCoords({ lat, lng })}
          />
        )}

        {!previewOpen && (
          <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-3 border-l border-border bg-card/40 p-3 overflow-auto">
            <YieldEstimator estimate={yieldEst} />
            <ValidationPanel warnings={validation} />
          </aside>
        )}

        {designer.selectedId != null && !previewOpen && (
          <PropertiesPanel designer={designer} varieties={varieties} mobile />
        )}

        <CompanionSuggestions
          suggestions={companions}
          onDismiss={() => setCompanions([])}
          onAdd={(catalogId) => {
            const p = getPlantById(catalogId);
            if (!p) return;
            setPending({
              kind: "plant",
              catalogId: p.id,
              varietyId: null,
              label: p.name,
              color: p.color,
              icon: p.iconEmoji,
              scoville: p.scovilleMax,
            });
            setCompanions([]);
          }}
        />
      </div>

      <DesignerStatusBar design={design} yieldEstimate={yieldEst} cursor={cursorPos} />

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
