import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ContainerSize,
  PlantStage,
  VarietyPublic,
} from "../../declarations/backend.did";
import { VarietyPicker } from "./VarietyPicker";

const CONTAINERS: ReadonlyArray<{ label: string; size: ContainerSize }> = [
  { label: "1 gallon pot", size: { Gal1New: null } },
  { label: "3 gallon pot", size: { Gal3New: null } },
  { label: "5 gallon bucket", size: { Gal5Bucket: null } },
  { label: "4″ liner", size: { Pot4Inch: null } },
  { label: "6″ liner", size: { Pot6Inch: null } },
  { label: "In ground bed", size: { InGround: null } },
  { label: "Raised bed", size: { Other: "Raised bed" } },
];

const STAGES: ReadonlyArray<{ label: string; stage: PlantStage }> = [
  { label: "Seedling", stage: { Seedling: null } },
  { label: "Mature", stage: { Mature: null } },
];

export function AddPlantModal({
  open,
  onOpenChange,
  varieties,
  isPending,
  isCreatingVariety,
  onCreateVariety,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  varieties: VarietyPublic[];
  isPending?: boolean;
  isCreatingVariety?: boolean;
  onCreateVariety: (name: string, species: string) => Promise<bigint>;
  onSubmit: (payload: {
    varietyId: bigint;
    stage: PlantStage;
    container: ContainerSize;
  }) => void;
}) {
  const [varietyId, setVarietyId] = useState<string>("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [stageKey, setStageKey] = useState("Seedling");
  const [containerIdx, setContainerIdx] = useState("0");

  const stage = useMemo(
    () => STAGES.find((s) => s.label === stageKey)?.stage ?? { Seedling: null },
    [stageKey],
  );
  const container = CONTAINERS[Number(containerIdx)]?.size ?? { Gal1New: null };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add plant to your garden</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Variety</Label>
            <VarietyPicker
              idPrefix="nims-add-plant"
              varieties={varieties}
              value={varietyId}
              onChange={setVarietyId}
              onCreateVariety={onCreateVariety}
              isCreating={isCreatingVariety}
              onAddFormOpenChange={setAddFormOpen}
            />
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stageKey} onValueChange={setStageKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.label} value={s.label}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Container / location</Label>
            <Select value={containerIdx} onValueChange={setContainerIdx}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTAINERS.map((c, i) => (
                  <SelectItem key={c.label} value={String(i)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!varietyId || addFormOpen || isPending}
            onClick={() =>
              onSubmit({
                varietyId: BigInt(varietyId),
                stage,
                container,
              })
            }
          >
            {isPending ? "Adding…" : "Add plant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
