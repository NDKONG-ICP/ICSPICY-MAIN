import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type RemovePlantModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLabel?: string;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function RemovePlantModal({
  open,
  onOpenChange,
  plantLabel,
  isPending,
  onConfirm,
}: RemovePlantModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-modal-remove-plant" className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {plantLabel ?? "plant"}?</DialogTitle>
          <DialogDescription>
            This removes the plant and all its lifecycle data (watering,
            feeding, photos, notes). This cannot be undone. If an NFT is
            assigned, it is returned to the pool — not burned. Any tray cell it
            occupies is cleared.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => void onConfirm()}
          >
            {isPending ? "Deleting…" : "Delete plant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
