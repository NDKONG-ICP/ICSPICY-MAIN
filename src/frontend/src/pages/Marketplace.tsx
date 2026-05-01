import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Crown,
  Flame,
  HandshakeIcon,
  Minus,
  Plus,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Offer, ResaleListingPublic } from "../backend";
import {
  MembershipTier,
  NFTStandard,
  OfferStatus,
  ProductCategory,
  RarityTier,
} from "../backend";
import { useAuth } from "../hooks/useAuth";
import {
  useAcceptOffer,
  useBuyResaleListing,
  useCancelOffer,
  useCounterOffer,
  useGetActiveResaleListings,
  useGetMyOffers,
  useGetOffersReceived,
  useHasMembership,
  useIssueMembership,
  useMembershipPrices,
  useProducts,
  useProductsByCategory,
  useRejectOffer,
  useSubmitOffer,
  useTokenPrices,
} from "../hooks/useBackend";
import { useCart } from "../hooks/useCart";
import { OFFER_TOKENS, TOKEN_DECIMALS, TOKEN_DISPLAY } from "../types/index";
import type { OfferTokenSymbol, Product } from "../types/index";

// ─── Category config ──────────────────────────────────────────────────────────

type TabValue = ProductCategory | "resale" | "offers" | null;

const CATEGORIES: Array<{
  label: string;
  emoji: string;
  value: TabValue;
  price?: string;
}> = [
  { label: "All", emoji: "🌶️", value: null },
  {
    label: "Seedlings",
    price: "$6",
    emoji: "🌱",
    value: ProductCategory.Seedling,
  },
  {
    label: "1-Gallon",
    price: "$25",
    emoji: "🌿",
    value: ProductCategory.Gallon1,
  },
  {
    label: "5-Gallon",
    price: "$45",
    emoji: "🔥",
    value: ProductCategory.Gallon5,
  },
  {
    label: "Artisan Spices",
    price: "$12",
    emoji: "🧂",
    value: ProductCategory.Spice,
  },
  { label: "Garden Inputs", emoji: "🌿", value: ProductCategory.GardenInputs },
  { label: "Resale NFTs", emoji: "♻️", value: "resale" },
  { label: "Offers", emoji: "🤝", value: "offers" },
];

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  [ProductCategory.Seedling]: {
    label: "Seedling",
    color: "bg-emerald-950/60 text-emerald-400 border-emerald-700/40",
  },
  [ProductCategory.Gallon1]: {
    label: "1-Gallon",
    color: "bg-lime-950/60 text-lime-300 border-lime-700/40",
  },
  [ProductCategory.Gallon5]: {
    label: "Mature",
    color: "bg-orange-950/60 text-orange-400 border-orange-700/40",
  },
  [ProductCategory.Spice]: {
    label: "Artisan",
    color: "bg-amber-950/60 text-amber-300 border-amber-700/40",
  },
  [ProductCategory.GardenInputs]: {
    label: "Garden Input",
    color: "bg-green-950/60 text-green-400 border-green-700/40",
  },
};

const RARITY_CONFIG: Record<
  RarityTier,
  {
    label: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    discountPct: number;
    icon: React.ReactNode;
    stageBadgeClass: string;
  }
> = {
  [RarityTier.Common]: {
    label: "Common",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    stageBadgeClass: "bg-emerald-950/60 text-emerald-400 border-emerald-700/40",
    discountPct: 10,
    icon: <Star className="w-3.5 h-3.5" />,
  },
  [RarityTier.Uncommon]: {
    label: "Uncommon",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/30",
    stageBadgeClass: "bg-cyan-950/60 text-cyan-400 border-cyan-700/40",
    discountPct: 12,
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  [RarityTier.Rare]: {
    label: "Rare",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    stageBadgeClass: "bg-amber-950/60 text-amber-400 border-amber-700/40",
    discountPct: 15,
    icon: <Crown className="w-3.5 h-3.5" />,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: bigint, discount = false) {
  const base = Number(cents) / 100;
  const final = discount ? base * 0.9 : base;
  return `$${final.toFixed(2)}`;
}

function truncatePrincipal(p: string) {
  return `${p.slice(0, 8)}…${p.slice(-5)}`;
}

function getProductEmoji(category: string) {
  if (category === ProductCategory.Spice) return "🧂";
  if (category === ProductCategory.GardenInputs) return "🌿";
  return "🌶️";
}

// Get all image keys from a product, with backward-compat fallback
function getProductImageKeys(product: Product): string[] {
  // image_keys may not exist yet in bindings — check at runtime
  const p = product as Product & { image_keys?: string[] };
  if (p.image_keys && p.image_keys.length > 0) return p.image_keys;
  if (product.image_key) return [product.image_key];
  return [];
}

function formatTokenAmount(amount: bigint, symbol: OfferTokenSymbol): string {
  const dec = TOKEN_DECIMALS[symbol] ?? 8;
  const divisor = BigInt(10 ** Math.min(dec, 8));
  const whole = amount / divisor;
  const frac = (amount % divisor)
    .toString()
    .padStart(Math.min(dec, 8), "0")
    .slice(0, 6);
  return `${whole}.${frac} ${symbol}`;
}

function formatIcpEquiv(icp_e8s: bigint): string {
  const icp = Number(icp_e8s) / 1e8;
  return `≈ ${icp.toFixed(4)} ICP`;
}

// ─── Stage Badge ──────────────────────────────────────────────────────────────

function StageBadge({ category }: { category: string }) {
  const cfg = STAGE_LABELS[category];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Rarity Badge ─────────────────────────────────────────────────────────────

function RarityBadge({ tier }: { tier: RarityTier }) {
  const cfg = RARITY_CONFIG[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${cfg.stageBadgeClass}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Offer Status Badge ───────────────────────────────────────────────────────

const STATUS_STYLE: Record<OfferStatus, string> = {
  [OfferStatus.Pending]:
    "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  [OfferStatus.Countered]: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  [OfferStatus.Accepted]:
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  [OfferStatus.Rejected]:
    "bg-destructive/10 text-destructive border-destructive/30",
  [OfferStatus.Cancelled]: "bg-muted/40 text-muted-foreground border-border",
};

function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {status === OfferStatus.Pending && <Clock className="w-3 h-3" />}
      {status === OfferStatus.Accepted && <CheckCircle2 className="w-3 h-3" />}
      {(status === OfferStatus.Rejected ||
        status === OfferStatus.Cancelled) && <XCircle className="w-3 h-3" />}
      {status}
    </span>
  );
}

// ─── Offer History Timeline ───────────────────────────────────────────────────

function OfferTimeline({ offer }: { offer: Offer }) {
  const [expanded, setExpanded] = useState(false);
  if (offer.history.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        History ({offer.history.length})
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1 pl-2 border-l border-border/60">
          {offer.history.map((h, i) => (
            <div
              key={`${h.timestamp}-${i}`}
              className="text-[10px] text-muted-foreground"
            >
              <span className="text-foreground font-medium">{h.action}</span> ·{" "}
              {formatTokenAmount(h.amount, h.token as OfferTokenSymbol)} ·{" "}
              {new Date(Number(h.timestamp) / 1_000_000).toLocaleString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Make Offer Modal ─────────────────────────────────────────────────────────

function OfferModal({
  nftId,
  onClose,
  priceE8sMap,
}: {
  nftId: string;
  onClose: () => void;
  priceE8sMap: Map<string, bigint>;
}) {
  const [token, setToken] = useState<OfferTokenSymbol>("ICP");
  const [amount, setAmount] = useState("");
  const submitOffer = useSubmitOffer();

  const amountNum = Number.parseFloat(amount) || 0;
  const decimals = TOKEN_DECIMALS[token];
  const rawAmount = BigInt(Math.round(amountNum * 10 ** Math.min(decimals, 8)));

  const icpPrice = priceE8sMap.get(token);
  const icpEquiv =
    icpPrice && rawAmount > BigInt(0)
      ? (Number(rawAmount) * (Number(icpPrice) / 1e8)) / 1e8
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amountNum <= 0) return;
    try {
      await submitOffer.mutateAsync({
        nft_id: nftId,
        offered_token: token,
        offered_amount: rawAmount,
      });
      toast.success(
        "Offer submitted! It stays open until the seller responds.",
      );
      onClose();
    } catch {
      toast.error("Failed to submit offer.");
    }
  };

  const cfg = TOKEN_DISPLAY[token];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="bg-card border-border max-w-sm"
        data-ocid="offer-modal"
      >
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <HandshakeIcon className="w-5 h-5 text-primary" />
            Make an Offer
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
            NFT ID:{" "}
            <span className="font-mono text-primary/80 break-all">
              {nftId.slice(0, 20)}…
            </span>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Payment Token</Label>
            <Select
              value={token}
              onValueChange={(v) => setToken(v as OfferTokenSymbol)}
            >
              <SelectTrigger data-ocid="offer-token-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFER_TOKENS.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className={TOKEN_DISPLAY[t].colorClass}>
                      {TOKEN_DISPLAY[t].symbol}
                    </span>{" "}
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Offer Amount ({token})</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`0.0000 ${token}`}
              className={`font-mono border ${cfg.borderClass}`}
              data-ocid="offer-amount-input"
            />
            {icpEquiv !== null && (
              <p className="text-[11px] text-muted-foreground">
                ≈ {icpEquiv.toFixed(6)} ICP equivalent
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
            <p>
              This offer stays open indefinitely until the seller accepts,
              rejects, or you cancel it.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 bg-primary"
              disabled={submitOffer.isPending || !amount || amountNum <= 0}
              data-ocid="offer-submit-btn"
            >
              <HandshakeIcon className="w-4 h-4" />
              {submitOffer.isPending ? "Submitting…" : "Submit Offer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Counter Offer Modal ──────────────────────────────────────────────────────

function CounterOfferModal({
  offerId,
  onClose,
  priceE8sMap,
}: {
  offerId: string;
  onClose: () => void;
  priceE8sMap: Map<string, bigint>;
}) {
  const [token, setToken] = useState<OfferTokenSymbol>("ICP");
  const [amount, setAmount] = useState("");
  const counterOffer = useCounterOffer();

  const amountNum = Number.parseFloat(amount) || 0;
  const decimals = TOKEN_DECIMALS[token];
  const rawAmount = BigInt(Math.round(amountNum * 10 ** Math.min(decimals, 8)));
  const icpPrice = priceE8sMap.get(token);
  const icpEquiv =
    icpPrice && rawAmount > BigInt(0)
      ? (Number(rawAmount) * (Number(icpPrice) / 1e8)) / 1e8
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amountNum <= 0) return;
    try {
      await counterOffer.mutateAsync({
        offer_id: offerId,
        counter_amount: rawAmount,
        counter_token: token,
      });
      toast.success("Counter offer sent!");
      onClose();
    } catch {
      toast.error("Failed to send counter offer.");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="bg-card border-border max-w-sm"
        data-ocid="counter-offer-modal"
      >
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Counter Offer
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-2">
            <Label className="text-xs">Counter Token</Label>
            <Select
              value={token}
              onValueChange={(v) => setToken(v as OfferTokenSymbol)}
            >
              <SelectTrigger data-ocid="counter-token-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFER_TOKENS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Counter Amount</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`0.0000 ${token}`}
              className="font-mono"
              data-ocid="counter-amount-input"
            />
            {icpEquiv !== null && (
              <p className="text-[11px] text-muted-foreground">
                ≈ {icpEquiv.toFixed(6)} ICP equivalent
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 bg-primary"
              disabled={counterOffer.isPending || !amount || amountNum <= 0}
              data-ocid="counter-submit-btn"
            >
              {counterOffer.isPending ? "Sending…" : "Send Counter"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Resale Listing Card ──────────────────────────────────────────────────────

function ResaleCard({
  listing,
  callerPrincipal,
  priceE8sMap,
}: {
  listing: ResaleListingPublic;
  callerPrincipal: string | null;
  priceE8sMap: Map<string, bigint>;
}) {
  const cfg = RARITY_CONFIG[listing.rarity_tier];
  const buyMutation = useBuyResaleListing();
  const isSeller = callerPrincipal === listing.seller.toText();
  const listedDate = new Date(
    Number(listing.listed_at) / 1_000_000,
  ).toLocaleDateString();
  const [offerOpen, setOfferOpen] = useState(false);

  const handleBuy = async () => {
    try {
      await buyMutation.mutateAsync(listing.id);
      toast.success(
        `Plant NFT transferred! Your ${cfg.label} ${cfg.discountPct}% discount is now active.`,
      );
    } catch {
      toast.error("Purchase failed. Please try again.");
    }
  };

  const nftId = listing.plant_id.toString();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`rounded-xl bg-card border ${cfg.borderClass} overflow-hidden shadow-subtle hover:shadow-elevated hover:-translate-y-1 transition-smooth`}
        data-ocid="resale-listing-card"
      >
        {/* NFT composite art preview */}
        <div
          className={`aspect-square ${cfg.bgClass} flex items-center justify-center relative overflow-hidden`}
        >
          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-border/60 shadow-elevated flex flex-col">
            {Array.from({ length: 10 }, (_, i) => `layer-${i}`).map((k, i) => (
              <div
                key={k}
                className="flex-1"
                style={{
                  backgroundColor:
                    listing.rarity_tier === RarityTier.Rare
                      ? `oklch(${0.55 + i * 0.02} 0.25 ${40 + i * 3})`
                      : listing.rarity_tier === RarityTier.Uncommon
                        ? `oklch(${0.48 + i * 0.02} 0.22 ${240 + i * 2})`
                        : `oklch(${0.48 + i * 0.015} 0.18 ${148 + i * 2})`,
                }}
              />
            ))}
          </div>
          <div className="absolute top-2 left-2">
            <RarityBadge tier={listing.rarity_tier} />
          </div>
          <div className="absolute bottom-2 right-2">
            <span
              className={`text-xs font-bold ${cfg.colorClass} px-2 py-0.5 rounded-full ${cfg.bgClass} border ${cfg.borderClass}`}
            >
              -{cfg.discountPct}% off
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-1.5">
            <p className="font-display font-semibold text-foreground text-sm truncate">
              Plant NFT #{listing.plant_id.toString().slice(-6)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Seller: {truncatePrincipal(listing.seller.toText())}
            </p>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Listed {listedDate}
          </p>

          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-bold text-primary text-lg font-display">
                {listing.price_icp.toFixed(3)} ICP
              </span>
              <p className={`text-xs font-semibold ${cfg.colorClass} mt-0.5`}>
                Includes {cfg.discountPct}% lifetime discount
              </p>
            </div>
          </div>

          {isSeller ? (
            <div className="text-center py-1.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
              Your listing
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                onClick={handleBuy}
                disabled={buyMutation.isPending}
                data-ocid="resale-buy-btn"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                {buyMutation.isPending ? "Processing…" : "Buy Now"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => setOfferOpen(true)}
                data-ocid="resale-offer-btn"
              >
                <HandshakeIcon className="w-3.5 h-3.5" />
                Make Offer
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {offerOpen && (
        <OfferModal
          nftId={nftId}
          onClose={() => setOfferOpen(false)}
          priceE8sMap={priceE8sMap}
        />
      )}
    </>
  );
}

// ─── Resale Tab Content ───────────────────────────────────────────────────────

function ResaleTab({ priceE8sMap }: { priceE8sMap: Map<string, bigint> }) {
  const { data: listings = [], isLoading } = useGetActiveResaleListings();
  const { principal } = useAuth();
  const callerPrincipal = principal?.toText() ?? null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 6 }, (_, i) => `rs${i}`).map((k) => (
          <div
            key={k}
            className="rounded-xl bg-card border border-border overflow-hidden"
          >
            <Skeleton className="aspect-square w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
        data-ocid="resale-empty"
      >
        <div className="text-7xl mb-4">♻️</div>
        <h3 className="font-display font-semibold text-foreground text-xl mb-2">
          No resale listings yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          When plant NFT holders list their NFTs for resale, they'll appear
          here. Visit your profile to list one of your own.
        </p>
      </motion.div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      data-ocid="resale-listing-grid"
    >
      {listings.map((listing) => (
        <ResaleCard
          key={listing.id}
          listing={listing}
          callerPrincipal={callerPrincipal}
          priceE8sMap={priceE8sMap}
        />
      ))}
    </div>
  );
}

// ─── My Offers Row ────────────────────────────────────────────────────────────

function MyOfferRow({
  offer,
  priceE8sMap,
}: { offer: Offer; priceE8sMap: Map<string, bigint> }) {
  const cancelOffer = useCancelOffer();
  const acceptOffer = useAcceptOffer();
  const [counterOpen, setCounterOpen] = useState(false);

  const handleAcceptCounter = async () => {
    try {
      await acceptOffer.mutateAsync(offer.id);
      toast.success("Counter-offer accepted!");
    } catch {
      toast.error("Failed to accept counter-offer.");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelOffer.mutateAsync(offer.id);
      toast.success("Offer cancelled.");
    } catch {
      toast.error("Failed to cancel offer.");
    }
  };

  return (
    <>
      <div
        className="p-4 rounded-xl bg-card border border-border space-y-3"
        data-ocid="my-offer-row"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              NFT:{" "}
              <span className="font-mono text-primary/80">
                {offer.nft_id.slice(0, 16)}…
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatTokenAmount(
                offer.offered_amount,
                offer.offered_token as OfferTokenSymbol,
              )}
              {" · "}
              {formatIcpEquiv(offer.icp_equivalent)}
            </p>
          </div>
          <OfferStatusBadge status={offer.status} />
        </div>

        <OfferTimeline offer={offer} />

        <div className="flex gap-2 flex-wrap">
          {offer.status === OfferStatus.Pending && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={handleCancel}
              disabled={cancelOffer.isPending}
              data-ocid="offer-cancel-btn"
            >
              Cancel Offer
            </Button>
          )}
          {offer.status === OfferStatus.Countered && (
            <>
              <Button
                size="sm"
                className="h-7 text-xs bg-primary"
                data-ocid="offer-accept-btn"
                onClick={handleAcceptCounter}
                disabled={acceptOffer.isPending}
              >
                {acceptOffer.isPending ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                {acceptOffer.isPending ? "Accepting…" : "Accept Counter"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-border"
                onClick={() => setCounterOpen(true)}
                data-ocid="offer-counter-again-btn"
              >
                <ArrowLeftRight className="w-3 h-3" />
                Counter Again
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-destructive/30 text-destructive"
                onClick={handleCancel}
                disabled={cancelOffer.isPending}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
      {counterOpen && (
        <CounterOfferModal
          offerId={offer.id}
          onClose={() => setCounterOpen(false)}
          priceE8sMap={priceE8sMap}
        />
      )}
    </>
  );
}

// ─── Received Offer Row ───────────────────────────────────────────────────────

function ReceivedOfferRow({
  offer,
  priceE8sMap,
}: { offer: Offer; priceE8sMap: Map<string, bigint> }) {
  const acceptOffer = useAcceptOffer();
  const rejectOffer = useRejectOffer();
  const [counterOpen, setCounterOpen] = useState(false);

  const handleAccept = async () => {
    try {
      await acceptOffer.mutateAsync(offer.id);
      toast.success("Offer accepted! NFT transfer initiated.");
    } catch {
      toast.error("Failed to accept offer.");
    }
  };

  const handleReject = async () => {
    try {
      await rejectOffer.mutateAsync(offer.id);
      toast.success("Offer rejected.");
    } catch {
      toast.error("Failed to reject offer.");
    }
  };

  const canAct =
    offer.status === OfferStatus.Pending ||
    offer.status === OfferStatus.Countered;

  return (
    <>
      <div
        className="p-4 rounded-xl bg-card border border-border space-y-3"
        data-ocid="received-offer-row"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              From:{" "}
              <span className="font-mono text-muted-foreground">
                {truncatePrincipal(offer.buyer.toText())}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatTokenAmount(
                offer.offered_amount,
                offer.offered_token as OfferTokenSymbol,
              )}
              {" · "}
              {formatIcpEquiv(offer.icp_equivalent)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              NFT: {offer.nft_id.slice(0, 16)}…
            </p>
          </div>
          <OfferStatusBadge status={offer.status} />
        </div>

        <OfferTimeline offer={offer} />

        {canAct && (
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              className="h-7 text-xs bg-primary"
              onClick={handleAccept}
              disabled={acceptOffer.isPending}
              data-ocid="received-offer-accept-btn"
            >
              <CheckCircle2 className="w-3 h-3" />
              {acceptOffer.isPending ? "Accepting…" : "Accept"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-border"
              onClick={() => setCounterOpen(true)}
              data-ocid="received-offer-counter-btn"
            >
              <ArrowLeftRight className="w-3 h-3" />
              Counter
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-destructive/30 text-destructive"
              onClick={handleReject}
              disabled={rejectOffer.isPending}
              data-ocid="received-offer-reject-btn"
            >
              <XCircle className="w-3 h-3" />
              {rejectOffer.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        )}
      </div>
      {counterOpen && (
        <CounterOfferModal
          offerId={offer.id}
          onClose={() => setCounterOpen(false)}
          priceE8sMap={priceE8sMap}
        />
      )}
    </>
  );
}

// ─── Offers Tab ───────────────────────────────────────────────────────────────

function OffersTab({ priceE8sMap }: { priceE8sMap: Map<string, bigint> }) {
  const { isAuthenticated, login } = useAuth();
  const { data: myOffers = [], isLoading: loadingMine } = useGetMyOffers();
  const { data: received = [], isLoading: loadingReceived } =
    useGetOffersReceived();

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16" data-ocid="offers-auth-gate">
        <HandshakeIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-40" />
        <p className="font-semibold text-foreground mb-2">
          Sign in to view offers
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Connect your Internet Identity to send and manage offers.
        </p>
        <Button onClick={login} className="bg-primary">
          Connect with Internet Identity
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-ocid="offers-tab">
      {/* My Offers (as buyer) */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <HandshakeIcon className="w-4 h-4 text-primary" />
          My Offers
          {myOffers.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {myOffers.length}
            </Badge>
          )}
        </h3>
        {loadingMine ? (
          <div className="space-y-3">
            {[1, 2].map((k) => (
              <Skeleton key={k} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : myOffers.length === 0 ? (
          <div
            className="text-center py-10 rounded-xl bg-muted/10 border border-dashed border-border"
            data-ocid="my-offers-empty"
          >
            <p className="text-sm text-muted-foreground">
              No offers submitted yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Browse the Resale NFTs tab to make offers on listings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myOffers.map((o) => (
              <MyOfferRow key={o.id} offer={o} priceE8sMap={priceE8sMap} />
            ))}
          </div>
        )}
      </div>

      {/* Received Offers (as seller) */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-primary" />
          Offers Received
          {received.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {received.length}
            </Badge>
          )}
        </h3>
        {loadingReceived ? (
          <div className="space-y-3">
            {[1, 2].map((k) => (
              <Skeleton key={k} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : received.length === 0 ? (
          <div
            className="text-center py-10 rounded-xl bg-muted/10 border border-dashed border-border"
            data-ocid="received-offers-empty"
          >
            <p className="text-sm text-muted-foreground">
              No offers received yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              List one of your plant NFTs for resale to receive offers.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {received.map((o) => (
              <ReceivedOfferRow
                key={o.id}
                offer={o}
                priceE8sMap={priceE8sMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

function CartFloat({ hasMembership }: { hasMembership: boolean }) {
  const { items, itemCount, totalCents, removeItem, updateQuantity } =
    useCart();
  const [open, setOpen] = useState(false);
  const count = itemCount();
  const rawTotal = totalCents();
  const total = hasMembership ? (rawTotal * BigInt(9)) / BigInt(10) : rawTotal;

  if (count === 0 && !open) return null;

  return (
    <>
      <motion.button
        type="button"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-elevated hover:bg-primary/90 transition-smooth"
        data-ocid="cart-float-btn"
      >
        <ShoppingCart className="w-5 h-5" />
        <span className="font-display font-bold text-sm">{count}</span>
        <span className="text-sm">${(Number(total) / 100).toFixed(2)}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-card border-l border-border shadow-elevated flex flex-col"
            data-ocid="cart-sidebar"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="font-display font-bold text-foreground">
                  Cart ({count})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-smooth"
                aria-label="Close cart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.product_id.toString()}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border"
                  data-ocid="cart-sidebar-item"
                >
                  <div className="text-2xl flex-shrink-0">
                    {getProductEmoji(item.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.name}
                    </p>
                    {item.variety && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.variety}
                      </p>
                    )}
                    <p className="text-xs text-primary font-bold mt-0.5">
                      {hasMembership
                        ? formatPrice(
                            item.price_cents * BigInt(item.quantity),
                            true,
                          )
                        : `$${(Number(item.price_cents * BigInt(item.quantity)) / 100).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.product_id, item.quantity - 1)
                      }
                      className="w-6 h-6 rounded flex items-center justify-center bg-secondary hover:bg-muted transition-smooth"
                      aria-label="Decrease"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.product_id, item.quantity + 1)
                      }
                      className="w-6 h-6 rounded flex items-center justify-center bg-secondary hover:bg-muted transition-smooth"
                      aria-label="Increase"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product_id)}
                      className="w-6 h-6 ml-1 text-muted-foreground hover:text-destructive transition-smooth"
                      aria-label="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              {hasMembership && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    Member 10% discount applied
                  </span>
                  <span className="text-muted-foreground line-through">
                    ${(Number(rawTotal) / 100).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-foreground font-bold">
                <span>Total</span>
                <span className="text-primary">
                  ${(Number(total) / 100).toFixed(2)}
                </span>
              </div>
              <a href="/checkout" className="block">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  data-ocid="cart-checkout-btn"
                >
                  Proceed to Checkout
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm cursor-default"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          aria-label="Close cart"
        />
      )}
    </>
  );
}

// ─── Membership Card (multi-token pricing) ────────────────────────────────────

function MembershipPricingCard({
  membershipPrices,
  priceUpdated,
}: {
  membershipPrices: Record<string, bigint | null>;
  priceUpdated: string | null;
}) {
  const [selectedToken, setSelectedToken] = useState<OfferTokenSymbol>("ICP");
  const { isAuthenticated, login, principal } = useAuth();
  const issueMembership = useIssueMembership();

  function formatMembershipPrice(symbol: OfferTokenSymbol): string {
    const raw = membershipPrices[symbol];
    if (!raw) return "—";
    const dec = TOKEN_DECIMALS[symbol];
    const divisor = BigInt(10 ** Math.min(dec, 8));
    const whole = raw / divisor;
    const frac = (raw % divisor)
      .toString()
      .padStart(Math.min(dec, 8), "0")
      .slice(0, 4);
    return `${whole}.${frac} ${symbol}`;
  }

  const handlePurchase = async () => {
    if (!isAuthenticated || !principal) {
      login();
      return;
    }
    try {
      await issueMembership.mutateAsync({
        owner: principal,
        tier: MembershipTier.Standard,
        standard: NFTStandard.ICRC37,
      });
      toast.success(
        "🎉 Membership NFT purchased! Your lifetime discount is now active.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Purchase failed";
      toast.error(`Could not purchase membership: ${msg}`);
    }
  };

  return (
    <div
      className="p-5 rounded-xl bg-gradient-to-br from-primary/5 to-amber-500/5 border border-primary/20 space-y-4"
      data-ocid="membership-pricing-card"
    >
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5 text-amber-400" />
        <h3 className="font-display font-bold text-foreground">
          Membership NFT
        </h3>
        <Badge className="ml-auto bg-amber-900/50 text-amber-300 border-amber-700/50 border text-xs">
          Lifetime Discount
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        25 ICP base price — or pay with any supported token using live ICPSwap
        rates.
      </p>

      {/* Token price grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {OFFER_TOKENS.map((t) => {
          const cfg = TOKEN_DISPLAY[t];
          const isSelected = selectedToken === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedToken(t)}
              className={`p-2 rounded-lg border text-center transition-smooth ${
                isSelected
                  ? `${cfg.bgClass} ${cfg.borderClass} border`
                  : "bg-muted/20 border-border hover:border-primary/30"
              }`}
              data-ocid={`membership-token-${t}`}
            >
              <p className={`text-sm font-bold ${cfg.colorClass}`}>
                {cfg.symbol}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t}</p>
              <p
                className={`text-[10px] font-medium mt-1 ${isSelected ? cfg.colorClass : "text-muted-foreground"}`}
              >
                {formatMembershipPrice(t)}
              </p>
            </button>
          );
        })}
      </div>

      {priceUpdated && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <RefreshCw className="w-2.5 h-2.5" />
          Prices from ICPSwap · updated {priceUpdated}
        </p>
      )}

      <Button
        className="w-full bg-primary"
        onClick={handlePurchase}
        disabled={issueMembership.isPending}
        data-ocid="membership-buy-btn"
      >
        {issueMembership.isPending ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Processing…
          </>
        ) : !isAuthenticated ? (
          <>
            <Crown className="w-4 h-4" />
            Sign in to Purchase
          </>
        ) : (
          <>
            <Crown className="w-4 h-4" />
            Purchase with {selectedToken}
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Product Image Gallery (carousel) ────────────────────────────────────────

function ProductImageGallery({
  imageKeys,
  productName,
  category,
}: {
  imageKeys: string[];
  productName: string;
  category: string;
}) {
  const [current, setCurrent] = useState(0);

  if (imageKeys.length === 0) {
    return (
      <div className="aspect-video rounded-lg bg-secondary flex items-center justify-center text-6xl mb-4">
        {getProductEmoji(category)}
      </div>
    );
  }

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(imageKeys.length - 1, c + 1));

  return (
    <div className="mb-4 space-y-2">
      {/* Main carousel */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
        <img
          src={`/api/object-storage/${imageKeys[current]}`}
          alt={productName}
          className="w-full h-full object-cover"
        />
        {imageKeys.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={current === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 border border-border flex items-center justify-center text-foreground hover:bg-card transition-smooth disabled:opacity-30"
              aria-label="Previous"
              data-ocid="product-gallery-prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={current === imageKeys.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 border border-border flex items-center justify-center text-foreground hover:bg-card transition-smooth disabled:opacity-30"
              aria-label="Next"
              data-ocid="product-gallery-next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-card/80 border border-border text-xs text-foreground">
              {current + 1} of {imageKeys.length}
            </div>
          </>
        )}
      </div>
      {/* Thumbnail strip */}
      {imageKeys.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {imageKeys.map((key, idx) => (
            <button
              key={key}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-smooth ${idx === current ? "border-primary" : "border-border opacity-60 hover:opacity-100"}`}
              aria-label={`View ${productName} ${idx + 1}`}
              data-ocid={`product-thumb-${idx + 1}`}
            >
              <img
                src={`/api/object-storage/${key}`}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────

function ProductModal({
  product,
  hasMembership,
  onClose,
}: {
  product: Product;
  hasMembership: boolean;
  onClose: () => void;
}) {
  const addItem = useCart((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const imageKeys = getProductImageKeys(product);

  const handleAdd = () => {
    addItem({
      product_id: product.id,
      name: product.name,
      variety: product.variety,
      price_cents: product.price_cents,
      quantity: qty,
      category: product.category,
    });
    toast.success(`Added ${qty}× ${product.name} to cart`);
    onClose();
  };

  const displayPrice = hasMembership
    ? (Number(product.price_cents) / 100) * 0.9
    : Number(product.price_cents) / 100;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="bg-card border-border max-w-md"
        data-ocid="product-modal"
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="font-display text-foreground text-xl">
                {product.name}
              </DialogTitle>
              {product.variety && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {product.variety}
                </p>
              )}
            </div>
            <StageBadge category={product.category} />
          </div>
        </DialogHeader>

        {/* Gallery carousel */}
        <ProductImageGallery
          imageKeys={imageKeys}
          productName={product.name}
          category={product.category}
        />

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {product.description}
        </p>

        {hasMembership && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-700/30 mb-4">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300">
              Member discount applied — 10% off!
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-display font-bold text-primary">
              ${displayPrice.toFixed(2)}
            </p>
            {hasMembership && (
              <p className="text-xs text-muted-foreground line-through">
                ${(Number(product.price_cents) / 100).toFixed(2)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-smooth"
              aria-label="Decrease quantity"
              data-ocid="modal-qty-decrease"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-foreground">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(qty + 1)}
              className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-smooth"
              aria-label="Increase quantity"
              data-ocid="modal-qty-increase"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Button
          className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleAdd}
          data-ocid="modal-add-to-cart"
        >
          <ShoppingCart className="w-4 h-4" />
          Add {qty} to Cart — ${(displayPrice * qty).toFixed(2)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  hasMembership,
  onSelect,
}: {
  product: Product;
  hasMembership: boolean;
  onSelect: () => void;
}) {
  const addItem = useCart((s) => s.addItem);
  const imageKeys = getProductImageKeys(product);
  const firstImage = imageKeys[0];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      product_id: product.id,
      name: product.name,
      variety: product.variety,
      price_cents: product.price_cents,
      quantity: 1,
      category: product.category,
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const displayPrice = hasMembership
    ? (Number(product.price_cents) / 100) * 0.9
    : Number(product.price_cents) / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group rounded-xl bg-card border border-border overflow-hidden shadow-subtle hover:shadow-elevated hover:-translate-y-1 transition-smooth cursor-pointer"
      onClick={onSelect}
      data-ocid="product-card"
    >
      <div className="aspect-square bg-secondary flex items-center justify-center text-5xl relative overflow-hidden">
        {firstImage ? (
          <img
            src={`/api/object-storage/${firstImage}`}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          getProductEmoji(product.category)
        )}
        {imageKeys.length > 1 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-card/80 border border-border text-[10px] text-foreground">
            +{imageKeys.length - 1}
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StageBadge category={product.category} />
        </div>
        {hasMembership && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/50 text-amber-400 text-xs font-medium">
              <Sparkles className="w-2.5 h-2.5" />
              -10%
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <p className="font-display font-semibold text-foreground text-sm truncate">
              {product.name}
            </p>
            {product.variety && (
              <p className="text-xs text-muted-foreground truncate">
                {product.variety}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span className="font-bold text-primary text-sm">
              ${displayPrice.toFixed(2)}
            </span>
            {hasMembership && (
              <p className="text-xs text-muted-foreground line-through leading-none">
                ${(Number(product.price_cents) / 100).toFixed(2)}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {product.description}
        </p>
        <Button
          size="sm"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
          onClick={handleQuickAdd}
          data-ocid="product-add-to-cart"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add to Cart
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Skeleton Grid ────────────────────────────────────────────────────────────

function ProductGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => `sk${i}`).map((k) => (
        <div
          key={k}
          className="rounded-xl bg-card border border-border overflow-hidden"
        >
          <Skeleton className="aspect-square w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<TabValue>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const isResaleTab = activeTab === "resale";
  const isOffersTab = activeTab === "offers";
  const activeCategory =
    isResaleTab || isOffersTab ? null : (activeTab as ProductCategory | null);

  const { data: allProducts, isLoading: allLoading } = useProducts();
  const { data: catProducts, isLoading: catLoading } = useProductsByCategory(
    activeCategory ?? undefined,
  );
  const { data: hasMembership = false } = useHasMembership();
  const { data: tokenPrices = [], dataUpdatedAt } = useTokenPrices();
  const { data: membershipPrices = {} } = useMembershipPrices();

  const priceE8sMap = new Map<string, bigint>(
    tokenPrices.map((p) => [p.token as string, p.price_in_icp_e8s]),
  );

  const priceUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  const products = activeCategory ? catProducts : allProducts;
  const isLoading = activeCategory ? catLoading : allLoading;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="w-7 h-7 text-primary" />
          <h1 className="font-display font-bold text-3xl text-foreground">
            The <span className="text-fire">Spicy</span> Shop
          </h1>
        </div>
        <p className="text-muted-foreground ml-10">
          Rare chili plants at every growth stage — plus artisan smoked spices,
          garden inputs &amp; resale NFTs with rarity discounts.
        </p>
      </div>

      {/* Member discount notice */}
      {hasMembership && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-amber-950/30 border border-amber-700/30 mb-6"
          data-ocid="member-discount-banner"
        >
          <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">
              Member Pricing Active
            </p>
            <p className="text-xs text-amber-400/80">
              Your loyalty discount is applied to all prices below.
            </p>
          </div>
          <Badge className="ml-auto bg-amber-900/50 text-amber-300 border-amber-700/50 border text-xs">
            -10% OFF
          </Badge>
        </motion.div>
      )}

      {/* Resale info banner */}
      {isResaleTab && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-cyan-950/30 border border-cyan-700/30 mb-6"
          data-ocid="resale-info-banner"
        >
          <ArrowLeftRight className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-cyan-300">
              Plant NFT Resale Market
            </p>
            <p className="text-xs text-cyan-400/80">
              Buy NFTs directly from other holders. The rarity tier discount
              transfers to you immediately upon purchase.
            </p>
          </div>
        </motion.div>
      )}

      {/* Category filter tabs */}
      <div
        className="flex items-center gap-1.5 flex-wrap mb-8 p-1 rounded-xl bg-secondary/40 border border-border w-fit"
        data-ocid="marketplace-filter"
      >
        {CATEGORIES.map(({ label, emoji, value, price }) => (
          <button
            type="button"
            key={label}
            onClick={() => setActiveTab(value)}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth",
              activeTab === value
                ? "bg-primary text-primary-foreground shadow-subtle"
                : "text-muted-foreground hover:text-foreground hover:bg-card",
            ].join(" ")}
            data-ocid="marketplace-filter-tab"
          >
            <span>{emoji}</span>
            <span>{label}</span>
            {price && (
              <span
                className={`text-xs opacity-70 ${activeTab === value ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
                {price}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      {isOffersTab ? (
        <OffersTab priceE8sMap={priceE8sMap} />
      ) : isResaleTab ? (
        <ResaleTab priceE8sMap={priceE8sMap} />
      ) : isLoading ? (
        <ProductGrid />
      ) : products && products.length > 0 ? (
        <div className="space-y-10">
          {/* Membership pricing card — show prominently */}
          {(activeTab === null || activeTab === null) && (
            <MembershipPricingCard
              membershipPrices={membershipPrices}
              priceUpdated={priceUpdated}
            />
          )}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            data-ocid="product-list"
          >
            {products.map((p) => (
              <ProductCard
                key={p.id.toString()}
                product={p}
                hasMembership={hasMembership}
                onSelect={() => setSelectedProduct(p)}
              />
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
          data-ocid="marketplace-empty"
        >
          <div className="text-7xl mb-4">🌶️</div>
          <h3 className="font-display font-semibold text-foreground text-xl mb-2">
            No products in this category
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-6">
            Our next harvest is incoming. Check back soon for fresh chili
            plants!
          </p>
          <Button
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setActiveTab(null)}
          >
            View all products
          </Button>
        </motion.div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          hasMembership={hasMembership}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Floating cart */}
      {!isResaleTab && !isOffersTab && (
        <CartFloat hasMembership={hasMembership} />
      )}
    </div>
  );
}
