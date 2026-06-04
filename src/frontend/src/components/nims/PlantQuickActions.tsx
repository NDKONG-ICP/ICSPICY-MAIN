import {
  Bug,
  Camera,
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
  | "remove_plant";

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
    label: "Remove Plant",
    icon: Trash2,
    tone: "danger",
  },
];

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
  const visible = BASE_ACTIONS.filter((a) => {
    if (hiddenActions.includes(a.key)) return false;
    if (isPlantDead && a.key === "mark_dead") return false;
    if (!isPlantDead && a.key === "revive_plant") return false;
    return true;
  });

  return (
    <div
      role="toolbar"
      data-ocid="nims-quick-actions"
      aria-label="Plant actions"
      className={cn(
        "sticky bottom-0 z-40 w-full rounded-t-xl border-x border-t border-border bg-background/95 p-3 backdrop-blur",
        "pb-[max(env(safe-area-inset-bottom,0px),12px)]",
        "shadow-[0_-16px_32px_-12px_rgb(0,0,0,0.6)] md:rounded-xl md:border md:shadow-none",
      )}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visible.map((a) => {
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
                "h-auto min-h-[44px] flex-col gap-1 py-3 text-[11px] font-semibold",
                a.tone === "success" &&
                  "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span>{a.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
