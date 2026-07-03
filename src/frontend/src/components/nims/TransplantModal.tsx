import { useEffect, useMemo, useState } from "react";

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
import {
  TRANSPLANT_SIZE_OPTIONS,
  containerSizeLabel,
  isContainerUpgrade,
} from "../../lib/container-utils";
import { ConfirmMarkDeadDialog } from "./ConfirmMarkDeadDialog";

export type TransplantSubmitPayload = {
  container_size: ContainerSize;
  location_notes?: string;
};

export type TransplantModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLabel?: string;
  currentContainer?: ContainerSize | [] | [ContainerSize];
  inventoryMode?: boolean;
  onSubmit: (payload: TransplantSubmitPayload) => void | Promise<void>;
  onMarkDead?: () => void;
  /** Delete a plant added by mistake — clears the cell back to empty. */
  onRemovePlant?: () => void;
};

export function TransplantModal({
  open,
  onOpenChange,
  plantLabel,
  currentContainer,
  inventoryMode = false,
  onSubmit,
  onMarkDead,
  onRemovePlant,
}: TransplantModalProps) {
  const current =
    currentContainer == null
      ? undefined
      : Array.isArray(currentContainer)
        ? currentContainer[0]
        : currentContainer;
  const availableOptions = useMemo(() => {
    if (!inventoryMode || !current) return TRANSPLANT_SIZE_OPTIONS;
    return TRANSPLANT_SIZE_OPTIONS.filter((row) =>
      isContainerUpgrade(current, row.size),
    );
  }, [current, inventoryMode]);

  const defaultKey =
    availableOptions[0]?.value ?? TRANSPLANT_SIZE_OPTIONS[0]?.value ?? "gal1";
  const [selected, setSelected] = useState<string>(defaultKey);
  const [otherLabel, setOtherLabel] = useState("custom container");
  const [locationNotes, setLocationNotes] = useState("");
  const [confirmDeadOpen, setConfirmDeadOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(defaultKey);
      setLocationNotes("");
    }
  }, [open, defaultKey]);

  const resolved = useMemo<ContainerSize | null>(() => {
    const row = availableOptions.find((r) => r.value === selected);
    if (selected === "other") {
      return { Other: otherLabel.trim() || "custom container" };
    }
    return row?.size ?? null;
  }, [availableOptions, selected, otherLabel]);

  return (
    <>
      <ConfirmMarkDeadDialog
        open={confirmDeadOpen}
        onOpenChange={setConfirmDeadOpen}
        onConfirm={() => {
          setConfirmDeadOpen(false);
          onOpenChange(false);
          onMarkDead?.();
        }}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-ocid="nims-modal-transplant"
          className="max-w-md gap-6"
        >
          <DialogHeader>
            <DialogTitle>
              {inventoryMode ? "Repot plant" : "Record transplant"}
            </DialogTitle>
            <DialogDescription>
              {inventoryMode
                ? `${plantLabel ?? "Plant"} — choose a larger or different container.`
                : (plantLabel ??
                  "Choose the downstream container NFT provenance inherits.")}
            </DialogDescription>
          </DialogHeader>
          {inventoryMode && current && (
            <p className="text-sm text-muted-foreground">
              Current container:{" "}
              <span className="font-medium text-foreground">
                {containerSizeLabel(currentContainer)}
              </span>
            </p>
          )}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>{inventoryMode ? "New container" : "Container"}</Label>
              {availableOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No larger containers available for this plant.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableOptions.map((r) => (
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
              )}
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
            {inventoryMode && (
              <div className="space-y-2">
                <Label htmlFor="nims-transplant-location">
                  Location notes (optional)
                </Label>
                <Input
                  id="nims-transplant-location"
                  value={locationNotes}
                  onChange={(e) => setLocationNotes(e.target.value)}
                  placeholder="Greenhouse bench B, south row…"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {onMarkDead && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  data-ocid="nims-transplant-mark-dead"
                  onClick={() => setConfirmDeadOpen(true)}
                >
                  Mark dead
                </Button>
              )}
              {onRemovePlant && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-ocid="nims-transplant-remove-plant"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onOpenChange(false);
                    onRemovePlant();
                  }}
                >
                  Added by mistake? Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                data-ocid="nims-transplant-submit"
                disabled={resolved === null || availableOptions.length === 0}
                onClick={() => {
                  if (resolved) {
                    void onSubmit({
                      container_size: resolved,
                      location_notes: locationNotes.trim() || undefined,
                    });
                  }
                  onOpenChange(false);
                }}
              >
                {inventoryMode ? "Update container" : "Save transplant"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
