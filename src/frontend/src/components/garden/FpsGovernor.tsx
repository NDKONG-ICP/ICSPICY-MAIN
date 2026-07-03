import { downgradeTier } from "@/lib/garden-device-tier";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { toast } from "sonner";

const MIN_FPS = 25;
const SUSTAINED_MS = 3000;

/**
 * Watches the real frame rate inside the Canvas. If FPS stays below 25 for
 * 3 consecutive seconds, drops the device tier one step and notifies the user.
 * Runs at most one downgrade per mount to avoid thrashing.
 */
export function FpsGovernor() {
  const belowSince = useRef<number | null>(null);
  const frames = useRef(0);
  const windowStart = useRef(performance.now());
  const downgraded = useRef(false);

  useFrame(() => {
    if (downgraded.current) return;
    frames.current += 1;
    const now = performance.now();
    const elapsed = now - windowStart.current;
    if (elapsed < 500) return;

    const fps = (frames.current / elapsed) * 1000;
    frames.current = 0;
    windowStart.current = now;

    if (fps >= MIN_FPS) {
      belowSince.current = null;
      return;
    }
    if (belowSince.current === null) {
      belowSince.current = now;
      return;
    }
    if (now - belowSince.current >= SUSTAINED_MS) {
      const next = downgradeTier();
      if (next) {
        downgraded.current = true;
        toast.message("Adjusted graphics for smoother performance");
      } else {
        // Already at the lowest tier — stop measuring.
        downgraded.current = true;
      }
    }
  });

  return null;
}
