import { useEffect, useState } from "react";
import { Loader2, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";

import { ConfettiBurst } from "@/components/checkout/ConfettiBurst";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  mapClaimStatusPublic,
  useCancelPlantClaimRequest,
  usePlantClaimStatus,
  useRequestPlantClaim,
} from "@/hooks/usePlantClaimRequests";
import type { PlantId } from "@/declarations/backend.did";

export function PlantClaimBanner({
  plantId,
  hasNft,
  sold,
  isOwner,
}: {
  plantId: PlantId;
  hasNft: boolean;
  sold: boolean;
  isOwner: boolean;
}) {
  const { isAuthenticated, login } = useAuth();
  const { data: rawStatus } = usePlantClaimStatus(plantId);
  const status = mapClaimStatusPublic(rawStatus);
  const requestClaim = useRequestPlantClaim();
  const cancelClaim = useCancelPlantClaimRequest();
  const [note, setNote] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  const myStatus = status?.myStatus ?? null;
  const wasApproved = myStatus === "approved" || (sold && isOwner);

  useEffect(() => {
    if (wasApproved && isOwner) {
      setShowConfetti(true);
      const t = window.setTimeout(() => setShowConfetti(false), 3200);
      return () => window.clearTimeout(t);
    }
  }, [wasApproved, isOwner]);

  if (!hasNft || (isOwner && !sold)) {
    return null;
  }

  if (sold && isOwner) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4">
        {showConfetti && <ConfettiBurst />}
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-100">
              Provenance verified on-chain
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              You own this plant&apos;s NFT and full lifecycle record.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (sold && !isOwner) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        This plant&apos;s provenance has been claimed by another grower.
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[var(--wd-citrus,#e8a838)]/40 bg-gradient-to-br from-amber-950/50 to-zinc-950 p-4"
      data-ocid="plant-claim-banner"
    >
      <div className="flex items-start gap-3">
        <Tag className="mt-0.5 size-5 shrink-0 text-[var(--wd-citrus,#e8a838)]" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-semibold">Claim this plant&apos;s provenance</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Purchased at the nursery? Request the on-chain NFT. The IC SPICY
              team confirms at checkout, then ownership transfers to your
              wallet.
            </p>
          </div>

          {myStatus === "pending" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-200">
                Claim requested — awaiting nursery confirmation
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={cancelClaim.isPending}
                onClick={() => {
                  void cancelClaim.mutateAsync(plantId).then((ok) => {
                    if (ok) toast.success("Claim request cancelled");
                  });
                }}
              >
                Cancel request
              </Button>
            </div>
          )}

          {myStatus === "rejected" && (
            <p className="text-xs text-muted-foreground">
              Your previous request was not approved. Contact the nursery if
              you completed a purchase.
            </p>
          )}

          {!myStatus && (
            <>
              {!isAuthenticated ? (
                <Button type="button" size="sm" onClick={() => login()}>
                  Sign in to claim
                </Button>
              ) : (
                <>
                  <Textarea
                    placeholder="Optional note (e.g. paid at register, pickup date)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-[72px] text-sm"
                    maxLength={280}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={requestClaim.isPending}
                    onClick={() => {
                      void requestClaim
                        .mutateAsync({
                          plantId,
                          note: note.trim() || undefined,
                        })
                        .then((res) => {
                          if (res.success) toast.success(res.message);
                          else toast.error(res.message);
                        })
                        .catch((e) => {
                          toast.error(
                            e instanceof Error ? e.message : "Request failed",
                          );
                        });
                    }}
                  >
                    {requestClaim.isPending ? (
                      <>
                        <Loader2 className="mr-1 size-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Request claim"
                    )}
                  </Button>
                </>
              )}
            </>
          )}

          {(status?.pendingCount ?? 0) > 0 && !myStatus && (
            <p className="text-[11px] text-muted-foreground">
              {status!.pendingCount} buyer
              {status!.pendingCount === 1 ? "" : "s"} waiting for confirmation
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
