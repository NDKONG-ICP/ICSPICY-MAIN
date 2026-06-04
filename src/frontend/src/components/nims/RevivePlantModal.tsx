import { useState } from "react";

import { Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type RevivePlantModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLabel?: string;
  nftMayBeLost?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
};

export function RevivePlantModal({
  open,
  onOpenChange,
  plantLabel,
  nftMayBeLost = false,
  isPending = false,
  onConfirm,
}: RevivePlantModalProps) {
  const [ack, setAck] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setAck(false);
        onOpenChange(next);
      }}
    >
      <DialogContent
        data-ocid="nims-modal-revive-plant"
        className="max-w-md gap-6"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <Sprout className="size-5" aria-hidden />
            Revive plant
          </DialogTitle>
          <DialogDescription>
            {plantLabel ?? "This plant"} will be restored to active growing
            status.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-sm text-muted-foreground">
          <p>
            This will restore the plant record and remove the death log entry.
          </p>
          {nftMayBeLost && (
            <p className="text-amber-400/90">
              If the NFT was burned on death, it cannot be recovered
              automatically. The plant record can still be revived.
            </p>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-foreground">
            <input
              type="checkbox"
              data-ocid="nims-revive-ack"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I understand and want to revive this plant.
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            data-ocid="nims-revive-submit"
            disabled={!ack || isPending}
            onClick={() => {
              onConfirm();
              setAck(false);
            }}
          >
            {isPending ? "Reviving…" : "Revive plant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
