import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "../types/index.ts";
import {
  cartHasShippable,
  lineTotalCents,
  USPS_SMALL_FLAT_RATE_CENTS,
} from "../lib/cart-utils";

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  subtotalCents: () => bigint;
  shippingCents: () => bigint;
  totalCents: () => bigint;
  itemCount: () => number;
  hasShippableItems: () => boolean;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.line_id === item.line_id);
          if (existing) {
            if (existing.unique_listing) return state;
            const nextQty = existing.quantity + item.quantity;
            return {
              items: state.items.map((i) =>
                i.line_id === item.line_id
                  ? { ...i, quantity: nextQty }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((i) => i.line_id !== lineId),
        })),

      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.line_id !== lineId)
              : state.items.map((i) => {
                  if (i.line_id !== lineId) return i;
                  const maxQty = i.unique_listing ? 1 : quantity;
                  const next = i.unique_listing ? 1 : Math.max(1, quantity);
                  return { ...i, quantity: i.unique_listing ? maxQty : next };
                }),
        })),

      clearCart: () => set({ items: [] }),

      subtotalCents: () => {
        const { items } = get();
        return items.reduce(
          (sum, item) => sum + lineTotalCents(item.unit_price_cents, item.quantity),
          0n,
        );
      },

      shippingCents: () =>
        cartHasShippable(get().items) ? USPS_SMALL_FLAT_RATE_CENTS : 0n,

      totalCents: () => get().subtotalCents() + get().shippingCents(),

      itemCount: () => get().items.length,

      hasShippableItems: () => cartHasShippable(get().items),
    }),
    {
      name: "icspicy-cart",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str, (_, value) => {
            if (typeof value === "string" && /^\d+n$/.test(value)) {
              return BigInt(value.slice(0, -1));
            }
            return value;
          });
        },
        setItem: (name, value) => {
          localStorage.setItem(
            name,
            JSON.stringify(value, (_, v) =>
              typeof v === "bigint" ? `${v}n` : v,
            ),
          );
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
);
