import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
          <DialogTitle>Remove plant?</DialogTitle>
          <DialogDescription>
            {plantLabel
              ? `Remove ${plantLabel} from inventory? The NFT will be returned to the pool.`
              : "Remove this plant from inventory? The NFT will be returned to the pool."}
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
            {isPending ? "Removing…" : "Remove plant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
