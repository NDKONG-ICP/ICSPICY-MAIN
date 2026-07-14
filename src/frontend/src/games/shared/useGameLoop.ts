import { useEffect, useRef } from "react";

export interface GameLoopState {
  deltaMs: number;
  elapsedMs: number;
  frame: number;
}

/**
 * requestAnimationFrame game loop with delta time.
 * Pauses when the document is hidden (visibilitychange).
 */
export function useGameLoop(
  onFrame: (state: GameLoopState) => void,
  active = true,
): void {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!active) return;

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let frame = 0;
    let paused = document.visibilityState === "hidden";

    const tick = (now: number) => {
      if (!paused) {
        const delta = now - last;
        last = now;
        elapsed += delta;
        frame += 1;
        onFrameRef.current({ deltaMs: delta, elapsedMs: elapsed, frame });
      } else {
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };

    const onVis = () => {
      paused = document.visibilityState === "hidden";
      if (!paused) last = performance.now();
    };

    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);
}
