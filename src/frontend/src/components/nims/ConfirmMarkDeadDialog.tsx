import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmMarkDeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

/** Lightweight guard before opening the full MarkDeadModal from tray workflows. */
export function ConfirmMarkDeadDialog({
  open,
  onOpenChange,
  onConfirm,
}: ConfirmMarkDeadDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-ocid="nims-confirm-mark-dead">
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this plant dead?</AlertDialogTitle>
          <AlertDialogDescription>
            The plant moves to your Graveyard with its full provenance, weather
            history, and PepperHead memorial preserved forever. The NFT is
            retired with this plant — not deleted and not returned to the pool.
            Admin revive is the only undo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
