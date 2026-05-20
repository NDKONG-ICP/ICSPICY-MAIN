import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PlantStage as BackendPlantStage } from "../backend";
import { StageBadge } from "./ui/StageBadge";
import { useAuth } from "../hooks/useAuth";
import { useICPay } from "../hooks/useICPay";
import {
  centsToStablecoinBase,
  formatCents,
  nftImageUrl,
  unwrapOpt,
  usePlantLifecycle,
  usePurchasePlant,
  usePurchasePlantICPay,
} from "../hooks/useNims";

type StableToken = "ckUSDC" | "ckUSDT";

export function PlantCheckoutPanel({ plantId }: { plantId: bigint }) {
  const { data: lc, isLoading } = usePlantLifecycle(plantId);
  const purchase = usePurchasePlant();
  const purchaseICPay = usePurchasePlantICPay();
  const icpay = useICPay({
    onSuccess: async (paymentId) => {
      try {
        const result = await purchaseICPay.mutateAsync({ plantId, paymentId });
        if (result.success) {
          setClaimToken(
            result.claimToken && result.claimToken.length > 0
              ? (result.claimToken[0] ?? null)
              : null,
          );
          setDone(true);
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ICPay settlement failed");
      }
    },
    onError: (msg) => toast.error(msg),
  });
  const { isAuthenticated, login } = useAuth();
  const [token, setToken] = useState<StableToken>("ckUSDC");
  const [done, setDone] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);

  const priceCents = useMemo(() => {
    if (!lc) return 0n;
    return unwrapOpt(lc.priceCents) ?? 2500n;
  }, [lc]);

  const stableAmount = centsToStablecoinBase(priceCents);

  if (isLoading) return <p className="text-muted-foreground">Loading plant…</p>;
  if (!lc) return <p>Plant not available.</p>;
  if (done) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
        <h2 className="text-2xl font-bold">Plant Purchased!</h2>
        <p className="text-muted-foreground">
          NFT #{unwrapOpt(lc.nftTokenId)?.toString()} is in your wallet.
        </p>
        {claimToken && (
          <p className="text-sm break-all bg-muted p-3 rounded">
            Pickup QR claim: {claimToken}
          </p>
        )}
        <Link to="/nims">
          <Button>View in NIMS</Button>
        </Link>
      </div>
    );
  }

  const plant = lc.plant;
  const tokenId = unwrapOpt(lc.nftTokenId);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="rounded-xl border border-border overflow-hidden">
        <img
          src={nftImageUrl(tokenId)}
          alt={plant.variety}
          className="w-full aspect-video object-cover"
        />
        <div className="p-4 space-y-2">
          <h2 className="text-xl font-bold">{plant.variety}</h2>
          <StageBadge stage={plant.stage as unknown as BackendPlantStage} />
          <p className="text-2xl font-bold text-primary">{formatCents(priceCents)}</p>
          {tokenId !== undefined && (
            <Badge variant="secondary">IC SPICY #{tokenId.toString()}</Badge>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Local pickup — Port Charlotte, FL
          </p>
        </div>
      </div>

      {!isAuthenticated ? (
        <Button className="w-full" onClick={() => login()}>
          Sign in to purchase
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Pay with stablecoin</Label>
            <div className="flex gap-2">
              {(["ckUSDC", "ckUSDT"] as const).map((t) => (
                <Button
                  key={t}
                  variant={token === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setToken(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Exact amount: {(Number(stableAmount) / 1_000_000).toFixed(2)} {token}
            </p>
            <p className="text-xs text-amber-500/80">
              ICP / ckBTC / ckETH — coming soon (price feed integration in progress)
            </p>
          </div>

          <Button
            className="w-full"
            disabled={purchase.isPending}
            onClick={async () => {
              try {
                const paymentToken =
                  token === "ckUSDC"
                    ? ({ ckUSDC: null } as const)
                    : ({ ckUSDT: null } as const);
                const result = await purchase.mutateAsync({
                  plantId,
                  token: paymentToken,
                  amount: stableAmount,
                });
                if (result.success) {
                  setClaimToken(
                    result.claimToken && result.claimToken.length > 0
                      ? (result.claimToken[0] ?? null)
                      : null,
                  );
                  setDone(true);
                  toast.success(result.message);
                } else {
                  toast.error(result.message);
                }
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Payment failed");
              }
            }}
          >
            {purchase.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Pay with {token}
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            disabled={
              icpay.status === "paying" ||
              icpay.status === "confirming" ||
              purchaseICPay.isPending
            }
            onClick={async () => {
              await icpay.payUsd(Number(priceCents) / 100, {
                plantId: plantId.toString(),
              });
            }}
          >
            Pay with ICPay
          </Button>
        </>
      )}
    </div>
  );
}
