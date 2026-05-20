import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import {
  Leaf,
  Loader2,
  Plus,
  ShoppingBag,
  Sprout,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { PlantStage } from "../declarations/backend.did";
import type { PlantStage as BackendPlantStage } from "../backend";
import { StageBadge } from "../components/ui/StageBadge";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin } from "../hooks/useBackend";
import {
  formatCents,
  nftImageUrl,
  stageDefaultPrice,
  stageLabel,
  unwrapOpt,
  useAddPlant,
  useAddVariety,
  useAdminInventory,
  useDelistPlant,
  useListPlantForSale,
  useMyPlantsNims,
  usePlantCount,
  useUpdateNimsPlantStage,
  useVarieties,
} from "../hooks/useNims";

function StatsBar() {
  const { data: stats, isLoading } = usePlantCount();
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: "Total Plants", value: stats.total.toString() },
        { label: "For Sale", value: stats.forSale.toString() },
        { label: "Sold", value: stats.sold.toString() },
        {
          label: "Germinated",
          value: stats.byStage.find(([s]) => "Seed" in s)?.[1]?.toString() ?? "0",
        },
      ].map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-border bg-card/60 p-4 text-center"
        >
          <p className="text-2xl font-bold text-primary">{s.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function PlantCard({
  lifecycle,
  admin,
  onRefresh,
}: {
  lifecycle: import("../hooks/useNims").PlantLifecycle;
  admin?: boolean;
  onRefresh: () => void;
}) {
  const listForSale = useListPlantForSale();
  const delist = useDelistPlant();
  const updateStage = useUpdateNimsPlantStage();
  const plant = lifecycle.plant;
  const tokenId = unwrapOpt(lifecycle.nftTokenId);
  const price = unwrapOpt(lifecycle.priceCents);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="aspect-video bg-muted relative">
        <img
          src={nftImageUrl(tokenId)}
          alt={plant.variety}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder-plant.png";
          }}
        />
        {plant.for_sale && (
          <Badge className="absolute top-2 right-2 bg-primary">
            {formatCents(price ?? BigInt(stageDefaultPrice(plant.stage) * 100))}
          </Badge>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{plant.variety}</h3>
          <StageBadge stage={plant.stage as unknown as BackendPlantStage} />
        </div>
        {tokenId !== undefined && (
          <p className="text-xs text-muted-foreground">
            IC SPICY #{tokenId.toString()}
          </p>
        )}
        <Link
          to="/plants/$plantId"
          params={{ plantId: plant.id.toString() }}
          className="text-sm text-primary hover:underline"
        >
          View lifecycle →
        </Link>
        {admin && (
          <div className="flex flex-wrap gap-2 pt-2">
            {!plant.for_sale && !plant.sold && (
              <Button
                size="sm"
                variant="outline"
                disabled={listForSale.isPending}
                onClick={async () => {
                  try {
                    await listForSale.mutateAsync({ plantId: plant.id });
                    toast.success("Listed for sale");
                    onRefresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              >
                <Tag className="w-3 h-3 mr-1" /> List
              </Button>
            )}
            {plant.for_sale && (
              <Button
                size="sm"
                variant="ghost"
                disabled={delist.isPending}
                onClick={async () => {
                  await delist.mutateAsync(plant.id);
                  toast.success("Delisted");
                  onRefresh();
                }}
              >
                Delist
              </Button>
            )}
            {"Seed" in plant.stage && (
              <Button
                size="sm"
                variant="secondary"
                disabled={updateStage.isPending}
                onClick={async () => {
                  await updateStage.mutateAsync({
                    plantId: plant.id,
                    stage: { Seedling: null },
                  });
                  toast.success("Updated to Seedling");
                  onRefresh();
                }}
              >
                → Seedling
              </Button>
            )}
            {"Seedling" in plant.stage && (
              <Button
                size="sm"
                variant="secondary"
                disabled={updateStage.isPending}
                onClick={async () => {
                  await updateStage.mutateAsync({
                    plantId: plant.id,
                    stage: { Mature: null },
                  });
                  toast.success("Updated to Mature");
                  onRefresh();
                }}
              >
                → Mature
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data: varieties = [] } = useVarieties();
  const [stageFilter, setStageFilter] = useState<string>("all");
  const stage: PlantStage | undefined =
    stageFilter === "Seed"
      ? { Seed: null }
      : stageFilter === "Seedling"
        ? { Seedling: null }
        : stageFilter === "Mature"
          ? { Mature: null }
          : undefined;
  const { data: inventory = [], refetch, isLoading } = useAdminInventory(stage);
  const addPlant = useAddPlant();
  const addVariety = useAddVariety();
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showAddVariety, setShowAddVariety] = useState(false);
  const [form, setForm] = useState({
    varietyId: "",
    stage: "Seed" as "Seed" | "Seedling" | "Mature",
  });
  const [varietyForm, setVarietyForm] = useState({
    name: "",
    species: "Capsicum chinense",
    scovilleMin: "100000",
    scovilleMax: "500000",
    description: "",
  });

  return (
    <div className="space-y-8">
      <StatsBar />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowAddPlant(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Plant
        </Button>
        <Button variant="outline" onClick={() => setShowAddVariety(true)}>
          <Sprout className="w-4 h-4 mr-1" /> Add Variety
        </Button>
        <Link to="/marketplace">
          <Button variant="secondary">
            <ShoppingBag className="w-4 h-4 mr-1" /> Shop
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 items-center">
        <Label>Filter stage</Label>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Seed">Germinated</SelectItem>
            <SelectItem value="Seedling">Seedling</SelectItem>
            <SelectItem value="Mature">Mature</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map((lc) => (
            <PlantCard
              key={lc.plant.id.toString()}
              lifecycle={lc}
              admin
              onRefresh={() => refetch()}
            />
          ))}
        </div>
      )}

      <Dialog open={showAddPlant} onOpenChange={setShowAddPlant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Plant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Variety</Label>
              <Select
                value={form.varietyId}
                onValueChange={(v) => setForm((f) => ({ ...f, varietyId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select variety" />
                </SelectTrigger>
                <SelectContent>
                  {varieties.map((v) => (
                    <SelectItem key={v.id.toString()} value={v.id.toString()}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stage</Label>
              <Select
                value={form.stage}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    stage: v as "Seed" | "Seedling" | "Mature",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Seed">Germinated ($5)</SelectItem>
                  <SelectItem value="Seedling">Seedling ($25)</SelectItem>
                  <SelectItem value="Mature">Mature ($45)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!form.varietyId || addPlant.isPending}
              onClick={async () => {
                try {
                  const stageMap: Record<string, PlantStage> = {
                    Seed: { Seed: null },
                    Seedling: { Seedling: null },
                    Mature: { Mature: null },
                  };
                  const result = await addPlant.mutateAsync({
                    varietyId: BigInt(form.varietyId),
                    stage: stageMap[form.stage],
                  });
                  toast.success(
                    `Plant #${result.plantId} created — NFT #${result.nftTokenId}. Claim URL: /claim/${result.claimToken}`,
                  );
                  setShowAddPlant(false);
                  refetch();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              {addPlant.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Create Plant + Assign NFT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddVariety} onOpenChange={setShowAddVariety}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variety</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name (e.g. Carolina Reaper)"
              value={varietyForm.name}
              onChange={(e) =>
                setVarietyForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <Input
              placeholder="Species"
              value={varietyForm.species}
              onChange={(e) =>
                setVarietyForm((f) => ({ ...f, species: e.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Scoville min"
                value={varietyForm.scovilleMin}
                onChange={(e) =>
                  setVarietyForm((f) => ({ ...f, scovilleMin: e.target.value }))
                }
              />
              <Input
                placeholder="Scoville max"
                value={varietyForm.scovilleMax}
                onChange={(e) =>
                  setVarietyForm((f) => ({ ...f, scovilleMax: e.target.value }))
                }
              />
            </div>
            <Textarea
              placeholder="Description"
              value={varietyForm.description}
              onChange={(e) =>
                setVarietyForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <Button
              className="w-full"
              disabled={!varietyForm.name || addVariety.isPending}
              onClick={async () => {
                await addVariety.mutateAsync({
                  name: varietyForm.name,
                  species: varietyForm.species,
                  scovilleMin: Number(varietyForm.scovilleMin),
                  scovilleMax: Number(varietyForm.scovilleMax),
                  description: varietyForm.description,
                });
                toast.success("Variety added");
                setShowAddVariety(false);
              }}
            >
              Save Variety
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerPlants() {
  const { data: plants = [], isLoading } = useMyPlantsNims();
  if (isLoading) return <Skeleton className="h-40" />;
  if (plants.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Leaf className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">
          No plants yet — visit the Shop to get your first pepper plant!
        </p>
        <Link to="/marketplace">
          <Button>Browse Shop</Button>
        </Link>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {plants.map((lc) => (
        <PlantCard key={lc.plant.id.toString()} lifecycle={lc} onRefresh={() => {}} />
      ))}
    </div>
  );
}

function PublicGate() {
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <Sprout className="w-16 h-16 mx-auto text-primary" />
      <h2 className="text-2xl font-display font-bold">NIMS — Nursery Inventory</h2>
      <p className="text-muted-foreground">
        Track your IC SPICY pepper plants from germination through harvest. Every plant
        ships with an on-chain NFT proving its provenance.
      </p>
      <p className="text-sm text-muted-foreground">Sign in to track your plants.</p>
    </div>
  );
}

export default function NIMS() {
  const { isAuthenticated } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <Leaf className="text-primary" /> NIMS Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Nursery Inventory Management — Port Charlotte, FL
        </p>
      </div>
      {!isAuthenticated ? (
        <PublicGate />
      ) : isAdmin ? (
        <AdminDashboard />
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">My Plants</h2>
          <CustomerPlants />
        </div>
      )}
    </div>
  );
}
