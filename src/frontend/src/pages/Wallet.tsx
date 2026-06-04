import { Badge } from "@/components/ui/badge";
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
import {
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Flame,
  Link2,
  Loader2,
  Send,
  Shield,
  ShoppingBag,
  Unlink,
  User,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConnectButton } from "../components/ConnectButton";
import { OisyConnectButton } from "../components/OisyConnectButton";
import { useAuth } from "../hooks/useAuth";
import {
  useIsAdmin,
  useLinkedWallets,
  useLinkWallet,
  useUnlinkWallet,
} from "../hooks/useBackend";
import { useNftDiscount } from "../hooks/useNftDiscount";
import { useMyNftTokenIds, useNftTokenIdsForPrincipal } from "../hooks/useMyNftIds";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  type TokenBalanceRow,
  formatTokenFee,
  parseTokenAmount,
  useTokenBalances,
  useTokenBalancesForPrincipal,
} from "../hooks/useTokenBalances";
import { BACKEND_CANISTER_ID } from "../lib/auth-config";
import { sendTokens } from "../lib/ledger-transfer";
import { getNftImageUrl } from "../lib/nft-config";
import { transferNft } from "../lib/nft-transfer";
import { useOisyWallet } from "../providers/OisyWalletProvider";
import {
  RAVEN_MEMBER_THRESHOLD_UNITS,
  RAVEN_PRO_THRESHOLD_UNITS,
  useRavenPerks,
  type RavenTier,
} from "../hooks/useRavenPerks";

// ─── Types ────────────────────────────────────────────────────────────────────

function truncatePid(p: string, head = 6, tail = 5) {
  if (p.length <= head + tail + 3) return p;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

// ─── Token send dialog ────────────────────────────────────────────────────────

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
      const blockIndex = await sendTokens(identity, row.canisterId, to, amountBase);
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send {row.symbol}</DialogTitle>
          <DialogDescription>
            Transfer from your Internet Identity principal. Fee is deducted in addition to the amount.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="send-recipient">Recipient principal</Label>
            <Input id="send-recipient" placeholder="aaaaa-aa" value={recipient}
              onChange={(e) => setRecipient(e.target.value)} className="font-mono text-sm" disabled={sending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="send-amount">Amount ({row.symbol})</Label>
            <Input id="send-amount" type="text" inputMode="decimal" placeholder="0.00"
              value={amount} onChange={(e) => setAmount(e.target.value)} disabled={sending} />
            <p className="text-xs text-muted-foreground">Available: {row.formattedBalance} {row.symbol}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Network fee: <span className="font-medium text-foreground">{feeDisplay} {row.symbol}</span>
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button type="button" onClick={() => void handleSend()} disabled={sending} className="bg-red-600 hover:bg-red-700 text-white gap-2">
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : <><Send className="h-4 w-4" />Send</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Token balance card ────────────────────────────────────────────────────────

function TokenCircle({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${className ?? "bg-muted text-foreground"}`}>
      {label}
    </span>
  );
}

function TokenBalanceCard({ row, onSent }: { row: TokenBalanceRow; onSent: () => void }) {
  const [sendOpen, setSendOpen] = useState(false);
  return (
    <>
      <Card className="border-border bg-card">
        <CardContent className="pt-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <TokenCircle
              label={row.symbol.slice(0, 3)}
              className={row.symbol === "ICP" ? "bg-amber-500/20 text-amber-300" : row.symbol.startsWith("ck") ? "bg-sky-500/20 text-sky-300" : "bg-emerald-500/20 text-emerald-300"}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">{row.symbol}</p>
              <p className="font-display text-2xl font-bold text-foreground tabular-nums">{row.formattedBalance}</p>
              <p className="text-[11px] text-muted-foreground font-mono truncate">{row.canisterId}</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full gap-2"
            onClick={() => setSendOpen(true)} disabled={row.balance === 0n}>
            <Send className="h-4 w-4" />Send
          </Button>
        </CardContent>
      </Card>
      <TokenSendDialog row={row} open={sendOpen} onOpenChange={setSendOpen} onSuccess={onSent} />
    </>
  );
}

// ─── NFT transfer dialog ──────────────────────────────────────────────────────

function NftTransferDialog({
  tokenId, open, onOpenChange, onSuccess, defaultRecipient,
  title = "Transfer NFT", description = "This will transfer ownership of this NFT permanently.", confirmLabel = "Transfer",
}: {
  tokenId: bigint; open: boolean; onOpenChange: (open: boolean) => void;
  onSuccess: () => void; defaultRecipient?: string;
  title?: string; description?: string; confirmLabel?: string;
}) {
  const { identity } = useAuth();
  const [recipient, setRecipient] = useState(defaultRecipient ?? "");
  const [sending, setSending] = useState(false);

  async function handleTransfer() {
    if (!identity) { toast.error("Sign in with Internet Identity first"); return; }
    const to = recipient.trim();
    if (!to) { toast.error("Enter a recipient principal"); return; }
    try { Principal.fromText(to); } catch { toast.error("Invalid principal"); return; }
    setSending(true);
    try {
      await transferNft(identity, tokenId, to);
      toast.success("NFT transferred");
      onOpenChange(false);
      setRecipient(defaultRecipient ?? "");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "NFT transfer failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setRecipient(defaultRecipient ?? ""); onOpenChange(v); }}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 items-center">
          <img src={getNftImageUrl(tokenId)} alt={`IC SPICY #${tokenId}`}
            className="h-16 w-16 rounded-md object-cover border border-border" />
          <div>
            <p className="font-medium">IC SPICY #{tokenId.toString()}</p>
            <p className="text-xs text-muted-foreground">Warning: permanent on-chain transfer</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nft-transfer-recipient">Recipient principal</Label>
          <Input id="nft-transfer-recipient" placeholder="aaaaa-aa" value={recipient}
            onChange={(e) => setRecipient(e.target.value)} className="font-mono text-sm" disabled={sending} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button type="button" onClick={() => void handleTransfer()} disabled={sending} className="gap-2">
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Transferring…</> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── NFT card ─────────────────────────────────────────────────────────────────

function WalletNftCard({
  tokenId, isAdmin, onTransferred, walletBadge,
}: {
  tokenId: bigint; isAdmin: boolean; onTransferred: () => void; walletBadge?: "II" | "OISY";
}) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Link to="/nft/$tokenId" params={{ tokenId: tokenId.toString() }} className="group block relative">
          <div className="aspect-square bg-muted relative">
            <img src={getNftImageUrl(tokenId)} alt={`IC SPICY #${tokenId}`}
              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" loading="lazy" />
          </div>
          {walletBadge && (
            <div className="absolute top-1.5 left-1.5">
              <Badge className={`text-[9px] px-1.5 py-0 h-4 ${walletBadge === "OISY" ? "bg-orange-500/90 text-white" : "bg-blue-600/90 text-white"}`}>
                {walletBadge === "OISY" ? "OISY" : "II"}
              </Badge>
            </div>
          )}
          <div className="p-2 text-center">
            <span className="text-sm font-medium text-foreground">#{tokenId.toString()}</span>
          </div>
        </Link>
        <div className="px-2 pb-2 flex flex-col gap-1">
          <Button type="button" size="sm" variant="outline" className="w-full text-xs"
            onClick={() => setTransferOpen(true)}>Transfer</Button>
          {isAdmin && (
            <Button type="button" size="sm" variant="secondary" className="w-full text-xs"
              onClick={() => setReturnOpen(true)}>Return to pool</Button>
          )}
        </div>
      </div>
      <NftTransferDialog tokenId={tokenId} open={transferOpen} onOpenChange={setTransferOpen} onSuccess={onTransferred} />
      <NftTransferDialog tokenId={tokenId} open={returnOpen} onOpenChange={setReturnOpen} onSuccess={onTransferred}
        defaultRecipient={BACKEND_CANISTER_ID} title="Return NFT to canister pool"
        description="Admin only — returns this NFT to the IC SPICY backend canister for reassignment."
        confirmLabel="Send to canister" />
    </>
  );
}

// ─── Membership status card ───────────────────────────────────────────────────

// ─── Raven Tier Card ──────────────────────────────────────────────────────────

const TIER_LABELS: Record<RavenTier, string> = {
  free: "Free",
  member: "🐦‍⬛ Raven Member",
  pro: "🐦‍⬛ Raven Pro",
};

function RavenTierCard() {
  const ravenPerks = useRavenPerks();

  if (ravenPerks.isLoading) {
    return <Skeleton className="h-36 rounded-xl" />;
  }

  const { tier, totalUnits } = ravenPerks;
  const isUpgraded = tier !== "free";

  const nextTier: RavenTier | null = tier === "free" ? "member" : tier === "member" ? "pro" : null;
  const nextThreshold = tier === "free" ? RAVEN_MEMBER_THRESHOLD_UNITS : RAVEN_PRO_THRESHOLD_UNITS;
  const ravenForNext = nextTier ? (nextThreshold > totalUnits ? nextThreshold - totalUnits : 0n) : 0n;
  const progressPct = nextTier
    ? Math.min(100, Number((totalUnits * 100n) / nextThreshold))
    : 100;

  return (
    <Card className={`border-border bg-card ${isUpgraded ? "border-indigo-500/30 bg-indigo-900/10" : ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">🐦‍⬛</span>
          RAVEN Tier
          <Badge
            className={
              tier === "pro"
                ? "ml-auto bg-purple-600/20 text-purple-300 border-purple-500/30"
                : tier === "member"
                  ? "ml-auto bg-blue-600/20 text-blue-300 border-blue-500/30"
                  : "ml-auto bg-muted/40 text-muted-foreground border-border"
            }
          >
            {TIER_LABELS[tier]}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {totalUnits.toLocaleString()} RAVEN held
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isUpgraded && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
              🛍️ 5% shop discount
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
              📊 Advanced NIMS analytics
            </span>
            {tier === "pro" && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                ✨ AI Garden Generation
              </span>
            )}
          </div>
        )}
        {nextTier && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{TIER_LABELS[nextTier]}</span>
              <span>{ravenForNext > 0n ? `${ravenForNext.toLocaleString()} RAVEN to go` : "Unlocked!"}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
        {!isUpgraded && (
          <a
            href="https://app.icpswap.com/swap?input=ryjl3-tyaaa-aaaaa-aaaba-cai&output=4k7jk-vyaaa-aaaam-qcyaa-cai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
          >
            Get $RAVEN on ICPSwap →
          </a>
        )}
        <a
          href="/tiers"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          View all tier benefits
        </a>
      </CardContent>
    </Card>
  );
}

function MembershipCard({ hasNft, discountPercent, rarity }: { hasNft: boolean; discountPercent: number; rarity: string }) {
  if (hasNft) {
    const rarityLabel = rarity && rarity !== "none" ? rarity.replace(/_/g, " ") : null;
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" />
            PepperHead Member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              DAO Voting Access
            </Badge>
            {discountPercent > 0 && (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                🛍️ {discountPercent}% Shop Discount{rarityLabel ? ` (${rarityLabel})` : ""}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to="/dao"><Shield className="h-3.5 w-3.5" />Go to DAO</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-border bg-card border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-muted-foreground">No IC SPICY NFT</CardTitle>
        <CardDescription>
          Get a PepperHead NFT for shop discounts and DAO voting access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1">
          <Link to="/marketplace"><ShoppingBag className="h-3.5 w-3.5" />Buy PepperHead — $25</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Link wallet card ─────────────────────────────────────────────────────────

function LinkWalletCard() {
  const { isAuthenticated, actor } = useAuth();
  const { isOisyConnected, oisyPrincipal } = useOisyWallet();
  const { data: linkedWallets = [], isLoading } = useLinkedWallets();
  const linkWallet = useLinkWallet();
  const unlinkWallet = useUnlinkWallet();

  const oisyAlreadyLinked = oisyPrincipal
    ? linkedWallets.some((p) => p.toText() === oisyPrincipal.toText())
    : false;

  if (!isAuthenticated) return null;

  async function handleLink() {
    if (!oisyPrincipal || !actor) return;
    try {
      await linkWallet.mutateAsync(oisyPrincipal);
      toast.success("OISY wallet linked! Your NFTs in OISY now count for DAO voting and shop discounts.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to link wallet");
    }
  }

  async function handleUnlink(p: import("@dfinity/principal").Principal) {
    try {
      await unlinkWallet.mutateAsync(p);
      toast.success("Wallet unlinked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unlink wallet");
    }
  }

  return (
    <Card className="border-border bg-card" data-ocid="link-wallet-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Linked Wallets
        </CardTitle>
        <CardDescription>
          Link your OISY wallet to your Internet Identity. NFTs in linked wallets count for DAO voting and shop discounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isOisyConnected && oisyPrincipal && !oisyAlreadyLinked && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 space-y-2">
            <p className="text-sm text-foreground">
              Link your connected OISY wallet to enable NFT-based benefits from OISY-custodied tokens.
            </p>
            <p className="text-xs text-muted-foreground font-mono break-all">{oisyPrincipal.toText()}</p>
            <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => void handleLink()} disabled={linkWallet.isPending}>
              {linkWallet.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Link OISY Wallet
            </Button>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : linkedWallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No linked wallets.{!isOisyConnected && " Connect OISY above to link it."}
          </p>
        ) : (
          <div className="space-y-2">
            {linkedWallets.map((p) => {
              const isOisy = oisyPrincipal?.toText() === p.toText();
              return (
                <div key={p.toText()} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <code className="text-xs font-mono flex-1 truncate text-foreground">{truncatePid(p.toText())}</code>
                  {isOisy && <Badge className="text-[9px] bg-orange-500/20 text-orange-400 border-orange-500/30">OISY</Badge>}
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleUnlink(p)} disabled={unlinkWallet.isPending}>
                    <Unlink className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── OISY explainer ──────────────────────────────────────────────────────────

function OisyExplainerCard() {
  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-5 w-5 text-orange-400" />
          What is OISY?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><span className="text-orange-400">•</span>A fully on-chain, self-custody multi-chain wallet</li>
          <li className="flex gap-2"><span className="text-orange-400">•</span>Hold your IC SPICY NFTs in OISY for shop discounts and DAO access</li>
          <li className="flex gap-2"><span className="text-orange-400">•</span>Supports ICP, ETH, BTC, SOL, and all ICRC tokens</li>
          <li className="flex gap-2"><span className="text-orange-400">•</span>Pay for purchases in OISY from the Marketplace</li>
        </ul>
        <a href="https://oisy.com" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors font-medium text-xs">
          Visit oisy.com <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WalletPage() {
  usePageTitle("Wallet");

  const { isAuthenticated, isInitializing, principal, actor } = useAuth();
  const { isOisyConnected, isOisyInitializing, oisyPrincipal, oisyAccount, disconnectOisy } = useOisyWallet();
  const { data: isAdmin } = useIsAdmin();
  const nftDiscount = useNftDiscount();
  const queryClient = useQueryClient();
  const { data: balances, isLoading: balLoading } = useTokenBalances();
  const { data: tokenIds, isLoading: nftsLoading } = useMyNftTokenIds();
  const { data: linkedWallets = [], isLoading } = useLinkedWallets();
  const linkWallet = useLinkWallet();
  const unlinkWallet = useUnlinkWallet();
  const [copied, setCopied] = useState(false);

  const pidText = principal?.toText() ?? "";

  // OISY balance + NFT queries — public queries, no II session needed
  const { data: oisyBalances, isLoading: oisyBalLoading } = useTokenBalancesForPrincipal(oisyPrincipal);
  const { data: oisyTokenIds, isLoading: oisyNftsLoading } = useNftTokenIdsForPrincipal(
    oisyPrincipal as import("@dfinity/principal").Principal | undefined,
  );

  const oisyAlreadyLinked = oisyPrincipal
    ? linkedWallets.some((p) => p.toText() === oisyPrincipal.toText())
    : false;

  // Auto-link OISY when both II and OISY are connected
  const autoLinkedRef = useRef(false);
  useEffect(() => {
    if (!oisyPrincipal || !isAuthenticated || !actor) return;
    if (oisyPrincipal.toText() === pidText) return;
    if (oisyAlreadyLinked || autoLinkedRef.current) return;
    autoLinkedRef.current = true;
    void actor.linkWallet(oisyPrincipal as import("@dfinity/principal").Principal).then((success) => {
      if (success) {
        toast.success("OISY wallet linked — your NFTs now count for discounts and DAO access");
        void queryClient.invalidateQueries({ queryKey: ["linkedWallets"] });
        void queryClient.invalidateQueries({ queryKey: ["nftDiscount"] });
      }
    }).catch(() => {
      autoLinkedRef.current = false;
    });
  }, [oisyPrincipal, isAuthenticated, actor, pidText, oisyAlreadyLinked, queryClient]);

  const nftCards = useMemo(() => {
    if (!tokenIds?.length) return [];
    return tokenIds.slice(0, 48).map((id) => ({ id }));
  }, [tokenIds]);

  const oisyNftCards = useMemo(() => {
    if (!oisyTokenIds?.length) return [];
    return oisyTokenIds.slice(0, 48).map((id) => ({ id }));
  }, [oisyTokenIds]);

  const hasNft = (nftCards.length > 0) || nftDiscount.discountPercent > 0;
  const discountPct = nftDiscount.discountPercent;
  const rarity = nftDiscount.rarity;

  async function handleLink(p: import("@dfinity/principal").Principal) {
    if (!actor) return;
    try {
      await linkWallet.mutateAsync(p);
      toast.success("OISY wallet linked! Your NFTs in OISY now count for DAO voting and shop discounts.");
    } catch {
      toast.error("Failed to link wallet");
    }
  }
  async function handleUnlink(p: import("@dfinity/principal").Principal) {
    await unlinkWallet.mutateAsync(p);
    toast.success("Wallet unlinked");
  }

  function refreshBalances() { void queryClient.invalidateQueries({ queryKey: ["tokenBalances"] }); }
  function refreshNfts() {
    void queryClient.invalidateQueries({ queryKey: ["icrc7_tokens_of"] });
    void queryClient.invalidateQueries({ queryKey: ["myNftTokenIds"] });
  }

  function copyPrincipal() {
    if (!pidText) return;
    void navigator.clipboard.writeText(pidText).then(() => {
      setCopied(true);
      toast.success("Principal copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 pb-16" data-ocid="wallet-page">
      {/* ── Header ── */}
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="h-8 w-8 text-primary" />
          My Wallet
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your tokens, NFTs, and wallet connections.
        </p>
      </div>

      {/* ── Connection section ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-ocid="wallet-connections">
        {/* Internet Identity */}
        <Card className={`border-border bg-card ${isAuthenticated ? "border-emerald-500/30" : ""}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Internet Identity
              {isAuthenticated && <Badge className="ml-auto bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">Connected</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isAuthenticated && pidText ? (
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-muted-foreground flex-1 truncate">{truncatePid(pidText)}</code>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={copyPrincipal}>
                  {copied ? <Flame className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sign in for full access</p>
            )}
            <ConnectButton />
          </CardContent>
        </Card>

        {/* OISY */}
        <Card className={`border-border bg-card ${isOisyConnected ? "border-orange-500/30" : ""}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-orange-400" />
              OISY Wallet
              {isOisyConnected && <Badge className="ml-auto bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Connected</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isOisyConnected && oisyPrincipal ? (
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-muted-foreground flex-1 truncate">{truncatePid(oisyPrincipal.toText())}</code>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
                  onClick={() => void navigator.clipboard.writeText(oisyPrincipal.toText()).then(() => toast.success("OISY principal copied"))}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Pay with OISY or custody NFTs on-chain</p>
            )}
            <div className="flex gap-2">
              <OisyConnectButton size="sm" label={isOisyInitializing ? "Connecting…" : isOisyConnected ? "OISY connected" : "Connect OISY"} />
              {isOisyConnected && (
                <Button size="sm" variant="ghost" onClick={() => void disconnectOisy()} className="text-muted-foreground">
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Membership + Raven Tier ── */}
      {(isAuthenticated || nftDiscount.discountPercent > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MembershipCard hasNft={hasNft} discountPercent={discountPct} rarity={rarity} />
          {isAuthenticated && <RavenTierCard />}
        </div>
      )}

      {/* ── Token balances ── */}
      {isAuthenticated && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Token Balances
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {balLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            {!balLoading && balances?.map((row) => <TokenBalanceCard key={row.symbol} row={row} onSent={refreshBalances} />)}
          </div>
        </div>
      )}

      {/* ── My NFTs ── */}
      {isAuthenticated && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
            <Flame className="h-6 w-6 text-red-500" />
            My NFTs
            <span className="text-sm font-normal text-muted-foreground">(II Wallet)</span>
          </h2>
          {nftsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
            </div>
          ) : nftCards.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground text-sm mb-3">No IC SPICY NFTs in this II wallet.</p>
              <Button asChild size="sm" variant="outline">
                <Link to="/marketplace">Browse the Shop</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {nftCards.map(({ id }) => (
                <WalletNftCard key={id.toString()} tokenId={id} isAdmin={!!isAdmin}
                  onTransferred={refreshNfts} walletBadge="II" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── OISY token balances ── */}
      {isOisyConnected && oisyPrincipal && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-400" />
            OISY Token Balances
            {oisyAlreadyLinked && (
              <Badge className="ml-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Linked</Badge>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {oisyBalLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            {!oisyBalLoading && oisyBalances?.map((row) => (
              <TokenBalanceCard key={row.symbol} row={row} onSent={() => {
                void queryClient.invalidateQueries({ queryKey: ["tokenBalancesForPrincipal"] });
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── OISY NFTs ── */}
      {isOisyConnected && oisyPrincipal && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            OISY NFTs
            <span className="text-sm font-normal text-muted-foreground">(OISY Wallet)</span>
          </h2>
          {oisyNftsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
            </div>
          ) : oisyNftCards.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-orange-500/20 bg-orange-500/5">
              <Wallet className="h-8 w-8 text-orange-400/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-1">No IC SPICY NFTs custodied in OISY.</p>
              <p className="text-xs text-muted-foreground mb-3">
                NFTs purchased via OISY checkout will appear here.
              </p>
              <a href="https://oisy.com" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium">
                View at oisy.com <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {oisyNftCards.map(({ id }) => (
                <WalletNftCard key={id.toString()} tokenId={id} isAdmin={!!isAdmin}
                  onTransferred={() => void queryClient.invalidateQueries({ queryKey: ["icrc7_tokens_of_external"] })}
                  walletBadge="OISY" />
              ))}
            </div>
          )}
          {!oisyAlreadyLinked && isAuthenticated && (
            <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-orange-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">
                Link your OISY wallet so these NFTs count for shop discounts and DAO voting.
              </p>
              <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                onClick={() => void handleLink(oisyPrincipal as import("@dfinity/principal").Principal)}
                disabled={linkWallet.isPending}>
                {linkWallet.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                Link
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Link wallet (II + OISY) — manage linked wallets ── */}
      {isAuthenticated && <LinkWalletCard />}

      {/* ── OISY explainer if not connected ── */}
      {!isOisyConnected && !isOisyInitializing && <OisyExplainerCard />}

      {/* ── Quick links ── */}
      {isAuthenticated && (
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/orders" className="gap-2"><ShoppingBag className="h-4 w-4" />My orders</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile" className="gap-2"><Link2 className="h-4 w-4" />Profile</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/dao" className="gap-2"><Shield className="h-4 w-4" />DAO</Link>
          </Button>
        </div>
      )}

      {/* ── Not signed in nudge ── */}
      {!isAuthenticated && !isInitializing && (
        <Card className="border-dashed border-border bg-muted/10 text-center">
          <CardContent className="py-8">
            <Coins className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-3">
              Sign in with Internet Identity to view token balances and your NFTs.
            </p>
            <ConnectButton />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
