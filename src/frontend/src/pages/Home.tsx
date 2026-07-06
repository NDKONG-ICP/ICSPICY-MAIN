import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  ChevronRight,
  CloudSun,
  Dna,
  ExternalLink,
  Flame,
  Leaf,
  MapPin,
  ShoppingBag,
  Sprout,
  Star,
  Users,
  Vote,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { SiFacebook, SiInstagram, SiTiktok, SiX } from "react-icons/si";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Seo } from "../components/Seo";
import { HOME_FAQ_ITEMS, staticRouteSeo } from "../lib/seo-routes.mjs";
import { CHILI_VARIETIES, SOCIAL_LINKS } from "../types";

// ── Heat level registry ──────────────────────────────────────────────────────
const HEAT_LEVELS: Record<string, { level: number; label: string }> = {
  "Apocalypse Scorpion": { level: 5, label: "Extreme" },
  "Death Spiral": { level: 5, label: "Extreme" },
  RB003: { level: 5, label: "Extreme" },
  "Fried Chicken": { level: 4, label: "Super Hot" },
  "Scotch Bonnet": { level: 3, label: "Very Hot" },
  "Sugar Rush Peach": { level: 3, label: "Very Hot" },
  "Aji Charapita": { level: 3, label: "Very Hot" },
  "Calabrian (Cherry)": { level: 2, label: "Medium" },
  "Fish Pepper": { level: 2, label: "Medium" },
  "Farmers Market Jalapeno": { level: 1, label: "Mild" },
  "Aji Guyana": { level: 4, label: "Super Hot" },
  "Acoma Pueblo": { level: 2, label: "Medium" },
};

// ── Static data ──────────────────────────────────────────────────────────────
const TRUST_STATS = [
  { icon: Award, label: "FDACS Registered Nursery" },
  { icon: MapPin, label: "USDA Zone 10a · FL" },
  { icon: Flame, label: "30+ Years Experience" },
  { icon: Leaf, label: "KNF & JADAM Organic" },
];

const RECIPE_PREVIEWS = [
  {
    emoji: "🔥",
    title: "Apocalypse Scorpion Ghost Sauce",
    category: "Hot Sauce",
    heat: 5,
    time: "30 min",
    desc: "Fruity superhot sauce — starts slow, builds relentlessly. Fermented mash finish.",
  },
  {
    emoji: "🍑",
    title: "Sugar Rush Peach Jam",
    category: "Preserve",
    heat: 3,
    time: "45 min",
    desc: "Sweet-heat stone-fruit preserve using our own Sugar Rush Peach crop. Pairs perfectly with cream cheese.",
  },
  {
    emoji: "🧂",
    title: "Smoked Scotch Bonnet Salt",
    category: "Spice Blend",
    heat: 3,
    time: "2 hr",
    desc: "Cold-smoked finishing salt with Scotch Bonnet and coconut flower. Transforms any grilled fish or steak.",
  },
];

const SHOP_PREVIEWS = [
  {
    name: "Starter Seedlings",
    price: "From $6",
    tag: "Best Starter",
    icon: Sprout,
    desc: "16 oz double cups — ready to transplant, weeks of growth already done",
  },
  {
    name: "1-Gallon Plants",
    price: "From $25",
    tag: "Most Popular",
    icon: Leaf,
    desc: "Established plants in full vegetative stage with NFT provenance included",
  },
  {
    name: "Artisan Smoked Spices",
    price: "From $12",
    tag: "Artisan",
    icon: Star,
    desc: "Hand-crafted smoked salts and infused spice blends from our own harvest",
  },
];

const NFT_WEATHER_ROWS = [
  { date: "Jun 1", temp: "88°F", humidity: "78%", uv: "9.2", rain: "0.0 in" },
  { date: "Jun 2", temp: "91°F", humidity: "72%", uv: "8.8", rain: "0.0 in" },
  { date: "Jun 3", temp: "85°F", humidity: "85%", uv: "7.1", rain: "0.3 in" },
  { date: "Jun 4", temp: "89°F", humidity: "76%", uv: "9.0", rain: "0.0 in" },
];

const FARMING_PILLARS = [
  {
    emoji: "🦠",
    title: "Indigenous Microorganisms",
    desc: "We cultivate IMO from local forest floors, inoculating soil with billions of beneficial microbes native to Zone 10a.",
  },
  {
    emoji: "⚗️",
    title: "Natural Ferments",
    desc: "FPJ, OHN, BRV, and water-soluble calcium phosphate — hand-crafted inputs that feed plants exactly what they need.",
  },
  {
    emoji: "🌱",
    title: "Zero Synthetic Inputs",
    desc: "No pesticides, no synthetic fertilizers. Just the sun, rain, living soil, and 30 years of cultivated knowledge.",
  },
];

const SOCIAL_ITEMS = [
  { icon: SiFacebook, label: "Facebook", href: SOCIAL_LINKS.facebook, hoverClass: "hover:text-blue-400" },
  { icon: SiX, label: "X / Twitter", href: SOCIAL_LINKS.x, hoverClass: "hover:text-foreground" },
  { icon: SiInstagram, label: "Instagram", href: SOCIAL_LINKS.instagram, hoverClass: "hover:text-pink-400" },
  { icon: SiTiktok, label: "TikTok", href: SOCIAL_LINKS.tiktok, hoverClass: "hover:text-cyan-400" },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function HeatBadge({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Heat level ${level} of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={i < level ? "text-fire" : "text-muted-foreground/25"}
          style={{ fontSize: "0.6rem" }}
        >
          🌶
        </span>
      ))}
    </span>
  );
}

function NftFlipCard() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ perspective: "1000px", width: "100%", maxWidth: "300px" }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped((f) => !f)}
      aria-label="NFT flip card demo — hover to reveal plant data"
    >
      <div
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          position: "relative",
          width: "100%",
          aspectRatio: "3/4",
        }}
      >
        {/* ── Front: NFT artwork ── */}
        <div
          className="absolute inset-0 rounded-2xl border border-fire/40 bg-card overflow-hidden shadow-elevated flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <Badge className="bg-fire/10 text-fire border-fire/30 font-display text-xs">
              RWA NFT · Founder
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">#7,839</span>
          </div>
          <div className="flex-1 mx-4 rounded-xl overflow-hidden relative">
            <img
              src="/nft7839.jpg"
              alt="IC SPICY NFT #7,839 — Founder PepperHead"
              className="w-full h-full object-cover"
              style={{ aspectRatio: "1" }}
            />
            <div
              className="absolute bottom-0 inset-x-0 px-3 py-2"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)" }}
            >
              <span className="text-xs font-display text-fire font-semibold tracking-wider">
                FOUNDER PEPPERHEAD · RARE
              </span>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="font-display font-bold text-foreground text-sm mb-0.5">
              Apocalypse Scorpion
            </p>
            <p className="text-xs text-muted-foreground mb-2">Tray #007 · Cell 24</p>
            <div className="flex items-center gap-1">
              {["🔥 Rare", "🌿 Organic", "⛓️ On-Chain"].map((t) => (
                <span
                  key={t}
                  className="text-[9px] bg-secondary/60 text-muted-foreground rounded px-1.5 py-0.5"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
              Hover to reveal plant data →
            </p>
          </div>
        </div>

        {/* ── Back: plant lifecycle data ── */}
        <div
          className="absolute inset-0 rounded-2xl border border-emerald-700/40 bg-card overflow-hidden shadow-elevated flex flex-col px-4 py-4"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/40 text-xs">
              Lifecycle Record
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">#7,839</span>
          </div>
          <div className="space-y-1.5 text-xs flex-1">
            {[
              ["Variety", "Apocalypse Scorpion"],
              ["Rarity", "Founder PepperHead 🏆"],
              ["Germinated", "Mar 15, 2026"],
              ["Stage", "1-Gallon (Stage 2)"],
              ["Zone", "USDA 10a · FL"],
              ["Method", "KNF / JADAM"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-foreground font-medium text-right max-w-[140px] truncate">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/30">
            <p className="text-[10px] text-emerald-400 font-mono text-center">
              ⛓️ Verified on Internet Computer · Block 42,891,003
            </p>
          </div>
          <Link to="/marketplace" className="block mt-2">
            <Button
              size="sm"
              className="w-full text-xs bg-fire/90 hover:brightness-110 text-white font-display"
            >
              View Collection
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── NIMS multi-step showcase ──────────────────────────────────────────────────
const DEMO_CELLS   = [1,3,5,8,10,14,18,22,25,28,31,34,37,40,44,47,50,55];
const DEMO_SEL     = 22;   // Sugar Rush Peach
const DEMO_COOKED  = 28;
const DEMO_XPLANT  = 44;

const DEMO_WEATHER_ROWS = [
  { date: "Jun 1", temp: "88°F", humidity: "78%", uv: "9.2", rain: "0.0 in" },
  { date: "Jun 2", temp: "91°F", humidity: "72%", uv: "8.8", rain: "0.0 in" },
  { date: "Jun 3", temp: "85°F", humidity: "85%", uv: "7.1", rain: "0.3 in" },
  { date: "Jun 4", temp: "89°F", humidity: "76%", uv: "9.0", rain: "0.0 in" },
  { date: "Jun 5", temp: "92°F", humidity: "70%", uv: "9.5", rain: "0.0 in" },
];

function TrayGrid({ revealed, selected }: { revealed: Set<number>; selected: number | null }) {
  return (
    <div
      className="grid w-full"
      style={{ gridTemplateColumns: "repeat(12, minmax(0,1fr))", gap: "3px" }}
      aria-hidden="true"
    >
      {Array.from({ length: 72 }, (_, i) => {
        const isRevealed = revealed.has(i);
        const isSel      = i === selected;
        const isCooked   = i === DEMO_COOKED;
        const isXplant   = i === DEMO_XPLANT;
        return (
          <motion.div
            key={i}
            className="aspect-square rounded-[3px]"
            initial={{ scale: 0, opacity: 0 }}
            animate={
              isRevealed
                ? isCooked
                  ? { scale: 1, opacity: 0.9 }
                  : isXplant
                    ? { scale: 1, opacity: 0.3 }
                    : isSel
                      ? { scale: 1.18, opacity: 1 }
                      : { scale: 1, opacity: 0.8 }
                : { scale: 0, opacity: 0 }
            }
            style={{
              background: isRevealed
                ? isCooked   ? "#300"
                : isXplant  ? "rgba(255,255,255,0.08)"
                : isSel     ? "oklch(0.55 0.24 145)"
                :              "oklch(0.22 0.13 145)"
                : "rgba(255,255,255,0.04)",
              border: isSel && isRevealed
                ? "1.5px solid oklch(0.72 0.26 145)"
                : isCooked && isRevealed
                  ? "1px solid #7f1d1d"
                  : "1px solid rgba(255,255,255,0.07)",
              boxShadow: isSel && isRevealed ? "0 0 10px oklch(0.55 0.24 145)" : "none",
            }}
            transition={{ duration: 0.22, ease: "backOut" }}
          />
        );
      })}
    </div>
  );
}

function NimsDemoShowcase() {
  const [step,      setStep]       = useState(0);
  const [revealed,  setRevealed]   = useState(new Set<number>());
  const [rowsShown, setRowsShown]  = useState(0);

  useEffect(() => {
    setRevealed(new Set());
    setRowsShown(0);

    if (step < 2) {
      // Steps 0 & 1: cascade tray cells
      let idx = 0;
      const cellTimer = setInterval(() => {
        if (idx < DEMO_CELLS.length) {
          const id = DEMO_CELLS[idx++];
          setRevealed((prev) => new Set([...prev, id]));
        } else {
          clearInterval(cellTimer);
        }
      }, 85);
      const advance = setTimeout(() => setStep((s) => (s + 1) % 3), 4600);
      return () => { clearInterval(cellTimer); clearTimeout(advance); };
    } else {
      // Step 2: weather rows appear
      let r = 0;
      const rowTimer = setInterval(() => {
        if (r <= DEMO_WEATHER_ROWS.length) setRowsShown(r++);
        else clearInterval(rowTimer);
      }, 300);
      const advance = setTimeout(() => setStep(0), 4800);
      return () => { clearInterval(rowTimer); clearTimeout(advance); };
    }
  }, [step]);

  const STEP_LABELS = [
    { icon: Sprout,   label: "Tray Overview"  },
    { icon: Leaf,     label: "Plant Profile"  },
    { icon: CloudSun, label: "Weather Journal" },
  ];

  return (
    <section
      className="py-16 relative overflow-hidden"
      data-ocid="nims-demo-section"
      style={{ background: "linear-gradient(to bottom, #060302, #0a0503)" }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,oklch(0.62 0.26 145) 0,oklch(0.62 0.26 145) 1px,transparent 1px,transparent 52px),repeating-linear-gradient(90deg,oklch(0.62 0.26 145) 0,oklch(0.62 0.26 145) 1px,transparent 1px,transparent 52px)",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/40 text-xs mb-4 px-4 py-1.5 font-display tracking-widest uppercase">
            Free for All Members
          </Badge>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-3">
            Professional Plant Tracking
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
            NIMS gives every IC SPICY member a full nursery management system —
            tray tracking, plant journals, weather logs, and on-chain lifecycle records.
          </p>
        </motion.div>

        {/* Step tabs */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEP_LABELS.map(({ icon: Icon, label }, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                step === i
                  ? "bg-emerald-900/70 text-emerald-300 border border-emerald-700/60"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Demo panel */}
        <div
          className="rounded-2xl overflow-hidden border border-white/[0.09]"
          style={{
            background: "rgba(10, 5, 3, 0.98)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.85), 0 0 80px rgba(16,185,129,0.03)",
          }}
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] bg-white/[0.02]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <span className="text-[10px] text-zinc-500 ml-2 font-mono tracking-wider">
              NIMS — Nursery Inventory Management System
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono">Live</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 min-h-[320px]">
            <AnimatePresence mode="wait">
              {step < 2 ? (
                <motion.div
                  key={`step-${step}`}
                  className={`grid gap-5 ${step === 1 ? "sm:grid-cols-[1fr_260px]" : "grid-cols-1"}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Tray column */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-display font-semibold text-white text-sm">Tray Alpha</span>
                        <span className="text-zinc-600 text-xs ml-2">Port Charlotte, FL</span>
                      </div>
                      <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/40 text-[10px]">
                        18 / 72 Active
                      </Badge>
                    </div>

                    <TrayGrid revealed={revealed} selected={step === 1 ? DEMO_SEL : null} />

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Seeds",     value: "12", c: "text-emerald-400" },
                        { label: "Seedlings", value: "5",  c: "text-cyan-400"    },
                        { label: "Ready",     value: "1",  c: "text-orange-400"  },
                        { label: "Cooked",    value: "1",  c: "text-red-400"     },
                      ].map(({ label, value, c }) => (
                        <div key={label} className="bg-white/[0.04] rounded-lg p-2 text-center border border-white/[0.05]">
                          <div className={`text-base font-display font-bold ${c}`}>{value}</div>
                          <div className="text-[10px] text-zinc-600">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plant detail (step 1 only) */}
                  {step === 1 && (
                    <motion.div
                      className="rounded-xl border border-white/[0.08] p-4 space-y-3"
                      style={{ background: "rgba(255,255,255,0.025)" }}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25, duration: 0.4 }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-base flex-shrink-0">
                          🍑
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm leading-tight">
                            Sugar Rush Peach
                          </p>
                          <p className="text-zinc-500 text-[10px]">Cell 22 · Tray Alpha</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {[
                          { icon: "🌱", label: "Stage",        value: "Seedling",        c: "text-emerald-400" },
                          { icon: "📅", label: "Germinated",   value: "Mar 15, 2026",    c: "text-zinc-300"    },
                          { icon: "💧", label: "Last Watered", value: "3 days ago",      c: "text-cyan-400"    },
                          { icon: "🌡️", label: "Avg Temp",    value: "89°F",            c: "text-orange-400"  },
                          { icon: "☀️", label: "UV Index",     value: "9.2 (yesterday)", c: "text-yellow-400"  },
                        ].map(({ icon, label, value, c }) => (
                          <div key={label} className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500 flex items-center gap-1.5">
                              <span>{icon}</span>{label}
                            </span>
                            <span className={`font-medium ${c}`}>{value}</span>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-600 mb-1">
                          <span>Lifecycle Progress</span>
                          <span>Stage 1 of 5</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, oklch(0.45 0.2 145), oklch(0.6 0.24 145))" }}
                            initial={{ width: 0 }}
                            animate={{ width: "20%" }}
                            transition={{ delay: 0.55, duration: 0.8 }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-1 flex-wrap">
                        {["🌶️ Very Hot", "🌿 Organic", "🌍 Zone 10a"].map((t) => (
                          <span key={t} className="text-[9px] bg-white/[0.05] border border-white/[0.07] text-zinc-500 rounded px-1.5 py-0.5">
                            {t}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                /* Step 2: Weather journal */
                <motion.div
                  key="weather"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-display font-semibold text-white text-sm">Weather Journal</span>
                      <span className="text-zinc-600 text-xs ml-2">Sugar Rush Peach · Cell 22</span>
                    </div>
                    <Badge className="bg-blue-950/60 text-blue-400 border-blue-800/40 text-[10px]">
                      NOAA Auto-Log
                    </Badge>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/[0.07]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                          {["Date", "Temp", "Humidity", "UV Index", "Rainfall", "Status"].map((h) => (
                            <th key={h} className="text-left px-3 py-2.5 text-zinc-500 font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DEMO_WEATHER_ROWS.map(({ date, temp, humidity, uv, rain }, ri) => (
                          <motion.tr
                            key={date}
                            className="border-b border-white/[0.04]"
                            initial={{ opacity: 0, x: -12 }}
                            animate={ri < rowsShown ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                            transition={{ duration: 0.28 }}
                          >
                            <td className="px-3 py-2.5 font-mono text-zinc-300">{date}</td>
                            <td className="px-3 py-2.5 text-orange-400 font-medium">{temp}</td>
                            <td className="px-3 py-2.5 text-cyan-400">{humidity}</td>
                            <td className="px-3 py-2.5 text-yellow-400">{uv}</td>
                            <td className="px-3 py-2.5 text-blue-400">{rain}</td>
                            <td className="px-3 py-2.5 text-emerald-400 font-medium">✓ Logged</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <span className="text-[10px] font-mono text-zinc-600">
                      ⛓️ All records cryptographically linked to NFT metadata on Internet Computer · Block 42,891,003
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/[0.07] bg-white/[0.01]">
            <div className="flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span className="text-[10px] text-zinc-500">
                Port Charlotte, FL ·{" "}
                <span className="text-zinc-300">89°F</span> · UV 9.0 ·{" "}
                <span className="text-emerald-400">Auto-logged ✓</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === i ? "w-5 bg-emerald-400" : "w-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link to="/nims">
            <Button className="bg-emerald-700 hover:bg-emerald-600 text-white font-display gap-2 px-8 py-5 text-sm shadow-lg">
              <Sprout className="w-4 h-4" />
              Start Tracking Free — No Crypto Required
            </Button>
          </Link>
          <p className="text-xs text-zinc-600 mt-2">
            Works with Internet Identity · No wallet needed to get started
          </p>
        </div>
      </div>
    </section>
  );
}

// ── FAQ + JSON-LD live in the shared SEO manifest (src/lib/seo-routes.mjs)
// so the prerender script and this page can never drift apart.
const FAQ_ITEMS = HOME_FAQ_ITEMS;
const HOME_SEO = staticRouteSeo("/");

// Featured growing guides — variety IDs verified against the live NIMS
// catalog (listVarieties, 2026-07).
const FEATURED_GUIDES = [
  { varietyId: "7", name: "Carolina Reaper", emoji: "🌶️", tagline: "2.2M SHU superhot" },
  { varietyId: "5", name: "Ghost Pepper", emoji: "🔥", tagline: "The legendary bhut jolokia" },
  { varietyId: "10", name: "Red Habanero", emoji: "🧨", tagline: "Fruity Caribbean heat" },
  { varietyId: "155", name: "Tomato", emoji: "🍅", tagline: "Garden staple, KNF-fed" },
  { varietyId: "122", name: "Sweet Basil", emoji: "🌿", tagline: "Kitchen herb essential" },
  { varietyId: "156", name: "Moringa", emoji: "🌳", tagline: "The miracle tree" },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="w-full">
      <Seo
        title={HOME_SEO.title}
        description={HOME_SEO.description}
        path="/"
        jsonLd={HOME_SEO.jsonLd ?? undefined}
      />

      {/* ══ HERO ══ Gardener-first, NIMS demo ═══════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        data-ocid="hero-section"
      >
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/generated/hero.PNG')" }}
          aria-hidden="true"
        />
        {/* Top vignette — dark at top, fades out */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/25 to-background"
          aria-hidden="true"
        />
        {/* Left column dark panel — text readable, right side (mascot) fully visible */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-background/96 via-background/75 to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          {/* Single-column text — background/mascot fully visible on the right */}
          <div className="max-w-xl">
            <div>
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge
                  variant="outline"
                  className="border-fire text-fire mb-6 px-4 py-1.5 text-xs font-display tracking-widest uppercase"
                >
                  FDACS Registered Nursery · Port Charlotte, FL
                </Badge>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              >
                <h1
                  className="font-display font-bold text-fire leading-none mb-2"
                  style={{ fontSize: "clamp(3rem, 10vw, 7rem)", letterSpacing: "-0.02em" }}
                >
                  IC SPICY
                </h1>
                <p
                  className="font-display font-bold text-foreground leading-tight mb-4"
                  style={{ fontSize: "clamp(1.4rem, 4vw, 2.6rem)" }}
                >
                  Track Every Plant.
                  <br />
                  <span className="text-fire">From Seed to Harvest.</span>
                </p>
              </motion.div>

              <motion.p
                className="leading-relaxed mb-8 max-w-lg rounded-lg px-4 py-3"
                style={{
                  fontSize: "clamp(0.95rem, 1.8vw, 1.05rem)",
                  color: "#d4c9c3",
                  background: "rgba(6,2,1,0.75)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
              >
                FDACS-registered specialty nursery growing the world's rarest chili
                peppers for{" "}
                <span style={{ color: "#ff8055", fontWeight: 700 }}>30+ years</span>{" "}
                in Florida Zone 10a — now with professional plant tracking, on-chain
                provenance, and a growing community.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                <Link to="/nims" data-ocid="hero-nims-cta">
                  <Button
                    size="lg"
                    className="bg-fire text-primary-foreground hover:brightness-110 font-display font-bold px-7 py-6 text-base shadow-elevated gap-2 w-full sm:w-auto"
                  >
                    <Sprout className="w-5 h-5" />
                    Start Tracking Free
                  </Button>
                </Link>
                <Link to="/marketplace" data-ocid="hero-shop-cta">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-border hover:border-fire hover:text-fire font-display px-7 py-6 text-base gap-2 w-full sm:w-auto"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Shop Plants
                  </Button>
                </Link>
                <Link to="/cookbook" data-ocid="hero-cookbook-cta">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="font-display px-7 py-6 text-base gap-2 text-muted-foreground hover:text-foreground w-full sm:w-auto"
                  >
                    <BookOpen className="w-4 h-4" />
                    CookBook
                  </Button>
                </Link>
              </motion.div>

              {/* Mini nav hint */}
              <motion.div
                className="mt-8 flex flex-wrap gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.75 }}
              >
                {[
                  { label: "🌱 Gardeners → NIMS", to: "/nims" },
                  { label: "🛒 Shop", to: "/marketplace" },
                  { label: "📖 CookBook", to: "/cookbook" },
                  { label: "⛓️ NFTs", to: "/marketplace" },
                  { label: "🗳️ DAO", to: "/dao" },
                ].map(({ label, to }) => (
                  <Link key={label} to={to}>
                    <span
                      className="text-xs hover:text-white rounded-full px-3 py-1 transition-colors cursor-pointer"
                      style={{
                        color: "rgba(210,200,195,0.85)",
                        background: "rgba(6,2,1,0.65)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {label}
                    </span>
                  </Link>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
          aria-hidden="true"
        >
          <ChevronRight className="w-6 h-6 rotate-90" />
        </motion.div>
      </section>

      {/* ══ TRUST BAR ════════════════════════════════════════════════════════ */}
      <section className="bg-card border-y border-border py-4" data-ocid="trust-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto gap-8 sm:gap-0 sm:justify-around items-center min-w-0">
            {TRUST_STATS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 whitespace-nowrap flex-shrink-0 sm:flex-1 sm:justify-center"
              >
                <div className="w-8 h-8 rounded-full bg-fire/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-fire" />
                </div>
                <span className="text-sm font-display font-medium text-foreground/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RECIPE PREVIEW — public cookbook teaser ══════════════════════════ */}
      <NimsDemoShowcase />

      <section className="py-20 bg-background" data-ocid="recipe-preview-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-fire font-display text-sm tracking-widest uppercase mb-3">
              From Our Kitchen
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">
              Recipes Built From the Harvest
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every recipe uses varieties we grow ourselves. Browse the full CookBook — no login required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {RECIPE_PREVIEWS.map(({ emoji, title, category, heat, time, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link to="/cookbook" className="block h-full">
                  <div className="group bg-card border border-border rounded-xl p-5 h-full hover:border-fire transition-smooth hover:shadow-elevated cursor-pointer flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <span className="text-4xl">{emoji}</span>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs mb-1">
                          {category}
                        </Badge>
                        <div className="flex justify-end">
                          <HeatBadge level={heat} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground text-sm leading-snug mb-1">
                        {title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span>⏱ {time}</span>
                      <span className="text-fire opacity-0 group-hover:opacity-100 transition-smooth flex items-center gap-0.5">
                        View Recipe <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/cookbook" data-ocid="recipe-preview-cta">
              <Button
                variant="outline"
                className="border-fire text-fire hover:bg-fire hover:text-primary-foreground font-display gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Browse Full CookBook — Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ SHOP PREVIEW ═════════════════════════════════════════════════════ */}
      <section className="py-20 bg-card border-y border-border" data-ocid="shop-preview-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-fire font-display text-sm tracking-widest uppercase mb-3">
              What We Grow
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">
              Shop the Nursery
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Plants at every stage — plus artisan spices made from our own harvest.
              Every 1-gallon and 5-gallon plant ships with a plant NFT.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {SHOP_PREVIEWS.map(({ name, price, tag, icon: Icon, desc }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link to="/marketplace" data-ocid={`shop-preview-${i}`} className="block h-full">
                  <div className="group relative bg-background border border-border rounded-xl p-6 h-full hover:border-fire hover:shadow-elevated transition-smooth cursor-pointer">
                    <Badge className="absolute top-4 right-4 text-xs bg-fire/10 text-fire border-fire/30">
                      {tag}
                    </Badge>
                    <div className="w-12 h-12 rounded-xl bg-fire/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-fire" />
                    </div>
                    <div className="text-xl font-display font-bold text-fire mb-1">{price}</div>
                    <h3 className="font-display font-semibold text-foreground mb-2">{name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    <div className="mt-4 flex items-center text-fire text-xs font-medium opacity-0 group-hover:opacity-100 transition-smooth gap-1">
                      Browse Collection <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/marketplace" data-ocid="shop-preview-cta">
              <Button className="bg-fire text-primary-foreground hover:brightness-110 font-display gap-2">
                <ShoppingBag className="w-4 h-4" />
                View Full Shop
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ ON-CHAIN / RWA — Crypto audience ════════════════════════════════ */}
      <section
        className="py-24 bg-background relative overflow-hidden"
        data-ocid="onchain-section"
      >
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 60% 50%, oklch(0.62 0.26 24), transparent 65%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-fire font-display text-sm tracking-widest uppercase mb-3">
              Blockchain Provenance
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-foreground mb-4 leading-tight">
              Every Plant Tells Its Story
              <br />
              <span className="text-fire">On-Chain</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              8,888 NFTs with verifiable lifecycle data — genetics, tray position, weather
              provenance, and complete care history. Stored permanently on the Internet Computer.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

            {/* Left — NFT flip card + stats */}
            <motion.div
              className="flex flex-col items-center gap-8"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="w-full max-w-[300px]">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Hover the card to reveal plant data
                </p>
                <NftFlipCard />
              </div>

              {/* Collection stats */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                {[
                  { value: "8,888", label: "NFTs Minted" },
                  { value: "3", label: "Growth Stages" },
                  { value: "10", label: "Rarity Layers" },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="bg-card border border-border rounded-xl p-3 text-center"
                  >
                    <div className="text-xl font-display font-bold text-fire">{value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 w-full max-w-sm">
                <Link to="/marketplace" className="flex-1" data-ocid="view-collection-cta">
                  <Button className="w-full bg-fire text-primary-foreground hover:brightness-110 font-display gap-2 text-sm">
                    <Dna className="w-4 h-4" />
                    View Collection
                  </Button>
                </Link>
                <Link to="/dao" className="flex-1" data-ocid="join-dao-cta">
                  <Button
                    variant="outline"
                    className="w-full border-border hover:border-fire hover:text-fire font-display gap-2 text-sm"
                  >
                    <Vote className="w-4 h-4" />
                    Join DAO
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Right — weather provenance example */}
            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <div>
                <p className="text-fire font-display text-sm tracking-widest uppercase mb-2">
                  Weather Provenance
                </p>
                <h3 className="font-display font-bold text-xl text-foreground mb-3">
                  Every condition recorded, forever
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Every IC SPICY NFT carries a verifiable climate record. Daily temperature,
                  humidity, UV index, and rainfall are auto-logged from NOAA data and
                  cryptographically linked to each token's on-chain metadata.
                </p>
              </div>

              {/* Weather table card */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-subtle">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
                  <div>
                    <p className="text-xs font-display font-semibold text-foreground">
                      NFT #4,372 · Apocalypse Scorpion
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tray #007 · Cell 24 · Port Charlotte, FL
                    </p>
                  </div>
                  <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/40 text-xs">
                    <span className="mr-1">⛓️</span> Verified
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {["Date", "Temp", "Humidity", "UV", "Rain"].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-2 text-muted-foreground font-medium"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {NFT_WEATHER_ROWS.map(({ date, temp, humidity, uv, rain }) => (
                        <tr
                          key={date}
                          className="border-b border-border/40 hover:bg-secondary/20 transition-colors"
                        >
                          <td className="px-4 py-2 font-mono text-foreground">{date}</td>
                          <td className="px-4 py-2 text-orange-400">{temp}</td>
                          <td className="px-4 py-2 text-cyan-400">{humidity}</td>
                          <td className="px-4 py-2 text-yellow-400">{uv}</td>
                          <td className="px-4 py-2 text-blue-400">{rain}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 bg-secondary/10 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/60 font-mono">
                    Source: NOAA Station FL-CH-42 · Immutably stored on Internet Computer · Block 42,891,003
                  </p>
                </div>
              </div>

              {/* NFT lifecycle stages */}
              <div className="space-y-2">
                {[
                  { icon: Sprout, stage: "Stage 1 — Germinated Seed", detail: "Mint on germination, tray position locked" },
                  { icon: Leaf, stage: "Stage 2 — 1-Gallon Plant", detail: "Burn-and-mint upgrade, new composite artwork" },
                  { icon: Flame, stage: "Stage 3 — 5-Gallon Mature", detail: "Final metadata update, 10 rarity trait layers" },
                ].map(({ icon: Icon, stage, detail }) => (
                  <div
                    key={stage}
                    className="flex items-start gap-3 bg-card border border-border/60 rounded-lg px-3 py-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-fire/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-fire" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{stage}</p>
                      <p className="text-xs text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://internetcomputer.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Powered by Internet Computer Protocol
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ VARIETIES SHOWCASE ══════════════════════════════════════════════ */}
      <section
        id="varieties"
        className="py-20 bg-card border-y border-border"
        data-ocid="varieties-section"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-fire font-display text-sm tracking-widest uppercase mb-3">
              Rare & Exclusive
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">
              12 Hand-Selected Varieties
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              From apocalyptic superhots to nuanced heirlooms — every cultivar grown organically
              in Florida Zone 10a.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {CHILI_VARIETIES.map((variety, i) => {
              const heat = HEAT_LEVELS[variety] ?? { level: 2, label: "Medium" };
              const heatColor =
                heat.level >= 5
                  ? "text-fire border-fire/30"
                  : heat.level >= 4
                    ? "text-orange-400 border-orange-400/30"
                    : heat.level >= 3
                      ? "text-yellow-500 border-yellow-500/30"
                      : "text-muted-foreground border-border";
              return (
                <motion.div
                  key={variety}
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                >
                  <div className="bg-background border border-border rounded-xl p-4 hover:border-fire transition-smooth h-full">
                    <div className="flex items-start justify-between mb-3">
                      <Flame className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        heat.level >= 5 ? "text-fire"
                        : heat.level >= 4 ? "text-orange-400"
                        : heat.level >= 3 ? "text-yellow-500"
                        : "text-muted-foreground"
                      }`} />
                      <Badge variant="outline" className={`text-xs ${heatColor}`}>
                        {heat.label}
                      </Badge>
                    </div>
                    <h3 className="font-display font-semibold text-sm text-foreground leading-snug mb-2 break-words">
                      {variety}
                    </h3>
                    <HeatBadge level={heat.level} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link to="/marketplace" data-ocid="varieties-shop-cta">
              <Button className="bg-fire text-primary-foreground hover:brightness-110 font-display gap-2">
                <ShoppingBag className="w-4 h-4" />
                Shop All Varieties
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ GROWING GUIDES ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-background" data-ocid="guides-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-fire font-display text-sm tracking-widest uppercase mb-3">
              📖 Growing Guides
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">
              KNF-Powered, Personalized to Your Zone
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Step-by-step regenerative guides for 387 varieties — soil prep,
              planting windows, natural nutrition schedules, and pest control,
              linked to real CookBook recipes.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {FEATURED_GUIDES.map((g, i) => (
              <motion.div
                key={g.varietyId}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  to="/variety/$varietyId/guide"
                  params={{ varietyId: g.varietyId }}
                  className="group block h-full bg-card border border-border rounded-xl p-4 hover:border-fire transition-smooth text-center"
                  data-ocid={`home-guide-${g.varietyId}`}
                >
                  <div className="text-3xl mb-2" aria-hidden>
                    {g.emoji}
                  </div>
                  <h3 className="font-display font-semibold text-sm text-foreground leading-snug group-hover:text-fire transition-smooth">
                    {g.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {g.tagline}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/guides" data-ocid="guides-browse-all-cta">
              <Button
                variant="outline"
                className="border-fire/40 text-fire hover:bg-fire/10 font-display gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Browse all 387 guides →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ ABOUT + FARMING PHILOSOPHY ═══════════════════════════════════════ */}
      <section className="py-24 bg-background" data-ocid="about-section" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-fire font-display text-sm tracking-widest uppercase mb-4">
              Our Philosophy
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4 leading-tight">
              Regenerative Farming.
              <br />
              <span className="text-fire">The KNF & JADAM Way.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              FDACS-licensed specialty nursery in Port Charlotte, FL growing rare chili
              peppers for 30+ years with zero synthetic inputs. Ancient-wisdom methodologies
              that harness indigenous microorganisms and natural ferments.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-14">
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-elevated"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <img
                src="/assets/generated/nursery.jpg"
                alt="IC SPICY nursery in Port Charlotte, FL"
                className="w-full object-cover"
                style={{ aspectRatio: "4/3" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
              <div className="absolute bottom-4 left-4 space-y-1.5">
                <Badge className="bg-fire/90 text-primary-foreground font-display text-xs px-3 py-1">
                  Port Charlotte, FL · Zone 10a
                </Badge>
                <div className="flex gap-2">
                  <Badge className="bg-background/80 text-foreground text-xs">FDACS Registered</Badge>
                  <Badge className="bg-background/80 text-foreground text-xs">30+ Years</Badge>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="font-display font-bold text-2xl text-foreground leading-tight">
                Grown With Purpose,{" "}
                <span className="text-fire">Harvested With Passion</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                IC SPICY is a FDACS-registered specialty nursery born from over 30 years of
                deep passion for chili cultivation. Based in Port Charlotte, Florida, we grow
                the rarest, most-sought-after pepper varieties on the planet.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our philosophy is rooted in{" "}
                <span className="text-foreground font-medium">Korean Natural Farming (KNF)</span>{" "}
                and <span className="text-foreground font-medium">JADAM</span> regenerative
                methods — working with nature, not against it. No synthetic pesticides.
                No chemical fertilizers. Just living soil and decades of hard-won knowledge.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {FARMING_PILLARS.map(({ emoji, title, desc }, i) => (
              <motion.div
                key={title}
                className="bg-card rounded-xl p-6 border border-border"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <div className="text-3xl mb-4">{emoji}</div>
                <h3 className="font-display font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            className="mt-10 text-center text-xs text-muted-foreground font-mono"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Florida Department of Agriculture and Consumer Services · FDACS Registered Nursery · Port Charlotte, FL 33954
          </motion.p>
        </div>
      </section>

      {/* ══ COMMUNITY & SOCIAL ══════════════════════════════════════════════ */}
      <section className="py-20 bg-card border-t border-border" data-ocid="community-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-fire font-display text-sm tracking-widest uppercase mb-3">
              Join the Fire
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">
              Grow With Our Community Garden
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Connect with fellow chili enthusiasts, share your grows, vote on
              future varieties, and stay up-to-date with IC SPICY.
            </p>
          </motion.div>

          {/* Social links */}
          <div className="flex items-center gap-6 flex-wrap justify-center mb-10">
            {SOCIAL_ITEMS.map(({ icon: Icon, label, href, hoverClass }, i) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`IC SPICY on ${label}`}
                className={`flex flex-col items-center gap-2 text-muted-foreground ${hoverClass} transition-smooth`}
                data-ocid={`social-${label.toLowerCase().replace(/\s*\/.*$/, "").replace(/\s+/g, "-")}`}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center hover:border-current transition-smooth">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-display">{label}</span>
              </motion.a>
            ))}
          </div>

          {/* CTA split: gardeners vs crypto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            <motion.div
              className="bg-background border border-emerald-700/30 rounded-2xl p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-3xl mb-3">🌱</div>
              <h3 className="font-display font-bold text-lg text-foreground mb-2">
                Gardeners
              </h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                Free plant tracking, tray management, weather logs, and the CookBook.
              </p>
              <Link to="/nims">
                <Button className="w-full bg-emerald-700/90 hover:bg-emerald-700 text-white font-display gap-2 text-sm">
                  <Sprout className="w-4 h-4" />
                  Start with NIMS
                </Button>
              </Link>
            </motion.div>

            <motion.div
              className="bg-background border border-fire/30 rounded-2xl p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="text-3xl mb-3">🌶️</div>
              <h3 className="font-display font-bold text-lg text-foreground mb-2">
                NFT Holders
              </h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                DAO voting, shop discounts up to 15%, and on-chain provenance records.
              </p>
              <div className="flex gap-2">
                <Link to="/marketplace" className="flex-1">
                  <Button className="w-full bg-fire text-white hover:brightness-110 font-display text-xs gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Get NFT
                  </Button>
                </Link>
                <Link to="/dao" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-fire text-fire hover:bg-fire/10 font-display text-xs gap-1"
                  >
                    <Vote className="w-3.5 h-3.5" />
                    DAO
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ matches the FAQPage structured data ══════════════════════ */}
      <section
        id="faq"
        className="py-16 border-t border-border"
        data-ocid="home-faq"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-2 text-center">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-8">
            Growing, shipping, NFTs, and the free tools — answered.
          </p>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-medium">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
