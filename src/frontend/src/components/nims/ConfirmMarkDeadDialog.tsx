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
            This records a permanent loss for the cell. You will confirm details
            on the next screen. This cannot be undone without an admin revive.
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
