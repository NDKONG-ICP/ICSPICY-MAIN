import { motion } from "motion/react";

// Slowly drifting ember/gold gradients that sit behind the entire page.
// Pure CSS background-images already paint the base radial gradient — these
// motion divs add subtle parallax life so the page never feels static.
export function AnimatedBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="absolute -top-40 left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-ember/25 blur-[120px]"
        initial={{ opacity: 0.55, x: "-50%", y: 0 }}
        animate={{ opacity: [0.45, 0.7, 0.45], y: [0, 20, 0] }}
        transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute right-[-10%] top-1/3 h-[55vh] w-[55vw] rounded-full bg-gold/20 blur-[120px]"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.25, 0.55, 0.25], x: [0, -30, 0] }}
        transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-32 left-[-10%] h-[55vh] w-[55vw] rounded-full bg-sage/15 blur-[120px]"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.2, 0.45, 0.2], x: [0, 24, 0] }}
        transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
      />

      {/* Subtle film grain texture using SVG noise. Adds tactile depth. */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.045] mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}
