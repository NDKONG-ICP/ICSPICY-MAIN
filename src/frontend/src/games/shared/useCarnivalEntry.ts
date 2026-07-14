import { Link, useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

/** True when user arrived from the carnival midway booth tap. */
export function useCarnivalEntry(): {
  fromMidway: boolean;
  clearEntryFlag: () => void;
} {
  const search = useSearch({ strict: false }) as { from?: string };
  const navigate = useNavigate();
  const location = useLocation();
  const fromMidway = search.from === "midway";

  const clearEntryFlag = useCallback(() => {
    if (!fromMidway) return;
    void navigate({
      to: location.pathname,
      search: {},
      replace: true,
    });
  }, [fromMidway, navigate, location.pathname]);

  return { fromMidway, clearEntryFlag };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
