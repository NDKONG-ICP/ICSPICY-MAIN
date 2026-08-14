import {
  BookOpen,
  Bug,
  Camera,
  ChevronDown,
  ChevronUp,
  Droplet,
  Leaf,
  Move,
  NotepadText,
  ShoppingBag,
  Skull,
  Sprout,
  Tag,
  Trash2,
  Wheat,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuickPlantAction =
  | "water"
  | "feed"
  | "pest"
  | "photo"
  | "note"
  | "transplant"
  | "harvest_seeds"
  | "nfc_tag"
  | "list_sale"
  | "mark_dead"
  | "revive_plant"
  | "remove_plant"
  | "growing_guide";

type ActionDef = {
  key: QuickPlantAction;
  label: string;
  icon: typeof Droplet;
  tone?: "danger" | "success";
};

const BASE_ACTIONS: ReadonlyArray<ActionDef> = [
  { key: "water", label: "Water", icon: Droplet },
  { key: "feed", label: "Feed", icon: Leaf },
  { key: "pest", label: "Pest", icon: Bug },
  { key: "photo", label: "Photo", icon: Camera },
  { key: "note", label: "Note", icon: NotepadText },
  { key: "transplant", label: "Transplant", icon: Move },
  { key: "harvest_seeds", label: "Harvest Seeds", icon: Wheat },
  { key: "growing_guide", label: "Growing Guide", icon: BookOpen },
  { key: "nfc_tag", label: "NFC Tag Link", icon: Tag },
  { key: "list_sale", label: "List for Sale", icon: ShoppingBag },
  {
    key: "mark_dead",
    label: "☠️ Mark Dead",
    icon: Skull,
    tone: "danger",
  },
  {
    key: "revive_plant",
    label: "🌱 Revive Plant",
    icon: Sprout,
    tone: "success",
  },
  {
    key: "remove_plant",
    label: "Delete Plant",
    icon: Trash2,
    tone: "danger",
  },
];

/** Always-visible when collapsed — common care actions. */
const COLLAPSED_SHORTCUTS: ReadonlyArray<QuickPlantAction> = [
  "water",
  "feed",
  "photo",
];

const STORAGE_KEY = "nims-quick-actions-expanded";

export type PlantQuickActionsProps = {
  onAction: (type: QuickPlantAction) => void;
  disabled?: boolean;
  /** When true, show revive instead of mark dead (admin). */
  isPlantDead?: boolean;
  /** Actions omitted from the toolbar (e.g. admin-only). */
  hiddenActions?: QuickPlantAction[];
};

export function PlantQuickActions({
  onAction,
  disabled = false,
  isPlantDead = false,
  hiddenActions = [],
}: PlantQuickActionsProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw === "1") setExpanded(true);
      if (raw === "0") setExpanded(false);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const visible = BASE_ACTIONS.filter((a) => {
    if (hiddenActions.includes(a.key)) return false;
    if (isPlantDead && a.key === "mark_dead") return false;
    if (!isPlantDead && a.key === "revive_plant") return false;
    return true;
  });

  const shortcuts = visible.filter((a) => COLLAPSED_SHORTCUTS.includes(a.key));

  function renderActionButton(a: ActionDef, compact = false) {
    const Icon = a.icon;
    const actionDisabled = isPlantDead
      ? a.key !== "revive_plant" && a.key !== "remove_plant"
      : disabled;
    return (
      <Button
        key={a.key}
        type="button"
        variant={
          a.tone === "danger"
            ? "destructive"
            : a.tone === "success"
              ? "default"
              : "secondary"
        }
        size="sm"
        disabled={actionDisabled}
        data-ocid={`nims-quick-actions-${a.key}`}
        onClick={() => onAction(a.key)}
        className={cn(
          compact
            ? "h-10 min-w-0 flex-1 gap-1.5 px-2 text-[11px] font-semibold"
            : "h-auto min-h-[44px] flex-col gap-1 py-3 text-[11px] font-semibold",
          a.tone === "success" &&
            "bg-emerald-600 text-white hover:bg-emerald-700",
        )}
      >
        <Icon className={cn(compact ? "size-4" : "size-5")} aria-hidden />
        <span className={cn(compact && "truncate")}>{a.label}</span>
      </Button>
    );
  }

  return (
    <div
      role="toolbar"
      data-ocid="nims-quick-actions"
      aria-label="Plant actions"
      className={cn(
        "sticky bottom-0 z-40 w-full rounded-t-xl border-x border-t border-border bg-background/95 backdrop-blur",
        "pb-[max(env(safe-area-inset-bottom,0px),12px)]",
        "shadow-[0_-16px_32px_-12px_rgb(0,0,0,0.6)] md:rounded-xl md:border md:shadow-none",
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2">
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          data-ocid="nims-quick-actions-toggle"
          className="flex min-h-10 flex-1 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted/50"
        >
          <span className="text-sm font-semibold text-foreground">
            Plant actions
            <span className="ml-1.5 font-normal text-muted-foreground">
              ({visible.length})
            </span>
          </span>
          {expanded ? (
            <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronUp className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          )}
        </button>
      </div>

      {!expanded && shortcuts.length > 0 && (
        <div
          className="flex gap-2 px-3 pb-2 pt-1"
          data-ocid="nims-quick-actions-collapsed"
        >
          {shortcuts.map((a) => renderActionButton(a, true))}
        </div>
      )}

      {expanded && (
        <div
          className="grid grid-cols-2 gap-2 p-3 pt-1 sm:grid-cols-4"
          data-ocid="nims-quick-actions-expanded"
        >
          {visible.map((a) => renderActionButton(a, false))}
        </div>
      )}
    </div>
  );
}
