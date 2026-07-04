/**
 * PlantStoryVine — "Plant Story" lifecycle timeline. A literal SVG vine
 * grows from the seed (bottom) to today (top); lifecycle events are nodes
 * on the vine, with a weather-history color strip riding alongside.
 *
 * Design language: regenerative heat — soil charcoal, ember reds, amber
 * gradients, living greens. Draw-on scroll animation via motion/react;
 * static vine when prefers-reduced-motion.
 */
import { cn } from "@/lib/utils";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { memo, useMemo, useRef, useState } from "react";
import type { PlantLifecycle } from "../../declarations/backend.did";
import { findDeathRecord } from "../../lib/plant-lifecycle-utils";
import { buildWeatherHistory } from "../../lib/weather-history";
import { NimsStoredPhoto } from "./NimsStoredPhoto";

// ── Event model ──────────────────────────────────────────────────────────────

type VineEventKind =
  | "seed"
  | "germinated"
  | "watering"
  | "feeding"
  | "transplant"
  | "photo"
  | "pest"
  | "sold"
  | "dead"
  | "today";

type VineEvent = {
  id: string;
  kind: VineEventKind;
  ts: bigint;
  label: string;
  detail?: string;
  knfBadge?: string;
  photoPath?: string;
};

const KNF_INPUTS = ["FPJ", "FFJ", "LAB", "OHN", "FAA", "EAA", "IMO", "WCA", "WCP", "JMS", "JLF"];

function knfBadgeFor(text: string): string | undefined {
  const upper = text.toUpperCase();
  return KNF_INPUTS.find((k) => upper.includes(k));
}

function fmtTs(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dateKey(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toISOString().slice(0, 10);
}

function buildVineEvents(lc: PlantLifecycle): VineEvent[] {
  const p = lc.plant;
  const events: VineEvent[] = [
    {
      id: "seed",
      kind: "seed",
      ts: p.planting_date,
      label: "Seed planted",
      detail: p.variety,
    },
  ];
  if (p.germination_date.length > 0) {
    events.push({
      id: "germ",
      kind: "germinated",
      ts: p.germination_date[0]!,
      label: "Germinated",
      detail:
        lc.nftTokenId.length > 0
          ? `NFT #${lc.nftTokenId[0]!.toString()}`
          : undefined,
    });
  }
  if (p.transplant_date.length > 0) {
    events.push({
      id: "transplant",
      kind: "transplant",
      ts: p.transplant_date[0]!,
      label: "Transplanted",
      detail: "The vine thickens from here",
    });
  }
  for (const w of lc.wateringLog) {
    events.push({
      id: `w-${w.timestamp.toString()}`,
      kind: "watering",
      ts: w.timestamp,
      label: "Watered",
      detail: `${w.amountMl.toString()} ml`,
    });
  }
  for (const f of lc.feedingLog) {
    events.push({
      id: `f-${f.id.toString()}`,
      kind: "feeding",
      ts: f.date,
      label: "Fed",
      detail: f.product_name,
      knfBadge: knfBadgeFor(
        `${f.product_name} ${f.notes.length > 0 ? f.notes[0] : ""}`,
      ),
    });
  }
  for (const pest of lc.pestLog) {
    events.push({
      id: `p-${pest.timestamp.toString()}`,
      kind: "pest",
      ts: pest.timestamp,
      label: `Pest: ${pest.pestName}`,
      detail:
        pest.treatment.length > 0 ? `Treated: ${pest.treatment[0]}` : undefined,
    });
  }
  for (const ph of lc.photos) {
    events.push({
      id: `photo-${ph.timestamp.toString()}`,
      kind: "photo",
      ts: ph.timestamp,
      label: "Photo",
      detail: ph.caption.length > 0 ? ph.caption[0] : undefined,
      photoPath: ph.url,
    });
  }
  if (lc.soldAt.length > 0) {
    events.push({
      id: "sold",
      kind: "sold",
      ts: lc.soldAt[0]!,
      label: "Sold",
    });
  }
  const death = findDeathRecord(lc.notes);
  if (death) {
    events.push({
      id: "dead",
      kind: "dead",
      ts: death.timestamp,
      label: "Terminated",
      detail: death.cause,
    });
  }
  // Oldest first — vine grows bottom (seed) → top (today). We render the
  // list newest-first so "today" sits at the top of the column.
  return events.sort((a, b) => Number(b.ts - a.ts));
}

// ── Node visuals ─────────────────────────────────────────────────────────────

const NODE_STYLE: Record<
  VineEventKind,
  { emoji: string; ring: string; glow?: string }
> = {
  seed: { emoji: "🌰", ring: "border-amber-900/70 bg-gradient-to-br from-amber-950 to-stone-900" },
  germinated: { emoji: "🌱", ring: "border-emerald-500/60 bg-emerald-950/80" },
  watering: {
    emoji: "💧",
    ring: "border-sky-500/50 bg-sky-950/70",
    glow: "shadow-[0_0_12px_-2px_rgba(56,189,248,0.5)]",
  },
  feeding: {
    emoji: "🧪",
    ring: "border-amber-500/60 bg-amber-950/70",
    glow: "shadow-[0_0_12px_-2px_rgba(251,191,36,0.45)]",
  },
  transplant: { emoji: "🪴", ring: "border-lime-500/60 bg-lime-950/70" },
  photo: { emoji: "📸", ring: "border-zinc-500/50 bg-zinc-900" },
  pest: {
    emoji: "🐛",
    ring: "border-red-500/70 bg-red-950/70 ring-2 ring-red-500/30",
  },
  sold: { emoji: "🏷️", ring: "border-purple-500/50 bg-purple-950/70" },
  dead: { emoji: "☠️", ring: "border-red-700/70 bg-red-950/80" },
  today: {
    emoji: "🌶️",
    ring: "border-red-500/70 bg-gradient-to-br from-red-950 to-orange-950",
    glow: "shadow-[0_0_18px_-2px_rgba(239,68,68,0.65)]",
  },
};

/** Weather strip color: warm amber for heat, cool blue for rain, soil gray otherwise. */
function weatherStripColor(
  w: { highF: number; rainInches: number } | undefined,
): string {
  if (!w) return "rgba(120,113,108,0.15)";
  if (w.rainInches >= 0.1) return "rgba(56,189,248,0.45)";
  if (w.highF >= 92) return "rgba(239,68,68,0.5)";
  if (w.highF >= 84) return "rgba(249,115,22,0.45)";
  if (w.highF >= 74) return "rgba(251,191,36,0.35)";
  return "rgba(52,211,153,0.28)";
}

// ── Node component (memoized — long vines re-render cheaply) ────────────────

const VineNode = memo(function VineNode({
  event,
  weatherColor,
  thickVine,
  reducedMotion,
  index,
  onPhotoTap,
}: {
  event: VineEvent;
  weatherColor: string;
  thickVine: boolean;
  reducedMotion: boolean;
  index: number;
  onPhotoTap: (path: string, caption?: string) => void;
}) {
  const style = NODE_STYLE[event.kind];
  const isPhoto = event.kind === "photo" && event.photoPath;

  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
      className="relative flex gap-3 pl-10"
    >
      {/* weather context strip */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1 rounded-full"
        style={{ background: weatherColor }}
      />
      {/* node on the vine */}
      <span
        className={cn(
          "absolute left-[18px] top-0 z-10 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border text-base",
          style.ring,
          style.glow,
          event.kind === "today" && !reducedMotion && "animate-pulse",
        )}
      >
        {style.emoji}
      </span>
      {/* leaf sprout on germination */}
      {event.kind === "germinated" && (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="absolute left-8 top-1 z-0 size-5 text-emerald-500/80"
          fill="currentColor"
        >
          <path d="M12 22c0-6 2-10 10-12-1 8-4 11-10 12zM12 22C12 15 9 12 2 10c1.5 7 4.5 10.5 10 12z" />
        </svg>
      )}
      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2.5 backdrop-blur-sm",
          thickVine && "border-white/10",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{event.label}</p>
          {event.knfBadge && (
            <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300">
              KNF · {event.knfBadge}
            </span>
          )}
        </div>
        {event.detail && (
          <p className="truncate text-xs text-muted-foreground">
            {event.detail}
          </p>
        )}
        {isPhoto && (
          <button
            type="button"
            onClick={() => onPhotoTap(event.photoPath!, event.detail)}
            className="mt-2 block w-24 rotate-[-3deg] rounded-sm border-4 border-white/90 bg-white/90 shadow-lg transition hover:rotate-0 hover:scale-105"
            aria-label="Expand photo"
          >
            <NimsStoredPhoto
              path={event.photoPath}
              alt={event.detail ?? "Plant photo"}
              className="aspect-square w-full object-cover"
            />
          </button>
        )}
        <p className="mt-0.5 text-[10px] text-muted-foreground/70">
          {fmtTs(event.ts)}
        </p>
      </div>
    </motion.li>
  );
});

// ── Main component ───────────────────────────────────────────────────────────

export function PlantStoryVine({ lifecycle }: { lifecycle: PlantLifecycle }) {
  const reducedMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lightbox, setLightbox] = useState<{
    path: string;
    caption?: string;
  } | null>(null);

  const events = useMemo(() => buildVineEvents(lifecycle), [lifecycle]);
  const weatherByDate = useMemo(() => {
    const map = new Map<string, { highF: number; rainInches: number }>();
    for (const w of buildWeatherHistory(lifecycle, "all")) {
      map.set(w.date, { highF: w.highF, rainInches: w.rainInches });
    }
    return map;
  }, [lifecycle]);

  const transplantTs =
    lifecycle.plant.transplant_date.length > 0
      ? lifecycle.plant.transplant_date[0]!
      : null;

  const isAlive = !findDeathRecord(lifecycle.notes);
  const daysAlive = Math.max(
    1,
    Math.floor(
      (Date.now() - Number(lifecycle.plant.planting_date / 1_000_000n)) /
        86_400_000,
    ),
  );

  // Vine draw-on-scroll: pathLength follows scroll progress through the card.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.35"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0.15, 1]);

  return (
    <div ref={containerRef} data-ocid="nims-plant-story" className="relative">
      {/* today header node */}
      {isAlive && (
        <div className="relative mb-4 flex items-center gap-3 pl-10">
          <span
            className={cn(
              "absolute left-[18px] flex size-10 -translate-x-1/2 items-center justify-center rounded-full border text-lg",
              NODE_STYLE.today.ring,
              NODE_STYLE.today.glow,
              !reducedMotion && "animate-pulse",
            )}
          >
            🌶️
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Today</p>
            <p className="text-xs text-amber-400/90">
              {daysAlive} days growing 🔥
            </p>
          </div>
        </div>
      )}

      {/* the vine spine */}
      <svg
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-[18px] top-2 z-0 h-[calc(100%-16px)] w-6 -translate-x-1/2"
        viewBox="0 0 24 400"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="vineGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="35%" stopColor="#4d7c0f" />
            <stop offset="75%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        {reducedMotion ? (
          <path
            d="M12 400 C 8 340, 16 300, 12 250 C 8 200, 16 150, 12 100 C 9 60, 14 30, 12 0"
            stroke="url(#vineGradient)"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <motion.path
            d="M12 400 C 8 340, 16 300, 12 250 C 8 200, 16 150, 12 100 C 9 60, 14 30, 12 0"
            stroke="url(#vineGradient)"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            style={{ pathLength }}
          />
        )}
      </svg>

      <ul className="relative z-10 space-y-3">
        {events.map((ev, i) => (
          <VineNode
            key={ev.id}
            event={ev}
            index={i}
            weatherColor={weatherStripColor(weatherByDate.get(dateKey(ev.ts)))}
            thickVine={transplantTs != null && ev.ts >= transplantTs}
            reducedMotion={reducedMotion}
            onPhotoTap={(path, caption) => setLightbox({ path, caption })}
          />
        ))}
      </ul>

      <p className="mt-3 pl-10 text-[10px] text-muted-foreground/60">
        Color strip = that day's weather: 🔴 hot · 🟠 warm · 🟡 mild · 🔵 rain
      </p>

      {/* photo lightbox */}
      {lightbox && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          aria-label="Close photo"
        >
          <div className="max-h-full max-w-lg overflow-hidden rounded-lg border-8 border-white/95 bg-white/95 shadow-2xl">
            <NimsStoredPhoto
              path={lightbox.path}
              alt={lightbox.caption ?? "Plant photo"}
              className="max-h-[75vh] w-full object-contain"
            />
            {lightbox.caption && (
              <p className="px-2 py-1.5 text-center text-sm text-zinc-800">
                {lightbox.caption}
              </p>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
