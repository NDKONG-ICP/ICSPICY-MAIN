/** Coordinate map for prize-plaque.webp (784×1168) — cream score panel. */

export interface PrizePlaqueMap {
  src: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
  aspectRatio: number;
  /** Blank cream panel where label + score render (% of image). */
  panel: { left: number; top: number; width: number; height: number };
}

export const PRIZE_PLAQUE_MAP: PrizePlaqueMap = {
  src: "/games/arcade/prize-plaque.webp",
  intrinsicWidth: 784,
  intrinsicHeight: 1168,
  aspectRatio: 784 / 1168,
  panel: { left: 16, top: 60.5, width: 68, height: 27.5 },
};

/** Dev-only: `?plaqueDebug=1` draws the panel alignment box. */
export function isPlaqueDebug(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("plaqueDebug");
}
