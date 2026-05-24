import { motion } from "motion/react";

export type DemoStepConfig = {
  title: string;
  caption: string;
  icon: string;
};

export function NimsDemoStep({
  step,
  stepIndex,
}: {
  step: DemoStepConfig;
  stepIndex: number;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6 sm:p-8">
      <div className="relative flex min-h-[180px] w-full max-w-sm items-center justify-center">
        {stepIndex === 0 && <PlantSeedAnimation />}
        {stepIndex === 1 && <GerminationAnimation />}
        {stepIndex === 2 && <LogActionsAnimation />}
        {stepIndex === 3 && <WeatherBarAnimation />}
        {stepIndex === 4 && <TransplantAnimation />}
        {stepIndex === 5 && <ProvenanceAnimation />}
      </div>
      <div className="max-w-md space-y-2 text-center">
        <p className="text-lg font-display font-semibold text-foreground">
          {step.icon} {step.title}
        </p>
        <p className="text-sm text-muted-foreground">{step.caption}</p>
      </div>
    </div>
  );
}

function PlantSeedAnimation() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="size-10 rounded-md border border-zinc-700 bg-zinc-800/80"
          initial={{ opacity: 0.4 }}
          animate={
            i === 5
              ? {
                  backgroundColor: "rgb(180 83 9 / 0.6)",
                  borderColor: "rgb(217 119 6)",
                  opacity: 1,
                }
              : { opacity: 0.35 }
          }
          transition={{ duration: 0.8, delay: i === 5 ? 0.3 : 0 }}
        >
          {i === 5 && (
            <motion.span
              className="flex h-full items-center justify-center text-lg"
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.5 }}
            >
              🌱
            </motion.span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function GerminationAnimation() {
  return (
    <motion.div
      className="flex size-24 items-center justify-center rounded-xl border-2 border-emerald-500/60 bg-emerald-950/50"
      initial={{ backgroundColor: "rgb(180 83 9 / 0.4)", borderColor: "rgb(217 119 6)" }}
      animate={{ backgroundColor: "rgb(6 78 59 / 0.5)", borderColor: "rgb(16 185 129)" }}
      transition={{ duration: 1.2 }}
    >
      <motion.span
        className="text-4xl"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring" }}
      >
        🌿
      </motion.span>
    </motion.div>
  );
}

const LOG_ICONS = ["💧", "🧪", "🐛", "📸", "📝"] as const;

function LogActionsAnimation() {
  return (
    <div className="relative flex h-28 w-40 items-center justify-center">
      {LOG_ICONS.map((icon, i) => {
        const angle = (i / LOG_ICONS.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * 52;
        const y = Math.sin(angle) * 52;
        return (
          <motion.button
            key={icon}
            type="button"
            tabIndex={-1}
            className="absolute flex size-11 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-lg shadow-lg"
            style={{ left: "50%", top: "50%", marginLeft: -22, marginTop: -22 }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x, y, scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 * i, type: "spring", stiffness: 200 }}
          >
            {icon}
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary/40"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ delay: 0.4 + i * 0.12, duration: 0.8, repeat: Infinity, repeatDelay: 1.2 }}
            />
          </motion.button>
        );
      })}
      <span className="relative z-10 text-2xl">🌶️</span>
    </div>
  );
}

function WeatherBarAnimation() {
  const metrics = [
    { label: "72°F", color: "text-orange-400" },
    { label: "68%", color: "text-sky-400" },
    { label: "UV 7", color: "text-amber-400" },
  ];
  return (
    <motion.div
      className="w-full max-w-xs rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>☁️</span>
        <span>Port Charlotte, FL</span>
      </div>
      <div className="flex justify-between gap-2">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className={`text-sm font-semibold ${m.color}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.7, 1] }}
            transition={{ delay: i * 0.3, duration: 2, repeat: Infinity }}
          >
            {m.label}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function TransplantAnimation() {
  const stages = ["🌱", "🪴", "🫙"] as const;
  return (
    <div className="flex items-end gap-4">
      {stages.map((icon, i) => (
        <motion.div
          key={icon}
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0.3, scale: 0.85 }}
          animate={{
            opacity: i <= 2 ? 1 : 0.3,
            scale: i === 2 ? 1.15 : 0.9,
          }}
          transition={{ delay: i * 0.5, duration: 0.5 }}
        >
          <span className="text-3xl">{icon}</span>
          <span className="text-[10px] text-muted-foreground">
            {i === 0 ? "Tray" : i === 1 ? "1 gal" : "5 gal"}
          </span>
          {i < 2 && (
            <motion.span
              className="text-primary text-lg"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: [0, 1, 0], x: 8 }}
              transition={{ delay: 0.4 + i * 0.5, duration: 0.8 }}
            >
              →
            </motion.span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function ProvenanceAnimation() {
  return (
    <div className="flex w-full max-w-sm gap-3">
      <motion.div
        className="flex-1 space-y-2 rounded-lg border border-white/10 bg-zinc-900/60 p-3"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {["Planted", "Germinated", "Fed", "Sold"].map((label, i) => (
          <motion.div
            key={label}
            className="flex items-center gap-2 text-xs text-muted-foreground"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 * i }}
          >
            <span className="size-1.5 rounded-full bg-primary" />
            {label}
          </motion.div>
        ))}
      </motion.div>
      <motion.div
        className="relative h-28 w-20 [perspective:600px]"
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 120 }}
      >
        <div className="absolute inset-0 rounded-lg border border-amber-500/40 bg-gradient-to-br from-amber-950 to-zinc-900 p-2 text-center [transform-style:preserve-3d]">
          <span className="text-lg">🌶️</span>
          <p className="mt-1 text-[9px] font-mono text-amber-400/90">NFT #42</p>
          <p className="text-[8px] text-muted-foreground">On-chain</p>
        </div>
      </motion.div>
    </div>
  );
}
