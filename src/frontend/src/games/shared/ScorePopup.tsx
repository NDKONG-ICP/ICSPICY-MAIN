import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { TicketStub } from "./TicketStub";

export function ScorePopup({
  text,
  visible,
  serial = 0,
  onDismiss,
  durationMs = 1400,
}: {
  text: string;
  visible: boolean;
  /** Changes when a new popup replaces the current one — resets the dismiss timer. */
  serial?: number;
  onDismiss?: () => void;
  durationMs?: number;
}) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible) return;

    const dismiss = () => onDismissRef.current?.();
    const timer = window.setTimeout(dismiss, durationMs);
    // Failsafe: never orphan a popup if the primary timer is disrupted.
    const failsafe = window.setTimeout(dismiss, durationMs + 400);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(failsafe);
    };
  }, [visible, serial, durationMs]);

  return (
    <AnimatePresence mode="popLayout">
      {visible && (
        <motion.div
          key={serial}
          initial={{ opacity: 0, scale: 0.88, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -8 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="pointer-events-none fixed left-1/2 top-[11%] z-[80] -translate-x-1/2 select-none"
          style={{
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          }}
          role="status"
          aria-live="polite"
        >
          <TicketStub variant="popup">
            <p className="font-bold tracking-wide">{text}</p>
          </TicketStub>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
