import { useMemo, useState } from "react";

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

const PRESETS = [
  { label: "4 oz", ml: 120n },
  { label: "8 oz", ml: 235n },
  { label: "16 oz", ml: 470n },
] as const;

export type LogWateringSubmit = {
  amountLabel: string;
  amountMl: bigint;
  notes?: string;
};

export type LogWateringModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLabel?: string;
  onSubmit: (payload: LogWateringSubmit) => void;
};

export function LogWateringModal({
  open,
  onOpenChange,
  plantLabel,
  onSubmit,
}: LogWateringModalProps) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [presetIdx, setPresetIdx] = useState(1);
  const [customMl, setCustomMl] = useState("250");
  const [notes, setNotes] = useState("");

  const amountMl = useMemo(() => {
    if (mode === "custom") {
      const n = Number.parseInt(customMl.replace(/\D/g, "") || "0", 10);
      return BigInt(Number.isFinite(n) ? Math.max(n, 0) : 0);
    }
    return PRESETS[presetIdx]?.ml ?? 235n;
  }, [mode, presetIdx, customMl]);

  const amountLabel =
    mode === "custom"
      ? `${amountMl.toString()} ml`
      : (PRESETS[presetIdx]?.label ?? "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-modal-log-water" className="max-w-md gap-6">
        <DialogHeader>
          <DialogTitle>Log watering</DialogTitle>
          <DialogDescription>
            {plantLabel ??
              "Record watering amount for greenhouse provenance timelines."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p, i) => (
                <Button
                  key={p.label}
                  type="button"
                  variant={mode === "preset" && presetIdx === i ? "default" : "secondary"}
                  size="sm"
                  data-ocid={`nims-water-amt-${p.label.replace(/\s+/g, "-")}`}
                  onClick={() => {
                    setMode("preset");
                    setPresetIdx(i);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              className="w-full"
              data-ocid="nims-water-amt-custom"
              onClick={() => setMode("custom")}
            >
              Custom (ml)
            </Button>
            {mode === "custom" && (
              <Input
                inputMode="numeric"
                id="nims-water-custom-ml"
                data-ocid="nims-water-ml-field"
                value={customMl}
                onChange={(e) => setCustomMl(e.target.value)}
                placeholder="millilitres"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nims-water-notes">Notes</Label>
            <Textarea
              id="nims-water-notes"
              data-ocid="nims-water-notes"
              placeholder="Soil runoff clear, rainwater top-up…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="nims-water-submit"
            disabled={amountMl <= 0n}
            onClick={() => {
              onSubmit({
                amountLabel,
                amountMl,
                notes: notes.trim() === "" ? undefined : notes.trim(),
              });
              onOpenChange(false);
            }}
          >
            Save watering
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
