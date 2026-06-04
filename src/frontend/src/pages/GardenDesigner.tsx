import { AiExplanationPanel } from "@/components/garden/AiExplanationPanel";
import { AiGardenPromptBar } from "@/components/garden/AiGardenPromptBar";
import { BottomSheetCatalog } from "@/components/garden/BottomSheetCatalog";
import { CatalogSidebar } from "@/components/garden/CatalogSidebar";
import { CompanionSuggestions } from "@/components/garden/CompanionSuggestions";
import { CostCalculatorPanel } from "@/components/garden/CostCalculatorPanel";
import { DesignerStatusBar } from "@/components/garden/DesignerStatusBar";
import { DesignerToolbar } from "@/components/garden/DesignerToolbar";
import { GardenBetaBanner } from "@/components/garden/GardenBetaBanner";
import { GardenCanvas3D } from "@/components/garden/GardenCanvas3D";
import { GardenEnvironmentDialog } from "@/components/garden/GardenEnvironmentDialog";
import { GardenLocationPicker } from "@/components/garden/GardenLocationPicker";
import {
  BadgeToast,
  GardenOnboardingTour,
} from "@/components/garden/GardenOnboardingTour";
import { GardenTopDown } from "@/components/garden/GardenTopDown";
import { LoadDesignDialog } from "@/components/garden/LoadDesignDialog";
import { MobileActionsSheet } from "@/components/garden/MobileActionsSheet";
import { MobileBottomToolStrip } from "@/components/garden/MobileBottomToolStrip";
import { MobileGardenToolbar } from "@/components/garden/MobileGardenToolbar";
import {
  NewGardenPlotDialog,
  type NewPlotConfig,
} from "@/components/garden/NewGardenPlotDialog";
import { PlantSchedulePanel } from "@/components/garden/PlantSchedulePanel";
import { PreviewPanel } from "@/components/garden/PreviewPanel";
import { ProfessionalToolsBar } from "@/components/garden/ProfessionalToolsBar";
import { PropertiesPanel } from "@/components/garden/PropertiesPanel";
import { SatelliteZoomControls } from "@/components/garden/SatelliteZoomControls";
import { ScenesPanel } from "@/components/garden/ScenesPanel";
import { SeasonalGrowthPanel } from "@/components/garden/SeasonalGrowthPanel";
import { SectionCutPanel } from "@/components/garden/SectionCutPanel";
import { SmartDataPanel } from "@/components/garden/SmartDataPanel";
import { TimelinePanel } from "@/components/garden/TimelinePanel";
import { ValidationPanel } from "@/components/garden/ValidationPanel";
import { YieldEstimator } from "@/components/garden/YieldEstimator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useGardenDesigner } from "@/hooks/useGardenDesigner";
import {
  useGardenDesignLoader,
  useGardenDesignMutations,
  useMyGardenDesigns,
  usePublicGardenDesigns,
} from "@/hooks/useGardenDesigns";
import { useGardenLocation } from "@/hooks/useGardenLocation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useVarieties } from "@/hooks/useNims";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { useWeather } from "@/hooks/useWeather";
import { generateGardenLayout, layoutToDesign } from "@/lib/garden-ai";
import {
  type Badge,
  checkNewBadges,
  loadBadgeStats,
  loadEarnedBadges,
  saveBadgeStats,
  saveEarnedBadges,
} from "@/lib/garden-badges";
import {
  type CompanionSuggestion,
  getCompanionSuggestions,
} from "@/lib/garden-companions";
import {
  captureCanvasScreenshot,
  downloadSvg,
  exportDesignSvg,
} from "@/lib/garden-export";
import {
  downloadLandscapePlan,
  downloadShareCard,
  renderShareCard,
} from "@/lib/garden-plan-export";
import {
  type GardenEnvironment,
  PLANT_CATALOG,
  getPlantById,
  loadEnvironment,
} from "@/lib/garden-plant-catalog";
import {
  DEFAULT_NURSERY_COORDS,
  calculateYieldLocally,
  validateGardenLocally,
} from "@/lib/garden-rules";
import { storeThumbnail } from "@/lib/garden-social";
import { loadToolExtras, saveToolExtras } from "@/lib/garden-tool-state";
import type {
  CameraPresetId,
  DesignerMode,
  GardenDesign,
  GardenToolExtras,
  LayerVisibility,
  MeasurePoint,
} from "@/lib/garden-types";
import { DEFAULT_LAYERS as DEFAULT_LAYER_STATE } from "@/lib/garden-types";
import { createEmptyDesign, snapToGrid } from "@/lib/garden-utils";
import { preloadSatelliteTileUrl } from "@/lib/satellite-texture-cache";
import {
  DEFAULT_SATELLITE_ZOOM,
  clampSatelliteZoom,
} from "@/lib/satellite-tiles";
import { cn } from "@/lib/utils";
import { NURSERY_LAT, NURSERY_LNG } from "@/lib/weather-service";
import { useNavigate } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRavenPerks } from "../hooks/useRavenPerks";

function designIdFromUrl(): number | null {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get("design");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export default function GardenDesignerPage() {
  usePageTitle("Garden Designer");
  const { track, USAGE } = useUsageTracking();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const ravenPerks = useRavenPerks();
  const FREE_PLANT_LIMIT = 20;
  const MEMBER_PLANT_LIMIT = 100;
  const { data: varieties = [], isLoading: varietiesLoading } = useVarieties();
  const { data: myDesigns = [], refetch: refetchMine } = useMyGardenDesigns();
  const { data: publicDesigns = [] } = usePublicGardenDesigns();
  const loadDesignById = useGardenDesignLoader();
  const { saveMutation } = useGardenDesignMutations();

  const [mode, setMode] = useState<DesignerMode>("edit");
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const [satelliteZoom, setSatelliteZoom] = useState(DEFAULT_SATELLITE_ZOOM);
  const [toolExtras, setToolExtras] = useState<GardenToolExtras>(() =>
    loadToolExtras(null),
  );
  const [measureDraft, setMeasureDraft] = useState<MeasurePoint[]>([]);
  const [irrigationDraft, setIrrigationDraft] = useState<MeasurePoint[]>([]);
  const toolIdRef = useRef(1);
  const isMobile = useIsMobile();
  const [loadOpen, setLoadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [growthStage, setGrowthStage] = useState(0.75);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>("sims");
  const [sunCoords, setSunCoords] = useState(DEFAULT_NURSERY_COORDS);
  const [urlDesignId] = useState(() => designIdFromUrl());
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [newPlotOpen, setNewPlotOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [environment, setEnvironment] = useState<GardenEnvironment>(() =>
    loadEnvironment(),
  );
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYER_STATE);
  const [timeOfDayHour, setTimeOfDayHour] = useState(14);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [companions, setCompanions] = useState<CompanionSuggestion[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [lastAiPrompt, setLastAiPrompt] = useState("");
  const [walkMode, setWalkMode] = useState(false);
  const [simulationMonth, setSimulationMonth] = useState<number | null>(null);
  const [growthPanelOpen, setGrowthPanelOpen] = useState(false);
  const [weatherOverlay, setWeatherOverlay] = useState(false);
  const [revealedPlantIds, setRevealedPlantIds] = useState<Set<number> | null>(
    null,
  );
  const [badgeToast, setBadgeToast] = useState<Badge | null>(null);
  const badgeStatsRef = useRef(loadBadgeStats());
  const earnedBadgesRef = useRef(loadEarnedBadges());

  const onSave = useCallback(
    async (design: Parameters<typeof saveMutation.mutateAsync>[0]) => {
      if (!isAuthenticated) {
        toast.message("Sign in to save designs.");
        throw new Error("Not authenticated");
      }
      const result = await saveMutation.mutateAsync(design);
      track(USAGE.GARDEN.SAVE.feature, USAGE.GARDEN.SAVE.action);
      return result;
    },
    [isAuthenticated, saveMutation, track, USAGE.GARDEN.SAVE],
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

  const gardenLat = gardenLocation.location?.lat;
  const gardenLng = gardenLocation.location?.lng;
  const { data: weatherData } = useWeather(
    weatherOverlay ? gardenLat : undefined,
    weatherOverlay ? gardenLng : undefined,
  );

  const awardBadges = useCallback(
    (patch?: Partial<typeof badgeStatsRef.current>) => {
      if (patch) {
        badgeStatsRef.current = { ...badgeStatsRef.current, ...patch };
        saveBadgeStats(badgeStatsRef.current);
      }
      const fresh = checkNewBadges(
        design,
        badgeStatsRef.current,
        earnedBadgesRef.current,
      );
      if (fresh.length > 0) {
        for (const b of fresh) earnedBadgesRef.current.add(b.id);
        saveEarnedBadges(earnedBadgesRef.current);
        setBadgeToast(fresh[0]!);
        window.setTimeout(() => setBadgeToast(null), 3500);
      }
    },
    [design],
  );

  const applyAiLayout = useCallback(
    (fullDesign: GardenDesign, explanation: string) => {
      loadDesign(fullDesign);
      setAiExplanation(explanation);
      setRevealedPlantIds(new Set());
      badgeStatsRef.current = { ...badgeStatsRef.current, aiUsed: true };
      saveBadgeStats(badgeStatsRef.current);
      const ids = fullDesign.plants.map((p) => p.id);
      let i = 0;
      const timer = window.setInterval(() => {
        i += 1;
        setRevealedPlantIds(new Set(ids.slice(0, i)));
        if (i >= ids.length) {
          window.clearInterval(timer);
          setRevealedPlantIds(null);
          awardBadges();
        }
      }, 50);
    },
    [awardBadges, loadDesign],
  );

  const handleAiGenerate = useCallback(
    (
      generated: ReturnType<typeof layoutToDesign>,
      explanation: string,
      prompt: string,
    ) => {
      if (!ravenPerks.hasAiGeneration) {
        toast.error("AI Garden Generation requires Raven Pro (500K $RAVEN). Get $RAVEN on ICPSwap!");
        return;
      }
      setLastAiPrompt(prompt);
      applyAiLayout(generated, explanation);
      track(USAGE.GARDEN.AI_GENERATE.feature, USAGE.GARDEN.AI_GENERATE.action);
      toast.success(`AI placed ${generated.plants.length} plants`);
    },
    [applyAiLayout, ravenPerks.hasAiGeneration, track, USAGE.GARDEN.AI_GENERATE],
  );

  const liveWeatherHour = weatherData ? new Date().getHours() : null;
  const isRaining =
    weatherOverlay && (weatherData?.current.precipitationInches ?? 0) > 0.01;
  const windDirection = weatherOverlay
    ? (weatherData?.current.windDirectionDeg ?? 0) / 360
    : 0;
  const tempTint: "warm" | "cool" | "neutral" =
    weatherOverlay && weatherData
      ? weatherData.current.tempF > 85
        ? "warm"
        : weatherData.current.tempF < 55
          ? "cool"
          : "neutral"
      : "neutral";

  const weatherLabel =
    weatherOverlay && weatherData
      ? `${Math.round(weatherData.current.tempF)}°F · ${weatherData.current.weatherDescription}`
      : "Live Weather";

  useEffect(() => {
    track(USAGE.GARDEN.OPEN.feature, USAGE.GARDEN.OPEN.action, "garden:open");
  }, [track, USAGE.GARDEN.OPEN]);

  useEffect(() => {
    if (pending?.kind === "plant") {
      setLayers((l) => ({ ...l, spacing: true }));
    }
  }, [pending]);

  useEffect(() => {
    if (gardenLocation.needsPrompt) setNewPlotOpen(true);
  }, [gardenLocation.needsPrompt]);

  useEffect(() => {
    const z = gardenLocation.location?.satelliteZoom;
    if (z != null) setSatelliteZoom(z);
  }, [design.id, gardenLocation.location?.satelliteZoom]);

  const handleSatelliteZoomChange = useCallback(
    (z: number) => {
      const clamped = clampSatelliteZoom(z);
      setSatelliteZoom(clamped);
      gardenLocation.updateSatelliteZoom(clamped);
      const lat = gardenLocation.location?.lat;
      const lng = gardenLocation.location?.lng;
      if (lat != null && lng != null && gardenLocation.satelliteEnabled) {
        void preloadSatelliteTileUrl(lat, lng, clamped);
        void preloadSatelliteTileUrl(lat, lng, clampSatelliteZoom(clamped - 1));
        void preloadSatelliteTileUrl(lat, lng, clampSatelliteZoom(clamped + 1));
      }
    },
    [gardenLocation],
  );

  const handleNewPlot = useCallback(
    (config: NewPlotConfig) => {
      const blank = createEmptyDesign();
      blank.name = config.name;
      blank.widthMeters = config.widthMeters;
      blank.depthMeters = config.depthMeters;
      loadDesign(blank);
      setNewPlotOpen(false);
      gardenLocation.dismissPrompt();
      if (config.ground === "blank") {
        gardenLocation.chooseSkip();
        toast.success(
          `Blank ${config.widthMeters}×${config.depthMeters}m plot ready.`,
        );
      } else {
        setLocationPickerOpen(true);
        toast.message("Position your plot on satellite imagery.");
      }
    },
    [gardenLocation, loadDesign],
  );

  useEffect(() => {
    if (gardenLocation.location && gardenLocation.location.mode !== "skip") {
      setSunCoords({
        lat: gardenLocation.location.lat,
        lng: gardenLocation.location.lng,
      });
    }
  }, [gardenLocation.location]);

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

  useEffect(() => {
    awardBadges();
  }, [design.plants.length, design.structures.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const yieldEst = useMemo(
    () => calculateYieldLocally(design, varieties),
    [design, varieties],
  );

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

  const handleScreenshot = useCallback(() => {
    if (!canvasRef.current) {
      toast.message("Switch to 3D view for screenshot.");
      return;
    }
    void captureCanvasScreenshot(canvasRef.current);
    badgeStatsRef.current = {
      ...badgeStatsRef.current,
      screenshots: badgeStatsRef.current.screenshots + 1,
    };
    saveBadgeStats(badgeStatsRef.current);
    awardBadges();
    if (design.id != null) {
      try {
        storeThumbnail(
          design.id,
          canvasRef.current.toDataURL("image/png", 0.7),
        );
      } catch {
        /* ignore */
      }
    }
  }, [awardBadges, design.id]);

  const handleShareCard = useCallback(async () => {
    const shot = canvasRef.current?.toDataURL("image/png") ?? null;
    const card = await renderShareCard(design, shot, yieldEst.estimatedLbsMax);
    downloadShareCard(card, design.name);
    toast.success("Share card downloaded");
  }, [design, yieldEst.estimatedLbsMax]);

  const handlePlace = useCallback(() => {
    if (!pending || !ghost) return;
    // Enforce RAVEN tier plant limits (structures don't count toward limit).
    if (pending.kind === "plant") {
      const plantCount = design.plants.length;
      if (!ravenPerks.hasUnlimitedGarden && !ravenPerks.hasExpandedGarden && plantCount >= FREE_PLANT_LIMIT) {
        toast.error(`Free tier is limited to ${FREE_PLANT_LIMIT} plants. Hold 100K $RAVEN to unlock up to 100!`);
        return;
      }
      if (ravenPerks.hasExpandedGarden && !ravenPerks.hasUnlimitedGarden && plantCount >= MEMBER_PLANT_LIMIT) {
        toast.error(`Raven Member is limited to ${MEMBER_PLANT_LIMIT} plants. Hold 500K $RAVEN for unlimited!`);
        return;
      }
    }
    const catalogId = pending.kind === "plant" ? pending.catalogId : undefined;
    const cat = catalogId ? getPlantById(catalogId) : undefined;
    placeAtGhost();
    if (catalogId && cat) {
      setCompanions(
        getCompanionSuggestions(
          catalogId,
          design.plants,
          ghost,
          PLANT_CATALOG,
          cat.spacing,
        ),
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

  useEffect(() => {
    setToolExtras(loadToolExtras(design.id));
    toolIdRef.current = 1;
  }, [design.id]);

  useEffect(() => {
    saveToolExtras(design.id, toolExtras);
  }, [design.id, toolExtras]);

  const setActiveTool = useCallback((tool: GardenToolExtras["activeTool"]) => {
    setToolExtras((e) => ({ ...e, activeTool: tool }));
    setMeasureDraft([]);
    setIrrigationDraft([]);
  }, []);

  const handleToolClick = useCallback(
    (x: number, y: number) => {
      const gx = snapToGrid(x, design.gridSizeMeters, gridSnap);
      const gy = snapToGrid(y, design.gridSizeMeters, gridSnap);
      const pt = { x: gx, y: gy };
      const id = toolIdRef.current++;

      if (toolExtras.activeTool === "measure") {
        const next = [...measureDraft, pt];
        if (next.length >= 2) {
          setToolExtras((e) => ({
            ...e,
            measurements: [
              ...e.measurements,
              { id, type: "distance", points: [next[0]!, next[1]!] },
            ],
          }));
          setMeasureDraft([]);
          setLayers((l) => ({ ...l, dimensions: true }));
        } else setMeasureDraft(next);
        return;
      }

      if (toolExtras.activeTool === "area") {
        const next = [...measureDraft, pt];
        setMeasureDraft(next);
        return;
      }

      if (toolExtras.activeTool === "note") {
        const text = window.prompt("Note text:");
        if (text?.trim()) {
          setToolExtras((e) => ({
            ...e,
            annotations: [
              ...e.annotations,
              { id, x: gx, y: gy, text: text.trim() },
            ],
          }));
        }
        return;
      }

      if (toolExtras.activeTool === "irrigation") {
        const next = [...irrigationDraft, pt];
        setIrrigationDraft(next);
        if (next.length >= 2) {
          setToolExtras((e) => ({
            ...e,
            irrigationLines: [...e.irrigationLines, { id, points: next }],
          }));
          setIrrigationDraft([]);
          setLayers((l) => ({ ...l, irrigation: true }));
        }
        return;
      }

      if (toolExtras.activeTool === "section") {
        setToolExtras((e) => ({ ...e, sectionCutY: gy }));
        setLayers((l) => ({ ...l, dimensions: true }));
      }
    },
    [
      design.gridSizeMeters,
      gridSnap,
      irrigationDraft,
      measureDraft,
      toolExtras.activeTool,
    ],
  );

  const handlePhotoUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setToolExtras((e) => ({ ...e, sitePhotoUrl: url }));
    };
    input.click();
  }, []);

  const handleExportSvg = useCallback(() => {
    downloadSvg(exportDesignSvg(design), design.name);
  }, [design]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPending(null);
        if (walkMode) setWalkMode(false);
        setActiveTool("none");
        setMeasureDraft([]);
      }
      if (
        e.key === "Enter" &&
        toolExtras.activeTool === "area" &&
        measureDraft.length >= 3
      ) {
        const id = toolIdRef.current++;
        setToolExtras((ex) => ({
          ...ex,
          measurements: [
            ...ex.measurements,
            { id, type: "area", points: measureDraft },
          ],
        }));
        setMeasureDraft([]);
        setLayers((l) => ({ ...l, dimensions: true }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    measureDraft,
    setActiveTool,
    setPending,
    toolExtras.activeTool,
    walkMode,
  ]);

  const openLoad = () => {
    void refetchMine();
    setLoadOpen(true);
  };

  const zoneLabel = environment.usdaZone ?? "10a";

  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        isMobile
          ? "h-[calc(100vh-4rem)] overflow-hidden"
          : "min-h-[calc(100vh-4rem)]",
      )}
    >
      <GardenBetaBanner />
      {!isMobile && (
        <div data-tour="ai-bar">
          <AiGardenPromptBar
            plotWidth={design.widthMeters}
            plotDepth={design.depthMeters}
            zone={zoneLabel}
            generating={aiGenerating}
            onGeneratingChange={setAiGenerating}
            onGenerate={handleAiGenerate}
          />
        </div>
      )}
      {isMobile ? (
        <MobileGardenToolbar
          designer={designer}
          mode={mode}
          onMenuOpen={() => setMobileActionsOpen(true)}
        />
      ) : (
        <DesignerToolbar
          designer={designer}
          mode={mode}
          onModeChange={setMode}
          onLoadClick={openLoad}
          isAuthenticated={isAuthenticated}
          previewOpen={previewOpen}
          onPreviewToggle={() => setPreviewOpen((v) => !v)}
          cameraPreset={cameraPreset}
          onCameraPreset={(p) => {
            setWalkMode(false);
            setCameraPreset(p);
          }}
          walkModeActive={walkMode}
          onWalkMode={() => {
            if (viewMode !== "3d") {
              toast.message("Switch to 3D view for walk mode.");
              return;
            }
            setWalkMode(true);
            setCameraPreset("walk");
            badgeStatsRef.current = { ...badgeStatsRef.current, walked: true };
            saveBadgeStats(badgeStatsRef.current);
            awardBadges();
          }}
          yieldEstimate={yieldEst}
          locationLabel={
            gardenLocation.location?.mode === "skip"
              ? "Plain ground"
              : gardenLocation.location
                ? "Reposition satellite"
                : null
          }
          onLocationClick={() => setLocationPickerOpen(true)}
          timeOfDayHour={timeOfDayHour}
          onTimeOfDayChange={setTimeOfDayHour}
          onEnvironmentClick={() => setEnvOpen(true)}
          onScreenshot={handleScreenshot}
          onExportSvg={handleExportSvg}
          satelliteZoom={satelliteZoom}
          onSatelliteZoomChange={handleSatelliteZoomChange}
          satelliteEnabled={gardenLocation.satelliteEnabled}
          activeTool={toolExtras.activeTool}
          onToolChange={setActiveTool}
          onPhotoUpload={handlePhotoUpload}
          onExportPlan={() => downloadLandscapePlan(design, zoneLabel)}
          onShareCard={() => void handleShareCard()}
          onGalleryClick={() => void navigate({ to: "/garden/gallery" })}
          weatherOverlay={weatherOverlay}
          onWeatherToggle={() => setWeatherOverlay((v) => !v)}
          weatherLabel={weatherLabel}
        />
      )}

      {isMobile && pending && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-red-600/95 text-white text-center py-2 text-sm shadow-lg">
          Tap the canvas to place {pendingLabel ?? "item"} ·{" "}
          <button
            type="button"
            className="underline font-medium"
            onClick={() => setPending(null)}
          >
            Cancel
          </button>
        </div>
      )}

      <MobileActionsSheet
        open={mobileActionsOpen}
        onClose={() => setMobileActionsOpen(false)}
        plotWidth={design.widthMeters}
        plotDepth={design.depthMeters}
        zone={zoneLabel}
        generating={aiGenerating}
        onGeneratingChange={setAiGenerating}
        onGenerate={handleAiGenerate}
        onLocation={() => setLocationPickerOpen(true)}
        onPreview={() => setPreviewOpen(true)}
        onWalk={() => {
          if (viewMode !== "3d") {
            toast.message("Switch to 3D view for walk mode.");
            return;
          }
          setWalkMode(true);
          setCameraPreset("walk");
        }}
        onSave={() => void designer.saveDesign()}
        onLoad={openLoad}
        onShare={() => {
          if (design.id == null)
            toast.message("Save your design before sharing.");
          else
            void navigator.clipboard.writeText(
              `${window.location.origin}/garden?design=${design.id}`,
            );
        }}
        onScreenshot={handleScreenshot}
        onWeather={() => setWeatherOverlay((v) => !v)}
        onEnvironment={() => setEnvOpen(true)}
        onGallery={() => void navigate({ to: "/garden/gallery" })}
        onExportSvg={handleExportSvg}
        onNewPlot={() => setNewPlotOpen(true)}
        design={design}
        yieldEst={yieldEst}
        layers={layers}
        onLayersChange={setLayers}
        weatherOn={weatherOverlay}
        isAuthenticated={isAuthenticated}
      />

      {aiExplanation && (
        <AiExplanationPanel
          explanation={aiExplanation}
          onDismiss={() => setAiExplanation(null)}
          onRegenerate={() => {
            if (!lastAiPrompt) return;
            setAiGenerating(true);
            void generateGardenLayout(
              lastAiPrompt,
              design.widthMeters,
              design.depthMeters,
              zoneLabel,
            )
              .then((layout) =>
                handleAiGenerate(
                  layoutToDesign(layout, design),
                  layout.explanation,
                  lastAiPrompt,
                ),
              )
              .finally(() => setAiGenerating(false));
          }}
        />
      )}

      {badgeToast && (
        <BadgeToast emoji={badgeToast.emoji} title={badgeToast.title} />
      )}
      <GardenOnboardingTour onComplete={() => {}} />

      <GardenEnvironmentDialog
        open={envOpen}
        onOpenChange={setEnvOpen}
        environment={environment}
        onChange={setEnvironment}
      />

      <NewGardenPlotDialog
        open={newPlotOpen}
        onOpenChange={setNewPlotOpen}
        initialName={design.name}
        initialWidth={design.widthMeters}
        initialDepth={design.depthMeters}
        onConfirm={handleNewPlot}
      />

      <GardenLocationPicker
        open={locationPickerOpen}
        initialLat={
          gardenLocation.location?.lat ?? sunCoords.lat ?? NURSERY_LAT
        }
        initialLng={
          gardenLocation.location?.lng ?? sunCoords.lng ?? NURSERY_LNG
        }
        widthMeters={design.widthMeters}
        depthMeters={design.depthMeters}
        onConfirm={(loc) => {
          gardenLocation.setLocation({
            lat: loc.lat,
            lng: loc.lng,
            mode: "gps",
            label: loc.label,
            satelliteZoom: loc.satelliteZoom,
          });
          setSatelliteZoom(loc.satelliteZoom);
          setSunCoords({ lat: loc.lat, lng: loc.lng });
          setLocationPickerOpen(false);
          toast.success("Satellite ground positioned on your plot.");
        }}
        onSkip={() => {
          gardenLocation.chooseSkip();
          setLocationPickerOpen(false);
          toast.message("Using stylized ground — no satellite imagery.");
        }}
      />

      {!previewOpen && validation.some((w) => w.severity === "Error") && (
        <div className="px-3 py-1 bg-destructive/10 border-b border-destructive/30 text-xs text-destructive">
          {validation.filter((w) => w.severity === "Error").length} layout
          error(s) — open Preview for details
        </div>
      )}

      <LoadDesignDialog
        open={loadOpen}
        onOpenChange={setLoadOpen}
        designs={myDesigns}
        onLoad={loadDesign}
        onNew={() => {
          setLoadOpen(false);
          setNewPlotOpen(true);
        }}
      />

      {mode === "view" && (
        <div className="border-b border-border px-4 py-2 flex flex-wrap gap-2">
          {browseList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No public designs yet.
            </p>
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
        {!isMobile && (
          <CatalogSidebar
            varieties={varieties}
            myDesigns={myDesigns}
            readOnly={mode === "view"}
            layers={layers}
            onLayersChange={setLayers}
            onPending={setPending}
            onLoadDesign={loadDesign}
            onNewDesign={() => setNewPlotOpen(true)}
          />
        )}

        <main
          className={cn(
            "flex flex-1 flex-col min-w-0 relative min-h-0",
            isMobile ? "pb-14 flex-1" : "p-2 sm:p-3",
          )}
        >
          {varietiesLoading ? (
            <Skeleton className="flex-1 min-h-0" />
          ) : viewMode === "3d" ? (
            <div className="flex-1 min-h-0 w-full">
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
                satelliteZoom={satelliteZoom}
                cameraPreset={cameraPreset}
                timeOfDayHour={timeOfDayHour}
                layers={layers}
                canvasRef={canvasRef}
                walkMode={walkMode}
                onExitWalk={() => setWalkMode(false)}
                simulationMonth={simulationMonth}
                revealedPlantIds={revealedPlantIds}
                weatherOverlay={weatherOverlay}
                isRaining={isRaining}
                windDirection={windDirection}
                liveWeatherHour={liveWeatherHour}
                tempTint={tempTint}
                onSelectPlant={(id) => selectItem(id, "plant")}
                onSelectStructure={(id) => selectItem(id, "structure")}
                onPointerMove={handlePointer}
                onPlace={handlePlace}
                onClearSelection={() => selectItem(null, null)}
                onMoveItem={moveItem}
                onDeleteItem={handleDelete}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 w-full overflow-auto">
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
                satelliteZoom={satelliteZoom}
                layers={layers}
                toolExtras={toolExtras}
                sunLat={sunCoords.lat}
                sunLng={sunCoords.lng}
                timeOfDayHour={timeOfDayHour}
                pendingCatalogId={
                  pending?.kind === "plant" ? pending.catalogId : null
                }
                onToolClick={handleToolClick}
                onSelectPlant={(id) => selectItem(id, "plant")}
                onSelectStructure={(id) => selectItem(id, "structure")}
                onMove={moveItem}
                onPointerMove={handlePointer}
                onPlace={handlePlace}
                onClearSelection={() => selectItem(null, null)}
                hasPending={!!pending}
                onDeleteItem={handleDelete}
              />
            </div>
          )}
          <SatelliteZoomControls
            zoom={satelliteZoom}
            onZoomChange={handleSatelliteZoomChange}
            visible={
              gardenLocation.satelliteEnabled &&
              (viewMode === "3d" || viewMode === "2d")
            }
          />
          {!isMobile && pending && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Click the plot to place · Shift disables grid snap · Esc clears
              placement
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
            <SeasonalGrowthPanel
              month={simulationMonth ?? new Date().getMonth() + 1}
              onMonthChange={(m) => setSimulationMonth(m)}
              open={growthPanelOpen}
              onOpenChange={(open) => {
                setGrowthPanelOpen(open);
                if (open && simulationMonth == null)
                  setSimulationMonth(new Date().getMonth() + 1);
              }}
            />
            <SmartDataPanel design={design} yieldEst={yieldEst} />
            <PlantSchedulePanel design={design} />
            <TimelinePanel design={design} />
            <ScenesPanel
              scenes={toolExtras.scenes}
              cameraPreset={cameraPreset}
              onAdd={(name, preset) =>
                setToolExtras((e) => ({
                  ...e,
                  scenes: [
                    ...e.scenes,
                    { id: `scene-${Date.now()}`, name, preset },
                  ],
                }))
              }
              onGo={(preset) => {
                setWalkMode(false);
                setCameraPreset(preset);
              }}
              onRemove={(id) =>
                setToolExtras((e) => ({
                  ...e,
                  scenes: e.scenes.filter((s) => s.id !== id),
                }))
              }
            />
            <SectionCutPanel
              design={design}
              cutY={toolExtras.sectionCutY}
              onCutYChange={(y) =>
                setToolExtras((e) => ({ ...e, sectionCutY: y }))
              }
            />
            <YieldEstimator estimate={yieldEst} />
            <CostCalculatorPanel
              design={design}
              yieldLbsMax={yieldEst.estimatedLbsMax}
            />
            <ValidationPanel warnings={validation} />
          </aside>
        )}

        {designer.selectedId != null && !previewOpen && !isMobile && (
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

      {!isMobile && (
        <DesignerStatusBar
          design={design}
          yieldEstimate={yieldEst}
          cursor={cursorPos}
        />
      )}

      {isMobile && (
        <>
          <MobileBottomToolStrip
            activeTool={toolExtras.activeTool}
            onTool={setActiveTool}
            catalogOpen={mobileCatalogOpen}
            onOpenCatalog={() => setMobileCatalogOpen((v) => !v)}
            onQuickCategory={() => setMobileCatalogOpen(true)}
            onSave={() => void designer.saveDesign()}
            readOnly={mode === "view" || previewOpen}
          />
          <BottomSheetCatalog
            readOnly={mode === "view"}
            expanded={mobileCatalogOpen}
            onExpandedChange={setMobileCatalogOpen}
            onPending={(p) => {
              setPending(p);
              if (p) setMobileCatalogOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}
