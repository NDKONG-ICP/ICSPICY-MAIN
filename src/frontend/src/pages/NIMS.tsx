import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Droplets,
  Leaf,
  Loader2,
  Package,
  Plus,
  Skull,
  Sprout,
  Trash2,
  Users,
  Wheat,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { TransplantInput } from "../backend";
import {
  ActivityFeed,
  AddPlantModal,
  AdoptPlantPrompt,
  GerminationModal,
  GraveyardPanel,
  MarkDeadModal,
  NewTrayModal,
  NimsAnalyticsPanel,
  NimsHeroStats,
  NimsLandingPage,
  NimsLocationPrompt,
  NimsLocationSelector,
  PlantLifecycleCard,
  PlantSeedModal,
  RegisterPlantBatchModal,
  RemovePlantModal,
  SeedBankPanel,
  TransplantModal,
  TransplantedCellModal,
  TrayGrid,
  WeatherBar,
} from "../components/nims";
import type {
  ContainerSize,
  DeathCause,
  RegisterPlantBatchResult,
  TrayCellPublic,
} from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";
import { useAutoWeatherCapture } from "../hooks/useAutoWeatherCapture";
import { useIsAdmin, useMyTrays, useTrays } from "../hooks/useBackend";
import { useTransplantCell } from "../hooks/useBackend";
import {
  useAddPlant,
  useAddVariety,
  useAdminInventory,
  useMyPlantsNims,
  useRemovePlant,
  useVarieties,
} from "../hooks/useNims";
import {
  useActivityFeed,
  useAdoptPurchasedPlant,
  useCreateNimsTray,
  useGerminatePlant,
  useListGraveyard,
  useMarkCellDead,
  useMarkCellGerminated,
  useNimsDashboardStats,
  usePlantSeed,
  useRegisterPlantBatch,
  useTrayGrid,
  useWaterEntireTray,
} from "../hooks/useNimsDashboard";
import { useNimsLocation } from "../hooks/useNimsLocation";
import { useUploadNimsPhoto } from "../hooks/useNimsPhotoUpload";
import { Seo } from "../components/Seo";
import { staticRouteSeo } from "../lib/seo-routes.mjs";
import { useUnadoptedNftTokenIds } from "../hooks/useUnadoptedNfts";
import { useUsageTracking } from "../hooks/useUsageTracking";
import { useWeather } from "../hooks/useWeather";
import { exportPlantInventoryCsv } from "../lib/nims-export-mappers";
import { downloadTextFile, plantTagLinksCsv } from "../lib/plant-nfc-url";
import { useEffectiveRavenPerks, useCoopStatus } from "../hooks/useCoopStatus";
import {
  GrowerOnboardingWizard,
  CoopPitchCard,
} from "../components/coop/GrowerOnboardingWizard";

type NimsTab =
  | "trays"
  | "inventory"
  | "seedbank"
  | "activity"
  | "analytics"
  | "myplants"
  | "graveyard";

function cellPositionLabel(pos: bigint): string {
  const n = Number(pos);
  const row = Math.ceil(n / 12);
  const col = String.fromCharCode(65 + ((n - 1) % 12));
  return `${col}${row}`;
}

function unwrapOpt<T>(opt: [] | [T]): T | undefined {
  return opt.length > 0 ? opt[0] : undefined;
}

function cellStatusKey(cell: TrayCellPublic): string {
  const s = cell.status;
  if ("Empty" in s) return "empty";
  if ("Planted" in s) return "planted";
  if ("Germinated" in s) return "germinated";
  if ("Dead" in s) return "dead";
  return "transplanted";
}

function formatMsAgo(ms: bigint | undefined): string {
  if (ms == null) return "—";
  const sec = Number(ms) / 1000;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

const NIMS_ROUTE_SEO = staticRouteSeo("/nims");
const NIMS_SEO = (
  <Seo
    title={NIMS_ROUTE_SEO.title}
    description={NIMS_ROUTE_SEO.description}
    path="/nims"
    jsonLd={NIMS_ROUTE_SEO.jsonLd ?? undefined}
  />
);

export default function NIMSPage() {
  const { track, USAGE } = useUsageTracking();

  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const ravenPerks = useEffectiveRavenPerks();
  const { isSeatHolder, growerName, needsOnboarding } = useCoopStatus();
  const [onboardingDone, setOnboardingDone] = useState(false);
  const nimsLocation = useNimsLocation();
  const { data: weather, isLoading: weatherLoading } = useWeather(
    nimsLocation.coordinates.lat,
    nimsLocation.coordinates.lng,
  );
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const { data: stats, isLoading: statsLoading } = useNimsDashboardStats();
  const { data: myTrays = [], isLoading: myTraysLoading } = useMyTrays();
  const { data: allTrays = [], isLoading: allTraysLoading } = useTrays();
  const trays = isAdmin && showAllUsers ? allTrays : myTrays;
  const traysLoading =
    isAdmin && showAllUsers ? allTraysLoading : myTraysLoading;
  const { data: varieties = [] } = useVarieties();
  const { data: myPlants = [] } = useMyPlantsNims();
  useAutoWeatherCapture(myPlants, weather, isAuthenticated);
  const { data: adminInventory = [] } = useAdminInventory(
    undefined,
    undefined,
    undefined,
  );
  const { data: activity = [] } = useActivityFeed(40);
  const { data: graveyardPlants = [], isLoading: graveyardLoading } =
    useListGraveyard();
  const { data: unadoptedIds = [], dismissUnadoptedNft } =
    useUnadoptedNftTokenIds();
  const adoptPlant = useAdoptPurchasedPlant();
  const createTray = useCreateNimsTray();
  const addPlant = useAddPlant();
  const addVariety = useAddVariety();
  const removePlant = useRemovePlant();
  const [removeTarget, setRemoveTarget] = useState<{
    plantId: bigint;
    label: string;
  } | null>(null);
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [newTrayOpen, setNewTrayOpen] = useState(false);
  const [addPlantOpen, setAddPlantOpen] = useState(false);
  const [prefillVarietyId, setPrefillVarietyId] = useState<bigint | null>(null);
  const adoptPromptedRef = useRef<string | null>(null);

  const defaultTab: NimsTab = "trays";
  const [tab, setTab] = useState<NimsTab>(defaultTab);
  const [selectedTrayId, setSelectedTrayId] = useState<bigint | null>(null);

  const activeTrayId = selectedTrayId ?? trays[0]?.id ?? null;
  const { data: trayCells = [], isLoading: gridLoading } =
    useTrayGrid(activeTrayId);

  const plantSeed = usePlantSeed();
  const registerPlantBatch = useRegisterPlantBatch();
  const markGerminated = useMarkCellGerminated();
  const germinatePlant = useGerminatePlant();
  const markDead = useMarkCellDead();
  const waterTray = useWaterEntireTray();
  const transplantCell = useTransplantCell();
  const uploadPhoto = useUploadNimsPhoto();

  const [selectedCell, setSelectedCell] = useState<bigint | null>(null);
  const [seedOpen, setSeedOpen] = useState(false);
  const [germOpen, setGermOpen] = useState(false);
  const [deadOpen, setDeadOpen] = useState(false);
  const [transplantOpen, setTransplantOpen] = useState(false);
  const [transplantedOpen, setTransplantedOpen] = useState(false);
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(() => new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchResult, setBatchResult] = useState<RegisterPlantBatchResult | null>(
    null,
  );

  const canRegisterProvenance = Boolean(isAdmin || isSeatHolder);

  const selectedCellData = useMemo(
    () => trayCells.find((c) => c.position === selectedCell),
    [trayCells, selectedCell],
  );

  const inventoryList = isAdmin && showAllUsers ? adminInventory : myPlants;

  useEffect(() => {
    track(USAGE.NIMS.OPEN.feature, USAGE.NIMS.OPEN.action, "nims:open");
  }, [track, USAGE.NIMS.OPEN]);

  const adoptTokenId = unadoptedIds[0] ?? null;

  useEffect(() => {
    if (!isAuthenticated || adoptTokenId == null) {
      setAdoptOpen(false);
      adoptPromptedRef.current = null;
      return;
    }
    const id = adoptTokenId.toString();
    if (adoptPromptedRef.current !== id) {
      adoptPromptedRef.current = id;
      setAdoptOpen(true);
    }
  }, [adoptTokenId, isAuthenticated]);

  const openMarkDead = () => {
    setGermOpen(false);
    setTransplantOpen(false);
    setDeadOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <>
        {NIMS_SEO}
        <NimsLandingPage onLogin={login} />
      </>
    );
  }

  const handleCellClick = (position: bigint) => {
    if (batchSelectMode) {
      const key = position.toString();
      setSelectedCells((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      return;
    }
    setSelectedCell(position);
    const cell = trayCells.find((c) => c.position === position);
    const status = cell ? cellStatusKey(cell) : "empty";
    if (status === "empty") setSeedOpen(true);
    else if (status === "planted") setGermOpen(true);
    else if (status === "germinated") setTransplantOpen(true);
    else if (status === "dead") toast.info("This cell is marked dead.");
    else if (status === "transplanted") setTransplantedOpen(true);
    else toast.info("Plant was transplanted to inventory.");
  };

  const tabs: { id: NimsTab; label: string; icon: typeof Leaf }[] = [
    { id: "trays", label: "Trays", icon: Sprout },
    { id: "seedbank", label: "Seed Bank", icon: Wheat },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "graveyard", label: "Graveyard", icon: Skull },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "myplants", label: "My Plants", icon: Leaf },
  ];

  const visibleTabs = tabs;

  return (
    <div className="min-h-screen pb-24" data-ocid="nims-dashboard">
      {NIMS_SEO}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <WeatherBar
          data={weather}
          isLoading={weatherLoading}
          locationLabel={nimsLocation.coordinates.label}
          lat={nimsLocation.coordinates.lat}
          lng={nimsLocation.coordinates.lng}
          locationPreference={nimsLocation.preference}
          onChooseGps={nimsLocation.chooseGps}
          onChooseNursery={nimsLocation.chooseDefault}
          expanded={weatherExpanded}
          onExpandedChange={setWeatherExpanded}
        />
      </div>

      <div className="container max-w-2xl px-3 py-4 space-y-4">
        {needsOnboarding && !onboardingDone ? (
          <GrowerOnboardingWizard onComplete={() => setOnboardingDone(true)} />
        ) : null}

        <NimsHeroStats plants={myPlants} />
        <CoopPitchCard isSeatHolder={isSeatHolder} />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-display font-bold">NIMS</h1>
            {isSeatHolder && (
              <span className="text-xs rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-emerald-300">
                🌱 Co-op Grower{growerName ? ` · ${growerName}` : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                variant={showAllUsers ? "default" : "outline"}
                className="text-xs"
                onClick={() => setShowAllUsers((v) => !v)}
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                {showAllUsers ? "All users" : "My trays"}
              </Button>
            )}
            <NimsLocationSelector
              preference={nimsLocation.preference}
              onChooseGps={nimsLocation.chooseGps}
              onChooseNursery={nimsLocation.chooseDefault}
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setNewTrayOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> New tray
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAddPlantOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Add plant
          </Button>
        </div>

        {statsLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : stats ? (
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <p className="text-lg font-bold text-primary">
                {stats.totalPlants.toString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Total plants</p>
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <p className="text-lg font-bold text-emerald-400">
                {stats.germinatedToday.toString()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Germinated today
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <p className="text-lg font-bold text-amber-400">
                {stats.needsAttention.toString()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Needs attention
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <p className="text-lg font-bold text-cyan-400">
                {formatMsAgo(stats.lastWateredMsAgo[0])}
              </p>
              <p className="text-[10px] text-muted-foreground">Last watered</p>
            </div>
          </div>
        ) : null}

        <div className="flex gap-1 overflow-x-auto pb-1">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? "default" : "outline"}
              className="shrink-0 text-xs"
              onClick={() => setTab(id)}
              data-ocid={`nims-tab-${id}`}
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              {label}
            </Button>
          ))}
        </div>

        {tab === "trays" && (
          <div className="space-y-3">
            {traysLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : trays.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No trays yet. Tap <strong>New tray</strong> to start a 72-cell
                germination grid.
              </p>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {trays.map((tray) => (
                    <Button
                      key={tray.id.toString()}
                      size="sm"
                      variant={
                        activeTrayId === tray.id ? "default" : "secondary"
                      }
                      onClick={() => setSelectedTrayId(tray.id)}
                    >
                      {tray.name}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!activeTrayId || waterTray.isPending}
                    onClick={async () => {
                      if (!activeTrayId) return;
                      try {
                        const n = await waterTray.mutateAsync({
                          trayId: activeTrayId,
                          amountMl: 8n,
                        });
                        toast.success(`Watered ${n.toString()} plants`);
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Water failed",
                        );
                      }
                    }}
                  >
                    {waterTray.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Droplets className="h-4 w-4 mr-1" />
                    )}
                    Water tray
                  </Button>
                  {canRegisterProvenance && (
                    <>
                      <Button
                        size="sm"
                        variant={batchSelectMode ? "default" : "outline"}
                        onClick={() => {
                          setBatchSelectMode((v) => {
                            if (v) setSelectedCells(new Set());
                            return !v;
                          });
                        }}
                      >
                        {batchSelectMode ? "Done selecting" : "Batch register"}
                      </Button>
                      {batchSelectMode && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={selectedCells.size === 0}
                            onClick={() => setBatchModalOpen(true)}
                          >
                            Register {selectedCells.size} cell
                            {selectedCells.size !== 1 ? "s" : ""}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => {
                              const empty = trayCells
                                .filter((c) => cellStatusKey(c) === "empty")
                                .map((c) => c.position.toString());
                              setSelectedCells(new Set(empty));
                            }}
                          >
                            Select empty
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => {
                              const anchor =
                                selectedCells.size > 0
                                  ? Number([...selectedCells][0])
                                  : selectedCell != null
                                    ? Number(selectedCell)
                                    : null;
                              if (anchor == null || Number.isNaN(anchor)) {
                                toast.info("Tap a cell first to pick its row");
                                return;
                              }
                              const row = Math.ceil(anchor / 12);
                              const rowCells = Array.from(
                                { length: 12 },
                                (_, i) => String((row - 1) * 12 + i + 1),
                              );
                              setSelectedCells(new Set(rowCells));
                            }}
                          >
                            Select row
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => setSelectedCells(new Set())}
                          >
                            Clear
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {batchSelectMode && (
                  <p className="text-xs text-muted-foreground">
                    Tap cells to select · {selectedCells.size} selected · each
                    gets its own provenance NFT
                  </p>
                )}

                {gridLoading ? (
                  <Skeleton className="aspect-[6/12] w-full" />
                ) : (
                  <TrayGrid
                    cells={trayCells}
                    onCellClick={handleCellClick}
                    selectionMode={batchSelectMode}
                    selectedCells={selectedCells}
                  />
                )}
              </>
            )}
          </div>
        )}

        {(tab === "inventory" || tab === "myplants") && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!ravenPerks.hasCsvExport && !isAdmin) {
                    toast.error(
                      "CSV export requires Raven Member or a Grower Co-op seat.",
                    );
                    return;
                  }
                  const list =
                    tab === "myplants" || !(isAdmin && showAllUsers)
                      ? myPlants
                      : inventoryList;
                  exportPlantInventoryCsv(list, isAdmin && showAllUsers);
                  toast.success("Inventory CSV downloaded");
                }}
              >
                📥 Export CSV
              </Button>
              {isAdmin &&
                showAllUsers &&
                tab === "inventory" &&
                inventoryList.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const csv = plantTagLinksCsv(
                        inventoryList.map((lc) => ({
                          plantId: lc.plant.id,
                          variety: lc.plant.variety,
                        })),
                      );
                      downloadTextFile(
                        `icspicy-plant-tags-${new Date().toISOString().slice(0, 10)}.csv`,
                        csv,
                      );
                      toast.success("Tag links CSV downloaded");
                    }}
                  >
                    Generate tag links (CSV)
                  </Button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(tab === "myplants" || !(isAdmin && showAllUsers)
                ? myPlants
                : inventoryList
              ).length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                  {tab === "myplants" || !(isAdmin && showAllUsers)
                    ? "No plants in your garden yet. Add a plant or adopt a purchased NFT."
                    : "No inventory plants yet."}
                </p>
              ) : (
                (tab === "myplants" || !(isAdmin && showAllUsers)
                  ? myPlants
                  : inventoryList
                ).map((lc) => (
                  <div key={lc.plant.id.toString()} className="relative group">
                    <Link
                      to="/plant/$plantId"
                      params={{ plantId: lc.plant.id.toString() }}
                      className="block no-underline"
                    >
                      <PlantLifecycleCard lifecycle={lc} />
                    </Link>
                    <button
                      type="button"
                      aria-label={`Delete ${lc.plant.variety}`}
                      data-ocid="nims-plant-card-delete"
                      className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground opacity-70 backdrop-blur transition hover:border-destructive hover:text-destructive hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRemoveTarget({
                          plantId: lc.plant.id,
                          label: lc.plant.variety,
                        });
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "seedbank" && (
          <SeedBankPanel
            varieties={varieties}
            onPlantFromLot={(varietyId) => {
              setPrefillVarietyId(varietyId);
              setTab("trays");
              toast.info("Select an empty tray cell to plant from this lot");
            }}
          />
        )}

        {tab === "graveyard" && (
          <GraveyardPanel
            plants={graveyardPlants}
            isLoading={graveyardLoading}
          />
        )}

        {tab === "activity" && <ActivityFeed entries={activity} />}

        {tab === "analytics" && (
          ravenPerks.hasAdvancedAnalytics || isAdmin ? (
            <NimsAnalyticsPanel
              plants={isAdmin && showAllUsers ? inventoryList : myPlants}
            />
          ) : (
            <div className="relative rounded-xl overflow-hidden">
              <div className="opacity-20 pointer-events-none blur-sm select-none">
                <NimsAnalyticsPanel plants={myPlants} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl gap-3">
                <span className="text-3xl">🐦‍⬛</span>
                <p className="text-white font-semibold text-sm">Raven Member Feature</p>
                <p className="text-zinc-400 text-xs text-center max-w-xs">
                  Hold 100K $RAVEN or join the Grower Co-op to unlock analytics, CSV export, and unlimited weather history.
                </p>
                <a
                  href="https://app.icpswap.com/swap?input=ryjl3-tyaaa-aaaaa-aaaba-cai&output=4k7jk-vyaaa-aaaam-qcyaa-cai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  Get $RAVEN on ICPSwap
                </a>
              </div>
            </div>
          )
        )}
      </div>

      {activeTrayId != null && selectedCell != null && (
        <>
          <PlantSeedModal
            open={seedOpen}
            onOpenChange={setSeedOpen}
            slotLabel={cellPositionLabel(selectedCell)}
            varieties={varieties}
            initialVarietyId={prefillVarietyId ?? undefined}
            isCreatingVariety={addVariety.isPending}
            onCreateVariety={async (name, species) => {
              const id = await addVariety.mutateAsync({
                name,
                species,
                scovilleMin: 0,
                scovilleMax: 0,
                description: "",
              });
              toast.success(`Variety "${name}" added`);
              return id;
            }}
            onSubmit={async ({ varietyId }) => {
              const occupied = trayCells.find(
                (c) =>
                  c.position === selectedCell && cellStatusKey(c) !== "empty",
              );
              if (occupied) {
                toast.error(
                  `Cell ${cellPositionLabel(selectedCell)} already has a plant.`,
                );
                return;
              }
              try {
                await plantSeed.mutateAsync({
                  trayId: activeTrayId,
                  cellPosition: selectedCell,
                  varietyId,
                });
                toast.success(
                  `Seed planted in ${cellPositionLabel(selectedCell)}`,
                );
                setPrefillVarietyId(null);
                setSeedOpen(false);
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Plant failed";
                if (msg.toLowerCase().includes("already occupied")) {
                  toast.error(
                    `Cell ${cellPositionLabel(selectedCell)} already has a plant.`,
                  );
                } else {
                  toast.error(msg);
                }
              }
            }}
          />

          <GerminationModal
            open={germOpen}
            onOpenChange={setGermOpen}
            slotLabel={cellPositionLabel(selectedCell)}
            plantName={unwrapOpt(selectedCellData?.varietyName ?? [])}
            onRemovePlant={
              unwrapOpt(selectedCellData?.plantId ?? []) != null
                ? () =>
                    setRemoveTarget({
                      plantId: unwrapOpt(selectedCellData?.plantId ?? [])!,
                      label:
                        unwrapOpt(selectedCellData?.varietyName ?? []) ??
                        `cell ${cellPositionLabel(selectedCell)}`,
                    })
                : undefined
            }
            onMarkDead={openMarkDead}
            onSubmit={async () => {
              try {
                const plantId = unwrapOpt(selectedCellData?.plantId ?? []);
                const result =
                  plantId != null
                    ? await germinatePlant.mutateAsync({ plantId })
                    : await markGerminated.mutateAsync({
                        trayId: activeTrayId,
                        cellPosition: selectedCell,
                      });
                if ("outcome" in result) {
                  if ("assigned" in result.outcome) {
                    toast.success(
                      `🌱 Germinated! PepperHead #${result.outcome.assigned.token_id.toString()} assigned`,
                    );
                  } else if ("already_assigned" in result.outcome) {
                    toast.success(
                      `Already assigned PepperHead #${result.outcome.already_assigned.token_id.toString()}`,
                    );
                  } else {
                    toast.success(
                      "🌱 Germinated — awaiting PepperHead (pool exhausted)",
                    );
                  }
                } else if (result.nftTokenId > 0n) {
                  toast.success(
                    `🌱 Germinated! NFT #${result.nftTokenId.toString()} assigned`,
                  );
                } else {
                  toast.success("🌱 Germinated — awaiting PepperHead assignment");
                }
                setGermOpen(false);
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Germination failed",
                );
              }
            }}
          />

          <MarkDeadModal
            open={deadOpen}
            onOpenChange={setDeadOpen}
            plantLabel={unwrapOpt(selectedCellData?.varietyName ?? [])}
            onUploadPhoto={
              unwrapOpt(selectedCellData?.plantId ?? []) != null
                ? (file) =>
                    uploadPhoto.mutateAsync({
                      plantId: unwrapOpt(selectedCellData?.plantId ?? [])!,
                      file,
                    })
                : undefined
            }
            onConfirm={async ({ reason, photoPath }) => {
              const cause: DeathCause = { Unknown: null };
              try {
                await markDead.mutateAsync({
                  trayId: activeTrayId,
                  cellPosition: selectedCell,
                  cause,
                  notes: reason,
                  photoUrl: photoPath,
                });
                toast.success("Plant marked dead");
                setDeadOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}
          />

          <TransplantModal
            open={transplantOpen}
            onOpenChange={setTransplantOpen}
            plantLabel={
              unwrapOpt(selectedCellData?.varietyName ?? []) ??
              `Cell ${cellPositionLabel(selectedCell)}`
            }
            onMarkDead={openMarkDead}
            onRemovePlant={
              unwrapOpt(selectedCellData?.plantId ?? []) != null
                ? () =>
                    setRemoveTarget({
                      plantId: unwrapOpt(selectedCellData?.plantId ?? [])!,
                      label:
                        unwrapOpt(selectedCellData?.varietyName ?? []) ??
                        `cell ${cellPositionLabel(selectedCell)}`,
                    })
                : undefined
            }
            onSubmit={async ({ container_size }) => {
              const plantId = unwrapOpt(selectedCellData?.plantId ?? []);
              if (plantId == null) {
                toast.error("No plant in cell");
                return;
              }
              try {
                await transplantCell.mutateAsync({
                  plant_id: plantId,
                  container_size:
                    container_size as TransplantInput["container_size"],
                });
                toast.success("🪴 Transplanted to inventory");
                setTransplantOpen(false);
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Transplant failed",
                );
              }
            }}
          />

          <TransplantedCellModal
            open={transplantedOpen}
            onOpenChange={setTransplantedOpen}
            slotLabel={
              selectedCell != null ? cellPositionLabel(selectedCell) : undefined
            }
            varietyName={unwrapOpt(selectedCellData?.varietyName ?? [])}
            nftTokenId={unwrapOpt(selectedCellData?.nftTokenId ?? [])}
            containerLabel={unwrapOpt(selectedCellData?.containerLabel ?? [])}
            inventoryPlantId={unwrapOpt(
              selectedCellData?.inventoryPlantId ?? [],
            )}
          />
        </>
      )}

      <RemovePlantModal
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        plantLabel={removeTarget?.label}
        isPending={removePlant.isPending}
        onConfirm={async () => {
          if (!removeTarget) return;
          try {
            await removePlant.mutateAsync(removeTarget.plantId);
            toast.success("Plant deleted");
            setRemoveTarget(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />

      <NimsLocationPrompt
        open={nimsLocation.needsPrompt}
        onAllow={nimsLocation.chooseGps}
        onUseDefault={nimsLocation.chooseDefault}
      />

      <NewTrayModal
        open={newTrayOpen}
        onOpenChange={setNewTrayOpen}
        isPending={createTray.isPending}
        onSubmit={async (name) => {
          try {
            const id = await createTray.mutateAsync({ name });
            setSelectedTrayId(id);
            setTab("trays");
            setNewTrayOpen(false);
            toast.success(`Tray "${name}" created`);
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : "Failed to create tray",
            );
          }
        }}
      />

      <AddPlantModal
        open={addPlantOpen}
        onOpenChange={setAddPlantOpen}
        varieties={varieties}
        isPending={addPlant.isPending}
        isCreatingVariety={addVariety.isPending}
        onCreateVariety={async (name, species) => {
          const id = await addVariety.mutateAsync({
            name,
            species,
            scovilleMin: 0,
            scovilleMax: 0,
            description: "",
          });
          toast.success(`Variety "${name}" added`);
          return id;
        }}
        onSubmit={async ({ varietyId, stage, container }) => {
          try {
            const result = await addPlant.mutateAsync({
              varietyId,
              stage,
              container,
            });
            track(USAGE.NIMS.PLANT_ADD.feature, USAGE.NIMS.PLANT_ADD.action);
            setAddPlantOpen(false);
            toast.success(`Plant #${result.plantId.toString()} added`, {
              action: {
                label: "View growing guide →",
                onClick: () =>
                  void navigate({
                    to: "/variety/$varietyId/guide",
                    params: { varietyId: varietyId.toString() },
                  }),
              },
            });
            void navigate({
              to: "/plants/$plantId",
              params: { plantId: result.plantId.toString() },
            });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to add plant");
          }
        }}
      />

      {activeTrayId != null && canRegisterProvenance && (
        <RegisterPlantBatchModal
          open={batchModalOpen}
          onOpenChange={setBatchModalOpen}
          trayId={activeTrayId}
          cellIndices={[...selectedCells].map((s) => BigInt(s)).sort((a, b) =>
            Number(a - b),
          )}
          cellLabels={[...selectedCells]
            .map((s) => cellPositionLabel(BigInt(s)))
            .sort()}
          varieties={varieties}
          isCreatingVariety={addVariety.isPending}
          isPending={registerPlantBatch.isPending}
          batchResult={batchResult}
          onClearResult={() => setBatchResult(null)}
          onCreateVariety={async (name, species) => {
            const id = await addVariety.mutateAsync({
              name,
              species,
              scovilleMin: 0,
              scovilleMax: 0,
              description: "",
            });
            toast.success(`Variety "${name}" added`);
            return id;
          }}
          onSubmit={async ({ sharedData, cellIndices }) => {
            try {
              const result = await registerPlantBatch.mutateAsync({
                sharedData,
                cellIndices,
              });
              setBatchResult(result);
              if (result.failed === 0n) {
                toast.success(
                  `Registered ${result.succeeded.toString()} cells (provenance started — germinate for NFT)`,
                );
                setSelectedCells(new Set());
                setBatchSelectMode(false);
              } else if (result.succeeded > 0n) {
                toast.warning(
                  `${result.succeeded.toString()} succeeded, ${result.failed.toString()} failed — see details`,
                );
                const failedKeys = result.results
                  .filter((r) => "err" in r.outcome)
                  .map((r) => r.cell_index.toString());
                setSelectedCells(new Set(failedKeys));
              } else {
                toast.error("Batch registration failed — see details");
              }
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Batch registration failed",
              );
            }
          }}
        />
      )}

      {adoptTokenId != null && (
        <AdoptPlantPrompt
          open={adoptOpen}
          onOpenChange={(open) => {
            if (!open) {
              dismissUnadoptedNft(adoptTokenId);
              setAdoptOpen(false);
              return;
            }
            setAdoptOpen(true);
          }}
          onDismiss={() => {
            dismissUnadoptedNft(adoptTokenId);
            setAdoptOpen(false);
          }}
          tokenId={adoptTokenId}
          isPending={adoptPlant.isPending}
          onAdopt={async ({ container, locationNotes }) => {
            try {
              const result = await adoptPlant.mutateAsync({
                nftTokenId: adoptTokenId,
                container,
                locationNotes,
              });
              toast.success("Plant adopted into NIMS");
              setAdoptOpen(false);
              void navigate({
                to: "/plants/$plantId",
                params: { plantId: result.plantId.toString() },
              });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Adoption failed");
            }
          }}
        />
      )}
    </div>
  );
}
