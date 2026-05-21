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

export type GerminationSubmit = {
  /** ISO yyyy-mm-dd (local picker) — Motoko ingestion converts upstream */
  dateIso: string;
  notes?: string;
};

export type GerminationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotLabel?: string;
  plantName?: string;
  defaultDateIso?: string;
  onSubmit: (payload: GerminationSubmit) => void;
  onMarkDead?: () => void;
};

export function GerminationModal({
  open,
  onOpenChange,
  slotLabel,
  plantName,
  defaultDateIso,
  onSubmit,
  onMarkDead,
}: GerminationModalProps) {
  const isoToday = () => new Date().toISOString().slice(0, 10);
  const [dateIso, setDateIso] = useState(defaultDateIso ?? isoToday());
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-modal-germination" className="max-w-md gap-6">
        <DialogHeader>
          <DialogTitle>Confirm germination</DialogTitle>
          <DialogDescription>
            {plantName ?? "Seedling emergence"} • {slotLabel ?? "Tray slot"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nims-germ-date">Observation date</Label>
            <Input
              id="nims-germ-date"
              data-ocid="nims-germ-date"
              type="date"
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nims-germ-notes">Notes</Label>
            <Textarea
              id="nims-germ-notes"
              data-ocid="nims-germ-notes"
              placeholder="% germ, tray zone, damping-off watch…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {onMarkDead ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-ocid="nims-germ-mark-dead"
              onClick={() => {
                onOpenChange(false);
                onMarkDead();
              }}
            >
              Mark dead instead
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
              data-ocid="nims-germ-submit"
              disabled={dateIso.trim() === ""}
              onClick={() => {
                onSubmit({
                  dateIso,
                  notes: notes.trim() === "" ? undefined : notes.trim(),
                });
                onOpenChange(false);
              }}
            >
              Mark germinated
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
