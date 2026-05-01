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
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  Flame,
  GitMerge,
  Leaf,
  Loader2,
  ShoppingCart,
  Skull,
  Sprout,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type {
  LifecycleUpgradeEvent,
  PlantPublic,
  TrayPublic,
} from "../backend";
import { PlantStage } from "../backend";
import {
  useAddPlantPhoto,
  useGetUpgradeHistory,
  useIsAdmin,
  useMarkPlantGerminated,
  useRemovePlantPhoto,
  useSetForSale,
  useStorePhotoFile,
  useToggleCooked,
  useTransplantCell,
  useTriggerLifecycleUpgrade,
  useUpdateCellData,
  useUpdatePlantStage,
} from "../hooks/useBackend";
import { ProvenanceModal } from "./NImsProvenanceModal";
import {
  CONTAINER_SIZE_OPTIONS,
  buildContainerSize,
  compressImage,
  containerSizeLabel,
  formatDate,
  formatDateInput,
  stageName,
} from "./nims-utils";

interface CellModalProps {
  plant: PlantPublic | null;
  tray: TrayPublic;
  cellIndex: number;
  open: boolean;
  onClose: () => void;
  onSeedPlanted: (trayId: bigint, cell: number) => void;
}

const CONTAINER_OPTIONS = CONTAINER_SIZE_OPTIONS;

// ─── Upgrade History Timeline ─────────────────────────────────────────────────

function UpgradeHistoryTimeline({ plantId }: { plantId: bigint }) {
  const { data: history = [], isLoading } = useGetUpgradeHistory(plantId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading upgrade history…
      </div>
    );
  }

  if (!history.length) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No lifecycle upgrades yet. Upgrades are triggered automatically when a
        plant advances a stage.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
      {(history as LifecycleUpgradeEvent[]).map((evt, i) => (
        <div
          key={`upgrade-${evt.upgraded_at}-${i}`}
          className="flex gap-3 text-xs"
        >
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-0.5">
            <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <GitMerge className="w-2.5 h-2.5 text-primary" />
            </div>
            {i < history.length - 1 && (
              <div className="w-px flex-1 bg-border min-h-[12px]" />
            )}
          </div>
          <div className="pb-2 flex-1 min-w-0">
            <p className="font-medium text-foreground">
              {evt.old_stage} → {evt.new_stage}
            </p>
            <div className="text-muted-foreground space-y-0.5 mt-0.5">
              {evt.old_nft_id && (
                <p className="font-mono truncate">
                  Old NFT:{" "}
                  <span className="text-foreground/70">{evt.old_nft_id}</span>
                </p>
              )}
              <p className="font-mono truncate">
                New NFT:{" "}
                <span className="text-foreground/70">{evt.new_nft_id}</span>
              </p>
              <p>{formatDate(evt.upgraded_at)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cell Detail Modal ────────────────────────────────────────────────────────

export function CellDetailModal({
  plant,
  tray,
  cellIndex,
  open,
  onClose,
  onSeedPlanted,
}: CellModalProps) {
  const { data: isAdmin } = useIsAdmin();
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const [showTransplant, setShowTransplant] = useState(false);
  const [containerOption, setContainerOption] = useState("1gal");
  const [containerOther, setContainerOther] = useState("");
  const [showCookConfirm, setShowCookConfirm] = useState(false);
  const [showUpgradeHistory, setShowUpgradeHistory] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [commonName, setCommonName] = useState(plant?.common_name ?? "");
  const [latinName, setLatinName] = useState(plant?.latin_name ?? "");
  const [origin, setOrigin] = useState(plant?.origin ?? "");
  const [dateSeedValue, setDateSeedValue] = useState(
    plant ? formatDateInput(plant.planting_date) : "",
  );
  const [notes, setNotes] = useState(plant?.notes ?? "");
  const [wateringSchedule, setWateringSchedule] = useState(
    plant?.watering_schedule ?? "",
  );
  const [pestNotes, setPestNotes] = useState(plant?.pest_notes ?? "");
  const [additionalNotes, setAdditionalNotes] = useState(
    plant?.additional_notes ?? "",
  );

  const updateCellData = useUpdateCellData();
  const toggleCooked = useToggleCooked();
  const transplantCell = useTransplantCell();
  const addPhoto = useAddPlantPhoto();
  const removePhoto = useRemovePlantPhoto();
  const setForSale = useSetForSale();
  const markGerminated = useMarkPlantGerminated();
  const updateStage = useUpdatePlantStage();
  const triggerUpgrade = useTriggerLifecycleUpgrade();
  const storePhoto = useStorePhotoFile();

  async function handleSave() {
    if (!plant) {
      onSeedPlanted(tray.id, cellIndex);
      return;
    }
    try {
      await updateCellData.mutateAsync({
        plant_id: plant.id,
        common_name: commonName || undefined,
        latin_name: latinName || undefined,
        origin: origin || undefined,
        watering_schedule: wateringSchedule || undefined,
        pest_notes: pestNotes || undefined,
        additional_notes: additionalNotes || undefined,
      });
      toast.success("Cell data saved");
      onClose();
    } catch (_e) {
      toast.error("Failed to save cell data");
    }
  }

  async function handleMarkGerminated() {
    if (!plant) return;
    try {
      await markGerminated.mutateAsync({
        plantId: plant.id,
        date: BigInt(Date.now() * 1_000_000),
      });
      toast.success("Marked as germinated!");
      onClose();
    } catch (_e) {
      toast.error("Failed to mark germinated");
    }
  }

  async function handleAdvanceSeedling() {
    if (!plant) return;
    try {
      await updateStage.mutateAsync({
        plantId: plant.id,
        stage: PlantStage.Seedling,
        notes: "Advanced to seedling stage",
      });
      toast.success("Advanced to Seedling!");
      // Auto-trigger NFT upgrade if plant has an NFT
      if (plant.nft_id) {
        try {
          const result = await triggerUpgrade.mutateAsync({
            plantId: plant.id,
            newStage: "Seedling",
          });
          toast.success(`NFT upgraded to Seedling stage! New ID: ${result}`);
        } catch (_e) {
          // Non-blocking: upgrade failure doesn't block the stage advance
          toast.error("Stage advanced but NFT upgrade failed — retry manually");
        }
      }
      onClose();
    } catch (_e) {
      toast.error("Failed to advance stage");
    }
  }

  async function handleAdvanceMature() {
    if (!plant) return;
    try {
      await updateStage.mutateAsync({
        plantId: plant.id,
        stage: PlantStage.Mature,
        notes: "Advanced to mature stage",
      });
      toast.success("Advanced to Mature!");
      // Auto-trigger NFT upgrade if plant has an NFT
      if (plant.nft_id) {
        try {
          const result = await triggerUpgrade.mutateAsync({
            plantId: plant.id,
            newStage: "Mature",
          });
          toast.success(`NFT upgraded to Mature stage! New ID: ${result}`);
        } catch (_e) {
          toast.error("Stage advanced but NFT upgrade failed — retry manually");
        }
      }
      onClose();
    } catch (_e) {
      toast.error("Failed to advance stage");
    }
  }

  async function handleTransplant() {
    if (!plant) return;
    const cs = buildContainerSize(containerOption, containerOther);
    try {
      const newPlant = await transplantCell.mutateAsync({
        plant_id: plant.id,
        container_size: cs,
      });
      toast.success(`Transplanted to ${containerSizeLabel(cs)}!`);

      // Auto-trigger NFT lifecycle upgrade if plant has an NFT
      const nftId = plant.nft_id ?? newPlant?.nft_id;
      if (nftId) {
        try {
          const newStage = stageName(newPlant?.stage ?? plant.stage);
          const result = await triggerUpgrade.mutateAsync({
            plantId: plant.id,
            newStage,
          });
          toast.success(`NFT upgraded to ${newStage} stage! New ID: ${result}`);
        } catch (_e) {
          toast.error(
            "Transplant succeeded but NFT upgrade failed — retry manually",
          );
        }
      }

      setShowTransplant(false);
      onClose();
    } catch (_e) {
      toast.error("Transplant failed");
    }
  }

  async function handleManualLifecycleUpgrade() {
    if (!plant?.nft_id) return;
    try {
      const newStage = stageName(plant.stage);
      const result = await triggerUpgrade.mutateAsync({
        plantId: plant.id,
        newStage,
      });
      toast.success(
        `NFT upgraded! Old: ${plant.nft_id.slice(0, 12)}… → New: ${result.slice(0, 12)}…`,
      );
    } catch (_e) {
      toast.error("Lifecycle upgrade failed");
    }
  }

  async function handleToggleCooked() {
    if (!plant) return;
    try {
      await toggleCooked.mutateAsync(plant.id);
      toast.success(
        plant.is_cooked ? "Cell reactivated" : "Cell marked as cooked 💀",
      );
      setShowCookConfirm(false);
      onClose();
    } catch (_e) {
      toast.error("Failed to update cooked status");
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!plant || !e.target.files?.length) return;
    setUploadingPhoto(true);
    try {
      const file = e.target.files[0];
      const compressed = await compressImage(file);
      const bytes = new Uint8Array(await compressed.arrayBuffer());
      const objectKey = await storePhoto.mutateAsync({
        pathPrefix: "photos/plants",
        data: bytes,
        mimeType: "image/jpeg",
      });
      await addPhoto.mutateAsync({ plantId: plant.id, photoKey: objectKey });
      toast.success("Photo uploaded!");
    } catch (_e) {
      toast.error("Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto(key: string) {
    if (!plant) return;
    try {
      await removePhoto.mutateAsync({ plantId: plant.id, photoKey: key });
      toast.success("Photo removed");
    } catch (_e) {
      toast.error("Failed to remove photo");
    }
  }

  async function handleForSaleToggle() {
    if (!plant) return;
    try {
      await setForSale.mutateAsync({
        plantId: plant.id,
        forSale: !plant.for_sale,
      });
      toast.success(plant.for_sale ? "Removed from sale" : "Listed for sale");
    } catch (_e) {
      toast.error("Failed to update sale status");
    }
  }

  const cellLabel = `Cell ${cellIndex + 1}`;
  const title = plant
    ? `${plant.common_name || plant.variety} — ${cellLabel}`
    : `${cellLabel} — Empty`;

  const hasNFT = !!plant?.nft_id;

  return (
    <>
      <Dialog
        open={open && !provenanceOpen}
        onOpenChange={(v) => !v && onClose()}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground flex items-center gap-2">
              <Sprout className="w-5 h-5 text-primary" />
              {title}
            </DialogTitle>
          </DialogHeader>

          {/* Status badges */}
          {plant && (
            <div className="flex flex-wrap gap-2 -mt-2">
              <Badge
                className={
                  plant.stage === PlantStage.Seed
                    ? "bg-emerald-950/60 border-emerald-700/40 text-emerald-300"
                    : plant.stage === PlantStage.Seedling
                      ? "bg-cyan-950/60 border-cyan-600/40 text-cyan-300"
                      : "bg-primary/20 border-primary/40 text-primary"
                }
                variant="outline"
              >
                {stageName(plant.stage)}
              </Badge>
              {plant.is_cooked && (
                <Badge
                  className="bg-red-950 border-red-800 text-red-400"
                  variant="outline"
                >
                  💀 Cooked
                </Badge>
              )}
              {plant.is_transplanted && (
                <Badge
                  className="bg-muted/40 border-muted text-muted-foreground"
                  variant="outline"
                >
                  Transplanted → {containerSizeLabel(plant.container_size)}
                </Badge>
              )}
              {plant.for_sale && (
                <Badge
                  className="bg-primary/20 border-primary/40 text-primary"
                  variant="outline"
                >
                  For Sale
                </Badge>
              )}
              {hasNFT && (
                <Badge
                  className="bg-amber-950/60 border-amber-700/40 text-amber-300"
                  variant="outline"
                >
                  🎨 NFT Minted
                </Badge>
              )}
            </div>
          )}

          <div className="space-y-5 mt-1">
            {!plant ? (
              /* Empty cell CTA */
              <div className="text-center py-8 space-y-3">
                <Leaf className="w-12 h-12 text-muted-foreground/40 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  This cell is empty.
                </p>
                <Button
                  onClick={() => onSeedPlanted(tray.id, cellIndex)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  data-ocid="cell-plant-seed-btn"
                >
                  <Sprout className="w-4 h-4 mr-1.5" />
                  Plant a Seed Here
                </Button>
              </div>
            ) : (
              <>
                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-sm">
                      Common Seed Name
                    </Label>
                    <Input
                      value={commonName}
                      onChange={(e) => setCommonName(e.target.value)}
                      placeholder="e.g. Carolina Reaper"
                      className="bg-muted/30 border-border text-foreground"
                      data-ocid="cell-common-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-sm">
                      Latin / Scientific Name
                    </Label>
                    <Input
                      value={latinName}
                      onChange={(e) => setLatinName(e.target.value)}
                      placeholder="e.g. Capsicum chinense"
                      className="bg-muted/30 border-border text-foreground"
                      data-ocid="cell-latin-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-sm">Origin</Label>
                    <Input
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="e.g. Trinidad"
                      className="bg-muted/30 border-border text-foreground"
                      data-ocid="cell-origin"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-sm">
                      Date Seeded
                    </Label>
                    <Input
                      type="date"
                      value={dateSeedValue}
                      onChange={(e) => setDateSeedValue(e.target.value)}
                      className="bg-muted/30 border-border text-foreground"
                      data-ocid="cell-date-seeded"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm">
                    Nutrient Feeding Schedule
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Week 1: 1/4 strength bloom, Week 2: Cal-Mag…"
                    rows={2}
                    className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground resize-none"
                    data-ocid="cell-feeding-schedule"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-sm">
                      Watering Schedule
                    </Label>
                    <Textarea
                      value={wateringSchedule}
                      onChange={(e) => setWateringSchedule(e.target.value)}
                      placeholder="e.g. Every 2 days, bottom watering"
                      rows={2}
                      className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground resize-none"
                      data-ocid="cell-watering-schedule"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-sm">
                      Pest Pressure Notes
                    </Label>
                    <Textarea
                      value={pestNotes}
                      onChange={(e) => setPestNotes(e.target.value)}
                      placeholder="e.g. Aphids spotted on 3/12, treated with neem…"
                      rows={2}
                      className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground resize-none"
                      data-ocid="cell-pest-notes"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm">
                    Additional Notes
                  </Label>
                  <Textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any other observations…"
                    rows={2}
                    className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground resize-none"
                    data-ocid="cell-additional-notes"
                  />
                </div>

                {/* Lifecycle dates display */}
                <div className="bg-muted/20 rounded-lg p-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Seeded</span>
                    <span className="text-foreground font-medium">
                      {formatDate(plant.planting_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">
                      Germinated
                    </span>
                    <span className="text-foreground font-medium">
                      {formatDate(plant.germination_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">
                      Transplanted
                    </span>
                    <span className="text-foreground font-medium">
                      {formatDate(plant.transplant_date)}
                    </span>
                  </div>
                </div>

                {/* NFT Info + Lifecycle Upgrade (admin-only) */}
                {hasNFT && (
                  <div className="bg-amber-950/20 border border-amber-700/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <p className="text-xs font-semibold text-amber-300">
                          NFT:{" "}
                          <span className="font-mono text-amber-200/80">
                            {plant.nft_id?.slice(0, 20)}…
                          </span>
                        </p>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleManualLifecycleUpgrade}
                          disabled={triggerUpgrade.isPending}
                          className="border-amber-700/40 text-amber-400 hover:bg-amber-950/40 h-7 text-xs"
                          data-ocid="cell-lifecycle-upgrade-btn"
                        >
                          {triggerUpgrade.isPending ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <GitMerge className="w-3 h-3 mr-1" />
                          )}
                          Lifecycle Upgrade
                        </Button>
                      )}
                    </div>

                    {/* Upgrade history toggle */}
                    <button
                      type="button"
                      onClick={() => setShowUpgradeHistory((v) => !v)}
                      className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-1"
                      data-ocid="cell-upgrade-history-toggle"
                    >
                      <GitMerge className="w-3 h-3" />
                      {showUpgradeHistory ? "Hide" : "Show"} upgrade history
                    </button>
                    {showUpgradeHistory && (
                      <div className="pt-1 border-t border-amber-700/20">
                        <UpgradeHistoryTimeline plantId={plant.id} />
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons row */}
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {plant.stage === PlantStage.Seed &&
                    !plant.germination_date && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkGerminated}
                        disabled={markGerminated.isPending}
                        className="border-emerald-700/40 text-emerald-400 hover:bg-emerald-950/40"
                        data-ocid="cell-germinate-btn"
                      >
                        {markGerminated.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Sprout className="w-3.5 h-3.5 mr-1" />
                        )}
                        Mark Germinated
                      </Button>
                    )}

                  {plant.stage === PlantStage.Seed &&
                    plant.germination_date && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAdvanceSeedling}
                        disabled={
                          updateStage.isPending || triggerUpgrade.isPending
                        }
                        className="border-cyan-700/40 text-cyan-400 hover:bg-cyan-950/40"
                        data-ocid="cell-advance-seedling-btn"
                      >
                        {updateStage.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Leaf className="w-3.5 h-3.5 mr-1" />
                        )}
                        Advance to Seedling
                      </Button>
                    )}

                  {plant.stage === PlantStage.Seedling &&
                    !plant.is_transplanted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAdvanceMature}
                        disabled={
                          updateStage.isPending || triggerUpgrade.isPending
                        }
                        className="border-cyan-700/40 text-cyan-400 hover:bg-cyan-950/40"
                        data-ocid="cell-advance-mature-btn"
                      >
                        {updateStage.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Flame className="w-3.5 h-3.5 mr-1" />
                        )}
                        Advance Stage
                      </Button>
                    )}

                  {!plant.is_transplanted && !plant.is_cooked && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTransplant((v) => !v)}
                      className="border-primary/40 text-primary hover:bg-primary/10"
                      data-ocid="cell-transplant-btn"
                    >
                      <Sprout className="w-3.5 h-3.5 mr-1" />
                      Transplant
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCookConfirm((v) => !v)}
                    className={
                      plant.is_cooked
                        ? "border-emerald-700/40 text-emerald-400 hover:bg-emerald-950/40"
                        : "border-red-800/40 text-red-400 hover:bg-red-950/40"
                    }
                    data-ocid="cell-cooked-btn"
                  >
                    <Skull className="w-3.5 h-3.5 mr-1" />
                    {plant.is_cooked ? "Revive" : "Cooked"}
                  </Button>

                  {/* Admin-only: for sale toggle */}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleForSaleToggle}
                      disabled={setForSale.isPending}
                      className={
                        plant.for_sale
                          ? "border-muted text-muted-foreground hover:bg-muted/20"
                          : "border-primary/40 text-primary hover:bg-primary/10"
                      }
                      data-ocid="cell-for-sale-btn"
                    >
                      <Tag className="w-3.5 h-3.5 mr-1" />
                      {plant.for_sale ? "Remove from Sale" : "Mark For Sale"}
                    </Button>
                  )}

                  {/* Admin-only: RWA Provenance */}
                  {isAdmin && plant.stage === PlantStage.Seedling && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProvenanceOpen(true)}
                      className="border-amber-700/40 text-amber-400 hover:bg-amber-950/40"
                      data-ocid="cell-provenance-btn"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                      Assign RWA Provenance
                    </Button>
                  )}
                </div>

                {/* Cook confirmation */}
                {showCookConfirm && (
                  <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3 text-sm space-y-2">
                    <p className="text-red-300 font-medium">
                      {plant.is_cooked
                        ? "Revive this cell? It will return to active status."
                        : "Mark this cell as Cooked (dead)? The cell will turn black/red."}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleToggleCooked}
                        disabled={toggleCooked.isPending}
                        className="bg-red-900 hover:bg-red-800 text-red-100"
                        data-ocid="cell-cooked-confirm-btn"
                      >
                        {toggleCooked.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCookConfirm(false)}
                        className="border-border"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Transplant sub-form */}
                {showTransplant && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Transplant to:
                    </p>
                    <Select
                      value={containerOption}
                      onValueChange={setContainerOption}
                    >
                      <SelectTrigger
                        className="bg-muted/30 border-border text-foreground"
                        data-ocid="transplant-container-select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {CONTAINER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {containerOption === "other" && (
                      <Input
                        value={containerOther}
                        onChange={(e) => setContainerOther(e.target.value)}
                        placeholder="Describe pot size…"
                        className="bg-muted/30 border-border text-foreground"
                        data-ocid="transplant-other-input"
                      />
                    )}
                    {hasNFT && (
                      <p className="text-xs text-amber-400/80 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        NFT lifecycle upgrade will trigger automatically after
                        transplant.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleTransplant}
                        disabled={
                          transplantCell.isPending || triggerUpgrade.isPending
                        }
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        data-ocid="transplant-confirm-btn"
                      >
                        {transplantCell.isPending ||
                        triggerUpgrade.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Confirm Transplant"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTransplant(false)}
                        className="border-border"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Photo upload section — only for active (non-cooked) plants */}
                {!plant.is_cooked && (
                  <div className="space-y-2 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground text-sm">
                        Progress Photos
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="border-border text-muted-foreground hover:text-foreground"
                        data-ocid="cell-upload-photo-btn"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" />
                        )}
                        <span className="ml-1.5">Add Photo</span>
                      </Button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        data-ocid="cell-photo-input"
                      />
                    </div>
                    {plant.photo_keys.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {plant.photo_keys.map((key) => (
                          <div
                            key={key}
                            className="relative group aspect-square rounded overflow-hidden bg-muted/30 border border-border"
                          >
                            <img
                              src={`/storage/${key}`}
                              alt="Plant progress"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(key)}
                              aria-label="Remove photo"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/70 text-red-400 rounded p-0.5 transition-smooth"
                              data-ocid="cell-remove-photo-btn"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        No photos yet. Add progress shots!
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          {plant && (
            <div className="flex gap-2 justify-end border-t border-border pt-4 mt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-border"
                data-ocid="cell-modal-cancel"
              >
                <X className="w-4 h-4 mr-1" />
                Close
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateCellData.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-ocid="cell-modal-save"
              >
                {updateCellData.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {plant && (
        <ProvenanceModal
          plant={plant}
          open={provenanceOpen}
          onClose={() => setProvenanceOpen(false)}
        />
      )}
    </>
  );
}
