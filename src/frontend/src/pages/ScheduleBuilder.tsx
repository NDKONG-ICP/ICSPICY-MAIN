import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Droplets,
  FlaskConical,
  Leaf,
  Printer,
  Share2,
  Sprout,
  Star,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { SavedSchedule, ScheduleEntry } from "../backend";
import { useAuth } from "../hooks/useAuth";
import {
  useGetMySchedules,
  useGetScheduleByShareToken,
  useGetScheduleData,
  useSaveSchedule,
} from "../hooks/useBackend";

// ─── Constants ────────────────────────────────────────────────────────────────

const GROWTH_STAGES = [
  {
    value: "Germination",
    label: "Germination",
    emoji: "🌱",
    desc: "Seed activation through sprout emergence",
    color: "from-chart-4/20 to-chart-4/5 border-chart-4/30",
    activeColor: "from-chart-4/30 to-chart-4/10 border-chart-4/60",
    textColor: "text-chart-4",
  },
  {
    value: "Seedling",
    label: "Seedling",
    emoji: "🌿",
    desc: "First true leaves through transplant-ready",
    color: "from-chart-4/15 to-chart-5/5 border-chart-5/30",
    activeColor: "from-chart-4/30 to-chart-5/15 border-chart-5/60",
    textColor: "text-chart-5",
  },
  {
    value: "Vegetative",
    label: "Vegetative",
    emoji: "🌶️",
    desc: "Rapid green growth, canopy development",
    color: "from-green-900/20 to-green-900/5 border-green-800/30",
    activeColor: "from-green-900/40 to-green-900/15 border-green-700/60",
    textColor: "text-chart-4",
  },
  {
    value: "Flowering",
    label: "Flowering",
    emoji: "🌸",
    desc: "Bud set through full bloom",
    color: "from-primary/15 to-accent/5 border-primary/20",
    activeColor: "from-primary/30 to-accent/15 border-primary/50",
    textColor: "text-primary",
  },
  {
    value: "Fruiting",
    label: "Fruiting",
    emoji: "🫑",
    desc: "Pod development through color change",
    color: "from-primary/20 to-primary/5 border-primary/25",
    activeColor: "from-primary/40 to-primary/15 border-primary/60",
    textColor: "text-primary",
  },
  {
    value: "Harvest",
    label: "Harvest Prep",
    emoji: "🧺",
    desc: "Ripening through final harvest window",
    color: "from-chart-3/15 to-chart-3/5 border-chart-3/25",
    activeColor: "from-chart-3/30 to-chart-3/15 border-chart-3/55",
    textColor: "text-chart-3",
  },
] as const;

const KNF_INPUTS = [
  {
    id: "OHN",
    name: "Oriental Herbal Nutrient",
    short: "Immunity & biostimulant blend of 5 medicinal herbs",
    color: "bg-amber-500/15 text-amber-300 border-amber-500/35",
    activeRing: "ring-amber-500/40",
    dot: "bg-amber-400",
    days: [1, 4], // typical application days in a week
  },
  {
    id: "FPJ",
    name: "Fermented Plant Juice",
    short: "Growth hormones & enzymes from plant meristems",
    color: "bg-chart-4/15 text-chart-4 border-chart-4/35",
    activeRing: "ring-chart-4/40",
    dot: "bg-chart-4",
    days: [2, 5],
  },
  {
    id: "FPE",
    name: "Fermented Plant Extract",
    short: "Broad-spectrum nutrients, K & P from whole plants",
    color: "bg-lime-500/15 text-lime-300 border-lime-500/35",
    activeRing: "ring-lime-500/40",
    dot: "bg-lime-400",
    days: [3, 6],
  },
  {
    id: "WCA",
    name: "Water Soluble Calcium",
    short: "Bioavailable calcium, cell walls & natural fungicide",
    color: "bg-chart-5/15 text-chart-5 border-chart-5/35",
    activeRing: "ring-chart-5/40",
    dot: "bg-chart-5",
    days: [2, 5, 7],
  },
  {
    id: "IMO2",
    name: "Indigenous Microorganisms",
    short: "Local microbial colony for soil ecosystem health",
    color: "bg-violet-500/15 text-violet-300 border-violet-500/35",
    activeRing: "ring-violet-500/40",
    dot: "bg-violet-400",
    days: [1, 7],
  },
  {
    id: "LAB",
    name: "Lactic Acid Bacteria",
    short: "Decomposition, pathogen suppression & soil life",
    color: "bg-pink-500/15 text-pink-300 border-pink-500/35",
    activeRing: "ring-pink-500/40",
    dot: "bg-pink-400",
    days: [3, 6],
  },
  {
    id: "AEM",
    name: "Activated Effective Microorganisms",
    short: "EM-expanded culture for compost & fertility",
    color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/35",
    activeRing: "ring-cyan-500/40",
    dot: "bg-cyan-400",
    days: [1, 4, 7],
  },
  {
    id: "FFA",
    name: "Fermented Fruit Acid",
    short: "Organic acids, brix & flavor enhancement",
    color: "bg-orange-500/15 text-orange-300 border-orange-500/35",
    activeRing: "ring-orange-500/40",
    dot: "bg-orange-400",
    days: [2, 6],
  },
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── URL share token helper ───────────────────────────────────────────────────

function getShareTokenFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  return params.get("share") ?? undefined;
}

// ─── Weekly grid ─────────────────────────────────────────────────────────────

function WeeklyGrid({ entries }: { entries: ScheduleEntry[] }) {
  // Map input_name → which days of the week it applies
  const dayMap = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    for (const entry of entries) {
      const meta = KNF_INPUTS.find((k) => k.id === entry.input_name);
      if (!meta) continue;
      // Parse frequency to determine day pattern
      const freq = entry.frequency.toLowerCase();
      let days: number[];
      if (freq.includes("daily") || freq.includes("every day")) {
        days = [1, 2, 3, 4, 5, 6, 7];
      } else if (
        freq.includes("twice") ||
        freq.includes("2x") ||
        freq.includes("every 3")
      ) {
        days = meta.days.slice(0, 2);
      } else if (freq.includes("3x") || freq.includes("three")) {
        days = meta.days.slice(0, 3);
      } else if (freq.includes("weekly") || freq.includes("once")) {
        days = [meta.days[0]];
      } else {
        days = meta.days.slice(0, 2);
      }
      map[entry.input_name] = new Set(days);
    }
    return map;
  }, [entries]);

  return (
    <div
      className="rounded-2xl bg-card border border-border overflow-hidden"
      data-ocid="weekly-grid"
    >
      <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h3 className="font-display font-semibold text-foreground text-sm">
          7-Day Application Grid
        </h3>
        <span className="text-xs text-muted-foreground ml-auto">
          ● = apply this day
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="bg-muted/20 border-b border-border/40">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-28">
                Input
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="text-center px-2 py-2.5 font-semibold text-muted-foreground w-12"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const meta = KNF_INPUTS.find((k) => k.id === entry.input_name);
              const activeDays = dayMap[entry.input_name] ?? new Set();
              return (
                <tr
                  key={entry.input_name}
                  className={`border-b border-border/25 ${i % 2 === 1 ? "bg-muted/10" : ""}`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${meta?.color ?? "bg-muted text-muted-foreground border-border"}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta?.dot ?? "bg-muted-foreground"}`}
                      />
                      {entry.input_name}
                    </span>
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <td key={day} className="text-center px-2 py-3">
                      {activeDays.has(day) ? (
                        <span
                          className={`inline-block w-5 h-5 rounded-full ${meta?.dot ?? "bg-primary"} opacity-90 shadow-sm`}
                        />
                      ) : (
                        <span className="inline-block w-5 h-5 rounded-full bg-border/30" />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-muted/10 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground">
          Frequency based on schedule data. Always combine with plain water at
          recommended dilution rates.
        </p>
      </div>
    </div>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

function ScheduleEntryCard({
  entry,
  index,
}: { entry: ScheduleEntry; index: number }) {
  const meta = KNF_INPUTS.find((k) => k.id === entry.input_name);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className="rounded-xl bg-card border border-border overflow-hidden hover:border-primary/30 transition-colors duration-200"
      data-ocid="schedule-entry-card"
    >
      {/* Card top accent bar */}
      <div
        className={`h-1 w-full bg-gradient-to-r ${meta ? meta.color.split(" ")[0].replace("bg-", "from-") : "from-primary/40"} to-transparent`}
      />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-black border ${meta?.color ?? "bg-muted text-muted-foreground border-border"}`}
          >
            {entry.input_name.slice(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-bold text-sm ${meta?.color.split(" ")[1] ?? "text-foreground"}`}
              >
                {entry.input_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {meta?.name ?? ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {meta?.short ?? ""}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-muted/20 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Droplets className="w-3 h-3 text-chart-5" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
              Dilution
            </p>
            <p className="text-xs font-bold text-foreground leading-tight">
              {entry.dilution}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CalendarDays className="w-3 h-3 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
              Frequency
            </p>
            <p className="text-xs font-bold text-foreground leading-tight">
              {entry.frequency}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-chart-3" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
              Timing
            </p>
            <p className="text-xs font-bold text-foreground leading-tight">
              {entry.timing}
            </p>
          </div>
        </div>
        {entry.notes && (
          <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {entry.notes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Print view ───────────────────────────────────────────────────────────────

function PrintScheduleView({
  stage,
  inputs,
  entries,
}: { stage: string; inputs: string[]; entries: ScheduleEntry[] }) {
  return (
    <div
      id="print-schedule-view"
      className="hidden print:block"
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#111",
        background: "#fff",
        padding: "32px",
        maxWidth: "700px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          borderBottom: "3px solid #b91c1c",
          paddingBottom: "16px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            IC SPICY Nursery — Port Charlotte, FL
          </div>
          <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
            icspicy.farm · KNF Application Schedule
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: "#b91c1c",
              marginTop: "8px",
              lineHeight: 1,
            }}
          >
            {stage} Stage
          </div>
          <div style={{ fontSize: "13px", color: "#444", marginTop: "4px" }}>
            KNF Schedule — {inputs.join(", ")}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#888" }}>
          Printed: {new Date().toLocaleDateString()}
          <br />
          icspicy.farm
        </div>
      </div>

      {/* Entries */}
      {entries.map((entry) => {
        const meta = KNF_INPUTS.find((k) => k.id === entry.input_name);
        return (
          <div
            key={entry.input_name}
            style={{
              marginBottom: "16px",
              paddingBottom: "16px",
              borderBottom: "1px solid #eee",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  background: "#f9ece8",
                  border: "2px solid #b91c1c",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "12px",
                  color: "#b91c1c",
                  flexShrink: 0,
                }}
              >
                {entry.input_name}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px" }}>
                  {entry.input_name}
                </div>
                <div style={{ fontSize: "11px", color: "#666" }}>
                  {meta?.name ?? ""}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  background: "#f5f5f5",
                  padding: "8px",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    color: "#b91c1c",
                    marginBottom: "2px",
                  }}
                >
                  Dilution
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>
                  {entry.dilution}
                </div>
              </div>
              <div
                style={{
                  background: "#f5f5f5",
                  padding: "8px",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    color: "#b91c1c",
                    marginBottom: "2px",
                  }}
                >
                  Frequency
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>
                  {entry.frequency}
                </div>
              </div>
              <div
                style={{
                  background: "#f5f5f5",
                  padding: "8px",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    color: "#b91c1c",
                    marginBottom: "2px",
                  }}
                >
                  Timing
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>
                  {entry.timing}
                </div>
              </div>
            </div>
            {entry.notes && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#555",
                  padding: "6px 10px",
                  borderLeft: "3px solid #b91c1c",
                  background: "#fdf8f8",
                }}
              >
                {entry.notes}
              </div>
            )}
          </div>
        );
      })}

      {/* 7-day grid */}
      <div style={{ marginTop: "20px" }}>
        <div
          style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "2px",
            color: "#b91c1c",
            fontWeight: 700,
            marginBottom: "10px",
          }}
        >
          7-Day Application Grid
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "6px 8px",
                  background: "#f5f5f5",
                  borderBottom: "2px solid #ddd",
                }}
              >
                Input
              </th>
              {DAYS.map((d) => (
                <th
                  key={d}
                  style={{
                    textAlign: "center",
                    padding: "6px 8px",
                    background: "#f5f5f5",
                    borderBottom: "2px solid #ddd",
                    width: "40px",
                  }}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const meta = KNF_INPUTS.find((k) => k.id === entry.input_name);
              const freq = entry.frequency.toLowerCase();
              let days: number[];
              if (freq.includes("daily")) days = [1, 2, 3, 4, 5, 6, 7];
              else if (
                freq.includes("twice") ||
                freq.includes("2x") ||
                freq.includes("every 3")
              )
                days = meta?.days.slice(0, 2) ?? [1, 4];
              else if (freq.includes("3x"))
                days = meta?.days.slice(0, 3) ?? [1, 3, 5];
              else days = [meta?.days[0] ?? 1];
              const daySet = new Set(days);
              return (
                <tr
                  key={entry.input_name}
                  style={{ borderBottom: "1px solid #eee" }}
                >
                  <td style={{ padding: "5px 8px", fontWeight: 700 }}>
                    {entry.input_name}
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <td
                      key={d}
                      style={{ textAlign: "center", padding: "5px 8px" }}
                    >
                      {daySet.has(d) ? "●" : "○"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "24px",
          paddingTop: "12px",
          borderTop: "1px solid #ccc",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "9px",
          color: "#999",
        }}
      >
        <span>
          © {new Date().getFullYear()} IC SPICY Nursery · Port Charlotte, FL ·
          icspicy.farm
        </span>
        <span>Korean Natural Farming Application Schedule</span>
      </div>
    </div>
  );
}

// ─── Saved schedule card ──────────────────────────────────────────────────────

function SavedScheduleCard({
  sched,
  onLoad,
}: { sched: SavedSchedule; onLoad: (sched: SavedSchedule) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/schedule-builder?share=${sched.share_token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    toast.success("Share link copied!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors duration-200 group"
      data-ocid="saved-schedule-card"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Leaf className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {sched.stage} Stage
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {sched.inputs.join(", ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          aria-label="Copy share link"
          data-ocid="saved-schedule-copy-link"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-chart-4" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onLoad(sched)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          data-ocid="load-saved-schedule-btn"
        >
          Load <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Mobile Accordion Sidebar ─────────────────────────────────────────────────

function MobileSection({
  title,
  icon,
  stepNum,
  isComplete,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  stepNum: number;
  isComplete?: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/10 transition-colors"
        aria-expanded={open}
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${isComplete ? "bg-chart-4 text-background" : "bg-primary text-primary-foreground"}`}
        >
          {isComplete ? <Check className="w-3.5 h-3.5" /> : stepNum}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon}
          <span className="font-display font-semibold text-foreground">
            {title}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScheduleBuilderPage() {
  const { isAuthenticated, login } = useAuth();
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [hasBuilt, setHasBuilt] = useState(false);
  const [sharedToken] = useState<string | undefined>(() =>
    getShareTokenFromUrl(),
  );
  const resultsRef = useRef<HTMLDivElement>(null);

  const saveSchedule = useSaveSchedule();
  const { data: mySchedules } = useGetMySchedules();
  const { data: sharedSchedule } = useGetScheduleByShareToken(sharedToken);
  const { data: scheduleEntries, isLoading } = useGetScheduleData(
    hasBuilt ? selectedStage : undefined,
    hasBuilt ? selectedInputs : [],
  );

  // Pre-populate from share token
  useEffect(() => {
    if (sharedSchedule) {
      setSelectedStage(sharedSchedule.stage);
      setSelectedInputs(sharedSchedule.inputs);
      setHasBuilt(true);
      toast.success(`Loaded shared schedule: ${sharedSchedule.stage} stage`);
    }
  }, [sharedSchedule]);

  const toggleInput = (id: string) => {
    setSelectedInputs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
    setHasBuilt(false);
  };

  const handleBuild = () => {
    if (!selectedStage || selectedInputs.length === 0) {
      toast.error("Select a growth stage and at least one KNF input.");
      return;
    }
    setHasBuilt(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  };

  const handlePrint = () => {
    if (!hasBuilt || !scheduleEntries?.length) {
      toast.error("Build a schedule first before printing.");
      return;
    }
    window.print();
  };

  const handleShare = async () => {
    if (!isAuthenticated) {
      toast.error(
        "Connect your Internet Identity to save and share schedules.",
      );
      return;
    }
    if (!selectedStage || selectedInputs.length === 0) {
      toast.error("Build a schedule first.");
      return;
    }
    try {
      const shareId = await saveSchedule.mutateAsync({
        stage: selectedStage,
        inputs: selectedInputs,
      });
      const shareUrl = `${window.location.origin}/schedule-builder?share=${shareId}`;
      await navigator.clipboard.writeText(shareUrl).catch(() => {});
      toast.success("Schedule saved & share link copied!", { duration: 4000 });
    } catch {
      toast.error("Failed to save schedule.");
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error("Connect your Internet Identity to save schedules.");
      return;
    }
    if (!selectedStage || selectedInputs.length === 0) {
      toast.error("Build a schedule first.");
      return;
    }
    try {
      await saveSchedule.mutateAsync({
        stage: selectedStage,
        inputs: selectedInputs,
      });
      toast.success("Schedule saved to your profile!");
    } catch {
      toast.error("Failed to save schedule.");
    }
  };

  const handleLoadSaved = (sched: SavedSchedule) => {
    setSelectedStage(sched.stage);
    setSelectedInputs(sched.inputs);
    setHasBuilt(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const stageMeta = GROWTH_STAGES.find((s) => s.value === selectedStage);
  const canBuild = !!selectedStage && selectedInputs.length > 0;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-schedule-view { display: block !important; }
          @page { margin: 16mm; }
        }
      `}</style>

      <div
        className="max-w-6xl mx-auto px-4 pb-24"
        data-ocid="schedule-builder"
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative rounded-2xl overflow-hidden mb-10 mt-4"
        >
          <div className="bg-gradient-to-br from-card via-background to-muted/30 border border-border rounded-2xl px-8 py-10 sm:py-14 relative">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold mb-4">
                <FlaskConical className="w-3.5 h-3.5" />
                Korean Natural Farming
              </div>
              <h1 className="font-display font-black text-3xl sm:text-5xl text-foreground leading-tight mb-3">
                KNF Application{" "}
                <span className="text-primary">Schedule Builder</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xl mb-6">
                Mix and combine KNF inputs by growth stage to get precise
                dilution rates, timing, frequency, and a printable 7-day
                application grid tailored to your plants.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="outline"
                  className="text-xs border-primary/30 text-primary"
                >
                  <Zap className="w-3 h-3 mr-1" /> 8 KNF Inputs
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs border-border text-muted-foreground"
                >
                  6 Growth Stages
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs border-border text-muted-foreground"
                >
                  <Printer className="w-3 h-3 mr-1" /> Printable Cards
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Two-column layout (sidebar + main) ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* ── Left Panel ─────────────────────────────────────────────── */}
          <aside className="space-y-4" data-ocid="schedule-sidebar">
            {/* Step 1 — Growth Stage */}
            <MobileSection
              title="Growth Stage"
              stepNum={1}
              icon={<Sprout className="w-4 h-4 text-muted-foreground" />}
              isComplete={!!selectedStage}
              defaultOpen
            >
              <div className="grid grid-cols-2 gap-2 pt-1">
                {GROWTH_STAGES.map((stage) => {
                  const isActive = selectedStage === stage.value;
                  return (
                    <button
                      key={stage.value}
                      type="button"
                      onClick={() => {
                        setSelectedStage(stage.value);
                        setHasBuilt(false);
                      }}
                      className={`p-3 rounded-xl border bg-gradient-to-br text-left transition-all duration-200 ${
                        isActive ? stage.activeColor : stage.color
                      } hover:brightness-110`}
                      data-ocid={`stage-btn-${stage.value.toLowerCase()}`}
                    >
                      <span className="text-lg block mb-0.5">
                        {stage.emoji}
                      </span>
                      <p
                        className={`font-bold text-xs leading-tight ${isActive ? stage.textColor : "text-foreground"}`}
                      >
                        {stage.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {stage.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </MobileSection>

            {/* Step 2 — KNF Inputs */}
            <MobileSection
              title="KNF Inputs"
              stepNum={2}
              icon={<FlaskConical className="w-4 h-4 text-muted-foreground" />}
              isComplete={selectedInputs.length > 0}
              defaultOpen
            >
              {selectedInputs.length > 0 && (
                <div className="flex items-center justify-between mb-3 pt-1">
                  <span className="text-xs text-muted-foreground">
                    {selectedInputs.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInputs([]);
                      setHasBuilt(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-ocid="clear-inputs-btn"
                  >
                    Clear all
                  </button>
                </div>
              )}
              <div className="space-y-2 pt-1">
                {KNF_INPUTS.map((input) => {
                  const isSelected = selectedInputs.includes(input.id);
                  return (
                    <button
                      key={input.id}
                      type="button"
                      onClick={() => toggleInput(input.id)}
                      className={`relative w-full p-3 rounded-xl border text-left transition-all duration-200 flex items-start gap-2.5 ${
                        isSelected
                          ? `${input.color} ring-2 ${input.activeRing}`
                          : "bg-muted/10 border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/20"
                      }`}
                      data-ocid={`input-btn-${input.id.toLowerCase()}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-black border mt-0.5 ${isSelected ? input.color : "bg-muted/30 text-muted-foreground border-border"}`}
                      >
                        {input.id.slice(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-bold text-xs ${isSelected ? "" : "text-foreground"}`}
                        >
                          {input.id}
                        </p>
                        <p className="text-[10px] line-clamp-2 mt-0.5 opacity-80">
                          {input.short}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </MobileSection>

            {/* Build button */}
            <Button
              onClick={handleBuild}
              disabled={!canBuild}
              className="w-full bg-primary text-primary-foreground h-11 font-semibold"
              data-ocid="build-schedule-btn"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              {hasBuilt ? "Rebuild Schedule" : "Build Schedule"}
            </Button>

            {/* Tips */}
            <div className="rounded-xl bg-muted/20 border border-border/50 p-4 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Quick Tips
              </p>
              {[
                "Start with OHN + FPJ for a complete base formula",
                "Add WCA during flowering to prevent blossom end rot",
                "IMO2 + LAB are powerful soil-health pair for seedlings",
                "FFA shines in fruiting stage for brix & flavor",
              ].map((tip) => (
                <div key={tip} className="flex gap-2 items-start">
                  <span className="text-primary text-xs mt-0.5 flex-shrink-0">
                    ·
                  </span>
                  <p className="text-xs text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </aside>

          {/* ── Right main content ──────────────────────────────────────── */}
          <main className="space-y-6" data-ocid="schedule-main">
            {/* Empty state before build */}
            {!hasBuilt && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl bg-card border border-dashed border-border/60 flex flex-col items-center justify-center py-20 px-8 text-center"
                data-ocid="schedule-empty-prompt"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <FlaskConical className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">
                  Build Your Custom Schedule
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Select a growth stage and KNF inputs from the panel, then
                  click{" "}
                  <span className="text-primary font-medium">
                    Build Schedule
                  </span>{" "}
                  to generate your personalized application guide.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {KNF_INPUTS.slice(0, 4).map((k) => (
                    <span
                      key={k.id}
                      className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${k.color}`}
                    >
                      {k.id}
                    </span>
                  ))}
                  <span className="text-[10px] px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                    +4 more
                  </span>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {hasBuilt && (
              <div ref={resultsRef} className="space-y-5">
                {/* Results header */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-card border border-border px-5 py-4"
                  data-ocid="schedule-results-header"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stageMeta?.activeColor ?? "from-primary/30 to-primary/10 border-primary/50"} border flex items-center justify-center text-lg flex-shrink-0`}
                    >
                      {stageMeta?.emoji ?? "🌿"}
                    </div>
                    <div>
                      <p className="font-display font-bold text-foreground text-sm">
                        {selectedStage} Stage — Application Schedule
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedInputs.map((id) => {
                          const meta = KNF_INPUTS.find((k) => k.id === id);
                          return (
                            <span
                              key={id}
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${meta?.color ?? "bg-muted text-muted-foreground border-border"}`}
                            >
                              {id}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrint}
                      className="h-8 text-xs border-border"
                      data-ocid="print-schedule-btn"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleShare}
                      disabled={saveSchedule.isPending}
                      className="h-8 text-xs border-border"
                      data-ocid="share-schedule-btn"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1" />
                      {saveSchedule.isPending ? "Saving…" : "Share"}
                    </Button>
                    {isAuthenticated ? (
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saveSchedule.isPending}
                        className="h-8 text-xs bg-primary"
                        data-ocid="save-schedule-btn"
                      >
                        <Star className="w-3.5 h-3.5 mr-1" />
                        Save
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={login}
                        className="h-8 text-xs border-primary/40 text-primary"
                        data-ocid="sign-in-to-save-btn"
                      >
                        Sign in to save
                      </Button>
                    )}
                  </div>
                </motion.div>

                {/* Loading skeletons */}
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((k) => (
                      <div
                        key={k}
                        className="rounded-xl border border-border p-4 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-11 h-11 rounded-xl" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-1/3" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Skeleton className="h-14 rounded-lg" />
                          <Skeleton className="h-14 rounded-lg" />
                          <Skeleton className="h-14 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : scheduleEntries && scheduleEntries.length > 0 ? (
                  <>
                    {/* Entry cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {scheduleEntries.map((entry, i) => (
                        <ScheduleEntryCard
                          key={entry.input_name}
                          entry={entry}
                          index={i}
                        />
                      ))}
                    </div>

                    {/* 7-day grid */}
                    <WeeklyGrid entries={scheduleEntries} />

                    {/* Print-only version */}
                    <PrintScheduleView
                      stage={selectedStage}
                      inputs={selectedInputs}
                      entries={scheduleEntries}
                    />
                  </>
                ) : (
                  <div
                    className="text-center py-16 rounded-2xl bg-card border border-border"
                    data-ocid="schedule-no-data"
                  >
                    <Sprout className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-medium text-foreground mb-2">
                      No schedule data for this combination
                    </p>
                    <p className="text-sm text-muted-foreground mb-5">
                      Try a different growth stage or input selection.
                    </p>
                    <Link to="/cookbook">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-xs h-8"
                      >
                        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                        View CookBook Recipes
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* ── My Saved Schedules ───────────────────────────────────────── */}
        <div className="mt-12" data-ocid="my-schedules-section">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display font-bold text-lg text-foreground">
              My Saved Schedules
            </h2>
            <div className="flex-1 h-px bg-border/40 ml-2" />
          </div>

          {isAuthenticated ? (
            mySchedules && mySchedules.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mySchedules.map((sched) => (
                  <SavedScheduleCard
                    key={sched.id}
                    sched={sched}
                    onLoad={handleLoadSaved}
                  />
                ))}
              </div>
            ) : (
              <div
                className="text-center py-12 rounded-2xl bg-card border border-dashed border-border/60"
                data-ocid="saved-schedules-empty"
              >
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  No saved schedules yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Build a schedule and click Save to keep it here for quick
                  access.
                </p>
              </div>
            )
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border p-8 text-center"
              data-ocid="saved-schedules-cta"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-2">
                Save & Share Your Schedules
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                Create a free IC SPICY account to save unlimited schedules,
                generate share links, access your plant NFT lifecycle, and earn
                a{" "}
                <span className="text-primary font-medium">
                  lifetime storewide discount
                </span>
                .
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={login}
                  className="bg-primary text-primary-foreground px-6"
                  data-ocid="cta-sign-in-btn"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Connect Internet Identity
                </Button>
                <a href="/cookbook">
                  <Button
                    variant="outline"
                    className="border-border text-muted-foreground px-6"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse CookBook
                  </Button>
                </a>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
