import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function HarvestSeedsModal({
  open,
  onOpenChange,
  plantLabel,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLabel?: string;
  isPending?: boolean;
  onSubmit: (payload: {
    quantity?: bigint;
    notes?: string;
  }) => void | Promise<void>;
}) {
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🌰 Harvest seeds</DialogTitle>
          {plantLabel && (
            <p className="text-sm text-muted-foreground">{plantLabel}</p>
          )}
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="harvest-qty">Quantity (optional)</Label>
            <Input
              id="harvest-qty"
              inputMode="numeric"
              placeholder="e.g. 50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="harvest-notes">Notes</Label>
            <Textarea
              id="harvest-notes"
              placeholder="Drying method, storage location…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              void onSubmit({
                quantity: quantity ? BigInt(quantity) : undefined,
                notes: notes.trim() || undefined,
              });
            }}
          >
            {isPending ? "Saving…" : "Save to Seed Bank"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
