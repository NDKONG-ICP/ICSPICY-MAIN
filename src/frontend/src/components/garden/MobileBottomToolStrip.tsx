import { Button } from "@/components/ui/button";
import type { GardenToolExtras } from "@/lib/garden-types";
import { cn } from "@/lib/utils";
import { ChevronUp, Ruler, Save } from "lucide-react";

type Props = {
  activeTool: GardenToolExtras["activeTool"];
  onTool: (t: GardenToolExtras["activeTool"]) => void;
  onOpenCatalog: () => void;
  catalogOpen: boolean;
  onQuickCategory: () => void;
  onSave: () => void;
  readOnly?: boolean;
};

export function MobileBottomToolStrip({
  activeTool,
  onTool,
  onOpenCatalog,
  catalogOpen,
  onQuickCategory,
  onSave,
  readOnly,
}: Props) {
  return (
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-between border-t border-white/10 bg-card/98 backdrop-blur-xl px-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-10 px-2 text-lg"
          onClick={onQuickCategory}
          aria-label="Peppers"
        >
          🌶️
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-10 px-2 text-lg"
          onClick={onQuickCategory}
          aria-label="Fruit trees"
        >
          🌳
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-10 px-2 text-lg"
          onClick={onQuickCategory}
          aria-label="Structures"
        >
          🏗️
        </Button>
        <Button
          type="button"
          size="sm"
          variant={
            activeTool === "measure" || activeTool === "area"
              ? "default"
              : "ghost"
          }
          className="h-10 px-2"
          onClick={() => onTool(activeTool === "measure" ? "none" : "measure")}
          aria-label="Measure"
        >
          <Ruler className="h-4 w-4" />
        </Button>
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-10 px-2"
            onClick={onSave}
            aria-label="Save"
          >
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant={catalogOpen ? "default" : "outline"}
        className={cn(
          "h-9 gap-1",
          catalogOpen && "shadow-[0_0_12px_rgba(249,115,22,0.35)]",
        )}
        onClick={onOpenCatalog}
      >
        <ChevronUp
          className={cn(
            "h-4 w-4 transition-transform",
            catalogOpen && "rotate-180",
          )}
        />
        Catalog
      </Button>
    </div>
  );
}
