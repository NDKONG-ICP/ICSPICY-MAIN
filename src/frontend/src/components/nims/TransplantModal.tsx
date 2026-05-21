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
import type { ContainerSize } from "../../declarations/backend.did";

const SIZE_ROWS: ReadonlyArray<{
  label: string;
  value: string;
  size: ContainerSize;
}> = [
    { label: "1 gallon", value: "gal1", size: { Gal1: null } },
    { label: "3 gallon", value: "gal3", size: { Gal3: null } },
    { label: "5 gallon", value: "gal5", size: { Gal5: null } },
    { label: "4″ liner", value: "pot4", size: { Pot4Inch: null } },
    { label: "6″ liner", value: "pot6", size: { Pot6Inch: null } },
    { label: "7 gal grow bag", value: "bag7", size: { Gal7GrowBag: null } },
    { label: "10 gal grow bag", value: "bag10", size: { Gal10GrowBag: null } },
    { label: "15 gal grow bag", value: "bag15", size: { Gal15GrowBag: null } },
    { label: "In ground bed", value: "ground", size: { InGround: null } },
  ];

export type TransplantSubmitPayload = {
  container_size: ContainerSize;
};

export type TransplantModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLabel?: string;
  onSubmit: (payload: TransplantSubmitPayload) => void;
  onMarkDead?: () => void;
};

export function TransplantModal({
  open,
  onOpenChange,
  plantLabel,
  onSubmit,
  onMarkDead,
}: TransplantModalProps) {
  const defaultKey = SIZE_ROWS[0]?.value ?? "gal1";
  const [selected, setSelected] = useState<string>(defaultKey);
  const [otherLabel, setOtherLabel] = useState("custom container");

  const resolved = useMemo<ContainerSize | null>(() => {
    const row = SIZE_ROWS.find((r) => r.value === selected);
    if (selected === "other") {
      return { Other: otherLabel.trim() || "custom container" };
    }
    return row?.size ?? null;
  }, [selected, otherLabel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-modal-transplant" className="max-w-md gap-6">
        <DialogHeader>
          <DialogTitle>Record transplant</DialogTitle>
          <DialogDescription>
            {plantLabel ?? "Choose the downstream container NFT provenance inherits."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Container</Label>
            <div className="grid grid-cols-2 gap-2">
              {SIZE_ROWS.map((r) => (
                <Button
                  key={r.value}
                  size="sm"
                  type="button"
                  variant={selected === r.value ? "default" : "outline"}
                  data-ocid={`nims-transplant-${r.value}`}
                  className="h-auto whitespace-normal px-3 py-2 text-xs"
                  onClick={() => setSelected(r.value)}
                >
                  {r.label}
                </Button>
              ))}
              <Button
                size="sm"
                type="button"
                variant={selected === "other" ? "default" : "outline"}
                data-ocid="nims-transplant-other"
                className="h-auto text-xs"
                onClick={() => setSelected("other")}
              >
                Other
              </Button>
            </div>
          </div>
          {selected === "other" && (
            <div className="space-y-2">
              <Label htmlFor="nims-transplant-other-txt">Custom label</Label>
              <Input
                id="nims-transplant-other-txt"
                data-ocid="nims-transplant-custom-label"
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {onMarkDead ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-ocid="nims-transplant-mark-dead"
              onClick={() => {
                onOpenChange(false);
                onMarkDead();
              }}
            >
              Mark dead
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              data-ocid="nims-transplant-submit"
              disabled={resolved === null}
              onClick={() => {
                if (resolved) {
                  onSubmit({ container_size: resolved });
                }
                onOpenChange(false);
              }}
            >
              Save transplant
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
