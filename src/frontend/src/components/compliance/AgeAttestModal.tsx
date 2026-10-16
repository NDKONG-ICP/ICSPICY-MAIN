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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm13Plus: () => void;
  onUnder13: () => void;
  blockedView: boolean;
};

export function AgeAttestModal({
  open,
  onOpenChange,
  onConfirm13Plus,
  onUnder13,
  blockedView,
}: Props) {
  if (blockedView) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" aria-describedby="age-block-desc">
          <DialogHeader>
            <DialogTitle>We cannot create an account for you yet</DialogTitle>
            <DialogDescription id="age-block-desc">
              IC SPICY is not directed at children under 13. We do not allow
              account creation, wallet connection, or personal data collection
              for users who are under 13 years old. If you reached this screen
              by mistake, you may close this window.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="age-gate-desc">
        <DialogHeader>
          <DialogTitle>Age confirmation</DialogTitle>
          <DialogDescription id="age-gate-desc">
            You must be at least 13 years old to connect a wallet, sign in, join
            our newsletter, or use SpicyAI on IC SPICY. See our{" "}
            <Link to="/privacy" className="underline text-primary">
              Privacy Policy
            </Link>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button type="button" className="w-full" onClick={onConfirm13Plus}>
            I am 13 years of age or older
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onUnder13}>
            I am under 13
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
