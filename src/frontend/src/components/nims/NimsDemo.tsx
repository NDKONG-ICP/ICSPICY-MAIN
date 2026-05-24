import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { NimsDemoStep, type DemoStepConfig } from "./NimsDemoStep";

const STEPS: DemoStepConfig[] = [
  {
    title: "Plant a Seed",
    icon: "🌱",
    caption:
      "Log when you plant. NIMS remembers the date, variety, and location.",
  },
  {
    title: "Track Germination",
    icon: "🌿",
    caption:
      "Mark germination with one tap. For nurseries, an NFT is automatically assigned.",
  },
  {
    title: "Log Everything",
    icon: "📋",
    caption:
      "Water, feed, pest observations, photos, notes — all in one tap.",
  },
  {
    title: "Weather Tracked Automatically",
    icon: "🌡️",
    caption:
      "Local weather is captured with every entry. Your plant's provenance builds itself.",
  },
  {
    title: "Transplant & Grow",
    icon: "🪴",
    caption: "Track container upgrades. Every transition is logged.",
  },
  {
    title: "Your Plant's Story, On-Chain",
    icon: "🔗",
    caption:
      "The complete lifecycle lives on the Internet Computer. Verifiable. Permanent.",
  },
];

const STEP_MS = 4000;

export function NimsDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      data-ocid="nims-landing-demo"
      className="relative mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-transparent to-red-950/20"
        aria-hidden
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0"
        >
          <NimsDemoStep step={STEPS[step]!} stepIndex={step} />
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Demo step ${i + 1}`}
            onClick={() => setStep(i)}
            className={`h-2 rounded-full transition-all ${
              i === step ? "w-6 bg-red-500" : "w-2 bg-zinc-600 hover:bg-zinc-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
