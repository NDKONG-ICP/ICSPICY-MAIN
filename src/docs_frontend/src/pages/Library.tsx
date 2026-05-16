import { useCatalog } from "@/hooks/useCatalog";
import type { DocumentRecord } from "@/lib/backend";
import { cn, readingLabel } from "@/lib/utils";
import { ArrowUpRight, BookOpen, ChevronDown, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

// ── Level definitions ─────────────────────────────────────────────────────────

interface Level {
  id: string;
  label: string;
  title: string;
  description: string;
  categories: string[];
  featuredSlugs: string[];
}

const LEVELS: Level[] = [
  {
    id: "start-here",
    label: "Level 1",
    title: "Start Here",
    description:
      "The core narrative — whitepaper, roadmap, pitch deck, and executive summary.",
    categories: ["vision"],
    featuredSlugs: [
      "branded-whitepaper",
      "roadmap",
      "pitch-deck",
      "executive-summary",
    ],
  },
  {
    id: "business",
    label: "Level 2",
    title: "Business & Investor Room",
    description:
      "Investor memo, due diligence index, strategic partner brief, grant packet, and market analysis.",
    categories: ["investor", "marketing"],
    featuredSlugs: [
      "investor-memo",
      "data-room-index",
      "strategic-partner-brief",
      "grant-application-packet",
    ],
  },
  {
    id: "products",
    label: "Level 3",
    title: "Products & Retail",
    description:
      "Brand voice, SKU concepts, retail sell sheets, wholesale, distributor pitch, and recipe cards.",
    categories: ["retail", "brand"],
    featuredSlugs: [
      "brand-voice-guide",
      "retail-buyer-sell-sheet",
      "wholesale-line-sheet",
      "distributor-pitch-deck",
    ],
  },
  {
    id: "web3",
    label: "Level 4",
    title: "Web3 Utility",
    description:
      "PepperHead membership, NFT collector guide, SPICY token utility, and community guides.",
    categories: ["token", "community"],
    featuredSlugs: [
      "pepperhead-membership-guide",
      "nft-collector-guide",
      "spicy-utility-explainer",
    ],
  },
  {
    id: "grow-ops",
    label: "Level 5",
    title: "Grow System & Operations",
    description:
      "Korean Natural Farming, JADAM, rare pepper cultivation, launch checklist, and risk register.",
    categories: ["natural-farming", "operations"],
    featuredSlugs: [],
  },
];

// ── Rich document card ────────────────────────────────────────────────────────

function DocCard({ doc }: { doc: DocumentRecord }) {
  const visibleTags = doc.tags.slice(0, 2);
  return (
    <Link
      to={`/library/${doc.slug}`}
      className="group flex flex-col gap-2.5 rounded-xl border border-line/50 bg-surface/80 p-4 shadow-md shadow-black/30 transition-all hover:border-ember/40 hover:bg-elevated/60 hover:shadow-lg hover:shadow-black/40"
    >
      {/* Top row: category pill + featured badge + arrow */}
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-line/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted">
          {doc.category}
        </span>
        {doc.featured && (
          <span className="rounded-full bg-ember px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-bg">
            Featured
          </span>
        )}
        <ArrowUpRight
          className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-muted/50 transition-colors group-hover:text-ember"
          strokeWidth={1.8}
        />
      </div>

      {/* Title */}
      <p className="display text-sm font-semibold leading-snug text-gold transition-colors group-hover:text-gold/80">
        {doc.title}
      </p>

      {/* Subtitle */}
      {doc.subtitle && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted">
          {doc.subtitle}
        </p>
      )}

      {/* Metadata row */}
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-muted/60">
        <span>{readingLabel(doc.readingMinutes)}</span>
        {visibleTags.length > 0 && (
          <>
            <span className="text-muted/30">·</span>
            {visibleTags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </>
        )}
      </div>
    </Link>
  );
}

// ── Level accordion card ──────────────────────────────────────────────────────

interface LevelCardProps {
  level: Level;
  docs: DocumentRecord[];
  defaultOpen?: boolean;
}

function LevelCard({ level, docs, defaultOpen = false }: LevelCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const featured = useMemo(() => {
    const bySlug = new Map(docs.map((d) => [d.slug, d]));
    const pinned = level.featuredSlugs
      .map((s) => bySlug.get(s))
      .filter((d): d is DocumentRecord => !!d);
    if (pinned.length >= 4) return pinned.slice(0, 4);
    const rest = docs.filter((d) => !level.featuredSlugs.includes(d.slug));
    return [...pinned, ...rest].slice(0, 4);
  }, [docs, level.featuredSlugs]);

  const rest = useMemo(
    () => docs.filter((d) => !featured.includes(d)),
    [docs, featured],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45 }}
      className="rounded-xl border border-line/50 bg-surface/40 backdrop-blur-sm overflow-hidden"
    >
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-elevated/20 transition-colors text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-ember/70 w-16 flex-shrink-0">
          {level.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">{level.title}</p>
          <p className="text-xs text-muted truncate mt-0.5">
            {level.description}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="hidden sm:block text-xs text-muted/70">
            {docs.length} {docs.length === 1 ? "doc" : "docs"}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronDown className="h-4 w-4 text-muted" />
          </motion.span>
        </div>
      </button>

      {/* Featured preview — visible when collapsed */}
      <AnimatePresence initial={false}>
        {!open && featured.length > 0 && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-line/30 overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              {featured.map((doc) => (
                <DocCard key={doc.slug} doc={doc} />
              ))}
            </div>
            {docs.length > featured.length && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full border-t border-line/20 px-4 py-2.5 text-left text-xs text-muted/70 transition-colors hover:text-ink"
              >
                + {docs.length - featured.length} more documents — click to
                expand
              </button>
            )}
          </motion.div>
        )}

        {/* Expanded: show all docs */}
        {open && (
          <motion.div
            key="all"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-line/30 overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              {[...featured, ...rest].map((doc) => (
                <DocCard key={doc.slug} doc={doc} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Library page ──────────────────────────────────────────────────────────────

export function LibraryPage() {
  const { data } = useCatalog();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [searchOpen, setSearchOpen] = useState(false);

  const jumpCategory = searchParams.get("category");

  // When arriving from a category link, open search for that category.
  useEffect(() => {
    if (jumpCategory) setSearch(jumpCategory);
  }, [jumpCategory]);

  const searchActive = search.trim().length > 0;

  // Full-text search results (used when search bar is active).
  const searchResults = useMemo(() => {
    if (!data || !searchActive) return [];
    const q = search.trim().toLowerCase();
    return data.documents.filter((d) =>
      [
        d.title,
        d.subtitle,
        d.summary,
        d.audience,
        d.slug,
        d.collection,
        d.category,
        ...d.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data, search, searchActive]);

  // Group documents into levels.
  const levelDocs = useMemo(() => {
    if (!data) return new Map<string, DocumentRecord[]>();
    const byCategory = new Map<string, DocumentRecord[]>();
    for (const doc of data.documents) {
      const arr = byCategory.get(doc.category) ?? [];
      arr.push(doc);
      byCategory.set(doc.category, arr);
    }
    const result = new Map<string, DocumentRecord[]>();
    for (const level of LEVELS) {
      const docs: DocumentRecord[] = [];
      for (const cat of level.categories) {
        docs.push(...(byCategory.get(cat) ?? []));
      }
      docs.sort((a, b) => a.sortOrder - b.sortOrder);
      result.set(level.id, docs);
    }
    return result;
  }, [data]);

  if (!data) return null;

  return (
    <div className="pb-24">
      {/* Page header */}
      <section className="container pt-12 sm:pt-20">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted mb-2">
              In-chain document library
            </p>
            <h1 className="display text-4xl font-semibold tracking-tight text-ink sm:text-5xl max-w-2xl">
              The data room.
            </h1>
            <p className="mt-3 max-w-xl text-base text-muted">
              {data.stats.totalDocuments} documents across{" "}
              {data.stats.totalCategories} categories — organized into five
              progressive levels.
            </p>
          </div>

          {/* Search toggle */}
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
              searchOpen || searchActive
                ? "border-ember/50 bg-ember/8 text-ember"
                : "border-line/60 text-muted hover:text-ink",
            )}
          >
            <Search className="h-3.5 w-3.5" />
            {searchActive ? `"${search}"` : "Search docs"}
            {searchActive && (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="ml-1 inline-flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch("");
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
            )}
          </button>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {(searchOpen || searchActive) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mb-8"
            >
              <label className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-muted" />
                <input
                  // biome-ignore lint/a11y/noAutofocus: intentional — search bar opens on user gesture
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, category, tag, or keyword…"
                  className="h-12 w-full rounded-xl border border-line/70 bg-elevated/40 pl-10 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-ember/50"
                />
                {search.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear"
                    className="absolute right-3 text-muted hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>

              {searchActive && (
                <div className="mt-4">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-muted py-6 text-center">
                      No documents match that search.
                    </p>
                  ) : (
                    <div className="rounded-xl border border-line/50 bg-surface/40 overflow-hidden">
                      <div className="px-4 py-2.5 text-xs text-muted/70 border-b border-line/30">
                        {searchResults.length} result
                        {searchResults.length !== 1 ? "s" : ""}
                      </div>
                      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                        {searchResults.map((doc) => (
                          <DocCard key={doc.slug} doc={doc} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Levels — hidden when search is active */}
      {!searchActive && (
        <section className="container">
          <div className="space-y-3">
            {LEVELS.map((level, i) => (
              <LevelCard
                key={level.id}
                level={level}
                docs={levelDocs.get(level.id) ?? []}
                defaultOpen={i === 0}
              />
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-8 flex items-center gap-2 text-xs text-muted/60">
            <BookOpen className="h-3.5 w-3.5" />
            <span>
              {data.stats.totalDocuments} documents ·{" "}
              {data.stats.totalWords.toLocaleString()} words
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
