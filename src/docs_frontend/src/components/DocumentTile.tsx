import type { DocumentRecord } from "@/lib/backend";
import { cn, readingLabel } from "@/lib/utils";
import { ArrowUpRight, BookOpen, Hash } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { Link } from "react-router-dom";

interface DocumentTileProps {
  doc: DocumentRecord;
  variant?: "default" | "feature" | "compact";
  delayIndex?: number;
}

const VARIANT_PADDING = {
  default: "p-6",
  feature: "p-8",
  compact: "p-5",
} as const;

export function DocumentTile({
  doc,
  variant = "default",
  delayIndex = 0,
}: DocumentTileProps) {
  // Spotlight that follows the pointer for a luxury hover feel.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(220px circle at ${mx}px ${my}px, rgb(var(--c-gold) / 0.18), transparent 60%)`;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set(event.clientX - rect.left);
    my.set(event.clientY - rect.top);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        delay: Math.min(delayIndex, 8) * 0.04,
      }}
      whileHover={{ y: -4 }}
      className={cn(
        "tile-frame group relative overflow-hidden rounded-lg",
        "glass-elevated",
        VARIANT_PADDING[variant],
        variant === "feature" && "min-h-[260px]",
      )}
    >
      {/* Spotlight overlay */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: spotlight }}
      />

      <Link
        to={`/library/${doc.slug}`}
        className="relative flex h-full flex-col gap-4"
        aria-label={`Open ${doc.title}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{doc.category.replace(/-/g, " ")}</span>
            {doc.featured && <span className="chip chip-active">Featured</span>}
          </div>
          <ArrowUpRight
            className="h-4 w-4 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold"
            strokeWidth={1.6}
          />
        </div>

        <div className="space-y-1.5">
          <h3
            className={cn(
              "display font-semibold tracking-tight text-ink",
              variant === "feature" ? "text-2xl" : "text-lg",
            )}
          >
            {doc.title}
          </h3>
          {doc.subtitle && (
            <p className="text-sm text-muted text-pretty">{doc.subtitle}</p>
          )}
        </div>

        {variant !== "compact" && doc.summary && (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink/80">
            {doc.summary}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" />
            {readingLabel(doc.readingMinutes)}
          </span>
          {doc.tags.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Hash className="h-3 w-3" />
              {doc.tags.slice(0, 2).join(" · ")}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
