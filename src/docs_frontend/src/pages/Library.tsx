import { Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CategoryFilter } from "@/components/CategoryFilter";
import { DocumentTile } from "@/components/DocumentTile";
import { useCatalog } from "@/hooks/useCatalog";
import { cn } from "@/lib/utils";

type SortKey = "curated" | "title" | "longest" | "shortest";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "curated", label: "Curated order" },
  { id: "title", label: "Alphabetical" },
  { id: "longest", label: "Longest first" },
  { id: "shortest", label: "Shortest first" },
];

export function LibraryPage() {
  const { data } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("curated");

  const activeCategory = searchParams.get("category");

  const setActiveCategory = (id: string | null) => {
    if (id) {
      const next = new URLSearchParams(searchParams);
      next.set("category", id);
      setSearchParams(next, { replace: true });
    } else {
      const next = new URLSearchParams(searchParams);
      next.delete("category");
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    if (activeCategory && data) {
      const exists = data.categories.some((c) => c.id === activeCategory);
      if (!exists) setActiveCategory(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let out = data.documents;
    if (activeCategory)
      out = out.filter((d) => d.category === activeCategory);
    const q = search.trim().toLowerCase();
    if (q.length > 0) {
      out = out.filter((d) =>
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
    }
    const sorted = [...out];
    switch (sortKey) {
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "longest":
        sorted.sort((a, b) => b.wordCount - a.wordCount);
        break;
      case "shortest":
        sorted.sort((a, b) => a.wordCount - b.wordCount);
        break;
      default:
        sorted.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return sorted;
  }, [data, activeCategory, search, sortKey]);

  if (!data) return null;

  return (
    <div className="pb-24">
      {/* Page header */}
      <section className="container pt-12 sm:pt-20">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">
          The Library
        </p>
        <h1 className="display mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Every IC SPICY document, in one polished reading room.
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-base text-ink/80">
          Filter by category, search by tag or title, and open any document in
          a glassmorphic reader with markdown rendering and the original PDF.
        </p>
      </section>

      {/* Toolbar */}
      <section className="container mt-10">
        <div className="glass-elevated rounded-xl p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex flex-1 items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents, tags, audiences…"
                className="h-11 w-full rounded-lg border border-line/70 bg-bg/40 pl-10 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-gold"
              />
              {search.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortKey(s.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs transition-colors",
                    sortKey === s.id
                      ? "bg-ink text-bg"
                      : "border border-line/70 text-muted hover:text-ink",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-line/50 pt-4">
            <CategoryFilter
              categories={data.categories}
              active={activeCategory}
              total={data.documents.length}
              onChange={setActiveCategory}
            />
          </div>
        </div>
      </section>

      {/* Result grid */}
      <section className="container mt-10">
        <div className="mb-5 flex items-center justify-between text-xs text-muted">
          <span>
            Showing{" "}
            <span className="font-mono text-ink">{filtered.length}</span> of{" "}
            <span className="font-mono text-ink">
              {data.documents.length}
            </span>{" "}
            documents
          </span>
          <span className="hidden sm:inline">
            Catalog source:{" "}
            <span className="font-mono text-ink">{data.source}</span>
          </span>
        </div>

        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-elevated rounded-xl p-12 text-center text-sm text-muted"
          >
            No documents match those filters. Try clearing the search or
            picking another category.
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc, i) => (
              <DocumentTile
                key={doc.slug}
                doc={doc}
                variant="default"
                delayIndex={i}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
