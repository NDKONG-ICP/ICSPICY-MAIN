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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  BookOpen,
  Box,
  CheckCircle2,
  ChevronRight,
  Coins,
  Copy,
  Cpu,
  Crown,
  Database,
  ExternalLink,
  Flame,
  FolderOpen,
  Gift,
  ImagePlus,
  Layers,
  MoreVertical,
  Package,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Shuffle,
  Sprout,
  Tag,
  Trash2,
  Upload,
  Users,
  Vote,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  NFTStandard,
  OrderStatus,
  PlantStage,
  ProductCategory,
  ProposalType,
  RarityTier,
  TreasuryToken,
} from "../backend";
import type { ArtworkLayer } from "../backend";
import type { BatchGiftPackPublic } from "../backend";
import type { FoundersMintInput, FoundersMintResult } from "../backend";
import { useAuth } from "../hooks/useAuth";
import {
  useAddArtworkLayer,
  useAdminSubmitToDAB,
  useAirdropNFT,
  useArtworkLayers,
  useAssignPoolNFT,
  useBatchAssignPoolNFTs,
  useBatchMintFoundersCollection,
  useBeginArtworkUpload,
  useBulkCreateProducts,
  useCreateBatchGiftPack,
  useCreatePlant,
  useCreateProduct,
  useCreateProposal,
  useCreateTray,
  useDeleteProduct,
  useFinalizeArtworkUpload,
  useGenerateAllPoolNFTs,
  useGenerateClaimToken,
  useGeneratePickupQR,
  useGetPoolDashboard,
  useListArtworkFiles,
  useListPoolNFTs,
  useMarkPlantGerminated,
  useMintEXT,
  useMintHederaNFT,
  useMintICRC37,
  useMintRWAProvenance,
  useMyOrders,
  usePlants,
  useProducts,
  useProposals,
  useRefreshTokenPrices,
  useResetPoolNFT,
  useStorePhotoFile,
  useTokenPrices,
  useTrays,
  useTreasuryBalances,
  useTreasuryDeposit,
  useTreasuryLedger,
  useTreasuryTransfer,
  useTreasuryWithdraw,
  useTriggerLifecycleUpgrade,
  useUpdateOrderStatus,
  useUpdatePlantMetadata,
  useUpdatePlantStage,
  useUpdateProduct,
  useUploadArtworkChunk,
} from "../hooks/useBackend";
import { CHILI_VARIETIES } from "../types/index";
import type { Plant, Product, Tray } from "../types/index";
import { compressImage } from "../utils/imageUtils";
import AdminCookBookTab from "./AdminCookBookTab";

// ─── Shared helpers ──────────────────────────────────────────────────────────

function formatCents(cents: bigint) {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function truncatePrincipal(p: string) {
  return p.length > 16 ? `${p.slice(0, 8)}…${p.slice(-6)}` : p;
}

const STAGE_LABELS: Record<PlantStage, string> = {
  [PlantStage.Seed]: "🌱 Seed",
  [PlantStage.Seedling]: "🌿 Seedling",
  [PlantStage.Mature]: "🌶️ Mature",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.Pending]:
    "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  [OrderStatus.Shipped]: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  [OrderStatus.PickedUp]: "bg-green-500/10 text-green-400 border-green-500/30",
  [OrderStatus.Cancelled]:
    "bg-destructive/10 text-destructive border-destructive/30",
};

// ─── 72-Cell Grid ────────────────────────────────────────────────────────────

function TrayGrid({ tray }: { tray: Tray }) {
  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-2">
        Cell occupancy — {tray.cells.filter(Boolean).length}/
        {tray.cells.length || 72} occupied
      </p>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
      >
        {Array.from({ length: 72 }, (_, i) => {
          const cell = tray.cells[i];
          const cellKey = cell
            ? `plant-${cell.toString()}`
            : `empty-${tray.id.toString()}-${i}`;
          return (
            <div
              key={cellKey}
              title={
                cell ? `Plant #${cell.toString()}` : `Cell ${i + 1} — empty`
              }
              className={`aspect-square rounded-sm border transition-smooth ${
                cell
                  ? "bg-primary/40 border-primary/60"
                  : "bg-muted/30 border-border/40"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Trays Tab ───────────────────────────────────────────────────────────────

function TraysTab() {
  const [trayName, setTrayName] = useState("");
  const [nftStandard, setNftStandard] = useState<NFTStandard>(
    NFTStandard.ICRC37,
  );
  const [plantingDate, setPlantingDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [expandedTray, setExpandedTray] = useState<string | null>(null);
  const createTray = useCreateTray();
  const { data: trays, isLoading } = useTrays();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trayName) return;
    try {
      await createTray.mutateAsync({
        name: trayName,
        nft_standard: nftStandard,
        planting_date: BigInt(new Date(plantingDate).getTime() * 1_000_000),
      });
      toast.success("Tray created successfully!");
      setTrayName("");
    } catch {
      toast.error("Failed to create tray.");
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-tray-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Sprout className="w-4 h-4 text-primary" />
          New 72-Cell Seed Tray
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="tray-name" className="text-xs">
              Tray Name
            </Label>
            <Input
              id="tray-name"
              value={trayName}
              onChange={(e) => setTrayName(e.target.value)}
              placeholder="e.g. Spring 2026 Batch"
              className="mt-1 text-sm"
              data-ocid="admin-tray-name"
            />
          </div>
          <div>
            <Label htmlFor="tray-date" className="text-xs">
              Planting Date
            </Label>
            <Input
              id="tray-date"
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              className="mt-1 text-sm"
              data-ocid="admin-tray-date"
            />
          </div>
          <div>
            <Label htmlFor="tray-nft" className="text-xs">
              NFT Standard
            </Label>
            <Select
              value={nftStandard}
              onValueChange={(v) => setNftStandard(v as NFTStandard)}
            >
              <SelectTrigger
                id="tray-nft"
                className="mt-1"
                data-ocid="admin-tray-nft-standard"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NFTStandard.ICRC37}>
                  ICRC-37 (ICP)
                </SelectItem>
                <SelectItem value={NFTStandard.Hedera}>Hedera RWA</SelectItem>
                <SelectItem value={NFTStandard.EXT}>
                  EXT (backward compat)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={createTray.isPending || !trayName}
          className="bg-primary"
          data-ocid="admin-create-tray-btn"
        >
          <Plus className="w-4 h-4" />
          {createTray.isPending ? "Creating…" : "Create Tray"}
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((k) => (
            <Skeleton key={k} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : trays && trays.length > 0 ? (
        <div className="space-y-3" data-ocid="admin-tray-list">
          {trays.map((tray) => {
            const id = tray.id.toString();
            const isExpanded = expandedTray === id;
            return (
              <div
                key={id}
                className="rounded-xl bg-card border border-border overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedTray(isExpanded ? null : id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-smooth text-left"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Tray #{id} — {tray.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tray.nft_standard} · Planted{" "}
                      {new Date(
                        Number(tray.planting_date) / 1_000_000,
                      ).toLocaleDateString()}{" "}
                      · {tray.cells.filter(Boolean).length} /{" "}
                      {tray.cells.length || 72} cells
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border">
                    <TrayGrid tray={tray} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          No trays yet. Create the first one above!
        </p>
      )}
    </div>
  );
}

// ─── Plants Tab ──────────────────────────────────────────────────────────────

function PlantsTab() {
  const { data: plants } = usePlants();
  const { data: trays } = useTrays();
  const createPlant = useCreatePlant();
  const updateStage = useUpdatePlantStage();
  const markGerminated = useMarkPlantGerminated();
  const updateMeta = useUpdatePlantMetadata();

  const [filterStage, setFilterStage] = useState<PlantStage | "all">("all");
  const [selectedPlantId, setSelectedPlantId] = useState("");
  const [upgradeStage, setUpgradeStage] = useState<PlantStage>(
    PlantStage.Seedling,
  );
  const [upgradeNotes, setUpgradeNotes] = useState("");
  const [germinationDate, setGerminationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [editNotes, setEditNotes] = useState("");
  const [editGenetics, setEditGenetics] = useState("");

  // New plant form
  const [newPlantTray, setNewPlantTray] = useState("");
  const [newPlantVariety, setNewPlantVariety] = useState("");
  const [newPlantCell, setNewPlantCell] = useState("");
  const [newPlantGenetics, setNewPlantGenetics] = useState("");
  const [newPlantNFT, setNewPlantNFT] = useState<NFTStandard>(
    NFTStandard.ICRC37,
  );

  const filtered =
    filterStage === "all"
      ? plants
      : plants?.filter((p) => p.stage === filterStage);

  const handleCreatePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlantTray || !newPlantVariety || !newPlantCell) return;
    try {
      await createPlant.mutateAsync({
        tray_id: BigInt(newPlantTray),
        variety: newPlantVariety,
        cell_position: BigInt(newPlantCell),
        genetics: newPlantGenetics || newPlantVariety,
        notes: "",
        planting_date: BigInt(Date.now() * 1_000_000),
        nft_standard: newPlantNFT,
      });
      toast.success("Plant created!");
      setNewPlantTray("");
      setNewPlantVariety("");
      setNewPlantCell("");
      setNewPlantGenetics("");
    } catch {
      toast.error("Failed to create plant.");
    }
  };

  const handleMarkGerminated = async () => {
    if (!selectedPlantId) return;
    try {
      await markGerminated.mutateAsync({
        plantId: BigInt(selectedPlantId),
        date: BigInt(new Date(germinationDate).getTime() * 1_000_000),
      });
      toast.success("Germination recorded!");
    } catch {
      toast.error("Failed to record germination.");
    }
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlantId) return;
    try {
      await updateStage.mutateAsync({
        plantId: BigInt(selectedPlantId),
        stage: upgradeStage,
        notes: upgradeNotes,
      });
      toast.success("Stage upgraded (burn & mint)!");
      setSelectedPlantId("");
      setUpgradeNotes("");
    } catch {
      toast.error("Failed to upgrade stage.");
    }
  };

  const handleSaveMeta = async () => {
    if (!selectedPlantId) return;
    try {
      await updateMeta.mutateAsync({
        plant_id: BigInt(selectedPlantId),
        notes: editNotes || undefined,
        genetics: editGenetics || undefined,
      });
      toast.success("Metadata saved!");
    } catch {
      toast.error("Failed to save metadata.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Plant */}
      <form
        onSubmit={handleCreatePlant}
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-plant-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Sprout className="w-4 h-4 text-primary" />
          Register New Plant
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Tray</Label>
            <Select value={newPlantTray} onValueChange={setNewPlantTray}>
              <SelectTrigger className="mt-1" data-ocid="admin-plant-tray">
                <SelectValue placeholder="Select tray" />
              </SelectTrigger>
              <SelectContent>
                {trays?.map((t) => (
                  <SelectItem key={t.id.toString()} value={t.id.toString()}>
                    Tray #{t.id.toString()} — {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Variety</Label>
            <Select value={newPlantVariety} onValueChange={setNewPlantVariety}>
              <SelectTrigger className="mt-1" data-ocid="admin-plant-variety">
                <SelectValue placeholder="Variety" />
              </SelectTrigger>
              <SelectContent>
                {CHILI_VARIETIES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cell Position (1–72)</Label>
            <Input
              type="number"
              min={1}
              max={72}
              value={newPlantCell}
              onChange={(e) => setNewPlantCell(e.target.value)}
              placeholder="1"
              className="mt-1 text-sm"
              data-ocid="admin-plant-cell"
            />
          </div>
          <div>
            <Label className="text-xs">Genetics (optional)</Label>
            <Input
              value={newPlantGenetics}
              onChange={(e) => setNewPlantGenetics(e.target.value)}
              placeholder="e.g. F3 cross"
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">NFT Standard</Label>
            <Select
              value={newPlantNFT}
              onValueChange={(v) => setNewPlantNFT(v as NFTStandard)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NFTStandard.ICRC37}>
                  ICRC-37 (ICP)
                </SelectItem>
                <SelectItem value={NFTStandard.Hedera}>Hedera RWA</SelectItem>
                <SelectItem value={NFTStandard.EXT}>
                  EXT (backward compat)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={
            createPlant.isPending ||
            !newPlantTray ||
            !newPlantVariety ||
            !newPlantCell
          }
          className="bg-primary"
          data-ocid="admin-create-plant-btn"
        >
          <Plus className="w-4 h-4" />
          {createPlant.isPending ? "Creating…" : "Register Plant"}
        </Button>
      </form>

      {/* Mark Germinated */}
      <div
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-germination-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Mark Germinated
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs">Plant</Label>
            <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
              <SelectTrigger className="mt-1" data-ocid="admin-germinate-plant">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {plants?.map((p) => (
                  <SelectItem key={p.id.toString()} value={p.id.toString()}>
                    #{p.id.toString()} {p.variety} ({STAGE_LABELS[p.stage]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Germination Date</Label>
            <Input
              type="date"
              value={germinationDate}
              onChange={(e) => setGerminationDate(e.target.value)}
              className="mt-1 text-sm"
              data-ocid="admin-germination-date"
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={markGerminated.isPending || !selectedPlantId}
          onClick={handleMarkGerminated}
          className="bg-primary"
          data-ocid="admin-mark-germinated-btn"
        >
          <CheckCircle2 className="w-4 h-4" />
          {markGerminated.isPending ? "Saving…" : "Confirm Germination"}
        </Button>
      </div>

      {/* Stage Upgrade */}
      <form
        onSubmit={handleUpgrade}
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-upgrade-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Lifecycle Upgrade (Burn & Mint)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Plant</Label>
            <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
              <SelectTrigger className="mt-1" data-ocid="admin-plant-select">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {plants?.map((p) => (
                  <SelectItem key={p.id.toString()} value={p.id.toString()}>
                    #{p.id.toString()} {p.variety} ({STAGE_LABELS[p.stage]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">New Stage</Label>
            <Select
              value={upgradeStage}
              onValueChange={(v) => setUpgradeStage(v as PlantStage)}
            >
              <SelectTrigger className="mt-1" data-ocid="admin-new-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PlantStage.Seed}>
                  {STAGE_LABELS[PlantStage.Seed]}
                </SelectItem>
                <SelectItem value={PlantStage.Seedling}>
                  {STAGE_LABELS[PlantStage.Seedling]}
                </SelectItem>
                <SelectItem value={PlantStage.Mature}>
                  {STAGE_LABELS[PlantStage.Mature]}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input
              value={upgradeNotes}
              onChange={(e) => setUpgradeNotes(e.target.value)}
              placeholder="Transplant notes, observations…"
              className="mt-1 text-sm"
              data-ocid="admin-upgrade-notes"
            />
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={updateStage.isPending || !selectedPlantId}
          className="bg-primary"
          data-ocid="admin-upgrade-btn"
        >
          <Flame className="w-4 h-4" />
          {updateStage.isPending ? "Upgrading…" : "Upgrade Stage"}
        </Button>
      </form>

      {/* Edit Metadata */}
      <div
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-metadata-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          Edit Plant Metadata
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-xs">Plant</Label>
            <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
              <SelectTrigger className="mt-1" data-ocid="admin-meta-plant">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {plants?.map((p) => (
                  <SelectItem key={p.id.toString()} value={p.id.toString()}>
                    #{p.id.toString()} {p.variety}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Genetics</Label>
            <Input
              value={editGenetics}
              onChange={(e) => setEditGenetics(e.target.value)}
              placeholder="F2 cross, open-pollinated…"
              className="mt-1 text-sm"
              data-ocid="admin-meta-genetics"
            />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Growth observations…"
              className="mt-1 text-sm"
              data-ocid="admin-meta-notes"
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={updateMeta.isPending || !selectedPlantId}
          onClick={handleSaveMeta}
          className="bg-primary"
          data-ocid="admin-save-meta-btn"
        >
          {updateMeta.isPending ? "Saving…" : "Save Metadata"}
        </Button>
      </div>

      {/* Plant List */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="font-display font-semibold text-foreground text-sm">
            Plant Registry
          </h3>
          <Select
            value={filterStage}
            onValueChange={(v) => setFilterStage(v as PlantStage | "all")}
          >
            <SelectTrigger
              className="w-36 h-8 text-xs"
              data-ocid="admin-plant-filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value={PlantStage.Seed}>Seeds</SelectItem>
              <SelectItem value={PlantStage.Seedling}>Seedlings</SelectItem>
              <SelectItem value={PlantStage.Mature}>Mature</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2" data-ocid="admin-plant-list">
          {filtered?.map((plant) => (
            <PlantRow key={plant.id.toString()} plant={plant} />
          ))}
          {(!filtered || filtered.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No plants in this stage.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PlantRow({ plant }: { plant: Plant }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border text-sm">
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">
          #{plant.id.toString()} — {plant.variety}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tray #{plant.tray_id.toString()} · Cell{" "}
          {plant.cell_position.toString()} · {plant.nft_standard}
          {plant.nft_id && (
            <span className="ml-1 text-primary">
              · NFT#{plant.nft_id.slice(0, 8)}…
            </span>
          )}
        </p>
      </div>
      <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
        {STAGE_LABELS[plant.stage]}
      </Badge>
    </div>
  );
}

// ─── Products Tab ────────────────────────────────────────────────────────────

// ─── Multi-Image Gallery Upload ──────────────────────────────────────────────

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_GALLERY_IMAGES = 5;

interface GalleryUploadProps {
  imageKeys: string[];
  onChange: (keys: string[]) => void;
}

function GalleryUpload({ imageKeys, onChange }: GalleryUploadProps) {
  const storePhoto = useStorePhotoFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = imageKeys.length < MAX_GALLERY_IMAGES;

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!file.type.startsWith("image/")) return null;
      if (file.size > MAX_PHOTO_BYTES) return null;
      const compressed = await compressImage(file);
      const arrayBuffer = await compressed.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      return storePhoto.mutateAsync({
        pathPrefix: "shop-listings",
        data,
        mimeType: "image/jpeg",
      });
    },
    [storePhoto],
  );

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    const arr = Array.from(files);
    const remaining = MAX_GALLERY_IMAGES - imageKeys.length;
    const toUpload = arr.slice(0, remaining);
    if (arr.length > remaining) {
      setError(`Max ${MAX_GALLERY_IMAGES} images. Only ${remaining} added.`);
    }
    setUploadingCount(toUpload.length);
    try {
      const keys: string[] = [];
      for (const file of toUpload) {
        const key = await uploadFile(file);
        if (key) keys.push(key);
      }
      onChange([...imageKeys, ...keys]);
      if (keys.length > 0)
        toast.success(
          `${keys.length} photo${keys.length > 1 ? "s" : ""} uploaded!`,
        );
    } catch {
      setError("Upload failed. Please try again.");
      toast.error("Photo upload failed.");
    } finally {
      setUploadingCount(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canAddMore) return;
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    onChange(imageKeys.filter((_, i) => i !== index));
  };

  const isUploading = uploadingCount > 0;

  return (
    <div className="space-y-3">
      {/* Existing image thumbnails */}
      {imageKeys.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageKeys.map((key, idx) => (
            <div
              key={key}
              className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted/20 flex-shrink-0"
            >
              <img
                src={`/api/object-storage/${key}`}
                alt={`Listing ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-card/90 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove photo ${idx + 1}`}
              >
                <X className="w-3 h-3" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-card/80 text-primary py-0.5">
                  Main
                </span>
              )}
            </div>
          ))}
          {/* Upload-more slot */}
          {canAddMore && !isUploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-muted/10 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              aria-label="Add more photos"
              data-ocid="gallery-add-photo-btn"
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-[9px]">Add photo</span>
            </button>
          )}
        </div>
      )}

      {/* Initial dropzone (no images yet) */}
      {imageKeys.length === 0 && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
            data-ocid="gallery-photo-input"
          />
          {isUploading ? (
            <div
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20"
              data-ocid="gallery-uploading"
            >
              <RefreshCw className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Uploading {uploadingCount} photo{uploadingCount > 1 ? "s" : ""}…
              </p>
            </div>
          ) : (
            <button
              type="button"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload listing photos"
              className={`w-full border-2 border-dashed rounded-lg p-5 flex flex-col items-center gap-2 cursor-pointer transition-smooth ${
                isDragOver
                  ? "border-primary/70 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/10"
              }`}
              data-ocid="gallery-photo-dropzone"
            >
              <ImagePlus
                className={`w-7 h-7 ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
              />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Add up to {MAX_GALLERY_IMAGES} photos
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drag & drop or click · JPG / PNG · Max 5 MB each
                </p>
              </div>
            </button>
          )}
        </>
      )}

      {/* Hidden file input for add-more (when images exist) */}
      {imageKeys.length > 0 && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      )}

      {/* Upload indicator when adding more */}
      {isUploading && imageKeys.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
          Uploading {uploadingCount} photo{uploadingCount > 1 ? "s" : ""}…
        </div>
      )}

      {error && (
        <p
          className="text-xs text-destructive flex items-center gap-1"
          data-ocid="gallery-photo-error"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground">
        {imageKeys.length}/{MAX_GALLERY_IMAGES} photos · First photo is the main
        listing image
      </p>
    </div>
  );
}

// Keep single-image ShopPhotoUpload for the Internal Catalog form (backward compat)

interface ShopPhotoUploadProps {
  imageKey: string | null;
  onChange: (key: string | null) => void;
}

function ShopPhotoUpload({ imageKey, onChange }: ShopPhotoUploadProps) {
  const storePhoto = useStorePhotoFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setCompressionInfo(null);
    if (!file.type.startsWith("image/")) {
      setError("Please select a JPG or PNG image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const originalSize = file.size;
      const compressed = await compressImage(file);
      const compressedSize = compressed.size;
      setCompressionInfo({
        original: originalSize,
        compressed: compressedSize,
      });
      const arrayBuffer = await compressed.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const key = await storePhoto.mutateAsync({
        pathPrefix: "shop-listings",
        data,
        mimeType: "image/jpeg",
      });
      onChange(key);
      toast.success("Photo uploaded!");
    } catch {
      setError("Upload failed. Please try again.");
      toast.error("Photo upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Existing image (edit mode) — show preview with replace button
  if (imageKey && !uploading) {
    return (
      <div className="space-y-2">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-muted/20">
          <img
            src={`/api/object-storage/${imageKey}`}
            alt="Listing preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setCompressionInfo(null);
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/90 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove photo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {compressionInfo && (
          <p className="text-[10px] text-muted-foreground">
            Original: {Math.round(compressionInfo.original / 1024)} KB →
            Compressed: {Math.round(compressionInfo.compressed / 1024)} KB
          </p>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-primary hover:underline flex items-center gap-1"
          data-ocid="shop-photo-replace-btn"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          Replace photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
        data-ocid="shop-photo-input"
      />
      {uploading ? (
        <div
          className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20"
          data-ocid="shop-photo-uploading"
        >
          <RefreshCw className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
          <p className="text-sm text-muted-foreground">Uploading photo…</p>
        </div>
      ) : (
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload listing photo"
          className={`w-full border-2 border-dashed rounded-lg p-5 flex flex-col items-center gap-2 cursor-pointer transition-smooth ${
            isDragOver
              ? "border-primary/70 bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/10"
          }`}
          data-ocid="shop-photo-dropzone"
        >
          <ImagePlus
            className={`w-7 h-7 ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
          />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Add listing photo
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag & drop or click · JPG / PNG · Max 5 MB
            </p>
          </div>
        </button>
      )}
      {compressionInfo && !uploading && (
        <p className="text-[10px] text-muted-foreground">
          Original: {Math.round(compressionInfo.original / 1024)} KB →
          Compressed: {Math.round(compressionInfo.compressed / 1024)} KB
        </p>
      )}
      {error && (
        <p
          className="text-xs text-destructive flex items-center gap-1"
          data-ocid="shop-photo-error"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// Category options for the manual Add For-Sale Item form
const FOR_SALE_CATEGORIES = [
  { label: "Seedling", value: ProductCategory.Seedling },
  { label: "Gallon (1 gal)", value: ProductCategory.Gallon1 },
  { label: "Gallon (5 gal)", value: ProductCategory.Gallon5 },
  { label: "Spice", value: ProductCategory.Spice },
  { label: "Garden Inputs", value: ProductCategory.GardenInputs },
] as const;

const DESC_MAX = 500;

function AddForSaleItemForm({
  createProduct,
}: {
  createProduct: ReturnType<typeof useCreateProduct>;
}) {
  const [fsName, setFsName] = useState("");
  const [fsDesc, setFsDesc] = useState("");
  const [fsCategory, setFsCategory] = useState<ProductCategory>(
    ProductCategory.Seedling,
  );
  const [fsPrice, setFsPrice] = useState("");
  const [fsStage, setFsStage] = useState("");
  const [fsQty, setFsQty] = useState("1");
  const [fsImageKeys, setFsImageKeys] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fsName || !fsPrice) return;
    const qty = Number.parseInt(fsQty) || 1;
    const stageNote = fsStage ? ` · Stage/Size: ${fsStage}` : "";
    const qtyNote = qty > 1 ? ` · Qty available: ${qty}` : "";
    try {
      await createProduct.mutateAsync({
        name: fsName,
        description: `${fsDesc}${stageNote}${qtyNote}`.trim(),
        price_cents: BigInt(Math.round(Number.parseFloat(fsPrice) * 100)),
        category: fsCategory,
        variety: fsStage || undefined,
        image_key: fsImageKeys[0] ?? undefined,
        image_keys: fsImageKeys,
      });
      toast.success(`"${fsName}" added to shop!`);
      setFsName("");
      setFsDesc("");
      setFsPrice("");
      setFsStage("");
      setFsQty("1");
      setFsImageKeys([]);
    } catch {
      toast.error("Failed to add item.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-xl bg-primary/5 border border-primary/30 space-y-4"
      data-ocid="admin-for-sale-form"
    >
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-primary" />
        Add For-Sale Item
        <span className="ml-auto text-[10px] font-normal px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
          Auto marked For Sale
        </span>
      </h3>

      {/* Multi-image gallery upload */}
      <div>
        <Label className="text-xs">Listing Photos (up to 5, optional)</Label>
        <div className="mt-1">
          <GalleryUpload imageKeys={fsImageKeys} onChange={setFsImageKeys} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Item Name *</Label>
          <Input
            value={fsName}
            onChange={(e) => setFsName(e.target.value)}
            placeholder="e.g. Carolina Reaper Seedling"
            className="mt-1 text-sm"
            required
            data-ocid="admin-fs-name"
          />
        </div>
        <div>
          <Label className="text-xs">Price (USD) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={fsPrice}
            onChange={(e) => setFsPrice(e.target.value)}
            placeholder="6.00"
            className="mt-1 text-sm"
            required
            data-ocid="admin-fs-price"
          />
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <Select
            value={fsCategory}
            onValueChange={(v) => setFsCategory(v as ProductCategory)}
          >
            <SelectTrigger className="mt-1" data-ocid="admin-fs-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOR_SALE_CATEGORIES.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Stock Quantity</Label>
          <Input
            type="number"
            min="1"
            value={fsQty}
            onChange={(e) => setFsQty(e.target.value)}
            placeholder="1"
            className="mt-1 text-sm"
            data-ocid="admin-fs-qty"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Quantity is recorded in the description (backend uses units-sold
            tracking)
          </p>
        </div>
        <div>
          <Label className="text-xs">Stage / Container Size (optional)</Label>
          <Input
            value={fsStage}
            onChange={(e) => setFsStage(e.target.value)}
            placeholder="e.g. 1-gallon, Seedling, 5-gallon…"
            className="mt-1 text-sm"
            data-ocid="admin-fs-stage"
          />
        </div>
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Description *</Label>
            <span
              className={`text-[10px] ${fsDesc.length > DESC_MAX ? "text-destructive" : "text-muted-foreground"}`}
            >
              {fsDesc.length}/{DESC_MAX}
            </span>
          </div>
          <Textarea
            value={fsDesc}
            onChange={(e) => setFsDesc(e.target.value.slice(0, DESC_MAX))}
            placeholder="Describe this item for the storefront…"
            className="mt-0 text-sm resize-none"
            rows={3}
            required
            data-ocid="admin-fs-desc"
          />
        </div>
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={createProduct.isPending || !fsName || !fsPrice || !fsDesc}
        className="bg-primary"
        data-ocid="admin-fs-submit-btn"
      >
        <ShoppingBag className="w-4 h-4" />
        {createProduct.isPending ? "Adding…" : "Add to Shop"}
      </Button>
    </form>
  );
}

// ─── Bulk Upload Row Types ────────────────────────────────────────────────────

interface BulkRow {
  id: string;
  name: string;
  category: ProductCategory;
  subcategory: string;
  description: string;
  quantity: string;
  price: string;
  errors: Record<string, string>;
}

const BULK_DRAFT_KEY = "ic-spicy-bulk-upload-draft";
const MAX_BULK_ROWS = 20;

function makeBulkRow(): BulkRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    category: ProductCategory.Seedling,
    subcategory: "",
    description: "",
    quantity: "1",
    price: "",
    errors: {},
  };
}

function BulkUploadPanel() {
  const bulkCreate = useBulkCreateProducts();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const savedDraft = (() => {
    try {
      const s = localStorage.getItem(BULK_DRAFT_KEY);
      return s ? (JSON.parse(s) as BulkRow[]) : null;
    } catch {
      return null;
    }
  })();

  const [rows, setRows] = useState<BulkRow[]>(savedDraft ?? [makeBulkRow()]);
  const [submitResult, setSubmitResult] = useState<{
    created: number;
    total: number;
    rowErrors: string[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const saveDraft = (updated: BulkRow[]) => {
    localStorage.setItem(BULK_DRAFT_KEY, JSON.stringify(updated));
    setRows(updated);
  };

  const updateRow = (id: string, field: keyof BulkRow, value: string) => {
    saveDraft(
      rows.map((r) =>
        r.id === id
          ? { ...r, [field]: value, errors: { ...r.errors, [field]: "" } }
          : r,
      ),
    );
  };

  const addRow = () => {
    if (rows.length >= MAX_BULK_ROWS) return;
    saveDraft([...rows, makeBulkRow()]);
  };

  const removeRow = (id: string) => saveDraft(rows.filter((r) => r.id !== id));

  const clearDraft = () => {
    localStorage.removeItem(BULK_DRAFT_KEY);
    setRows([makeBulkRow()]);
    setSubmitResult(null);
  };

  const validateRows = (): boolean => {
    let valid = true;
    const updated = rows.map((r) => {
      const errors: Record<string, string> = {};
      if (!r.name.trim()) errors.name = "Required";
      if (!r.price || Number.isNaN(Number.parseFloat(r.price)))
        errors.price = "Required";
      if (!r.category) errors.category = "Required";
      if (Object.keys(errors).length) valid = false;
      return { ...r, errors };
    });
    setRows(updated);
    return valid;
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const parsed: BulkRow[] = [];
      for (const line of lines.slice(1)) {
        // skip header
        const parts = line
          .split(",")
          .map((p) => p.trim().replace(/^"|"$/g, ""));
        const [
          name = "",
          category = "",
          subcategory = "",
          description = "",
          quantity = "1",
          price = "",
        ] = parts;
        parsed.push({
          id: `csv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name,
          category: (category as ProductCategory) || ProductCategory.Seedling,
          subcategory,
          description,
          quantity: quantity || "1",
          price,
          errors: {},
        });
      }
      if (parsed.length > 0) {
        saveDraft(parsed.slice(0, MAX_BULK_ROWS));
        toast.success(
          `Imported ${parsed.length} rows from CSV. Review and submit.`,
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleBatchSubmit = async () => {
    if (!validateRows()) {
      toast.error("Fix highlighted errors before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const inputs = rows.map((r) => ({
        name: r.name.trim(),
        description:
          `${r.description}${r.subcategory ? ` · ${r.subcategory}` : ""}${r.quantity !== "1" ? ` · Qty: ${r.quantity}` : ""}`.trim(),
        price_cents: BigInt(Math.round(Number.parseFloat(r.price) * 100)),
        category: r.category,
        variety: r.subcategory || undefined,
        image_key: undefined as string | undefined,
        image_keys: [],
      }));
      const results = await bulkCreate.mutateAsync(inputs);
      const created = results.filter((r) => "ok" in r).length;
      const rowErrors = results
        .map((r, i) =>
          "err" in r
            ? `Row ${i + 1} (${rows[i].name}): ${(r as { err: string }).err}`
            : null,
        )
        .filter(Boolean) as string[];
      setSubmitResult({ created, total: rows.length, rowErrors });
      if (created > 0) {
        toast.success(`${created} of ${rows.length} products created!`);
        clearDraft();
      } else {
        toast.error("No products were created. Check errors below.");
      }
    } catch (err) {
      toast.error(
        `Batch failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="p-5 rounded-xl bg-card border border-border space-y-4"
      data-ocid="admin-bulk-upload-panel"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-primary" />
          Bulk Upload
          <Badge
            variant="outline"
            className="text-[10px] border-primary/40 text-primary"
          >
            {rows.length}/{MAX_BULK_ROWS} rows
          </Badge>
        </h3>
        <div className="flex items-center gap-2">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCSV}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs border-border"
            onClick={() => csvInputRef.current?.click()}
            data-ocid="bulk-import-csv-btn"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            Import CSV
          </Button>
          <button
            type="button"
            onClick={clearDraft}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            data-ocid="bulk-clear-draft-btn"
          >
            Clear draft
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        CSV format:{" "}
        <code className="text-primary/80">
          name,category,subcategory,description,quantity,price
        </code>{" "}
        · Photos can be added to each listing after creation.
      </p>

      {/* Row table */}
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className="p-3 rounded-lg bg-muted/10 border border-border space-y-2"
            data-ocid={`bulk-row.${idx + 1}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-6 flex-shrink-0">
                {idx + 1}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
                <div>
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(row.id, "name", e.target.value)}
                    placeholder="Product name *"
                    className={`text-xs h-8 ${row.errors.name ? "border-destructive" : ""}`}
                    data-ocid={`bulk-name-${idx + 1}`}
                  />
                  {row.errors.name && (
                    <p className="text-[10px] text-destructive mt-0.5">
                      {row.errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <Select
                    value={row.category}
                    onValueChange={(v) => updateRow(row.id, "category", v)}
                  >
                    <SelectTrigger
                      className={`h-8 text-xs ${row.errors.category ? "border-destructive" : ""}`}
                      data-ocid={`bulk-category-${idx + 1}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOR_SALE_CATEGORIES.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    value={row.subcategory}
                    onChange={(e) =>
                      updateRow(row.id, "subcategory", e.target.value)
                    }
                    placeholder="Subcategory / size"
                    className="text-xs h-8"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Input
                    value={row.description}
                    onChange={(e) =>
                      updateRow(row.id, "description", e.target.value)
                    }
                    placeholder="Description"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(row.id, "quantity", e.target.value)
                    }
                    placeholder="Qty"
                    className="text-xs h-8"
                    data-ocid={`bulk-qty-${idx + 1}`}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.price}
                    onChange={(e) => updateRow(row.id, "price", e.target.value)}
                    placeholder="Price USD *"
                    className={`text-xs h-8 ${row.errors.price ? "border-destructive" : ""}`}
                    data-ocid={`bulk-price-${idx + 1}`}
                  />
                  {row.errors.price && (
                    <p className="text-[10px] text-destructive mt-0.5">
                      {row.errors.price}
                    </p>
                  )}
                </div>
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  aria-label="Remove row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add row / batch submit */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        {rows.length < MAX_BULK_ROWS && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs border-border"
            onClick={addRow}
            data-ocid="bulk-add-row-btn"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Row
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="bg-primary h-8 text-xs"
          onClick={handleBatchSubmit}
          disabled={submitting || rows.every((r) => !r.name)}
          data-ocid="bulk-submit-btn"
        >
          {submitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 mr-1" />
              Batch Submit ({rows.length})
            </>
          )}
        </Button>
      </div>

      {/* Result feedback */}
      {submitResult && (
        <div
          className={`p-3 rounded-lg border text-xs ${submitResult.created === submitResult.total ? "bg-primary/10 border-primary/30 text-primary" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"}`}
          data-ocid="bulk-submit-result"
        >
          <p className="font-semibold mb-1">
            {submitResult.created} of {submitResult.total} products created
          </p>
          {submitResult.rowErrors.map((e) => (
            <p key={e} className="text-destructive/80">
              {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductsTab() {
  const {
    data: products,
    isPending: productsLoading,
    isError: productsError,
  } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [category, setCategory] = useState<ProductCategory>(
    ProductCategory.Seedling,
  );
  const [variety, setVariety] = useState("");
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const storePhoto = useStorePhotoFile();

  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");

  const isUploading = storePhoto.isPending;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !priceCents || isUploading) return;
    const qtyNum = Number.parseInt(qty) || 1;
    const qtyNote = qtyNum > 1 ? ` · Qty available: ${qtyNum}` : "";
    try {
      await createProduct.mutateAsync({
        name,
        description: `${description}${qtyNote}`.trim(),
        price_cents: BigInt(Math.round(Number.parseFloat(priceCents) * 100)),
        category,
        variety: variety && variety !== "__none__" ? variety : undefined,
        image_key: imageKey ?? undefined,
        image_keys: imageKey ? [imageKey] : [],
      });
      toast.success("Product created!");
      setName("");
      setDescription("");
      setPriceCents("");
      setVariety("");
      setImageKey(null);
      setQty("1");
    } catch {
      toast.error("Failed to create product.");
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await updateProduct.mutateAsync({
        product_id: product.id,
        active: !product.active,
      });
      toast.success(`Product ${product.active ? "deactivated" : "activated"}.`);
    } catch {
      toast.error("Failed to update product.");
    }
  };

  const handleSavePrice = async (product: Product) => {
    if (!newPrice) return;
    try {
      await updateProduct.mutateAsync({
        product_id: product.id,
        price_cents: BigInt(Math.round(Number.parseFloat(newPrice) * 100)),
      });
      toast.success("Price updated!");
      setEditingPrice(null);
      setNewPrice("");
    } catch {
      toast.error("Failed to update price.");
    }
  };

  const handleDelete = async (productId: bigint) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct.mutateAsync(productId);
      toast.success("Product deleted.");
    } catch {
      toast.error("Failed to delete product.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Manual Add For-Sale Item (admin shortcut) ── */}
      <AddForSaleItemForm createProduct={createProduct} />

      {/* ── Bulk Upload ── */}
      <BulkUploadPanel />

      <form
        onSubmit={handleCreate}
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-product-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          New Product (Internal Catalog Entry)
        </h3>

        {/* Photo upload */}
        <div>
          <Label className="text-xs">Product Photo (optional)</Label>
          <div className="mt-1">
            <ShopPhotoUpload imageKey={imageKey} onChange={setImageKey} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apocalypse Scorpion Seedling"
              className="mt-1 text-sm"
              required
              data-ocid="admin-product-name"
            />
          </div>
          <div>
            <Label className="text-xs">Price ($) *</Label>
            <Input
              type="number"
              step="0.01"
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
              placeholder="6.00"
              className="mt-1 text-sm"
              required
              data-ocid="admin-product-price"
            />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ProductCategory)}
            >
              <SelectTrigger
                className="mt-1"
                data-ocid="admin-product-category"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProductCategory.Seedling}>
                  Seedling
                </SelectItem>
                <SelectItem value={ProductCategory.Gallon1}>
                  Gallon (1 gal)
                </SelectItem>
                <SelectItem value={ProductCategory.Gallon5}>
                  Gallon (5 gal)
                </SelectItem>
                <SelectItem value={ProductCategory.Spice}>Spice</SelectItem>
                <SelectItem value={ProductCategory.GardenInputs}>
                  Garden Inputs
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Stock Quantity</Label>
            <Input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="1"
              className="mt-1 text-sm"
              data-ocid="admin-product-qty"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Recorded in description (informational)
            </p>
          </div>
          <div>
            <Label className="text-xs">Variety (optional)</Label>
            <Select value={variety} onValueChange={setVariety}>
              <SelectTrigger className="mt-1" data-ocid="admin-product-variety">
                <SelectValue placeholder="Any variety" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {CHILI_VARIETIES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Description *</Label>
              <span
                className={`text-[10px] ${description.length > DESC_MAX ? "text-destructive" : "text-muted-foreground"}`}
              >
                {description.length}/{DESC_MAX}
              </span>
            </div>
            <Textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, DESC_MAX))
              }
              placeholder="Product description…"
              className="mt-0 text-sm resize-none"
              rows={3}
              required
              data-ocid="admin-product-desc"
            />
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={
            createProduct.isPending ||
            isUploading ||
            !name ||
            !priceCents ||
            !description
          }
          className="bg-primary"
          data-ocid="admin-create-product-btn"
        >
          <Plus className="w-4 h-4" />
          {isUploading
            ? "Uploading photo…"
            : createProduct.isPending
              ? "Creating…"
              : "Create Product"}
        </Button>
      </form>

      <div className="space-y-2" data-ocid="admin-product-list">
        {productsLoading && (
          <div className="space-y-2" data-ocid="admin-products-loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}
        {productsError && !productsLoading && (
          <div
            className="flex items-center gap-2 text-destructive text-sm py-4 justify-center"
            data-ocid="admin-products-error_state"
          >
            <AlertCircle className="w-4 h-4" />
            Failed to load products. Please refresh the page.
          </div>
        )}
        {!productsLoading &&
          !productsError &&
          products?.map((product) => (
            <div
              key={product.id.toString()}
              className={`p-4 rounded-xl bg-card border border-border ${!product.active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                {/* Product image thumbnail */}
                {product.image_key && (
                  <img
                    src={`/api/object-storage/${product.image_key}`}
                    alt={product.name}
                    className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {product.category}
                        {product.variety ? ` · ${product.variety}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {editingPrice === product.id.toString() ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="w-20 h-7 text-xs"
                            autoFocus
                            data-ocid="admin-edit-price-input"
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-primary"
                            onClick={() => handleSavePrice(product)}
                            data-ocid="admin-save-price-btn"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setEditingPrice(null)}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPrice(product.id.toString());
                            setNewPrice(
                              (Number(product.price_cents) / 100).toFixed(2),
                            );
                          }}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                          data-ocid="admin-product-price-edit"
                        >
                          {formatCents(product.price_cents)}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(product)}
                        className={`text-xs px-2 py-1 rounded-md border transition-smooth ${product.active ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground border-border"}`}
                        data-ocid="admin-product-toggle"
                      >
                        {product.active ? "Active" : "Inactive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                        aria-label="Delete product"
                        data-ocid="admin-delete-product-btn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        {!productsLoading &&
          !productsError &&
          (!products || products.length === 0) && (
            <p
              className="text-sm text-muted-foreground text-center py-6"
              data-ocid="admin-products-empty_state"
            >
              No products yet.
            </p>
          )}
      </div>
    </div>
  );
}

// ─── Orders Tab ──────────────────────────────────────────────────────────────

function OrdersTab() {
  const { data: orders, isLoading } = useMyOrders();
  const updateStatus = useUpdateOrderStatus();
  const generateQR = useGeneratePickupQR();
  const [qrPayload, setQrPayload] = useState<string | null>(null);

  const handleStatusUpdate = async (orderId: bigint, status: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId, status });
      toast.success(`Order updated to ${status}.`);
    } catch {
      toast.error("Failed to update order status.");
    }
  };

  const handleGenerateQR = async (plantId: bigint) => {
    try {
      const payload = await generateQR.mutateAsync(plantId);
      setQrPayload(payload);
      toast.success("QR payload generated!");
    } catch {
      toast.error("Failed to generate QR.");
    }
  };

  if (isLoading)
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((k) => (
          <Skeleton key={k} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );

  return (
    <div className="space-y-4" data-ocid="admin-order-list">
      {qrPayload && (
        <div className="p-4 rounded-xl bg-card border border-primary/30">
          <p className="text-xs text-muted-foreground mb-1">
            QR Pickup Payload:
          </p>
          <code className="text-xs text-primary break-all">{qrPayload}</code>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 text-xs h-7"
            onClick={() => setQrPayload(null)}
          >
            Close
          </Button>
        </div>
      )}

      {orders && orders.length > 0 ? (
        orders.map((order) => (
          <div
            key={order.id.toString()}
            className="p-4 rounded-xl bg-card border border-border"
            data-ocid="admin-order-row"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-medium text-foreground text-sm">
                  Order #{order.id.toString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {truncatePrincipal(order.buyer.toText())} ·{" "}
                  {new Date(
                    Number(order.created_at) / 1_000_000,
                  ).toLocaleDateString()}
                  {order.pickup
                    ? " · 🏪 Pickup"
                    : order.shipping_address
                      ? ` · 📦 ${order.shipping_address.slice(0, 30)}…`
                      : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-md border ${STATUS_COLORS[order.status]}`}
                >
                  {order.status}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatCents(order.total_cents)}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
              {order.items.map((item) => (
                <div key={`${order.id}-${item.product_id}`}>
                  Qty {item.quantity.toString()} × Product #
                  {item.product_id.toString()} — {formatCents(item.price_cents)}
                  {item.plant_id !== undefined && item.plant_id !== null && (
                    <button
                      type="button"
                      onClick={() => handleGenerateQR(item.plant_id as bigint)}
                      className="ml-2 text-primary hover:underline"
                      data-ocid="admin-gen-qr-btn"
                    >
                      Gen QR
                    </button>
                  )}
                </div>
              ))}
            </div>

            {order.status === OrderStatus.Pending && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
                  variant="outline"
                  onClick={() =>
                    handleStatusUpdate(order.id, OrderStatus.Shipped)
                  }
                  data-ocid="admin-order-ship-btn"
                >
                  Mark Shipped
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                  variant="outline"
                  onClick={() =>
                    handleStatusUpdate(order.id, OrderStatus.PickedUp)
                  }
                  data-ocid="admin-order-pickup-btn"
                >
                  Mark Picked Up
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  variant="destructive"
                  onClick={() =>
                    handleStatusUpdate(order.id, OrderStatus.Cancelled)
                  }
                  data-ocid="admin-order-cancel-btn"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-12" data-ocid="admin-orders-empty">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── NFT Minting Tab ─────────────────────────────────────────────────────────

function NFTMintingTab() {
  const { data: plants } = usePlants();
  const mintICRC = useMintICRC37();
  const mintHedera = useMintHederaNFT();
  const mintEXT = useMintEXT();
  const airdrop = useAirdropNFT();

  const [mintPlantId, setMintPlantId] = useState("");
  const [mintStandard, setMintStandard] = useState<NFTStandard>(
    NFTStandard.ICRC37,
  );
  const [mintedIds, setMintedIds] = useState<string[]>([]);

  const [airdropTokenId, setAirdropTokenId] = useState("");
  const [airdropRecipient, setAirdropRecipient] = useState("");

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintPlantId) return;
    try {
      const plant = plants?.find((p) => p.id.toString() === mintPlantId);
      const attrs: Array<[string, string]> = plant
        ? [
            ["variety", plant.variety],
            ["stage", plant.stage],
            ["tray", plant.tray_id.toString()],
          ]
        : [];
      let tokenId: string;
      if (mintStandard === NFTStandard.Hedera) {
        tokenId = await mintHedera.mutateAsync({
          plantId: BigInt(mintPlantId),
          imageKey: null,
          attributes: attrs,
        });
      } else if (mintStandard === NFTStandard.EXT) {
        tokenId = await mintEXT.mutateAsync({
          plantId: BigInt(mintPlantId),
          imageKey: "",
          attributes: attrs,
        });
      } else {
        tokenId = await mintICRC.mutateAsync({
          plantId: BigInt(mintPlantId),
          imageKey: null,
          attributes: attrs,
        });
      }
      setMintedIds((prev) => [tokenId, ...prev]);
      toast.success(`NFT minted! Token: ${tokenId.slice(0, 12)}…`);
      setMintPlantId("");
    } catch {
      toast.error("Minting failed.");
    }
  };

  const handleAirdrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!airdropTokenId || !airdropRecipient) return;
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const recipientPrincipal = Principal.fromText(airdropRecipient);
      await airdrop.mutateAsync({
        tokenId: airdropTokenId,
        recipient: recipientPrincipal,
      });
      toast.success("NFT airdropped!");
      setAirdropTokenId("");
      setAirdropRecipient("");
    } catch {
      toast.error("Airdrop failed. Check the principal address.");
    }
  };

  const isPending =
    mintICRC.isPending || mintHedera.isPending || mintEXT.isPending;

  return (
    <div className="space-y-6">
      {/* Mint NFT */}
      <form
        onSubmit={handleMint}
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-mint-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          Mint Plant NFT
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Plant</Label>
            <Select value={mintPlantId} onValueChange={setMintPlantId}>
              <SelectTrigger className="mt-1" data-ocid="admin-mint-plant">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {plants?.map((p) => (
                  <SelectItem key={p.id.toString()} value={p.id.toString()}>
                    #{p.id.toString()} {p.variety} — {STAGE_LABELS[p.stage]}
                    {p.nft_id ? " ✓ NFT" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">NFT Standard</Label>
            <Select
              value={mintStandard}
              onValueChange={(v) => setMintStandard(v as NFTStandard)}
            >
              <SelectTrigger className="mt-1" data-ocid="admin-mint-standard">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NFTStandard.ICRC37}>
                  ICRC-37 (ICP)
                </SelectItem>
                <SelectItem value={NFTStandard.Hedera}>
                  Hedera RWA Provenance
                </SelectItem>
                <SelectItem value={NFTStandard.EXT}>
                  EXT (backward compat)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !mintPlantId}
          className="bg-primary"
          data-ocid="admin-mint-btn"
        >
          <Zap className="w-4 h-4" />
          {isPending ? "Minting…" : "Mint NFT"}
        </Button>
      </form>

      {mintedIds.length > 0 && (
        <div
          className="p-4 rounded-xl bg-card border border-border space-y-2"
          data-ocid="admin-minted-ids"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recently Minted
          </p>
          {mintedIds.map((id) => (
            <code key={id} className="block text-xs text-primary break-all">
              {id}
            </code>
          ))}
        </div>
      )}

      {/* Airdrop */}
      <form
        onSubmit={handleAirdrop}
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-airdrop-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Box className="w-4 h-4 text-primary" />
          Airdrop NFT
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="text-xs">Token ID</Label>
            <Input
              value={airdropTokenId}
              onChange={(e) => setAirdropTokenId(e.target.value)}
              placeholder="NFT token ID…"
              className="mt-1 text-sm font-mono"
              data-ocid="admin-airdrop-token-id"
            />
          </div>
          <div>
            <Label className="text-xs">Recipient Principal</Label>
            <Input
              value={airdropRecipient}
              onChange={(e) => setAirdropRecipient(e.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx-cai"
              className="mt-1 text-sm font-mono"
              data-ocid="admin-airdrop-recipient"
            />
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={airdrop.isPending || !airdropTokenId || !airdropRecipient}
          className="bg-primary"
          data-ocid="admin-airdrop-btn"
        >
          <Box className="w-4 h-4" />
          {airdrop.isPending ? "Airdropping…" : "Airdrop NFT"}
        </Button>
      </form>
    </div>
  );
}

// ─── DAO Tab ──────────────────────────────────────────────────────────────────

type OptionEntry = { id: string; value: string };

function AdminDAOTab() {
  const createProposal = useCreateProposal();
  const { data: proposals, isLoading } = useProposals();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProposalType>(ProposalType.PlantVariety);
  const [optionInputs, setOptionInputs] = useState<OptionEntry[]>([
    { id: "opt-1", value: "" },
    { id: "opt-2", value: "" },
  ]);
  const [endDays, setEndDays] = useState("7");
  const [optCounter, setOptCounter] = useState(3);

  const addOption = () => {
    setOptionInputs((prev) => [
      ...prev,
      { id: `opt-${optCounter}`, value: "" },
    ]);
    setOptCounter((c) => c + 1);
  };
  const removeOption = (id: string) =>
    setOptionInputs((prev) => prev.filter((o) => o.id !== id));
  const updateOption = (id: string, val: string) =>
    setOptionInputs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, value: val } : o)),
    );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = optionInputs
      .map((o) => o.value.trim())
      .filter(Boolean);
    if (!title || validOptions.length < 2) {
      toast.error("Add at least 2 non-empty options.");
      return;
    }
    try {
      const daysMs = Number.parseInt(endDays || "7") * 24 * 60 * 60 * 1000;
      const endsAt = BigInt((Date.now() + daysMs) * 1_000_000);
      await createProposal.mutateAsync({
        title,
        description,
        proposal_type: type,
        options: validOptions,
        ends_at: endsAt,
      });
      toast.success("Proposal created!");
      setTitle("");
      setDescription("");
      setOptionInputs([
        { id: "opt-r1", value: "" },
        { id: "opt-r2", value: "" },
      ]);
      setEndDays("7");
    } catch {
      toast.error("Failed to create proposal.");
    }
  };

  const TYPE_LABELS: Record<ProposalType, string> = {
    [ProposalType.PlantVariety]: "🌶️ Plant Variety",
    [ProposalType.Seasoning]: "🧂 Seasoning",
    [ProposalType.General]: "📋 General",
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-proposal-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Vote className="w-4 h-4 text-primary" />
          Create DAO Proposal
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Which variety to grow next season?"
              className="mt-1 text-sm"
              data-ocid="admin-proposal-title"
            />
          </div>
          <div>
            <Label className="text-xs">Proposal Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as ProposalType)}
            >
              <SelectTrigger className="mt-1" data-ocid="admin-proposal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProposalType.PlantVariety}>
                  Plant Variety
                </SelectItem>
                <SelectItem value={ProposalType.Seasoning}>
                  Seasoning Product
                </SelectItem>
                <SelectItem value={ProposalType.General}>General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Duration (days)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={endDays}
              onChange={(e) => setEndDays(e.target.value)}
              className="mt-1 text-sm"
              data-ocid="admin-proposal-end-days"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the proposal and why it matters…"
              className="mt-1 text-sm resize-none"
              rows={3}
              data-ocid="admin-proposal-desc"
            />
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Options</Label>
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-primary hover:underline flex items-center gap-1"
                data-ocid="admin-add-option-btn"
              >
                <Plus className="w-3 h-3" /> Add option
              </button>
            </div>
            <div className="space-y-2">
              {optionInputs.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Input
                    value={opt.value}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="text-sm flex-1"
                    data-ocid={`admin-option-${idx}`}
                  />
                  {optionInputs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(opt.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={createProposal.isPending || !title}
          className="bg-primary"
          data-ocid="admin-create-proposal-btn"
        >
          <Vote className="w-4 h-4" />
          {createProposal.isPending ? "Creating…" : "Create Proposal"}
        </Button>
      </form>

      {/* Existing proposals overview */}
      <div>
        <h3 className="font-display font-semibold text-foreground text-sm mb-3">
          Existing Proposals
        </h3>
        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : proposals && proposals.length > 0 ? (
          <div className="space-y-2" data-ocid="admin-proposal-list">
            {proposals.map((p) => {
              const isExpired = Date.now() > Number(p.ends_at) / 1_000_000;
              return (
                <div
                  key={p.id.toString()}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TYPE_LABELS[p.proposal_type]} ·{" "}
                      {p.voter_count.toString()} votes
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs flex-shrink-0 ml-2 ${isExpired ? "opacity-50" : "border-primary/40 text-primary"}`}
                  >
                    {isExpired ? "Closed" : "Active"}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No proposals yet.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Artwork Collection Tab ───────────────────────────────────────────────────

const ZIP_CHUNK_SIZE = 1.5 * 1024 * 1024; // 1.5 MB per chunk

function ArtworkCollectionTab() {
  const { data: artworkFiles, refetch: refetchFiles } = useListArtworkFiles();
  const beginUpload = useBeginArtworkUpload();
  const uploadChunk = useUploadArtworkChunk();
  const finalizeUpload = useFinalizeArtworkUpload();

  const zipInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    layers: number;
    files: number;
    canisterId: string;
    layerSummaries: Array<{ layer: string; fileCount: number }>;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error("Please select a .zip file.");
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const totalChunks = Math.ceil(bytes.length / ZIP_CHUNK_SIZE);

      setProgress({ current: 0, total: totalChunks, label: "Initializing…" });
      await beginUpload.mutateAsync(BigInt(totalChunks));

      for (let i = 0; i < totalChunks; i++) {
        setProgress({
          current: i + 1,
          total: totalChunks,
          label: `Uploading chunk ${i + 1} of ${totalChunks}…`,
        });
        const start = i * ZIP_CHUNK_SIZE;
        const chunk = bytes.slice(start, start + ZIP_CHUNK_SIZE);
        await uploadChunk.mutateAsync({
          chunkIndex: BigInt(i),
          totalChunks: BigInt(totalChunks),
          data: chunk,
        });
      }

      setProgress({
        current: totalChunks,
        total: totalChunks,
        label: "Finalizing upload…",
      });
      const result = await finalizeUpload.mutateAsync();
      await refetchFiles();

      setUploadResult({
        layers: Number(result.layers_detected),
        files: Number(result.total_files),
        canisterId: result.asset_canister_id,
        layerSummaries: result.layer_summaries.map((s) => ({
          layer: s.layer,
          fileCount: Number(s.file_count),
        })),
      });
      toast.success(
        `Upload complete! ${result.layers_detected} layers detected.`,
      );
      setSelectedFile(null);
      setProgress(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      toast.error("Upload failed.");
      setProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const pct = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  // Build layer summary from artworkFiles: ["layer-1/file.png", size]
  const layerMap = new Map<string, number>();
  for (const [path] of artworkFiles ?? []) {
    const parts = path.split("/");
    const layer = parts[0] ?? "root";
    layerMap.set(layer, (layerMap.get(layer) ?? 0) + 1);
  }
  const layerEntries = Array.from(layerMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      {/* Zip upload zone */}
      <div
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-artwork-upload-zone"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Upload Artwork as ZIP
        </h3>
        <p className="text-xs text-muted-foreground">
          Zip your artwork folder (with layer-1/, layer-2/… subfolders) and drop
          it here. The file is split into chunks and uploaded directly to the
          on-chain asset canister — no third-party storage used.
        </p>

        {!selectedFile && !uploading && (
          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => zipInputRef.current?.click()}
            aria-label="Drop ZIP file or click to browse"
            className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-smooth group ${
              isDragOver
                ? "border-primary/70 bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/10"
            }`}
            data-ocid="admin-artwork-zip-drop"
          >
            <Upload
              className={`w-10 h-10 transition-smooth ${isDragOver ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop your artwork ZIP here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Or click to browse — ZIP containing layer-1/, layer-2/, …
                folders
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              ZIP · Max 10 layers · PNG / JPG / WEBP inside
            </span>
          </button>
        )}

        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
          }}
          data-ocid="admin-artwork-zip-input"
        />

        {/* Selected file + upload button */}
        {selectedFile && !uploading && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border">
            <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                {Math.ceil(selectedFile.size / ZIP_CHUNK_SIZE)} chunks
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                className="h-8 text-xs bg-primary"
                onClick={handleUpload}
                data-ocid="admin-artwork-upload-btn"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-border"
                onClick={() => setSelectedFile(null)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploading && progress && (
          <div className="space-y-2" data-ocid="admin-artwork-upload-progress">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {progress.label}
              </p>
              <span className="text-xs text-muted-foreground">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        )}

        {/* Error state */}
        {uploadError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {uploadError}
          </div>
        )}

        {/* Success result */}
        {uploadResult && (
          <div className="space-y-3" data-ocid="admin-artwork-upload-result">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Upload complete — {uploadResult.layers} layers,{" "}
              {uploadResult.files} total files
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-primary" />
                Asset Canister ID
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-primary break-all flex-1">
                  {uploadResult.canisterId}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(uploadResult.canisterId);
                    toast.success("Canister ID copied!");
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                  aria-label="Copy canister ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {uploadResult.layerSummaries.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-border divide-y divide-border">
                {uploadResult.layerSummaries.map((s, idx) => (
                  <div
                    key={s.layer}
                    className="flex items-center gap-3 px-4 py-2.5 bg-muted/10"
                  >
                    <span className="text-[10px] font-bold w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <p className="flex-1 text-sm font-medium text-foreground">
                      {s.layer}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {s.fileCount} files
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detected layers from canister */}
      {layerEntries.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            On-Chain Artwork Files
            <span className="text-xs font-normal text-muted-foreground ml-1">
              ({(artworkFiles ?? []).length} files across {layerEntries.length}{" "}
              layers)
            </span>
          </h3>
          <div
            className="rounded-xl overflow-hidden border border-border divide-y divide-border"
            data-ocid="admin-artwork-layer-grid"
          >
            {layerEntries.map(([layer, count], idx) => (
              <div
                key={layer}
                className="flex items-center gap-3 px-4 py-2.5 bg-card"
              >
                <span className="text-[10px] font-bold w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <p className="flex-1 text-sm font-medium text-foreground">
                  {layer}
                </p>
                <Badge
                  variant="outline"
                  className="text-[10px] border-primary/30 text-primary"
                >
                  {count} files
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {layerEntries.length === 0 && !uploadResult && (
        <div
          className="text-center py-10 text-muted-foreground"
          data-ocid="admin-artwork-layers-empty"
        >
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            No artwork uploaded yet. Upload a ZIP file above.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── NFT Pool Tab ─────────────────────────────────────────────────────────────

const POOL_RARITY_CONFIG = {
  Common: {
    label: "Common",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    emoji: "🟢",
  },
  Uncommon: {
    label: "Uncommon",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/30",
    emoji: "🔵",
  },
  Rare: {
    label: "Rare",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    emoji: "🟣",
  },
} as const;

function getPoolNFTRarity(nft: import("../backend").PoolNFTPublic): string {
  return typeof nft.rarity === "string"
    ? nft.rarity
    : ((nft.rarity as { __kind__: string }).__kind__ ?? "Common");
}

function getPoolNFTStatusKind(nft: import("../backend").PoolNFTPublic): string {
  return typeof nft.status === "string"
    ? nft.status
    : ((nft.status as { __kind__: string }).__kind__ ?? "Ready");
}

function PoolNFTCard({
  nft,
  selected,
  onToggle,
  onAction,
}: {
  nft: import("../backend").PoolNFTPublic;
  selected: boolean;
  onToggle: () => void;
  onAction: (action: "airdrop" | "shop" | "qr" | "reset") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rarity = getPoolNFTRarity(nft);
  const statusKind = getPoolNFTStatusKind(nft);
  const cfg =
    POOL_RARITY_CONFIG[rarity as keyof typeof POOL_RARITY_CONFIG] ??
    POOL_RARITY_CONFIG.Common;

  const STATUS_COLOR: Record<string, string> = {
    Ready: "text-foreground border-border bg-muted/20",
    Airdropped: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    ListedOnShop: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    AssignedToQR: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  };

  const STATUS_LABEL: Record<string, string> = {
    Ready: "Ready",
    Airdropped: "Airdropped",
    ListedOnShop: "On Shop",
    AssignedToQR: "QR Assigned",
  };

  return (
    <div
      className={`relative rounded-xl bg-card border transition-smooth ${selected ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/30"}`}
      data-ocid={`admin-pool-nft-${nft.id}`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-2 left-2 z-10 w-5 h-5 rounded border flex items-center justify-center transition-smooth"
        style={{
          background: selected ? "hsl(var(--primary))" : "transparent",
          borderColor: selected ? "hsl(var(--primary))" : "hsl(var(--border))",
        }}
        aria-label="Select NFT"
      >
        {selected && (
          <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
        )}
      </button>

      {/* 3-dot menu */}
      <div className="absolute top-2 right-2 z-10">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="w-6 h-6 rounded flex items-center justify-center bg-card/80 border border-border text-muted-foreground hover:text-foreground"
          aria-label="NFT actions"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 w-36 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden text-xs">
            {[
              { label: "Airdrop", action: "airdrop" as const },
              { label: "List on Shop", action: "shop" as const },
              { label: "Assign to QR", action: "qr" as const },
              { label: "Reset to Ready", action: "reset" as const },
            ].map((item) => (
              <button
                key={item.action}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction(item.action);
                }}
                className="w-full text-left px-3 py-2 hover:bg-muted/30 text-foreground transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 pt-8">
        <div className="flex items-center gap-1 mb-1.5">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bgClass} ${cfg.colorClass} ${cfg.borderClass}`}
          >
            {cfg.emoji} {rarity}
          </span>
        </div>
        <p className="text-[11px] font-mono text-foreground font-medium">
          #{nft.id.toString()}
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
          {nft.layer_combo.slice(0, 4).join("·")}
          {nft.layer_combo.length > 4 ? "…" : ""}
        </p>
        <span
          className={`mt-1.5 inline-block text-[9px] px-1.5 py-0.5 rounded border ${STATUS_COLOR[statusKind] ?? STATUS_COLOR.Ready}`}
        >
          {STATUS_LABEL[statusKind] ?? statusKind}
        </span>
      </div>
    </div>
  );
}

function NFTPoolTab() {
  const { data: dashboard, isLoading: dashLoading } = useGetPoolDashboard();
  const {
    data: allNFTs = [],
    isLoading: nftsLoading,
    refetch,
  } = useListPoolNFTs(null, 8888);
  const generatePool = useGenerateAllPoolNFTs();
  const assignNFT = useAssignPoolNFT();
  const batchAssign = useBatchAssignPoolNFTs();
  const resetPoolNFT = useResetPoolNFT();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("All");
  const [rarityFilter, setRarityFilter] = useState("All");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Action dialogs
  const [airdropOpen, setAirdropOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [airdropPrincipal, setAirdropPrincipal] = useState("");
  const [shopPrice, setShopPrice] = useState("25");
  const [actionTarget, setActionTarget] = useState<"selected" | string>(
    "selected",
  );
  const [qrResults, setQrResults] = useState<
    Array<{ nftId: string; claimToken: string }>
  >([]);

  const isPoolEmpty =
    !dashLoading && (!dashboard || Number(dashboard.total) === 0);

  const filtered = allNFTs.filter((nft) => {
    const rarity = getPoolNFTRarity(nft);
    const statusKind = getPoolNFTStatusKind(nft);
    const matchStatus =
      statusFilter === "All" ||
      (statusFilter === "Ready" && statusKind === "Ready") ||
      (statusFilter === "Airdropped" && statusKind === "Airdropped") ||
      (statusFilter === "Shop" && statusKind === "ListedOnShop") ||
      (statusFilter === "QRAssigned" && statusKind === "AssignedToQR");
    const matchRarity = rarityFilter === "All" || rarity === rarityFilter;
    return matchStatus && matchRarity;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const selectedList = Array.from(selectedIds);
  const selectedNFTs = allNFTs.filter((n) => selectedIds.has(n.id.toString()));
  const selectedByRarity = selectedNFTs.reduce(
    (acc, n) => {
      const r = getPoolNFTRarity(n);
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () =>
    setSelectedIds(new Set(paged.map((n) => n.id.toString())));
  const clearAll = () => setSelectedIds(new Set());

  const handleGenerate = async () => {
    try {
      const count = await generatePool.mutateAsync();
      toast.success(`Generated ${count} NFTs on-chain!`);
      await refetch();
    } catch (err) {
      toast.error(
        `Generation failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    }
  };

  const handleIndividualAction = (
    nftId: string,
    action: "airdrop" | "shop" | "qr" | "reset",
  ) => {
    setActionTarget(nftId);
    if (action === "airdrop") {
      setAirdropPrincipal("");
      setAirdropOpen(true);
    } else if (action === "shop") {
      setShopOpen(true);
    } else if (action === "qr") executeQR([nftId]);
    else if (action === "reset") executeReset([nftId]);
  };

  const executeAirdrop = async () => {
    if (!airdropPrincipal.trim()) {
      toast.error("Enter a principal ID.");
      return;
    }
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const to = Principal.fromText(airdropPrincipal.trim());
      const ids =
        actionTarget === "selected"
          ? selectedList.map(BigInt)
          : [BigInt(actionTarget)];
      if (ids.length === 1) {
        await assignNFT.mutateAsync({
          nftId: ids[0],
          action: { __kind__: "Airdrop", Airdrop: { to } },
        });
      } else {
        await batchAssign.mutateAsync({
          nftIds: ids,
          action: { __kind__: "Airdrop", Airdrop: { to } },
        });
      }
      toast.success(
        `Airdropped ${ids.length} NFT${ids.length > 1 ? "s" : ""}!`,
      );
      setAirdropOpen(false);
      clearAll();
      await refetch();
    } catch (err) {
      toast.error(
        `Airdrop failed: ${err instanceof Error ? err.message : "Check the principal."}`,
      );
    }
  };

  const executeShop = async () => {
    const priceIcp = Number.parseFloat(shopPrice) || 25;
    try {
      const ids =
        actionTarget === "selected"
          ? selectedList.map(BigInt)
          : [BigInt(actionTarget)];
      const product_id = BigInt(Math.floor(priceIcp * 100));
      if (ids.length === 1) {
        await assignNFT.mutateAsync({
          nftId: ids[0],
          action: { __kind__: "ListOnShop", ListOnShop: { product_id } },
        });
      } else {
        await batchAssign.mutateAsync({
          nftIds: ids,
          action: { __kind__: "ListOnShop", ListOnShop: { product_id } },
        });
      }
      toast.success(
        `Listed ${ids.length} NFT${ids.length > 1 ? "s" : ""} on shop!`,
      );
      setShopOpen(false);
      clearAll();
      await refetch();
    } catch (err) {
      toast.error(
        `Shop listing failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    }
  };

  const executeQR = async (overrideIds?: string[]) => {
    const ids = overrideIds ?? selectedList;
    try {
      const results: Array<{ nftId: string; claimToken: string }> = [];
      for (const id of ids) {
        const token = `claim-${id}-${Date.now()}`;
        await assignNFT.mutateAsync({
          nftId: BigInt(id),
          action: {
            __kind__: "AssignToQR",
            AssignToQR: { claim_token: token },
          },
        });
        results.push({ nftId: id, claimToken: token });
      }
      setQrResults(results);
      toast.success(
        `Assigned ${ids.length} NFT${ids.length > 1 ? "s" : ""} to QR!`,
      );
      clearAll();
      await refetch();
    } catch (err) {
      toast.error(
        `QR assignment failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    }
  };

  const executeReset = async (overrideIds?: string[]) => {
    const ids = overrideIds ?? selectedList;
    try {
      for (const id of ids) {
        await resetPoolNFT.mutateAsync(BigInt(id));
      }
      toast.success(
        `Reset ${ids.length} NFT${ids.length > 1 ? "s" : ""} to Ready.`,
      );
      await refetch();
    } catch {
      toast.error("Reset failed.");
    }
  };

  const commonCount = allNFTs.filter(
    (n) => getPoolNFTRarity(n) === "Common",
  ).length;
  const uncommonCount = allNFTs.filter(
    (n) => getPoolNFTRarity(n) === "Uncommon",
  ).length;
  const rareCount = allNFTs.filter(
    (n) => getPoolNFTRarity(n) === "Rare",
  ).length;

  return (
    <div className="space-y-6" data-ocid="admin-nft-pool-tab">
      {/* Pre-generation section */}
      {isPoolEmpty && (
        <div
          className="p-6 rounded-xl bg-primary/5 border border-primary/30 text-center space-y-4"
          data-ocid="admin-pool-generate-section"
        >
          <Database className="w-10 h-10 text-primary mx-auto opacity-70" />
          <div>
            <h3 className="font-display font-semibold text-foreground text-lg">
              NFT Pool is Empty
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Generate all 8,888 NFTs on-chain: 5,000 Common · 2,888 Uncommon ·
              1,000 Rare
            </p>
          </div>
          <Button
            className="bg-primary gap-2"
            onClick={handleGenerate}
            disabled={generatePool.isPending}
            data-ocid="admin-pool-generate-btn"
          >
            {generatePool.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Generating 8,888
                NFTs on-chain…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Generate 8,888 NFTs
              </>
            )}
          </Button>
        </div>
      )}

      {/* Dashboard stats */}
      {!isPoolEmpty && (
        <>
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            data-ocid="admin-pool-dashboard"
          >
            {dashLoading
              ? [1, 2, 3, 4].map((k) => (
                  <Skeleton key={k} className="h-20 rounded-xl" />
                ))
              : [
                  {
                    label: "Ready",
                    value: Number(dashboard?.ready ?? 0),
                    color: "text-foreground",
                    bg: "bg-muted/20",
                    border: "border-border",
                  },
                  {
                    label: "Airdropped",
                    value: Number(dashboard?.airdropped ?? 0),
                    color: "text-blue-400",
                    bg: "bg-blue-500/10",
                    border: "border-blue-500/30",
                  },
                  {
                    label: "Listed on Shop",
                    value: Number(dashboard?.listed_on_shop ?? 0),
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10",
                    border: "border-emerald-500/30",
                  },
                  {
                    label: "Assigned to QR",
                    value: Number(dashboard?.assigned_to_qr ?? 0),
                    color: "text-amber-400",
                    bg: "bg-amber-500/10",
                    border: "border-amber-500/30",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`p-4 rounded-xl border ${stat.border} ${stat.bg}`}
                  >
                    <p
                      className={`text-2xl font-display font-bold ${stat.color}`}
                    >
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
          </div>

          {/* Rarity breakdown */}
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="text-muted-foreground">By rarity:</span>
            <span className="text-emerald-400">
              🟢 Common — {commonCount.toLocaleString()}
            </span>
            <span className="text-cyan-400">
              🔵 Uncommon — {uncommonCount.toLocaleString()}
            </span>
            <span className="text-amber-400">
              🟣 Rare — {rareCount.toLocaleString()}
            </span>
          </div>

          {/* Filters */}
          <div
            className="flex flex-wrap gap-2 items-center"
            data-ocid="admin-pool-filters"
          >
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/40 border border-border">
              {["All", "Ready", "Airdropped", "Shop", "QRAssigned"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f);
                    setPage(0);
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-smooth ${statusFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  data-ocid={`admin-pool-filter-${f}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/40 border border-border">
              {["All", "Common", "Uncommon", "Rare"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRarityFilter(r);
                    setPage(0);
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-smooth ${rarityFilter === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  data-ocid={`admin-pool-rarity-${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length.toLocaleString()} NFTs
            </span>
          </div>

          {/* Batch actions bar */}
          {selectedIds.size > 0 && (
            <div
              className="sticky top-0 z-10 p-3 rounded-xl bg-card border border-primary/40 shadow-lg flex items-center gap-3 flex-wrap"
              data-ocid="admin-pool-batch-bar"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground">
                  {selectedIds.size} selected
                </span>
                <span className="text-xs text-muted-foreground">
                  (
                  {Object.entries(selectedByRarity)
                    .map(([r, c]) => `${c} ${r}`)
                    .join(", ")}
                  )
                </span>
              </div>
              <div className="flex gap-2 flex-wrap ml-auto">
                <Button
                  size="sm"
                  className="h-8 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                  variant="outline"
                  onClick={() => {
                    setActionTarget("selected");
                    setAirdropPrincipal("");
                    setAirdropOpen(true);
                  }}
                  data-ocid="admin-pool-batch-airdrop"
                >
                  <Box className="w-3.5 h-3.5" /> Airdrop
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                  variant="outline"
                  onClick={() => {
                    setActionTarget("selected");
                    setShopOpen(true);
                  }}
                  data-ocid="admin-pool-batch-shop"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> List on Shop
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                  variant="outline"
                  onClick={() => executeQR()}
                  data-ocid="admin-pool-batch-qr"
                >
                  <QrCode className="w-3.5 h-3.5" /> Assign to QR
                </Button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Select all / clear */}
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={selectAll}
              className="text-primary hover:underline"
            >
              Select page
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>

          {/* NFT Grid */}
          {nftsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
              {[
                "a",
                "b",
                "c",
                "d",
                "e",
                "f",
                "g",
                "h",
                "i",
                "j",
                "k",
                "l",
                "m",
                "n",
                "o",
                "p",
              ].map((k) => (
                <Skeleton
                  key={`pool-skel-${k}`}
                  className="aspect-square rounded-xl"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="admin-pool-empty"
            >
              <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No NFTs match these filters.</p>
            </div>
          ) : (
            <div
              className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2"
              data-ocid="admin-pool-nft-grid"
            >
              {paged.map((nft) => (
                <PoolNFTCard
                  key={nft.id.toString()}
                  nft={nft}
                  selected={selectedIds.has(nft.id.toString())}
                  onToggle={() => toggleSelect(nft.id.toString())}
                  onAction={(action) =>
                    handleIndividualAction(nft.id.toString(), action)
                  }
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                Page {page + 1} of {totalPages} ·{" "}
                {filtered.length.toLocaleString()} NFTs
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-border"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-border"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* QR results */}
          {qrResults.length > 0 && (
            <div
              className="p-4 rounded-xl bg-card border border-amber-500/30 space-y-2"
              data-ocid="admin-pool-qr-results"
            >
              <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" /> Generated QR Claim Tokens
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {qrResults.map(({ nftId, claimToken }) => (
                  <div
                    key={claimToken}
                    className="flex items-center gap-2 text-[10px]"
                  >
                    <span className="text-muted-foreground flex-shrink-0">
                      NFT #{nftId}
                    </span>
                    <code className="text-amber-400 font-mono truncate">
                      {claimToken}
                    </code>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setQrResults([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}
        </>
      )}

      {/* Airdrop dialog */}
      <Dialog open={airdropOpen} onOpenChange={setAirdropOpen}>
        <DialogContent
          className="bg-card border-border max-w-sm"
          data-ocid="admin-pool-airdrop-dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" /> Airdrop NFT
              {selectedIds.size > 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {actionTarget === "selected"
              ? `Airdrop ${selectedIds.size} selected NFT${selectedIds.size > 1 ? "s" : ""} to this principal.`
              : `Airdrop NFT #${actionTarget} to this principal.`}
          </p>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Recipient Principal</Label>
              <Input
                value={airdropPrincipal}
                onChange={(e) => setAirdropPrincipal(e.target.value)}
                placeholder="xxxxxx-xxx…"
                className="mt-1 text-sm font-mono"
                data-ocid="admin-pool-airdrop-principal"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-primary"
                onClick={executeAirdrop}
                disabled={assignNFT.isPending || batchAssign.isPending}
                data-ocid="admin-pool-airdrop-confirm"
              >
                {assignNFT.isPending || batchAssign.isPending
                  ? "Airdropping…"
                  : "Confirm Airdrop"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setAirdropOpen(false)}
                className="border-border"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shop listing dialog */}
      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent
          className="bg-card border-border max-w-sm"
          data-ocid="admin-pool-shop-dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" /> List on Shop
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {actionTarget === "selected"
              ? `List ${selectedIds.size} NFT${selectedIds.size > 1 ? "s" : ""} on the shop.`
              : `List NFT #${actionTarget} on the shop.`}
          </p>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Price (ICP)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={shopPrice}
                onChange={(e) => setShopPrice(e.target.value)}
                placeholder="25"
                className="mt-1 text-sm"
                data-ocid="admin-pool-shop-price"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-primary"
                onClick={executeShop}
                disabled={assignNFT.isPending || batchAssign.isPending}
                data-ocid="admin-pool-shop-confirm"
              >
                {assignNFT.isPending || batchAssign.isPending
                  ? "Listing…"
                  : "Confirm Listing"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShopOpen(false)}
                className="border-border"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── RWA Provenance Tab ───────────────────────────────────────────────────────

function RWAProvenanceTab() {
  const { data: plants } = usePlants();
  const { data: layers } = useArtworkLayers();
  const mintRWA = useMintRWAProvenance();

  const seedlings =
    plants?.filter((p) => p.stage === PlantStage.Seedling) ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [rarityTier, setRarityTier] = useState<RarityTier>(RarityTier.Common);
  const [mintedTokenIds, setMintedTokenIds] = useState<
    Array<{ plantId: string; tokenId: string; plantName: string }>
  >([]);

  const openModal = (plant: Plant) => {
    setSelectedPlant(plant);
    setSelectedLayerId("");
    setCustomNotes("");
    setRarityTier(RarityTier.Common);
    setModalOpen(true);
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlant || !selectedLayerId) return;
    try {
      const tokenId = await mintRWA.mutateAsync({
        plant_id: selectedPlant.id,
        artwork_layer_id: BigInt(selectedLayerId),
        custom_notes: customNotes,
        rarity_tier:
          rarityTier === RarityTier.Rare
            ? BigInt(15)
            : rarityTier === RarityTier.Uncommon
              ? BigInt(12)
              : BigInt(10),
      });
      setMintedTokenIds((prev) => [
        {
          plantId: selectedPlant.id.toString(),
          tokenId,
          plantName: selectedPlant.variety,
        },
        ...prev,
      ]);
      toast.success(`RWA NFT minted! Token: ${tokenId.slice(0, 16)}…`);
      setModalOpen(false);
    } catch (err) {
      toast.error(
        `Mint failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const selectedLayer = layers?.find(
    (l) => l.id.toString() === selectedLayerId,
  );

  return (
    <div className="space-y-6">
      <div
        className="p-5 rounded-xl bg-card border border-border space-y-2"
        data-ocid="admin-rwa-info"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          RWA Provenance Minting (ICRC-37)
        </h3>
        <p className="text-xs text-muted-foreground">
          Mint a Real-World Asset NFT for seedlings. Each NFT embeds full
          lifecycle metadata (genetics, feeding history, germination date,
          artwork layer) into the ICRC-37 token on ICP.
        </p>
      </div>

      {seedlings.length > 0 ? (
        <div className="space-y-2" data-ocid="admin-rwa-seedlings-list">
          {seedlings.map((plant) => (
            <div
              key={plant.id.toString()}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border"
              data-ocid="admin-rwa-seedling-row"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  #{plant.id.toString()} — {plant.variety}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tray #{plant.tray_id.toString()} · Cell{" "}
                  {plant.cell_position.toString()}
                  {plant.nft_id && (
                    <span className="ml-1 text-primary/80">· NFT minted ✓</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {plant.nft_id && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-primary border-primary/40"
                  >
                    ICRC-37
                  </Badge>
                )}
                <Button
                  size="sm"
                  className="h-8 text-xs bg-primary"
                  onClick={() => openModal(plant)}
                  data-ocid="admin-rwa-mint-btn"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Assign RWA Provenance
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="admin-rwa-empty"
        >
          <Sprout className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No seedlings yet</p>
          <p className="text-xs mt-1">
            Plants must be in the Seedling stage to mint RWA provenance NFTs.
          </p>
        </div>
      )}

      {mintedTokenIds.length > 0 && (
        <div
          className="p-4 rounded-xl bg-card border border-primary/30 space-y-2"
          data-ocid="admin-rwa-minted-list"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Minted This Session
          </p>
          {mintedTokenIds.map(({ plantId, tokenId, plantName }) => (
            <div
              key={`${plantId}-${tokenId}`}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-medium text-foreground">
                  {plantName} #{plantId}
                </span>
                <code className="block text-[10px] text-primary/80 break-all font-mono mt-0.5">
                  {tokenId}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="max-w-md bg-card border-border"
          data-ocid="admin-rwa-modal"
        >
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Assign RWA Provenance
            </DialogTitle>
          </DialogHeader>
          {selectedPlant && (
            <form onSubmit={handleMint} className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Plant</span>
                  <span className="text-foreground text-xs font-medium">
                    #{selectedPlant.id.toString()} — {selectedPlant.variety}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Stage</span>
                  <span className="text-foreground text-xs">🌿 Seedling</span>
                </div>
                {selectedPlant.latin_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">
                      Latin Name
                    </span>
                    <span className="text-foreground text-xs italic">
                      {selectedPlant.latin_name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Tray</span>
                  <span className="text-foreground text-xs">
                    #{selectedPlant.tray_id.toString()} · Cell{" "}
                    {selectedPlant.cell_position.toString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">
                    NFT Standard
                  </span>
                  <span className="text-foreground text-xs font-mono">
                    ICRC-37
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Artwork Layer</Label>
                <Select
                  value={selectedLayerId}
                  onValueChange={setSelectedLayerId}
                >
                  <SelectTrigger
                    className="mt-1"
                    data-ocid="admin-rwa-layer-select"
                  >
                    <SelectValue placeholder="Select artwork layer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(layers ?? []).length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                        No layers uploaded. Go to Artwork Collection tab.
                      </div>
                    ) : (
                      (layers ?? []).map((layer) => (
                        <SelectItem
                          key={layer.id.toString()}
                          value={layer.id.toString()}
                        >
                          Layer {layer.layer_number.toString()} — {layer.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedLayer && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={`/api/object-storage/${selectedLayer.object_key}`}
                      alt={selectedLayer.name}
                      className="w-10 h-10 rounded object-cover border border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Layer {selectedLayer.layer_number.toString()} preview
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">Rarity Tier</Label>
                <Select
                  value={rarityTier}
                  onValueChange={(v) => setRarityTier(v as RarityTier)}
                >
                  <SelectTrigger
                    className="mt-1"
                    data-ocid="admin-rwa-rarity-tier"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RarityTier.Common}>
                      🟢 Common — 10% discount
                    </SelectItem>
                    <SelectItem value={RarityTier.Uncommon}>
                      🔵 Uncommon — 12% discount
                    </SelectItem>
                    <SelectItem value={RarityTier.Rare}>
                      🟣 Rare — 15% discount
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Custom Provenance Notes</Label>
                <Textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Add any custom notes to embed in the NFT metadata…"
                  className="mt-1 text-sm resize-none"
                  rows={3}
                  data-ocid="admin-rwa-custom-notes"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={mintRWA.isPending || !selectedLayerId}
                  className="flex-1 bg-primary"
                  data-ocid="admin-rwa-mint-submit-btn"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {mintRWA.isPending ? "Minting…" : "Mint ICRC-37 NFT"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── QR Labels & Claim Tokens Tab ───────────────────────────────────────────

function QRLabelsTab() {
  const { data: plants } = usePlants();
  const generateClaim = useGenerateClaimToken();
  const triggerUpgrade = useTriggerLifecycleUpgrade();

  const [claimPlantId, setClaimPlantId] = useState("");
  const [claimRarity, setClaimRarity] = useState<RarityTier>(RarityTier.Common);
  const [generatedClaims, setGeneratedClaims] = useState<
    Array<{ plantId: string; tokenId: string; rarity: RarityTier; url: string }>
  >([]);

  const [upgradePlantId, setUpgradePlantId] = useState("");
  const [upgradeToStage, setUpgradeToStage] = useState("Seedling");

  const handleGenerateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimPlantId) return;
    try {
      const result = await generateClaim.mutateAsync({
        plantId: BigInt(claimPlantId),
        rarityTier: claimRarity,
      });
      const claimUrl = `${window.location.origin}/claim/${result.id}`;
      setGeneratedClaims((prev) => [
        {
          plantId: claimPlantId,
          tokenId: result.id,
          rarity: claimRarity,
          url: claimUrl,
        },
        ...prev,
      ]);
      toast.success(`Claim token generated for plant #${claimPlantId}`);
    } catch {
      toast.error("Failed to generate claim token.");
    }
  };

  const handleTriggerUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradePlantId) return;
    try {
      const newNftId = await triggerUpgrade.mutateAsync({
        plantId: BigInt(upgradePlantId),
        newStage: upgradeToStage,
      });
      toast.success(
        `Lifecycle upgrade complete! New NFT: ${newNftId.slice(0, 16)}…`,
      );
      setUpgradePlantId("");
    } catch {
      toast.error("Lifecycle upgrade failed.");
    }
  };

  const handlePrintQR = (url: string) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>IC SPICY QR Label</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px}img{width:200px;height:200px}p{margin:8px 0;font-size:14px}</style>
      </head><body>
      <p style="font-size:20px;font-weight:bold">🌶 IC SPICY</p>
      <p>Scan to claim your plant NFT</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" alt="QR" />
      <p style="font-size:11px;word-break:break-all">${url}</p>
      <script>window.print()</script>
      </body></html>
    `);
    win.document.close();
  };

  const RARITY_LABELS: Record<RarityTier, string> = {
    [RarityTier.Common]: "🟢 Common — 10% discount",
    [RarityTier.Uncommon]: "🔵 Uncommon — 12% discount",
    [RarityTier.Rare]: "🟣 Rare — 15% discount",
  };

  return (
    <div className="space-y-6">
      {/* Generate Claim Token */}
      <form
        onSubmit={handleGenerateClaim}
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-qr-claim-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" />
          Generate QR Claim Token
        </h3>
        <p className="text-xs text-muted-foreground">
          Generate a scannable QR label for any plant. When a customer scans it,
          they can claim the NFT directly from their phone and receive a
          lifetime discount.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Plant</Label>
            <Select value={claimPlantId} onValueChange={setClaimPlantId}>
              <SelectTrigger className="mt-1" data-ocid="admin-qr-plant-select">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {plants?.map((p) => (
                  <SelectItem key={p.id.toString()} value={p.id.toString()}>
                    #{p.id.toString()} {p.variety} — {STAGE_LABELS[p.stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Rarity Tier</Label>
            <Select
              value={claimRarity}
              onValueChange={(v) => setClaimRarity(v as RarityTier)}
            >
              <SelectTrigger
                className="mt-1"
                data-ocid="admin-qr-rarity-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RARITY_LABELS).map(([tier, label]) => (
                  <SelectItem key={tier} value={tier}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={generateClaim.isPending || !claimPlantId}
          className="bg-primary"
          data-ocid="admin-gen-claim-btn"
        >
          <QrCode className="w-4 h-4" />
          {generateClaim.isPending ? "Generating…" : "Generate QR Claim Token"}
        </Button>
      </form>

      {/* Generated claim tokens */}
      {generatedClaims.length > 0 && (
        <div className="space-y-3" data-ocid="admin-generated-claims">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Generated Claim Tokens (this session)
          </h3>
          {generatedClaims.map(({ plantId, tokenId, rarity, url }) => (
            <div
              key={tokenId}
              className="flex items-start justify-between gap-3 p-4 rounded-xl bg-card border border-border"
              data-ocid="admin-claim-token-row"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Plant #{plantId} — {rarity}
                </p>
                <code className="text-[10px] text-primary break-all font-mono block mt-0.5">
                  {tokenId}
                </code>
                <p className="text-[10px] text-muted-foreground mt-0.5 break-all">
                  {url}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 h-8 text-xs border-border"
                onClick={() => handlePrintQR(url)}
                data-ocid="admin-print-qr-btn"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Automated Lifecycle Upgrade Trigger */}
      <form
        onSubmit={handleTriggerUpgrade}
        className="p-5 rounded-xl bg-card border border-primary/20 space-y-4"
        data-ocid="admin-lifecycle-upgrade-form"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Automated Lifecycle Upgrade Trigger
        </h3>
        <p className="text-xs text-muted-foreground">
          Trigger a burn-and-mint NFT upgrade for a plant. The old NFT is burned
          and a new one is minted with updated lifecycle metadata.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Plant</Label>
            <Select value={upgradePlantId} onValueChange={setUpgradePlantId}>
              <SelectTrigger
                className="mt-1"
                data-ocid="admin-lifecycle-plant-select"
              >
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {plants?.map((p) => (
                  <SelectItem key={p.id.toString()} value={p.id.toString()}>
                    #{p.id.toString()} {p.variety} — {STAGE_LABELS[p.stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Upgrade To Stage</Label>
            <Select value={upgradeToStage} onValueChange={setUpgradeToStage}>
              <SelectTrigger
                className="mt-1"
                data-ocid="admin-lifecycle-stage-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Seedling">🌿 Seedling</SelectItem>
                <SelectItem value="Mature">🌶️ Mature</SelectItem>
                <SelectItem value="Harvested">🧺 Harvested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={triggerUpgrade.isPending || !upgradePlantId}
          className="bg-primary"
          data-ocid="admin-lifecycle-trigger-btn"
        >
          <Flame className="w-4 h-4" />
          {triggerUpgrade.isPending
            ? "Upgrading…"
            : "Trigger Lifecycle Upgrade"}
        </Button>
      </form>
    </div>
  );
}

// ─── Batch Gift Packs Tab ─────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  [RarityTier.Common]:
    "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  [RarityTier.Uncommon]: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  [RarityTier.Rare]: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};

const RARITY_EMOJI: Record<string, string> = {
  [RarityTier.Common]: "🟢",
  [RarityTier.Uncommon]: "🔵",
  [RarityTier.Rare]: "🟣",
};

function getRarityFromPct(pct: bigint): RarityTier {
  if (pct >= 15) return RarityTier.Rare;
  if (pct >= 12) return RarityTier.Uncommon;
  return RarityTier.Common;
}

function BatchGiftPacksTab() {
  const { data: plants, isLoading: plantsLoading } = usePlants();
  const createPack = useCreateBatchGiftPack();

  // Plants eligible = those with an nft_id (NFT minted)
  const eligiblePlants = plants?.filter((p) => !!p.nft_id) ?? [];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [packName, setPackName] = useState("");
  const [packDesc, setPackDesc] = useState("");
  const [generatedPacks, setGeneratedPacks] = useState<
    Array<{ pack: BatchGiftPackPublic; name: string; plantNames: string[] }>
  >([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      toast.error("Select at least one plant with a minted NFT.");
      return;
    }
    try {
      const plantIds = Array.from(selectedIds).map((id) => BigInt(id));
      const pack = await createPack.mutateAsync(plantIds);
      const selectedPlantNames = eligiblePlants
        .filter((p) => selectedIds.has(p.id.toString()))
        .map((p) => `${p.variety} #${p.id.toString()}`);
      setGeneratedPacks((prev) => [
        { pack, name: packName || "Gift Pack", plantNames: selectedPlantNames },
        ...prev,
      ]);
      toast.success(
        `Batch gift pack created! ${selectedIds.size} NFTs bundled.`,
      );
      setSelectedIds(new Set());
      setPackName("");
      setPackDesc("");
    } catch (err) {
      toast.error(
        `Failed to create pack: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const handlePrintQR = (entry: {
    pack: BatchGiftPackPublic;
    name: string;
    plantNames: string[];
  }) => {
    const url = `${window.location.origin}/claim/${entry.pack.claim_token_id}`;
    const rarity = getRarityFromPct(entry.pack.highest_rarity_pct);
    const discountPct = Number(entry.pack.highest_rarity_pct);
    const win = window.open("", "_blank");
    if (!win) return;
    const plantListHtml = entry.plantNames
      .map((n) => `<li style="margin:4px 0;font-size:13px">${n}</li>`)
      .join("");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>IC SPICY Gift Pack QR Label</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', sans-serif;
            background: #0a0a0b;
            color: #f1f0ef;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
            padding: 40px 20px;
          }
          .card {
            background: linear-gradient(135deg, #161618 0%, #1a1a1e 100%);
            border: 2px solid #22d3ee44;
            border-radius: 20px;
            padding: 36px 32px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 0 60px #22d3ee15;
          }
          .logo { font-size: 28px; font-weight: 700; color: #22d3ee; margin-bottom: 4px; letter-spacing: -0.5px; }
          .logo span { color: #f1f0ef; }
          .subtitle { font-size: 12px; color: #71717a; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; }
          .pack-name { font-size: 20px; font-weight: 700; color: #f1f0ef; margin-bottom: 6px; }
          .tagline { font-size: 14px; color: #22d3ee; margin-bottom: 24px; }
          .qr-wrap { background: #fff; border-radius: 12px; display: inline-flex; padding: 12px; margin-bottom: 20px; }
          .qr-wrap img { display: block; width: 180px; height: 180px; }
          .rarity-badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid #22d3ee44;
            color: #22d3ee;
            background: #22d3ee11;
            margin-bottom: 16px;
          }
          .plants-section { text-align: left; margin-bottom: 20px; }
          .plants-section h4 { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
          .plants-section ul { list-style: none; padding: 0; }
          .discount { font-size: 13px; color: #a1a1aa; margin-bottom: 12px; }
          .discount strong { color: #22d3ee; }
          .url-text { font-size: 10px; color: #52525b; word-break: break-all; margin-top: 16px; }
          @media print {
            body { background: #fff; padding: 0; }
            .card { box-shadow: none; border-color: #ccc; background: #fff; color: #111; }
            .logo, .tagline { color: #000; }
            .rarity-badge { border-color: #ccc; color: #333; background: #f5f5f5; }
            .discount, .url-text, .plants-section h4 { color: #555; }
            .plants-section ul li { color: #222; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🌶 IC <span>SPICY</span></div>
          <div class="subtitle">Rare Chili Plant NFT</div>
          <div class="pack-name">${entry.name || "Batch Gift Pack"}</div>
          <div class="tagline">Scan to claim your gift plants! 🎁</div>
          <div class="qr-wrap">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&qzone=1" alt="QR Code" />
          </div>
          <div class="rarity-badge">${RARITY_EMOJI[rarity]} ${rarity} · ${discountPct}% Discount</div>
          <div class="discount">Includes a <strong>${discountPct}% lifetime storewide discount</strong> upon claim</div>
          <div class="plants-section">
            <h4>${entry.plantNames.length} Plant NFT${entry.plantNames.length !== 1 ? "s" : ""} Included</h4>
            <ul>${plantListHtml}</ul>
          </div>
          <div class="url-text">${url}</div>
        </div>
        <script>window.addEventListener('load', () => setTimeout(() => window.print(), 800))</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Create New Batch Pack */}
      <form
        onSubmit={handleCreate}
        className="p-5 rounded-xl bg-card border border-border space-y-5"
        data-ocid="admin-batch-pack-form"
      >
        <div>
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-primary" />
            Create New Batch Gift Pack
          </h3>
          <p className="text-xs text-muted-foreground">
            Bundle multiple plant NFTs into a single QR code. When a customer
            scans it, all NFTs are claimed at once. Only plants with minted NFTs
            are eligible.
          </p>
        </div>

        {/* Pack metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Pack Name (optional)</Label>
            <Input
              value={packName}
              onChange={(e) => setPackName(e.target.value)}
              placeholder="e.g. Holiday Hot Pack 2026"
              className="mt-1 text-sm"
              data-ocid="admin-batch-pack-name"
            />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input
              value={packDesc}
              onChange={(e) => setPackDesc(e.target.value)}
              placeholder="3 rare varieties, perfect gift…"
              className="mt-1 text-sm"
              data-ocid="admin-batch-pack-desc"
            />
          </div>
        </div>

        {/* Plant multi-select */}
        <div>
          <Label className="text-xs mb-2 block">
            Select Plants with Minted NFTs
            <span className="ml-2 text-primary font-medium">
              ({selectedIds.size} selected)
            </span>
          </Label>
          {plantsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((k) => (
                <Skeleton key={k} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : eligiblePlants.length === 0 ? (
            <div
              className="flex flex-col items-center py-8 text-muted-foreground rounded-xl bg-muted/20 border border-dashed border-border"
              data-ocid="admin-batch-pack-empty"
            >
              <Gift className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">No plants with minted NFTs</p>
              <p className="text-xs mt-1">
                Mint an NFT for a plant first via the NFT Minting or RWA
                Provenance tab.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1"
              data-ocid="admin-batch-pack-plant-picker"
            >
              {eligiblePlants.map((plant) => {
                const id = plant.id.toString();
                const isSelected = selectedIds.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleSelect(id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-smooth ${
                      isSelected
                        ? "bg-primary/10 border-primary/50"
                        : "bg-muted/10 border-border hover:border-primary/30"
                    }`}
                    data-ocid={`admin-batch-plant-${id}`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center transition-smooth ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-border"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          className="w-2.5 h-2.5"
                          aria-hidden="true"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        #{id} — {plant.variety}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {STAGE_LABELS[plant.stage]} · NFT:{" "}
                        <span className="text-primary font-mono">
                          {plant.nft_id?.slice(0, 10)}…
                        </span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={createPack.isPending || selectedIds.size === 0}
            className="bg-primary"
            data-ocid="admin-create-batch-pack-btn"
          >
            <Gift className="w-4 h-4" />
            {createPack.isPending
              ? "Creating…"
              : `Create Pack & Generate QR (${selectedIds.size})`}
          </Button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>
      </form>

      {/* Existing Packs (this session) */}
      <div data-ocid="admin-existing-batch-packs">
        <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-primary" />
          Existing Packs
          <span className="text-xs font-normal text-muted-foreground ml-1">
            (this session)
          </span>
        </h3>

        {generatedPacks.length === 0 ? (
          <div
            className="text-center py-10 text-muted-foreground rounded-xl bg-muted/10 border border-dashed border-border"
            data-ocid="admin-batch-packs-empty"
          >
            <QrCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No packs created yet</p>
            <p className="text-xs mt-1">
              Create a batch pack above to generate a shareable QR code.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {generatedPacks.map(({ pack, name, plantNames }) => {
              const claimUrl = `${window.location.origin}/claim/${pack.claim_token_id}`;
              const rarity = getRarityFromPct(pack.highest_rarity_pct);
              const discountPct = Number(pack.highest_rarity_pct);
              return (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-xl bg-card border border-border"
                  data-ocid="admin-batch-pack-row"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 items-start min-w-0">
                      {/* QR preview */}
                      <div className="flex-shrink-0 bg-foreground p-1.5 rounded-lg">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(claimUrl)}&bgcolor=ffffff&color=000000`}
                          alt="QR Code"
                          className="w-16 h-16 block"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">
                          {name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${RARITY_COLORS[rarity]}`}
                          >
                            {RARITY_EMOJI[rarity]} {rarity} — {discountPct}%
                            discount
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {pack.redeemed ? (
                              <span className="text-muted-foreground line-through">
                                Claimed
                              </span>
                            ) : (
                              <span className="text-primary">Unclaimed</span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {plantNames.length} plant
                          {plantNames.length !== 1 ? "s" : ""} ·{" "}
                          {plantNames.join(", ")}
                        </p>
                        <code className="text-[10px] text-primary/70 font-mono mt-1 block break-all">
                          {pack.claim_token_id}
                        </code>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 h-8 text-xs border-border gap-1"
                      onClick={() => handlePrintQR({ pack, name, plantNames })}
                      data-ocid="admin-batch-reprint-qr-btn"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print QR Label
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Canister ID Bar ──────────────────────────────────────────────────────────

function CanisterIdBar() {
  const [copied, setCopied] = useState(false);
  const dashboardUrl = "https://caffeine.ai/dashboard";

  const handleCopy = () => {
    navigator.clipboard.writeText(dashboardUrl).then(() => {
      setCopied(true);
      toast.success("Dashboard link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2"
      data-ocid="admin-canister-id-bar"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Cpu className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Backend Canister ID
        </span>
        <span className="text-xs text-muted-foreground">
          Assigned at deployment — visible in your Caffeine dashboard
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1 flex-shrink-0"
          onClick={handleCopy}
          data-ocid="admin-copy-canister-id"
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied!" : "Copy Link"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Your canister ID is visible in the{" "}
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Caffeine dashboard
          <ExternalLink className="w-2.5 h-2.5" />
        </a>{" "}
        after deployment. Use it to register your NFT collection with the DAB
        registry at{" "}
        <a
          href="https://dab.ooo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-0.5"
        >
          dab.ooo
          <ExternalLink className="w-2.5 h-2.5" />
        </a>{" "}
        for automatic discovery in DGDG and Plug wallet.
      </p>
    </div>
  );
}

// ─── Treasury Tab ─────────────────────────────────────────────────────────────

const TREASURY_TOKEN_CONFIG: Record<
  TreasuryToken,
  {
    symbol: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    decimals: number;
  }
> = {
  [TreasuryToken.ICP]: {
    symbol: "ICP",
    colorClass: "text-purple-400",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/30",
    decimals: 8,
  },
  [TreasuryToken.ckBTC]: {
    symbol: "₿",
    colorClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/30",
    decimals: 8,
  },
  [TreasuryToken.ckETH]: {
    symbol: "Ξ",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    decimals: 8,
  },
  [TreasuryToken.ckUSDC]: {
    symbol: "$",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    decimals: 6,
  },
  [TreasuryToken.ckUSDT]: {
    symbol: "₮",
    colorClass: "text-teal-400",
    bgClass: "bg-teal-500/10",
    borderClass: "border-teal-500/30",
    decimals: 6,
  },
};

const TREASURY_TOKENS = [
  TreasuryToken.ICP,
  TreasuryToken.ckBTC,
  TreasuryToken.ckETH,
  TreasuryToken.ckUSDC,
  TreasuryToken.ckUSDT,
] as const;

function formatTreasuryBalance(balance_e8s: bigint, decimals: number): string {
  const divisor = BigInt(10 ** Math.min(decimals, 8));
  const whole = balance_e8s / divisor;
  const frac = (balance_e8s % divisor)
    .toString()
    .padStart(Math.min(decimals, 8), "0")
    .slice(0, 6);
  return `${whole}.${frac}`;
}

function TreasuryBalancesSection() {
  const { data: balances = [], isLoading } = useTreasuryBalances();
  const { data: prices = [] } = useTokenPrices();
  const refreshPrices = useRefreshTokenPrices();

  const priceMap = new Map(
    prices.map((p) => [p.token as string, p.price_in_icp_e8s]),
  );

  const totalIcpE8s = balances.reduce((sum, b) => {
    const price = priceMap.get(b.token);
    if (b.token === TreasuryToken.ICP) return sum + b.balance_e8s;
    if (price) return sum + (b.balance_e8s * price) / BigInt(1e8);
    return sum;
  }, BigInt(0));

  const totalIcp = Number(totalIcpE8s) / 1e8;

  return (
    <div className="space-y-4" data-ocid="treasury-balances-section">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
            Total Value
          </p>
          <p className="text-2xl font-display font-bold text-primary">
            {totalIcp.toFixed(4)} ICP
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-border gap-1.5"
          onClick={() => refreshPrices.mutateAsync()}
          disabled={refreshPrices.isPending}
          data-ocid="treasury-refresh-prices-btn"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshPrices.isPending ? "animate-spin" : ""}`}
          />
          Refresh Prices
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {isLoading
          ? TREASURY_TOKENS.map((t) => (
              <Skeleton key={t} className="h-20 rounded-xl" />
            ))
          : TREASURY_TOKENS.map((token) => {
              const balance = balances.find((b) => b.token === token);
              const cfg = TREASURY_TOKEN_CONFIG[token];
              const balE8s = balance?.balance_e8s ?? BigInt(0);
              const icpPrice = priceMap.get(token);
              const icpEquiv =
                token !== TreasuryToken.ICP && icpPrice
                  ? Number(balE8s * icpPrice) / 1e16
                  : null;
              return (
                <div
                  key={token}
                  className={`p-4 rounded-xl border ${cfg.borderClass} ${cfg.bgClass}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-lg font-bold ${cfg.colorClass}`}>
                      {cfg.symbol}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {token}
                    </span>
                  </div>
                  <p className="font-display font-bold text-foreground text-sm">
                    {formatTreasuryBalance(balE8s, cfg.decimals)}
                  </p>
                  {icpEquiv !== null && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ≈ {icpEquiv.toFixed(4)} ICP
                    </p>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

function TreasuryActionsSection() {
  const deposit = useTreasuryDeposit();
  const withdraw = useTreasuryWithdraw();
  const transfer = useTreasuryTransfer();
  const { data: prices = [] } = useTokenPrices();
  const { principal } = useAuth();

  const priceMap = new Map(
    prices.map((p) => [p.token as string, p.price_in_icp_e8s]),
  );

  // Deposit state
  const [depToken, setDepToken] = useState<TreasuryToken>(TreasuryToken.ICP);
  const [depAmount, setDepAmount] = useState("");
  const [depMemo, setDepMemo] = useState("");

  // Withdraw state
  const [wdToken, setWdToken] = useState<TreasuryToken>(TreasuryToken.ICP);
  const [wdAmount, setWdAmount] = useState("");
  const [wdTo, setWdTo] = useState("");
  const [wdMemo, setWdMemo] = useState("");

  // Transfer state
  const [txFromToken, setTxFromToken] = useState<TreasuryToken>(
    TreasuryToken.ICP,
  );
  const [txToToken, setTxToToken] = useState<TreasuryToken>(
    TreasuryToken.ckUSDC,
  );
  const [txAmount, setTxAmount] = useState("");
  const [txMemo, setTxMemo] = useState("");

  const toE8s = (amount: string, token: TreasuryToken) => {
    const num = Number.parseFloat(amount) || 0;
    const dec = TREASURY_TOKEN_CONFIG[token].decimals;
    return BigInt(Math.round(num * 10 ** Math.min(dec, 8)));
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depAmount) return;
    try {
      await deposit.mutateAsync({
        token: depToken,
        amount: toE8s(depAmount, depToken),
        memo: depMemo || undefined,
      });
      toast.success(`Deposited ${depAmount} ${depToken} to treasury`);
      setDepAmount("");
      setDepMemo("");
    } catch {
      toast.error("Deposit failed.");
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wdAmount || !wdTo) return;
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      await withdraw.mutateAsync({
        token: wdToken,
        amount: toE8s(wdAmount, wdToken),
        to: Principal.fromText(wdTo),
        memo: wdMemo || undefined,
      });
      toast.success(`Withdrew ${wdAmount} ${wdToken} from treasury`);
      setWdAmount("");
      setWdTo("");
      setWdMemo("");
    } catch {
      toast.error("Withdrawal failed. Check principal.");
    }
  };

  const estimatedToAmount = (() => {
    const numFrom = Number.parseFloat(txAmount) || 0;
    if (numFrom === 0) return null;
    if (txFromToken === txToToken) return numFrom.toFixed(6);

    // Convert fromToken → ICP value, then ICP → toToken
    const fromPriceInIcp =
      priceMap.get(txFromToken) ??
      (txFromToken === TreasuryToken.ICP ? BigInt(1e8) : null);
    const toPriceInIcp =
      priceMap.get(txToToken) ??
      (txToToken === TreasuryToken.ICP ? BigInt(1e8) : null);
    if (!fromPriceInIcp || !toPriceInIcp) return null;

    // fromTokenAmount × (fromPriceInIcp / 1e8) = ICP value
    // ICP value / (toPriceInIcp / 1e8) = toTokenAmount
    const fromE8s = numFrom * 1e8;
    const icpE8s = (fromE8s * Number(fromPriceInIcp)) / 1e8;
    const toAmount = icpE8s / Number(toPriceInIcp);
    return toAmount.toFixed(
      TREASURY_TOKEN_CONFIG[txToToken].decimals > 4
        ? 6
        : TREASURY_TOKEN_CONFIG[txToToken].decimals,
    );
  })();

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      data-ocid="treasury-actions-section"
    >
      {/* Deposit */}
      <form
        onSubmit={handleDeposit}
        className="p-4 rounded-xl bg-card border border-border space-y-3"
      >
        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          Deposit
        </h4>
        <div>
          <Label className="text-xs">Token</Label>
          <Select
            value={depToken}
            onValueChange={(v) => setDepToken(v as TreasuryToken)}
          >
            <SelectTrigger
              className="mt-1 h-8 text-xs"
              data-ocid="treasury-dep-token"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TREASURY_TOKENS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Amount</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={depAmount}
            onChange={(e) => setDepAmount(e.target.value)}
            placeholder="0.0000"
            className="mt-1 text-sm"
            data-ocid="treasury-dep-amount"
          />
        </div>
        <div>
          <Label className="text-xs">Memo (optional)</Label>
          <Input
            value={depMemo}
            onChange={(e) => setDepMemo(e.target.value)}
            placeholder="Deposit memo"
            className="mt-1 text-sm"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="w-full bg-primary"
          disabled={deposit.isPending || !depAmount}
          data-ocid="treasury-dep-btn"
        >
          {deposit.isPending ? "Depositing…" : "Deposit"}
        </Button>
      </form>

      {/* Withdraw */}
      <form
        onSubmit={handleWithdraw}
        className="p-4 rounded-xl bg-card border border-border space-y-3"
      >
        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          Withdraw
        </h4>
        <div>
          <Label className="text-xs">Token</Label>
          <Select
            value={wdToken}
            onValueChange={(v) => setWdToken(v as TreasuryToken)}
          >
            <SelectTrigger
              className="mt-1 h-8 text-xs"
              data-ocid="treasury-wd-token"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TREASURY_TOKENS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Amount</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={wdAmount}
            onChange={(e) => setWdAmount(e.target.value)}
            placeholder="0.0000"
            className="mt-1 text-sm"
            data-ocid="treasury-wd-amount"
          />
        </div>
        <div>
          <Label className="text-xs">Destination Principal</Label>
          <Input
            value={wdTo}
            onChange={(e) => setWdTo(e.target.value)}
            placeholder="xxxxxx-xxx…"
            className="mt-1 text-sm font-mono text-xs"
            data-ocid="treasury-wd-to"
          />
        </div>
        <div>
          <Label className="text-xs">Memo (optional)</Label>
          <Input
            value={wdMemo}
            onChange={(e) => setWdMemo(e.target.value)}
            placeholder="Withdrawal memo"
            className="mt-1 text-sm"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="w-full bg-primary"
          disabled={withdraw.isPending || !wdAmount || !wdTo}
          data-ocid="treasury-wd-btn"
        >
          {withdraw.isPending ? "Withdrawing…" : "Withdraw"}
        </Button>
      </form>

      {/* Transfer */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          Transfer (Cross-token)
        </h4>
        <div>
          <Label className="text-xs">From Token</Label>
          <Select
            value={txFromToken}
            onValueChange={(v) => setTxFromToken(v as TreasuryToken)}
          >
            <SelectTrigger
              className="mt-1 h-8 text-xs"
              data-ocid="treasury-tx-from-token"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TREASURY_TOKENS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">To Token</Label>
          <Select
            value={txToToken}
            onValueChange={(v) => setTxToToken(v as TreasuryToken)}
          >
            <SelectTrigger
              className="mt-1 h-8 text-xs"
              data-ocid="treasury-tx-to-token"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TREASURY_TOKENS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Amount (from)</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={txAmount}
            onChange={(e) => setTxAmount(e.target.value)}
            placeholder="0.0000"
            className="mt-1 text-sm"
            data-ocid="treasury-tx-amount"
          />
        </div>
        {estimatedToAmount && (
          <div className="p-2 rounded bg-muted/30 border border-border">
            <p className="text-[10px] text-muted-foreground">
              Calculated receive amount
            </p>
            <p className="text-sm font-semibold text-foreground">
              ≈ {estimatedToAmount} {txToToken}
            </p>
            <p className="text-[10px] text-muted-foreground">
              via ICPSwap live rates
            </p>
          </div>
        )}
        <div>
          <Label className="text-xs">Memo (optional)</Label>
          <Input
            value={txMemo}
            onChange={(e) => setTxMemo(e.target.value)}
            placeholder="Transfer memo"
            className="mt-1 text-sm"
          />
        </div>
        <p className="text-[10px] text-muted-foreground bg-muted/20 p-2 rounded">
          Internal treasury re-balance between token pools via ICPSwap.
        </p>
        <Button
          size="sm"
          className="w-full bg-primary"
          disabled={transfer.isPending || !txAmount || !principal}
          onClick={async () => {
            if (!txAmount || !principal) return;
            try {
              await transfer.mutateAsync({
                token: txFromToken,
                amount: toE8s(txAmount, txFromToken),
                from: principal,
                to: principal,
                memo: txMemo || undefined,
              });
              toast.success("Transfer initiated via ICPSwap.");
              setTxAmount("");
              setTxMemo("");
            } catch {
              toast.error("Transfer failed.");
            }
          }}
          data-ocid="treasury-tx-btn"
        >
          {transfer.isPending ? "Transferring…" : "Execute Transfer"}
        </Button>
      </div>
    </div>
  );
}

function TreasuryLedgerSection() {
  const { data: ledger = [], isLoading } = useTreasuryLedger();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const sorted = [...ledger].sort((a, b) =>
    b.timestamp > a.timestamp ? 1 : -1,
  );
  const total = sorted.length;
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((k) => (
          <Skeleton key={k} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (ledger.length === 0) {
    return (
      <div
        className="text-center py-8 text-muted-foreground"
        data-ocid="treasury-ledger-empty"
      >
        <Coins className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No treasury transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-ocid="treasury-ledger">
      <div className="rounded-xl overflow-hidden border border-border divide-y divide-border">
        {paged.map((tx) => {
          const cfg = TREASURY_TOKEN_CONFIG[tx.token];
          const balance = formatTreasuryBalance(tx.amount_e8s, cfg.decimals);
          const date = new Date(
            Number(tx.timestamp) / 1_000_000,
          ).toLocaleString();
          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-4 py-2.5 bg-card"
              data-ocid="treasury-ledger-row"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bgClass} ${cfg.colorClass}`}
              >
                <span className="text-xs font-bold">{cfg.symbol}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {tx.tx_type}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {date}
                  {tx.memo ? ` · ${tx.memo}` : ""}
                  {tx.offer_id ? ` · Offer: ${tx.offer_id.slice(0, 8)}…` : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={`text-xs font-mono font-semibold ${cfg.colorClass}`}
                >
                  {balance} {tx.token}
                </p>
                {(tx.to_principal || tx.from_principal) && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {tx.to_principal
                      ? `→ ${tx.to_principal.toText().slice(0, 10)}…`
                      : `← ${tx.from_principal?.toText().slice(0, 10)}…`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-border"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-border"
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TreasuryTab() {
  const [subSection, setSubSection] = useState<
    "balances" | "actions" | "ledger"
  >("balances");

  return (
    <div className="space-y-6" data-ocid="treasury-tab">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-foreground text-lg">
          Platform Treasury
        </h2>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 border border-border w-fit">
        {(["balances", "actions", "ledger"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSubSection(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-smooth ${
              subSection === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
            data-ocid={`treasury-subsection-${s}`}
          >
            {s}
          </button>
        ))}
      </div>

      {subSection === "balances" && <TreasuryBalancesSection />}
      {subSection === "actions" && <TreasuryActionsSection />}
      {subSection === "ledger" && <TreasuryLedgerSection />}
    </div>
  );
}

// ─── Founders Collection Tab ──────────────────────────────────────────────────

const FOUNDERS_COUNT = 50;
const RARITY_DIST = { Common: 30, Uncommon: 15, Rare: 5 } as const;

interface FoundersCard {
  index: number;
  layerCombination: number[]; // image index per layer (0-based)
  rarityTier: RarityTier;
  recipientPrincipal: string;
}

function assignRarities(): RarityTier[] {
  const tiers: RarityTier[] = [
    ...Array(RARITY_DIST.Common).fill(RarityTier.Common),
    ...Array(RARITY_DIST.Uncommon).fill(RarityTier.Uncommon),
    ...Array(RARITY_DIST.Rare).fill(RarityTier.Rare),
  ];
  // Fisher-Yates shuffle
  for (let i = tiers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
  }
  return tiers;
}

function generateCombinations(
  layerCount: number,
  layerFileCounts: number[],
): FoundersCard[] {
  const rarities = assignRarities();
  return Array.from({ length: FOUNDERS_COUNT }, (_, i) => ({
    index: i,
    layerCombination: Array.from({ length: layerCount }, (__, l) => {
      const count = layerFileCounts[l] ?? 1;
      return Math.floor(Math.random() * count);
    }),
    rarityTier: rarities[i],
    recipientPrincipal: "",
  }));
}

function FoundersCollectionTab() {
  const { data: artworkLayers } = useArtworkLayers();
  const batchMint = useBatchMintFoundersCollection();
  const submitToDAB = useAdminSubmitToDAB();

  const [cards, setCards] = useState<FoundersCard[]>([]);
  const [standard, setStandard] = useState<NFTStandard>(NFTStandard.ICRC37);
  const [badgeImageKey, setBadgeImageKey] = useState("");
  const [generated, setGenerated] = useState(false);
  const [mintProgress, setMintProgress] = useState<{
    minted: number;
    failed: number;
    total: number;
  } | null>(null);
  const [mintResults, setMintResults] = useState<FoundersMintResult[]>([]);
  const [dabConfirmOpen, setDabConfirmOpen] = useState(false);
  const [dabSubmitted, setDabSubmitted] = useState(false);
  const [dabError, setDabError] = useState<string | null>(null);
  const [dabSuccess, setDabSuccess] = useState<string | null>(null);

  const layerCount = artworkLayers?.length ?? 0;
  const layerFileCounts = Array(layerCount).fill(1);

  const handleSubmitToDAB = async () => {
    setDabConfirmOpen(false);
    setDabError(null);
    setDabSuccess(null);
    try {
      const result = await submitToDAB.mutateAsync({
        collectionName: "IC SPICY Founders Collection",
        collectionDescription:
          "50 unique Founders membership NFTs from the IC SPICY rare chili nursery. Each NFT grants a lifetime storewide discount.",
        standard: standard,
        canisterIdOverride: undefined,
      });
      if (result.__kind__ === "err") {
        setDabError(result.err);
        toast.error("DAB submission failed.");
      } else {
        setDabSubmitted(true);
        setDabSuccess("IC SPICY Founders Collection");
        toast.success("Collection submitted to DAB registry!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setDabError(msg);
      toast.error("DAB submission failed.");
    }
  };

  const handleGenerate = () => {
    if (layerCount === 0) {
      toast.error("Upload artwork layers first (Artwork Collection tab).");
      return;
    }
    setCards(generateCombinations(layerCount, layerFileCounts));
    setGenerated(true);
    setMintProgress(null);
    setMintResults([]);
  };

  const reRollCard = (index: number) => {
    const rarities = assignRarities();
    setCards((prev) =>
      prev.map((c) =>
        c.index === index
          ? {
              ...c,
              layerCombination: Array.from({ length: layerCount }, (_, l) => {
                const count = layerFileCounts[l] ?? 1;
                return Math.floor(Math.random() * count);
              }),
              rarityTier: rarities[index],
            }
          : c,
      ),
    );
  };

  const updateRecipient = (index: number, val: string) =>
    setCards((prev) =>
      prev.map((c) =>
        c.index === index ? { ...c, recipientPrincipal: val } : c,
      ),
    );

  const handleMintAll = async () => {
    if (cards.length === 0) return;
    const ADMIN_PID =
      "lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae"; // primary admin — fallback recipient for unminted cards
    const { Principal } = await import("@icp-sdk/core/principal");

    const entries: FoundersMintInput[] = cards.map((c) => {
      const recipientText = c.recipientPrincipal.trim() || ADMIN_PID;
      return {
        recipient: Principal.fromText(recipientText),
        rarityTier: c.rarityTier,
        badgeImageKey: badgeImageKey || "founders-badge",
        compositeImageKey: `founders-composite-${c.index}`,
        layerCombination: c.layerCombination.map(BigInt),
        nft_standard: standard,
      };
    });

    setMintProgress({ minted: 0, failed: 0, total: entries.length });

    try {
      const results = await batchMint.mutateAsync(entries);
      setMintResults(results);
      setMintProgress({
        minted: results.length,
        failed: entries.length - results.length,
        total: entries.length,
      });
      toast.success(
        `Founders Collection minted! ${results.length}/${entries.length} NFTs created.`,
      );
    } catch (err) {
      toast.error(
        `Batch mint failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      setMintProgress((prev) =>
        prev ? { ...prev, failed: prev.total } : null,
      );
    }
  };

  const rarityBreakdown = cards.reduce(
    (acc, c) => {
      acc[c.rarityTier] = (acc[c.rarityTier] ?? 0) + 1;
      return acc;
    },
    {} as Record<RarityTier, number>,
  );

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div
        className="p-5 rounded-xl bg-card border border-border space-y-2"
        data-ocid="admin-founders-info"
      >
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary" />
          Founders Collection — Batch Mint 50 NFTs
        </h3>
        <p className="text-xs text-muted-foreground">
          Generate 50 unique membership NFTs with randomized 10-layer trait
          combinations and a Founders badge. Rarity distribution:{" "}
          <span className="text-emerald-400">30 Common (10%)</span>,{" "}
          <span className="text-cyan-400">15 Uncommon (12%)</span>,{" "}
          <span className="text-amber-400">5 Rare (15%)</span>.
        </p>
        {layerCount === 0 && (
          <p className="text-xs text-destructive/80 bg-destructive/5 border border-destructive/20 px-3 py-2 rounded-lg">
            ⚠ No artwork layers uploaded yet. Go to the Artwork Collection tab
            to upload layers first.
          </p>
        )}
      </div>

      {/* Submit to DAB */}
      <div
        className="p-5 rounded-xl bg-card border border-border space-y-3"
        data-ocid="admin-dab-section"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-foreground">
            DAB Registry
          </h3>
        </div>

        {/* Canister ID info */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Canister ID:</span>
          <span className="text-xs font-mono text-muted-foreground">
            Visible in your{" "}
            <a
              href="https://caffeine.ai/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Caffeine dashboard
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </span>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard
                .writeText("https://caffeine.ai/dashboard")
                .then(() => toast.success("Dashboard link copied!"))
            }
            className="text-[10px] px-2 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-smooth flex items-center gap-1"
            data-ocid="admin-dab-copy-canister"
          >
            <Copy className="w-2.5 h-2.5" />
            Copy Link
          </button>
        </div>

        {/* DAB success banner */}
        {dabSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Collection "{dabSuccess}" successfully submitted to DAB registry! It
            will appear in DGDG and Plug wallets.
          </div>
        )}

        {/* DAB error banner */}
        {dabError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {dabError}
          </div>
        )}

        <Button
          size="sm"
          className="bg-primary gap-1.5"
          onClick={() => setDabConfirmOpen(true)}
          disabled={dabSubmitted || submitToDAB.isPending}
          data-ocid="admin-submit-dab-btn"
        >
          {submitToDAB.isPending ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting…
            </>
          ) : dabSubmitted ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" /> Submitted to DAB
            </>
          ) : (
            <>
              <ExternalLink className="w-3.5 h-3.5" /> Submit to DAB Registry
            </>
          )}
        </Button>
      </div>

      {/* DAB Confirmation Dialog */}
      <Dialog open={dabConfirmOpen} onOpenChange={setDabConfirmOpen}>
        <DialogContent
          className="bg-card border-border max-w-sm"
          data-ocid="admin-dab-confirm-modal"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-primary" />
              Submit to DAB Registry?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Are you sure you want to submit the IC SPICY Founders Collection to
            the DAB registry? This will make it visible in DGDG and Plug
            wallets.
          </p>
          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1 bg-primary"
              onClick={handleSubmitToDAB}
              data-ocid="admin-dab-confirm-btn"
            >
              Confirm Submission
            </Button>
            <Button
              variant="outline"
              onClick={() => setDabConfirmOpen(false)}
              className="border-border"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Controls */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">NFT Standard (all 50)</Label>
            <Select
              value={standard}
              onValueChange={(v) => setStandard(v as NFTStandard)}
            >
              <SelectTrigger
                className="mt-1"
                data-ocid="admin-founders-standard"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NFTStandard.ICRC37}>
                  ICRC-37 (ICP)
                </SelectItem>
                <SelectItem value={NFTStandard.Hedera}>Hedera RWA</SelectItem>
                <SelectItem value={NFTStandard.EXT}>
                  EXT (backward compat)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">
              Founders Badge Image Key (optional)
            </Label>
            <Input
              value={badgeImageKey}
              onChange={(e) => setBadgeImageKey(e.target.value)}
              placeholder="object-storage/founders-badge.png"
              className="mt-1 text-sm font-mono"
              data-ocid="admin-founders-badge-key"
            />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            size="sm"
            className="bg-primary gap-1.5"
            onClick={handleGenerate}
            disabled={layerCount === 0}
            data-ocid="admin-founders-generate-btn"
          >
            <Shuffle className="w-4 h-4" />
            {generated ? "Re-Generate All 50" : "Generate 50 Combinations"}
          </Button>
          {generated && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-border"
              onClick={handleGenerate}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-roll All
            </Button>
          )}
        </div>
      </div>

      {/* Card grid */}
      {generated && cards.length > 0 && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                {FOUNDERS_COUNT} NFTs
              </span>
              <span className="text-emerald-400">
                ● {rarityBreakdown[RarityTier.Common] ?? 0} Common
              </span>
              <span className="text-cyan-400">
                ● {rarityBreakdown[RarityTier.Uncommon] ?? 0} Uncommon
              </span>
              <span className="text-amber-400">
                ● {rarityBreakdown[RarityTier.Rare] ?? 0} Rare
              </span>
            </div>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 max-h-[600px] overflow-y-auto pr-1"
            data-ocid="admin-founders-card-grid"
          >
            {cards.map((card) => (
              <FoundersCard
                key={card.index}
                card={card}
                layers={artworkLayers ?? []}
                onReRoll={() => reRollCard(card.index)}
              />
            ))}
          </div>

          {/* Recipient assignment table */}
          <div
            className="p-5 rounded-xl bg-card border border-border space-y-3"
            data-ocid="admin-founders-recipients"
          >
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Recipient Assignment
              <span className="text-xs font-normal text-muted-foreground ml-1">
                (leave blank = admin principal)
              </span>
            </h4>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {cards.map((card) => (
                <div key={card.index} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground w-6 flex-shrink-0 text-right">
                    #{card.index + 1}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${RARITY_COLORS[card.rarityTier]}`}
                  >
                    {RARITY_EMOJI[card.rarityTier]}
                  </span>
                  <Input
                    value={card.recipientPrincipal}
                    onChange={(e) =>
                      updateRecipient(card.index, e.target.value)
                    }
                    placeholder="Principal (optional)"
                    className="h-7 text-xs font-mono flex-1"
                    data-ocid={`admin-founders-recipient-${card.index}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mint button */}
          <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Ready to mint
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All 50 Founders NFTs will be minted on-chain as {standard}{" "}
                  tokens with isFounder=true metadata.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-primary gap-1.5"
                onClick={handleMintAll}
                disabled={batchMint.isPending}
                data-ocid="admin-founders-mint-all-btn"
              >
                <Crown className="w-4 h-4" />
                {batchMint.isPending
                  ? mintProgress
                    ? `Minting… ${mintProgress.minted}/${mintProgress.total}`
                    : "Minting…"
                  : "Mint All 50 Founders NFTs"}
              </Button>
            </div>

            {mintProgress && (
              <div className="space-y-1">
                <Progress
                  value={(mintProgress.minted / mintProgress.total) * 100}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{mintProgress.minted} minted</span>
                  {mintProgress.failed > 0 && (
                    <span className="text-destructive">
                      {mintProgress.failed} failed
                    </span>
                  )}
                  <span>{mintProgress.total} total</span>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {mintResults.length > 0 && (
            <div
              className="p-4 rounded-xl bg-card border border-primary/30 space-y-2"
              data-ocid="admin-founders-results"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Mint Summary — {mintResults.length}/{FOUNDERS_COUNT} succeeded
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(
                  [
                    RarityTier.Common,
                    RarityTier.Uncommon,
                    RarityTier.Rare,
                  ] as RarityTier[]
                ).map((tier) => {
                  return (
                    <div
                      key={tier}
                      className={`p-2 rounded-lg border text-center ${RARITY_COLORS[tier]}`}
                    >
                      <p className="font-bold text-sm">
                        {rarityBreakdown[tier] ?? 0}
                      </p>
                      <p className="opacity-80">{tier}</p>
                    </div>
                  );
                })}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {mintResults.map((r) => (
                  <div
                    key={r.tokenId}
                    className="flex items-center gap-2 text-[10px]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                    <code className="text-primary/80 font-mono truncate">
                      {r.tokenId}
                    </code>
                    <span className="text-muted-foreground flex-shrink-0">
                      {r.standard}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!generated && (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="admin-founders-empty"
        >
          <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No combinations generated yet</p>
          <p className="text-xs mt-1">
            Upload artwork layers, then click "Generate 50 Combinations" above.
          </p>
        </div>
      )}
    </div>
  );
}

function FoundersCard({
  card,
  layers,
  onReRoll,
}: {
  card: FoundersCard;
  layers: ArtworkLayer[];
  onReRoll: () => void;
}) {
  const topLayer = layers[0];
  return (
    <div
      className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-smooth group"
      data-ocid={`admin-founders-card-${card.index}`}
    >
      <div className="aspect-square bg-muted/30 relative overflow-hidden">
        {topLayer ? (
          <img
            src={`/api/object-storage/${topLayer.object_key}`}
            alt={`NFT ${card.index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "/assets/images/placeholder.svg";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        {/* Founders badge overlay */}
        <div className="absolute top-1 left-1">
          <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
            FOUNDERS
          </span>
        </div>
        {/* Rarity badge */}
        <div className="absolute top-1 right-1">
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${RARITY_COLORS[card.rarityTier]}`}
          >
            {RARITY_EMOJI[card.rarityTier]}
          </span>
        </div>
        {/* Re-roll overlay */}
        <button
          type="button"
          onClick={onReRoll}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center"
          aria-label="Re-roll this NFT"
        >
          <RefreshCw className="w-6 h-6 text-white" />
        </button>
      </div>
      <div className="p-1.5">
        <p className="text-[10px] font-medium text-foreground text-center">
          #{card.index + 1}
        </p>
        <p className="text-[9px] text-muted-foreground text-center truncate">
          L: {card.layerCombination.join("·")}
        </p>
      </div>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────
// Access control is handled in App.tsx via AdminGuard — non-admins are
// silently redirected before this component ever mounts.

export default function AdminPage() {
  return (
    <div data-ocid="admin-panel">
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display font-bold text-3xl text-foreground mb-1">
            🔐 Admin <span className="text-fire">Panel</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            IC SPICY Farm Management · Port Charlotte, FL
          </p>
        </motion.div>
      </div>

      {/* Canister ID Info Bar — always visible at top */}
      <CanisterIdBar />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="trays">
          <TabsList
            className="bg-card border border-border mb-6 flex flex-wrap h-auto gap-1 p-1 w-full"
            data-ocid="admin-tabs"
          >
            <TabsTrigger
              value="trays"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-trays"
            >
              <Sprout className="w-3.5 h-3.5" />
              Trays
            </TabsTrigger>
            <TabsTrigger
              value="plants"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-plants"
            >
              <Flame className="w-3.5 h-3.5" />
              Plants
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-products"
            >
              <Tag className="w-3.5 h-3.5" />
              Products
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-orders"
            >
              <Package className="w-3.5 h-3.5" />
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="nft"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-nft"
            >
              <Cpu className="w-3.5 h-3.5" />
              NFT Minting
            </TabsTrigger>
            <TabsTrigger
              value="dao"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-dao"
            >
              <Vote className="w-3.5 h-3.5" />
              DAO
            </TabsTrigger>
            <TabsTrigger
              value="nft-pool"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-nft-pool"
            >
              <Database className="w-3.5 h-3.5" />
              NFT Pool
            </TabsTrigger>
            <TabsTrigger
              value="artwork"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-artwork"
            >
              <Layers className="w-3.5 h-3.5" />
              Artwork
            </TabsTrigger>
            <TabsTrigger
              value="rwa"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-rwa"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              RWA Provenance
            </TabsTrigger>
            <TabsTrigger
              value="cookbook"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-cookbook"
            >
              <BookOpen className="w-3.5 h-3.5" />
              CookBook
            </TabsTrigger>
            <TabsTrigger
              value="qr-labels"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-qr-labels"
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Labels
            </TabsTrigger>
            <TabsTrigger
              value="batch-gifts"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-batch-gifts"
            >
              <Gift className="w-3.5 h-3.5" />
              Batch Gifts
            </TabsTrigger>
            <TabsTrigger
              value="founders"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-founders"
            >
              <Crown className="w-3.5 h-3.5" />
              Founders
            </TabsTrigger>
            <TabsTrigger
              value="treasury"
              className="text-xs gap-1.5 flex-1"
              data-ocid="admin-tab-treasury"
            >
              <Wallet className="w-3.5 h-3.5" />
              Treasury
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trays">
            <TraysTab />
          </TabsContent>
          <TabsContent value="plants">
            <PlantsTab />
          </TabsContent>
          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>
          <TabsContent value="nft">
            <NFTMintingTab />
          </TabsContent>
          <TabsContent value="dao">
            <AdminDAOTab />
          </TabsContent>
          <TabsContent value="nft-pool">
            <NFTPoolTab />
          </TabsContent>
          <TabsContent value="artwork">
            <ArtworkCollectionTab />
          </TabsContent>
          <TabsContent value="rwa">
            <RWAProvenanceTab />
          </TabsContent>
          <TabsContent value="cookbook">
            <AdminCookBookTab />
          </TabsContent>
          <TabsContent value="qr-labels">
            <QRLabelsTab />
          </TabsContent>
          <TabsContent value="batch-gifts">
            <BatchGiftPacksTab />
          </TabsContent>
          <TabsContent value="founders">
            <FoundersCollectionTab />
          </TabsContent>
          <TabsContent value="treasury">
            <TreasuryTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
