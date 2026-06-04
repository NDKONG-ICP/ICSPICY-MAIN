import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";

export type TransplantedCellModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotLabel?: string;
  varietyName?: string;
  nftTokenId?: bigint;
  containerLabel?: string;
  inventoryPlantId?: bigint;
};

export function TransplantedCellModal({
  open,
  onOpenChange,
  slotLabel,
  varietyName,
  nftTokenId,
  containerLabel,
  inventoryPlantId,
}: TransplantedCellModalProps) {
  const detailId = inventoryPlantId?.toString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="nims-modal-transplanted-cell"
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Transplanted · {slotLabel ?? "Tray cell"}</DialogTitle>
          <DialogDescription>
            This cell keeps a historical record. The live plant is tracked in
            inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Plant:</span>{" "}
            <span className="font-medium">
              {varietyName ?? "Unknown variety"}
            </span>
          </p>
          {nftTokenId != null && (
            <p>
              <span className="text-muted-foreground">NFT:</span> #
              {nftTokenId.toString()}
            </p>
          )}
          {containerLabel && (
            <p>
              <span className="text-muted-foreground">Moved to:</span>{" "}
              {containerLabel}
            </p>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {detailId ? (
            <Button type="button" asChild>
              <Link
                to="/plant/$plantId"
                params={{ plantId: detailId }}
                onClick={() => onOpenChange(false)}
              >
                View in Inventory
              </Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
