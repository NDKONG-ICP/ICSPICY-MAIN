import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@dfinity/principal";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Coins, Copy, Flame, Link2, Loader2, Send, ShoppingBag, User } from "lucide-react";
import { ConnectButton } from "../components/ConnectButton";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { getNftImageUrl } from "../lib/nft-config";
import { sendTokens } from "../lib/ledger-transfer";
import { useAuth } from "../hooks/useAuth";
import { useMyNftTokenIds } from "../hooks/useMyNftIds";
import {
  formatTokenFee,
  parseTokenAmount,
  type TokenBalanceRow,
  useTokenBalances,
} from "../hooks/useTokenBalances";

function truncatePid(p: string, head = 5, tail = 5) {
  if (p.length <= head + tail + 3) return p;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

function TokenSendDialog({
  row,
  open,
  onOpenChange,
  onSuccess,
}: {
  row: TokenBalanceRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { identity } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  const feeDisplay = formatTokenFee(row.fee, row.decimals);

  function reset() {
    setRecipient("");
    setAmount("");
  }

  async function handleSend() {
    if (!identity) {
      toast.error("Sign in with Internet Identity first");
      return;
    }
    const to = recipient.trim();
    if (!to) {
      toast.error("Enter a recipient principal");
      return;
    }
    try {
      Principal.fromText(to);
    } catch {
      toast.error("Invalid principal");
      return;
    }

    let amountBase: bigint;
    try {
      amountBase = parseTokenAmount(amount, row.decimals);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid amount");
      return;
    }
    if (amountBase <= 0n) {
      toast.error("Amount must be greater than zero");
      return;
    }
    const total = amountBase + row.fee;
    if (total > row.balance) {
      toast.error("Insufficient balance (amount + fee)");
      return;
    }

    setSending(true);
    try {
      const blockIndex = await sendTokens(
        identity,
        row.canisterId,
        to,
        amountBase,
      );
      toast.success(`Sent! Block index: ${blockIndex.toString()}`);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send {row.symbol}</DialogTitle>
          <DialogDescription>
            Transfer from your Internet Identity principal. Fee is deducted in
            addition to the amount.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="send-recipient">Recipient principal</Label>
            <Input
              id="send-recipient"
              placeholder="aaaaa-aa"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono text-sm"
              disabled={sending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="send-amount">Amount ({row.symbol})</Label>
            <Input
              id="send-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              Available: {row.formattedBalance} {row.symbol}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Network fee:{" "}
            <span className="font-medium text-foreground">
              {feeDisplay} {row.symbol}
            </span>
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending}
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TokenBalanceCard({
  row,
  onSent,
}: {
  row: TokenBalanceRow;
  onSent: () => void;
}) {
  const [sendOpen, setSendOpen] = useState(false);

  return (
    <>
      <Card className="border-border bg-card">
        <CardContent className="pt-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
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
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setSendOpen(true)}
            disabled={row.balance === 0n}
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </CardContent>
      </Card>
      <TokenSendDialog
        row={row}
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSuccess={onSent}
      />
    </>
  );
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
  const queryClient = useQueryClient();
  const { data: balances, isLoading: balLoading } = useTokenBalances();

  function refreshBalances() {
    void queryClient.invalidateQueries({ queryKey: ["tokenBalances"] });
  }
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
        <div className="flex justify-center">
          <ConnectButton />
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
            Principal used for on-chain queries. Sign in with Internet Identity.
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
            <ConnectButton />
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
              <TokenBalanceCard
                key={row.symbol}
                row={row}
                onSent={refreshBalances}
              />
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
            On-chain receive history coming in a future update.
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
