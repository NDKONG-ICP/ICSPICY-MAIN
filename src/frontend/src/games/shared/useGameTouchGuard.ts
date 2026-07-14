import { useEffect, type RefObject } from "react";

const PASSIVE_FALSE: AddEventListenerOptions = { passive: false };

/**
 * Suppress browser touch gestures (edge-swipe, overscroll, iOS text selection,
 * double-tap zoom) on the play surface without blocking pointer events for the game.
 */
export function useGameTouchGuard(
  targetRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const el = targetRef.current;
    if (!el) return;

    const block = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };

    const touchEvents = [
      "touchstart",
      "touchmove",
      "touchend",
      "touchcancel",
    ] as const;
    const gestureEvents = [
      "gesturestart",
      "gesturechange",
      "gestureend",
    ] as const;

    for (const type of touchEvents) {
      el.addEventListener(type, block, PASSIVE_FALSE);
    }
    for (const type of gestureEvents) {
      el.addEventListener(type, block, PASSIVE_FALSE);
    }
    el.addEventListener("dblclick", block);

    return () => {
      for (const type of touchEvents) {
        el.removeEventListener(type, block, PASSIVE_FALSE);
      }
      for (const type of gestureEvents) {
        el.removeEventListener(type, block, PASSIVE_FALSE);
      }
      el.removeEventListener("dblclick", block);
    };
  }, [active, targetRef]);
}
