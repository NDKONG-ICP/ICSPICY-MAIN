import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { VarietyPublic } from "@/declarations/backend.did";
import type { GardenDesignerState } from "@/hooks/useGardenDesigner";
import { formatScoville, spacingRecommendation } from "@/lib/garden-utils";
import { Copy, Trash2 } from "lucide-react";

type Props = {
  designer: GardenDesignerState;
  varieties: VarietyPublic[];
  mobile?: boolean;
};

export function PropertiesPanel({ designer, varieties, mobile }: Props) {
  const {
    selectedPlant,
    selectedStructure,
    selectedId,
    selectedType,
    readOnly,
    rotateItem,
    scaleItem,
    moveItem,
    deleteItem,
    duplicateItem,
  } = designer;

  if (selectedId == null || !selectedType) {
    return (
      <aside
        className={
          mobile
            ? "fixed inset-x-0 bottom-0 z-30 rounded-t-xl border border-border bg-card p-4 sm:hidden"
            : "hidden lg:flex w-72 shrink-0 flex-col border-l border-border bg-card/40 p-4"
        }
      >
        <p className="text-sm text-muted-foreground">
          Select a plant or structure to edit properties.
        </p>
      </aside>
    );
  }

  const variety =
    selectedPlant?.varietyId != null
      ? varieties.find((v) => Number(v.id) === selectedPlant.varietyId)
      : undefined;

  const name =
    selectedType === "plant"
      ? (selectedPlant?.label ?? "Plant")
      : (selectedStructure?.structureType.replace(/_/g, " ") ?? "Structure");

  const x = selectedType === "plant" ? selectedPlant!.x : selectedStructure!.x;
  const y = selectedType === "plant" ? selectedPlant!.y : selectedStructure!.y;
  const rotation =
    selectedType === "plant"
      ? selectedPlant!.rotation
      : selectedStructure!.rotation;

  return (
    <aside
      className={
        mobile
          ? "fixed inset-x-0 bottom-0 z-30 max-h-[55vh] overflow-auto rounded-t-xl border border-border bg-card p-4 sm:hidden"
          : "hidden lg:flex w-72 shrink-0 flex-col border-l border-border bg-card/40 p-4 gap-4 overflow-auto"
      }
    >
      <div>
        <h3 className="font-semibold capitalize">{name}</h3>
        {variety && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatScoville(variety.scovilleMin, variety.scovilleMax)} · spacing{" "}
            {spacingRecommendation(Number(variety.scovilleMax))}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="prop-x">X (m)</Label>
          <Input
            id="prop-x"
            type="number"
            step={0.1}
            value={x}
            disabled={readOnly}
            onChange={(e) =>
              moveItem(selectedId, selectedType, Number(e.target.value), y)
            }
          />
        </div>
        <div>
          <Label htmlFor="prop-y">Y (m)</Label>
          <Input
            id="prop-y"
            type="number"
            step={0.1}
            value={y}
            disabled={readOnly}
            onChange={(e) =>
              moveItem(selectedId, selectedType, x, Number(e.target.value))
            }
          />
        </div>
      </div>

      <div>
        <Label>Rotation ({Math.round(rotation)}°)</Label>
        <Slider
          disabled={readOnly}
          min={0}
          max={360}
          step={1}
          value={[rotation]}
          onValueChange={([v]) => {
            const delta = v - rotation;
            rotateItem(selectedId, selectedType, delta);
          }}
          className="mt-2"
        />
      </div>

      {selectedType === "plant" && selectedPlant && (
        <div>
          <Label>Scale ({selectedPlant.scale.toFixed(1)})</Label>
          <Slider
            disabled={readOnly}
            min={0.5}
            max={2}
            step={0.1}
            value={[selectedPlant.scale]}
            onValueChange={([v]) => scaleItem(selectedId, "plant", v)}
            className="mt-2"
          />
        </div>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => duplicateItem(selectedId, selectedType)}
          >
            <Copy className="h-4 w-4 mr-1" /> Duplicate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => deleteItem(selectedId, selectedType, true)}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      )}
    </aside>
  );
}
