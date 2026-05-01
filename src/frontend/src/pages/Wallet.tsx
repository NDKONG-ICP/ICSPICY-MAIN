import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  ExternalLink,
  Flame,
  Gem,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { TxStatus, TxType } from "../backend";
import type { PlantPublic, WalletToken, WalletTransaction } from "../backend";
import { RarityTier } from "../backend";
import { useAuth } from "../hooks/useAuth";
import { useMyPlants, useTokenPrices } from "../hooks/useBackend";
import {
  useSendToken,
  useWalletAddress,
  useWalletBalances,
  useWalletTransactions,
} from "../hooks/useWallet";

// ─── Token config ─────────────────────────────────────────────────────────────

const TOKEN_CONFIG: Record<
  string,
  { colorClass: string; bgClass: string; symbol: string; borderClass: string }
> = {
  ICP: {
    colorClass: "text-purple-400",
    bgClass: "bg-purple-500/20 border border-purple-500/30",
    borderClass: "border-purple-500/30",
    symbol: "ICP",
  },
  ckBTC: {
    colorClass: "text-orange-400",
    bgClass: "bg-orange-500/20 border border-orange-500/30",
    borderClass: "border-orange-500/30",
    symbol: "₿",
  },
  ckETH: {
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/20 border border-blue-500/30",
    borderClass: "border-blue-500/30",
    symbol: "Ξ",
  },
  ckUSDC: {
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/20 border border-emerald-500/30",
    borderClass: "border-emerald-500/30",
    symbol: "$",
  },
  ckUSDT: {
    colorClass: "text-teal-400",
    bgClass: "bg-teal-500/20 border border-teal-500/30",
    borderClass: "border-teal-500/30",
    symbol: "₮",
  },
};

function getTokenConfig(symbol: string) {
  return (
    TOKEN_CONFIG[symbol] ?? {
      colorClass: "text-muted-foreground",
      bgClass: "bg-muted/50",
      borderClass: "border-border",
      symbol: symbol.charAt(0),
    }
  );
}

// ─── Rarity config ────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<
  RarityTier,
  {
    label: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    gradientColors: string[];
    discountPct: number;
    icon: React.ReactNode;
  }
> = {
  [RarityTier.Common]: {
    label: "Common",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    gradientColors: [
      "oklch(0.5 0.18 150)",
      "oklch(0.4 0.12 160)",
      "oklch(0.55 0.15 140)",
      "oklch(0.45 0.2 130)",
      "oklch(0.6 0.1 155)",
      "oklch(0.4 0.16 145)",
      "oklch(0.52 0.14 165)",
      "oklch(0.48 0.18 135)",
      "oklch(0.57 0.12 150)",
      "oklch(0.44 0.2 140)",
    ],
    discountPct: 10,
    icon: <Star className="w-3.5 h-3.5" />,
  },
  [RarityTier.Uncommon]: {
    label: "Uncommon",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    gradientColors: [
      "oklch(0.5 0.22 240)",
      "oklch(0.42 0.18 250)",
      "oklch(0.55 0.2 235)",
      "oklch(0.48 0.24 245)",
      "oklch(0.6 0.16 255)",
      "oklch(0.44 0.22 230)",
      "oklch(0.52 0.2 260)",
      "oklch(0.46 0.18 240)",
      "oklch(0.58 0.14 250)",
      "oklch(0.4 0.24 245)",
    ],
    discountPct: 12,
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  [RarityTier.Rare]: {
    label: "Rare",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    gradientColors: [
      "oklch(0.65 0.22 50)",
      "oklch(0.55 0.28 40)",
      "oklch(0.7 0.2 60)",
      "oklch(0.58 0.26 45)",
      "oklch(0.75 0.18 55)",
      "oklch(0.5 0.3 35)",
      "oklch(0.68 0.22 65)",
      "oklch(0.53 0.24 48)",
      "oklch(0.72 0.16 52)",
      "oklch(0.48 0.28 42)",
    ],
    discountPct: 15,
    icon: <Crown className="w-3.5 h-3.5" />,
  },
};

function getRarityFromNftId(nftId: string): RarityTier {
  const lower = nftId.toLowerCase();
  if (lower.includes("rare")) return RarityTier.Rare;
  if (lower.includes("uncommon")) return RarityTier.Uncommon;
  return RarityTier.Common;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBalance(balance: bigint, decimals: number): string {
  if (decimals === 0) return balance.toString();
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const frac = balance % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6);
  return `${whole}.${fracStr}`;
}

function truncateAddress(addr: string, chars = 8): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / BigInt(1_000_000));
  return new Date(ms).toLocaleString();
}

function formatStage(stage: string): string {
  const map: Record<string, string> = {
    Seed: "🌱 Seed",
    Seedling: "🪴 Seedling",
    Mature: "🌶️ Mature",
  };
  return map[stage] ?? stage;
}

function formatIcpE8s(e8s: bigint): string {
  const icp = Number(e8s) / 1e8;
  if (icp < 0.001) return "<0.001 ICP";
  return `${icp.toFixed(4)} ICP`;
}

// ─── Price badge helper ───────────────────────────────────────────────────────

function TokenPriceBadge({
  symbol,
  priceMap,
}: {
  symbol: string;
  priceMap: Map<string, bigint>;
}) {
  const price = priceMap.get(symbol);
  if (!price) return null;
  return (
    <span className="text-[10px] text-muted-foreground">
      ≈ {formatIcpE8s(price)} / unit
    </span>
  );
}

// ─── Composite NFT Artwork ────────────────────────────────────────────────────

function CompositeNFTArtwork({ rarityTier }: { rarityTier: RarityTier }) {
  const cfg = RARITY_CONFIG[rarityTier];
  return (
    <div
      className={`w-20 h-20 rounded-xl overflow-hidden border-2 ${cfg.borderClass} flex-shrink-0 shadow-elevated`}
      aria-label={`${cfg.label} rarity NFT artwork`}
    >
      <div className="w-full h-full flex flex-col">
        {cfg.gradientColors.map((color) => (
          <div
            key={color}
            className="w-full flex-1 h-2"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── NFT Plant Card ───────────────────────────────────────────────────────────

function NFTWalletCard({
  plant,
  index,
}: { plant: PlantPublic; index: number }) {
  const rarityTier = getRarityFromNftId(plant.nft_id ?? "");
  const cfg = RARITY_CONFIG[rarityTier];
  const plantingDate = plant.planting_date
    ? new Date(Number(plant.planting_date) / 1_000_000).toLocaleDateString()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      data-ocid="wallet-nft-card"
    >
      <Card
        className={`bg-card border ${cfg.borderClass} hover:shadow-elevated transition-smooth`}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <CompositeNFTArtwork rarityTier={rarityTier} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="font-display font-bold text-foreground truncate">
                    {plant.common_name ?? plant.variety}
                  </p>
                  {plant.latin_name && (
                    <p className="text-xs text-muted-foreground italic truncate">
                      {plant.latin_name}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 h-4 border shrink-0 ${cfg.borderClass} ${cfg.bgClass} ${cfg.colorClass} font-bold flex items-center gap-0.5`}
                >
                  {cfg.icon}
                  {cfg.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">
                  {formatStage(plant.stage)}
                </span>
                {plantingDate && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      Planted {plantingDate}
                    </span>
                  </>
                )}
              </div>

              <div
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold mb-3 ${cfg.borderClass} ${cfg.bgClass} ${cfg.colorClass}`}
              >
                <Gem className="w-3 h-3" />
                {cfg.discountPct}% Lifetime Storewide Discount
              </div>

              {plant.nft_id && (
                <p className="text-[10px] font-mono text-muted-foreground truncate mb-3">
                  {plant.nft_id}
                </p>
              )}

              <Link
                to="/nims"
                className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg.colorClass} hover:opacity-80 transition-smooth`}
                data-ocid="wallet-nft-lifecycle-btn"
              >
                <ExternalLink className="w-3 h-3" />
                View Lifecycle
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── NFTs section ─────────────────────────────────────────────────────────────

function NFTsSection() {
  const { data: myPlants = [], isLoading } = useMyPlants();
  const nftPlants = myPlants.filter((p) => p.nft_id);

  if (isLoading) {
    return (
      <section aria-label="NFT holdings" data-ocid="wallet-nfts-section">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Plant NFTs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {["sk-n1", "sk-n2"].map((id) => (
            <Card key={id} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-36 rounded-lg" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="NFT holdings" data-ocid="wallet-nfts-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Plant NFTs
        </h2>
        {nftPlants.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {nftPlants.length} NFT{nftPlants.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {nftPlants.length === 0 ? (
        <Card className="bg-card border-border" data-ocid="wallet-nfts-empty">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Gem className="w-7 h-7 text-primary/60" />
            </div>
            <p className="font-display font-semibold text-foreground mb-2">
              No Plant NFTs Yet
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4 leading-relaxed">
              Scan a QR label at the nursery to claim a plant NFT. Your NFT
              grants a lifetime discount — 10%, 12%, or 15% based on rarity.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
              {(Object.values(RarityTier) as RarityTier[]).map((tier) => {
                const rc = RARITY_CONFIG[tier];
                return (
                  <div
                    key={tier}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${rc.borderClass} ${rc.bgClass} ${rc.colorClass}`}
                  >
                    {rc.icon}
                    {rc.label} {rc.discountPct}%
                  </div>
                );
              })}
            </div>
            <Link to="/marketplace">
              <Button
                variant="outline"
                size="sm"
                className="border-border"
                data-ocid="wallet-nfts-browse-btn"
              >
                Browse Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {nftPlants.map((plant, i) => (
            <NFTWalletCard key={plant.id.toString()} plant={plant} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Token Card ───────────────────────────────────────────────────────────────

function TokenCard({
  token,
  index,
  priceMap,
}: {
  token: WalletToken;
  index: number;
  priceMap: Map<string, bigint>;
}) {
  const cfg = getTokenConfig(token.symbol);
  const balanceStr = formatBalance(token.balance, token.decimals);
  const usd = token.usdValue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="bg-card border-border hover:border-primary/40 transition-smooth">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${cfg.bgClass} ${cfg.colorClass}`}
            >
              {cfg.symbol}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">
                {token.name}
              </p>
              <p className="text-2xl font-display font-bold text-foreground truncate mt-0.5">
                {balanceStr}
              </p>
              <p className="text-sm text-muted-foreground mt-1">≈ {usd}</p>
              <TokenPriceBadge symbol={token.symbol} priceMap={priceMap} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TokenCardSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Send Form ────────────────────────────────────────────────────────────────

interface SendFormProps {
  tokens: WalletToken[];
  walletAddress: string;
}

function SendForm({ tokens, walletAddress }: SendFormProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(
    tokens[0]?.symbol ?? "ICP",
  );
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutate: sendToken, isPending } = useSendToken();

  const selectedToken = tokens.find((t) => t.symbol === selectedSymbol);
  const amountNum = Number.parseFloat(amount) || 0;
  const estimatedFee = selectedSymbol === "ICP" ? "0.0001 ICP" : "≈ minimal";

  function handleSend() {
    if (!amount || !recipient || !selectedToken) return;
    const decimals = selectedToken.decimals;
    const rawAmount = BigInt(Math.round(amountNum * 10 ** decimals));
    sendToken(
      {
        tokenSymbol: selectedSymbol,
        recipientAddress: recipient,
        amount: rawAmount,
      },
      {
        onSuccess: () => {
          toast.success(`Sent ${amount} ${selectedSymbol} successfully`);
          setAmount("");
          setRecipient("");
          setConfirmOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Send failed");
          setConfirmOpen(false);
        },
      },
    );
  }

  return (
    <div className="space-y-5 pt-4">
      <div className="space-y-2">
        <Label htmlFor="token-select">Token</Label>
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger
            id="token-select"
            data-ocid="wallet-token-select"
            className="bg-secondary border-border"
          >
            <SelectValue placeholder="Select token" />
          </SelectTrigger>
          <SelectContent>
            {tokens.map((t) => (
              <SelectItem key={t.symbol} value={t.symbol}>
                {t.symbol} — {formatBalance(t.balance, t.decimals)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="send-amount">Amount</Label>
        <Input
          id="send-amount"
          type="number"
          min="0"
          step="any"
          placeholder="0.0000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-secondary border-border font-mono"
          data-ocid="wallet-amount-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="send-recipient">Recipient Address</Label>
        <Input
          id="send-recipient"
          placeholder="Principal or account ID"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="bg-secondary border-border font-mono text-sm"
          data-ocid="wallet-recipient-input"
        />
      </div>

      <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm flex justify-between">
        <span className="text-muted-foreground">Estimated fee</span>
        <span className="text-foreground font-mono">{estimatedFee}</span>
      </div>

      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={!amount || !recipient || amountNum <= 0}
        onClick={() => setConfirmOpen(true)}
        data-ocid="wallet-send-btn"
      >
        <Send className="w-4 h-4 mr-2" />
        Review Send
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">
              Confirm Transaction
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {[
              { label: "From", value: truncateAddress(walletAddress) },
              { label: "To", value: truncateAddress(recipient, 10) },
              { label: "Amount", value: `${amount} ${selectedSymbol}` },
              { label: "Fee", value: estimatedFee },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between py-1.5 border-b border-border last:border-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-ocid="wallet-confirm-send"
            >
              {isPending ? "Sending…" : "Confirm Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Receive Tab ──────────────────────────────────────────────────────────────

function ReceiveTab({ address }: { address: string }) {
  function copyAddress() {
    navigator.clipboard.writeText(address).then(() => {
      toast.success("Address copied to clipboard");
    });
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="rounded-xl bg-muted/30 border border-border p-6 text-center space-y-4">
        <div className="w-24 h-24 mx-auto rounded-xl bg-muted/50 border border-border flex items-center justify-center">
          <div className="text-4xl">⬛</div>
        </div>
        <p className="text-xs text-muted-foreground italic">
          Share your address to receive tokens
        </p>
      </div>

      <div className="space-y-2">
        <Label>Your Wallet Address</Label>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-lg bg-secondary border border-border px-3 py-2.5 font-mono text-xs text-foreground break-all"
            data-ocid="wallet-address-display"
          >
            {address || "Loading…"}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAddress}
            disabled={!address}
            aria-label="Copy address"
            className="shrink-0 border-border"
            data-ocid="wallet-copy-address"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: WalletTransaction }) {
  const isSend = tx.txType === TxType.send;
  const cfg = getTokenConfig(tx.tokenSymbol);

  const statusIcon =
    tx.status === TxStatus.completed ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    ) : tx.status === TxStatus.pending ? (
      <Clock className="w-3.5 h-3.5 text-yellow-400" />
    ) : (
      <XCircle className="w-3.5 h-3.5 text-destructive" />
    );

  const statusLabel =
    tx.status === TxStatus.completed
      ? "Completed"
      : tx.status === TxStatus.pending
        ? "Pending"
        : "Failed";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-smooth border-b border-border last:border-0"
      data-ocid="wallet-tx-row"
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isSend ? "bg-destructive/15" : "bg-emerald-500/15"
        }`}
      >
        {isSend ? (
          <ArrowUpRight className="w-4 h-4 text-destructive" />
        ) : (
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${isSend ? "text-destructive" : "text-emerald-400"}`}
          >
            {isSend ? "Sent" : "Received"}
          </span>
          <span className={`text-xs font-bold ${cfg.colorClass}`}>
            {tx.tokenSymbol}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {isSend ? "To: " : "From: "}
          {truncateAddress(tx.counterparty, 8)}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p
          className={`text-sm font-mono font-semibold ${isSend ? "text-destructive" : "text-emerald-400"}`}
        >
          {isSend ? "−" : "+"}
          {formatBalance(tx.amount, 8)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatTimestamp(tx.timestamp)}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {statusIcon}
        <Badge
          variant="outline"
          className={`text-[10px] border-0 px-1.5 py-0 ${
            tx.status === TxStatus.completed
              ? "bg-emerald-500/10 text-emerald-400"
              : tx.status === TxStatus.pending
                ? "bg-yellow-500/10 text-yellow-400"
                : "bg-destructive/10 text-destructive"
          }`}
        >
          {statusLabel}
        </Badge>
      </div>
    </div>
  );
}

const SKELETON_BALANCE_IDS = [
  "sk-b1",
  "sk-b2",
  "sk-b3",
  "sk-b4",
  "sk-b5",
] as const;
const SKELETON_TX_IDS = ["sk-t1", "sk-t2", "sk-t3", "sk-t4", "sk-t5"] as const;

export default function WalletPage() {
  const { isAuthenticated, login, isInitializing, principal } = useAuth();
  const [walletIdCopied, setWalletIdCopied] = useState(false);
  const { data: balances, isLoading: loadingBalances } = useWalletBalances();
  const { data: transactions, isLoading: loadingTxs } = useWalletTransactions();
  const { data: walletAddress = "" } = useWalletAddress();
  const { data: tokenPrices = [], dataUpdatedAt } = useTokenPrices();

  const principalId = principal?.toText() ?? "";
  const tokens: WalletToken[] = balances ?? [];
  const txList: WalletTransaction[] = transactions ?? [];

  // Build price map: token symbol → price_in_icp_e8s
  const priceMap = new Map<string, bigint>(
    tokenPrices.map((p) => [p.token as string, p.price_in_icp_e8s]),
  );

  const priceUpdatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  const sortedTxs = [...txList].sort((a, b) =>
    b.timestamp > a.timestamp ? 1 : -1,
  );

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress).then(() => {
      toast.success("Address copied!");
    });
  }

  function copyPrincipalId() {
    if (!principalId) return;
    navigator.clipboard.writeText(principalId).then(() => {
      setWalletIdCopied(true);
      toast.success("Wallet ID copied to clipboard!");
      setTimeout(() => setWalletIdCopied(false), 2500);
    });
  }

  if (!isAuthenticated) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4"
        data-ocid="wallet-auth-gate"
      >
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
          <Flame className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold text-foreground">
            Connect to Access Wallet
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Sign in with Internet Identity to view your ICP, ckBTC, ckETH,
            ckUSDC, and ckUSDT balances.
          </p>
        </div>
        <Button
          onClick={login}
          disabled={isInitializing}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
          data-ocid="wallet-login-btn"
        >
          Connect with Internet Identity
        </Button>
      </div>
    );
  }

  return (
    <div
      className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      data-ocid="wallet-page"
    >
      {/* ── PRINCIPAL ID DIAGNOSTIC BANNER ─────────────────────────────────────
          This banner is intentionally the very first element so the user can
          immediately see which principal Internet Identity assigned them.
          Compare this value to the admin list if the admin tab is not working.
      ──────────────────────────────────────────────────────────────────────── */}
      {principalId && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-yellow-500/60 bg-yellow-500/10 p-4"
          data-ocid="wallet-principal-banner"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1">
                Your Internet Identity Principal ID
              </p>
              <p className="text-[11px] text-yellow-300/70 mb-2">
                Copy this and compare it to the admin list if the Admin panel
                shows "Access Restricted"
              </p>
              <div
                className="rounded-lg bg-black/30 border border-yellow-500/30 px-3 py-2 font-mono text-sm text-yellow-100 break-all select-all leading-relaxed"
                data-ocid="wallet-principal-id-text"
              >
                {principalId}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyPrincipalId}
              className="shrink-0 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20 gap-1.5 self-start sm:self-center"
              aria-label="Copy principal ID"
              data-ocid="wallet-principal-copy-btn"
            >
              {walletIdCopied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-xs">Copy ID</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              My Wallet
            </h1>
            <p className="text-sm text-muted-foreground">
              ICP · ckBTC · ckETH · ckUSDC · ckUSDT · Plant NFTs
            </p>
          </div>
        </div>

        {walletAddress && (
          <button
            type="button"
            onClick={copyAddress}
            className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition-smooth group"
            aria-label="Copy wallet address"
            data-ocid="wallet-address-pill"
          >
            <span>{truncateAddress(walletAddress, 10)}</span>
            <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
          </button>
        )}
      </motion.div>

      {/* ICPSwap price banner */}
      {priceUpdatedAt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground"
          data-ocid="wallet-price-banner"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
          <span>
            Live prices from ICPSwap — updated at{" "}
            <span className="text-foreground font-medium">
              {priceUpdatedAt}
            </span>
          </span>
        </motion.div>
      )}

      {/* Wallet ID — user's on-chain Internet Identity principal */}
      {principalId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border" data-ocid="wallet-id-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      Your Wallet ID
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Internet Identity principal · on-chain identity
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPrincipalId}
                  className="shrink-0 border-border gap-1.5"
                  aria-label="Copy wallet ID"
                  data-ocid="wallet-id-copy-btn"
                >
                  {walletIdCopied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <div
                className="rounded-lg bg-secondary/60 border border-border px-3 py-2.5 font-mono text-xs text-foreground break-all select-all leading-relaxed"
                data-ocid="wallet-id-display"
              >
                {principalId}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                This is your unique on-chain identity. Share it to receive NFTs
                or be identified in the IC ecosystem.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Plant NFTs */}
      <NFTsSection />

      {/* Token Grid */}
      <section aria-label="Token balances">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Balances
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loadingBalances
            ? SKELETON_BALANCE_IDS.map((id) => <TokenCardSkeleton key={id} />)
            : tokens.map((token, i) => (
                <TokenCard
                  key={token.symbol}
                  token={token}
                  index={i}
                  priceMap={priceMap}
                />
              ))}
        </div>
      </section>

      {/* Send / Receive */}
      <section>
        <Card className="bg-card border-border">
          <CardHeader className="pb-0">
            <CardTitle className="font-display text-lg">Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="send" className="mt-2">
              <TabsList className="bg-secondary border border-border w-full sm:w-auto">
                <TabsTrigger
                  value="send"
                  className="flex-1 sm:flex-none gap-1.5"
                  data-ocid="wallet-send-tab"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Send
                </TabsTrigger>
                <TabsTrigger
                  value="receive"
                  className="flex-1 sm:flex-none gap-1.5"
                  data-ocid="wallet-receive-tab"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Receive
                </TabsTrigger>
              </TabsList>

              <TabsContent value="send">
                {tokens.length > 0 ? (
                  <SendForm tokens={tokens} walletAddress={walletAddress} />
                ) : (
                  <p className="text-sm text-muted-foreground pt-4">
                    Loading token balances…
                  </p>
                )}
              </TabsContent>

              <TabsContent value="receive">
                <ReceiveTab address={walletAddress} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* Transaction History */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Transaction History
        </h2>
        <Card className="bg-card border-border overflow-hidden">
          {loadingTxs ? (
            <div className="divide-y divide-border">
              {SKELETON_TX_IDS.map((id) => (
                <div key={id} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20 ml-auto" />
                    <Skeleton className="h-3 w-28 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedTxs.length === 0 ? (
            <div
              className="text-center py-16 space-y-3"
              data-ocid="wallet-empty-state"
            >
              <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
                <ArrowUpRight className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Send or receive tokens to see your history here.
              </p>
            </div>
          ) : (
            <div data-ocid="wallet-tx-list">
              {sortedTxs.map((tx) => (
                <TxRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
