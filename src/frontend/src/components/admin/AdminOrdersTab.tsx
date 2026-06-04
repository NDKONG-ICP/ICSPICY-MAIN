import { OrderStatus } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AdminOrderPublic,
  type AdminOrderStatusFilter,
  adminFilterKey,
  useAdminOrderCounts,
  useAdminOrders,
  useMarkOrdersSeenAdmin,
  useNewOrderCountAdmin,
  useUpdateOrderStatusAdmin,
} from "@/hooks/useAdminShop";
import { formatCents } from "@/hooks/useNims";
import { candidOpt } from "@/lib/candid-opt";
import { exportAdminOrdersCsv } from "@/lib/nims-export-mappers";
import { Download, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const FILTER_TABS: {
  label: string;
  filter: AdminOrderStatusFilter;
  countKey: keyof ReturnType<typeof useAdminOrderCounts>["counts"];
}[] = [
  { label: "All", filter: { All: null }, countKey: "all" },
  { label: "Pending", filter: { Pending: null }, countKey: "pending" },
  { label: "Paid", filter: { Paid: null }, countKey: "paid" },
  { label: "Picked Up", filter: { PickedUp: null }, countKey: "pickedUp" },
  { label: "Shipped", filter: { Shipped: null }, countKey: "shipped" },
  { label: "Cancelled", filter: { Cancelled: null }, countKey: "cancelled" },
];

function truncatePrincipal(p: string) {
  return p.length > 16 ? `${p.slice(0, 8)}…${p.slice(-6)}` : p;
}

function statusVariantKey(
  s: AdminOrderPublic["status"],
): "Pending" | "Shipped" | "PickedUp" | "Cancelled" {
  if ("Pending" in s) return "Pending";
  if ("Shipped" in s) return "Shipped";
  if ("PickedUp" in s) return "PickedUp";
  return "Cancelled";
}

const BADGE_STYLES: Record<
  "Paid" | "Pending" | "Shipped" | "PickedUp" | "Cancelled",
  string
> = {
  Paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  Shipped: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  PickedUp: "bg-green-500/10 text-green-400 border-green-500/30",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

function displayStatus(order: AdminOrderPublic): {
  label: string;
  styleKey: keyof typeof BADGE_STYLES;
} {
  if (order.is_paid && statusVariantKey(order.status) === "Pending") {
    return { label: "Paid", styleKey: "Paid" };
  }
  const v = statusVariantKey(order.status);
  return { label: v, styleKey: v };
}

function canFulfill(order: AdminOrderPublic) {
  return order.is_paid && statusVariantKey(order.status) === "Pending";
}

function canCancel(order: AdminOrderPublic) {
  return statusVariantKey(order.status) === "Pending";
}

function ShippingAddressPanel({ order }: { order: AdminOrderPublic }) {
  if (order.pickup) return null;

  const structured = candidOpt(order.shipping);
  const fallbackText = candidOpt(order.shipping_address);

  if (!structured && !fallbackText) return null;

  return (
    <div
      className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 text-xs space-y-1"
      data-ocid="admin-order-shipping-address"
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        Shipping Address
      </p>
      {structured ? (
        <>
          <p className="font-medium text-foreground">{structured.full_name}</p>
          <p className="text-foreground/90">{structured.street_line1}</p>
          {candidOpt(structured.street_line2) && (
            <p className="text-foreground/90">
              {candidOpt(structured.street_line2)}
            </p>
          )}
          <p className="text-foreground/90">
            {structured.city}, {structured.state} {structured.zip}
          </p>
          <p className="text-muted-foreground">{structured.phone}</p>
        </>
      ) : (
        <p className="text-foreground/90 whitespace-pre-wrap">{fallbackText}</p>
      )}
    </div>
  );
}

export function AdminOrdersTab() {
  const [filter, setFilter] = useState<AdminOrderStatusFilter>({ All: null });
  const { data: orders = [], isLoading, isPending } = useAdminOrders(filter);
  const { counts } = useAdminOrderCounts();
  const { data: newOrderCount = 0 } = useNewOrderCountAdmin();
  const updateStatus = useUpdateOrderStatusAdmin();
  const markSeen = useMarkOrdersSeenAdmin();

  const maxOrderId = useMemo(
    () =>
      orders.length > 0
        ? orders.reduce((max, o) => (o.id > max ? o.id : max), 0n)
        : 0n,
    [orders],
  );

  useEffect(() => {
    if (maxOrderId <= 0n) return;
    void markSeen.mutateAsync(maxOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mark seen when order list max id changes
  }, [maxOrderId]);

  const handleStatus = async (orderId: bigint, status: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId, status });
      toast.success(`Order updated to ${status}.`);
    } catch {
      toast.error("Failed to update order.");
    }
  };

  const loading = isLoading || isPending;

  return (
    <div className="space-y-4" data-ocid="admin-orders-tab">
      {newOrderCount > 0 && (
        <div
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          data-ocid="admin-new-orders-banner"
        >
          <span className="font-semibold">
            🔴 {newOrderCount} new order{newOrderCount === 1 ? "" : "s"}
          </span>
          <span className="text-red-200/80 ml-2">
            since you last reviewed orders
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const selected =
              adminFilterKey(filter) === adminFilterKey(tab.filter);
            return (
              <Button
                key={tab.label}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                className="h-8 text-xs gap-1.5"
                onClick={() => setFilter(tab.filter)}
                data-ocid={`admin-orders-filter-${adminFilterKey(tab.filter)}`}
              >
                {tab.label}
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 font-normal"
                >
                  {counts[tab.countKey]}
                </Badge>
              </Button>
            );
          })}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          onClick={() => {
            exportAdminOrdersCsv(orders);
            toast.success("Orders CSV downloaded");
          }}
          disabled={orders.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const disp = displayStatus(order);
            return (
              <div
                key={order.id.toString()}
                className="p-4 rounded-xl bg-card border border-border space-y-3"
                data-ocid="admin-order-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      Order #{order.id.toString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(
                        Number(order.created_at) / 1_000_000,
                      ).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">
                      Buyer: {truncatePrincipal(order.buyer.toText())}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.pickup ? (
                        <span className="text-foreground/80">Pickup</span>
                      ) : (
                        <span className="text-foreground/80">Ship</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md border ${BADGE_STYLES[disp.styleKey]}`}
                    >
                      {disp.label}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCents(order.total_cents)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1.5 border-t border-border pt-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                    Items
                  </p>
                  {order.items.map((item, idx) => (
                    <div
                      key={`${order.id}-${item.product_id}-${idx}`}
                      className="flex flex-wrap gap-x-2 gap-y-0.5"
                    >
                      <span className="text-foreground/90">
                        {item.product_name}
                      </span>
                      <span>
                        ×{item.quantity.toString()} ·{" "}
                        {formatCents(item.price_cents)} ea
                      </span>
                    </div>
                  ))}
                </div>

                <ShippingAddressPanel order={order} />

                {order.line_nft_token_ids.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">
                      NFT token IDs:{" "}
                    </span>
                    <span className="font-mono text-foreground/90 break-all">
                      {order.line_nft_token_ids
                        .map((t) => t.toString())
                        .join(", ")}
                    </span>
                  </div>
                )}

                {order.pickup && order.pickup_claim_tokens.length > 0 && (
                  <div className="text-xs space-y-0.5">
                    <span className="text-muted-foreground">
                      Pickup claim tokens
                    </span>
                    <div className="font-mono text-[11px] break-all text-foreground/90 bg-muted/30 rounded-md px-2 py-1 border border-border/60">
                      {order.pickup_claim_tokens.join(", ")}
                    </div>
                  </div>
                )}

                {(canFulfill(order) || canCancel(order)) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {canFulfill(order) && order.pickup && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          handleStatus(order.id, OrderStatus.PickedUp)
                        }
                        data-ocid="admin-order-mark-picked-up"
                      >
                        Mark Picked Up
                      </Button>
                    )}
                    {canFulfill(order) && !order.pickup && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          handleStatus(order.id, OrderStatus.Shipped)
                        }
                        data-ocid="admin-order-mark-shipped"
                      >
                        Mark Shipped
                      </Button>
                    )}
                    {canCancel(order) && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        variant="destructive"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          handleStatus(order.id, OrderStatus.Cancelled)
                        }
                        data-ocid="admin-order-cancel"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
