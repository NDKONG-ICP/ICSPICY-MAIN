import { useState } from "react";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type MarkDeadSubmit = {
  reason?: string;
};

export type MarkDeadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLabel?: string;
  onConfirm: (payload: MarkDeadSubmit) => void;
};

export function MarkDeadModal({
  open,
  onOpenChange,
  plantLabel,
  onConfirm,
}: MarkDeadModalProps) {
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-modal-mark-dead" className="max-w-md gap-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" aria-hidden />
            Mark tray loss
          </DialogTitle>
          <DialogDescription>
            {plantLabel ?? "Recording loss"} freezes provenance permanently for this
            cell.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
          <p>Use only after physical confirmation.</p>
          <label className="flex cursor-pointer items-center gap-2 text-foreground">
            <input
              type="checkbox"
              data-ocid="nims-dead-ack"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            Verified plant is discarded.
          </label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nims-dead-notes">Incident notes</Label>
          <Textarea
            id="nims-dead-notes"
            data-ocid="nims-dead-notes"
            placeholder="Damping-off, heat dome failure, fungal collapse…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-ocid="nims-dead-submit"
            disabled={!ack}
            onClick={() => {
              onConfirm({
                reason: reason.trim() === "" ? undefined : reason.trim(),
              });
              onOpenChange(false);
            }}
          >
            Confirm loss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
