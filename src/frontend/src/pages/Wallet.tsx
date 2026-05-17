import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { Coins, Copy, Flame, Link2, ShoppingBag, User } from "lucide-react";
import { ConnectWallet } from "@nfid/identitykit/react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { getNftImageUrl } from "../lib/nft-config";
import { useAuth } from "../hooks/useAuth";
import { useMyNftTokenIds } from "../hooks/useMyNftIds";
import { useTokenBalances } from "../hooks/useTokenBalances";

function truncatePid(p: string, head = 5, tail = 5) {
  if (p.length <= head + tail + 3) return p;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

function TokenCircle({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${className ?? "bg-muted text-foreground"}`}
    >
      {label}
    </span>
  );
}

export default function WalletPage() {
  const { isAuthenticated, isInitializing, principal } = useAuth();
  const { data: balances, isLoading: balLoading } = useTokenBalances();
  const { data: tokenIds, isLoading: nftsLoading } = useMyNftTokenIds();
  const [copied, setCopied] = useState(false);

  const pidText = principal?.toText() ?? "";

  const nftCards = useMemo(() => {
    if (!tokenIds?.length) return [];
    return tokenIds.slice(0, 48).map((id) => ({
      id,
    }));
  }, [tokenIds]);

  function copyPrincipal() {
    if (!pidText) return;
    void navigator.clipboard.writeText(pidText).then(() => {
      setCopied(true);
      toast.success("Principal copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!isInitializing && !isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-6 px-4">
        <Flame className="h-14 w-14 mx-auto text-primary opacity-90" />
        <h1 className="font-display text-3xl font-bold text-foreground">
          My Wallet
        </h1>
        <p className="text-muted-foreground">
          Connect your wallet to view token balances and NFTs on the Internet
          Computer.
        </p>
        <div className="flex justify-center [&_button]:px-6">
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 pb-16" data-ocid="wallet-page">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
          <Coins className="h-8 w-8 text-primary" />
          My Wallet
        </h1>
        <p className="text-muted-foreground text-sm">
          Balances are read from ICRC-1 ledgers. NFTs are loaded from the IC SPICY
          collection.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Connected
          </CardTitle>
          <CardDescription>
            Principal used for on-chain queries. Use IdentityKit to disconnect or
            switch wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isInitializing || !pidText ? (
            <Skeleton className="h-10 w-full max-w-xl" />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <code className="text-xs sm:text-sm font-mono bg-muted/50 rounded-md px-3 py-2 break-all max-w-full">
                {pidText}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyPrincipal}
                className="shrink-0"
              >
                {copied ? <Flame className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? " Copied" : " Copy"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {truncatePid(pidText)}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <ConnectWallet />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display text-xl font-semibold mb-4 text-foreground">
          Token balances
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {balLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          {!balLoading &&
            balances?.map((row) => (
              <Card key={row.symbol} className="border-border bg-card">
                <CardContent className="pt-6 flex items-start gap-4">
                  <TokenCircle
                    label={row.symbol.slice(0, 3)}
                    className={
                      row.symbol === "ICP"
                        ? "bg-amber-500/20 text-amber-300"
                        : row.symbol.startsWith("ck")
                          ? "bg-sky-500/20 text-sky-300"
                          : "bg-emerald-500/20 text-emerald-300"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {row.symbol}
                    </p>
                    <p className="font-display text-2xl font-bold text-foreground tabular-nums">
                      {row.formattedBalance}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {row.canisterId}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          <Flame className="h-6 w-6 text-red-500" />
          My NFTs
        </h2>
        {nftsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : nftCards.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No IC SPICY NFTs at this principal yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {nftCards.map(({ id }) => (
              <Link
                key={id.toString()}
                to="/nft/$tokenId"
                params={{ tokenId: id.toString() }}
                className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors"
              >
                <div className="aspect-square bg-muted relative">
                  <img
                    src={getNftImageUrl(id)}
                    alt={`IC SPICY #${id}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-2 text-center">
                  <span className="text-sm font-medium text-foreground">
                    #{id.toString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Card className="border-dashed border-border bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Transaction history</CardTitle>
          <CardDescription>
            Phase 5.5 — detailed history and send/receive flows coming soon.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/orders" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            My orders
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/profile" className="gap-2">
            <Link2 className="h-4 w-4" />
            Profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
