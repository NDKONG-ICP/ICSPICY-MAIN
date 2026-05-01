import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "../types/index.ts";

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: bigint) => void;
  updateQuantity: (productId: bigint, quantity: number) => void;
  clearCart: () => void;
  totalCents: () => bigint;
  itemCount: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.product_id === item.product_id && i.plant_id === item.plant_id,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product_id === item.product_id && i.plant_id === item.plant_id
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.product_id !== productId)
              : state.items.map((i) =>
                  i.product_id === productId ? { ...i, quantity } : i,
                ),
        })),

      clearCart: () => set({ items: [] }),

      totalCents: () => {
        const { items } = get();
        return items.reduce(
          (sum, item) => sum + item.price_cents * BigInt(item.quantity),
          BigInt(0),
        );
      },

      itemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "icspicy-cart",
      // bigint serialization
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
