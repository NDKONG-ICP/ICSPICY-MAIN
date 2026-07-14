import { useCallback, useEffect, useRef } from "react";
import { prefersReducedMotion } from "./useCarnivalEntry";
import "./carnival-boot-transition.css";

const BULB_ROWS = [10, 20, 30, 40, 50, 60, 70, 80];

const BOOT_MS = 580;

/**
 * Carnival midway → cinematic title handoff (~600ms).
 * Bulb flare → iris wipe → fade. Skippable on tap; disabled under reduced motion.
 */
export function CarnivalBootTransition({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    const t = window.setTimeout(finish, BOOT_MS);
    return () => window.clearTimeout(t);
  }, [finish]);

  if (prefersReducedMotion()) return null;

  return (
    <div
      className="carnival-boot"
      onClick={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") finish();
      }}
      role="presentation"
      aria-hidden
    >
      <div className="carnival-boot__bulbs">
        {BULB_ROWS.flatMap((y, i) => [
          <span
            key={`l-${y}`}
            className="carnival-boot__bulb carnival-boot__bulb--left"
            style={{ top: `${y}%`, animationDelay: `${i * 0.04}s` }}
          />,
          <span
            key={`r-${y}`}
            className="carnival-boot__bulb carnival-boot__bulb--right"
            style={{ top: `${y}%`, animationDelay: `${i * 0.04}s` }}
          />,
        ])}
      </div>
      <div className="carnival-boot__iris" />
      <div className="carnival-boot__fade" />
    </div>
  );
}
