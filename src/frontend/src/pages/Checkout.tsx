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
  Wallet,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import {
  useConfirmICPayPayment,
  usePlaceOrder,
} from "../hooks/useBackend";
import { useCart } from "../hooks/useCart";
import { useNftDiscount } from "../hooks/useNftDiscount";
import { useICPay } from "../hooks/useICPay";
import { PlantCheckoutPanel } from "../components/PlantCheckoutPanel";
import {
  formatLinePrice,
  PICKUP_ADDRESS,
  USPS_SMALL_FLAT_RATE_CENTS,
} from "../lib/cart-utils";
import {
  discountAmountCents,
  formatRarityLabel,
} from "../lib/discount-utils";

// ─── Discount line ────────────────────────────────────────────────────────────

function NftDiscountSection({
  discountPercent,
  rarity,
  discountAmount,
}: {
  discountPercent: number;
  rarity: string;
  discountAmount: bigint;
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
          -${(Number(discountAmount) / 100).toFixed(2)}
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

function getProductEmoji(category: string) {
  if (category === "Spice") return "🧂";
  if (category === "GardenInputs" || category === "GardenAmendment") return "🌿";
  return "🌶️";
}

// ─── Auth gate ────────────────────────────────────────────────────────────────

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

// ─── Shipping form ────────────────────────────────────────────────────────────

function WalletStatus({ principal }: { principal: string | null }) {
  if (!principal) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
        No wallet connected
      </div>
    );
  }
  const short = `${principal.slice(0, 5)}…${principal.slice(-5)}`;
  return (
    <div className="flex items-center gap-2 text-xs text-emerald-400">
      <div className="w-2 h-2 rounded-full bg-emerald-400" />
      <span className="font-mono">{short}</span>
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      >
        Connected
      </Badge>
    </div>
  );
}

// ─── Payment step ─────────────────────────────────────────────────────────────

function PaymentStep({
  orderId,
  finalTotal,
  onComplete,
}: {
  orderId: bigint;
  finalTotal: bigint;
  onComplete: () => void;
}) {
  const confirmICPay = useConfirmICPayPayment();
  const navigate = useNavigate();
  const [walletPrincipal, setWalletPrincipal] = useState<string | null>(null);

  const usdAmount = Number(finalTotal) / 100;

  const icpay = useICPay({
    onSuccess: async (paymentId) => {
      try {
        await confirmICPay.mutateAsync({ orderId, paymentId });
        toast.success("Payment confirmed!");
        onComplete();
        navigate({ to: "/orders" });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Backend confirmation failed",
        );
      }
    },
    onError: (msg) => toast.error(msg),
  });

  const handleConnect = async (
    provider: "plug" | "oisy" | "internet-identity",
  ) => {
    const result = await icpay.connectWallet(provider);
    if (result?.connected) setWalletPrincipal(result.principal);
  };

  const handlePay = async () => {
    await icpay.payUsd(usdAmount, { orderId: orderId.toString() });
  };

  const isPending =
    icpay.status === "connecting" ||
    icpay.status === "paying" ||
    icpay.status === "confirming" ||
    confirmICPay.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      data-ocid="checkout-payment-step"
    >
      {/* Order reference */}
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Order #{orderId.toString()} placed — complete payment to confirm
        </span>
      </div>

      {/* Total */}
      <div className="text-center py-4">
        <p className="text-muted-foreground text-sm mb-1">Order total</p>
        <p className="font-display font-bold text-3xl text-primary">
          ${usdAmount.toFixed(2)}
        </p>
      </div>

      {/* Payment panel */}
      <div
        className="rounded-xl border border-border bg-card p-5 space-y-5"
        data-ocid="icpay-panel"
      >
        {/* Wallet status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Crypto Wallet
          </span>
          <WalletStatus principal={walletPrincipal} />
        </div>

        {/* Connect wallet options */}
        {!walletPrincipal && (
          <div className="space-y-2" data-ocid="wallet-connect-options">
            <p className="text-xs text-muted-foreground">
              Connect a wallet to pay with ICP or ckTokens, or pay directly
              with card below.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={icpay.status === "connecting"}
                onClick={() => handleConnect("plug")}
                data-ocid="connect-plug-btn"
              >
                {icpay.status === "connecting" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wallet className="w-3 h-3" />
                )}
                Plug
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={icpay.status === "connecting"}
                onClick={() => handleConnect("oisy")}
                data-ocid="connect-oisy-btn"
              >
                {icpay.status === "connecting" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wallet className="w-3 h-3" />
                )}
                OISY
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Status indicator */}
        <AnimatePresence mode="wait">
          {icpay.status === "confirming" || confirmICPay.isPending ? (
            <motion.div
              key="confirming"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 text-sm text-muted-foreground"
              data-ocid="payment-confirming"
            >
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Confirming payment on-chain…
            </motion.div>
          ) : icpay.status === "error" ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
              data-ocid="payment-error"
            >
              <p className="text-sm text-destructive">{icpay.error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={icpay.reset}
                className="w-full"
              >
                Try Again
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="pay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={isPending}
                onClick={handlePay}
                data-ocid="pay-btn"
              >
                {icpay.status === "paying" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opening payment…
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    Pay ${usdAmount.toFixed(2)}
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          Powered by ICPay — crypto wallet &amp; card accepted
        </p>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {icpay.status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6 text-center"
            data-ocid="payment-success"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            <p className="font-semibold text-foreground">Order confirmed!</p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your orders…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
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
  const { items, removeItem, updateQuantity, subtotalCents, shippingCents, hasShippableItems, clearCart } =
    useCart();
  const { discountPercent, rarity } = useNftDiscount();
  const placeOrder = usePlaceOrder();

  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<bigint | null>(null);
  const [finalTotalForPayment, setFinalTotalForPayment] = useState<bigint>(0n);

  const needsShipping = hasShippableItems();
  const hasPickupItems = items.some((i) => !i.shippable);

  const rawSubtotal = subtotalCents();
  const shipping = shippingCents();
  const discountAmount = discountAmountCents(rawSubtotal, discountPercent);
  const discountedSubtotal = rawSubtotal - discountAmount;
  const finalTotal = discountedSubtotal + shipping;

  const isFormValid =
    !needsShipping ||
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
      const order = await placeOrder.mutateAsync({
        pickup: !needsShipping,
        shipping: needsShipping
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
          product_id: item.product_id,
          plant_id: item.plant_id,
          price_cents: item.unit_price_cents,
          quantity: BigInt(item.quantity),
        })),
      });
      setFinalTotalForPayment(BigInt(order.total_cents));
      setPendingOrderId(order.id);
    } catch {
      toast.error("Failed to place order. Please try again.");
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
          onComplete={clearCart}
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
                        {item.shippable ? " · Ships" : " · Local pickup"}
                      </p>
                      <p className="text-primary text-sm font-bold mt-0.5">
                        {item.weight_based && item.unit_label
                          ? `$${(Number(item.unit_price_cents) / 100).toFixed(2)}/${item.unit_label}`
                          : `$${(Number(item.unit_price_cents) / 100).toFixed(2)} ea.`}
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

            {/* Fulfillment — auto-detected from cart */}
            <div>
              <h2 className="font-display font-semibold text-foreground text-lg mb-3">
                Fulfillment
              </h2>

              {hasPickupItems && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 border border-border mb-4"
                  data-ocid="checkout-pickup-info"
                >
                  <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Local Pickup — {PICKUP_ADDRESS}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Pickup items receive a QR claim code after payment. Bring
                      it to the nursery to collect your order.
                    </p>
                  </div>
                </motion.div>
              )}

              {needsShipping ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                  data-ocid="checkout-shipping-form"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Shipping address
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-primary/30 text-primary ml-auto"
                    >
                      USPS Small Flat Rate · $
                      {(Number(USPS_SMALL_FLAT_RATE_CENTS) / 100).toFixed(2)}
                    </Badge>
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
                <p className="text-xs text-muted-foreground">
                  All items in your cart are local pickup only — no shipping
                  address needed.
                </p>
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
                      $
                      {(
                        Number(
                          item.unit_price_cents * BigInt(item.quantity),
                        ) / 100
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="mb-4" />

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${(Number(rawSubtotal) / 100).toFixed(2)}</span>
                </div>

                <NftDiscountSection
                  discountPercent={discountPercent}
                  rarity={rarity}
                  discountAmount={discountAmount}
                />

                {shipping > 0n && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>USPS Small Flat Rate shipping</span>
                    <span>${(Number(shipping) / 100).toFixed(2)}</span>
                  </div>
                )}

                {!needsShipping && hasPickupItems && (
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
                  ${(Number(finalTotal) / 100).toFixed(2)}
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
