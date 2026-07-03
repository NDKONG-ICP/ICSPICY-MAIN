import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VarietyPublic } from "../../declarations/backend.did";
import { VarietyPicker } from "./VarietyPicker";

export type PlantSeedSubmit = {
  varietyId: bigint;
  genetics?: string;
  notes?: string;
};

export type PlantSeedModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotLabel?: string;
  varieties: VarietyPublic[];
  initialVarietyId?: bigint;
  isCreatingVariety?: boolean;
  onCreateVariety: (name: string, species: string) => Promise<bigint>;
  onSubmit: (payload: PlantSeedSubmit) => void | Promise<void>;
};

export function PlantSeedModal({
  open,
  onOpenChange,
  slotLabel,
  varieties,
  initialVarietyId,
  isCreatingVariety,
  onCreateVariety,
  onSubmit,
}: PlantSeedModalProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [genetics, setGenetics] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedId("");
      setAddFormOpen(false);
      setGenetics("");
      setNotes("");
      return;
    }
    if (varieties.length > 0 && !selectedId) {
      const preferred =
        initialVarietyId != null
          ? varieties.find((v) => v.id === initialVarietyId)?.id.toString()
          : undefined;
      if (preferred) setSelectedId(preferred);
    }
  }, [open, varieties, selectedId, initialVarietyId]);

  const canSubmit = selectedId !== "" && !addFormOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="nims-modal-plant-seed"
        className="max-w-md gap-6"
      >
        <DialogHeader>
          <DialogTitle>Plant seed · {slotLabel ?? "Tray cell"}</DialogTitle>
          <DialogDescription>
            Pick a variety from the catalog, or add a new one inline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="nims-seed-search">Variety</Label>
          <VarietyPicker
            idPrefix="nims-seed"
            varieties={varieties}
            value={selectedId}
            onChange={setSelectedId}
            onCreateVariety={onCreateVariety}
            isCreating={isCreatingVariety}
            onAddFormOpenChange={setAddFormOpen}
          />
        </div>

        {!addFormOpen && (
          <>
            <div className="space-y-2">
              <Label htmlFor="nims-seed-gen">Genetics (optional)</Label>
              <Input
                id="nims-seed-gen"
                data-ocid="nims-seed-genetics"
                placeholder="Parent cross or seed lot batch"
                value={genetics}
                onChange={(e) => setGenetics(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nims-seed-notes">Notes</Label>
              <Textarea
                id="nims-seed-notes"
                data-ocid="nims-seed-notes"
                placeholder="Cold strat days, sanitization bath…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {!addFormOpen && (
            <Button
              type="button"
              data-ocid="nims-seed-submit"
              disabled={!canSubmit}
              onClick={() => {
                void onSubmit({
                  varietyId: BigInt(selectedId),
                  genetics:
                    genetics.trim() === "" ? undefined : genetics.trim(),
                  notes: notes.trim() === "" ? undefined : notes.trim(),
                });
              }}
            >
              Plant seed
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
