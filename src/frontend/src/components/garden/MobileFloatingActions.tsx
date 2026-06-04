import { Button } from "@/components/ui/button";
import type { GardenDesignerState } from "@/hooks/useGardenDesigner";
import { Copy, RotateCw, Trash2, ZoomIn } from "lucide-react";

type Props = {
  designer: GardenDesignerState;
  readOnly?: boolean;
};

export function MobileFloatingActions({ designer, readOnly }: Props) {
  const {
    selectedId,
    selectedType,
    selectedPlant,
    rotateItem,
    scaleItem,
    duplicateItem,
    deleteItem,
  } = designer;

  if (readOnly || selectedId == null || !selectedType) return null;

  const bumpScale = () => {
    if (selectedType !== "plant" || !selectedPlant) return;
    scaleItem(selectedId, selectedType, Math.min(2, selectedPlant.scale + 0.1));
  };

  return (
    <div className="sm:hidden fixed bottom-24 right-3 z-40 flex flex-col gap-2">
      <Button
        size="icon"
        className="h-11 w-11 rounded-full shadow-lg bg-card/95 border border-white/10"
        onClick={() => rotateItem(selectedId, selectedType, 45)}
        aria-label="Rotate"
      >
        <RotateCw className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        className="h-11 w-11 rounded-full shadow-lg bg-card/95 border border-white/10"
        onClick={bumpScale}
        aria-label="Scale up"
      >
        <ZoomIn className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        className="h-11 w-11 rounded-full shadow-lg bg-card/95 border border-white/10"
        onClick={() => duplicateItem(selectedId, selectedType)}
        aria-label="Duplicate"
      >
        <Copy className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        variant="destructive"
        className="h-11 w-11 rounded-full shadow-lg"
        onClick={() =>
          deleteItem(selectedId, selectedType, selectedType === "structure")
        }
        aria-label="Delete"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
}
