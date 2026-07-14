import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  CloudSun,
  Flame,
  Gem,
  Leaf,
  Loader2,
  MapPin,
  Package,
  ShoppingBag,
  Sprout,
  Vote,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OisyConnectButton } from "../OisyConnectButton";
import { ConfettiBurst } from "./ConfettiBurst";
import { useAuth } from "../../hooks/useAuth";
import {
  useBackendActor,
  useProfile,
  useSaveProfile,
} from "../../hooks/useBackend";
import { useActorReady } from "../../hooks/useActorReady";
import { requireBackendRaw } from "../../lib/backend-raw";
import {
  clearPendingClaim,
  storePendingClaim,
} from "../../lib/pending-claim-storage";
import { getNftImageUrl } from "../../lib/nft-config";
import { PICKUP_ADDRESS } from "../../lib/cart-utils";
import { unwrapOpt } from "../../hooks/useSeedBank";
import { useOisyWallet } from "../../providers/OisyWalletProvider";
import type { CartItem } from "../../types";

export type PaidVia = "paypal" | "ii" | "oisy";

export type PostPaymentOnboardingProps = {
  orderId: bigint;
  totalCents: bigint;
  claimTokens: string[];
  nftTokenIds: bigint[];
  isPickup: boolean;
  purchasedItems: CartItem[];
  paidVia: PaidVia;
  onContinueShopping: () => void;
  onViewOrders: () => void;
};

type ClaimTarget = "ii" | "oisy";
type FlowStep = "wallet" | "claim" | "profile" | "complete";

const VALUE_PROPS = [
  {
    icon: Leaf,
    title: "Track your plant's entire lifecycle — free forever",
    body: "Water, feed, photograph — every event recorded on-chain.",
  },
  {
    icon: CloudSun,
    title: "Weather provenance captured daily",
    body: "Temperature, humidity, UV, rainfall — automatically.",
  },
  {
    icon: Vote,
    title: "Your voice in the nursery",
    body: "NFT holders vote on what we grow next.",
  },
  {
    icon: Gem,
    title: "5–15% off every future purchase",
    body: "Your NFT unlocks member pricing.",
  },
  {
    icon: BookOpen,
    title: "387 AI growing guides",
    body: "Step-by-step KNF methods, personalized to your zone.",
  },
] as const;

function NftPreviewCard({
  tokenId,
  show,
  walletLabel,
}: {
  tokenId: bigint;
  show: boolean;
  walletLabel: string;
}) {
  const [imgError, setImgError] = useState(false);
  if (!show) return null;
  return (
    <motion.div
      className="relative w-full max-w-[220px] mx-auto"
      initial={{ rotateY: 90, opacity: 0, scale: 0.92 }}
      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <div className="rounded-2xl border border-primary/30 bg-card overflow-hidden shadow-lg">
        {!imgError ? (
          <img
            src={getNftImageUrl(tokenId)}
            alt={`IC SPICY #${tokenId.toString()}`}
            className="w-full aspect-square object-cover bg-muted"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="aspect-square flex flex-col items-center justify-center bg-muted gap-2">
            <Flame className="h-12 w-12 text-primary/40" />
            <span className="font-mono text-sm">#{tokenId.toString()}</span>
          </div>
        )}
        <div className="p-3 space-y-1 text-center border-t border-border">
          <p className="font-display font-bold text-foreground text-sm">
            IC SPICY #{tokenId.toString()}
          </p>
          <Badge variant="outline" className="text-[10px]">
            {walletLabel}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

function StepCard({
  title,
  children,
  stepId,
}: {
  title: string;
  children: React.ReactNode;
  stepId: string;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3"
      data-ocid={stepId}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}

export function PostPaymentOnboarding({
  orderId,
  totalCents,
  claimTokens,
  nftTokenIds,
  isPickup,
  purchasedItems,
  paidVia,
  onContinueShopping,
  onViewOrders,
}: PostPaymentOnboardingProps) {
  const { isAuthenticated, login } = useAuth();
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const { isOisyConnected, oisyBackendActor } = useOisyWallet();
  const { data: profile, isPending: profilePending } = useProfile();
  const saveProfile = useSaveProfile();

  const [claimTarget, setClaimTarget] = useState<ClaimTarget>(
    paidVia === "oisy" ? "oisy" : "ii",
  );
  const [claimed, setClaimed] = useState(false);
  const [claimedTokenId, setClaimedTokenId] = useState<bigint | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [step, setStep] = useState<FlowStep>(() => {
    if (paidVia === "oisy" && isOisyConnected) return "claim";
    if ((paidVia === "ii" || paidVia === "paypal") && isAuthenticated) {
      return "claim";
    }
    if (isAuthenticated || isOisyConnected) return "claim";
    return "wallet";
  });

  const usdAmount = Number(totalCents) / 100;
  const primaryClaimToken = claimTokens[0] ?? null;
  const displayNftId = claimedTokenId ?? nftTokenIds[0] ?? null;
  const hasNftReward = displayNftId != null || primaryClaimToken != null;

  const walletConnectedForTarget =
    (claimTarget === "ii" && isAuthenticated) ||
    (claimTarget === "oisy" && isOisyConnected);

  const needsProfile =
    !profilePending &&
    actorReady &&
    isAuthenticated &&
    (!profile?.username || profile.username.trim().length === 0);

  const walletLabel =
    claimTarget === "oisy" ? "OISY Wallet" : "Internet Identity";

  useEffect(() => {
    if (walletConnectedForTarget && step === "wallet") {
      setStep("claim");
    }
  }, [walletConnectedForTarget, step]);

  useEffect(() => {
    if (claimed && needsProfile && !profileSaved) {
      setStep("profile");
    } else if (claimed) {
      setStep("complete");
    }
  }, [claimed, needsProfile, profileSaved]);

  async function handleClaim() {
    if (!walletConnectedForTarget) {
      toast.error(`Connect ${walletLabel} first`);
      return;
    }
    setClaimBusy(true);
    try {
      if (primaryClaimToken) {
        const redeemActor =
          claimTarget === "oisy"
            ? oisyBackendActor
            : requireBackendRaw(actor);
        if (!redeemActor) throw new Error("Wallet not connected");
        const result = await redeemActor.redeemClaim(primaryClaimToken);
        if (!result.success) {
          if (nftTokenIds.length > 0) {
            setClaimedTokenId(nftTokenIds[0] ?? null);
            setClaimed(true);
            clearPendingClaim(orderId);
            toast.success("Your NFT is already in your wallet!");
            return;
          }
          throw new Error(result.message);
        }
        setClaimedTokenId(unwrapOpt(result.tokenId) ?? nftTokenIds[0] ?? null);
      } else if (nftTokenIds.length > 0) {
        setClaimedTokenId(nftTokenIds[0] ?? null);
      } else {
        toast.error("No NFT found for this order");
        return;
      }
      setClaimed(true);
      clearPendingClaim(orderId);
      toast.success("NFT claimed!");
    } catch (err) {
      if (nftTokenIds.length > 0) {
        setClaimedTokenId(nftTokenIds[0] ?? null);
        setClaimed(true);
        clearPendingClaim(orderId);
        toast.success("Your NFT is in your wallet!");
      } else {
        toast.error(err instanceof Error ? err.message : "Claim failed");
      }
    } finally {
      setClaimBusy(false);
    }
  }

  function handleSkipClaim() {
    storePendingClaim({
      orderId: orderId.toString(),
      claimTokens,
      nftTokenIds: nftTokenIds.map((id) => id.toString()),
    });
    if (needsProfile && isAuthenticated) {
      setStep("profile");
    } else {
      setStep("complete");
    }
    toast.message("Saved for later — claim anytime from your homepage banner.");
  }

  async function handleCreateProfile() {
    if (!displayName.trim()) {
      toast.error("Enter a display name");
      return;
    }
    try {
      await saveProfile.mutateAsync({
        username: displayName.trim(),
        bio: "",
        location: location.trim() || undefined,
      });
      setProfileSaved(true);
      setStep("complete");
      toast.success("Profile created!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    }
  }

  const showWalletStep =
    step === "wallet" || (!walletConnectedForTarget && !claimed);
  const showClaimStep = hasNftReward && !claimed && step !== "complete";
  const showProfileStep =
    step === "profile" && needsProfile && !profileSaved && isAuthenticated;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-5 py-2 relative"
      data-ocid="payment-success-onboarding"
    >
      {claimed && <ConfettiBurst />}

      <div className="text-center space-y-2">
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
        <p className="font-display font-bold text-foreground text-xl sm:text-2xl">
          Payment Confirmed!
        </p>
        <p className="text-sm text-muted-foreground">
          Order #{orderId.toString()} · ${usdAmount.toFixed(2)}
        </p>
        {hasNftReward && !claimed && (
          <div className="rounded-lg bg-primary/10 border border-primary/25 px-4 py-3 mt-3">
            <p className="text-sm font-semibold text-foreground">
              🎁 You earned an IC SPICY NFT!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Claim it now — it takes 30 seconds.
            </p>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showWalletStep && (
          <motion.div
            key="wallet-step"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <StepCard title="Step 1: Connect Your Wallet" stepId="onboarding-wallet-step">
              {!isAuthenticated && !isOisyConnected && (
                <div className="space-y-2">
                  <Button
                    className="w-full h-12 justify-start gap-2"
                    onClick={login}
                    data-ocid="onboarding-connect-ii"
                  >
                    <Flame className="w-4 h-4" />
                    Internet Identity
                  </Button>
                  <OisyConnectButton
                    className="w-full h-12"
                    label="🟢 OISY Wallet"
                  />
                </div>
              )}

              {isAuthenticated && !isOisyConnected && (
                <div className="space-y-3">
                  <p className="text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Internet Identity connected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={claimTarget === "ii" ? "default" : "outline"}
                      onClick={() => setClaimTarget("ii")}
                    >
                      II Wallet
                    </Button>
                  </div>
                  <OisyConnectButton
                    size="sm"
                    label="Connect OISY to claim there"
                    className="w-full sm:w-auto"
                  />
                </div>
              )}

              {!isAuthenticated && isOisyConnected && (
                <div className="space-y-3">
                  <p className="text-xs text-orange-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    OISY connected
                  </p>
                  <Button
                    size="sm"
                    variant={claimTarget === "oisy" ? "default" : "outline"}
                    onClick={() => setClaimTarget("oisy")}
                  >
                    OISY Wallet
                  </Button>
                  <Button size="sm" variant="outline" onClick={login}>
                    Connect II to claim there
                  </Button>
                </div>
              )}

              {isAuthenticated && isOisyConnected && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Claim NFT to:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={claimTarget === "ii" ? "default" : "outline"}
                      className="h-11"
                      onClick={() => setClaimTarget("ii")}
                    >
                      🔑 II Wallet
                    </Button>
                    <Button
                      variant={claimTarget === "oisy" ? "default" : "outline"}
                      className="h-11"
                      onClick={() => setClaimTarget("oisy")}
                    >
                      🟢 OISY Wallet
                    </Button>
                  </div>
                </div>
              )}
            </StepCard>
          </motion.div>
        )}

        {showClaimStep && walletConnectedForTarget && (
          <motion.div
            key="claim-step"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <StepCard title="Step 2: Claim Your NFT" stepId="onboarding-claim-step">
              <Button
                className="w-full h-14 text-base font-bold animate-pulse bg-primary hover:bg-primary/90"
                disabled={claimBusy}
                onClick={() => void handleClaim()}
                data-ocid="onboarding-claim-nft-btn"
              >
                {claimBusy ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    🌶️ Claim NFT
                    {displayNftId != null
                      ? ` #${displayNftId.toString()}`
                      : ""}
                  </>
                )}
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 w-full text-center py-1"
                onClick={handleSkipClaim}
                data-ocid="onboarding-skip-claim"
              >
                Skip — I'll claim later
              </button>
            </StepCard>
          </motion.div>
        )}

        {claimed && displayNftId != null && (
          <motion.div
            key="claimed-celebration"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 text-center relative"
          >
            <NftPreviewCard
              tokenId={displayNftId}
              show
              walletLabel={walletLabel}
            />
            <p className="text-sm font-semibold text-foreground">
              NFT #{displayNftId.toString()} is now in your {walletLabel}!
            </p>
          </motion.div>
        )}

        {showProfileStep && (
          <motion.div
            key="profile-step"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <StepCard title="Step 3: Set Up Profile" stepId="onboarding-profile-step">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-display-name">Display Name</Label>
                  <Input
                    id="onboarding-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your grower name"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-location">Location</Label>
                  <Input
                    id="onboarding-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State or Zone"
                    className="h-11"
                  />
                </div>
                <Button
                  className="w-full h-11"
                  disabled={saveProfile.isPending}
                  onClick={() => void handleCreateProfile()}
                  data-ocid="onboarding-create-profile"
                >
                  {saveProfile.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Profile"
                  )}
                </Button>
              </div>
            </StepCard>
          </motion.div>
        )}
      </AnimatePresence>

      {isPickup && claimTokens.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Pickup code
          </p>
          {claimTokens.map((t) => (
            <p key={t} className="text-xs font-mono break-all text-foreground">
              {t}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">
            Show at pickup — {PICKUP_ADDRESS}
          </p>
        </div>
      )}

      {!isPickup && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Package className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            Your order will ship to the address you provided.
          </p>
        </div>
      )}

      <StepCard title="Why Join IC SPICY?" stepId="onboarding-value-props">
        <ul className="space-y-3">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3 text-left">
              <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </StepCard>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground">Your items</p>
        {purchasedItems.map((item) => (
          <div
            key={item.line_id}
            className="flex justify-between gap-2 text-sm border-t border-border pt-2 first:border-t-0 first:pt-0"
          >
            <span className="text-foreground">{item.name}</span>
            <span className="text-muted-foreground shrink-0">
              ×{item.quantity}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button className="w-full h-11" asChild data-ocid="onboarding-nims-btn">
          <Link to="/nims">
            <Sprout className="w-4 h-4 mr-2" />
            Start Tracking in NIMS
          </Link>
        </Button>
        <Button
          variant="outline"
          className="w-full h-11"
          onClick={onContinueShopping}
          data-ocid="payment-continue-shopping-btn"
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          Continue Shopping
        </Button>
        <Button
          variant="outline"
          className="w-full h-11"
          onClick={onViewOrders}
          data-ocid="payment-view-orders-btn"
        >
          View My Orders
        </Button>
      </div>

      {(claimed || step === "complete") && displayNftId != null && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button size="sm" variant="outline" asChild>
            <Link
              to="/nft/$tokenId"
              params={{ tokenId: displayNftId.toString() }}
            >
              View NFT
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/profile">View My Profile</Link>
          </Button>
        </div>
      )}
    </motion.div>
  );
}
