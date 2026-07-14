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
  GAMES: {
    SLICER_PLAY: { feature: "games", action: "slicer_play" },
    PEPPER_PATCH_PLAY: { feature: "games", action: "pepper_patch_play" },
    CRAFTER_PLAY: { feature: "games", action: "crafter_play" },
    LEADERBOARD_VIEW: { feature: "games", action: "leaderboard_view" },
    GAME_OVER: { feature: "games", action: "game_over" },
    BADGE_EARNED: { feature: "games", action: "badge_earned" },
  },
  MASTERCLASS: {
    LESSON_VIEW: { feature: "masterclass", action: "lesson_view" },
    QUIZ_START: { feature: "masterclass", action: "quiz_start" },
    QUIZ_PASS: { feature: "masterclass", action: "quiz_pass" },
    MODULE_BADGE_EARNED: {
      feature: "masterclass",
      action: "module_badge_earned",
    },
  },
  SHARE: {
    CLICK: { feature: "share", action: "share_click" },
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
        void actor.recordUsageEvent(feature, action).catch((e) => {
          if (import.meta.env.DEV) {
            console.warn("usage analytics failed", feature, action, e);
          }
        });
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn("usage analytics failed", feature, action, e);
        }
      }
    },
    [actor, isAuthenticated],
  );

  return { track, USAGE };
}
