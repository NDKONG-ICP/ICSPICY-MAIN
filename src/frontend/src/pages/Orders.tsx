import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  MapPin,
  Package,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { OrderStatus } from "../backend";
import { useAuth } from "../hooks/useAuth";
import { useMyOrders } from "../hooks/useBackend";
import type { Order } from "../types/index";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; Icon: typeof Clock; badgeClass: string; dotClass: string }
> = {
  [OrderStatus.Pending]: {
    label: "Pending",
    Icon: Clock,
    badgeClass: "bg-amber-950/40 text-amber-300 border-amber-700/50",
    dotClass: "bg-amber-400",
  },
  [OrderStatus.Shipped]: {
    label: "Shipped",
    Icon: Truck,
    badgeClass: "bg-blue-950/40 text-blue-300 border-blue-700/50",
    dotClass: "bg-blue-400",
  },
  [OrderStatus.PickedUp]: {
    label: "Picked Up",
    Icon: Check,
    badgeClass: "bg-emerald-950/40 text-emerald-300 border-emerald-700/50",
    dotClass: "bg-emerald-400",
  },
  [OrderStatus.Cancelled]: {
    label: "Cancelled",
    Icon: X,
    badgeClass: "bg-secondary text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  },
};

// ─── OrderRow ─────────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status];
  const { Icon } = cfg;

  const date = new Date(Number(order.created_at) / 1_000_000);
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border overflow-hidden"
      data-ocid="order-row"
    >
      {/* Summary row */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="font-display font-semibold text-foreground text-sm">
              Order #{order.id.toString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
          </div>
          <Badge
            className={`${cfg.badgeClass} border text-xs flex items-center gap-1 flex-shrink-0`}
          >
            <Icon className="w-3 h-3" />
            {cfg.label}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </span>
          {order.pickup ? (
            <span className="flex items-center gap-1 text-primary">
              <MapPin className="w-3.5 h-3.5" />
              Local Pickup
            </span>
          ) : order.shipping_address ? (
            <span className="flex items-center gap-1 truncate max-w-xs">
              <Truck className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{order.shipping_address}</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-primary font-bold text-lg font-display">
            ${(Number(order.total_cents) / 100).toFixed(2)}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-smooth px-2 py-1 rounded-lg hover:bg-secondary"
            data-ocid="order-expand-btn"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                View details
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            data-ocid="order-detail"
          >
            <div className="px-5 pb-5 pt-0 border-t border-border mt-0">
              <div className="pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Line Items
                </p>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={`${item.product_id.toString()}-${idx}`}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-secondary/40"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">🌶️</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">
                            Product #{item.product_id.toString()}
                          </p>
                          {item.plant_id !== undefined &&
                            item.plant_id !== null && (
                              <p className="text-xs text-muted-foreground">
                                Plant #{item.plant_id.toString()}
                              </p>
                            )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-xs text-muted-foreground">
                          ×{item.quantity.toString()}
                        </p>
                        <p className="text-sm font-bold text-primary">
                          $
                          {(
                            Number(item.price_cents * item.quantity) / 100
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status timeline */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${cfg.dotClass} flex-shrink-0`}
                    />
                    <span className="text-sm text-foreground">{cfg.label}</span>
                    {order.pickup && order.status === OrderStatus.Pending && (
                      <span className="text-xs text-muted-foreground ml-1">
                        — awaiting pickup coordination
                      </span>
                    )}
                    {!order.pickup && order.status === OrderStatus.Pending && (
                      <span className="text-xs text-muted-foreground ml-1">
                        — preparing for shipment
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { isAuthenticated, login } = useAuth();
  const { data: orders, isLoading } = useMyOrders();

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
        data-ocid="orders-unauthenticated"
      >
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-5">
          <Package className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display font-bold text-2xl text-foreground mb-2">
          Sign in to View Orders
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-6">
          Connect with Internet Identity to see your chili plant and spice order
          history.
        </p>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={login}
          data-ocid="orders-login-btn"
        >
          <Flame className="w-4 h-4" />
          Connect with Internet Identity
        </Button>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <Package className="w-7 h-7 text-primary" />
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground">
            My <span className="text-fire">Orders</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track your chili plant and spice orders.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4" data-ocid="orders-loading">
          {["o1", "o2", "o3"].map((k) => (
            <div
              key={k}
              className="rounded-xl bg-card border border-border p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48 mb-3" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4" data-ocid="order-list">
          {orders.map((order) => (
            <OrderRow key={order.id.toString()} order={order} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
          data-ocid="orders-empty"
        >
          <div className="text-7xl mb-4">🌶️</div>
          <h3 className="font-display font-semibold text-foreground text-xl mb-2">
            No orders yet
          </h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Start growing your collection of rare chili plants and artisan
            spices!
          </p>
          <Link to="/marketplace">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-ocid="orders-shop-cta"
            >
              <ShoppingBag className="w-4 h-4" />
              Shop Now
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
