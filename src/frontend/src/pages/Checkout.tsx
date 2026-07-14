import type {
  CreateOrderInput as CandidOrderInput,
  ShippingAddress as CandidShipping,
} from "../declarations/backend.did";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { variantToString } from "@/lib/candid-display";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Gem,
  Loader2,
  Lock,
  MapPin,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlantCheckoutPanel } from "../components/PlantCheckoutPanel";
import { PayPalCheckoutPanel } from "../components/PayPalCheckoutPanel";
import {
  PostPaymentOnboarding,
  type PaidVia,
} from "../components/checkout/PostPaymentOnboarding";
import {
  TokenPaymentPanel,
  useTokenPaymentState,
} from "../components/TokenPaymentPanel";
import { useAuth } from "../hooks/useAuth";
import {
  useBackendActor,
  useConfirmOrderPaymentDirect,
  useConfirmPayPalOrderPayment,
  usePlaceOrder,
  usePurchasePepperHeadPayPal,
} from "../hooks/useBackend";
import { useCart } from "../hooks/useCart";
import { useNftDiscount } from "../hooks/useNftDiscount";
import { useRavenPerks } from "../hooks/useRavenPerks";
import { NoIndexSeo } from "../components/NoIndexSeo";
import { usePageTitle } from "../hooks/usePageTitle";
import { useUsageTracking } from "../hooks/useUsageTracking";
import { useActorReady } from "../hooks/useActorReady";
import {
  PICKUP_ADDRESS,
  USPS_SMALL_FLAT_RATE_CENTS,
  formatLinePrice,
  toNatBigInt,
  toOptionalNatBigInt,
} from "../lib/cart-utils";
import { discountAmountCents, formatRarityLabel } from "../lib/discount-utils";
import { paypalCustomIds } from "../lib/paypal";
import { fetchOrderPaymentAssets } from "../lib/order-payment-assets";
import {
  clearPendingPayPalSettlement,
  getPendingPayPalSettlement,
  storePendingPayPalSettlement,
} from "../lib/pending-paypal-settlement";
import { oisyIcrc2Approve, oisyPaymentAmount } from "../lib/oisy-payment";
import {
  PAYMENT_LEDGERS,
  VOLATILE_APPROVE_BUFFER_BPS,
  isStablePaymentToken,
} from "../lib/token-payment";
import { useOisyWallet } from "../providers/OisyWalletProvider";
import type { CartItem } from "../types";

// ─── Discount line ────────────────────────────────────────────────────────────

function NftDiscountSection({
  discountPercent,
  nftDiscountPercent,
  ravenDiscountPercent,
  rarity,
  discountAmount,
}: {
  discountPercent: number;
  nftDiscountPercent: number;
  ravenDiscountPercent: number;
  rarity: string;
  discountAmount: number;
}) {
  if (discountPercent <= 0) {
    return (
      <div
        className="flex items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-xs"
        data-ocid="checkout-discount-cta"
      >
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Gem className="w-3.5 h-3.5 text-primary" />
          Hold an IC SPICY NFT for storewide discounts
        </span>
        <Link
          to="/marketplace"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Browse the Shop →
        </Link>
      </div>
    );
  }

  const rarityLabel = formatRarityLabel(rarity);

  // When stacked, attribute per-source savings proportionally from the subtotal
  // so each line makes intuitive sense (NFT pct + RAVEN pct = combined total pct).
  const subtotalForCalc = discountPercent > 0 ? Math.round(discountAmount * 100 / discountPercent) : 0;
  const nftAmount = discountAmountCents(subtotalForCalc, nftDiscountPercent);
  const ravenAmount = discountAmountCents(subtotalForCalc, ravenDiscountPercent);
  const isStacked = nftDiscountPercent > 0 && ravenDiscountPercent > 0;

  return (
    <div className="space-y-2" data-ocid="checkout-nft-discount">
      {nftDiscountPercent > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            🌶️ PepperHead discount ({nftDiscountPercent}%)
            {rarityLabel ? ` · ${rarityLabel}` : ""}
          </span>
          <span className="font-semibold text-primary">
            -${((isStacked ? nftAmount : discountAmount) / 100).toFixed(2)}
          </span>
        </div>
      )}
      {ravenDiscountPercent > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            🐦‍⬛ RAVEN discount ({ravenDiscountPercent}%)
          </span>
          <span className="font-semibold text-blue-400">
            -${(ravenAmount / 100).toFixed(2)}
          </span>
        </div>
      )}
      {isStacked && (
        <div className="flex justify-between text-sm border-t border-primary/20 pt-1">
          <span className="text-muted-foreground font-medium">
            Total discount ({discountPercent}%)
          </span>
          <span className="font-semibold text-primary">
            -${(discountAmount / 100).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

interface ShippingForm {
  fullName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const EMPTY_FORM: ShippingForm = {
  fullName: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
};

function getProductEmoji(category: unknown) {
  const key = variantToString(category);
  if (key === "Spice") return "🧂";
  if (key === "GardenInputs" || key === "GardenAmendment") return "🌿";
  return "🌶️";
}

type FulfillmentMethod = "pickup" | "ship";

const SHIPPING_FEE_CENTS = USPS_SMALL_FLAT_RATE_CENTS;
const SHIPPING_FEE_LABEL = `$${(SHIPPING_FEE_CENTS / 100).toFixed(2)}`;

function ShippingNoticeBox() {
  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      data-ocid="checkout-shipping-notice"
      role="note"
    >
      <p className="font-semibold text-amber-200">📦 Shipping Notice</p>
      <p className="mt-1.5 text-amber-100/90 leading-relaxed">
        Please allow 2–3 business days for your order to be processed and
        shipped to ensure the freshest possible delivery. All plants are
        carefully packaged to survive transit.
      </p>
    </div>
  );
}

function ShippingSuccessNotice() {
  return (
    <div
      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100/95 space-y-1"
      data-ocid="checkout-shipping-success-notice"
    >
      <p>Your order will be shipped within 2–3 business days.</p>
      <p className="text-amber-200/80 text-xs">
        You&apos;ll receive your tracking information when your order ships.
      </p>
    </div>
  );
}

function FulfillmentSelector({
  method,
  onChange,
}: {
  method: FulfillmentMethod;
  onChange: (method: FulfillmentMethod) => void;
}) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      data-ocid="checkout-fulfillment-options"
    >
      <button
        type="button"
        onClick={() => onChange("pickup")}
        className={[
          "text-left p-4 rounded-xl border transition-smooth",
          method === "pickup"
            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
            : "border-border bg-secondary/30 hover:border-primary/40",
        ].join(" ")}
        data-ocid="checkout-fulfillment-pickup"
      >
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Local Pickup — Port Charlotte, FL
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Free · QR claim code after payment
            </p>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onChange("ship")}
        className={[
          "text-left p-4 rounded-xl border transition-smooth",
          method === "ship"
            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
            : "border-border bg-secondary/30 hover:border-primary/40",
        ].join(" ")}
        data-ocid="checkout-fulfillment-ship"
      >
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Ship to me (+{SHIPPING_FEE_LABEL})
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              USPS Small Flat Rate · entire order
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

function AuthGate({ login }: { login: () => void }) {
  const { connectOisy, isOisyInitializing } = useOisyWallet();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
      data-ocid="checkout-unauthenticated"
    >
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-2">
        Connect a Wallet to Checkout
      </h2>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        Sign in with Internet Identity or connect your OISY wallet to place an
        order.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={login}
          data-ocid="checkout-login-btn"
        >
          <Flame className="w-4 h-4" />
          Connect with Internet Identity
        </Button>
        <Button
          variant="outline"
          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
          onClick={() => void connectOisy()}
          disabled={isOisyInitializing}
          data-ocid="checkout-oisy-btn"
        >
          {isOisyInitializing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="text-base leading-none mr-1">🌐</span>
          )}
          Connect OISY Wallet
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Empty cart ───────────────────────────────────────────────────────────────

function EmptyCart() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
      data-ocid="checkout-empty"
    >
      <ShoppingBag className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="font-display font-bold text-xl text-foreground mb-2">
        Your cart is empty
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Add some fiery plants or artisan spices first!
      </p>
      <Link to="/marketplace">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Browse the Shop
        </Button>
      </Link>
    </motion.div>
  );
}

// ─── PepperHead checkout ($25 USD) ───────────────────────────────────────────

const PEPPERHEAD_PRICE_CENTS = 2500n;

function PepperHeadCheckoutPanel() {
  const { isAuthenticated, login } = useAuth();
  const purchasePayPal = usePurchasePepperHeadPayPal();
  const [purchasedTokenId, setPurchasedTokenId] = useState<bigint | null>(null);

  if (purchasedTokenId != null) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
        <h2 className="text-2xl font-bold">PepperHead Purchased!</h2>
        <p className="text-muted-foreground">
          NFT #{purchasedTokenId.toString()} is in your wallet.
        </p>
        <Link to="/wallet">
          <Button>View in Wallet</Button>
        </Link>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button className="w-full" onClick={() => login()}>
        Sign in to purchase PepperHead
      </Button>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="rounded-xl border border-border p-6 space-y-2 text-center">
        <h2 className="text-xl font-bold">PepperHead Membership</h2>
        <p className="text-2xl font-bold text-primary">$25.00 USD</p>
        <p className="text-sm text-muted-foreground">
          Lifetime shop discounts, DAO voting access, and member perks.
        </p>
      </div>
      <PayPalCheckoutPanel
        usdCents={PEPPERHEAD_PRICE_CENTS}
        customId={paypalCustomIds.pepperhead}
        disabled={purchasePayPal.isPending}
        onApproved={async (paypalOrderId) => {
          const result = await purchasePayPal.mutateAsync(paypalOrderId);
          if (result.tokenId != null) setPurchasedTokenId(result.tokenId);
          toast.success(result.message);
        }}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  );
}

// ─── Payment step ─────────────────────────────────────────────────────────────

type OisyOrderInput = {
  pickup: boolean;
  shipping?: {
    full_name: string;
    street_line1: string;
    street_line2?: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
  items: Array<{
    product_id: bigint;
    plant_id: [] | [bigint];
    price_cents: bigint;
    quantity: bigint;
  }>;
};

function PaymentStep({
  orderId,
  finalTotal,
  isPickup,
  orderItems,
  oisyOrderInput,
}: {
  orderId: bigint;
  finalTotal: bigint;
  isPickup: boolean;
  orderItems: CartItem[];
  oisyOrderInput: OisyOrderInput;
}) {
  const { isAuthenticated, login, principal } = useAuth();
  const { actor } = useBackendActor();
  const clearCart = useCart((s) => s.clearCart);
  const confirmDirect = useConfirmOrderPaymentDirect();
  const confirmPayPal = useConfirmPayPalOrderPayment();
  const placeOrder = usePlaceOrder();
  const navigate = useNavigate();
  const [payingToken, setPayingToken] = useTokenPaymentState();
  const { isOisyConnected, oisyAgent, oisyBackendActor } = useOisyWallet();

  const [purchasedItems] = useState(() => [...orderItems]);
  const [claimTokens, setClaimTokens] = useState<string[]>([]);
  const [nftTokenIds, setNftTokenIds] = useState<bigint[]>([]);
  const [paid, setPaid] = useState(false);
  const [paidVia, setPaidVia] = useState<PaidVia>("ii");
  const [payableOrderId, setPayableOrderId] = useState<bigint | null>(
    orderId === 0n ? null : orderId,
  );
  const [orderPrepError, setOrderPrepError] = useState<string | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [pendingPayPal, setPendingPayPal] = useState(
    () => getPendingPayPalSettlement(),
  );

  const usdAmount = Number(finalTotal) / 100;

  const effectiveOrderId =
    payableOrderId ?? (orderId !== 0n ? orderId : null);

  async function finishPayPalSuccess(
    paypalOrderId: string,
    icOrderId: bigint,
  ) {
    const assets = await fetchOrderPaymentAssets(actor, icOrderId);
    setClaimTokens(assets.claimTokens);
    setNftTokenIds(assets.nftTokenIds);
    clearCart();
    clearPendingPayPalSettlement();
    setPendingPayPal(null);
    setSettlementError(null);
    setPaidVia("paypal");
    setPaid(true);
    toast.success("PayPal payment confirmed!");
    void paypalOrderId;
  }

  async function handlePayPalApproved(paypalOrderId: string) {
    if (effectiveOrderId == null) {
      toast.error("Order not ready yet — wait a moment and try again.");
      return;
    }
    storePendingPayPalSettlement({
      orderId: effectiveOrderId.toString(),
      paypalOrderId,
      totalCents: finalTotal.toString(),
    });
    setPendingPayPal(getPendingPayPalSettlement());
    try {
      await confirmPayPal.mutateAsync({
        orderId: effectiveOrderId,
        paypalOrderId,
      });
      await finishPayPalSuccess(paypalOrderId, effectiveOrderId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "PayPal settlement failed";
      setSettlementError(msg);
      toast.error(
        `PayPal payment received. Order #${effectiveOrderId.toString()} — tap Retry below.`,
      );
    }
  }

  async function handleRetryPayPalSettlement() {
    const pending = getPendingPayPalSettlement();
    if (!pending || effectiveOrderId == null) return;
    try {
      await confirmPayPal.mutateAsync({
        orderId: effectiveOrderId,
        paypalOrderId: pending.paypalOrderId,
      });
      await finishPayPalSuccess(pending.paypalOrderId, effectiveOrderId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Retry failed";
      setSettlementError(msg);
      toast.error(msg);
    }
  }

  const showPayPalRetry =
    settlementError != null &&
    pendingPayPal != null &&
    effectiveOrderId != null &&
    pendingPayPal.orderId === effectiveOrderId.toString();

  useEffect(() => {
    if (orderId !== 0n) {
      setPayableOrderId(orderId);
      setOrderPrepError(null);
      return;
    }
    if (!isAuthenticated || orderItems.length === 0) return;

    let cancelled = false;
    setOrderPrepError(null);
    void (async () => {
      try {
        const order = await placeOrder.mutateAsync({
          pickup: oisyOrderInput.pickup,
          shipping: oisyOrderInput.shipping
            ? {
                full_name: oisyOrderInput.shipping.full_name,
                street_line1: oisyOrderInput.shipping.street_line1,
                street_line2: oisyOrderInput.shipping.street_line2,
                city: oisyOrderInput.shipping.city,
                state: oisyOrderInput.shipping.state,
                zip: oisyOrderInput.shipping.zip,
                phone: oisyOrderInput.shipping.phone,
              }
            : undefined,
          items: orderItems.map((item) => ({
            product_id: toNatBigInt(item.product_id),
            plant_id: toOptionalNatBigInt(item.plant_id),
            price_cents: BigInt(item.unit_price_cents),
            quantity: BigInt(item.quantity),
          })),
        });
        if (cancelled) return;
        if (!order?.id) throw new Error("placeOrder returned no order id");
        setPayableOrderId(order.id);
      } catch (err) {
        if (cancelled) return;
        setOrderPrepError(
          err instanceof Error ? err.message : "Could not prepare order",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, isAuthenticated, orderItems, oisyOrderInput]);

  const handlePay = async ({
    ledgerCanisterId,
    amount,
  }: {
    token: import("../lib/token-payment").PaymentTokenSymbol;
    ledgerCanisterId: string;
    amount: bigint;
  }) => {
    if (effectiveOrderId == null) {
      toast.error(
        orderPrepError ??
          "Order is still being prepared — wait a moment and try again.",
      );
      return;
    }
    const result = await confirmDirect.mutateAsync({
      orderId: effectiveOrderId,
      ledgerCanisterId,
      amount,
    });
    setClaimTokens(result.claim_tokens);
    setNftTokenIds(result.nft_token_ids);
    clearCart();
    setPaidVia("ii");
    setPaid(true);
    toast.success("Purchase complete!");
  };

  const handleOisyPay = async ({
    token,
    ledgerCanisterId,
    amount,
  }: {
    token: import("../lib/token-payment").PaymentTokenSymbol;
    ledgerCanisterId: string;
    amount: bigint;
  }) => {
    if (!isOisyConnected || !oisyAgent || !oisyBackendActor) {
      toast.error("Connect your OISY wallet first");
      return;
    }
    // Re-place the order under the OISY identity so buyer = OISY principal.
    // Convert to Candid-style CreateOrderInput ([] | [T] for optionals).
    const shippingCandid: [] | [CandidShipping] = oisyOrderInput.shipping
      ? [
          {
            full_name: oisyOrderInput.shipping.full_name,
            street_line1: oisyOrderInput.shipping.street_line1,
            street_line2: oisyOrderInput.shipping.street_line2
              ? ([oisyOrderInput.shipping.street_line2] as [string])
              : ([] as []),
            city: oisyOrderInput.shipping.city,
            state: oisyOrderInput.shipping.state,
            zip: oisyOrderInput.shipping.zip,
            phone: oisyOrderInput.shipping.phone,
          },
        ]
      : [];

    const candidOrderInput: CandidOrderInput = {
      pickup: oisyOrderInput.pickup,
      shipping: shippingCandid,
      items: oisyOrderInput.items,
    };

    const oisyOrder = await oisyBackendActor.placeOrder(candidOrderInput);
    if (!oisyOrder?.id) throw new Error("OISY placeOrder failed");

    const bufferBps = isStablePaymentToken(token)
      ? 0
      : VOLATILE_APPROVE_BUFFER_BPS;
    await oisyIcrc2Approve(oisyAgent, ledgerCanisterId, amount, undefined, {
      bufferBps,
    });

    const result = await oisyBackendActor.confirmOrderPaymentDirect(
      oisyOrder.id,
      ledgerCanisterId,
      amount,
    );
    if (!result.success) throw new Error(result.message);

    setClaimTokens(result.claim_tokens);
    setNftTokenIds(result.nft_token_ids);
    clearCart();
    setPaidVia("oisy");
    setPaid(true);
    toast.success("OISY purchase complete! NFT custodied in OISY.");
  };

  const handleContinueShopping = () => {
    navigate({ to: "/marketplace" });
  };

  const handleViewOrders = () => {
    navigate({ to: "/orders" });
  };

  if (!isAuthenticated && !isOisyConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 py-12 text-center"
        data-ocid="checkout-payment-login"
      >
        <Lock className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-xs">
          Connect a wallet to pay for your order.
        </p>
        <Button onClick={login} data-ocid="checkout-payment-login-btn">
          <Flame className="w-4 h-4" />
          Sign in with Internet Identity
        </Button>
      </motion.div>
    );
  }

  if (paid && effectiveOrderId != null) {
    return (
      <PostPaymentOnboarding
        orderId={effectiveOrderId}
        totalCents={finalTotal}
        claimTokens={claimTokens}
        nftTokenIds={nftTokenIds}
        isPickup={isPickup}
        purchasedItems={purchasedItems}
        paidVia={paidVia}
        onContinueShopping={handleContinueShopping}
        onViewOrders={handleViewOrders}
      />
    );
  }

  const principalShort = principal
    ? `${principal.toText().slice(0, 5)}…${principal.toText().slice(-5)}`
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      data-ocid="checkout-payment-step"
    >
      {effectiveOrderId != null && (
        <div
          className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-4 text-center space-y-1"
          data-ocid="checkout-order-id-banner"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your IC SPICY order number
          </p>
          <p className="font-display font-bold text-3xl text-primary">
            #{effectiveOrderId.toString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Created on-chain — complete payment to confirm
          </p>
        </div>
      )}

      {showPayPalRetry && (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 space-y-3"
          data-ocid="checkout-paypal-retry"
        >
          <p className="text-sm font-semibold text-foreground">
            PayPal payment received for Order #{effectiveOrderId.toString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Your bank was charged but settlement did not finish: {settlementError}
          </p>
          <Button
            className="w-full"
            disabled={confirmPayPal.isPending}
            onClick={() => void handleRetryPayPalSettlement()}
          >
            {confirmPayPal.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry order settlement
              </>
            )}
          </Button>
        </div>
      )}

      {isAuthenticated && orderId !== 0n && (
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Order #{orderId.toString()} placed — choose a payment method
          </span>
        </div>
      )}
      {orderId === 0n && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {effectiveOrderId != null
              ? `Order #${effectiveOrderId.toString()} ready — choose a payment method`
              : isAuthenticated
                ? "Preparing your order for payment…"
                : "Choose a payment method — order will be placed when you confirm"}
          </span>
        </div>
      )}

      <div className="text-center py-2">
        <p className="text-muted-foreground text-sm mb-1">Order total</p>
        <p className="font-display font-bold text-3xl text-primary">
          ${usdAmount.toFixed(2)}
        </p>
      </div>

      {isAuthenticated && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            Internet Identity
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono text-emerald-400">
              {principalShort}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              Ready to pay
            </Badge>
          </div>
        </div>
      )}
      {isOisyConnected && oisyBackendActor && (
        <div className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            OISY Wallet
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-xs font-mono text-orange-400">
              {`${oisyBackendActor ? "connected" : ""}`}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-orange-500/30 bg-orange-500/10 text-orange-400">
              OISY pay available
            </Badge>
          </div>
        </div>
      )}

      <div
        className="rounded-xl border border-border bg-card p-5 space-y-3"
        data-ocid="checkout-paypal-options"
      >
        {!isAuthenticated ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Pay with PayPal or Venmo
            </p>
            <p className="text-xs text-muted-foreground">
              Sign in with Internet Identity to pay with PayPal or Venmo.
            </p>
            <Button size="sm" onClick={login} data-ocid="checkout-paypal-login-btn">
              Sign in for PayPal
            </Button>
          </div>
        ) : effectiveOrderId == null ? (
          <div className="space-y-2" data-ocid="checkout-paypal-preparing">
            <p className="text-sm font-medium text-foreground">
              Pay with PayPal or Venmo
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing order for PayPal…
            </div>
            {orderPrepError && (
              <p className="text-xs text-amber-400/90">{orderPrepError}</p>
            )}
          </div>
        ) : (
          <PayPalCheckoutPanel
            usdCents={finalTotal}
            customId={paypalCustomIds.order(effectiveOrderId)}
            disabled={confirmPayPal.isPending}
            onApproved={handlePayPalApproved}
            onError={(msg) => toast.error(msg)}
          />
        )}
      </div>

      <div
        className="rounded-xl border border-border bg-card p-5"
        data-ocid="checkout-payment-options"
      >
        <TokenPaymentPanel
          usdCents={finalTotal}
          onPay={handlePay}
          onOisyPay={handleOisyPay}
          payingToken={payingToken}
          setPayingToken={setPayingToken}
        />
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  usePageTitle("Checkout");
  const { track, USAGE } = useUsageTracking();

  useEffect(() => {
    track(
      USAGE.SHOP.CHECKOUT.feature,
      USAGE.SHOP.CHECKOUT.action,
      "shop:checkout",
    );
  }, [track, USAGE.SHOP.CHECKOUT]);

  const plantIdParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("plantId")
      : null;
  const pepperHeadParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("pepperHead")
      : null;

  const { isAuthenticated, login } = useAuth();
  const { isOisyConnected, oisyBackendActor } = useOisyWallet();
  const { actorReady } = useActorReady();
  const { items, removeItem, updateQuantity, subtotalCents } = useCart();
  const { discountPercent: nftDiscountPct, rarity } = useNftDiscount();
  const { discount: ravenDiscountPct } = useRavenPerks();
  const discountPercent = Math.min(nftDiscountPct + ravenDiscountPct, 20);
  const placeOrder = usePlaceOrder();

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("pickup");
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<bigint | null>(null);
  const [finalTotalForPayment, setFinalTotalForPayment] = useState<bigint>(0n);
  const [pendingOisyOrderInput, setPendingOisyOrderInput] =
    useState<OisyOrderInput>({ pickup: true, items: [] });

  const wantsShipping = fulfillment === "ship";

  const rawSubtotal = subtotalCents();
  const shipping = wantsShipping ? SHIPPING_FEE_CENTS : 0;
  const discountAmount = discountAmountCents(rawSubtotal, discountPercent);
  const discountedSubtotal = rawSubtotal - discountAmount;
  const finalTotal = discountedSubtotal + shipping;

  const isFormValid =
    !wantsShipping ||
    (form.fullName.trim() !== "" &&
      form.address1.trim() !== "" &&
      form.city.trim() !== "" &&
      form.state.trim() !== "" &&
      form.zip.trim() !== "" &&
      form.phone.trim() !== "");

  useEffect(() => {
    if (pendingOrderId !== null) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pendingOrderId]);

  if (plantIdParam) {
    return (
      <div className="container max-w-2xl py-8 px-4">
        <h1 className="text-2xl font-display font-bold mb-6">Plant Checkout</h1>
        <PlantCheckoutPanel plantId={BigInt(plantIdParam)} />
      </div>
    );
  }

  if (pepperHeadParam === "1") {
    return (
      <div className="container max-w-2xl py-8 px-4">
        <h1 className="text-2xl font-display font-bold mb-6">PepperHead Checkout</h1>
        <PepperHeadCheckoutPanel />
      </div>
    );
  }

  const updateField =
    (key: keyof ShippingForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated && !isOisyConnected) {
      login();
      return;
    }
    setSubmitted(true);
    if (!isFormValid) {
      toast.error(
        wantsShipping
          ? "Complete the shipping address to continue."
          : "Check your order details and try again.",
      );
      return;
    }
    if (isAuthenticated && !actorReady && !isOisyConnected) {
      toast.error("Still connecting to IC SPICY — wait a moment and try again.");
      return;
    }

    try {
      const shippingData = wantsShipping
        ? {
            full_name: form.fullName.trim(),
            street_line1: form.address1.trim(),
            street_line2: form.address2.trim() || undefined,
            city: form.city.trim(),
            state: form.state.trim(),
            zip: form.zip.trim(),
            phone: form.phone.trim(),
          }
        : undefined;

      // Build OISY Candid-style order input ([] | [T] optionals)
      const oisyInput: OisyOrderInput = {
        pickup: !wantsShipping,
        shipping: shippingData,
        items: items.map((item) => ({
          product_id: toNatBigInt(item.product_id),
          plant_id:
            item.plant_id != null
              ? ([toNatBigInt(item.plant_id)] as [bigint])
              : ([] as []),
          price_cents: BigInt(item.unit_price_cents),
          quantity: BigInt(item.quantity),
        })),
      };
      setPendingOisyOrderInput(oisyInput);

      if (isOisyConnected && !isAuthenticated) {
        // OISY-only path: skip the II placeOrder step entirely.
        // handleOisyPay inside PaymentStep will place the order under the OISY
        // principal and then approve + confirm payment in one flow.
        // Use 0n as a sentinel orderId — PaymentStep detects this and shows OISY-only UI.
        setFinalTotalForPayment(BigInt(finalTotal));
        setPendingOrderId(0n);
        return;
      }

      // II path (existing)
      const orderInput = {
        pickup: !wantsShipping,
        shipping: shippingData,
        items: items.map((item) => ({
          product_id: toNatBigInt(item.product_id),
          plant_id: toOptionalNatBigInt(item.plant_id),
          price_cents: BigInt(item.unit_price_cents),
          quantity: BigInt(item.quantity),
        })),
      };
      const order = await placeOrder.mutateAsync(orderInput);
      if (!order?.id) {
        throw new Error("placeOrder returned null or missing id");
      }
      setFinalTotalForPayment(BigInt(order.total_cents));
      setPendingOrderId(order.id);
    } catch (err) {
      console.error("[checkout] placeOrder failed", err);
      toast.error(
        err instanceof Error
          ? `Failed to place order: ${err.message}`
          : "Failed to place order. Please try again.",
      );
    }
  };

  // ─ Guards ─
  if (!isAuthenticated && !isOisyConnected) return <AuthGate login={login} />;
  if (items.length === 0 && pendingOrderId === null) return <EmptyCart />;

  const sessionConnecting = isAuthenticated && !actorReady && !isOisyConnected;

  // ─ Payment step ─
  if (pendingOrderId !== null) {
    return (
      <div className="max-w-xl mx-auto" data-ocid="checkout-payment">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag className="w-7 h-7 text-primary" />
          <h1 className="font-display font-bold text-3xl text-foreground">
            <span className="text-fire">Payment</span>
          </h1>
        </div>
        <PaymentStep
          orderId={pendingOrderId}
          finalTotal={finalTotalForPayment}
          isPickup={fulfillment === "pickup"}
          orderItems={items}
          oisyOrderInput={pendingOisyOrderInput}
        />
      </div>
    );
  }

  // ─ Review step ─
  return (
    <div className="max-w-4xl mx-auto" data-ocid="checkout-page">
      <NoIndexSeo title="Checkout | IC SPICY" path="/checkout" />
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag className="w-7 h-7 text-primary" />
        <h1 className="font-display font-bold text-3xl text-foreground">
          <span className="text-fire">Checkout</span>
        </h1>
      </div>

      <form onSubmit={handleContinueToPayment}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ─ Left column: cart items + fulfillment form ─ */}
          <div className="lg:col-span-3 space-y-6">
            {/* Cart items */}
            <div>
              <h2 className="font-display font-semibold text-foreground text-lg mb-3">
                Your Items
              </h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <motion.div
                    key={item.line_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
                    data-ocid="cart-item"
                  >
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
                      {getProductEmoji(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {item.name}
                      </p>
                      {item.variety && (
                        <p className="text-xs text-muted-foreground">
                          {item.variety}
                        </p>
                      )}
                      <p className="text-[10px] text-primary/80 mt-0.5">
                        🎫 NFT included
                      </p>
                      <p className="text-primary text-sm font-bold mt-0.5">
                        {item.weight_based && item.unit_label
                          ? `$${(item.unit_price_cents / 100).toFixed(2)}/${item.unit_label}`
                          : `$${(item.unit_price_cents / 100).toFixed(2)} ea.`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.line_id, item.quantity - 1)
                        }
                        className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-smooth"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-foreground">
                        {item.quantity}
                        {item.weight_based && item.unit_label
                          ? ` ${item.unit_label}`
                          : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.line_id, item.quantity + 1)
                        }
                        disabled={item.unique_listing}
                        className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-smooth disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="w-16 text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">
                        {formatLinePrice(
                          item.unit_price_cents,
                          item.quantity,
                          item.weight_based,
                          item.unit_label,
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.line_id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-smooth"
                      aria-label="Remove item"
                      data-ocid="cart-remove-item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Fulfillment — customer choice for entire order */}
            <div>
              <h2 className="font-display font-semibold text-foreground text-lg mb-3">
                Fulfillment
              </h2>

              <FulfillmentSelector
                method={fulfillment}
                onChange={setFulfillment}
              />

              {wantsShipping ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 mt-4"
                  data-ocid="checkout-shipping-form"
                >
                  <ShippingNoticeBox />
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Shipping address
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Label
                        htmlFor="fullName"
                        className="text-xs font-medium mb-1.5 block"
                      >
                        Full Name *
                      </Label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={updateField("fullName")}
                        placeholder="Jane Smith"
                        required
                        className={`text-sm ${submitted && !form.fullName ? "border-destructive" : ""}`}
                        data-ocid="checkout-fullname-input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label
                        htmlFor="address1"
                        className="text-xs font-medium mb-1.5 block"
                      >
                        Street Address *
                      </Label>
                      <Input
                        id="address1"
                        value={form.address1}
                        onChange={updateField("address1")}
                        placeholder="123 Pepper Farm Rd"
                        required
                        className={`text-sm ${submitted && !form.address1 ? "border-destructive" : ""}`}
                        data-ocid="checkout-address1-input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label
                        htmlFor="address2"
                        className="text-xs font-medium mb-1.5 block"
                      >
                        Apt / Suite
                      </Label>
                      <Input
                        id="address2"
                        value={form.address2}
                        onChange={updateField("address2")}
                        placeholder="Apt, Suite, Unit (optional)"
                        className="text-sm"
                        data-ocid="checkout-address2-input"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="city"
                        className="text-xs font-medium mb-1.5 block"
                      >
                        City *
                      </Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={updateField("city")}
                        placeholder="Port Charlotte"
                        required
                        className={`text-sm ${submitted && !form.city ? "border-destructive" : ""}`}
                        data-ocid="checkout-city-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label
                          htmlFor="state"
                          className="text-xs font-medium mb-1.5 block"
                        >
                          State *
                        </Label>
                        <Input
                          id="state"
                          value={form.state}
                          onChange={updateField("state")}
                          placeholder="FL"
                          maxLength={2}
                          required
                          className={`text-sm uppercase ${submitted && !form.state ? "border-destructive" : ""}`}
                          data-ocid="checkout-state-input"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="zip"
                          className="text-xs font-medium mb-1.5 block"
                        >
                          ZIP *
                        </Label>
                        <Input
                          id="zip"
                          value={form.zip}
                          onChange={updateField("zip")}
                          placeholder="33948"
                          maxLength={10}
                          required
                          className={`text-sm ${submitted && !form.zip ? "border-destructive" : ""}`}
                          data-ocid="checkout-zip-input"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Label
                        htmlFor="phone"
                        className="text-xs font-medium mb-1.5 block"
                      >
                        Phone *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={updateField("phone")}
                        placeholder="(941) 555-0100"
                        required
                        className={`text-sm ${submitted && !form.phone ? "border-destructive" : ""}`}
                        data-ocid="checkout-phone-input"
                      />
                    </div>
                  </div>
                  {submitted && !isFormValid && (
                    <p className="text-xs text-destructive">
                      Please fill in all required shipping fields.
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-muted-foreground mt-4 leading-relaxed"
                  data-ocid="checkout-pickup-info"
                >
                  Pick up at {PICKUP_ADDRESS}. You&apos;ll receive a QR claim
                  code after payment — bring it to the nursery to collect your
                  order.
                </motion.p>
              )}
            </div>
          </div>

          {/* ─ Right column: order summary ─ */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-card border border-border p-6 sticky top-24">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">
                Order Summary
              </h2>

              <div className="space-y-2 text-sm mb-4">
                {items.map((item) => (
                  <div
                    key={item.line_id}
                    className="flex justify-between text-muted-foreground"
                  >
                    <span className="truncate mr-2 min-w-0">
                      {item.name} ×{item.quantity}
                      {item.weight_based && item.unit_label
                        ? ` ${item.unit_label}`
                        : ""}
                    </span>
                    <span className="flex-shrink-0">
                      {formatLinePrice(
                        item.unit_price_cents,
                        item.quantity,
                        item.weight_based,
                        item.unit_label,
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="mb-4" />

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${(rawSubtotal / 100).toFixed(2)}</span>
                </div>

                <NftDiscountSection
                  discountPercent={discountPercent}
                  nftDiscountPercent={nftDiscountPct}
                  ravenDiscountPercent={ravenDiscountPct}
                  rarity={rarity}
                  discountAmount={discountAmount}
                />

                {wantsShipping ? (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>USPS Small Flat Rate shipping</span>
                    <span>{SHIPPING_FEE_LABEL}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Local pickup</span>
                    <Badge
                      variant="outline"
                      className="text-xs border-primary/30 text-primary"
                    >
                      Free
                    </Badge>
                  </div>
                )}
              </div>

              <Separator className="mb-4" />

              <div className="flex justify-between text-foreground font-bold text-lg mb-6">
                <span>Total</span>
                <span className="text-primary">
                  ${(finalTotal / 100).toFixed(2)}
                </span>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={placeOrder.isPending || sessionConnecting}
                data-ocid="checkout-submit-btn"
              >
                {placeOrder.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing Order…
                  </>
                ) : sessionConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Secured by Internet Identity
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
