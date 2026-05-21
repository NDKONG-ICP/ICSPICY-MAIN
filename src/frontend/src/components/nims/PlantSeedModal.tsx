import { useState } from "react";

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

export type PlantSeedSubmit = {
  varietyName: string;
  genetics?: string;
  notes?: string;
};

export type PlantSeedModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotLabel?: string;
  onSubmit: (payload: PlantSeedSubmit) => void;
};

export function PlantSeedModal({
  open,
  onOpenChange,
  slotLabel,
  onSubmit,
}: PlantSeedModalProps) {
  const [varietyName, setVarietyName] = useState("");
  const [genetics, setGenetics] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-modal-plant-seed" className="max-w-md gap-6">
        <DialogHeader>
          <DialogTitle>Plant seed · {slotLabel ?? "Tray cell"}</DialogTitle>
          <DialogDescription>
            Capture variety + genotype notes prior to staking an NFT lineage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nims-seed-var">Variety name</Label>
            <Input
              id="nims-seed-var"
              data-ocid="nims-seed-variety"
              placeholder="e.g. Scotch Bonnet Purple"
              value={varietyName}
              onChange={(e) => setVarietyName(e.target.value)}
            />
          </div>
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
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="nims-seed-submit"
            disabled={varietyName.trim() === ""}
            onClick={() => {
              onSubmit({
                varietyName: varietyName.trim(),
                genetics: genetics.trim() === "" ? undefined : genetics.trim(),
                notes: notes.trim() === "" ? undefined : notes.trim(),
              });
              onOpenChange(false);
            }}
          >
            Save seed sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
