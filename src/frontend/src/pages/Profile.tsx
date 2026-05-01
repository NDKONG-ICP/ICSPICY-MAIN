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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Award,
  CheckCircle,
  ChevronRight,
  Coins,
  Crown,
  Edit2,
  ExternalLink,
  Flame,
  Gem,
  Save,
  Shield,
  Sparkles,
  Star,
  Tag,
  User,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { PlantPublic, ResaleListingPublic } from "../backend";
import { RarityTier } from "../backend";
import { useActorReady } from "../hooks/useActorReady";
import { useAuth } from "../hooks/useAuth";
import {
  useCancelResaleListing,
  useGetMyResaleListings,
  useIsAdmin,
  useListNFTForResale,
  useMembership,
  useMyOrders,
  useMyPlants,
  useProfile,
  useSaveProfile,
} from "../hooks/useBackend";
import { MembershipTier } from "../types/index";

// ─── Rarity helpers ───────────────────────────────────────────────────────────

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
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/30",
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

function formatStage(stage: string): string {
  const map: Record<string, string> = {
    Seed: "🌱 Seed",
    Seedling: "🪴 Seedling",
    Mature: "🌶️ Mature",
  };
  return map[stage] ?? stage;
}

// ─── Composite NFT Artwork ────────────────────────────────────────────────────

function CompositeNFTArtwork({
  rarityTier,
  size = "md",
}: {
  rarityTier: RarityTier;
  size?: "sm" | "md" | "lg";
}) {
  const cfg = RARITY_CONFIG[rarityTier];
  const sizeClass =
    size === "lg" ? "w-32 h-32" : size === "md" ? "w-20 h-20" : "w-12 h-12";

  return (
    <div
      className={`${sizeClass} rounded-xl overflow-hidden border-2 ${cfg.borderClass} flex-shrink-0 shadow-elevated`}
      aria-label={`${cfg.label} rarity NFT composite artwork`}
    >
      <div className="w-full h-full flex flex-col">
        {cfg.gradientColors.map((color) => (
          <div
            key={color}
            className="w-full flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── List for Resale Modal ────────────────────────────────────────────────────

function ListForResaleModal({
  plant,
  onClose,
}: {
  plant: PlantPublic;
  onClose: () => void;
}) {
  const [price, setPrice] = useState("1.0");
  const listMutation = useListNFTForResale();
  const rarityTier = getRarityFromNftId(plant.nft_id ?? "");
  const cfg = RARITY_CONFIG[rarityTier];

  const handleConfirm = async () => {
    const priceNum = Number.parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0.01) {
      toast.error("Minimum price is 0.01 ICP.");
      return;
    }
    try {
      const result = await listMutation.mutateAsync({
        plantId: plant.id,
        priceIcp: priceNum,
      });
      if (result && "__kind__" in result && result.__kind__ === "err") {
        toast.error(String((result as { __kind__: "err"; err: string }).err));
        return;
      }
      toast.success(`Plant NFT listed for ${priceNum.toFixed(3)} ICP!`);
      onClose();
    } catch {
      toast.error("Failed to list NFT. Please try again.");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="bg-card border-border max-w-sm"
        data-ocid="list-resale-modal"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            List NFT for Resale
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/40 border border-border mb-4">
          <CompositeNFTArtwork rarityTier={rarityTier} size="sm" />
          <div className="min-w-0">
            <p className="font-display font-semibold text-foreground text-sm truncate">
              {plant.common_name ?? plant.variety}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatStage(plant.stage)}
            </p>
            <Badge
              variant="outline"
              className={`mt-1 text-[10px] px-1.5 h-4 border ${cfg.borderClass} ${cfg.bgClass} ${cfg.colorClass} font-bold flex items-center gap-0.5 w-fit`}
            >
              {cfg.icon}
              {cfg.label} — {cfg.discountPct}% discount transfers
            </Badge>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
          <p className="text-xs text-primary/90">
            The rarity discount ({cfg.discountPct}%) will transfer to the buyer
            automatically upon purchase.
          </p>
        </div>

        <div className="space-y-2 mb-5">
          <Label htmlFor="resale-price" className="text-sm font-medium">
            Price (ICP)
          </Label>
          <Input
            id="resale-price"
            type="number"
            min="0.01"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1.00"
            className="h-11"
            data-ocid="resale-price-input"
          />
          <p className="text-xs text-muted-foreground">Minimum 0.01 ICP</p>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleConfirm}
            disabled={listMutation.isPending}
            data-ocid="resale-confirm-btn"
          >
            <Tag className="w-4 h-4" />
            {listMutation.isPending ? "Listing…" : "Confirm Listing"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-border">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── My NFTs Tab ──────────────────────────────────────────────────────────────

function MyNFTsTab() {
  const { data: myPlants = [], isLoading: plantsLoading } = useMyPlants();
  const { data: myListings = [], isLoading: listingsLoading } =
    useGetMyResaleListings();
  const cancelMutation = useCancelResaleListing();
  const [listingPlant, setListingPlant] = useState<PlantPublic | null>(null);
  const navigate = useNavigate();

  const nftPlants = myPlants.filter((p) => p.nft_id);

  const listingByPlantId = (myListings as ResaleListingPublic[]).reduce<
    Record<string, ResaleListingPublic>
  >((acc, l) => {
    acc[l.plant_id.toString()] = l;
    return acc;
  }, {});

  const isLoading = plantsLoading || listingsLoading;

  const handleDelist = async (listingId: string) => {
    try {
      const result = await cancelMutation.mutateAsync(listingId);
      if (result && "__kind__" in result && result.__kind__ === "err") {
        toast.error(String((result as { __kind__: "err"; err: string }).err));
        return;
      }
      toast.success("Listing cancelled. NFT is now Holding.");
    } catch {
      toast.error("Failed to cancel listing.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((k) => (
          <Skeleton key={k} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (nftPlants.length === 0) {
    return (
      <div
        className="rounded-xl bg-muted/30 border border-dashed border-border p-8 text-center"
        data-ocid="my-nfts-empty"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <ArrowLeftRight className="w-6 h-6 text-primary/60" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          No Plant NFTs to List
        </p>
        <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
          Claim a plant NFT from the nursery or marketplace to start listing on
          the resale market.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-border"
          onClick={() => navigate({ to: "/marketplace" })}
        >
          Browse Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-ocid="my-nfts-grid">
      {nftPlants.map((plant) => {
        const rarityTier = getRarityFromNftId(plant.nft_id ?? "");
        const cfg = RARITY_CONFIG[rarityTier];
        const listing = listingByPlantId[plant.id.toString()];
        const isListed = !!listing;

        return (
          <motion.div
            key={plant.id.toString()}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl bg-card border ${cfg.borderClass} p-5 flex gap-4`}
            data-ocid="my-nft-card"
          >
            <CompositeNFTArtwork rarityTier={rarityTier} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="font-display font-bold text-foreground text-sm leading-tight truncate">
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
                  className={`text-[10px] px-1.5 py-0 h-4 border ${cfg.borderClass} ${cfg.bgClass} ${cfg.colorClass} font-bold flex items-center gap-0.5 flex-shrink-0`}
                >
                  {cfg.icon}
                  {cfg.label}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <span>{formatStage(plant.stage)}</span>
                <span>·</span>
                <span
                  className={`font-semibold ${cfg.colorClass} flex items-center gap-0.5`}
                >
                  <Gem className="w-3 h-3" />
                  {cfg.discountPct}% Discount
                </span>
              </div>

              {/* Status + action row */}
              {isListed ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-700/40 text-cyan-300 font-semibold">
                    Listed at {listing.price_icp.toFixed(3)} ICP
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelist(listing.id)}
                    disabled={cancelMutation.isPending}
                    data-ocid="delist-btn"
                  >
                    <X className="w-3 h-3" />
                    Delist
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 border border-border text-muted-foreground">
                    Holding
                  </span>
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => setListingPlant(plant)}
                    data-ocid="list-resale-btn"
                  >
                    <Tag className="w-3 h-3" />
                    List for Resale
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {listingPlant && (
        <ListForResaleModal
          plant={listingPlant}
          onClose={() => setListingPlant(null)}
        />
      )}
    </div>
  );
}

// ─── NFT Collection Section ───────────────────────────────────────────────────

function NFTCollectionSection() {
  const { data: myPlants = [], isLoading } = useMyPlants();
  const navigate = useNavigate();
  const nftPlants = myPlants.filter((p) => p.nft_id);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl bg-card border border-border p-6 shadow-subtle"
      data-ocid="nft-collection-section"
    >
      <div className="flex items-center gap-2 mb-5">
        <Gem className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg text-foreground">
          NFT Collection
        </h2>
        {nftPlants.length > 0 && (
          <Badge className="ml-auto bg-primary/15 text-primary border-primary/30 text-xs">
            {nftPlants.length} Plant{nftPlants.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {nftPlants.length === 0 ? (
        <div
          className="rounded-xl bg-muted/30 border border-dashed border-border p-6 text-center"
          data-ocid="nft-collection-empty"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Gem className="w-6 h-6 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            No Plant NFTs Yet
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
            Claim a plant NFT by scanning a QR label at the nursery or from the
            marketplace. NFT holders get a lifetime storewide discount based on
            rarity tier.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
            {(Object.values(RarityTier) as RarityTier[]).map((tier) => {
              const tc = RARITY_CONFIG[tier];
              return (
                <div
                  key={tier}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${tc.borderClass} ${tc.bgClass} ${tc.colorClass}`}
                >
                  {tc.icon}
                  {tc.label} — {tc.discountPct}% off
                </div>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            onClick={() => navigate({ to: "/marketplace" })}
          >
            Browse Marketplace
          </Button>
        </div>
      ) : (
        <div className="space-y-3" data-ocid="nft-collection-grid">
          {nftPlants.map((plant) => (
            <NFTPlantCard key={plant.id.toString()} plant={plant} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NFT Plant Card ───────────────────────────────────────────────────────────

function NFTPlantCard({ plant }: { plant: PlantPublic }) {
  const rarityTier = getRarityFromNftId(plant.nft_id ?? "");
  const cfg = RARITY_CONFIG[rarityTier];
  const plantingDate = plant.planting_date
    ? new Date(Number(plant.planting_date) / 1_000_000).toLocaleDateString()
    : "Unknown";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-card border ${cfg.borderClass} p-5 flex gap-4 hover:shadow-elevated transition-smooth`}
      data-ocid="nft-plant-card"
    >
      <CompositeNFTArtwork rarityTier={rarityTier} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <p className="font-display font-bold text-foreground text-sm leading-tight truncate">
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
            className={`text-[10px] px-1.5 py-0 h-4 border ${cfg.borderClass} ${cfg.bgClass} ${cfg.colorClass} font-bold flex items-center gap-0.5`}
          >
            {cfg.icon}
            {cfg.label}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">
            {formatStage(plant.stage)}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span
            className={`text-xs font-semibold ${cfg.colorClass} flex items-center gap-0.5`}
          >
            <Gem className="w-3 h-3" />
            {cfg.discountPct}% Lifetime Discount
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground mb-3">
          <span>Planted: {plantingDate}</span>
          {plant.genetics && (
            <span className="truncate">Genetics: {plant.genetics}</span>
          )}
        </div>
        {plant.nft_id && (
          <p className="text-[10px] font-mono text-muted-foreground truncate mb-2">
            NFT: {plant.nft_id}
          </p>
        )}
        <Link
          to="/nims"
          className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg.colorClass} hover:opacity-80 transition-smooth`}
        >
          <ExternalLink className="w-3 h-3" />
          View in NIMS
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Wallet section ───────────────────────────────────────────────────────────

const WALLET_TOKENS = [
  { symbol: "ICP", name: "Internet Computer", icon: "⚡" },
  { symbol: "ckBTC", name: "Wrapped Bitcoin", icon: "₿" },
  { symbol: "ckETH", name: "Wrapped Ethereum", icon: "Ξ" },
  { symbol: "ckUSDC", name: "USD Coin", icon: "$" },
] as const;

function WalletSection() {
  return (
    <div
      className="rounded-2xl bg-card border border-border p-6"
      data-ocid="wallet-section"
    >
      <div className="flex items-center gap-2 mb-5">
        <Coins className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg text-foreground">
          Token Wallet
        </h2>
        <Badge variant="secondary" className="ml-auto text-xs">
          Coming Soon
        </Badge>
      </div>
      <div className="space-y-3">
        {WALLET_TOKENS.map((token) => (
          <div
            key={token.symbol}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">{token.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {token.symbol}
                </p>
                <p className="text-xs text-muted-foreground">{token.name}</p>
              </div>
            </div>
            <p className="font-mono text-sm text-muted-foreground">0.000</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground text-center">
        Connect wallet to view balances and transaction history
      </p>
    </div>
  );
}

// ─── Membership section ───────────────────────────────────────────────────────

function MembershipSection() {
  const { data: membership, isLoading } = useMembership();
  const navigate = useNavigate();

  if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;

  if (membership) {
    const issuedDate = new Date(
      Number(membership.issued_at) / 1_000_000,
    ).toLocaleDateString();
    return (
      <div
        className="rounded-2xl bg-card border border-primary/30 p-6"
        data-ocid="membership-active"
      >
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg text-foreground">
            Membership NFT
          </h2>
          <Badge className="ml-auto bg-primary/15 text-primary border-primary/30 text-xs">
            Active
          </Badge>
        </div>
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-display font-bold text-foreground">
                {membership.tier === MembershipTier.Premium
                  ? "🔥 Premium"
                  : "🌶 Standard"}{" "}
                Member
              </p>
              <p className="text-xs text-muted-foreground">
                Issued {issuedDate} · {membership.nft_standard}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {[
            "10% discount on all purchases",
            "DAO voting access",
            "Exclusive member plant drops",
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl bg-card border border-border p-6"
      data-ocid="membership-cta"
    >
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-display font-semibold text-lg text-foreground">
          Membership NFT
        </h2>
      </div>
      <div className="rounded-xl bg-muted/40 border border-border p-4 mb-4">
        <p className="text-sm font-semibold text-foreground mb-3">
          Become an IC SPICY Member
        </p>
        <div className="space-y-2">
          {[
            "10% discount on all purchases",
            "DAO governance voting rights",
            "Support without taking physical custody",
            "Exclusive member-only plant drops",
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-sm">
              <ChevronRight className="w-3 h-3 text-primary shrink-0" />
              <span className="text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
      <Button
        className="w-full bg-primary font-semibold"
        data-ocid="membership-become-btn"
        onClick={() => navigate({ to: "/marketplace" })}
      >
        <Award className="w-4 h-4 mr-2" />
        Become a Member
      </Button>
    </div>
  );
}

// ─── Onboarding form ──────────────────────────────────────────────────────────

function OnboardingForm() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const saveProfile = useSaveProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }
    try {
      await saveProfile.mutateAsync({ username: username.trim(), bio });
      toast.success("Welcome to IC SPICY! 🌶️");
    } catch {
      toast.error("Failed to create profile. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[70vh] flex items-center justify-center"
      data-ocid="onboarding-container"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/40 mb-4">
            <Flame className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            Welcome to <span className="text-fire">IC SPICY</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Create your profile to join our community of chili enthusiasts,
            track rare plants, and access exclusive DAO features.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-card border border-border p-7 shadow-elevated space-y-5"
          data-ocid="onboarding-form"
        >
          <div className="space-y-2">
            <Label htmlFor="ob-username" className="text-sm font-medium">
              Username <span className="text-primary">*</span>
            </Label>
            <Input
              id="ob-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. spicy_grower"
              className="h-11"
              maxLength={32}
              required
              data-ocid="onboarding-username-input"
            />
            <p className="text-xs text-muted-foreground">
              Visible to the community. Max 32 characters.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-bio" className="text-sm font-medium">
              Bio <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="ob-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about your chili growing passion…"
              className="resize-none text-sm"
              rows={3}
              maxLength={256}
              data-ocid="onboarding-bio-input"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-primary font-semibold"
            disabled={saveProfile.isPending || !username.trim()}
            data-ocid="onboarding-submit-btn"
          >
            {saveProfile.isPending ? (
              "Creating profile…"
            ) : (
              <>
                <Flame className="w-4 h-4 mr-2" />
                Join IC SPICY
              </>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}

// ─── Profile tabs ─────────────────────────────────────────────────────────────

type ProfileTab = "overview" | "my-nfts";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { isAuthenticated, login, principal, isInitializing } = useAuth();
  const { actorReady } = useActorReady();
  const { data: profile, isPending: isProfilePending } = useProfile();
  const { data: isAdmin, isPending: isAdminPending } = useIsAdmin();
  const { data: orders } = useMyOrders();
  const saveProfile = useSaveProfile();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  // Always log current state so we can see what's happening in the console
  console.log("[ProfilePage]", {
    principal: principal?.toText() ?? "anon",
    isAuthenticated,
    isInitializing,
    actorReady,
    isAdmin,
    isAdminPending,
    isProfilePending,
    hasProfile: !!profile,
  });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio);
    }
  }, [profile]);

  const startEdit = () => {
    setUsername(profile?.username ?? "");
    setBio(profile?.bio ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }
    try {
      await saveProfile.mutateAsync({ username: username.trim(), bio });
      toast.success("Profile updated!");
      setEditing(false);
    } catch {
      toast.error("Failed to save profile.");
    }
  };

  // While II is initializing (restoring from Chrome redirect), show a loader
  // rather than the "Sign in" prompt — we don't yet know if the user is authenticated.
  if (isInitializing) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="flex flex-col items-center justify-center py-28 text-center"
        data-ocid="profile-unauthenticated"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-primary" />
        </div>
        <h2 className="font-display font-bold text-2xl text-foreground mb-2">
          Sign in to view your profile
        </h2>
        <p className="text-muted-foreground text-sm mb-8 max-w-sm">
          Use Internet Identity to securely access your IC SPICY account, track
          your plants, and join the community.
        </p>
        <Button
          onClick={login}
          className="bg-primary h-11 px-8 font-semibold"
          data-ocid="profile-login-btn"
        >
          <Flame className="w-4 h-4 mr-2" />
          Connect with Internet Identity
        </Button>
      </div>
    );
  }

  // isAdmin is now synchronous — no async pending state needed for it.
  // isPending is only true while Internet Identity is initializing.
  //
  // isStillLoading: wait for ALL of:
  //   1. isInitializing=false  — II has finished restoring from IndexedDB (Chrome redirect)
  //   2. isAdminPending=false  — principal is known (== isInitializing=false, safety net)
  //   3. actorReady=true       — actor HttpAgent confirmed using authenticated identity
  //   4. isProfilePending=false — profile query has returned at least once
  //
  // CHROME FIX: We MUST include isInitializing here. Without it, the component
  // can render during the brief window after redirect where II is restoring from
  // IndexedDB — principal is not yet known, so actorReady=false and the component
  // might see profile=null and jump to OnboardingForm.
  const isStillLoading =
    isInitializing || isAdminPending || !actorReady || isProfilePending;

  if (isAuthenticated && isStillLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  // Admin bypass — never show onboarding to the owner, even if profile is null.
  // Only applies once BOTH checks have completed (isPending=false for both).
  // isAdminPending=false here means we have a definitive result from the backend.
  if (!profile && isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[70vh] flex items-center justify-center"
        data-ocid="admin-profile-fallback"
      >
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/40 mb-6">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            Welcome back, <span className="text-fire">Admin</span>
          </h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-xs mx-auto">
            You're signed in as the nursery owner. Head to the Admin panel to
            manage the platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="bg-primary font-semibold h-11 px-8"
              onClick={() => navigate({ to: "/admin" })}
              data-ocid="admin-fallback-goto-admin"
            >
              <Crown className="w-4 h-4 mr-2" />
              Go to Admin Panel
            </Button>
            <Button
              variant="outline"
              className="h-11 border-border"
              onClick={() => navigate({ to: "/" })}
              data-ocid="admin-fallback-goto-home"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!profile) return <OnboardingForm />;

  const memberSince = new Date(
    Number(profile.created_at) / 1_000_000,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-2xl mx-auto" data-ocid="profile-page">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground">
            My <span className="text-fire">Profile</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Member since {memberSince}
          </p>
        </div>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={startEdit}
            className="border-border"
            data-ocid="profile-edit-btn"
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Edit Profile
          </Button>
        )}
      </motion.div>

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 border border-border w-fit mb-6"
        data-ocid="profile-tabs"
      >
        {[
          {
            id: "overview" as const,
            label: "Overview",
            icon: <User className="w-3.5 h-3.5" />,
          },
          {
            id: "my-nfts" as const,
            label: "My NFTs",
            icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
          },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth",
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-subtle"
                : "text-muted-foreground hover:text-foreground hover:bg-card",
            ].join(" ")}
            data-ocid={`profile-tab-${id}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-5"
      >
        {activeTab === "my-nfts" ? (
          <div
            className="rounded-2xl bg-card border border-border p-6 shadow-subtle"
            data-ocid="my-nfts-section"
          >
            <div className="flex items-center gap-2 mb-5">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-lg text-foreground">
                My NFTs
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              List your plant NFTs for resale on the marketplace. The rarity
              discount transfers to the buyer upon purchase.
            </p>
            <MyNFTsTab />
          </div>
        ) : (
          <>
            {/* Profile card */}
            <div
              className="rounded-2xl bg-card border border-border p-6 shadow-subtle"
              data-ocid="profile-card"
            >
              <div className="flex items-start gap-5 mb-5">
                <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center shrink-0">
                  <User className="w-9 h-9 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-username" className="text-xs">
                          Username
                        </Label>
                        <Input
                          id="edit-username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="your_username"
                          className="h-9 text-sm"
                          maxLength={32}
                          data-ocid="profile-username-input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-bio" className="text-xs">
                          Bio
                        </Label>
                        <Textarea
                          id="edit-bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell the community about yourself…"
                          className="text-sm resize-none"
                          rows={3}
                          maxLength={256}
                          data-ocid="profile-bio-input"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={saveProfile.isPending || !username.trim()}
                          className="bg-primary"
                          data-ocid="profile-save-btn"
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          {saveProfile.isPending ? "Saving…" : "Save Changes"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(false)}
                          data-ocid="profile-cancel-btn"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display font-bold text-xl text-foreground">
                          {profile.username}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-1 truncate max-w-xs">
                        {principal?.toText().slice(0, 28)}…
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Number(profile.follower_count)} follower
                        {Number(profile.follower_count) !== 1 ? "s" : ""}
                      </p>
                      {profile.bio ? (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                          {profile.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic mt-3">
                          No bio yet. Add one to tell the community about
                          yourself!
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* NFT Collection */}
            <NFTCollectionSection />

            {/* Membership */}
            <MembershipSection />

            {/* Wallet */}
            <WalletSection />

            {/* Orders */}
            <div
              className="rounded-2xl bg-card border border-border p-6 shadow-subtle"
              data-ocid="profile-orders-section"
            >
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">
                Recent Orders
              </h2>
              {orders && orders.length > 0 ? (
                <div className="space-y-0" data-ocid="profile-orders">
                  {orders.slice(0, 5).map((order, i) => (
                    <div key={order.id.toString()}>
                      {i > 0 && <Separator className="my-3" />}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Order #{order.id.toString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.items.length} item
                            {order.items.length !== 1 ? "s" : ""} ·{" "}
                            {order.pickup ? "Local pickup" : "Shipping"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-primary font-bold">
                            ${(Number(order.total_cents) / 100).toFixed(2)}
                          </p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="text-center py-8"
                  data-ocid="profile-orders-empty"
                >
                  <p className="text-sm text-muted-foreground">
                    No orders yet.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-border"
                    onClick={() => navigate({ to: "/marketplace" })}
                  >
                    Browse the Marketplace
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
