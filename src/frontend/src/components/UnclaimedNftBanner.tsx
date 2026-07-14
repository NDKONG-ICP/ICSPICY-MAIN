import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Gift, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getPendingClaims,
  type PendingClaimRecord,
} from "../lib/pending-claim-storage";

export function UnclaimedNftBanner() {
  const [pending, setPending] = useState<PendingClaimRecord[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPending(getPendingClaims());
  }, []);

  if (dismissed || pending.length === 0) return null;

  const first = pending[0];
  const claimToken = first.claimTokens[0];

  return (
    <div
      className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 mb-6"
      data-ocid="unclaimed-nft-banner"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Gift className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            You have an unclaimed NFT!
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Order #{first.orderId} — connect your wallet and claim your IC SPICY
            membership NFT.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" asChild>
          {claimToken != null ? (
            <Link
              to="/claim/$claimToken"
              params={{ claimToken }}
            >
              Claim now
            </Link>
          ) : (
            <Link to="/checkout">Finish claim</Link>
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
