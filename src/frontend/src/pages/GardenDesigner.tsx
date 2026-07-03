import { AiExplanationPanel } from "@/components/garden/AiExplanationPanel";
import { AiGardenPromptBar } from "@/components/garden/AiGardenPromptBar";
import { CatalogAccordion } from "@/components/garden/CatalogAccordion";
import { CostCalculatorPanel } from "@/components/garden/CostCalculatorPanel";
import { DesignerToolbar } from "@/components/garden/DesignerToolbar";
import { GardenBetaBanner } from "@/components/garden/GardenBetaBanner";
import { GardenCanvas3D } from "@/components/garden/GardenCanvas3D";
import {
  type EntryIntent,
  GardenEntryChoice,
} from "@/components/garden/GardenEntryChoice";
import { GardenEnvironmentDialog } from "@/components/garden/GardenEnvironmentDialog";
import { GardenLocationPicker } from "@/components/garden/GardenLocationPicker";
import {
  BadgeToast,
  GardenOnboardingTour,
} from "@/components/garden/GardenOnboardingTour";
import { GardenSatelliteCanvas } from "@/components/garden/GardenSatelliteCanvas";
import { GardenStatusBar } from "@/components/garden/GardenStatusBar";
import type { GardenCursorReadout } from "@/components/garden/GardenStatusBar";
import { GardenTopBar } from "@/components/garden/GardenTopBar";
import { GardenTopDown } from "@/components/garden/GardenTopDown";
import { LayersPanel } from "@/components/garden/LayersPanel";
import { LoadDesignDialog } from "@/components/garden/LoadDesignDialog";
import { MobileActionsSheet } from "@/components/garden/MobileActionsSheet";
import { MobileBottomToolStrip } from "@/components/garden/MobileBottomToolStrip";
import { MobileFloatingActions } from "@/components/garden/MobileFloatingActions";
import {
  NewGardenPlotDialog,
  type NewPlotConfig,
} from "@/components/garden/NewGardenPlotDialog";
import { PlantSchedulePanel } from "@/components/garden/PlantSchedulePanel";
import { PreviewPanel } from "@/components/garden/PreviewPanel";
import { PropertiesPanel } from "@/components/garden/PropertiesPanel";
import { ScenesPanel } from "@/components/garden/ScenesPanel";
import { SeasonalGrowthPanel } from "@/components/garden/SeasonalGrowthPanel";
import { SectionCutPanel } from "@/components/garden/SectionCutPanel";
import { SmartDataPanel } from "@/components/garden/SmartDataPanel";
import { TimelinePanel } from "@/components/garden/TimelinePanel";
import { ValidationPanel } from "@/components/garden/ValidationPanel";
import { YieldEstimator } from "@/components/garden/YieldEstimator";
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
import { startIcPlantPending } from "@/components/garden/CatalogAccordion";
import {
  type CompanionSuggestion,
  getCompanionSuggestions,
} from "@/lib/garden-companions";
import { CompanionSuggestions } from "@/components/garden/CompanionSuggestions";
import {
  captureCanvasScreenshot,
  downloadSvg,
  exportDesignSvg,
} from "@/lib/garden-export";
import {
  type LatLng,
  polygonMetrics,
  swCornerFromCenter,
} from "@/lib/garden-geo";
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
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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

// ── Boundary persistence (drawn polygon per design) ────────────────────────────
function boundaryKey(id: number | null) {
  return id != null ? `garden-boundary-${id}` : "garden-boundary-draft";
}
function loadBoundary(id: number | null): LatLng[] | null {
  try {
    const raw = localStorage.getItem(boundaryKey(id));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.length >= 3 ? (v as LatLng[]) : null;
  } catch {
    return null;
  }
}
function saveBoundary(id: number | null, b: LatLng[] | null) {
  if (b == null) localStorage.removeItem(boundaryKey(id));
  else localStorage.setItem(boundaryKey(id), JSON.stringify(b));
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
  usePublicGardenDesigns();
  const loadDesignById = useGardenDesignLoader();
  const { saveMutation } = useGardenDesignMutations();

  const [mode, setMode] = useState<DesignerMode>("edit");
  const [satelliteZoom, setSatelliteZoom] = useState(DEFAULT_SATELLITE_ZOOM);
  const [toolExtras, setToolExtras] = useState<GardenToolExtras>(() =>
    loadToolExtras(null),
  );
  const [measureDraft, setMeasureDraft] = useState<MeasurePoint[]>([]);
  const [irrigationDraft, setIrrigationDraft] = useState<MeasurePoint[]>([]);
  const toolIdRef = useRef(1);
  const isMobile = useIsMobile();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [growthStage, setGrowthStage] = useState(0.75);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>("sims");
  const [sunCoords, setSunCoords] = useState(DEFAULT_NURSERY_COORDS);
  const [urlDesignId] = useState(() => designIdFromUrl());
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [newPlotOpen, setNewPlotOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const entryIntentRef = useRef<EntryIntent>("blank");
  const [envOpen, setEnvOpen] = useState(false);
  const [environment, setEnvironment] = useState<GardenEnvironment>(() =>
    loadEnvironment(),
  );
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYER_STATE);
  const [timeOfDayHour, setTimeOfDayHour] = useState(14);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [satCursor, setSatCursor] = useState<GardenCursorReadout | null>(null);
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

  // New layout chrome state.
  const [catalogCollapsed, setCatalogCollapsed] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [boundary, setBoundary] = useState<LatLng[] | null>(null);

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
    placePlant,
    placeStructure,
    selectItem,
    loadDesign,
    viewMode,
    setViewMode,
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

  // Default to the 2D satellite canvas on first mount.
  useEffect(() => {
    setViewMode("2d");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load drawn boundary for the active design.
  useEffect(() => {
    setBoundary(loadBoundary(design.id));
  }, [design.id]);

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
        toast.error(
          "AI Garden Generation requires Raven Pro (500K $RAVEN). Get $RAVEN on ICPSwap!",
        );
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

  // First open with no design → show the entry choice screen (unless a design
  // is being loaded from the URL).
  useEffect(() => {
    if (gardenLocation.needsPrompt && urlDesignId == null) setEntryOpen(true);
  }, [gardenLocation.needsPrompt, urlDesignId]);

  const handleEntryChoice = useCallback((intent: EntryIntent) => {
    entryIntentRef.current = intent;
    setEntryOpen(false);
    setNewPlotOpen(true);
  }, []);

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
      setBoundary(null);
      saveBoundary(null, null);
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
      // AI entry path: open the AI prompt right after sizing the plot.
      if (entryIntentRef.current === "ai") {
        entryIntentRef.current = "blank";
        setProOpen(true);
        toast.message("Describe your dream garden in the AI prompt.");
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

  // Geo for the satellite canvas.
  const center: LatLng = useMemo(() => {
    if (gardenLocation.location && gardenLocation.location.mode !== "skip") {
      return {
        lat: gardenLocation.location.lat,
        lng: gardenLocation.location.lng,
      };
    }
    return { lat: NURSERY_LAT, lng: NURSERY_LNG };
  }, [gardenLocation.location]);

  const swCorner: LatLng = useMemo(() => {
    if (boundary && boundary.length >= 3) return polygonMetrics(boundary).sw;
    return swCornerFromCenter(center, design.widthMeters, design.depthMeters);
  }, [boundary, center, design.widthMeters, design.depthMeters]);

  const satZoomForCanvas = Math.min(21, Math.max(17, satelliteZoom));

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

  const overPlantLimit = useCallback((): boolean => {
    const plantCount = design.plants.length;
    if (
      !ravenPerks.hasUnlimitedGarden &&
      !ravenPerks.hasExpandedGarden &&
      plantCount >= FREE_PLANT_LIMIT
    ) {
      toast.error(
        `Free tier is limited to ${FREE_PLANT_LIMIT} plants. Hold 100K $RAVEN to unlock up to 100!`,
      );
      return true;
    }
    if (
      ravenPerks.hasExpandedGarden &&
      !ravenPerks.hasUnlimitedGarden &&
      plantCount >= MEMBER_PLANT_LIMIT
    ) {
      toast.error(
        `Raven Member is limited to ${MEMBER_PLANT_LIMIT} plants. Hold 500K $RAVEN for unlimited!`,
      );
      return true;
    }
    return false;
  }, [
    design.plants.length,
    ravenPerks.hasExpandedGarden,
    ravenPerks.hasUnlimitedGarden,
  ]);

  const offerCompanions = useCallback(
    (catalogId: string | undefined, at: { x: number; y: number }) => {
      if (!catalogId) return;
      const cat = getPlantById(catalogId);
      if (!cat) return;
      setCompanions(
        getCompanionSuggestions(
          catalogId,
          design.plants,
          at,
          PLANT_CATALOG,
          cat.spacing,
        ),
      );
    },
    [design.plants],
  );

  // Place on the SVG/3D ghost path (GardenTopDown / 3D).
  const handlePlace = useCallback(() => {
    if (!pending || !ghost) return;
    if (pending.kind === "plant" && overPlantLimit()) return;
    const catalogId = pending.kind === "plant" ? pending.catalogId : undefined;
    placeAtGhost();
    offerCompanions(catalogId, ghost);
  }, [ghost, pending, placeAtGhost, overPlantLimit, offerCompanions]);

  // Place directly at metre coordinates (satellite canvas).
  const handleSatellitePlace = useCallback(
    (east: number, north: number) => {
      if (!pending) return;
      if (pending.kind === "plant") {
        if (overPlantLimit()) return;
        placePlant(
          {
            varietyId: pending.varietyId,
            catalogId: pending.catalogId,
            label: pending.label,
            color: pending.color,
            icon: pending.icon,
            scoville: pending.scoville,
          },
          east,
          north,
        );
        offerCompanions(pending.catalogId, { x: east, y: north });
      } else {
        placeStructure(
          pending.structureType,
          pending.width,
          pending.depth,
          pending.color,
          east,
          north,
        );
      }
    },
    [pending, overPlantLimit, placePlant, placeStructure, offerCompanions],
  );

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
        setMeasureDraft((d) => [...d, pt]);
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
  }, [measureDraft, setActiveTool, setPending, toolExtras.activeTool, walkMode]);

  const openLoad = () => {
    void refetchMine();
    setLoadOpen(true);
  };

  const zoneLabel = environment.usdaZone ?? "10a";

  // Unified cursor readout for the status bar.
  const statusCursor: GardenCursorReadout | null = useMemo(() => {
    if (satCursor) return satCursor;
    if (cursorPos) {
      return { east: cursorPos.x, north: cursorPos.y, lat: 0, lng: 0 };
    }
    return null;
  }, [satCursor, cursorPos]);

  const gridMeters = layers.grid ? design.gridSizeMeters : null;

  const Canvas2D = gardenLocation.satelliteEnabled ? (
    <GardenSatelliteCanvas
      design={design}
      swCorner={swCorner}
      center={center}
      zoom={satZoomForCanvas}
      boundary={boundary}
      selectedId={designer.selectedId}
      selectedType={designer.selectedType}
      pending={pending}
      gridOn={layers.grid}
      readOnly={mode === "view"}
      onPlaceAt={handleSatellitePlace}
      onSelectPlant={(id) => selectItem(id, "plant")}
      onSelectStructure={(id) => selectItem(id, "structure")}
      onMoveItem={(id, type, e, n) => moveItem(id, type, e, n)}
      onClearSelection={() => selectItem(null, null)}
      onCursor={setSatCursor}
      onZoomChange={(z) => setSatelliteZoom(clampSatelliteZoom(z))}
    />
  ) : (
    <div className="h-full w-full overflow-auto">
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
        pendingCatalogId={pending?.kind === "plant" ? pending.catalogId : null}
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
  );

  return (
    <div className="garden-designer relative flex h-[calc(100vh-4rem)] flex-col overflow-hidden text-[color:var(--garden-text)]">
      <GardenTopBar
        title={design.name}
        onBack={() => void navigate({ to: "/" })}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        gridOn={layers.grid}
        onToggleGrid={() => setLayers((l) => ({ ...l, grid: !l.grid }))}
        measureActive={toolExtras.activeTool === "measure"}
        onToggleMeasure={() =>
          setActiveTool(
            toolExtras.activeTool === "measure" ? "none" : "measure",
          )
        }
        onLocation={() => setLocationPickerOpen(true)}
        onSave={() => void designer.saveDesign()}
        isSaving={designer.isSaving}
        isDirty={designer.isDirty}
        canSave={isAuthenticated && mode === "edit"}
        onExport={() => downloadLandscapePlan(design, zoneLabel)}
        onAi={() => {
          if (!ravenPerks.hasAiGeneration) {
            toast.error(
              "AI Garden Generation requires Raven Pro (500K $RAVEN).",
            );
          }
          setProOpen(true);
        }}
        hasAiGeneration={ravenPerks.hasAiGeneration}
        onOpenProTools={() => setProOpen(true)}
      />

      <GardenBetaBanner />

      {isMobile && pending && (
        <div className="bg-red-600/95 px-3 py-2 text-center text-sm text-white">
          Tap the canvas to place {pendingLabel ?? "item"} ·{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => setPending(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* pb-14 on mobile keeps the canvas clear of the fixed bottom strip */}
      <div className="flex min-h-0 flex-1 pb-14 sm:pb-0">
        {/* Left — catalog sidebar */}
        {!isMobile && mode === "edit" && (
          <aside
            className={cn(
              "flex shrink-0 flex-col border-r border-[color:var(--garden-border)] bg-[color:var(--garden-surface)] transition-[width] duration-200",
              catalogCollapsed ? "w-7" : "w-[280px]",
            )}
          >
            <button
              type="button"
              onClick={() => setCatalogCollapsed((v) => !v)}
              title={catalogCollapsed ? "Expand catalog" : "Collapse catalog"}
              className="flex h-8 items-center justify-center border-b border-[color:var(--garden-border)] text-[color:var(--garden-text-muted)] hover:text-[color:var(--garden-text)]"
            >
              {catalogCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <span className="flex w-full items-center justify-between px-3 text-[11px] uppercase tracking-widest garden-font-display">
                  Catalog <ChevronLeft className="h-4 w-4" />
                </span>
              )}
            </button>
            {!catalogCollapsed && (
              <div className="flex-1 overflow-y-auto p-3">
                <CatalogAccordion
                  readOnly={false}
                  onPending={setPending}
                  varieties={varieties}
                  onIcPlant={(v) => setPending(startIcPlantPending(v))}
                />
              </div>
            )}
          </aside>
        )}

        {/* Center — canvas */}
        <main className="relative flex min-w-0 flex-1 flex-col bg-[color:var(--garden-bg)]">
          {varietiesLoading ? (
            <Skeleton className="m-3 flex-1" />
          ) : (
            <>
              {/* Both views stay mounted; we toggle visibility via CSS so the 3D
                  camera/OrbitControls state and the Leaflet map size survive
                  every 2D↔3D switch (no remount, no reset). */}
              <div
                className="p-2"
                style={{
                  position: "absolute",
                  inset: 0,
                  visibility: viewMode === "3d" ? "visible" : "hidden",
                  pointerEvents: viewMode === "3d" ? "auto" : "none",
                  zIndex: viewMode === "3d" ? 1 : 0,
                }}
              >
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
                onPlaceAt={handleSatellitePlace}
                onSetBrush={setPending}
                onOpenCatalog={() => setCatalogOpen(true)}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  visibility: viewMode !== "3d" ? "visible" : "hidden",
                  pointerEvents: viewMode !== "3d" ? "auto" : "none",
                  zIndex: viewMode !== "3d" ? 1 : 0,
                }}
              >
                {Canvas2D}
              </div>
            </>
          )}
        </main>

        {/* Right — properties */}
        {!isMobile && (
          <aside
            className={cn(
              "flex shrink-0 flex-col border-l border-[color:var(--garden-border)] bg-[color:var(--garden-surface)] transition-[width] duration-200",
              propsCollapsed ? "w-7" : "w-[300px]",
            )}
          >
            <button
              type="button"
              onClick={() => setPropsCollapsed((v) => !v)}
              title={propsCollapsed ? "Expand properties" : "Collapse"}
              className="flex h-8 items-center justify-center border-b border-[color:var(--garden-border)] text-[color:var(--garden-text-muted)] hover:text-[color:var(--garden-text)]"
            >
              {propsCollapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <span className="flex w-full items-center justify-between px-3 text-[11px] uppercase tracking-widest garden-font-display">
                  <ChevronRight className="h-4 w-4" /> Properties
                </span>
              )}
            </button>
            {!propsCollapsed && (
              <div className="min-h-0 flex-1">
                <PropertiesPanel designer={designer} varieties={varieties} />
              </div>
            )}
          </aside>
        )}
      </div>

      {!isMobile && (
        <GardenStatusBar
          plantCount={design.plants.length}
          structureCount={design.structures.length}
          widthMeters={design.widthMeters}
          depthMeters={design.depthMeters}
          center={gardenLocation.satelliteEnabled ? center : null}
          cursor={statusCursor}
          zoom={gardenLocation.satelliteEnabled ? satZoomForCanvas : null}
          gridMeters={gridMeters}
        />
      )}

      {/* Mobile bottom strip: quick categories + catalog toggle (56px) */}
      {isMobile && mode === "edit" && !catalogOpen && (
        <MobileBottomToolStrip
          activeTool={toolExtras.activeTool}
          onTool={setActiveTool}
          onOpenCatalog={() => setCatalogOpen(true)}
          catalogOpen={catalogOpen}
          onQuickCategory={() => setCatalogOpen(true)}
          onSave={() => void designer.saveDesign()}
          readOnly={mode !== "edit"}
        />
      )}

      {/* Mobile floating actions for the selected item (rotate/scale/dup/del) */}
      {isMobile && mode === "edit" && (
        <MobileFloatingActions designer={designer} readOnly={false} />
      )}

      {/* Mobile catalog bottom sheet */}
      {isMobile && mode === "edit" && (
        <MobileActionsSheet
          readOnly={false}
          varieties={varieties}
          onPending={setPending}
          onIcPlant={(v) => setPending(startIcPlantPending(v))}
          open={catalogOpen}
          onOpenChange={setCatalogOpen}
        />
      )}

      {/* Entry choice — first open with no design */}
      <GardenEntryChoice
        open={entryOpen}
        savedDesigns={myDesigns}
        onChoose={handleEntryChoice}
        onLoadDesign={(d) => {
          setEntryOpen(false);
          gardenLocation.dismissPrompt();
          loadDesign(d);
          toast.success(`Loaded "${d.name}"`);
        }}
      />

      {/* ── Pro tools drawer ──────────────────────────────────────────────── */}
      {proOpen && (
        <>
          <button
            type="button"
            aria-label="Close pro tools"
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={() => setProOpen(false)}
          />
          <aside className="garden-panel-enter fixed right-0 top-0 z-[61] flex h-full w-full max-w-[400px] flex-col gap-3 overflow-y-auto border-l border-[color:var(--garden-border)] bg-[color:var(--garden-surface)] p-3 shadow-[var(--garden-shadow)]">
            <div className="flex items-center justify-between">
              <h2 className="garden-font-display text-sm font-bold">
                Pro Tools
              </h2>
              <button
                type="button"
                title="Close pro tools"
                aria-label="Close pro tools"
                onClick={() => setProOpen(false)}
                className="rounded-md p-1 text-[color:var(--garden-text-muted)] hover:text-[color:var(--garden-text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <AiGardenPromptBar
              plotWidth={design.widthMeters}
              plotDepth={design.depthMeters}
              zone={zoneLabel}
              generating={aiGenerating}
              onGeneratingChange={setAiGenerating}
              onGenerate={handleAiGenerate}
            />

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
                badgeStatsRef.current = {
                  ...badgeStatsRef.current,
                  walked: true,
                };
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

            <LayersPanel layers={layers} onChange={setLayers} />
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
        </>
      )}

      {/* ── Overlays & dialogs ────────────────────────────────────────────── */}
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
              .then((layout) => {
                try {
                  handleAiGenerate(
                    layoutToDesign(layout, design),
                    layout.explanation,
                    lastAiPrompt,
                  );
                } catch (e) {
                  console.error("AI layout apply failed:", e);
                  toast.error("AI layout failed — try a different prompt.");
                }
              })
              .catch((e) => {
                console.error("AI generation failed:", e);
                toast.error("AI generation failed. Please try again.");
              })
              .finally(() => setAiGenerating(false));
          }}
        />
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
        initialGround={
          entryIntentRef.current === "satellite" ? "satellite" : "blank"
        }
        onConfirm={handleNewPlot}
      />

      <GardenLocationPicker
        open={locationPickerOpen}
        initialLat={gardenLocation.location?.lat ?? sunCoords.lat ?? NURSERY_LAT}
        initialLng={gardenLocation.location?.lng ?? sunCoords.lng ?? NURSERY_LNG}
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
          if (loc.boundary && loc.widthMeters && loc.depthMeters) {
            designer.setPlotSize(loc.widthMeters, loc.depthMeters);
            setBoundary(loc.boundary);
            saveBoundary(design.id, loc.boundary);
          } else {
            setBoundary(null);
            saveBoundary(design.id, null);
          }
          setLocationPickerOpen(false);
          toast.success("Satellite ground positioned on your plot.");
        }}
        onSkip={() => {
          gardenLocation.chooseSkip();
          setBoundary(null);
          saveBoundary(design.id, null);
          setLocationPickerOpen(false);
          toast.message("Using stylized ground — no satellite imagery.");
        }}
      />

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
    </div>
  );
}
