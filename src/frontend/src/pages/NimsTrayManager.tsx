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
import { Camera, Leaf, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { TrayPublic } from "../backend";
import { NFTStandard } from "../backend";
import {
  useCreatePlant,
  useCreateTray,
  useDeleteTray,
  useStorePhotoFile,
  useUpdateTrayName,
} from "../hooks/useBackend";
import {
  CONTAINER_SIZE_OPTIONS,
  buildContainerSize,
  compressImage,
} from "./nims-utils";

interface TrayManagerProps {
  trays: TrayPublic[];
  selectedTrayId: bigint | null;
  onSelect: (trayId: bigint) => void;
}

export function TrayManager({
  trays,
  selectedTrayId,
  onSelect,
}: TrayManagerProps) {
  const [editingTrayId, setEditingTrayId] = useState<bigint | null>(null);
  const [editName, setEditName] = useState("");
  const [showAddTray, setShowAddTray] = useState(false);
  const [newTrayName, setNewTrayName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<bigint | null>(null);

  const createTray = useCreateTray();
  const updateTrayName = useUpdateTrayName();
  const deleteTray = useDeleteTray();

  async function handleCreateTray() {
    if (!newTrayName.trim()) {
      toast.error("Please enter a tray name");
      return;
    }
    try {
      const tray = await createTray.mutateAsync({
        name: newTrayName.trim(),
        planting_date: BigInt(Date.now() * 1_000_000),
        nft_standard: NFTStandard.ICRC37,
      });
      setNewTrayName("");
      setShowAddTray(false);
      onSelect(tray.id);
      toast.success(`Tray "${tray.name}" created!`);
    } catch (_e) {
      toast.error("Failed to create tray");
    }
  }

  async function handleRename(trayId: bigint) {
    if (!editName.trim()) {
      setEditingTrayId(null);
      return;
    }
    try {
      await updateTrayName.mutateAsync({ trayId, name: editName.trim() });
      setEditingTrayId(null);
      toast.success("Tray renamed");
    } catch (_e) {
      toast.error("Failed to rename tray");
    }
  }

  async function handleDelete(trayId: bigint) {
    try {
      await deleteTray.mutateAsync(trayId);
      setConfirmDeleteId(null);
      if (selectedTrayId === trayId && trays.length > 1) {
        const next = trays.find((t) => t.id !== trayId);
        if (next) onSelect(next.id);
      }
      toast.success("Tray removed");
    } catch (_e) {
      toast.error("Failed to remove tray");
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {trays.map((tray) => (
        <div key={tray.id.toString()} className="flex items-center gap-0.5">
          {editingTrayId === tray.id ? (
            <div className="flex items-center gap-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(tray.id);
                  if (e.key === "Escape") setEditingTrayId(null);
                }}
                className="h-8 w-32 bg-muted/40 border-border text-foreground text-sm"
                autoFocus
                data-ocid="tray-rename-input"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRename(tray.id)}
                disabled={updateTrayName.isPending}
                className="h-8 px-2 text-primary"
              >
                {updateTrayName.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "✓"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingTrayId(null)}
                className="h-8 px-2 text-muted-foreground"
              >
                ✕
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(tray.id)}
              className={[
                "px-3 py-1.5 rounded-md text-sm font-medium transition-smooth border",
                selectedTrayId === tray.id
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary",
              ].join(" ")}
              data-ocid={`tray-tab-${tray.id}`}
            >
              {tray.name}
            </button>
          )}
          {selectedTrayId === tray.id && editingTrayId !== tray.id && (
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setEditingTrayId(tray.id);
                  setEditName(tray.name);
                }}
                className="px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-smooth"
                aria-label="Rename tray"
                data-ocid="tray-rename-btn"
              >
                ✏
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(tray.id)}
                className="px-1.5 py-1 text-xs text-muted-foreground hover:text-red-400 transition-smooth"
                aria-label="Delete tray"
                data-ocid="tray-delete-btn"
              >
                🗑
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add tray */}
      {showAddTray ? (
        <div className="flex items-center gap-1">
          <Input
            value={newTrayName}
            onChange={(e) => setNewTrayName(e.target.value)}
            placeholder="Tray name…"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTray();
              if (e.key === "Escape") setShowAddTray(false);
            }}
            className="h-8 w-36 bg-muted/40 border-border text-foreground text-sm"
            autoFocus
            data-ocid="new-tray-name-input"
          />
          <Button
            size="sm"
            onClick={handleCreateTray}
            disabled={createTray.isPending}
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground px-3"
            data-ocid="new-tray-confirm-btn"
          >
            {createTray.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Add"
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddTray(false)}
            className="h-8 px-2 text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddTray(true)}
          className="h-8 border-dashed border-border text-muted-foreground hover:text-foreground"
          data-ocid="add-tray-btn"
        >
          <Leaf className="w-3.5 h-3.5 mr-1" />
          Add Tray
        </Button>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(v) => !v && setConfirmDeleteId(null)}
      >
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Remove Tray?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the tray. Plants in this tray will remain in your
            inventory but lose their tray assignment.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              disabled={deleteTray.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              data-ocid="tray-delete-confirm-btn"
            >
              {deleteTray.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── New Seed Modal ────────────────────────────────────────────────────────────

interface NewSeedModalProps {
  open: boolean;
  trayId: bigint;
  cellIndex: number;
  onClose: () => void;
}

const VARIETIES = [
  "Apocalypse Scorpion",
  "Death Spiral",
  "RB003",
  "Fried Chicken",
  "Scotch Bonnet",
  "Sugar Rush Peach",
  "Aji Charapita",
  "Calabrian (Cherry)",
  "Fish Pepper",
  "Farmers Market Jalapeno",
  "Aji Guyana",
  "Acoma Pueblo",
] as const;

export function NewSeedModal({
  open,
  trayId,
  cellIndex,
  onClose,
}: NewSeedModalProps) {
  const [commonName, setCommonName] = useState("");
  const [latinName, setLatinName] = useState("");
  const [variety, setVariety] = useState<string>(VARIETIES[0]);
  const [origin, setOrigin] = useState("");
  const [dateSowed, setDateSowed] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [datePurchased, setDatePurchased] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [containerOption, setContainerOption] = useState("cell72");
  const [containerOther, setContainerOther] = useState("");

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const createPlant = useCreatePlant();
  const storePhoto = useStorePhotoFile();

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let photoKey: string | undefined;

    // Upload photo if selected
    if (photoFile) {
      setUploadingPhoto(true);
      try {
        const compressed = await compressImage(photoFile);
        const bytes = new Uint8Array(await compressed.arrayBuffer());
        photoKey = await storePhoto.mutateAsync({
          pathPrefix: "photos/plants",
          data: bytes,
          mimeType: "image/jpeg",
        });
      } catch (_e) {
        toast.error("Photo upload failed — plant will be added without photo");
      } finally {
        setUploadingPhoto(false);
      }
    }

    const containerSize = buildContainerSize(containerOption, containerOther);

    try {
      await createPlant.mutateAsync({
        tray_id: trayId,
        cell_position: BigInt(cellIndex),
        variety: variety,
        genetics: commonName || variety,
        notes: "",
        common_name: commonName || undefined,
        latin_name: latinName || undefined,
        origin: origin || undefined,
        planting_date: BigInt(new Date(dateSowed).getTime() * 1_000_000),
        date_purchased: datePurchased
          ? BigInt(new Date(datePurchased).getTime() * 1_000_000)
          : undefined,
        nft_standard: NFTStandard.ICRC37,
        container_size: containerSize,
        source_plant_id: undefined,
        watering_schedule: undefined,
        pest_notes: undefined,
        additional_notes: undefined,
        ...(photoKey ? { photo_key: [photoKey] } : { photo_key: [] }),
      });
      toast.success("Plant added!");
      // Reset form
      setCommonName("");
      setLatinName("");
      setVariety(VARIETIES[0]);
      setOrigin("");
      setDateSowed(new Date().toISOString().split("T")[0]);
      setDatePurchased(new Date().toISOString().split("T")[0]);
      setContainerOption("cell72");
      setContainerOther("");
      clearPhoto();
      onClose();
    } catch (_e) {
      toast.error("Failed to add plant");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            Add Plant — Cell {cellIndex + 1}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Variety */}
          <div className="space-y-1.5">
            <Label className="text-foreground text-sm">Variety</Label>
            <Select value={variety} onValueChange={setVariety}>
              <SelectTrigger
                className="bg-muted/30 border-border text-foreground"
                data-ocid="new-seed-variety"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {VARIETIES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Common Name + Latin Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Common Name</Label>
              <Input
                value={commonName}
                onChange={(e) => setCommonName(e.target.value)}
                placeholder="e.g. Carolina Reaper"
                className="bg-muted/30 border-border text-foreground"
                data-ocid="new-seed-common-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Latin Name</Label>
              <Input
                value={latinName}
                onChange={(e) => setLatinName(e.target.value)}
                placeholder="e.g. C. chinense"
                className="bg-muted/30 border-border text-foreground"
                data-ocid="new-seed-latin-name"
              />
            </div>
          </div>

          {/* Origin + Date Sowed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Origin</Label>
              <Input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Country / region"
                className="bg-muted/30 border-border text-foreground"
                data-ocid="new-seed-origin"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Date Sowed</Label>
              <Input
                type="date"
                value={dateSowed}
                onChange={(e) => setDateSowed(e.target.value)}
                className="bg-muted/30 border-border text-foreground"
                data-ocid="new-seed-date"
              />
            </div>
          </div>

          {/* Date Purchased/Planted */}
          <div className="space-y-1.5">
            <Label className="text-foreground text-sm">
              Date Purchased / Planted
            </Label>
            <Input
              type="date"
              value={datePurchased}
              onChange={(e) => setDatePurchased(e.target.value)}
              className="bg-muted/30 border-border text-foreground"
              data-ocid="new-seed-date-purchased"
            />
            <p className="text-xs text-muted-foreground">
              Defaults to today. Edit to record the actual purchase or planting
              date.
            </p>
          </div>

          {/* Container Size */}
          <div className="space-y-1.5">
            <Label className="text-foreground text-sm">Container Size</Label>
            <Select value={containerOption} onValueChange={setContainerOption}>
              <SelectTrigger
                className="bg-muted/30 border-border text-foreground"
                data-ocid="new-seed-container"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {CONTAINER_SIZE_OPTIONS.map((opt) => (
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
                placeholder="Describe container size…"
                className="bg-muted/30 border-border text-foreground mt-1.5"
                data-ocid="new-seed-container-other"
              />
            )}
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">
              Plant Photo{" "}
              <span className="text-muted-foreground font-normal">
                (optional — helps with quick ID)
              </span>
            </Label>
            {photoPreview ? (
              <div className="relative inline-flex items-start gap-3">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted/20 flex-shrink-0">
                  <img
                    src={photoPreview}
                    alt="Plant preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {photoFile?.name}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearPhoto}
                    className="h-7 text-xs border-border text-muted-foreground hover:text-red-400"
                    data-ocid="new-seed-photo-clear"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 w-full border border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-smooth"
                data-ocid="new-seed-photo-upload-btn"
              >
                <Camera className="w-4 h-4 flex-shrink-0" />
                <span>Click to upload or drag-and-drop a photo</span>
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
              data-ocid="new-seed-photo-input"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPlant.isPending || uploadingPhoto}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-ocid="new-seed-submit"
            >
              {createPlant.isPending || uploadingPhoto ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Leaf className="w-4 h-4 mr-1.5" />
              )}
              {uploadingPhoto ? "Uploading Photo…" : "Add Plant"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
