import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CloudSun,
  Download,
  FileText,
  Grid3X3,
  GripVertical,
  HelpCircle,
  Image,
  LayoutDashboard,
  LayoutList,
  Leaf,
  Loader2,
  Pencil,
  Printer,
  QrCode,
  Search,
  Sprout,
  StickyNote,
  ToggleLeft,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { PlantPublic, TrayPublic } from "../backend";
import { PlantStage, RarityTier } from "../backend";
import { useAuth } from "../hooks/useAuth";
import {
  useAddZonePhoto,
  useGenerateClaimToken,
  useIsAdmin,
  useMyPlants,
  useMyTrays,
  useRemoveZonePhoto,
  useStorePhotoFile,
  useUpdateTrayName,
  useUpdateTrayOrder,
  useUpdateZoneNotes,
} from "../hooks/useBackend";
import { CellDetailModal } from "./NimsCellModal";
import { NewSeedModal, TrayManager } from "./NimsTrayManager";
import { WeatherWidget } from "./NimsWeatherWidget";
import {
  compressImage,
  containerSizeLabel,
  exportGardenLayoutPng,
  exportNIMSCsv,
  formatDate,
  getCellClass,
  printGardenLayout,
  printTrayMap,
  stageName,
} from "./nims-utils";

// ─── Zone order localStorage helpers ─────────────────────────────────────────

const LS_ZONE_ORDER = "nims_zone_order";
const LS_ZONE_NOTES = "nims_zone_notes";
const LS_ZONE_PHOTOS = "nims_zone_photos";

function loadZoneOrder(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LS_ZONE_ORDER) ?? "{}");
  } catch {
    return {};
  }
}
function saveZoneOrder(order: Record<string, number>) {
  localStorage.setItem(LS_ZONE_ORDER, JSON.stringify(order));
}
function loadZoneNotes(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_ZONE_NOTES) ?? "{}");
  } catch {
    return {};
  }
}
function saveZoneNotes(notes: Record<string, string>) {
  localStorage.setItem(LS_ZONE_NOTES, JSON.stringify(notes));
}
function loadZonePhotos(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(LS_ZONE_PHOTOS) ?? "{}");
  } catch {
    return {};
  }
}
function saveZonePhotos(photos: Record<string, string[]>) {
  localStorage.setItem(LS_ZONE_PHOTOS, JSON.stringify(photos));
}

// ─── Onboarding Tooltips ──────────────────────────────────────────────────────

type TipKey =
  | "tray-grid"
  | "cell-click"
  | "transplant"
  | "cooked"
  | "weather"
  | "photo"
  | "csv-export"
  | "bulk-actions";

const TIP_LABELS: Record<TipKey, string> = {
  "tray-grid":
    "Your 72-cell trays — click any cell to add plant data, transplant seedlings, or mark cells as Cooked.",
  "cell-click":
    "Open plant detail to record seed info, feeding schedule, watering notes, and progress photos.",
  transplant:
    "When a seedling is ready to move up, use Transplant to track its new container size. All lifecycle data carries over automatically.",
  cooked:
    "Mark a cell as Cooked to flag dead seedlings. The cell turns red so you can quickly see losses at a glance.",
  weather:
    "Enable location sharing to auto-log daily weather data with each plant's record — useful for tracking stress events.",
  photo:
    "Upload progress photos of individual plants. Images are compressed automatically to save storage.",
  "csv-export":
    "Download all your NIMS data as a spreadsheet — useful for record-keeping and FDACS compliance.",
  "bulk-actions":
    "Select multiple plants to apply actions in bulk — change stage, mark for sale, or delete in one click.",
};

const LS_PREFIX = "nims_tip_dismissed_";
const LS_TIPS_VISIBLE = "nims_tips_visible";

function isTipDismissed(key: TipKey): boolean {
  return localStorage.getItem(LS_PREFIX + key) === "1";
}
function dismissTip(key: TipKey): void {
  localStorage.setItem(LS_PREFIX + key, "1");
}
function resetAllTips(): void {
  for (const k of Object.keys(TIP_LABELS) as TipKey[]) {
    localStorage.removeItem(LS_PREFIX + k);
  }
  localStorage.removeItem(LS_TIPS_VISIBLE);
}
function areAllTipsDismissed(): boolean {
  return (Object.keys(TIP_LABELS) as TipKey[]).every(isTipDismissed);
}

interface NimsTipBadgeProps {
  tipKey: TipKey;
  tipsActive: boolean;
  onDismiss: (key: TipKey) => void;
}

function NimsTipBadge({ tipKey, tipsActive, onDismiss }: NimsTipBadgeProps) {
  const [open, setOpen] = useState(false);

  if (!tipsActive || isTipDismissed(tipKey)) return null;

  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        aria-label={`Tip: ${tipKey}`}
        className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setOpen((v) => !v)}
        data-ocid={`nims-tip-badge-${tipKey}`}
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute left-6 top-0 z-50 w-64 bg-card border border-primary/30 rounded-xl shadow-elevated p-3 space-y-2"
            initial={{ opacity: 0, scale: 0.92, x: -4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: -4 }}
            transition={{ duration: 0.15 }}
            role="tooltip"
          >
            <p className="text-xs text-foreground leading-relaxed">
              {TIP_LABELS[tipKey]}
            </p>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  dismissTip(tipKey);
                  setOpen(false);
                  onDismiss(tipKey);
                }}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                data-ocid={`nims-tip-gotit-${tipKey}`}
              >
                Got it ✓
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

function useNimsTips() {
  const [tipsActive, setTipsActive] = useState<boolean>(() => {
    const hasVisited = localStorage.getItem(LS_TIPS_VISIBLE);
    if (!hasVisited) {
      localStorage.setItem(LS_TIPS_VISIBLE, "1");
      return true;
    }
    return false;
  });
  const [allDismissed, setAllDismissed] = useState(() => areAllTipsDismissed());

  const handleDismiss = useCallback((_key: TipKey) => {
    if (areAllTipsDismissed()) {
      setAllDismissed(true);
      setTipsActive(false);
    }
  }, []);

  const showTips = useCallback(() => {
    resetAllTips();
    setAllDismissed(false);
    setTipsActive(true);
  }, []);

  const hideTips = useCallback(() => {
    setTipsActive(false);
  }, []);

  return { tipsActive, allDismissed, handleDismiss, showTips, hideTips };
}

// ─── QR Label Print Dialog ────────────────────────────────────────────────────

interface QrLabelItem {
  plant: PlantPublic;
  trayName: string;
  cellLabel: string;
  claimToken: string | null;
  generating: boolean;
  error: boolean;
}

const RARITY_OPTIONS: { value: RarityTier; label: string; color: string }[] = [
  {
    value: RarityTier.Common,
    label: "Common (10% discount)",
    color: "text-muted-foreground",
  },
  {
    value: RarityTier.Uncommon,
    label: "Uncommon (12% discount)",
    color: "text-cyan-400",
  },
  {
    value: RarityTier.Rare,
    label: "Rare (15% discount)",
    color: "text-amber-400",
  },
];

interface QrLabelDialogProps {
  open: boolean;
  onClose: () => void;
  trayPlants: PlantPublic[];
  trayName: string;
}

function QrLabelDialog({
  open,
  onClose,
  trayPlants,
  trayName,
}: QrLabelDialogProps) {
  const activePlants = trayPlants.filter(
    (p) => !p.is_cooked && !p.is_transplanted,
  );
  const [selected, setSelected] = useState<Set<bigint>>(new Set());
  const [rarity, setRarity] = useState<RarityTier>(RarityTier.Common);
  const [items, setItems] = useState<QrLabelItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const generateClaimToken = useGenerateClaimToken();

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setItems([]);
      setGenerating(false);
      setReady(false);
    }
  }, [open]);

  function toggleAll() {
    if (selected.size === activePlants.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activePlants.map((p) => p.id)));
    }
  }

  function togglePlant(id: bigint) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    if (selected.size === 0) {
      toast.error("Select at least one plant");
      return;
    }
    setGenerating(true);
    const appUrl = window.location.origin;
    const selectedPlants = activePlants.filter((p) => selected.has(p.id));

    const initial: QrLabelItem[] = selectedPlants.map((p) => ({
      plant: p,
      trayName,
      cellLabel: `Cell ${Number(p.cell_position) + 1}`,
      claimToken: null,
      generating: true,
      error: false,
    }));
    setItems(initial);

    const results = await Promise.allSettled(
      selectedPlants.map((p) =>
        generateClaimToken.mutateAsync({ plantId: p.id, rarityTier: rarity }),
      ),
    );

    const updated: QrLabelItem[] = selectedPlants.map((p, i) => {
      const r = results[i];
      if (r.status === "fulfilled") {
        return {
          plant: p,
          trayName,
          cellLabel: `Cell ${Number(p.cell_position) + 1}`,
          claimToken: `${appUrl}/claim/${r.value.id}`,
          generating: false,
          error: false,
        };
      }
      return {
        plant: p,
        trayName,
        cellLabel: `Cell ${Number(p.cell_position) + 1}`,
        claimToken: null,
        generating: false,
        error: true,
      };
    });

    setItems(updated);
    setGenerating(false);
    setReady(true);

    const successCount = updated.filter((u) => !u.error).length;
    if (successCount > 0) {
      toast.success(
        `${successCount} claim token${successCount !== 1 ? "s" : ""} generated`,
      );
    }
    const errorCount = updated.filter((u) => u.error).length;
    if (errorCount > 0) {
      toast.error(
        `${errorCount} token${errorCount !== 1 ? "s" : ""} failed to generate`,
      );
    }
  }

  function handlePrint() {
    const readyItems = items.filter((it) => it.claimToken);
    if (readyItems.length === 0) return;
    printQRLabels(readyItems, trayName, rarity);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Print QR Labels — {trayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1 — Select Rarity */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm font-semibold">
              1. Set Rarity Tier
            </Label>
            <Select
              value={rarity}
              onValueChange={(v) => setRarity(v as RarityTier)}
            >
              <SelectTrigger
                className="bg-muted/30 border-border text-foreground"
                data-ocid="qr-rarity-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {RARITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={opt.color}>{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              The NFT granted when a customer scans this QR will have this
              rarity tier and matching discount.
            </p>
          </div>

          {/* Step 2 — Select Plants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground text-sm font-semibold">
                2. Select Plants ({selected.size} of {activePlants.length})
              </Label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                data-ocid="qr-select-all"
              >
                {selected.size === activePlants.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {activePlants.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No active plants in this tray to label.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {activePlants.map((p) => {
                  const checkId = `qr-check-${p.id}`;
                  return (
                    <div
                      key={p.id.toString()}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
                      data-ocid="qr-plant-select-row"
                    >
                      <Checkbox
                        id={checkId}
                        checked={selected.has(p.id)}
                        onCheckedChange={() => togglePlant(p.id)}
                        className="border-border"
                      />
                      <Label
                        htmlFor={checkId}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <span className="text-sm font-medium text-foreground truncate block">
                          {p.common_name || p.variety}
                        </span>
                        {p.latin_name && (
                          <span className="text-xs text-muted-foreground italic">
                            {p.latin_name}
                          </span>
                        )}
                      </Label>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground font-mono">
                          Cell {Number(p.cell_position) + 1}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs border-primary/30 text-primary"
                        >
                          {stageName(p.stage)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generated tokens preview */}
          {items.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <Label className="text-foreground text-sm font-semibold">
                Generated Tokens ({items.filter((i) => i.claimToken).length}{" "}
                ready)
              </Label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {items.map((item) => (
                  <div
                    key={item.plant.id.toString()}
                    className="flex items-center gap-3 text-xs py-1.5 px-2 rounded bg-muted/20"
                  >
                    {item.generating ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground flex-shrink-0" />
                    ) : item.error ? (
                      <span className="text-red-400 text-xs">✕</span>
                    ) : (
                      <QrCode className="w-3 h-3 text-primary flex-shrink-0" />
                    )}
                    <span className="font-medium text-foreground truncate flex-1">
                      {item.plant.common_name || item.plant.variety}
                    </span>
                    <span className="text-muted-foreground font-mono flex-shrink-0">
                      {item.cellLabel}
                    </span>
                    {item.error && (
                      <span className="text-red-400 flex-shrink-0">Failed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border"
              data-ocid="qr-dialog-cancel"
            >
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>
            {!ready ? (
              <Button
                onClick={handleGenerate}
                disabled={generating || selected.size === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-ocid="qr-generate-btn"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4 mr-1.5" />
                )}
                {generating ? "Generating Tokens…" : "Generate Claim Tokens"}
              </Button>
            ) : (
              <Button
                onClick={handlePrint}
                disabled={items.filter((i) => i.claimToken).length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-ocid="qr-print-btn"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print QR Labels
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function rarityDiscountLabel(tier: RarityTier): string {
  switch (tier) {
    case RarityTier.Rare:
      return "15% Lifetime Discount";
    case RarityTier.Uncommon:
      return "12% Lifetime Discount";
    default:
      return "10% Lifetime Discount";
  }
}

function printQRLabels(
  items: QrLabelItem[],
  trayName: string,
  rarity: RarityTier,
): void {
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rarityLabel = rarityDiscountLabel(rarity);
  const rarityColor =
    rarity === RarityTier.Rare
      ? "#d97706"
      : rarity === RarityTier.Uncommon
        ? "#0891b2"
        : "#1a6b2b";

  const labels = items
    .filter((it) => it.claimToken)
    .map((it) => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(it.claimToken!)}`;
      return `
    <div class="label">
      <div class="label-header">
        <span class="brand-name">🌶️ IC SPICY</span>
        <span class="rarity" style="color:${rarityColor};border-color:${rarityColor}">${rarity}</span>
      </div>
      <img src="${qrUrl}" alt="QR Claim Code" class="qr-img" />
      <div class="plant-name">${it.plant.common_name || it.plant.variety || "Plant"}</div>
      ${it.plant.latin_name ? `<div class="latin-name">${it.plant.latin_name}</div>` : ""}
      <div class="meta">${stageName(it.plant.stage)} · ${it.trayName} · ${it.cellLabel}</div>
      <div class="discount">${rarityLabel}</div>
      <div class="cta">Scan to claim your NFT &amp; discount</div>
    </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>IC SPICY — QR Claim Labels</title>
<style>
  @media print { @page { margin: 0.5in; size: letter; } .no-print { display: none !important; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; }
  .page { max-width: 760px; margin: 0 auto; padding: 24px; }
  .page-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a6b2b; padding-bottom: 14px; margin-bottom: 20px; }
  .page-brand { font-size: 20px; font-weight: 900; color: #1a6b2b; }
  .page-meta { text-align: right; font-size: 11px; color: #666; }
  .page-meta strong { display: block; font-size: 13px; color: #111; font-weight: 700; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .label { border: 1.5px solid #e5e5e5; border-radius: 8px; padding: 10px 8px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; background: #fff; page-break-inside: avoid; }
  .label-header { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
  .brand-name { font-size: 9px; font-weight: 900; color: #1a6b2b; }
  .rarity { font-size: 8px; font-weight: 700; border: 1px solid; border-radius: 3px; padding: 1px 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .qr-img { width: 120px; height: 120px; border: 1.5px solid #e5e5e5; border-radius: 4px; }
  .plant-name { font-size: 11px; font-weight: 700; color: #111; line-height: 1.2; margin-top: 2px; }
  .latin-name { font-size: 8.5px; color: #666; font-style: italic; }
  .meta { font-size: 8px; color: #888; }
  .discount { font-size: 9px; font-weight: 700; color: #1a6b2b; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 3px; padding: 2px 6px; }
  .cta { font-size: 8px; color: #555; font-style: italic; }
  .print-btn { background: #1a6b2b; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: 700; border-radius: 6px; cursor: pointer; margin-bottom: 20px; }
  .print-btn:hover { background: #155123; }
  .footer { margin-top: 18px; font-size: 10px; color: #888; border-top: 1px solid #e5e5e5; padding-top: 10px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page">
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print QR Labels</button>
  <div class="page-header">
    <div class="page-brand">🌶️ IC SPICY Nursery</div>
    <div class="page-meta">
      <strong>${trayName}</strong>
      Printed: ${dateStr}
    </div>
  </div>
  <div class="grid">${labels}</div>
  <div class="footer">
    <span>IC SPICY NFT Claim Labels · Port Charlotte, FL · FDACS Registered Nursery</span>
    <span>Scan QR → claim NFT → unlock lifetime store discount</span>
  </div>
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Popup blocked — allow popups and try again");
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ─── Tray Grid ────────────────────────────────────────────────────────────────

interface TrayGridProps {
  tray: TrayPublic;
  plants: PlantPublic[];
  selectedCells: Set<number>;
  onCellClick: (cellIndex: number, plant: PlantPublic | null) => void;
  onCellSelect: (cellIndex: number) => void;
  bulkMode: boolean;
}

function TrayGrid({
  tray,
  plants,
  selectedCells,
  onCellClick,
  onCellSelect,
  bulkMode,
}: TrayGridProps) {
  const plantMap = useMemo(() => {
    const m = new Map<number, PlantPublic>();
    for (const p of plants) {
      if (p.tray_id === tray.id) m.set(Number(p.cell_position), p);
    }
    return m;
  }, [tray.id, plants]);

  const COLS = 12;
  const ROWS = 6;
  const TOTAL = COLS * ROWS;

  return (
    <div className="space-y-3" data-ocid="nims-tray-grid">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: TOTAL }, (_, i) => {
          const plant = plantMap.get(i);
          const isSelected = selectedCells.has(i);

          return (
            <button
              key={`${tray.id}-cell-${i}`}
              type="button"
              className={[
                getCellClass(plant),
                "relative aspect-square flex flex-col items-center justify-center text-center select-none",
                isSelected ? "ring-2 ring-primary" : "",
              ].join(" ")}
              style={{ minHeight: "38px" }}
              onClick={() => {
                if (bulkMode) {
                  onCellSelect(i);
                } else {
                  onCellClick(i, plant ?? null);
                }
              }}
              aria-label={
                plant
                  ? `Cell ${i + 1}: ${plant.common_name || plant.variety}`
                  : `Cell ${i + 1}: Empty`
              }
              title={
                plant
                  ? `${plant.common_name || plant.variety} — ${stageName(plant.stage)}`
                  : `Cell ${i + 1} — Empty`
              }
              data-ocid="nims-cell"
            >
              {bulkMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onCellSelect(i)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-0.5 left-0.5 accent-primary w-3 h-3"
                  aria-label={`Select cell ${i + 1}`}
                />
              )}
              <span className="text-[9px] text-muted-foreground/60 absolute top-0.5 right-1 font-mono leading-none">
                {i + 1}
              </span>
              {plant && !plant.is_cooked && !plant.is_transplanted && (
                <span
                  className="text-[9px] font-semibold leading-none text-center px-0.5 line-clamp-2"
                  style={{ color: "inherit" }}
                >
                  {(plant.common_name || plant.variety).slice(0, 8)}
                </span>
              )}
              {plant?.is_transplanted && (
                <span className="text-[7px] font-bold text-muted-foreground/60 rotate-[-30deg] leading-none absolute inset-0 flex items-center justify-center pointer-events-none">
                  XPLNT
                </span>
              )}
              {plant?.is_cooked && (
                <span className="text-[10px] text-red-600 font-bold">💀</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
        {[
          {
            cls: "w-3 h-3 rounded-sm bg-card border border-border inline-block",
            label: "Empty",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-emerald-950/60 border border-emerald-700/60 inline-block",
            label: "Seeded",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-cyan-950/60 border border-cyan-600/50 inline-block",
            label: "Seedling",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-primary/20 border border-primary/50 inline-block",
            label: "Mature",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-muted/20 border border-muted/40 opacity-60 inline-block",
            label: "Transplanted",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-black border border-red-900 inline-block",
            label: "Cooked",
          },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cls} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

type SortField =
  | "tray"
  | "cell"
  | "name"
  | "stage"
  | "container"
  | "date"
  | "transplanted"
  | "for_sale";
type SortDir = "asc" | "desc";

interface ListViewProps {
  plants: PlantPublic[];
  trays: TrayPublic[];
  selectedCells: Set<string>;
  onRowSelect: (key: string) => void;
  bulkMode: boolean;
  onRowClick: (plant: PlantPublic) => void;
}

function ListView({
  plants,
  trays,
  selectedCells,
  onRowSelect,
  bulkMode,
  onRowClick,
}: ListViewProps) {
  const [sortField, setSortField] = useState<SortField>("tray");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<bigint | null>(null);

  const trayMap = useMemo(
    () => new Map(trays.map((t) => [t.id.toString(), t.name])),
    [trays],
  );

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...plants].sort((a, b) => {
      let cmp = 0;
      if (sortField === "tray") cmp = Number(a.tray_id - b.tray_id);
      else if (sortField === "cell")
        cmp = Number(a.cell_position - b.cell_position);
      else if (sortField === "name")
        cmp = (a.common_name || a.variety).localeCompare(
          b.common_name || b.variety,
        );
      else if (sortField === "stage")
        cmp = stageName(a.stage).localeCompare(stageName(b.stage));
      else if (sortField === "container")
        cmp = containerSizeLabel(a.container_size).localeCompare(
          containerSizeLabel(b.container_size),
        );
      else if (sortField === "date")
        cmp = Number(a.planting_date - b.planting_date);
      else if (sortField === "transplanted")
        cmp = Number((a.transplant_date ?? 0n) - (b.transplant_date ?? 0n));
      else if (sortField === "for_sale")
        cmp = Number(a.for_sale) - Number(b.for_sale);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [plants, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === "asc" ? (
        <ChevronUp className="w-3 h-3 text-primary inline-block" />
      ) : (
        <ChevronDown className="w-3 h-3 text-primary inline-block" />
      )
    ) : (
      <ChevronUp className="w-3 h-3 opacity-20 inline-block" />
    );

  const headers: { label: string; field: SortField }[] = [
    { label: "Tray", field: "tray" },
    { label: "Cell", field: "cell" },
    { label: "Common Name", field: "name" },
    { label: "Stage", field: "stage" },
    { label: "Container", field: "container" },
    { label: "For Sale", field: "for_sale" },
    { label: "Seeded", field: "date" },
    { label: "Transplanted", field: "transplanted" },
  ];

  if (sorted.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
        data-ocid="nims-list-empty"
      >
        <Leaf className="w-10 h-10 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground text-sm">
          No plants yet. Plant a seed to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-ocid="nims-list-view">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header border-b border-border">
            {bulkMode && <th className="px-3 py-2.5 w-8" />}
            {headers.map(({ label, field }) => (
              <th
                key={field + label}
                className="px-3 py-2.5 text-left whitespace-nowrap"
              >
                <button
                  type="button"
                  className="sort-button flex items-center gap-1"
                  onClick={() => handleSort(field)}
                >
                  {label} <SortIcon field={field} />
                </button>
              </th>
            ))}
            <th className="px-3 py-2.5 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((plant) => {
            const rowKey = `${plant.tray_id}-${plant.cell_position}`;
            const isSelected = selectedCells.has(rowKey);
            const isExpanded = expandedId === plant.id;

            return [
              <tr
                key={rowKey}
                className={[
                  "table-row-hover border-b border-border/60",
                  plant.is_cooked ? "opacity-60" : "",
                  isSelected ? "bg-primary/5" : "",
                ].join(" ")}
                data-ocid="nims-list-row"
              >
                {bulkMode && (
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onRowSelect(rowKey)}
                      className="accent-primary"
                      aria-label={`Select ${plant.common_name || plant.variety}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2.5 text-muted-foreground text-xs font-mono">
                  {trayMap.get(plant.tray_id.toString()) ??
                    `T-${plant.tray_id}`}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground text-xs font-mono">
                  {Number(plant.cell_position) + 1}
                </td>
                <td className="px-3 py-2.5 text-foreground font-medium">
                  <button
                    type="button"
                    className="w-full text-left hover:text-primary transition-smooth"
                    onClick={() => onRowClick(plant)}
                  >
                    <div className="min-w-0">
                      <span className="truncate block">
                        {plant.common_name || plant.variety}
                      </span>
                      {plant.latin_name && (
                        <span className="text-muted-foreground text-xs italic">
                          {plant.latin_name}
                        </span>
                      )}
                    </div>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={
                      plant.is_cooked
                        ? "status-sold"
                        : plant.stage === PlantStage.Seed
                          ? "status-seed"
                          : plant.stage === PlantStage.Seedling
                            ? "status-seedling"
                            : "status-mature"
                    }
                  >
                    {plant.is_cooked ? "💀 Cooked" : stageName(plant.stage)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground text-xs">
                  {containerSizeLabel(plant.container_size)}
                </td>
                <td className="px-3 py-2.5">
                  {plant.for_sale ? (
                    <Badge
                      variant="outline"
                      className="border-primary/40 text-primary text-xs"
                    >
                      For Sale
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(plant.planting_date)}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(plant.transplant_date)}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : plant.id)}
                    className="text-muted-foreground hover:text-foreground transition-smooth"
                    aria-label="Expand row"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </td>
              </tr>,

              isExpanded && (
                <tr key={`${rowKey}-exp`} data-ocid="nims-list-expanded">
                  <td
                    colSpan={bulkMode ? 10 : 9}
                    className="px-4 py-4 bg-secondary/20 border-b border-border"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="filter-section-title">Schedules</p>
                        {plant.watering_schedule && (
                          <p className="text-muted-foreground text-xs">
                            <span className="text-foreground font-medium">
                              Watering:
                            </span>{" "}
                            {plant.watering_schedule}
                          </p>
                        )}
                        {plant.notes && (
                          <p className="text-muted-foreground text-xs">
                            <span className="text-foreground font-medium">
                              Feeding:
                            </span>{" "}
                            {plant.notes}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="filter-section-title">Notes</p>
                        {plant.pest_notes && (
                          <p className="text-muted-foreground text-xs">
                            <span className="text-foreground font-medium">
                              Pest:
                            </span>{" "}
                            {plant.pest_notes}
                          </p>
                        )}
                        {plant.additional_notes && (
                          <p className="text-muted-foreground text-xs">
                            {plant.additional_notes}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="filter-section-title">Photos & NFT</p>
                        <p className="text-muted-foreground text-xs">
                          {plant.photo_keys.length} photo(s)
                        </p>
                        {plant.nft_id && (
                          <p className="text-muted-foreground text-xs font-mono truncate">
                            NFT: {plant.nft_id}
                          </p>
                        )}
                        {plant.origin && (
                          <p className="text-muted-foreground text-xs">
                            Origin: {plant.origin}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Zone Detail Panel ────────────────────────────────────────────────────────

interface ZoneDetailPanelProps {
  tray: TrayPublic;
  onClose: () => void;
  zoneNotes: Record<string, string>;
  zonePhotos: Record<string, string[]>;
  onNotesChange: (trayId: string, notes: string) => void;
  onPhotoAdd: (trayId: string, key: string, previewUrl: string) => void;
  onPhotoRemove: (trayId: string, key: string) => void;
}

function ZoneDetailPanel({
  tray,
  onClose,
  zoneNotes,
  zonePhotos,
  onNotesChange,
  onPhotoAdd,
  onPhotoRemove,
}: ZoneDetailPanelProps) {
  const trayKey = tray.id.toString();
  const [name, setName] = useState(tray.name);
  const [notes, setNotes] = useState(zoneNotes[trayKey] ?? "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const updateTrayName = useUpdateTrayName();
  const updateZoneNotes = useUpdateZoneNotes();
  const addZonePhoto = useAddZonePhoto();
  const removeZonePhoto = useRemoveZonePhoto();
  const storePhoto = useStorePhotoFile();

  const photos = zonePhotos[trayKey] ?? [];

  // photo[key] = "key|previewUrl" — we store both in the same slot locally
  // until backend is available, using "|" as separator
  function parsePhotoEntry(entry: string): { key: string; url: string } {
    const sep = entry.indexOf("|");
    if (sep === -1) return { key: entry, url: "" };
    return { key: entry.slice(0, sep), url: entry.slice(sep + 1) };
  }

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tray.name) return;
    try {
      await updateTrayName.mutateAsync({ trayId: tray.id, name: trimmed });
      toast.success("Zone renamed");
    } catch {
      toast.error("Failed to rename zone");
    }
  }

  async function handleNotesBlur() {
    onNotesChange(trayKey, notes);
    saveZoneNotes({ ...loadZoneNotes(), [trayKey]: notes });
    try {
      await updateZoneNotes.mutateAsync({ trayId: tray.id, notes });
    } catch {
      // silently fail — notes saved locally
    }
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const previewUrl = URL.createObjectURL(file);
    try {
      const compressed = await compressImage(file);
      const bytes = new Uint8Array(await compressed.arrayBuffer());
      const key = await storePhoto.mutateAsync({
        pathPrefix: "photos/zones",
        data: bytes,
        mimeType: "image/jpeg",
      });
      const entry = `${key}|${previewUrl}`;
      onPhotoAdd(trayKey, entry, previewUrl);
      const current = loadZonePhotos();
      current[trayKey] = [...(current[trayKey] ?? []), entry];
      saveZonePhotos(current);
      await addZonePhoto.mutateAsync({ trayId: tray.id, photoKey: key });
      toast.success("Zone photo uploaded");
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handlePhotoRemove(entry: string) {
    const { key } = parsePhotoEntry(entry);
    onPhotoRemove(trayKey, entry);
    const current = loadZonePhotos();
    current[trayKey] = (current[trayKey] ?? []).filter((e) => e !== entry);
    saveZonePhotos(current);
    try {
      await removeZonePhoto.mutateAsync({ trayId: tray.id, photoKey: key });
    } catch {
      // silently fail
    }
  }

  return (
    <div
      className="absolute right-0 top-0 w-72 bg-card border border-border rounded-xl shadow-elevated p-4 space-y-4 z-20"
      data-ocid="zone-detail-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm text-foreground truncate">
          Zone Details
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close zone panel"
          className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="zone-detail-close-button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Zone name */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Zone Name</Label>
        <div className="flex items-center gap-1.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
              if (e.key === "Escape") setName(tray.name);
            }}
            className="h-7 text-xs bg-muted/30 border-border text-foreground"
            maxLength={64}
            data-ocid="zone-name-input"
          />
          {updateTrayName.isPending && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Zone photo */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Camera className="w-3 h-3" />
          Zone Photo
          <span className="text-muted-foreground/60 font-normal">
            (optional)
          </span>
        </Label>
        {photos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {photos.map((entry) => {
              const { url } = parsePhotoEntry(entry);
              return (
                <div key={entry} className="relative group">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted/20">
                    {url ? (
                      <img
                        src={url}
                        alt="Zone"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePhotoRemove(entry)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove zone photo"
                    data-ocid="zone-photo-remove-button"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
            {photos.length < 3 && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-16 h-16 rounded-lg border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50 flex items-center justify-center transition-colors disabled:opacity-50"
                data-ocid="zone-photo-add-button"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="flex items-center gap-2 w-full border border-dashed border-border rounded-lg px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-smooth disabled:opacity-50"
            data-ocid="zone-photo-upload-btn"
          >
            {uploadingPhoto ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
            ) : (
              <Camera className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span>{uploadingPhoto ? "Uploading…" : "Add zone photo"}</span>
          </button>
        )}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
          data-ocid="zone-photo-file-input"
        />
      </div>

      {/* Zone notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <StickyNote className="w-3 h-3" />
          Zone Notes
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Soil mix, watering schedule, special notes…"
          className="text-xs bg-muted/30 border-border text-foreground resize-none min-h-[80px]"
          maxLength={1000}
          data-ocid="zone-notes-textarea"
        />
        <p className="text-[10px] text-muted-foreground/60">
          Auto-saves when you click away
        </p>
      </div>
    </div>
  );
}

// ─── Sortable Zone Card ───────────────────────────────────────────────────────

interface SortableZoneCardProps {
  tray: TrayPublic;
  trayIdx: number;
  cellMap: Map<number, PlantPublic>;
  isDetailOpen: boolean;
  zoneNotes: Record<string, string>;
  zonePhotos: Record<string, string[]>;
  onOpenDetail: (trayId: bigint) => void;
  onCellClick: (
    tray: TrayPublic,
    cellIndex: number,
    plant: PlantPublic | null,
  ) => void;
}

function SortableZoneCard({
  tray,
  trayIdx,
  cellMap,
  isDetailOpen,
  zoneNotes,
  zonePhotos,
  onOpenDetail,
  onCellClick,
}: SortableZoneCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tray.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const COLS = 12;
  const ROWS = 6;
  const activeCount = Array.from(cellMap.values()).filter(
    (p) => !p.is_cooked && !p.is_transplanted,
  ).length;
  const hasNotes = !!zoneNotes[tray.id.toString()];
  const hasPhoto = (zonePhotos[tray.id.toString()] ?? []).length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="space-y-2"
      data-ocid={`layout-tray-${trayIdx + 1}`}
    >
      {/* Tray label bar */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-emerald-900/40" />
        <div className="flex items-center gap-1.5 px-2">
          {/* Drag handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${tray.name}`}
            className="w-5 h-5 flex items-center justify-center rounded text-emerald-700/50 hover:text-emerald-400 cursor-grab active:cursor-grabbing transition-colors touch-none"
            data-ocid={`zone-drag-handle-${trayIdx + 1}`}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-500/80">
            {tray.name}
          </span>

          {/* Notes indicator */}
          {hasNotes && (
            <span title="Has notes">
              <StickyNote className="w-2.5 h-2.5 text-amber-400/70 flex-shrink-0" />
            </span>
          )}

          {/* Photo indicator */}
          {hasPhoto && (
            <span title="Has zone photo">
              <Camera className="w-2.5 h-2.5 text-sky-400/70 flex-shrink-0" />
            </span>
          )}

          {/* Edit/detail button */}
          <button
            type="button"
            onClick={() => onOpenDetail(tray.id)}
            aria-label={`Edit zone ${tray.name}`}
            className={[
              "w-4 h-4 flex items-center justify-center rounded transition-colors",
              isDetailOpen
                ? "text-primary"
                : "text-emerald-600/50 hover:text-emerald-400",
            ].join(" ")}
            data-ocid={`zone-edit-btn-${trayIdx + 1}`}
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
        </div>
        <span className="text-[9px] text-muted-foreground/50 font-mono">
          {activeCount}/{COLS * ROWS} active
        </span>
        <div className="h-px flex-1 bg-emerald-900/40" />
      </div>

      {/* Zone photo thumbnail if present */}
      {hasPhoto &&
        (() => {
          const photos = zonePhotos[tray.id.toString()] ?? [];
          const first = photos[0];
          const sep = first.indexOf("|");
          const previewUrl = sep !== -1 ? first.slice(sep + 1) : "";
          return previewUrl ? (
            <div className="flex items-center gap-2 px-1">
              <img
                src={previewUrl}
                alt={`${tray.name} zone`}
                className="w-10 h-10 rounded border border-emerald-700/25 object-cover flex-shrink-0"
              />
              {photos.length > 1 && (
                <span className="text-[9px] text-muted-foreground/60">
                  +{photos.length - 1} more
                </span>
              )}
            </div>
          ) : null;
        })()}

      {/* Tray rectangle */}
      <div
        className="border border-emerald-700/25 rounded-lg p-2 bg-card/30"
        style={{
          boxShadow: "inset 0 1px 8px oklch(0.2 0.05 145/0.15)",
        }}
      >
        <div
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const plant = cellMap.get(i);
            let cellBg = "bg-muted/10 border-border/30";
            let cellText = "";
            let emoji = "";

            if (plant) {
              if (plant.is_cooked) {
                cellBg = "bg-red-950/70 border-red-900/60";
                emoji = "💀";
              } else if (plant.is_transplanted) {
                cellBg = "bg-muted/20 border-muted/30 opacity-50";
                cellText = "text-muted-foreground/50";
              } else if (plant.stage === PlantStage.Mature) {
                cellBg = "bg-primary/25 border-primary/40";
                cellText = "text-primary";
              } else if (plant.stage === PlantStage.Seedling) {
                cellBg = "bg-cyan-950/60 border-cyan-700/40";
                cellText = "text-cyan-300";
              } else {
                cellBg = "bg-emerald-950/60 border-emerald-700/40";
                cellText = "text-emerald-300";
              }
            }

            const name = plant
              ? (plant.common_name || plant.variety).slice(0, 6)
              : "";

            return (
              <button
                key={`layout-${tray.id}-${i}`}
                type="button"
                onClick={() => onCellClick(tray, i, plant ?? null)}
                className={[
                  "relative border rounded-sm flex flex-col items-center justify-center aspect-square transition-smooth hover:scale-105 hover:z-10",
                  cellBg,
                ].join(" ")}
                style={{ minHeight: "28px" }}
                title={
                  plant
                    ? `${plant.common_name || plant.variety} — Cell ${i + 1}`
                    : `Cell ${i + 1} — Empty`
                }
                data-ocid="layout-cell"
              >
                <span className="text-[7px] text-muted-foreground/30 font-mono absolute top-0 left-0.5 leading-none">
                  {i + 1}
                </span>
                {emoji ? (
                  <span className="text-[9px] leading-none">{emoji}</span>
                ) : name ? (
                  <span
                    className={`text-[7px] font-semibold leading-none text-center px-0.5 truncate w-full ${cellText}`}
                  >
                    {name}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Garden Layout View (DnD-enabled) ────────────────────────────────────────

interface GardenLayoutProps {
  trays: TrayPublic[];
  plants: PlantPublic[];
  onCellClick: (
    tray: TrayPublic,
    cellIndex: number,
    plant: PlantPublic | null,
  ) => void;
}

function GardenLayout({ trays, plants, onCellClick }: GardenLayoutProps) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [trayOrder, setTrayOrder] = useState<string[]>(() => {
    const savedOrder = loadZoneOrder();
    const ids = trays.map((t) => t.id.toString());
    return [...ids].sort(
      (a, b) => (savedOrder[a] ?? 9999) - (savedOrder[b] ?? 9999),
    );
  });
  const [zoneNotes, setZoneNotes] = useState<Record<string, string>>(() =>
    loadZoneNotes(),
  );
  const [zonePhotos, setZonePhotos] = useState<Record<string, string[]>>(() =>
    loadZonePhotos(),
  );
  const [detailTrayId, setDetailTrayId] = useState<bigint | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const updateTrayOrder = useUpdateTrayOrder();

  useEffect(() => {
    const ids = trays.map((t) => t.id.toString());
    const savedOrder = loadZoneOrder();
    setTrayOrder((prev) => {
      const existing = new Set(prev);
      const newIds = ids.filter((id) => !existing.has(id));
      const removed = new Set(prev.filter((id) => !ids.includes(id)));
      const merged = [...prev.filter((id) => !removed.has(id)), ...newIds];
      return merged.sort(
        (a, b) =>
          (savedOrder[a] ?? merged.indexOf(a)) -
          (savedOrder[b] ?? merged.indexOf(b)),
      );
    });
  }, [trays]);

  const sortedTrays = useMemo(() => {
    const trayMap = new Map(trays.map((t) => [t.id.toString(), t]));
    return trayOrder
      .map((id) => trayMap.get(id))
      .filter((t): t is TrayPublic => !!t);
  }, [trays, trayOrder]);

  const inGroundPlants = useMemo(
    () =>
      plants.filter(
        (p) =>
          p.container_size?.__kind__ === "InGround" ||
          (!p.tray_id && !p.is_transplanted),
      ),
    [plants],
  );

  const trayPlantMap = useMemo(() => {
    const m = new Map<string, Map<number, PlantPublic>>();
    for (const p of plants) {
      const tid = p.tray_id.toString();
      if (!m.has(tid)) m.set(tid, new Map());
      m.get(tid)!.set(Number(p.cell_position), p);
    }
    return m;
  }, [plants]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: { active: { id: string | number } }) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = trayOrder.indexOf(String(active.id));
    const newIndex = trayOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(trayOrder, oldIndex, newIndex);
    setTrayOrder(newOrder);
    const orderMap: Record<string, number> = {};
    for (const [i, id] of newOrder.entries()) {
      orderMap[id] = i;
    }
    saveZoneOrder(orderMap);
    const trayMap = new Map(trays.map((t) => [t.id.toString(), t]));
    for (const [i, id] of newOrder.entries()) {
      const tray = trayMap.get(id);
      if (tray) {
        updateTrayOrder
          .mutateAsync({ trayId: tray.id, newOrder: i })
          .catch(() => {});
      }
    }
  }

  function handlePrint() {
    printGardenLayout(
      sortedTrays.map((t) => {
        const cellMap = trayPlantMap.get(t.id.toString()) ?? new Map();
        return {
          name: t.name,
          plants: Array.from(cellMap.entries()).map(([cellIndex, p]) => ({
            cellIndex,
            commonName: p.common_name || p.variety,
            stage: stageName(p.stage),
            isCooked: p.is_cooked,
            isTransplanted: p.is_transplanted,
          })),
        };
      }),
      inGroundPlants.map((p) => p.common_name || p.variety),
    );
  }

  async function handleExportPng() {
    if (!layoutRef.current) return;
    try {
      await exportGardenLayoutPng(layoutRef.current);
    } catch {
      toast.error("PNG export failed — try the Print button instead");
    }
  }

  if (sortedTrays.length === 0 && inGroundPlants.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-4 bg-card rounded-lg border border-border"
        data-ocid="garden-layout-empty"
      >
        <Leaf className="w-12 h-12 text-muted-foreground opacity-30" />
        <h3 className="font-semibold text-foreground">No inventory yet</h3>
        <p className="text-muted-foreground text-sm">
          Add trays and plants to see your garden layout.
        </p>
      </div>
    );
  }

  const detailTray = detailTrayId
    ? trays.find((t) => t.id === detailTrayId)
    : null;

  return (
    <div className="space-y-6" data-ocid="garden-layout-view">
      {/* Plan header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">
            Garden Floor Plan
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
            Top-down schematic — drag
            <GripVertical className="w-3 h-3 inline" />
            to reorder zones · click
            <Pencil className="w-3 h-3 inline" />
            to edit zone details.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="border-emerald-700/40 text-emerald-400 text-xs"
          >
            {sortedTrays.length} tray{sortedTrays.length !== 1 ? "s" : ""} ·{" "}
            {plants.length} plant{plants.length !== 1 ? "s" : ""}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 border-border text-muted-foreground hover:text-foreground text-xs gap-1.5"
            data-ocid="garden-layout-print-btn"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPng}
            className="h-8 border-border text-muted-foreground hover:text-foreground text-xs gap-1.5"
            data-ocid="garden-layout-export-png-btn"
          >
            <Image className="w-3.5 h-3.5" />
            Export PNG
          </Button>
        </div>
      </div>

      {/* Layout + panel wrapper */}
      <div className="relative">
        <div
          ref={layoutRef}
          id="garden-layout-canvas"
          className="bg-[oklch(0.12_0.01_145/0.6)] border border-emerald-900/30 rounded-2xl p-6 overflow-x-auto"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,oklch(0.35 0.06 145/0.08) 0,oklch(0.35 0.06 145/0.08) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,oklch(0.35 0.06 145/0.08) 0,oklch(0.35 0.06 145/0.08) 1px,transparent 1px,transparent 40px)",
          }}
        >
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={trayOrder} strategy={rectSortingStrategy}>
              <div className="space-y-8 min-w-[600px]">
                {sortedTrays.map((tray, trayIdx) => {
                  const cellMap =
                    trayPlantMap.get(tray.id.toString()) ?? new Map();
                  return (
                    <SortableZoneCard
                      key={tray.id.toString()}
                      tray={tray}
                      trayIdx={trayIdx}
                      cellMap={cellMap}
                      isDetailOpen={detailTrayId === tray.id}
                      zoneNotes={zoneNotes}
                      zonePhotos={zonePhotos}
                      onOpenDetail={(id) =>
                        setDetailTrayId((prev) => (prev === id ? null : id))
                      }
                      onCellClick={onCellClick}
                    />
                  );
                })}

                {inGroundPlants.length > 0 && (
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: sortedTrays.length * 0.07,
                    }}
                    data-ocid="layout-inground-zone"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-amber-900/40" />
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-500/80 px-2">
                        In Ground Crops
                      </span>
                      <span className="text-[9px] text-muted-foreground/50 font-mono">
                        {inGroundPlants.length} plant
                        {inGroundPlants.length !== 1 ? "s" : ""}
                      </span>
                      <div className="h-px flex-1 bg-amber-900/40" />
                    </div>
                    <div
                      className="border border-amber-700/25 rounded-xl p-3 bg-card/30 min-h-[80px]"
                      style={{
                        boxShadow: "inset 0 1px 8px oklch(0.2 0.06 80/0.15)",
                      }}
                    >
                      <div className="flex flex-wrap gap-2">
                        {inGroundPlants.map((p) => (
                          <div
                            key={p.id.toString()}
                            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-amber-700/30 bg-amber-950/30 min-w-[64px] text-center"
                            data-ocid="layout-inground-plant"
                          >
                            <span className="text-sm">🌿</span>
                            <span className="text-[9px] font-semibold text-amber-300 leading-tight max-w-[60px] truncate">
                              {p.common_name || p.variety}
                            </span>
                            {p.latin_name && (
                              <span className="text-[8px] text-amber-400/60 italic leading-none max-w-[60px] truncate">
                                {p.latin_name}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeId &&
                (() => {
                  const tray = trays.find((t) => t.id.toString() === activeId);
                  if (!tray) return null;
                  return (
                    <div className="bg-card/80 border-2 border-primary/40 rounded-xl p-3 opacity-90 shadow-elevated">
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-primary">
                        {tray.name}
                      </span>
                    </div>
                  );
                })()}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Zone detail panel — outside canvas so it doesn't get captured in PNG */}
        {detailTray && (
          <ZoneDetailPanel
            tray={detailTray}
            onClose={() => setDetailTrayId(null)}
            zoneNotes={zoneNotes}
            zonePhotos={zonePhotos}
            onNotesChange={(key, notes) =>
              setZoneNotes((prev) => ({ ...prev, [key]: notes }))
            }
            onPhotoAdd={(key, entry) =>
              setZonePhotos((prev) => ({
                ...prev,
                [key]: [...(prev[key] ?? []), entry],
              }))
            }
            onPhotoRemove={(key, entry) =>
              setZonePhotos((prev) => ({
                ...prev,
                [key]: (prev[key] ?? []).filter((e) => e !== entry),
              }))
            }
          />
        )}
      </div>

      {/* Legend */}
      <div
        id="garden-layout-legend"
        className="flex items-center gap-5 flex-wrap text-xs text-muted-foreground bg-card/50 border border-border rounded-lg px-4 py-2.5"
      >
        <span className="font-semibold text-foreground text-[10px] tracking-wide uppercase mr-1">
          Legend
        </span>
        {[
          {
            cls: "w-3 h-3 rounded-sm bg-muted/10 border border-border/30 inline-block",
            label: "Empty",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-emerald-950/60 border border-emerald-700/40 inline-block",
            label: "Seeded",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-cyan-950/60 border border-cyan-700/40 inline-block",
            label: "Seedling",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-primary/25 border border-primary/40 inline-block",
            label: "Mature",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-muted/20 border border-muted/30 opacity-50 inline-block",
            label: "Transplanted",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-red-950/70 border border-red-900/60 inline-block",
            label: "Cooked",
          },
          {
            cls: "w-3 h-3 rounded-sm bg-amber-950/30 border border-amber-700/25 inline-block",
            label: "In Ground",
          },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cls} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <StickyNote className="w-3 h-3 text-amber-400/70" />
          Has notes
        </span>
        <span className="flex items-center gap-1.5">
          <Camera className="w-3 h-3 text-sky-400/70" />
          Zone photo
        </span>
      </div>
    </div>
  );
}

// ─── NIMS Page ────────────────────────────────────────────────────────────────

type ViewMode = "grid" | "list" | "layout";

function NIMSPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedTrayId, setSelectedTrayId] = useState<bigint | null>(null);
  const [cellModalState, setCellModalState] = useState<{
    open: boolean;
    cellIndex: number;
    plant: PlantPublic | null;
    tray: TrayPublic | null;
  }>({ open: false, cellIndex: 0, plant: null, tray: null });
  const [newSeedState, setNewSeedState] = useState<{
    open: boolean;
    trayId: bigint;
    cellIndex: number;
  }>({ open: false, trayId: 0n, cellIndex: 0 });
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string | number>>(
    new Set(),
  );
  const [bulkCookConfirm, setBulkCookConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const [qrLabelOpen, setQrLabelOpen] = useState(false);

  const { tipsActive, handleDismiss, showTips, hideTips } = useNimsTips();

  const { data: rawTrays = [], isLoading: traysLoading } = useMyTrays();
  const { data: rawPlants = [], isLoading: plantsLoading } = useMyPlants();
  const { data: isAdmin } = useIsAdmin();

  const trays = rawTrays as TrayPublic[];
  const plants = rawPlants as PlantPublic[];
  const isLoading = traysLoading || plantsLoading;

  const activeTray = useMemo(() => {
    if (!trays.length) return null;
    if (selectedTrayId)
      return trays.find((t) => t.id === selectedTrayId) ?? trays[0];
    return trays[0];
  }, [trays, selectedTrayId]);

  const filteredPlants = useMemo(() => {
    if (!search.trim()) return plants;
    const q = search.toLowerCase();
    return plants.filter(
      (p) =>
        (p.common_name ?? "").toLowerCase().includes(q) ||
        (p.latin_name ?? "").toLowerCase().includes(q) ||
        p.variety.toLowerCase().includes(q) ||
        (p.origin ?? "").toLowerCase().includes(q),
    );
  }, [plants, search]);

  const trayPlants = useMemo(
    () =>
      activeTray
        ? filteredPlants.filter((p) => p.tray_id === activeTray.id)
        : [],
    [filteredPlants, activeTray],
  );

  function openCell(cellIndex: number, plant: PlantPublic | null) {
    if (!activeTray) return;
    if (!plant) {
      setNewSeedState({ open: true, trayId: activeTray.id, cellIndex });
    } else {
      setCellModalState({ open: true, cellIndex, plant, tray: activeTray });
    }
  }

  function openPlantFromList(plant: PlantPublic) {
    const tray = trays.find((t) => t.id === plant.tray_id);
    if (!tray) return;
    setCellModalState({
      open: true,
      cellIndex: Number(plant.cell_position),
      plant,
      tray,
    });
  }

  function toggleCellSelect(key: string | number) {
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleExportCSV() {
    exportNIMSCsv(
      filteredPlants,
      trays.map((t) => ({ id: t.id, name: t.name })),
    );
  }

  function handlePrintTrayMap() {
    if (!activeTray) return;
    const printPlants = trayPlants.map((p) => ({
      cellIndex: Number(p.cell_position),
      commonName: p.common_name || p.variety,
      stage: stageName(p.stage),
      isCooked: p.is_cooked,
      isTransplanted: p.is_transplanted,
    }));
    printTrayMap(activeTray.name, printPlants);
  }

  const selectedCount = selectedCells.size;

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <div
        className="bg-card border-b border-border sticky top-16 z-30"
        data-ocid="nims-header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                Nursery Inventory Management
              </h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                {plants.length} plants · {trays.length} trays
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Show Tips / Hide Tips toggle */}
              {tipsActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={hideTips}
                  className="h-8 text-xs text-muted-foreground gap-1.5"
                  data-ocid="nims-hide-tips-btn"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Hide Tips
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={showTips}
                  className="h-8 text-xs text-primary/70 hover:text-primary gap-1.5"
                  data-ocid="nims-show-tips-btn"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Show Tips
                </Button>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search plants…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="inventory-search pl-8 h-8 text-sm w-44"
                  data-ocid="nims-search"
                />
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-secondary rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={[
                    "flex items-center gap-1 px-2.5 py-1 rounded text-sm font-medium transition-smooth",
                    viewMode === "grid"
                      ? "bg-card text-primary shadow-subtle"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                  data-ocid="nims-view-grid"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={[
                    "flex items-center gap-1 px-2.5 py-1 rounded text-sm font-medium transition-smooth",
                    viewMode === "list"
                      ? "bg-card text-primary shadow-subtle"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                  data-ocid="nims-view-list"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("layout")}
                  className={[
                    "flex items-center gap-1 px-2.5 py-1 rounded text-sm font-medium transition-smooth",
                    viewMode === "layout"
                      ? "bg-card text-primary shadow-subtle"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                  data-ocid="nims-view-layout"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Layout
                </button>
              </div>

              {/* Bulk mode */}
              <span className="relative inline-flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkMode((v) => !v);
                    setSelectedCells(new Set());
                  }}
                  className={[
                    "h-8 border-border text-sm",
                    bulkMode
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "text-muted-foreground",
                  ].join(" ")}
                  data-ocid="nims-bulk-mode-btn"
                >
                  {bulkMode ? "Exit Bulk" : "Bulk Select"}
                </Button>
                <NimsTipBadge
                  tipKey="bulk-actions"
                  tipsActive={tipsActive}
                  onDismiss={handleDismiss}
                />
              </span>

              {/* Export CSV */}
              <span className="relative inline-flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 border-border text-muted-foreground hover:text-foreground"
                  data-ocid="nims-export-csv-btn"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export CSV
                </Button>
                <NimsTipBadge
                  tipKey="csv-export"
                  tipsActive={tipsActive}
                  onDismiss={handleDismiss}
                />
              </span>
            </div>
          </div>

          {/* Bulk action bar */}
          {bulkMode && selectedCount > 0 && (
            <div
              className="mt-3 flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2"
              data-ocid="nims-bulk-bar"
            >
              <span className="text-sm font-medium text-foreground">
                {selectedCount} cell{selectedCount !== 1 ? "s" : ""} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkCookConfirm(true)}
                className="h-7 border-red-800/40 text-red-400 hover:bg-red-950/40"
                data-ocid="nims-bulk-cooked-btn"
              >
                Mark Cooked
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const subset = filteredPlants.filter((p) => {
                    const key =
                      viewMode === "grid"
                        ? Number(p.cell_position)
                        : `${p.tray_id}-${p.cell_position}`;
                    return selectedCells.has(key);
                  });
                  exportNIMSCsv(
                    subset,
                    trays.map((t) => ({ id: t.id, name: t.name })),
                  );
                }}
                className="h-7 border-border text-muted-foreground hover:text-foreground"
                data-ocid="nims-bulk-export-btn"
              >
                Export Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedCells(new Set())}
                className="h-7 text-muted-foreground ml-auto"
                data-ocid="nims-bulk-clear-btn"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            </div>
          )}

          {/* Bulk cook confirmation */}
          {bulkCookConfirm && (
            <div className="mt-2 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2 flex items-center gap-3">
              <p className="text-sm text-red-300">
                Mark {selectedCount} cell(s) as cooked? This cannot be undone
                easily.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setBulkCookConfirm(false);
                  setSelectedCells(new Set());
                  setBulkMode(false);
                }}
                className="h-7 bg-red-900 hover:bg-red-800 text-red-100"
                data-ocid="nims-bulk-cooked-confirm"
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBulkCookConfirm(false)}
                className="h-7 text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="space-y-3" data-ocid="nims-loading">
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* Tray tabs */}
              {viewMode === "grid" && (
                <div className="space-y-4">
                  <TrayManager
                    trays={trays}
                    selectedTrayId={activeTray?.id ?? null}
                    onSelect={(id) => {
                      setSelectedTrayId(id);
                      setSelectedCells(new Set());
                    }}
                  />

                  {trays.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center py-20 gap-4 bg-card rounded-lg border border-border"
                      data-ocid="nims-empty-trays"
                    >
                      <Leaf className="w-12 h-12 text-muted-foreground opacity-30" />
                      <h3 className="font-semibold text-foreground">
                        No trays yet
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Add your first tray to start tracking seeds.
                      </p>
                    </div>
                  ) : activeTray ? (
                    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          {activeTray.name}
                          <NimsTipBadge
                            tipKey="tray-grid"
                            tipsActive={tipsActive}
                            onDismiss={handleDismiss}
                          />
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-muted-foreground text-xs">
                            {
                              trayPlants.filter(
                                (p) => !p.is_cooked && !p.is_transplanted,
                              ).length
                            }{" "}
                            / 72 active
                            {trayPlants.filter((p) => p.is_cooked).length >
                              0 && (
                              <span className="ml-2 text-red-400">
                                · {trayPlants.filter((p) => p.is_cooked).length}{" "}
                                cooked
                              </span>
                            )}
                          </span>

                          {/* Print Tray Map */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrintTrayMap}
                            className="h-7 border-border text-muted-foreground hover:text-foreground text-xs gap-1"
                            data-ocid="nims-print-tray-btn"
                          >
                            <Printer className="w-3 h-3" />
                            Print Map
                          </Button>

                          {/* Admin: Print QR Labels */}
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setQrLabelOpen(true)}
                              className="h-7 border-primary/40 text-primary hover:bg-primary/10 text-xs gap-1"
                              data-ocid="nims-print-qr-btn"
                            >
                              <QrCode className="w-3 h-3" />
                              Print QR Labels
                            </Button>
                          )}
                        </div>
                      </div>
                      <TrayGrid
                        tray={activeTray}
                        plants={trayPlants}
                        selectedCells={selectedCells as Set<number>}
                        onCellClick={openCell}
                        onCellSelect={(i) => toggleCellSelect(i)}
                        bulkMode={bulkMode}
                      />
                    </div>
                  ) : null}
                </div>
              )}

              {/* List view */}
              {viewMode === "list" && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                      All Plants
                      <NimsTipBadge
                        tipKey="cell-click"
                        tipsActive={tipsActive}
                        onDismiss={handleDismiss}
                      />
                    </span>
                  </div>
                  <ListView
                    plants={filteredPlants}
                    trays={trays}
                    selectedCells={selectedCells as Set<string>}
                    onRowSelect={(key) => toggleCellSelect(key)}
                    bulkMode={bulkMode}
                    onRowClick={openPlantFromList}
                  />
                </div>
              )}

              {/* Garden Layout view */}
              {viewMode === "layout" && (
                <GardenLayout
                  trays={trays}
                  plants={filteredPlants}
                  onCellClick={(tray, cellIndex, plant) => {
                    if (!plant) {
                      setNewSeedState({
                        open: true,
                        trayId: tray.id,
                        cellIndex,
                      });
                    } else {
                      setCellModalState({ open: true, cellIndex, plant, tray });
                    }
                  }}
                />
              )}
            </div>

            {/* Sidebar — weather widget */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-40 space-y-4">
                <div>
                  <p className="filter-section-title mb-2 flex items-center gap-1">
                    Weather
                    <NimsTipBadge
                      tipKey="weather"
                      tipsActive={tipsActive}
                      onDismiss={handleDismiss}
                    />
                  </p>
                  <WeatherWidget />
                </div>

                {/* Quick stats */}
                {plants.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                    <p className="filter-section-title">Quick Stats</p>
                    {[
                      { label: "Total Plants", value: plants.length },
                      {
                        label: "Seeds",
                        value: plants.filter(
                          (p) => p.stage === PlantStage.Seed && !p.is_cooked,
                        ).length,
                      },
                      {
                        label: "Seedlings",
                        value: plants.filter(
                          (p) =>
                            p.stage === PlantStage.Seedling && !p.is_cooked,
                        ).length,
                      },
                      {
                        label: "Mature",
                        value: plants.filter(
                          (p) => p.stage === PlantStage.Mature && !p.is_cooked,
                        ).length,
                      },
                      {
                        label: "For Sale",
                        value: plants.filter((p) => p.for_sale).length,
                      },
                      {
                        label: "Transplanted",
                        value: plants.filter((p) => p.is_transplanted).length,
                      },
                      {
                        label: "Cooked 💀",
                        value: plants.filter((p) => p.is_cooked).length,
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-foreground font-medium">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile weather widget */}
        <div className="lg:hidden mt-4">
          <WeatherWidget compact />
        </div>
      </div>

      {/* Cell Detail Modal */}
      {cellModalState.tray && (
        <CellDetailModal
          open={cellModalState.open}
          plant={cellModalState.plant}
          tray={cellModalState.tray}
          cellIndex={cellModalState.cellIndex}
          onClose={() => setCellModalState((s) => ({ ...s, open: false }))}
          onSeedPlanted={(trayId, cell) => {
            setCellModalState((s) => ({ ...s, open: false }));
            setNewSeedState({ open: true, trayId, cellIndex: cell });
          }}
        />
      )}

      {/* New Seed Modal */}
      <NewSeedModal
        open={newSeedState.open}
        trayId={newSeedState.trayId}
        cellIndex={newSeedState.cellIndex}
        onClose={() => setNewSeedState((s) => ({ ...s, open: false }))}
      />

      {/* QR Label Print Dialog (admin only) */}
      {isAdmin && activeTray && (
        <QrLabelDialog
          open={qrLabelOpen}
          onClose={() => setQrLabelOpen(false)}
          trayPlants={trayPlants}
          trayName={activeTray.name}
        />
      )}
    </div>
  );
}

// ─── Demo Tray Cell ───────────────────────────────────────────────────────────

type DemoCellState =
  | "empty"
  | "seeded"
  | "seedling"
  | "mature"
  | "transplanted"
  | "cooked";

const DEMO_CELL_STYLES: Record<DemoCellState, string> = {
  empty: "bg-card border border-border",
  seeded:
    "bg-emerald-950/60 border border-emerald-700/60 shadow-[0_0_6px_rgba(52,211,153,0.25)]",
  seedling: "bg-cyan-950/60 border border-cyan-600/50",
  mature: "bg-primary/20 border border-primary/50",
  transplanted: "bg-muted/20 border border-muted/40 opacity-60",
  cooked: "bg-black border border-red-900",
};

function makeDemoGrid(): DemoCellState[] {
  const cells: DemoCellState[] = new Array(72).fill("empty");
  const states: DemoCellState[] = [
    "seeded",
    "seeded",
    "seeded",
    "seedling",
    "seedling",
    "mature",
    "transplanted",
    "cooked",
  ];
  const positions = [
    1, 3, 5, 8, 10, 14, 18, 22, 25, 28, 31, 34, 37, 40, 44, 47, 50, 55, 60, 63,
    67, 70,
  ];
  positions.forEach((pos, i) => {
    cells[pos] = states[i % states.length];
  });
  return cells;
}

function AnimatedDemoTray() {
  const [cells, setCells] = useState<{ id: number; state: DemoCellState }[]>(
    () => Array.from({ length: 72 }, (_, i) => ({ id: i, state: "empty" })),
  );
  const [animStep, setAnimStep] = useState(0);
  const targetGrid = useRef(makeDemoGrid());
  const COLS = 12;

  useEffect(() => {
    const filledPositions = targetGrid.current
      .map((state, i) => (state !== "empty" ? i : -1))
      .filter((i) => i !== -1);

    if (animStep < filledPositions.length) {
      const timer = setTimeout(() => {
        const pos = filledPositions[animStep];
        setCells((prev) =>
          prev.map((c) =>
            c.id === pos ? { ...c, state: targetGrid.current[pos] } : c,
          ),
        );
        setAnimStep((s) => s + 1);
      }, 120);
      return () => clearTimeout(timer);
    }
    const cycleTimer = setTimeout(() => {
      setCells((prev) => {
        const seededIdx = prev.findIndex((c) => c.state === "seeded");
        if (seededIdx !== -1) {
          return prev.map((c, i) =>
            i === seededIdx ? { ...c, state: "seedling" } : c,
          );
        }
        const seedlingIdx = prev.findIndex((c) => c.state === "seedling");
        if (seedlingIdx !== -1) {
          return prev.map((c, i) =>
            i === seedlingIdx ? { ...c, state: "mature" } : c,
          );
        }
        return prev;
      });
    }, 2200);
    return () => clearTimeout(cycleTimer);
  }, [animStep]);

  return (
    <div className="space-y-3">
      <div
        className="grid gap-1 w-full"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        data-ocid="nims-demo-tray"
      >
        {cells.map(({ id, state }) => (
          <div
            key={`demo-cell-${id}`}
            className={[
              DEMO_CELL_STYLES[state],
              "relative aspect-square rounded-sm flex items-center justify-center transition-all duration-300",
            ].join(" ")}
            style={{ minHeight: "28px" }}
          >
            <span className="text-[8px] text-muted-foreground/40 font-mono absolute top-0.5 right-0.5 leading-none">
              {id + 1}
            </span>
            {state === "seeded" && <span className="text-[10px]">🌱</span>}
            {state === "seedling" && <span className="text-[10px]">🌿</span>}
            {state === "mature" && <span className="text-[10px]">🌶️</span>}
            {state === "transplanted" && (
              <span className="text-[6px] font-bold text-muted-foreground/50 rotate-[-30deg] leading-none">
                XPLNT
              </span>
            )}
            {state === "cooked" && <span className="text-[10px]">💀</span>}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
        {(
          [
            {
              cls: "w-3 h-3 rounded-sm bg-card border border-border",
              label: "Empty",
            },
            {
              cls: "w-3 h-3 rounded-sm bg-emerald-950/60 border border-emerald-700/60",
              label: "Seeded",
            },
            {
              cls: "w-3 h-3 rounded-sm bg-cyan-950/60 border border-cyan-600/50",
              label: "Seedling",
            },
            {
              cls: "w-3 h-3 rounded-sm bg-primary/20 border border-primary/50",
              label: "Mature",
            },
            {
              cls: "w-3 h-3 rounded-sm bg-muted/20 border border-muted/40 opacity-60",
              label: "Transplanted",
            },
            {
              cls: "w-3 h-3 rounded-sm bg-black border border-red-900",
              label: "Cooked",
            },
          ] as const
        ).map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cls} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Public NIMS Showcase ─────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    icon: Grid3X3,
    title: "72-Cell Tray Grids",
    desc: "Visual 12×6 tray maps. Click any cell to open detailed plant records.",
    color: "text-emerald-400",
    bg: "bg-emerald-950/30 border-emerald-800/40",
  },
  {
    icon: Leaf,
    title: "Full Lifecycle Data",
    desc: "Track common name, latin name, origin, planting date, nutrition, and pest notes per seed.",
    color: "text-cyan-400",
    bg: "bg-cyan-950/30 border-cyan-800/40",
  },
  {
    icon: Sprout,
    title: "Transplant Flow",
    desc: "Mark cells transplanted with container size. All lifecycle data carries forward automatically.",
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
  },
  {
    icon: CloudSun,
    title: "Weather Integration",
    desc: "Enable location sharing to auto-log daily weather records alongside your plants.",
    color: "text-sky-400",
    bg: "bg-sky-950/30 border-sky-800/40",
  },
  {
    icon: Camera,
    title: "Progress Photos",
    desc: "Upload compressed progress pictures for each plant — stored efficiently on-chain.",
    color: "text-violet-400",
    bg: "bg-violet-950/30 border-violet-800/40",
  },
  {
    icon: FileText,
    title: "CSV Export & Reports",
    desc: "Export full lifecycle data for any plant or tray with one click.",
    color: "text-amber-400",
    bg: "bg-amber-950/30 border-amber-800/40",
  },
  {
    icon: ToggleLeft,
    title: "Inventory Control",
    desc: "Admin shop toggles mark plants For Sale directly from the tray view.",
    color: "text-fire",
    bg: "bg-fire/10 border-fire/30",
  },
  {
    icon: Download,
    title: "Bulk Actions",
    desc: "Select multiple cells and apply actions — mark cooked, export, or update in bulk.",
    color: "text-rose-400",
    bg: "bg-rose-950/30 border-rose-800/40",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "🌱",
    title: "Plant a Seed",
    desc: "Add a tray, click a cell, and record the seed's variety, origin, and planting date.",
  },
  {
    step: "02",
    icon: "📋",
    title: "Monitor & Log",
    desc: "Track watering schedules, feeding logs, pest pressure, and daily weather automatically.",
  },
  {
    step: "03",
    icon: "🪴",
    title: "Transplant",
    desc: "When a seedling is ready, tap Transplant to move it to a new container. All data travels with it.",
  },
  {
    step: "04",
    icon: "🌶️",
    title: "Harvest or Sell",
    desc: "Mature plants can be toggled For Sale in the admin panel or harvested with full provenance recorded.",
  },
];

function NIMSShowcase() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section
        className="relative py-20 sm:py-28 bg-card border-b border-border overflow-hidden"
        data-ocid="nims-showcase-hero"
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,oklch(0.62 0.26 145) 0,oklch(0.62 0.26 145) 1px,transparent 1px,transparent 52px),repeating-linear-gradient(90deg,oklch(0.62 0.26 145) 0,oklch(0.62 0.26 145) 1px,transparent 1px,transparent 52px)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, oklch(0.55 0.2 145), transparent 65%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Text */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge
                variant="outline"
                className="border-emerald-700/50 text-emerald-400 text-xs px-3 py-1 font-display tracking-widest uppercase"
              >
                Free for All Registered Users
              </Badge>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight">
                Nursery <span className="text-emerald-400">Inventory</span>{" "}
                Management System
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
                Track every seed from the moment it's planted to the day it's
                harvested or sold. NIMS gives you professional-grade nursery
                management — completely free for every IC SPICY member.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={login}
                  className="bg-emerald-700 hover:bg-emerald-600 text-foreground font-display font-bold px-8 gap-2 shadow-elevated transition-smooth"
                  data-ocid="nims-signin-hero-cta"
                >
                  <Leaf className="w-5 h-5" />
                  Sign In to Start Tracking
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border hover:border-emerald-700/50 hover:text-emerald-400 font-display px-8 gap-2 transition-smooth"
                  onClick={() =>
                    document
                      .getElementById("nims-how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  data-ocid="nims-how-it-works-scroll"
                >
                  How It Works
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>

            {/* Animated tray demo */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="bg-background border border-border rounded-2xl p-5 shadow-elevated">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-display font-semibold text-foreground">
                      Tray Alpha — Spring 2026
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Live demo · cells fill as seeds are planted
                    </p>
                  </div>
                  <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/40 text-xs">
                    NIMS Demo
                  </Badge>
                </div>
                <AnimatedDemoTray />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section
        className="py-20 bg-background"
        data-ocid="nims-showcase-features"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-emerald-400 font-display text-sm tracking-widest uppercase mb-3">
              Everything You Need
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">
              Professional Nursery Tools
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              NIMS was built for serious growers who need real data, not
              guesswork. Every feature is purpose-built for plant lifecycle
              management.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURE_CARDS.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <motion.div
                key={title}
                className={`border rounded-xl p-5 space-y-3 ${bg}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                data-ocid="nims-feature-card"
              >
                <div
                  className={`w-9 h-9 rounded-lg bg-background/50 flex items-center justify-center ${color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-sm">
                  {title}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="nims-how-it-works"
        className="py-20 bg-muted/30 border-y border-border"
        data-ocid="nims-showcase-how-it-works"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-emerald-400 font-display text-sm tracking-widest uppercase mb-3">
              Simple Workflow
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">
              How NIMS Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div
              className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-border"
              aria-hidden="true"
            />
            {HOW_IT_WORKS.map(({ step, icon, title, desc }, i) => (
              <motion.div
                key={step}
                className="relative flex flex-col items-center text-center space-y-4"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                data-ocid="nims-how-step"
              >
                <div className="relative z-10 w-24 h-24 rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-1 shadow-elevated">
                  <span style={{ fontSize: "2.2rem" }}>{icon}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {step}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-[200px]">
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background" data-ocid="nims-showcase-cta">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-700/30 flex items-center justify-center mx-auto">
              <Leaf className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">
              Ready to Track Your Grow?
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              NIMS is completely free for every registered IC SPICY user. Sign
              in with Internet Identity to access your full nursery management
              dashboard.
            </p>
            <Button
              size="lg"
              onClick={login}
              className="bg-emerald-700 hover:bg-emerald-600 text-foreground font-display font-bold px-10 py-6 text-base gap-2 shadow-elevated transition-smooth"
              data-ocid="nims-signin-bottom-cta"
            >
              <Leaf className="w-5 h-5" />
              Sign In to Start Tracking
            </Button>
            <p className="text-xs text-muted-foreground">
              Free · No subscription · Works with Internet Identity
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

// ─── Auth Guard (default export) ─────────────────────────────────────────────

export default function NIMS() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
        data-ocid="nims-loading-auth"
      >
        <Leaf className="w-10 h-10 text-muted-foreground opacity-40 animate-pulse" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <NIMSShowcase />;
  }

  return <NIMSPage />;
}
