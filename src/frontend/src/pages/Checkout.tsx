import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import {
  useConfirmOrderPaymentDirect,
  usePlaceOrder,
} from "../hooks/useBackend";
import { useCart } from "../hooks/useCart";
import { useNftDiscount } from "../hooks/useNftDiscount";
import { PlantCheckoutPanel } from "../components/PlantCheckoutPanel";
import {
  TokenPaymentPanel,
  useTokenPaymentState,
} from "../components/TokenPaymentPanel";
import {
  formatLinePrice,
  PICKUP_ADDRESS,
  toNatBigInt,
  toOptionalNatBigInt,
  USPS_SMALL_FLAT_RATE_CENTS,
} from "../lib/cart-utils";
import type { CartItem } from "../types";
import {
  discountAmountCents,
  formatRarityLabel,
} from "../lib/discount-utils";
import { usePageTitle } from "../hooks/usePageTitle";
import { variantToString } from "@/lib/candid-display";

// ─── Discount line ────────────────────────────────────────────────────────────

function NftDiscountSection({
  discountPercent,
  rarity,
  discountAmount,
}: {
  discountPercent: number;
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

  return (
    <div className="space-y-2" data-ocid="checkout-nft-discount">
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
        🌶️ NFT Holder Discount: {discountPercent}% off
        {rarityLabel ? ` (${rarityLabel})` : ""}
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          NFT discount ({discountPercent}%)
        </span>
        <span className="font-semibold text-primary">
          -${(discountAmount / 100).toFixed(2)}
        </span>
      </div>
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
        Sign in to Checkout
      </h2>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        You need an Internet Identity account to place orders. It's free and
        secure.
      </p>
      <Button
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={login}
        data-ocid="checkout-login-btn"
      >
        <Flame className="w-4 h-4" />
        Connect with Internet Identity
      </Button>
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

// ─── Payment step ─────────────────────────────────────────────────────────────

function PaymentStep({
  orderId,
  finalTotal,
  isPickup,
  orderItems,
}: {
  orderId: bigint;
  finalTotal: bigint;
  isPickup: boolean;
  orderItems: CartItem[];
}) {
  const { isAuthenticated, login, principal } = useAuth();
  const clearCart = useCart((s) => s.clearCart);
  const confirmDirect = useConfirmOrderPaymentDirect();
  const navigate = useNavigate();
  const [payingToken, setPayingToken] = useTokenPaymentState();

  const [purchasedItems] = useState(() => [...orderItems]);
  const [claimTokens, setClaimTokens] = useState<string[]>([]);
  const [nftTokenIds, setNftTokenIds] = useState<bigint[]>([]);
  const [paid, setPaid] = useState(false);

  const usdAmount = Number(finalTotal) / 100;

  const handlePay = async ({
    ledgerCanisterId,
    amount,
  }: {
    token: import("../lib/token-payment").PaymentTokenSymbol;
    ledgerCanisterId: string;
    amount: bigint;
  }) => {
    const result = await confirmDirect.mutateAsync({
      orderId,
      ledgerCanisterId,
      amount,
    });
    setClaimTokens(result.claim_tokens);
    setNftTokenIds(result.nft_token_ids);
    clearCart();
    setPaid(true);
    toast.success("Purchase complete!");
  };

  const handleContinueShopping = () => {
    navigate({ to: "/marketplace" });
  };

  const handleViewOrders = () => {
    navigate({ to: "/orders" });
  };

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 py-12 text-center"
        data-ocid="checkout-payment-login"
      >
        <Lock className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-xs">
          Sign in with Internet Identity to pay for your order.
        </p>
        <Button onClick={login} data-ocid="checkout-payment-login-btn">
          <Flame className="w-4 h-4" />
          Sign in with Internet Identity to pay
        </Button>
      </motion.div>
    );
  }

  if (paid) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 py-4"
        data-ocid="payment-success"
      >
        <div className="text-center space-y-2">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <p className="font-display font-bold text-foreground text-xl">
            Purchase Complete!
          </p>
          <p className="text-sm text-muted-foreground">
            Order #{orderId.toString()} · ${usdAmount.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-left">
          <p className="text-sm font-semibold text-foreground">Your items</p>
          {purchasedItems.map((item, index) => {
            const nftId = nftTokenIds[index];
            const linePrice = formatLinePrice(
              item.unit_price_cents,
              item.quantity,
              item.weight_based,
              item.unit_label,
            );
            return (
              <div
                key={item.line_id}
                className="border-t border-border pt-3 first:border-t-0 first:pt-0 space-y-2"
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-foreground font-medium">
                    {item.name}
                  </span>
                  <span className="text-foreground font-semibold flex-shrink-0">
                    {linePrice}
                  </span>
                </div>
                {nftId != null && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
                    <p className="text-xs text-foreground">
                      🎨 IC SPICY #{nftId.toString()} is now in your wallet
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to="/nft/$tokenId"
                        params={{ tokenId: nftId.toString() }}
                      >
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          View NFT
                        </Button>
                      </Link>
                      <Link to="/wallet">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          View in Wallet
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-left">
          <p className="text-sm font-semibold text-foreground">Fulfillment</p>
          {isPickup ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                Local Pickup — Port Charlotte, FL
              </p>
              {claimTokens.length > 0 ? (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Show this code at pickup:
                  </p>
                  {claimTokens.map((t) => (
                    <p
                      key={t}
                      className="text-xs font-mono break-all text-foreground"
                    >
                      {t}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick up at {PICKUP_ADDRESS} when your order is ready.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Package className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              Your order is paid and will ship to the address you provided.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleContinueShopping}
            data-ocid="payment-continue-shopping-btn"
          >
            Continue Shopping
          </Button>
          <Button
            className="w-full"
            onClick={handleViewOrders}
            data-ocid="payment-view-orders-btn"
          >
            View My Orders
          </Button>
        </div>
      </motion.div>
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
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Order #{orderId.toString()} placed — choose a payment method
        </span>
      </div>

      <div className="text-center py-2">
        <p className="text-muted-foreground text-sm mb-1">Order total</p>
        <p className="font-display font-bold text-3xl text-primary">
          ${usdAmount.toFixed(2)}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          Signed in with Internet Identity
        </span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-mono text-emerald-400">
            {principalShort}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          >
            Ready to pay
          </Badge>
        </div>
      </div>

      <div
        className="rounded-xl border border-border bg-card p-5"
        data-ocid="checkout-payment-options"
      >
        <TokenPaymentPanel
          usdCents={finalTotal}
          onPay={handlePay}
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

  const plantIdParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("plantId")
      : null;

  if (plantIdParam) {
    return (
      <div className="container max-w-2xl py-8 px-4">
        <h1 className="text-2xl font-display font-bold mb-6">Plant Checkout</h1>
        <PlantCheckoutPanel plantId={BigInt(plantIdParam)} />
      </div>
    );
  }

  const { isAuthenticated, login } = useAuth();
  const { items, removeItem, updateQuantity, subtotalCents } = useCart();
  const { discountPercent, rarity } = useNftDiscount();
  const placeOrder = usePlaceOrder();

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("pickup");
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<bigint | null>(null);
  const [finalTotalForPayment, setFinalTotalForPayment] = useState<bigint>(0n);

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

  const updateField =
    (key: keyof ShippingForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      login();
      return;
    }
    setSubmitted(true);
    if (!isFormValid) return;

    try {
      const orderInput = {
        pickup: !wantsShipping,
        shipping: wantsShipping
          ? {
              full_name: form.fullName.trim(),
              street_line1: form.address1.trim(),
              street_line2: form.address2.trim() || undefined,
              city: form.city.trim(),
              state: form.state.trim(),
              zip: form.zip.trim(),
              phone: form.phone.trim(),
            }
          : undefined,
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
  if (!isAuthenticated) return <AuthGate login={login} />;
  if (items.length === 0 && !pendingOrderId) return <EmptyCart />;

  // ─ Payment step ─
  if (pendingOrderId) {
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
        />
      </div>
    );
  }

  // ─ Review step ─
  return (
    <div className="max-w-4xl mx-auto" data-ocid="checkout-page">
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
                disabled={placeOrder.isPending}
                data-ocid="checkout-submit-btn"
              >
                {placeOrder.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing Order…
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
