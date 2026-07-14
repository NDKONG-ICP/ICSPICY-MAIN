import { motion } from "motion/react";

/** Lightweight CSS/motion confetti — no extra deps. */
export function ConfettiBurst() {
  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: `${5 + ((i * 41 + 3) % 90)}%`,
    hue: (i * 67) % 360,
    lum: 0.58 + (i % 5) * 0.06,
    duration: 1.8 + (i % 5) * 0.25,
    delay: (i % 8) * 0.1,
    yEnd: 380 + (i % 5) * 50,
    xDrift: (i % 2 === 0 ? 1 : -1) * (15 + (i % 6) * 12),
    rotate: (i % 2 === 0 ? 1 : -1) * (90 + (i % 7) * 50),
  }));

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden z-10"
      aria-hidden
    >
      {particles.map(
        ({ id, left, hue, lum, duration, delay, yEnd, xDrift, rotate }) => (
          <motion.div
            key={id}
            className="absolute w-2.5 h-2.5 rounded-sm"
            style={{
              left,
              top: "-10px",
              background: `oklch(${lum} 0.25 ${hue})`,
            }}
            initial={{ y: 0, opacity: 1, rotate: 0, x: 0 }}
            animate={{ y: yEnd, opacity: [1, 1, 0], rotate, x: xDrift }}
            transition={{ duration, delay, ease: "easeIn" }}
          />
        ),
      )}
    </div>
  );
}
