import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Flame,
  Gift,
  KeyRound,
  Leaf,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RarityTier } from "../backend";
import type {
  BatchGiftPackPublic,
  ClaimTokenPublic,
  PlantId,
} from "../backend";
import { useAuth } from "../hooks/useAuth";
import {
  useGetBatchGiftPack,
  useGetClaimToken,
  useRedeemBatchClaim,
  useRedeemClaim,
} from "../hooks/useBackend";

// ─── Rarity Config ────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<
  RarityTier,
  {
    label: string;
    discount: string;
    discountPct: number;
    badgeClass: string;
    glowClass: string;
    layerHues: number[];
    stars: number;
  }
> = {
  [RarityTier.Common]: {
    label: "Common",
    discount: "10%",
    discountPct: 10,
    badgeClass:
      "text-emerald-300 border-emerald-500/50 bg-emerald-500/15 shadow-[0_0_12px_rgba(52,211,153,0.25)]",
    glowClass: "shadow-[0_0_60px_rgba(52,211,153,0.15)]",
    layerHues: [142, 158, 140, 162, 135, 155, 145, 150, 138, 165],
    stars: 1,
  },
  [RarityTier.Uncommon]: {
    label: "Uncommon",
    discount: "12%",
    discountPct: 12,
    badgeClass:
      "text-blue-300 border-blue-500/50 bg-blue-500/15 shadow-[0_0_12px_rgba(96,165,250,0.25)]",
    glowClass: "shadow-[0_0_60px_rgba(96,165,250,0.15)]",
    layerHues: [220, 230, 210, 240, 215, 225, 235, 218, 228, 212],
    stars: 2,
  },
  [RarityTier.Rare]: {
    label: "Rare",
    discount: "15%",
    discountPct: 15,
    badgeClass:
      "text-amber-300 border-amber-500/50 bg-amber-500/15 shadow-[0_0_12px_rgba(251,191,36,0.3)]",
    glowClass: "shadow-[0_0_60px_rgba(251,191,36,0.2)]",
    layerHues: [45, 38, 50, 35, 55, 42, 48, 40, 52, 36],
    stars: 3,
  },
};

// Derive rarity tier from a percentage
function rarityFromPct(pct: number): RarityTier {
  if (pct >= 15) return RarityTier.Rare;
  if (pct >= 12) return RarityTier.Uncommon;
  return RarityTier.Common;
}

// ─── Claim Steps ──────────────────────────────────────────────────────────────

const CLAIM_STEPS = [
  "Generating your composite NFT artwork…",
  "Minting your NFT on the Internet Computer…",
  "Adding discount to your wallet…",
  "Done!",
];

const BATCH_CLAIM_STEPS = [
  "Verifying gift pack contents…",
  "Minting all plant NFTs on ICP…",
  "Activating lifetime discount…",
  "Done!",
];

// ─── NFT Composite Artwork Visualizer ────────────────────────────────────────

function NFTComposite({
  rarity,
  animated = false,
  compact = false,
}: {
  rarity: (typeof RARITY_CONFIG)[RarityTier];
  animated?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative w-full ${compact ? "aspect-[4/3]" : "aspect-square"} rounded-xl overflow-hidden border border-border bg-background`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
      {rarity.layerHues.map((hue, i) => {
        const opacity = animated ? 0.6 - i * 0.03 : 0.55 - i * 0.03;
        const delay = animated ? i * 0.08 : 0;
        return (
          <motion.div
            key={`layer-hue-${hue}`}
            initial={animated ? { scaleX: 0, opacity: 0 } : false}
            animate={animated ? { scaleX: 1, opacity } : { opacity }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            className="absolute left-0 right-0"
            style={{
              top: `${i * 10}%`,
              height: "12%",
              background: `linear-gradient(90deg, oklch(${0.55 + i * 0.025} 0.18 ${hue}) 0%, oklch(${0.65 + i * 0.02} 0.22 ${hue + 15}) 50%, oklch(${0.5 + i * 0.02} 0.14 ${hue - 10}) 100%)`,
              opacity,
              borderRadius: "2px",
            }}
          />
        );
      })}
      <motion.div
        animate={
          animated ? { scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] } : {}
        }
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 2.5,
          ease: "easeInOut",
        }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="w-12 h-12 rounded-full blur-2xl"
          style={{
            background: `oklch(0.6 0.25 ${rarity.layerHues[0]})`,
            opacity: 0.5,
          }}
        />
      </motion.div>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <span className="text-[8px] font-display font-bold tracking-[0.2em] uppercase opacity-50 text-foreground">
          IC SPICY · RWA
        </span>
      </div>
      <div className="absolute top-1.5 right-1.5">
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border backdrop-blur-sm ${rarity.badgeClass}`}
        >
          {rarity.label}
        </span>
      </div>
    </div>
  );
}

// ─── Confetti Particles ───────────────────────────────────────────────────────

function ConfettiParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: `p-${i}`,
    left: `${10 + ((i * 37 + 7) % 80)}%`,
    hue: (i * 53) % 360,
    lum: 0.6 + (i % 4) * 0.075,
    yEnd: 500 + (i % 5) * 40,
    rotate: (i % 2 === 0 ? 1 : -1) * (120 + (i % 7) * 60),
    duration: 2 + (i % 5) * 0.3,
    delay: (i % 8) * 0.1,
    scale: 0.4 + (i % 5) * 0.16,
    xDrift: (i % 2 === 0 ? 1 : -1) * (20 + (i % 6) * 10),
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map(
        ({
          id,
          left,
          hue,
          lum,
          yEnd,
          rotate,
          duration,
          delay,
          scale,
          xDrift,
        }) => (
          <motion.div
            key={id}
            className="absolute w-2 h-2 rounded-sm"
            style={{
              left,
              top: "-8px",
              background: `oklch(${lum} 0.25 ${hue})`,
            }}
            initial={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ y: yEnd, opacity: [1, 1, 0], rotate, scale, x: xDrift }}
            transition={{ duration, delay, ease: "easeIn" }}
          />
        ),
      )}
    </div>
  );
}

// ─── Pulse Ring ───────────────────────────────────────────────────────────────

function PulseRing({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{ borderColor: color }}
          initial={{ width: 60, height: 60, opacity: 0.6 }}
          animate={{ width: 200, height: 200, opacity: 0 }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.66,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseClaimData(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function formatTimestamp(ts: bigint | undefined): string {
  if (!ts) return "—";
  const ms = Number(ts / 1_000_000n);
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function rarityColorClass(label: string): string {
  if (label === "Rare") return "text-amber-300";
  if (label === "Uncommon") return "text-blue-300";
  return "text-emerald-300";
}

function rarityPulseColor(label: string): string {
  if (label === "Rare") return "oklch(0.8 0.25 45)";
  if (label === "Uncommon") return "oklch(0.7 0.2 220)";
  return "oklch(0.7 0.2 142)";
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <div className="space-y-4 p-6" data-ocid="claim-loading">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-5 w-2/3 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-5/6 rounded-lg" />
      <Skeleton className="h-12 w-full rounded-xl mt-2" />
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center gap-4 p-8 text-center"
      data-ocid="claim-error"
    >
      <div className="w-16 h-16 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="font-display font-bold text-lg text-foreground">
          {message}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Please ask the nursery for a valid claim token or visit our shop.
        </p>
      </div>
      <Link to="/marketplace" data-ocid="claim-error-shop-btn">
        <Button variant="outline" className="mt-2">
          <ShoppingBag className="w-4 h-4 mr-2" />
          Browse Our Shop
        </Button>
      </Link>
    </div>
  );
}

function AlreadyClaimedView() {
  return (
    <div
      className="flex flex-col items-center gap-4 p-8 text-center"
      data-ocid="claim-already-redeemed"
    >
      <div className="w-16 h-16 rounded-full bg-muted/30 border border-border flex items-center justify-center">
        <ShieldCheck className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-display font-bold text-lg text-foreground">
          Already Claimed
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          This plant NFT has already been claimed by another collector. Each QR
          label can only be redeemed once.
        </p>
      </div>
      <Link to="/marketplace" data-ocid="claim-redeemed-shop-btn">
        <Button variant="outline" className="mt-2">
          <ShoppingBag className="w-4 h-4 mr-2" />
          Browse Our Shop
        </Button>
      </Link>
    </div>
  );
}

function SuccessView({
  claimData,
  rarity,
  nftId,
  plantData,
}: {
  claimData: ClaimTokenPublic;
  rarity: (typeof RARITY_CONFIG)[RarityTier];
  nftId: string;
  plantData: Record<string, string>;
}) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
      data-ocid="claim-success"
    >
      {showConfetti && <ConfettiParticles />}
      <div className="p-6 space-y-6">
        <div
          className={`relative rounded-2xl overflow-hidden ${rarity.glowClass}`}
        >
          <NFTComposite rarity={rarity} animated />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <PulseRing color={rarityPulseColor(rarity.label)} />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-2"
        >
          <div className="flex justify-center mb-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, delay: 0.2 }}
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </motion.div>
          </div>
          <h2 className="font-display font-bold text-xl text-foreground">
            NFT Claimed Successfully!
          </h2>
          <p
            className={`font-display font-bold text-2xl ${rarityColorClass(rarity.label)}`}
          >
            Your {rarity.discount} Lifetime Discount
            <br />
            is Now Active!
          </p>
          <p className="text-sm text-muted-foreground">
            Valid on every purchase in our shop — forever.
          </p>
        </motion.div>
        <Separator />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2.5"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            NFT Details
          </p>
          {[
            {
              label: "NFT ID",
              value: nftId || `#${claimData.plant_id.toString()}`,
            },
            { label: "Plant ID", value: `#${claimData.plant_id.toString()}` },
            {
              label: "Rarity",
              value: (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rarity.badgeClass}`}
                >
                  {rarity.label}
                </span>
              ),
            },
            {
              label: "Discount",
              value: `${rarity.discount} storewide (lifetime)`,
            },
            ...(plantData.variety
              ? [{ label: "Variety", value: plantData.variety }]
              : []),
            ...(plantData.planting_date
              ? [{ label: "Planted", value: plantData.planting_date }]
              : []),
            { label: "Minted", value: formatTimestamp(claimData.created_at) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-xs text-muted-foreground shrink-0">
                {label}
              </span>
              <span className="text-xs font-medium text-foreground text-right min-w-0 break-all">
                {value}
              </span>
            </div>
          ))}
        </motion.div>
        <Separator />
        {(plantData.stage || plantData.genetics || plantData.notes) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl bg-muted/20 border border-border p-4 space-y-2"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Lifecycle Data in Metadata
            </p>
            {plantData.stage && (
              <div className="flex items-center gap-2">
                <Leaf className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs text-foreground">
                  Stage: {plantData.stage}
                </span>
              </div>
            )}
            {plantData.genetics && (
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs text-foreground">
                  Genetics: {plantData.genetics}
                </span>
              </div>
            )}
            {plantData.notes && (
              <p className="text-xs text-muted-foreground italic pl-5 line-clamp-2">
                "{plantData.notes}"
              </p>
            )}
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3"
        >
          <Button
            className="w-full h-12 bg-primary text-primary-foreground font-semibold text-base"
            onClick={() => {
              void navigate({ to: "/wallet" });
            }}
            data-ocid="claim-view-wallet-btn"
          >
            <Wallet className="w-5 h-5 mr-2" />
            View My NFT in Wallet
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 font-semibold text-base"
            onClick={() => {
              void navigate({ to: "/marketplace" });
            }}
            data-ocid="claim-shop-discount-btn"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Start Shopping with Discount
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Claim Progress ───────────────────────────────────────────────────────────

function ClaimProgress({ step, steps }: { step: number; steps: string[] }) {
  return (
    <div className="space-y-3 py-4" data-ocid="claim-progress">
      {steps.map((label, i) => {
        const isDone = i < step;
        const isActive = i === step;
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: isDone || isActive ? 1 : 0.35, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-6 h-6 shrink-0 flex items-center justify-center">
              {isDone ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </motion.div>
              ) : isActive ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-border" />
              )}
            </div>
            <span
              className={`text-sm ${isActive ? "text-foreground font-medium" : isDone ? "text-muted-foreground line-through" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Auth Gate Overlay ────────────────────────────────────────────────────────

function AuthGate({
  onLogin,
  isLoading,
}: { onLogin: () => void; isLoading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex items-end justify-center rounded-2xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
        className="relative z-10 w-full p-6 space-y-4 bg-card/90 border-t border-border rounded-t-2xl backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-foreground text-sm">
              Connect to Claim Your NFT
            </p>
            <p className="text-xs text-muted-foreground">
              Internet Identity — secure, no password required
            </p>
          </div>
        </div>
        <Button
          className="w-full h-12 bg-primary text-primary-foreground font-semibold text-base"
          onClick={onLogin}
          disabled={isLoading}
          data-ocid="claim-connect-btn"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <ShieldCheck className="w-5 h-5 mr-2" />
          )}
          Connect with Internet Identity
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Your identity stays private. No email or password needed.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Plant Claim Card ────────────────────────────────────────────────────

function PlantClaimCard({
  claimData,
  rarity,
  plantData,
  isAuthenticated,
  isInitializing,
  onLogin,
  onClaim,
  claimPending,
  claimStep,
}: {
  claimData: ClaimTokenPublic;
  rarity: (typeof RARITY_CONFIG)[RarityTier];
  plantData: Record<string, string>;
  isAuthenticated: boolean;
  isInitializing: boolean;
  onLogin: () => void;
  onClaim: () => void;
  claimPending: boolean;
  claimStep: number;
}) {
  const plantName =
    plantData.variety || plantData.common_name || claimData.plant_id.toString();

  return (
    <div className="relative" data-ocid="claim-info">
      <div
        className={`mx-6 mt-6 rounded-2xl overflow-hidden ${rarity.glowClass}`}
      >
        <NFTComposite rarity={rarity} />
      </div>
      <div className="p-6 space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display font-bold text-xl text-foreground leading-tight min-w-0 break-words">
              {plantName}
            </h2>
            <span
              className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full border ${rarity.badgeClass}`}
            >
              {rarity.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: rarity.stars }, (_, i) => (
              <Star
                key={`star-${rarity.label}-${i + 1}`}
                className={`w-3.5 h-3.5 fill-current ${rarityColorClass(rarity.label)}`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {rarity.label} Tier · {rarity.discount} Lifetime Discount
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Plant ID", value: `#${claimData.plant_id.toString()}` },
            { label: "Stage", value: plantData.stage || "Seedling" },
            ...(plantData.genetics
              ? [{ label: "Genetics", value: plantData.genetics }]
              : []),
            ...(plantData.origin
              ? [{ label: "Origin", value: plantData.origin }]
              : []),
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg bg-muted/20 border border-border px-3 py-2 space-y-0.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
              <p className="text-xs font-medium text-foreground truncate">
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            What You Receive
          </p>
          <ul className="space-y-1.5">
            {[
              "10-layer composite artwork NFT on ICP",
              "Full seed-to-harvest lifecycle metadata",
              `Lifetime ${rarity.discount} discount on all IC SPICY products`,
              "DAO governance voting access",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <Separator />
        {claimPending && <ClaimProgress step={claimStep} steps={CLAIM_STEPS} />}
        {!claimPending && isAuthenticated && (
          <Button
            className="w-full h-13 bg-primary text-primary-foreground font-semibold text-base py-3.5"
            onClick={onClaim}
            disabled={claimPending}
            data-ocid="claim-redeem-btn"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Claim My NFT
          </Button>
        )}
        {!claimPending && !isAuthenticated && (
          <Button
            className="w-full h-13 bg-primary text-primary-foreground font-semibold text-base py-3.5"
            onClick={onLogin}
            disabled={isInitializing}
            data-ocid="claim-connect-inline-btn"
          >
            {isInitializing ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="w-5 h-5 mr-2" />
            )}
            Connect & Claim NFT
          </Button>
        )}
      </div>
      <AnimatePresence>
        {!isAuthenticated && !claimPending && (
          <AuthGate onLogin={onLogin} isLoading={isInitializing} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Batch Plant Card ─────────────────────────────────────────────────────────

function BatchPlantCard({
  plantId,
  index,
  packRarity,
}: {
  plantId: PlantId;
  index: number;
  packRarity: (typeof RARITY_CONFIG)[RarityTier];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.2 + index * 0.15,
        duration: 0.45,
        ease: "easeOut",
      }}
      className="rounded-xl border border-border bg-card overflow-hidden"
      data-ocid={`batch-plant-card-${index}`}
    >
      <div className="p-1">
        <NFTComposite rarity={packRarity} compact />
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-display font-bold text-foreground truncate">
            Plant #{plantId.toString()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Leaf className="w-3 h-3 text-primary shrink-0" />
          <span className="text-[10px] text-muted-foreground">
            Seedling Stage
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Gift className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground">
            Part of this gift pack
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Batch Gift Pack Card ─────────────────────────────────────────────────────

function BatchGiftPackCard({
  giftPack,
  isAuthenticated,
  isInitializing,
  onLogin,
  onClaim,
  claimPending,
  claimStep,
}: {
  giftPack: BatchGiftPackPublic;
  isAuthenticated: boolean;
  isInitializing: boolean;
  onLogin: () => void;
  onClaim: () => void;
  claimPending: boolean;
  claimStep: number;
}) {
  const plantCount = giftPack.plant_ids.length;
  const highestRarityPct = Number(giftPack.highest_rarity_pct);
  const topRarity = RARITY_CONFIG[rarityFromPct(highestRarityPct)];
  const discountLabel =
    highestRarityPct >= 15 ? "15%" : highestRarityPct >= 12 ? "12%" : "10%";

  return (
    <div className="relative" data-ocid="batch-claim-info">
      {/* Pack header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4 space-y-3"
      >
        {/* Gift icon + title */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border ${topRarity.badgeClass} shrink-0`}
          >
            <Gift className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xl text-foreground leading-tight">
              Gift Pack — {plantCount} Plant{plantCount !== 1 ? "s" : ""}
            </h2>
            <p className="text-xs text-muted-foreground">
              Scan & claim all {plantCount} plant NFTs at once
            </p>
          </div>
        </div>

        {/* Pack stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Plants",
              value: plantCount.toString(),
              icon: <Package className="w-3.5 h-3.5" />,
            },
            {
              label: "Top Rarity",
              value: topRarity.label,
              icon: <Star className="w-3.5 h-3.5" />,
            },
            {
              label: "Max Discount",
              value: discountLabel,
              icon: <Sparkles className="w-3.5 h-3.5" />,
            },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="rounded-lg bg-muted/20 border border-border px-2 py-2 text-center space-y-0.5"
            >
              <div className="flex justify-center text-primary mb-0.5">
                {icon}
              </div>
              <p
                className={`text-xs font-bold ${label === "Top Rarity" ? rarityColorClass(topRarity.label) : "text-foreground"}`}
              >
                {value}
              </p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* What you get */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Each NFT Includes
          </p>
          <ul className="space-y-1">
            {[
              `${plantCount} × 10-layer composite artwork NFTs on ICP`,
              "Full seed-to-harvest lifecycle metadata per plant",
              `Up to ${discountLabel} lifetime storewide discount`,
              "DAO governance voting access",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                <span className="text-[11px] text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      <Separator />

      {/* Plant NFT grid */}
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2">
          Plants in This Pack
        </p>
        <div className="grid grid-cols-2 gap-3" data-ocid="batch-plants-grid">
          {giftPack.plant_ids.map((plantId, i) => (
            <BatchPlantCard
              key={plantId.toString()}
              plantId={plantId}
              index={i}
              packRarity={topRarity}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 space-y-3">
        <Separator />
        {claimPending && (
          <ClaimProgress step={claimStep} steps={BATCH_CLAIM_STEPS} />
        )}
        {!claimPending && isAuthenticated && (
          <Button
            className="w-full h-12 bg-primary text-primary-foreground font-semibold text-base"
            onClick={onClaim}
            disabled={claimPending}
            data-ocid="batch-claim-all-btn"
          >
            <Gift className="w-5 h-5 mr-2" />
            Claim All {plantCount} Plants
          </Button>
        )}
        {!claimPending && !isAuthenticated && (
          <Button
            className="w-full h-12 bg-primary text-primary-foreground font-semibold text-base"
            onClick={onLogin}
            disabled={isInitializing}
            data-ocid="batch-claim-connect-btn"
          >
            {isInitializing ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="w-5 h-5 mr-2" />
            )}
            Connect & Claim All Plants
          </Button>
        )}
        <p className="text-center text-[10px] text-muted-foreground">
          Each QR pack can only be redeemed once. Plants are non-fungible.
        </p>
      </div>

      <AnimatePresence>
        {!isAuthenticated && !claimPending && (
          <AuthGate onLogin={onLogin} isLoading={isInitializing} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Batch Success View ───────────────────────────────────────────────────────

function BatchSuccessView({
  giftPack,
}: {
  giftPack: BatchGiftPackPublic;
}) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const plantCount = giftPack.plant_ids.length;
  const highestRarityPct = Number(giftPack.highest_rarity_pct);
  const topRarity = RARITY_CONFIG[rarityFromPct(highestRarityPct)];
  const discountLabel =
    highestRarityPct >= 15 ? "15%" : highestRarityPct >= 12 ? "12%" : "10%";

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
      data-ocid="batch-claim-success"
    >
      {showConfetti && <ConfettiParticles />}

      <div className="p-6 space-y-6">
        {/* Success headline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-3"
        >
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 350, delay: 0.15 }}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${topRarity.badgeClass}`}
            >
              <Gift className="w-8 h-8" />
            </motion.div>
          </div>
          <h2 className="font-display font-bold text-xl text-foreground">
            Gift Pack Claimed!
          </h2>
          <p
            className={`font-display font-bold text-2xl ${rarityColorClass(topRarity.label)}`}
          >
            You earned a {discountLabel}
            <br />
            Lifetime Discount!
          </p>
          <p className="text-sm text-muted-foreground">
            {plantCount} plant NFT{plantCount !== 1 ? "s" : ""} added to your
            wallet. Valid on every IC SPICY purchase — forever.
          </p>
        </motion.div>

        {/* Claimed NFT mini-grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Your New NFTs
          </p>
          <div className="grid grid-cols-3 gap-2">
            {giftPack.plant_ids.slice(0, 6).map((plantId, i) => (
              <motion.div
                key={plantId.toString()}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="rounded-lg border border-border overflow-hidden"
              >
                <NFTComposite rarity={topRarity} compact />
                <div className="px-1.5 pb-1.5 pt-1">
                  <p className="text-[9px] font-bold text-muted-foreground truncate">
                    #{plantId.toString()}
                  </p>
                </div>
              </motion.div>
            ))}
            {plantCount > 6 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + 6 * 0.1 }}
                className="rounded-lg border border-border bg-muted/20 flex items-center justify-center aspect-[4/3]"
              >
                <span className="text-xs font-bold text-muted-foreground">
                  +{plantCount - 6} more
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>

        <Separator />

        {/* Discount summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Lifetime Discount Active
            </span>
            <span
              className={`text-lg font-display font-bold ${rarityColorClass(topRarity.label)}`}
            >
              {discountLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            The highest rarity tier in your pack determines your storewide
            discount. It stays active as long as you hold any NFT.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col gap-3"
        >
          <Button
            className="w-full h-12 bg-primary text-primary-foreground font-semibold text-base"
            onClick={() => {
              void navigate({ to: "/wallet" });
            }}
            data-ocid="batch-success-wallet-btn"
          >
            <Wallet className="w-5 h-5 mr-2" />
            View All NFTs in Wallet
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 font-semibold text-base"
            onClick={() => {
              void navigate({ to: "/marketplace" });
            }}
            data-ocid="batch-success-marketplace-btn"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Visit Marketplace
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClaimPage() {
  const { claimToken } = useParams({ from: "/claim/$claimToken" });
  const { isAuthenticated, login, isInitializing } = useAuth();

  // Single claim state
  const [claimed, setClaimed] = useState(false);
  const [claimedData, setClaimedData] = useState<ClaimTokenPublic | null>(null);
  const [claimStep, setClaimStep] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Batch claim state
  const [batchClaimed, setBatchClaimed] = useState(false);
  const [batchClaimedData, setBatchClaimedData] =
    useState<BatchGiftPackPublic | null>(null);
  const [batchClaimStep, setBatchClaimStep] = useState(0);
  const batchStepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Data fetching — check both single and batch
  const { data: rawClaimData, isLoading: singleLoading } =
    useGetClaimToken(claimToken);
  const { data: batchData, isLoading: batchLoading } =
    useGetBatchGiftPack(claimToken);

  const redeemMutation = useRedeemClaim();
  const redeemBatchMutation = useRedeemBatchClaim();

  const isBatchPack = !!batchData;
  const isLoading = singleLoading || batchLoading;

  // Single claim data
  const claimData = rawClaimData ?? null;
  const isAlreadyClaimed = !isBatchPack && !!claimData?.redeemed_at;
  const plantData = claimData ? parseClaimData(claimData.claim_data) : {};
  const rarity = claimData
    ? (RARITY_CONFIG[claimData.rarity_tier] ?? RARITY_CONFIG[RarityTier.Common])
    : null;

  // Batch already redeemed
  const isBatchAlreadyClaimed = isBatchPack && batchData?.redeemed === true;

  const makeStepAdvancer = (
    setStep: (n: number) => void,
    timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
    stepCount: number,
  ) => {
    setStep(0);
    let step = 0;
    timerRef.current = setInterval(() => {
      step += 1;
      setStep(step);
      if (step >= stepCount - 1) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1200);
  };

  const handleSingleClaim = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    makeStepAdvancer(setClaimStep, stepTimerRef, CLAIM_STEPS.length);
    try {
      const result = await redeemMutation.mutateAsync(claimToken);
      setClaimedData(result);
      setClaimed(true);
      toast.success("🌶️ NFT claimed! Your lifetime discount is now active.");
    } catch {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setClaimStep(0);
      toast.error("Claim failed. This NFT may have already been claimed.");
    }
  };

  const handleBatchClaim = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    makeStepAdvancer(
      setBatchClaimStep,
      batchStepTimerRef,
      BATCH_CLAIM_STEPS.length,
    );
    try {
      const result = await redeemBatchMutation.mutateAsync(claimToken);
      setBatchClaimedData(result);
      setBatchClaimed(true);
      toast.success(
        `🎁 Gift pack claimed! ${result.plant_ids.length} NFTs added to your wallet.`,
      );
    } catch {
      if (batchStepTimerRef.current) clearInterval(batchStepTimerRef.current);
      setBatchClaimStep(0);
      toast.error(
        "Claim failed. This gift pack may have already been redeemed.",
      );
    }
  };

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (batchStepTimerRef.current) clearInterval(batchStepTimerRef.current);
    };
  }, []);

  const successClaimData = claimedData ?? claimData;
  const headingText = isBatchPack
    ? "Claim Your Gift Pack"
    : "Claim Your Plant NFT";
  const subText = isBatchPack
    ? "Multiple real-world plant NFTs with lifetime shop discount"
    : "Exclusive real-world asset with lifetime shop discount";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-bold text-foreground">
            IC <span className="text-primary">SPICY</span>
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] font-semibold uppercase tracking-widest border-primary/30 text-primary ${isBatchPack ? "gap-1" : ""}`}
        >
          {isBatchPack && <Gift className="w-3 h-3" />}
          {isBatchPack ? "Gift Pack" : "NFT Claim"}
        </Badge>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Hero heading */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6 space-y-1.5"
          >
            <h1 className="font-display font-bold text-2xl text-foreground">
              {headingText}
            </h1>
            <p className="text-sm text-muted-foreground">{subText}</p>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl bg-card border border-border overflow-hidden shadow-elevated"
            data-ocid="claim-card"
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LoadingView />
                </motion.div>
              ) : /* Batch pack — success */ batchClaimed &&
                batchClaimedData ? (
                <motion.div
                  key="batch-success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <BatchSuccessView giftPack={batchClaimedData} />
                </motion.div>
              ) : /* Batch pack — already claimed */ isBatchAlreadyClaimed ? (
                <motion.div
                  key="batch-already-claimed"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <AlreadyClaimedView />
                </motion.div>
              ) : /* Batch pack — claim form */ isBatchPack && batchData ? (
                <motion.div
                  key="batch-claim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <BatchGiftPackCard
                    giftPack={batchData}
                    isAuthenticated={isAuthenticated}
                    isInitializing={isInitializing}
                    onLogin={login}
                    onClaim={handleBatchClaim}
                    claimPending={redeemBatchMutation.isPending}
                    claimStep={batchClaimStep}
                  />
                </motion.div>
              ) : /* Single — error / not found (only after BOTH queries finish) */
              !singleLoading && !batchLoading && !claimData ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <ErrorView message="Invalid or expired claim link" />
                </motion.div>
              ) : /* Single — already claimed */ isAlreadyClaimed &&
                !claimed ? (
                <motion.div
                  key="already-claimed"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <AlreadyClaimedView />
                </motion.div>
              ) : /* Single — success */ claimed &&
                successClaimData &&
                rarity ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SuccessView
                    claimData={successClaimData}
                    rarity={rarity}
                    nftId={plantData.nft_id ?? ""}
                    plantData={plantData}
                  />
                </motion.div>
              ) : /* Single — claim form */ rarity ? (
                <motion.div
                  key="claim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <PlantClaimCard
                    claimData={claimData!}
                    rarity={rarity}
                    plantData={plantData}
                    isAuthenticated={isAuthenticated}
                    isInitializing={isInitializing}
                    onLogin={login}
                    onClaim={handleSingleClaim}
                    claimPending={redeemMutation.isPending}
                    claimStep={claimStep}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          {/* Footer link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-6 space-y-2"
          >
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              data-ocid="claim-home-link"
            >
              <ExternalLink className="w-3 h-3" />
              Visit IC SPICY Nursery
            </a>
            <p className="text-[10px] text-muted-foreground">
              Powered by the Internet Computer · ICRC-37 NFT Standard
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
