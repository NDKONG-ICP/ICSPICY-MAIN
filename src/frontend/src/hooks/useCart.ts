import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  USPS_SMALL_FLAT_RATE_CENTS,
  cartHasShippable,
  lineTotalCents,
  priceCentsToNumber,
  toNatBigInt,
  toOptionalNatBigInt,
} from "../lib/cart-utils";
import type { CartItem } from "../types/index.ts";

function normalizeCartItem(item: CartItem): CartItem {
  return {
    ...item,
    product_id: toNatBigInt(item.product_id as bigint | number | string),
    plant_id: toOptionalNatBigInt(
      item.plant_id as bigint | number | string | undefined,
    ),
    nft_token_id: toOptionalNatBigInt(
      item.nft_token_id as bigint | number | string | undefined,
    ),
    unit_price_cents: priceCentsToNumber(
      item.unit_price_cents as bigint | number | string,
    ),
  };
}

function maxCartQuantity(item: CartItem): number | null {
  if (item.unique_listing) return 1;
  if (item.weight_based) return null;
  if (item.inventory_remaining === undefined) return 1;
  return Number(item.inventory_remaining);
}

function clampCartQuantity(item: CartItem, quantity: number): number {
  const max = maxCartQuantity(item);
  if (max === null) return Math.max(1, quantity);
  return Math.max(1, Math.min(max, quantity));
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  subtotalCents: () => number;
  shippingCents: () => number;
  totalCents: () => number;
  itemCount: () => number;
  hasShippableItems: () => boolean;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const normalized = normalizeCartItem(item);
          const existing = state.items.find(
            (i) => i.line_id === normalized.line_id,
          );
          if (existing) {
            if (existing.unique_listing) return state;
            const nextQty = clampCartQuantity(
              normalized,
              existing.quantity + normalized.quantity,
            );
            return {
              items: state.items.map((i) =>
                i.line_id === normalized.line_id
                  ? { ...i, quantity: nextQty }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                ...normalized,
                quantity: clampCartQuantity(normalized, normalized.quantity),
              },
            ],
          };
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
                  return {
                    ...i,
                    quantity: clampCartQuantity(i, quantity),
                  };
                }),
        })),

      clearCart: () => set({ items: [] }),

      subtotalCents: () => {
        const { items } = get();
        return items.reduce(
          (sum, item) =>
            sum + lineTotalCents(item.unit_price_cents, item.quantity),
          0,
        );
      },

      shippingCents: () =>
        cartHasShippable(get().items) ? USPS_SMALL_FLAT_RATE_CENTS : 0,

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
          const parsed = JSON.parse(str);
          if (parsed?.state?.items) {
            parsed.state.items = parsed.state.items.map((item: CartItem) =>
              normalizeCartItem(item),
            );
          }
          return parsed;
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
