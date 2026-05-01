import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Crown,
  Flame,
  Gem,
  Loader2,
  Lock,
  MapPin,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { MembershipTier, RarityTier } from "../backend";
import { useAuth } from "../hooks/useAuth";
import {
  useHasMembership,
  useMembership,
  useMyPlants,
  usePlaceOrder,
} from "../hooks/useBackend";
import { useCart } from "../hooks/useCart";

// ─── Rarity config ─────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<
  RarityTier,
  {
    label: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    discountPct: number;
    icon: React.ReactNode;
  }
> = {
  [RarityTier.Common]: {
    label: "Common",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    discountPct: 10,
    icon: <Star className="w-3 h-3" />,
  },
  [RarityTier.Uncommon]: {
    label: "Uncommon",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    discountPct: 12,
    icon: <Sparkles className="w-3 h-3" />,
  },
  [RarityTier.Rare]: {
    label: "Rare",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    discountPct: 15,
    icon: <Crown className="w-3 h-3" />,
  },
};

// Derive rarity tier from the membership NFT tier.
// MembershipTier.Premium → Rare (15%), Standard → Common (10%).
// Falls back to Common when no explicit tier is determinable.
function getRarityFromMembershipTier(
  tier: MembershipTier | undefined,
): RarityTier {
  if (tier === MembershipTier.Premium) return RarityTier.Rare;
  return RarityTier.Common;
}

// ─── Shipping form fields ─────────────────────────────────────────────────────

interface ShippingForm {
  fullName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  email: string;
}

const EMPTY_FORM: ShippingForm = {
  fullName: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  email: "",
};

function formatAddress(f: ShippingForm) {
  return [
    f.fullName,
    f.address1,
    f.address2,
    `${f.city}, ${f.state} ${f.zip}`,
    f.email,
  ]
    .filter(Boolean)
    .join(", ");
}

// ─── Unauthenticated gate ─────────────────────────────────────────────────────

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

// ─── Discount line ────────────────────────────────────────────────────────────

function DiscountLine({
  hasMembership,
  discountPct,
  discountAmount,
  rarityTier,
}: {
  hasMembership: boolean;
  discountPct: number;
  discountAmount: bigint;
  rarityTier: RarityTier | null;
}) {
  if (!hasMembership) {
    return (
      <div
        className="flex items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-xs"
        data-ocid="checkout-discount-cta"
      >
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Gem className="w-3.5 h-3.5 text-primary" />
          Unlock Lifetime Discounts
        </span>
        <Link
          to="/marketplace"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Claim a Plant NFT →
        </Link>
      </div>
    );
  }

  const cfg = rarityTier
    ? RARITY_CONFIG[rarityTier]
    : RARITY_CONFIG[RarityTier.Common];

  return (
    <div className="space-y-1.5" data-ocid="checkout-nft-discount">
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-1.5">
          <span className={cfg.colorClass}>{cfg.icon}</span>
          <span className="text-foreground font-medium">
            NFT Loyalty Discount ({discountPct}%)
          </span>
          {rarityTier && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 ml-0.5 border ${cfg.borderClass} ${cfg.bgClass} ${cfg.colorClass} font-bold`}
            >
              {cfg.label}
            </Badge>
          )}
        </span>
        <span className={`font-semibold ${cfg.colorClass}`}>
          -${(Number(discountAmount) / 100).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { isAuthenticated, login } = useAuth();
  const { items, removeItem, updateQuantity, totalCents, clearCart } =
    useCart();
  const { data: hasMembership = false } = useHasMembership();
  const { data: membership } = useMembership();
  const { data: myPlants = [] } = useMyPlants();
  const placeOrder = usePlaceOrder();
  const navigate = useNavigate();

  const [pickup, setPickup] = useState(false);
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  // Determine highest rarity tier from claimed plant NFTs or membership
  let rarityTier: RarityTier | null = null;
  if (hasMembership && membership) {
    rarityTier = getRarityFromMembershipTier(membership.tier);
  } else if (myPlants.some((p) => p.nft_id)) {
    // Has plant NFTs but no membership record — default to Common discount
    rarityTier = RarityTier.Common;
  }

  const discountPct = rarityTier
    ? RARITY_CONFIG[rarityTier].discountPct
    : hasMembership
      ? 10
      : 0;

  const rawTotal = totalCents();
  const discountAmount = hasMembership
    ? (rawTotal * BigInt(discountPct)) / BigInt(100)
    : BigInt(0);
  const finalTotal = rawTotal - discountAmount;

  const isFormValid =
    pickup ||
    (form.fullName.trim() !== "" &&
      form.address1.trim() !== "" &&
      form.city.trim() !== "" &&
      form.state.trim() !== "" &&
      form.zip.trim() !== "" &&
      form.email.trim() !== "");

  const updateField =
    (key: keyof ShippingForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      login();
      return;
    }
    setSubmitted(true);
    if (!isFormValid) return;

    try {
      await placeOrder.mutateAsync({
        pickup,
        shipping_address: pickup ? undefined : formatAddress(form),
        items: items.map((item) => ({
          product_id: item.product_id,
          plant_id: item.plant_id,
          price_cents: item.price_cents,
          quantity: BigInt(item.quantity),
        })),
      });
      clearCart();
      toast.success("🌶️ Order placed! We'll be in touch soon.");
      navigate({ to: "/orders" });
    } catch {
      toast.error("Failed to place order. Please try again.");
    }
  };

  if (!isAuthenticated) return <AuthGate login={login} />;
  if (items.length === 0) return <EmptyCart />;

  return (
    <div className="max-w-4xl mx-auto" data-ocid="checkout-page">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag className="w-7 h-7 text-primary" />
        <h1 className="font-display font-bold text-3xl text-foreground">
          <span className="text-fire">Checkout</span>
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ─ Left column: cart items + form ─ */}
          <div className="lg:col-span-3 space-y-6">
            {/* Cart items */}
            <div>
              <h2 className="font-display font-semibold text-foreground text-lg mb-3">
                Your Items
              </h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <motion.div
                    key={item.product_id.toString()}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
                    data-ocid="cart-item"
                  >
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
                      {item.category === "Spice" ? "🧂" : "🌶️"}
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
                      <p className="text-primary text-sm font-bold mt-0.5">
                        ${(Number(item.price_cents) / 100).toFixed(2)} ea.
                      </p>
                    </div>
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product_id, item.quantity - 1)
                        }
                        className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-smooth"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product_id, item.quantity + 1)
                        }
                        className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-smooth"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="w-16 text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">
                        $
                        {(
                          Number(item.price_cents * BigInt(item.quantity)) / 100
                        ).toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product_id)}
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

            {/* Fulfillment toggle */}
            <div>
              <h2 className="font-display font-semibold text-foreground text-lg mb-3">
                Fulfillment Method
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setPickup(false)}
                  className={[
                    "flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-smooth",
                    !pickup
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-card border-border text-muted-foreground hover:border-border/80",
                  ].join(" ")}
                  data-ocid="checkout-shipping-btn"
                >
                  <Package className="w-6 h-6" />
                  <span>Ship to me</span>
                  <span className="text-xs opacity-70 font-normal">
                    Enter shipping address
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPickup(true)}
                  className={[
                    "flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-smooth",
                    pickup
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-card border-border text-muted-foreground hover:border-border/80",
                  ].join(" ")}
                  data-ocid="checkout-pickup-btn"
                >
                  <MapPin className="w-6 h-6" />
                  <span>Local Pickup</span>
                  <span className="text-xs opacity-70 font-normal">
                    Port Charlotte, FL
                  </span>
                </button>
              </div>

              {pickup ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 border border-border"
                >
                  <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      IC SPICY Nursery — Port Charlotte, FL
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      After placing your order, you'll receive a confirmation
                      with pickup details and a QR code for pickup verification.
                      We'll coordinate a time that works for you.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
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
                        Address Line 1 *
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
                        Address Line 2
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
                        htmlFor="email"
                        className="text-xs font-medium mb-1.5 block"
                      >
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={updateField("email")}
                        placeholder="you@example.com"
                        required
                        className={`text-sm ${submitted && !form.email ? "border-destructive" : ""}`}
                        data-ocid="checkout-email-input"
                      />
                    </div>
                  </div>
                  {submitted && !isFormValid && (
                    <p className="text-xs text-destructive">
                      Please fill in all required fields.
                    </p>
                  )}
                </motion.div>
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
                    key={item.product_id.toString()}
                    className="flex justify-between text-muted-foreground"
                  >
                    <span className="truncate mr-2 min-w-0">
                      {item.name} ×{item.quantity}
                    </span>
                    <span className="flex-shrink-0">
                      $
                      {(
                        Number(item.price_cents * BigInt(item.quantity)) / 100
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="mb-4" />

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${(Number(rawTotal) / 100).toFixed(2)}</span>
                </div>

                <DiscountLine
                  hasMembership={hasMembership}
                  discountPct={discountPct}
                  discountAmount={discountAmount}
                  rarityTier={rarityTier}
                />

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{pickup ? "Local Pickup" : "Shipping"}</span>
                  <Badge
                    variant="outline"
                    className="text-xs border-primary/30 text-primary"
                  >
                    TBD
                  </Badge>
                </div>
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
                    Place Order
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
