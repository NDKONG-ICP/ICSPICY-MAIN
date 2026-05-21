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
  Sprout,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  GerminationModal,
  MarkDeadModal,
  PlantLifecycleCard,
  PlantSeedModal,
  TransplantModal,
  TrayGrid,
  WeatherBar,
} from "../components/nims";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin, useTrays } from "../hooks/useBackend";
import {
  useActivityFeed,
  useAdoptPurchasedPlant,
  useMarkCellDead,
  useMarkCellGerminated,
  useNimsDashboardStats,
  usePlantSeed,
  useTrayGrid,
  useWaterEntireTray,
} from "../hooks/useNimsDashboard";
import { useUnadoptedNftTokenIds } from "../hooks/useUnadoptedNfts";
import {
  useMyPlantsNims,
  useAdminInventory,
  useVarieties,
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
  const { data: weather, isLoading: weatherLoading } = useWeather();
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const { data: stats, isLoading: statsLoading } = useNimsDashboardStats();
  const { data: trays = [], isLoading: traysLoading } = useTrays();
  const { data: varieties = [] } = useVarieties();
  const { data: myPlants = [] } = useMyPlantsNims();
  const { data: adminInventory = [] } = useAdminInventory(undefined, undefined, undefined);
  const { data: activity = [] } = useActivityFeed(40);
  const { data: unadoptedIds = [] } = useUnadoptedNftTokenIds();
  const adoptPlant = useAdoptPurchasedPlant();
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [dismissedAdoptToken, setDismissedAdoptToken] = useState<string | null>(
    null,
  );

  const defaultTab: NimsTab = isAdmin ? "trays" : "myplants";
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

  const [selectedCell, setSelectedCell] = useState<bigint | null>(null);
  const [seedOpen, setSeedOpen] = useState(false);
  const [germOpen, setGermOpen] = useState(false);
  const [deadOpen, setDeadOpen] = useState(false);
  const [transplantOpen, setTransplantOpen] = useState(false);

  const selectedCellData = useMemo(
    () => trayCells.find((c) => c.position === selectedCell),
    [trayCells, selectedCell],
  );

  const inventoryList = isAdmin ? adminInventory : myPlants;

  const adoptTokenId = useMemo(() => {
    return unadoptedIds.find((id) => id.toString() !== dismissedAdoptToken) ?? null;
  }, [unadoptedIds, dismissedAdoptToken]);

  useEffect(() => {
    if (adoptTokenId != null && isAuthenticated) {
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

  const tabs: { id: NimsTab; label: string; icon: typeof Leaf; admin?: boolean }[] =
    [
      { id: "trays", label: "Trays", icon: Sprout, admin: true },
      { id: "inventory", label: "Inventory", icon: Package },
      { id: "activity", label: "Activity", icon: Activity },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "myplants", label: "My Plants", icon: Leaf },
    ];

  const visibleTabs = tabs.filter((t) => !t.admin || isAdmin);

  return (
    <div className="min-h-screen pb-24" data-ocid="nims-dashboard">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <WeatherBar
          data={weather}
          isLoading={weatherLoading}
          expanded={weatherExpanded}
          onExpandedChange={setWeatherExpanded}
        />
      </div>

      <div className="container max-w-2xl px-3 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold">NIMS</h1>
          <Badge variant="outline" className="text-xs">
            Zone 10a · Port Charlotte
          </Badge>
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

        {tab === "trays" && isAdmin && (
          <div className="space-y-3">
            {traysLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : trays.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No trays yet. Create one from Admin → NIMS.
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
            {(tab === "myplants" ? myPlants : inventoryList).length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                {tab === "myplants"
                  ? "No plants in your garden yet. Adopt a purchased NFT to start tracking."
                  : "No inventory plants yet."}
              </p>
            ) : (
              (tab === "myplants" ? myPlants : inventoryList).map((lc) => (
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
                toast.success(
                  `🌱 Germinated! NFT #${result.nftTokenId.toString()} assigned`,
                );
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
            onConfirm={async ({ reason }) => {
              const cause: DeathCause = { Unknown: null };
              try {
                await markDead.mutateAsync({
                  trayId: activeTrayId,
                  cellPosition: selectedCell,
                  cause,
                  notes: reason,
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

      {adoptTokenId != null && (
        <AdoptPlantPrompt
          open={adoptOpen}
          onOpenChange={(open) => {
            setAdoptOpen(open);
            if (!open) setDismissedAdoptToken(adoptTokenId.toString());
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
