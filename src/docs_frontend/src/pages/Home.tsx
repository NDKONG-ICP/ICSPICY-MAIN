import { useCatalog } from "@/hooks/useCatalog";
import { formatNumber } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Flame,
  Leaf,
  MessageSquare,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

// ── Document level preview ────────────────────────────────────────────────────

const DATA_ROOM_LEVELS = [
  {
    id: "vision",
    label: "START HERE",
    title: "Vision & Strategy",
    description: "Whitepaper, roadmap, pitch deck, and executive summary",
    slugs: ["branded-whitepaper", "roadmap", "pitch-deck", "executive-summary"],
    color: "ember",
  },
  {
    id: "investor",
    label: "INVESTOR ROOM",
    title: "Business & Investor",
    description: "Investor memo, due diligence index, strategic partner brief",
    slugs: ["investor-memo", "data-room-index", "strategic-partner-brief"],
    color: "gold",
  },
  {
    id: "token",
    label: "WEB3 UTILITY",
    title: "NFT & Token",
    description: "PepperHead membership, NFT collector guide, SPICY utility",
    slugs: [
      "pepperhead-membership-guide",
      "nft-collector-guide",
      "spicy-utility-explainer",
    ],
    color: "sage",
  },
  {
    id: "natural-farming",
    label: "GROW SYSTEM",
    title: "Natural Farming",
    description: "Korean Natural Farming, JADAM, and rare pepper cultivation",
    slugs: [],
    color: "sage",
  },
];

// ── Feature cards ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Leaf className="h-5 w-5" />,
    title: "Soil-first cultivation",
    description:
      "Korean Natural Farming and JADAM methods. 30+ years of experience. No synthetic inputs — ever.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "On-chain provenance",
    description:
      "Every plant bound to an ICRC-7 NFT with certified provenance: variety, germination, live weather records.",
  },
  {
    icon: <Flame className="h-5 w-5" />,
    title: "Luxury heat",
    description:
      "12 rare cultivars — Apocalypse Scorpion, Aji Charapita, Fish Pepper — grown for flavor, not just fire.",
  },
];

export function HomePage() {
  const { data } = useCatalog();

  return (
    <div className="space-y-0">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[90vh] flex items-center overflow-hidden"
        style={{
          backgroundImage: "url('/assets/hero-reaper-knife.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "55% 40%",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Base darkening across the whole image so nothing is too bright */}
        <div className="absolute inset-0 bg-black/45" />
        {/* Left-to-right: extra darkness where the text column lives */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        {/* Amber tint in upper-right corner — warm glow that echoes the flame */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 60% at 85% 10%, rgba(220,120,30,0.22) 0%, transparent 70%)",
          }}
        />
        {/* Bottom fade into page background */}
        <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-bg to-transparent" />

        <div className="container relative py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/8 px-4 py-1.5 text-[11px] uppercase tracking-[0.28em] text-ember/80"
          >
            <Flame className="h-3 w-3" />
            Blockchain-backed provenance
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="display max-w-2xl text-balance text-6xl font-semibold leading-[1.05] tracking-tight sm:text-7xl"
          >
            <span className="text-ember">Rare.</span>{" "}
            <span className="text-ink">Hot.</span>{" "}
            <span className="text-gold">Alive.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted"
          >
            Farm-grown heat. Chef-built flavor. Blockchain-backed provenance. IC
            SPICY is a premium rare-pepper nursery on the Internet Computer —
            every plant, on chain.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Link
              to="/library"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-ember to-gold px-6 py-3 text-sm font-semibold text-bg shadow-ember transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-20px_rgb(var(--c-ember)/0.6)]"
            >
              <BookOpen className="h-4 w-4" />
              Explore Documents
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-elevated/30 px-6 py-3 text-sm font-medium text-ink backdrop-blur transition-colors hover:border-ember/50 hover:bg-elevated/50"
            >
              <MessageSquare className="h-4 w-4" />
              Ask SpicyAI
            </Link>
          </motion.div>

          {/* Stats row */}
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.34 }}
              className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-4"
            >
              {[
                { value: "30+", label: "Years Growing" },
                { value: "Zone 10a", label: "SW Florida" },
                { value: "8,888", label: "NFTs on-chain" },
                {
                  value: formatNumber(data.stats.totalDocuments),
                  label: "Documents",
                },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="display text-2xl font-semibold text-gold">
                    {s.value}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-muted mt-0.5">
                    {s.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Three feature cards ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 border-y border-line/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted mb-3">
              From soil to shelf. On chain.
            </p>
            <h2 className="display text-3xl font-semibold tracking-tight text-ink sm:text-4xl max-w-xl mx-auto">
              Real products. Verifiable origin. Chef-designed heat.
            </h2>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group rounded-xl border border-line/50 bg-surface/50 p-6 backdrop-blur-sm hover:border-ember/40 transition-colors"
              >
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-ember/10 text-ember border border-ember/20">
                  {feat.icon}
                </span>
                <h3 className="display text-lg font-semibold text-ink">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  {feat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Data room preview ───────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted mb-2">
                In-chain document library
              </p>
              <h2 className="display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                The data room.
              </h2>
            </div>
            <Link
              to="/library"
              className="text-sm text-ember hover:text-gold transition-colors inline-flex items-center gap-1.5"
            >
              View all {data?.stats.totalDocuments ?? ""} documents
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          <div className="space-y-3">
            {DATA_ROOM_LEVELS.map((level, i) => (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
              >
                <Link
                  to={`/library?category=${level.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-line/50 bg-surface/50 px-5 py-4 backdrop-blur-sm hover:border-ember/40 hover:bg-elevated/40 transition-all"
                >
                  <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ember/70 w-28 flex-shrink-0">
                    {level.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink group-hover:text-ember transition-colors">
                      {level.title}
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {level.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-ember transition-colors flex-shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-5"
          >
            <Link
              to="/library"
              className="flex items-center justify-center gap-2 rounded-xl border border-line/40 bg-surface/30 px-5 py-3.5 text-sm text-muted hover:text-ink hover:border-line/60 transition-colors"
            >
              <Compass className="h-4 w-4" />
              Browse all categories
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── SpicyAI CTA ─────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 border-t border-line/30">
        {/* Glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember/30 to-transparent" />
          <div className="absolute top-1/2 left-1/2 h-[50vh] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/10 blur-[120px]" />
        </div>

        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold shadow-ember"
          >
            <Sprout className="h-7 w-7 text-bg" strokeWidth={1.8} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="display text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
          >
            Have questions?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="display mt-2 text-4xl font-semibold tracking-tight sm:text-5xl shimmer-text"
          >
            SpicyAI knows everything.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="mt-6 max-w-md mx-auto text-base text-muted leading-relaxed"
          >
            Ask anything about peppers, provenance, NFTs, tokenomics, or natural
            farming. Powered by DeepSeek-R1 running fully on-chain.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.26 }}
            className="mt-8"
          >
            <Link
              to="/chat"
              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-ember to-gold px-8 py-3.5 text-base font-semibold text-bg shadow-ember transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-20px_rgb(var(--c-ember)/0.6)]"
            >
              <MessageSquare className="h-5 w-5" />
              Start Chatting
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-5 text-xs text-muted/60"
          >
            Fully on-chain on ICP · Zero data stored · DeepSeek-R1
          </motion.p>
        </div>
      </section>
    </div>
  );
}
