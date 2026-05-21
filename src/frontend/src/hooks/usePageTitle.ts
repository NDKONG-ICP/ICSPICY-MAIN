import { useEffect } from "react";

const BASE = "IC SPICY";

/** Sets document.title — use inside page components. Omit or empty for home title. */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    const trimmed = title?.trim();
    document.title =
      trimmed && trimmed.length > 0 ? `${trimmed} — ${BASE}` : BASE;
  }, [title]);
}
