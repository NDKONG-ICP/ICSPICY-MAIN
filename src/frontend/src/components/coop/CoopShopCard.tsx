import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Sprout } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  TokenPaymentPanel,
  useTokenPaymentState,
} from "@/components/TokenPaymentPanel";
import { useAuth } from "@/hooks/useAuth";
import { usePurchaseCoopSeatDirect } from "@/hooks/useBackend";
import {
  useCoopSeatPrice,
  useCoopSeatsRemaining,
} from "@/hooks/useCoopStatus";
import { useTokenPrices } from "@/hooks/useTokenPrices";

const BENEFITS = [
  "Pro NIMS — mint unlimited grower provenance NFTs",
  "QR customer claim handoff for your plants",
  "Public listing on the Grower Directory",
  "Create grower proposals in the DAO",
  "RAVEN Pro analytics & CSV export (included)",
] as const;

export function CoopShopCard() {
  const { isAuthenticated, login } = useAuth();
  const purchase = usePurchaseCoopSeatDirect();
  const { data: seats } = useCoopSeatsRemaining();
  const { data: priceCents } = useCoopSeatPrice();
  const [payingToken, setPayingToken] = useTokenPaymentState();
  const { dataUpdatedAt } = useTokenPrices();
  const [purchasedId, setPurchasedId] = useState<bigint | null>(null);

  const available = seats?.available ?? 0;
  const total = seats?.total ?? 88;
  const usdCents = priceCents ?? 25_000n;

  if (purchasedId != null) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="pt-6 text-center space-y-2">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="font-display font-bold">Founding Grower seat #{purchasedId.toString()} is yours!</p>
          <p className="text-sm text-muted-foreground">
            Complete your grower profile in NIMS to appear in the directory.
          </p>
          <Button asChild className="mt-2">
            <Link to="/nims">Set up your grower profile →</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-background"
      data-ocid="coop-membership-card"
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sprout className="h-6 w-6 text-emerald-400" />
          <CardTitle className="font-display">🌱 Grower Co-op — Founding Seat</CardTitle>
          <Badge className="ml-auto border-emerald-700/50 bg-emerald-900/40 text-emerald-200">
            ${(Number(usdCents) / 100).toFixed(0)} USD
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {available} of {total} founding seats remaining
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {BENEFITS.map((b) => (
            <li key={b}>✓ {b}</li>
          ))}
        </ul>
        {available === 0 ? (
          <p className="text-sm text-amber-400">All founding seats are sold or reserved.</p>
        ) : isAuthenticated ? (
          <TokenPaymentPanel
            usdCents={usdCents}
            payingToken={payingToken}
            setPayingToken={setPayingToken}
            onPay={async ({ ledgerCanisterId, amount }) => {
              const result = await purchase.mutateAsync({ ledgerCanisterId, amount });
              if (result.tokenId?.[0] != null) {
                setPurchasedId(result.tokenId[0]);
              }
              toast.success("Welcome to the Grower Co-op!");
            }}
            dataOcid="coop-seat-payment"
          />
        ) : (
          <Button onClick={() => login()} className="w-full">
            Sign in to become a Founding Grower
          </Button>
        )}
        {dataUpdatedAt ? (
          <p className="text-[10px] text-muted-foreground">
            Prices updated {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        ) : null}
        <Button variant="link" className="h-auto p-0 text-emerald-400" asChild>
          <Link to="/growers">View the Grower Directory →</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
