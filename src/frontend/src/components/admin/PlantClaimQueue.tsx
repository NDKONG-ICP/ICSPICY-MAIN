import { Link } from "@tanstack/react-router";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminApproveClaimRequest,
  useAdminClaimRequests,
  useAdminRejectClaimRequest,
} from "@/hooks/usePlantClaimRequests";
import { usePlantLifecycle } from "@/hooks/useNims";
import type { PlantClaimRequestPublic } from "@/declarations/backend.did";

function ClaimRequestRow({ req }: { req: PlantClaimRequestPublic }) {
  const { data: lc, isLoading } = usePlantLifecycle(req.plantId);
  const approve = useAdminApproveClaimRequest();
  const reject = useAdminRejectClaimRequest();
  const note = req.note[0];
  const variety = lc?.plant.variety ?? `Plant #${req.plantId.toString()}`;

  return (
    <li className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            to="/plant/$plantId"
            params={{ plantId: req.plantId.toString() }}
            className="font-medium text-primary hover:underline"
          >
            {isLoading ? "…" : variety}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">
            NFT #{req.nftTokenId.toString()} · requested{" "}
            {new Date(Number(req.requestedAt / 1_000_000n)).toLocaleString()}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground break-all mt-1">
            {req.requester.toText()}
          </p>
          {note && (
            <p className="mt-2 text-xs italic text-muted-foreground">
              &ldquo;{note}&rdquo;
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={reject.isPending || approve.isPending}
            onClick={() => {
              void reject
                .mutateAsync({
                  plantId: req.plantId,
                  requester: req.requester,
                })
                .then((ok) => {
                  if (ok) toast.success("Request rejected");
                });
            }}
          >
            <X className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={reject.isPending || approve.isPending}
            onClick={() => {
              void approve
                .mutateAsync({
                  plantId: req.plantId,
                  requester: req.requester,
                })
                .then((res) => {
                  if (res.success) toast.success(res.message);
                  else toast.error(res.message);
                });
            }}
          >
            {approve.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-1 size-4" />
                Approve
              </>
            )}
          </Button>
        </div>
      </div>
    </li>
  );
}

export function PlantClaimQueue() {
  const { data: requests = [], isLoading, refetch, isFetching } =
    useAdminClaimRequests("pending");

  return (
    <Card data-ocid="admin-claim-queue">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Pending provenance claims</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending claim requests. Customers tap NFC tags and request
            provenance after purchase.
          </p>
        ) : (
          <ul className="space-y-3">
            {requests.map((req) => (
              <ClaimRequestRow key={`${req.plantId}-${req.requester.toText()}`} req={req} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
