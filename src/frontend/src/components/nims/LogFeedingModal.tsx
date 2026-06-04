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

const DOSAGES = ["¼ tsp", "½ tsp", "1 tsp", "1 tbsp", "½ cup"] as const;
const MACRO_TYPES = [
  "CalMag",
  "Grow A/B",
  "Bloom booster",
  "Compost tea",
  "Other",
];

export type LogFeedingSubmit = {
  dosageAmount: string;
  nutrientType: string;
  productName: string;
  notes?: string;
};

export type LogFeedingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLabel?: string;
  onSubmit: (payload: LogFeedingSubmit) => void;
};

export function LogFeedingModal({
  open,
  onOpenChange,
  plantLabel,
  onSubmit,
}: LogFeedingModalProps) {
  const [dosage, setDosage] = useState<string>(DOSAGES[2]!);
  const [nutrientType, setNutrientType] = useState(MACRO_TYPES[0]!);
  const [productName, setProductName] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-modal-log-feed" className="max-w-md gap-6">
        <DialogHeader>
          <DialogTitle>Log feeding</DialogTitle>
          <DialogDescription>
            {plantLabel ??
              "Capture nutrient pass for future buyers + provenance."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Dosage</Label>
            <div className="flex flex-wrap gap-2">
              {DOSAGES.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={dosage === d ? "default" : "outline"}
                  data-ocid={`nims-feed-dose-${d.replace(/\//g, "-")}`}
                  onClick={() => setDosage(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nims-feed-type">Nutrient type</Label>
            <Input
              id="nims-feed-type"
              data-ocid="nims-feed-nutrient"
              list="nims-feed-macro-presets"
              value={nutrientType}
              onChange={(e) => setNutrientType(e.target.value)}
            />
            <datalist id="nims-feed-macro-presets">
              {MACRO_TYPES.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nims-feed-product">Product name</Label>
            <Input
              id="nims-feed-product"
              data-ocid="nims-feed-product"
              placeholder="e.g. FloraFlex V1"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nims-feed-notes">Notes</Label>
            <Textarea
              id="nims-feed-notes"
              data-ocid="nims-feed-notes"
              placeholder="Mixed with RO @ 560 µS…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="nims-feed-submit"
            disabled={productName.trim() === "" || nutrientType.trim() === ""}
            onClick={() => {
              onSubmit({
                dosageAmount: dosage,
                nutrientType: nutrientType.trim(),
                productName: productName.trim(),
                notes: notes.trim() === "" ? undefined : notes.trim(),
              });
              onOpenChange(false);
            }}
          >
            Save feeding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
