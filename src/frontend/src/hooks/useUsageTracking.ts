import { useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

export const USAGE = {
  GARDEN: {
    OPEN: { feature: "garden", action: "open" },
    SAVE: { feature: "garden", action: "design_saved" },
    AI_GENERATE: { feature: "garden", action: "ai_generate" },
    GALLERY_VIEW: { feature: "garden", action: "gallery_view" },
  },
  SHOP: {
    VIEW: { feature: "shop", action: "product_view" },
    CHECKOUT: { feature: "shop", action: "checkout_start" },
  },
  NIMS: {
    OPEN: { feature: "nims", action: "open" },
    PLANT_ADD: { feature: "nims", action: "plant_add" },
    LOG_WATER: { feature: "nims", action: "log_water" },
  },
  COOKBOOK: {
    OPEN: { feature: "cookbook", action: "open" },
    RECIPE_VIEW: { feature: "cookbook", action: "recipe_view" },
  },
  AI: {
    CHAT: { feature: "spicyai", action: "chat_message" },
  },
  COMMUNITY: {
    POST: { feature: "community", action: "post_created" },
  },
  DAO: {
    VOTE: { feature: "dao", action: "vote_cast" },
  },
} as const;

export function useUsageTracking() {
  const { actor, isAuthenticated } = useAuth();
  const fired = useRef<Set<string>>(new Set());

  const track = useCallback(
    (feature: string, action: string, dedupKey?: string) => {
      if (!isAuthenticated || !actor) return;

      if (dedupKey) {
        if (fired.current.has(dedupKey)) return;
        fired.current.add(dedupKey);
      }

      try {
        void actor.recordUsageEvent(feature, action).catch(() => {
          /* analytics must never break the app */
        });
      } catch {
        /* ignore */
      }
    },
    [actor, isAuthenticated],
  );

  return { track, USAGE };
}
