import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useState } from "react";

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  hint?: string;
  "data-ocid"?: string;
}

export function FlipCard({
  front,
  back,
  className = "",
  hint = "Tap to flip",
  "data-ocid": dataOcid,
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasFlippedOnce, setHasFlippedOnce] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
    setHasFlippedOnce(true);
  };

  return (
    <div className={cn("w-full", className)} data-ocid={dataOcid}>
      <div
        className="perspective-[1000px] cursor-pointer select-none"
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleFlip();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? "Show NFT artwork" : "Show plant photo"}
      >
        <motion.div
          className={cn(
            "relative w-full aspect-square rounded-2xl transition-shadow duration-300",
            isAnimating && "shadow-xl shadow-primary/25 ring-1 ring-primary/20",
          )}
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          onAnimationStart={() => setIsAnimating(true)}
          onAnimationComplete={() => setIsAnimating(false)}
        >
          <div
            className="absolute inset-0 h-full w-full rounded-2xl overflow-hidden border border-border bg-muted [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
            style={{ transform: "rotateY(0deg) translateZ(1px)" }}
          >
            {front}
          </div>
          <div
            className="absolute inset-0 h-full w-full rounded-2xl overflow-hidden border border-border bg-muted [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg) translateZ(1px)" }}
          >
            {back}
          </div>
        </motion.div>
      </div>
      {!hasFlippedOnce && (
        <motion.p
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0.55 }}
          className="mt-2 text-center text-xs text-muted-foreground"
        >
          {hint}
        </motion.p>
      )}
    </div>
  );
}
