import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Droplets,
  Leaf,
  Loader2,
  Package,
  Plus,
  Sprout,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type {
  ContainerSize,
  DeathCause,
  TrayCellPublic,
} from "../declarations/backend.did";
import {
  ActivityFeed,
  AdoptPlantPrompt,
  AddPlantModal,
  GerminationModal,
  MarkDeadModal,
  NewTrayModal,
  NimsLocationPrompt,
  PlantLifecycleCard,
  PlantSeedModal,
  TransplantModal,
  TrayGrid,
  WeatherBar,
} from "../components/nims";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin, useMyTrays, useTrays } from "../hooks/useBackend";
import {
  useActivityFeed,
  useAdoptPurchasedPlant,
  useCreateNimsTray,
  useMarkCellDead,
  useMarkCellGerminated,
  useNimsDashboardStats,
  usePlantSeed,
  useTrayGrid,
  useWaterEntireTray,
} from "../hooks/useNimsDashboard";
import { useUnadoptedNftTokenIds } from "../hooks/useUnadoptedNfts";
import { useUploadNimsPhoto } from "../hooks/useNimsPhotoUpload";
import { useNimsLocation } from "../hooks/useNimsLocation";
import {
  useMyPlantsNims,
  useAdminInventory,
  useVarieties,
  useAddPlant,
} from "../hooks/useNims";
import { useWeather } from "../hooks/useWeather";
import { useTransplantCell } from "../hooks/useBackend";
import type { TransplantInput } from "../backend";

type NimsTab = "trays" | "inventory" | "activity" | "analytics" | "myplants";

function cellPositionLabel(pos: bigint): string {
  const n = Number(pos);
  const row = Math.ceil(n / 6);
  const col = String.fromCharCode(64 + ((n - 1) % 6) + 1);
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

export default function NIMSPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const { data: isAdmin } = useIsAdmin();
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
  const traysLoading = isAdmin && showAllUsers ? allTraysLoading : myTraysLoading;
  const { data: varieties = [] } = useVarieties();
  const { data: myPlants = [] } = useMyPlantsNims();
  const { data: adminInventory = [] } = useAdminInventory(undefined, undefined, undefined);
  const { data: activity = [] } = useActivityFeed(40);
  const { data: unadoptedIds = [], dismissUnadoptedNft } =
    useUnadoptedNftTokenIds();
  const adoptPlant = useAdoptPurchasedPlant();
  const createTray = useCreateNimsTray();
  const addPlant = useAddPlant();
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [newTrayOpen, setNewTrayOpen] = useState(false);
  const [addPlantOpen, setAddPlantOpen] = useState(false);
  const adoptPromptedRef = useRef<string | null>(null);

  const defaultTab: NimsTab = "trays";
  const [tab, setTab] = useState<NimsTab>(defaultTab);
  const [selectedTrayId, setSelectedTrayId] = useState<bigint | null>(null);

  const activeTrayId = selectedTrayId ?? trays[0]?.id ?? null;
  const { data: trayCells = [], isLoading: gridLoading } =
    useTrayGrid(activeTrayId);

  const plantSeed = usePlantSeed();
  const markGerminated = useMarkCellGerminated();
  const markDead = useMarkCellDead();
  const waterTray = useWaterEntireTray();
  const transplantCell = useTransplantCell();
  const uploadPhoto = useUploadNimsPhoto();

  const [selectedCell, setSelectedCell] = useState<bigint | null>(null);
  const [seedOpen, setSeedOpen] = useState(false);
  const [germOpen, setGermOpen] = useState(false);
  const [deadOpen, setDeadOpen] = useState(false);
  const [transplantOpen, setTransplantOpen] = useState(false);

  const selectedCellData = useMemo(
    () => trayCells.find((c) => c.position === selectedCell),
    [trayCells, selectedCell],
  );

  const inventoryList =
    isAdmin && showAllUsers ? adminInventory : myPlants;

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
      <div className="container max-w-lg py-12 px-4 text-center space-y-4">
        <Sprout className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-2xl font-display font-bold">NIMS</h1>
        <p className="text-muted-foreground text-sm">
          Nursery Inventory Management — free for all authenticated growers.
        </p>
        <Button onClick={login}>Log in with Internet Identity</Button>
      </div>
    );
  }

  const handleCellClick = (position: bigint) => {
    setSelectedCell(position);
    const cell = trayCells.find((c) => c.position === position);
    const status = cell ? cellStatusKey(cell) : "empty";
    if (status === "empty") setSeedOpen(true);
    else if (status === "planted") setGermOpen(true);
    else if (status === "germinated") setTransplantOpen(true);
    else if (status === "dead") toast.info("This cell is marked dead.");
    else toast.info("Plant was transplanted to inventory.");
  };

  const tabs: { id: NimsTab; label: string; icon: typeof Leaf }[] = [
    { id: "trays", label: "Trays", icon: Sprout },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "myplants", label: "My Plants", icon: Leaf },
  ];

  const visibleTabs = tabs;

  return (
    <div className="min-h-screen pb-24" data-ocid="nims-dashboard">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <WeatherBar
          data={weather}
          isLoading={weatherLoading}
          locationLabel={nimsLocation.coordinates.label}
          expanded={weatherExpanded}
          onExpandedChange={setWeatherExpanded}
        />
      </div>

      <div className="container max-w-2xl px-3 py-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-display font-bold">NIMS</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                variant={showAllUsers ? "default" : "outline"}
                className="text-xs"
                onClick={() => setShowAllUsers((v) => !v)}
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                {showAllUsers ? "All users" : "Mine only"}
              </Button>
            )}
            <Badge variant="outline" className="text-xs shrink-0">
              {nimsLocation.coordinates.label}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => setNewTrayOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New tray
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setAddPlantOpen(true)}>
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
              <p className="text-[10px] text-muted-foreground">Germinated today</p>
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <p className="text-lg font-bold text-amber-400">
                {stats.needsAttention.toString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Needs attention</p>
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

                <div className="flex gap-2 flex-wrap">
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
                </div>

                {gridLoading ? (
                  <Skeleton className="aspect-[6/12] w-full" />
                ) : (
                  <TrayGrid cells={trayCells} onCellClick={handleCellClick} />
                )}
              </>
            )}
          </div>
        )}

        {(tab === "inventory" || tab === "myplants") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(tab === "myplants" || !(isAdmin && showAllUsers) ? myPlants : inventoryList).length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                {tab === "myplants" || !(isAdmin && showAllUsers)
                  ? "No plants in your garden yet. Add a plant or adopt a purchased NFT."
                  : "No inventory plants yet."}
              </p>
            ) : (
              (tab === "myplants" || !(isAdmin && showAllUsers) ? myPlants : inventoryList).map((lc) => (
                <Link
                  key={lc.plant.id.toString()}
                  to="/plants/$plantId"
                  params={{ plantId: lc.plant.id.toString() }}
                >
                  <PlantLifecycleCard lifecycle={lc} />
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "activity" && <ActivityFeed entries={activity} />}

        {tab === "analytics" && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Analytics coming in Phase 2 — germination rates, weather correlation,
            and feeding efficiency charts.
          </div>
        )}
      </div>

      {activeTrayId != null && selectedCell != null && (
        <>
          <PlantSeedModal
            open={seedOpen}
            onOpenChange={setSeedOpen}
            slotLabel={cellPositionLabel(selectedCell)}
            onSubmit={async ({ varietyName }) => {
              const variety = varieties.find(
                (v) => v.name.toLowerCase() === varietyName.toLowerCase(),
              );
              if (!variety) {
                toast.error("Variety not found — pick from catalog");
                return;
              }
              try {
                await plantSeed.mutateAsync({
                  trayId: activeTrayId,
                  cellPosition: selectedCell,
                  varietyId: variety.id,
                });
                toast.success(`Seed planted in ${cellPositionLabel(selectedCell)}`);
                setSeedOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Plant failed");
              }
            }}
          />

          <GerminationModal
            open={germOpen}
            onOpenChange={setGermOpen}
            slotLabel={cellPositionLabel(selectedCell)}
            plantName={unwrapOpt(selectedCellData?.varietyName ?? [])}
            onMarkDead={openMarkDead}
            onSubmit={async () => {
              try {
                const result = await markGerminated.mutateAsync({
                  trayId: activeTrayId,
                  cellPosition: selectedCell,
                });
                if (result.nftTokenId > 0n) {
                  toast.success(
                    `🌱 Germinated! NFT #${result.nftTokenId.toString()} assigned`,
                  );
                } else {
                  toast.success("🌱 Germinated — tracking in NIMS (no NFT)");
                }
                setGermOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Germination failed");
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
            onSubmit={async ({ container_size }) => {
              const plantId = unwrapOpt(selectedCellData?.plantId ?? []);
              if (plantId == null) {
                toast.error("No plant in cell");
                return;
              }
              try {
                await transplantCell.mutateAsync({
                  plant_id: plantId,
                  container_size: container_size as TransplantInput["container_size"],
                });
                toast.success("🪴 Transplanted to inventory");
                setTransplantOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Transplant failed");
              }
            }}
          />
        </>
      )}

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
            toast.error(e instanceof Error ? e.message : "Failed to create tray");
          }
        }}
      />

      <AddPlantModal
        open={addPlantOpen}
        onOpenChange={setAddPlantOpen}
        varieties={varieties}
        isPending={addPlant.isPending}
        onSubmit={async ({ varietyId, stage, container }) => {
          try {
            const result = await addPlant.mutateAsync({
              varietyId,
              stage,
              container,
            });
            setAddPlantOpen(false);
            toast.success(`Plant #${result.plantId.toString()} added`);
            void navigate({
              to: "/plants/$plantId",
              params: { plantId: result.plantId.toString() },
            });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to add plant");
          }
        }}
      />

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
