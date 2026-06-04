import { CatalogAccordion } from "@/components/garden/CatalogAccordion";
import type { PlantCategory } from "@/lib/garden-plant-catalog";
import type { PendingPlacement } from "@/lib/garden-types";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";

type Props = {
  readOnly?: boolean;
  expanded: boolean;
  onExpandedChange: (v: boolean) => void;
  onPending: (p: PendingPlacement | null) => void;
  initialCategory?: PlantCategory | "structures";
};

export function BottomSheetCatalog({
  readOnly,
  expanded,
  onExpandedChange,
  onPending,
  initialCategory,
}: Props) {
  return (
    <div
      className={cn(
        "sm:hidden fixed inset-x-0 z-20 flex flex-col rounded-t-2xl border border-white/10 bg-card/98 backdrop-blur-xl shadow-2xl transition-[height] duration-300",
        expanded ? "bottom-14 h-[50vh]" : "bottom-14 h-0 pointer-events-none",
      )}
    >
      {expanded && (
        <>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2 border-b border-white/10 shrink-0 pointer-events-auto"
            onClick={() => onExpandedChange(false)}
          >
            <ChevronUp className="h-4 w-4 rotate-180" />
            <span className="text-xs text-muted-foreground">Catalog</span>
          </button>
          <div className="flex-1 overflow-auto px-2 pb-2 pointer-events-auto">
            <CatalogAccordion readOnly={readOnly} onPending={onPending} />
          </div>
        </>
      )}
    </div>
  );
}
