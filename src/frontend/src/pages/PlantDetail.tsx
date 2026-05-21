import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { PlantStage as BackendPlantStage, TransplantInput } from "../backend";
import { StageBadge } from "../components/ui/StageBadge";
import {
  LogFeedingModal,
  LogPestModal,
  LogWateringModal,
  PlantQuickActions,
  PlantTimeline,
  TransplantModal,
  WeatherBar,
  NimsStoredPhoto,
  type QuickPlantAction,
} from "../components/nims";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin, useToggleCooked, useTransplantCell } from "../hooks/useBackend";
import {
  useAddNimsPlantPhoto,
  useLogFeeding,
  useLogPest,
  useLogWatering,
  usePlantHealth,
} from "../hooks/useNimsDashboard";
import { useUploadNimsPhoto } from "../hooks/useNimsPhotoUpload";
import { useWeather } from "../hooks/useWeather";
import {
  formatCents,
  nftImageUrl,
  stageLabel,
  unwrapOpt,
  useAddPlantNote,
  useListPlantForSale,
  usePlantLifecycle,
  useVarieties,
} from "../hooks/useNims";

function fmtTs(ts: bigint | undefined): string {
  if (ts === undefined) return "—";
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlantDetailPage() {
  const { plantId } = useParams({ from: "/plants/$plantId" });
  const id = BigInt(plantId);
  const navigate = useNavigate();
  const { data: lc, isLoading } = usePlantLifecycle(id);
  const { data: varieties = [] } = useVarieties();
  const { identity } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const addNote = useAddPlantNote();
  const logWater = useLogWatering();
  const logFeed = useLogFeeding();
  const logPest = useLogPest();
  const uploadPhoto = useUploadNimsPhoto();
  const addPlantPhoto = useAddNimsPlantPhoto();
  const listForSale = useListPlantForSale();
  const toggleCooked = useToggleCooked();
  const transplantCell = useTransplantCell();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const { data: weather, isLoading: weatherLoading } = useWeather();
  const { data: health } = usePlantHealth(id);

  const [waterOpen, setWaterOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [pestOpen, setPestOpen] = useState(false);
  const [transplantOpen, setTransplantOpen] = useState(false);
  const [salePrice, setSalePrice] = useState("2500");

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
        if (inTray) setTransplantOpen(true);
        else toast.info("Plant is already in inventory.");
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
        void (async () => {
          try {
            await toggleCooked.mutateAsync(id);
            toast.success("Plant marked dead");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        })();
        break;
    }
  };

  return (
    <div className="container max-w-5xl py-8 px-4 pb-32">
      <div className="mb-4">
        <WeatherBar
          data={weather}
          isLoading={weatherLoading}
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
        <div className="rounded-xl overflow-hidden border border-border aspect-square bg-muted">
          <img
            src={nftImageUrl(tokenId)}
            alt={plant.variety}
            className="w-full h-full object-cover"
          />
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
            {plant.is_cooked && <Badge variant="destructive">Dead</Badge>}
            {health?.needsAttention && (
              <Badge variant="destructive">Needs attention</Badge>
            )}
            {health && !health.needsAttention && !plant.is_cooked && (
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
                Lifecycle data stored on the Internet Computer. NFT travels with ownership.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feeding">Feeding ({lc.feedingLog.length})</TabsTrigger>
          <TabsTrigger value="watering">Watering ({lc.wateringLog.length})</TabsTrigger>
          <TabsTrigger value="pests">Pests ({lc.pestLog.length})</TabsTrigger>
          <TabsTrigger value="photos">Photos ({lc.photos.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({lc.notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-2 text-sm">
          <p>Stage: {stageLabel(plant.stage)}</p>
          <p>Planted: {fmtTs(plant.planting_date)}</p>
          <p>Germinated: {fmtTs(unwrapOpt(plant.germination_date))}</p>
          <p>Transplanted: {fmtTs(unwrapOpt(plant.transplant_date))}</p>
          {variety && (
            <>
              <p>
                Heat: {variety.scovilleMin.toString()}–{variety.scovilleMax.toString()} SHU
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
            <p className="text-muted-foreground text-sm">No feeding entries yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lc.feedingLog.map((f) => (
                <li key={f.id.toString()} className="border-b border-border pb-2">
                  {fmtTs(f.date)} — {f.product_name} ({f.nutrient_type}) {f.dosage_amount}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="watering" className="mt-4">
          {lc.wateringLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">No watering entries.</p>
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
            <p className="text-muted-foreground text-sm">No pest issues logged.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lc.pestLog.map((p, i) => (
                <li key={i} className="border-b border-border pb-2">
                  {fmtTs(p.timestamp)} — {p.pestName} ({p.severity})
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
                <div key={i} className="rounded-lg overflow-hidden aspect-square border border-border">
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
              <p className="text-muted-foreground text-xs">{fmtTs(n.timestamp)}</p>
              <p>{n.text}</p>
            </div>
          ))}
          {canEdit && (
            <div className="space-y-2 pt-4 border-t border-border">
              <Label>Add note</Label>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <Button
                size="sm"
                disabled={!noteText.trim() || addNote.isPending}
                onClick={async () => {
                  await addNote.mutateAsync({ plantId: id, text: noteText });
                  setNoteText("");
                  toast.success("Note added");
                }}
              >
                Save Note
              </Button>
            </div>
          )}
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
            disabled={uploadPhoto.isPending || addPlantPhoto.isPending || plant.is_cooked}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void (async () => {
                try {
                  const path = await uploadPhoto.mutateAsync({ plantId: id, file });
                  await addPlantPhoto.mutateAsync({
                    plantId: id,
                    path,
                    caption: "Progress photo",
                  });
                  toast.success("Photo uploaded");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  if (photoInputRef.current) photoInputRef.current.value = "";
                }
              })();
            }}
          />

          <PlantQuickActions
            onAction={handleQuickAction}
            disabled={
              plant.is_cooked || uploadPhoto.isPending || addPlantPhoto.isPending
            }
          />

          <LogWateringModal
            open={waterOpen}
            onOpenChange={setWaterOpen}
            plantLabel={plant.variety}
            onSubmit={async ({ amountMl, notes }) => {
              try {
                await logWater.mutateAsync({ plantId: id, amountMl, notes });
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
            onSubmit={async ({ productName, nutrientType, dosageAmount, notes }) => {
              try {
                await logFeed.mutateAsync({
                  plantId: id,
                  productName,
                  nutrientType,
                  dosage: dosageAmount,
                  notes,
                });
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
            onUploadPhoto={(file) => uploadPhoto.mutateAsync({ plantId: id, file })}
            onSubmit={async ({ pestName, severity, notes, photoPath }) => {
              try {
                await logPest.mutateAsync({ plantId: id, pestName, severity, notes });
                if (photoPath) {
                  await addPlantPhoto.mutateAsync({
                    plantId: id,
                    path: photoPath,
                    caption: `Pest: ${pestName} (${severity})`,
                  });
                }
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
                    container_size: container_size as unknown as TransplantInput["container_size"],
                  });
                  toast.success("Transplanted to inventory");
                  void navigate({ to: "/nims" });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Transplant failed");
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
