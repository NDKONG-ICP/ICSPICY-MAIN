import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { pestSeverityLabel } from "@/lib/candid-display";
import {
  findDeathRecord,
  isPlantMarkedDead,
  nftLikelyLostOnDeath,
} from "@/lib/plant-lifecycle-utils";
import { uploadsUrl } from "@/lib/uploads-canister";
import { weatherDataToSnapshot } from "@/lib/weather-snapshot";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type {
  PlantStage as BackendPlantStage,
  TransplantInput,
} from "../backend";
import { NftPlantFlipCard } from "../components/NftPlantFlipCard";
import {
  HarvestSeedsModal,
  LogFeedingModal,
  LogPestModal,
  LogWateringModal,
  MarkDeadModal,
  NfcTagLinkModal,
  NimsStoredPhoto,
  PlantQuickActions,
  PlantTimeline,
  type QuickPlantAction,
  RemovePlantModal,
  RevivePlantModal,
  TransplantModal,
  WeatherBar,
  WeatherHistoryCharts,
} from "../components/nims";
import { StageBadge } from "../components/ui/StageBadge";
import type { DeathCause } from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";
import { useAutoWeatherCapture } from "../hooks/useAutoWeatherCapture";
import { useIsAdmin, useTransplantCell } from "../hooks/useBackend";
import {
  formatCents,
  stageLabel,
  unwrapOpt,
  useAddPlantNote,
  useListPlantForSale,
  usePlantLifecycle,
  useRemovePlant,
  useTransplantPlant,
  useVarieties,
} from "../hooks/useNims";
import {
  useAddNimsPlantPhoto,
  useAddWeatherSnapshot,
  useLogFeeding,
  useLogPest,
  useLogWatering,
  useMarkCellDead,
  useMarkPlantDead,
  usePlantHealth,
  useRevivePlant,
} from "../hooks/useNimsDashboard";
import { useNimsLocation } from "../hooks/useNimsLocation";
import { useUploadNimsPhoto } from "../hooks/useNimsPhotoUpload";
import { usePageTitle } from "../hooks/usePageTitle";
import { useHarvestSeeds } from "../hooks/useSeedBank";
import { useWeather } from "../hooks/useWeather";

function fmtTs(ts: bigint | undefined): string {
  if (ts === undefined) return "—";
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlantDetailPage() {
  usePageTitle("Plant");

  const { plantId: plantIdParam } = useParams({ strict: false });
  const id =
    plantIdParam != null && plantIdParam !== ""
      ? BigInt(plantIdParam)
      : undefined;
  const navigate = useNavigate();
  const { data: lc, isLoading } = usePlantLifecycle(id);
  const { data: varieties = [] } = useVarieties();
  const { identity } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const addNote = useAddPlantNote();
  const logWater = useLogWatering();
  const logFeed = useLogFeeding();
  const logPest = useLogPest();
  const addWeatherSnapshot = useAddWeatherSnapshot();
  const uploadPhoto = useUploadNimsPhoto();
  const addPlantPhoto = useAddNimsPlantPhoto();
  const listForSale = useListPlantForSale();
  const markCellDead = useMarkCellDead();
  const markPlantDead = useMarkPlantDead();
  const revivePlant = useRevivePlant();
  const transplantCell = useTransplantCell();
  const transplantPlant = useTransplantPlant();
  const removePlant = useRemovePlant();
  const harvestSeeds = useHarvestSeeds();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [nfcOpen, setNfcOpen] = useState(false);
  const nimsLocation = useNimsLocation();
  const { data: weather, isLoading: weatherLoading } = useWeather(
    nimsLocation.coordinates.lat,
    nimsLocation.coordinates.lng,
  );
  const { data: health } = usePlantHealth(id ?? null);

  const plantIsDeadEarly = lc ? isPlantMarkedDead(lc) : false;
  useAutoWeatherCapture(
    lc ? [lc] : undefined,
    weather,
    Boolean(identity && lc && !plantIsDeadEarly),
  );

  const [waterOpen, setWaterOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [pestOpen, setPestOpen] = useState(false);
  const [transplantOpen, setTransplantOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [deadOpen, setDeadOpen] = useState(false);
  const [reviveOpen, setReviveOpen] = useState(false);
  const [salePrice, setSalePrice] = useState("2500");

  if (id === undefined) {
    return (
      <div className="container py-16 text-center">
        <p>Plant not found.</p>
        <Link to="/nims" className="text-primary underline">
          Back to NIMS
        </Link>
      </div>
    );
  }

  if (isLoading) return <Skeleton className="h-96 m-8" />;
  if (!lc) {
    return (
      <div className="container py-16 text-center">
        <p>Plant not found.</p>
        <Link to="/nims" className="text-primary underline">
          Back to NIMS
        </Link>
      </div>
    );
  }

  const plant = lc.plant;
  const tokenId = unwrapOpt(lc.nftTokenId);
  const variety = varieties.find((v) => v.id === unwrapOpt(lc.varietyId));
  const callerText = identity?.getPrincipal().toText() ?? "";
  const isOwner =
    isAdmin ||
    plant.created_by.toText() === callerText ||
    unwrapOpt(plant.sold_to)?.toText() === callerText;
  const canEdit = isOwner;
  const inTray = !plant.is_transplanted && plant.tray_id !== 0n;
  const inInventory =
    (plant.container_size?.length ?? 0) > 0 && !plant.is_transplanted;
  const latestPhoto = lc.photos.reduce<(typeof lc.photos)[number] | null>(
    (best, photo) => (!best || photo.timestamp > best.timestamp ? photo : best),
    null,
  );
  const deathRecord = findDeathRecord(lc.notes);
  const plantIsDead = isPlantMarkedDead(lc);
  const nftMayBeLost = nftLikelyLostOnDeath(lc);

  const captureWeather = async () => {
    if (!weather) return;
    try {
      await addWeatherSnapshot.mutateAsync({
        plantId: id,
        snapshot: weatherDataToSnapshot(weather),
      });
    } catch {
      // Non-blocking — lifecycle entry already saved
    }
  };

  const handleQuickAction = (action: QuickPlantAction) => {
    switch (action) {
      case "water":
        setWaterOpen(true);
        break;
      case "feed":
        setFeedOpen(true);
        break;
      case "pest":
        setPestOpen(true);
        break;
      case "note":
        setActiveTab("notes");
        break;
      case "photo":
        photoInputRef.current?.click();
        break;
      case "transplant":
        if (inTray || inInventory) setTransplantOpen(true);
        else toast.info("Plant has no container yet.");
        break;
      case "harvest_seeds":
        setHarvestOpen(true);
        break;
      case "nfc_tag":
        setNfcOpen(true);
        break;
      case "list_sale":
        if (plant.for_sale) {
          toast.info("Already listed for sale.");
          break;
        }
        void (async () => {
          try {
            const cents = BigInt(salePrice.replace(/\D/g, "") || "0");
            await listForSale.mutateAsync({ plantId: id, priceCents: cents });
            toast.success("Listed for sale");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "List failed");
          }
        })();
        break;
      case "mark_dead":
        setDeadOpen(true);
        break;
      case "revive_plant":
        setReviveOpen(true);
        break;
      case "remove_plant":
        setRemoveOpen(true);
        break;
    }
  };

  return (
    <div className="container max-w-5xl py-8 px-4 pb-32">
      <div className="mb-4">
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
      <Link
        to="/nims"
        className="inline-flex items-center text-sm text-muted-foreground mb-6 hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> NIMS
      </Link>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="max-w-md mx-auto w-full">
          {tokenId !== undefined ? (
            <NftPlantFlipCard
              tokenId={tokenId}
              photos={lc.photos}
              alt={plant.variety}
              data-ocid="plant-detail-flip-card"
            />
          ) : (
            <div className="aspect-square rounded-2xl overflow-hidden border border-border bg-muted">
              {latestPhoto ? (
                <img
                  src={uploadsUrl(latestPhoto.url)}
                  alt="Plant photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-800 text-zinc-400">
                  <span className="mb-2 text-4xl">📸</span>
                  <span className="text-sm">No plant photo yet</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{plant.variety}</h1>
            {variety && (
              <p className="text-muted-foreground italic">{variety.species}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <StageBadge stage={plant.stage as unknown as BackendPlantStage} />
            {plant.for_sale && (
              <Badge variant="secondary">
                For Sale: {formatCents(unwrapOpt(lc.priceCents))}
              </Badge>
            )}
            {plant.sold && <Badge>Sold</Badge>}
            {deathRecord && <Badge variant="destructive">Terminated</Badge>}
            {plant.is_cooked && !deathRecord && (
              <Badge variant="secondary">Harvested</Badge>
            )}
            {health?.needsAttention && (
              <Badge variant="destructive">Needs attention</Badge>
            )}
            {health && !health.needsAttention && !deathRecord && (
              <Badge className="bg-emerald-600">
                Health {health.healthScore.toString()}%
              </Badge>
            )}
          </div>
          {tokenId !== undefined && (
            <Link
              to="/nft/$tokenId"
              params={{ tokenId: tokenId.toString() }}
              className="text-primary hover:underline text-sm"
            >
              IC SPICY NFT #{tokenId.toString()} →
            </Link>
          )}
          <p className="text-xs text-muted-foreground break-all">
            Owner: {plant.created_by.toText()}
          </p>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lifecycle Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <PlantTimeline lifecycle={lc} />
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Verified on-chain provenance</p>
              <p className="text-muted-foreground text-xs">
                Lifecycle data stored on the Internet Computer. NFT travels with
                ownership.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feeding">
            Feeding ({lc.feedingLog.length})
          </TabsTrigger>
          <TabsTrigger value="watering">
            Watering ({lc.wateringLog.length})
          </TabsTrigger>
          <TabsTrigger value="pests">Pests ({lc.pestLog.length})</TabsTrigger>
          <TabsTrigger value="photos">Photos ({lc.photos.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({lc.notes.length})</TabsTrigger>
          <TabsTrigger value="weather">
            Weather ({lc.weatherSnapshots.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-2 text-sm">
          <p>Stage: {stageLabel(plant.stage)}</p>
          <p>Planted: {fmtTs(plant.planting_date)}</p>
          <p>Germinated: {fmtTs(unwrapOpt(plant.germination_date))}</p>
          <p>Transplanted: {fmtTs(unwrapOpt(plant.transplant_date))}</p>
          {variety && (
            <>
              <p>
                Heat: {variety.scovilleMin.toString()}–
                {variety.scovilleMax.toString()} SHU
              </p>
              <p>{variety.description}</p>
            </>
          )}
          {canEdit && !plant.for_sale && (
            <div className="flex items-end gap-2 pt-2">
              <div className="space-y-1">
                <Label htmlFor="sale-price">List price (¢)</Label>
                <Input
                  id="sale-price"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="feeding" className="mt-4">
          {lc.feedingLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No feeding entries yet.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lc.feedingLog.map((f) => (
                <li
                  key={f.id.toString()}
                  className="border-b border-border pb-2"
                >
                  {fmtTs(f.date)} — {f.product_name} ({f.nutrient_type}){" "}
                  {f.dosage_amount}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="watering" className="mt-4">
          {lc.wateringLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No watering entries.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lc.wateringLog.map((w, i) => (
                <li key={i} className="border-b border-border pb-2">
                  {fmtTs(w.timestamp)} — {w.amountMl.toString()} ml
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="pests" className="mt-4">
          {lc.pestLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No pest issues logged.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lc.pestLog.map((p, i) => (
                <li key={i} className="border-b border-border pb-2">
                  {fmtTs(p.timestamp)} — {p.pestName} (
                  {pestSeverityLabel(p.severity)})
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          {lc.photos.length === 0 ? (
            <p className="text-muted-foreground text-sm">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {lc.photos.map((p, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden aspect-square border border-border"
                >
                  <NimsStoredPhoto
                    path={p.url}
                    alt={unwrapOpt(p.caption) ?? "Plant photo"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          {lc.notes.map((n, i) => (
            <div key={i} className="text-sm border-l-2 border-primary pl-3">
              <p className="text-muted-foreground text-xs">
                {fmtTs(n.timestamp)}
              </p>
              <p>{n.text}</p>
            </div>
          ))}
          {canEdit && (
            <div className="space-y-2 pt-4 border-t border-border">
              <Label>Add note</Label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!noteText.trim() || addNote.isPending}
                onClick={async () => {
                  await addNote.mutateAsync({ plantId: id, text: noteText });
                  await captureWeather();
                  setNoteText("");
                  toast.success("Note added");
                }}
              >
                Save Note
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="weather" className="mt-4">
          <WeatherHistoryCharts lifecycle={lc} />
        </TabsContent>
      </Tabs>

      {canEdit && (
        <>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            data-ocid="nims-plant-photo-input"
            disabled={
              uploadPhoto.isPending ||
              addPlantPhoto.isPending ||
              plant.is_cooked
            }
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void (async () => {
                try {
                  const path = await uploadPhoto.mutateAsync({
                    plantId: id,
                    file,
                  });
                  await addPlantPhoto.mutateAsync({
                    plantId: id,
                    path,
                    caption: "Progress photo",
                  });
                  toast.success("Photo uploaded");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Upload failed",
                  );
                } finally {
                  if (photoInputRef.current) photoInputRef.current.value = "";
                }
              })();
            }}
          />

          <PlantQuickActions
            onAction={handleQuickAction}
            isPlantDead={plantIsDead}
            hiddenActions={[
              ...(canEdit
                ? []
                : (["harvest_seeds", "nfc_tag", "remove_plant"] as const)),
              ...(isAdmin
                ? []
                : (["list_sale", "mark_dead", "revive_plant"] as const)),
            ]}
            disabled={
              plantIsDead
                ? uploadPhoto.isPending || addPlantPhoto.isPending
                : uploadPhoto.isPending || addPlantPhoto.isPending
            }
          />

          <MarkDeadModal
            open={deadOpen}
            onOpenChange={setDeadOpen}
            plantLabel={plant.variety}
            onUploadPhoto={(file) =>
              uploadPhoto.mutateAsync({ plantId: id, file })
            }
            onConfirm={async ({ reason, photoPath }) => {
              const cause: DeathCause = { Unknown: null };
              try {
                if (inTray && !plant.is_transplanted) {
                  await markCellDead.mutateAsync({
                    trayId: plant.tray_id,
                    cellPosition: plant.cell_position,
                    cause,
                    notes: reason,
                    photoUrl: photoPath,
                  });
                } else {
                  await markPlantDead.mutateAsync({
                    plantId: id,
                    cause,
                    notes: reason,
                    photoUrl: photoPath,
                  });
                }
                toast.success("Plant marked dead");
                setDeadOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}
          />

          <RevivePlantModal
            open={reviveOpen}
            onOpenChange={setReviveOpen}
            plantLabel={plant.variety}
            nftMayBeLost={nftMayBeLost}
            isPending={revivePlant.isPending}
            onConfirm={async () => {
              try {
                await revivePlant.mutateAsync(id);
                toast.success(
                  nftMayBeLost
                    ? "Plant revived — note: prior NFT was not restored"
                    : "Plant revived",
                );
                setReviveOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Revive failed");
              }
            }}
          />

          <LogWateringModal
            open={waterOpen}
            onOpenChange={setWaterOpen}
            plantLabel={plant.variety}
            onSubmit={async ({ amountMl, notes }) => {
              try {
                await logWater.mutateAsync({ plantId: id, amountMl, notes });
                await captureWeather();
                toast.success("Watering logged");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}
          />

          <LogFeedingModal
            open={feedOpen}
            onOpenChange={setFeedOpen}
            plantLabel={plant.variety}
            onSubmit={async ({
              productName,
              nutrientType,
              dosageAmount,
              notes,
            }) => {
              try {
                await logFeed.mutateAsync({
                  plantId: id,
                  productName,
                  nutrientType,
                  dosage: dosageAmount,
                  notes,
                });
                await captureWeather();
                toast.success("Feeding logged");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}
          />

          <LogPestModal
            open={pestOpen}
            onOpenChange={setPestOpen}
            plantLabel={plant.variety}
            onUploadPhoto={(file) =>
              uploadPhoto.mutateAsync({ plantId: id, file })
            }
            onSubmit={async ({ pestName, severity, notes, photoPath }) => {
              try {
                await logPest.mutateAsync({
                  plantId: id,
                  pestName,
                  severity,
                  notes,
                });
                if (photoPath) {
                  await addPlantPhoto.mutateAsync({
                    plantId: id,
                    path: photoPath,
                    caption: `Pest: ${pestName} (${pestSeverityLabel(severity)})`,
                  });
                }
                await captureWeather();
                toast.success("Pest issue logged");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}
          />

          {inTray && (
            <TransplantModal
              open={transplantOpen}
              onOpenChange={setTransplantOpen}
              plantLabel={plant.variety}
              onSubmit={async ({ container_size }) => {
                try {
                  await transplantCell.mutateAsync({
                    plant_id: id,
                    container_size:
                      container_size as unknown as TransplantInput["container_size"],
                  });
                  toast.success("Transplanted to inventory");
                  void navigate({ to: "/nims" });
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Transplant failed",
                  );
                }
              }}
            />
          )}

          {inInventory && (
            <TransplantModal
              open={transplantOpen}
              onOpenChange={setTransplantOpen}
              plantLabel={plant.variety}
              currentContainer={plant.container_size ?? []}
              inventoryMode
              onSubmit={async ({ container_size, location_notes }) => {
                try {
                  await transplantPlant.mutateAsync({
                    plantId: id,
                    container: container_size,
                    locationNotes: location_notes,
                  });
                  toast.success("Container updated");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Repot failed");
                }
              }}
            />
          )}

          <RemovePlantModal
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            plantLabel={plant.variety}
            isPending={removePlant.isPending}
            onConfirm={async () => {
              try {
                await removePlant.mutateAsync(id);
                toast.success("Plant deleted");
                setRemoveOpen(false);
                void navigate({ to: "/nims" });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Remove failed");
              }
            }}
          />

          <HarvestSeedsModal
            open={harvestOpen}
            onOpenChange={setHarvestOpen}
            plantLabel={plant.variety}
            isPending={harvestSeeds.isPending}
            onSubmit={async ({ quantity, notes }) => {
              try {
                await harvestSeeds.mutateAsync({
                  plantId: id,
                  quantity,
                  notes,
                });
                setHarvestOpen(false);
                toast.success("Seeds saved to your Seed Bank");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Harvest failed");
              }
            }}
          />

          <NfcTagLinkModal
            open={nfcOpen}
            onOpenChange={setNfcOpen}
            plantId={id}
            plantLabel={plant.variety}
          />
        </>
      )}
    </div>
  );
}
