import {
  ArrowRight,
  BookOpen,
  Compass,
  FileText,
  ScrollText,
  Sparkles,
  Sprout,
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { DocumentTile } from "@/components/DocumentTile";
import { useCatalog } from "@/hooks/useCatalog";
import { formatBytes, formatNumber } from "@/lib/utils";

export function HomePage() {
  const { data } = useCatalog();
  if (!data) return null;

  const featured = data.documents.filter((d) => d.featured).slice(0, 6);
  const byCategory = new Map<string, typeof data.documents>();
  for (const d of data.documents) {
    const arr = byCategory.get(d.category) ?? [];
    arr.push(d);
    byCategory.set(d.category, arr);
  }

  return (
    <div className="space-y-28 pb-24">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 sm:pt-24">
        <div className="container">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-elevated/60 px-3 py-1 text-xs uppercase tracking-[0.28em] text-muted"
          >
            <Sparkles className="h-3 w-3 ember-text" />
            The IC SPICY Document Library
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="display mt-6 max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl"
          >
            Florida-grown rare peppers,{" "}
            <span className="shimmer-text">on-chain provenance</span>, and the
            full operating brief.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-ink/80"
          >
            A luxury reading library of every IC SPICY document — whitepaper,
            roadmap, pitch, brand voice, retail playbooks, NFT and SPICY token
            utility, and the operations dossier — served from a single
            Internet Computer asset canister.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Link
              to="/library"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-ember to-gold px-5 py-2.5 text-sm font-medium text-bg shadow-ember transition-transform hover:-translate-y-0.5"
            >
              Browse the library
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/library/branded-whitepaper"
              className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-elevated/60 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-gold"
            >
              <FileText className="h-4 w-4" />
              Read the whitepaper
            </Link>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-16 grid gap-4 sm:grid-cols-4"
          >
            <Stat
              icon={<BookOpen className="h-4 w-4" />}
              value={formatNumber(data.stats.totalDocuments)}
              label="Documents"
            />
            <Stat
              icon={<Compass className="h-4 w-4" />}
              value={formatNumber(data.stats.totalCategories)}
              label="Categories"
            />
            <Stat
              icon={<ScrollText className="h-4 w-4" />}
              value={formatNumber(data.stats.totalWords)}
              label="Words written"
            />
            <Stat
              icon={<Sprout className="h-4 w-4" />}
              value={formatBytes(data.stats.totalPdfBytes)}
              label="PDF library size"
            />
          </motion.dl>
        </div>
      </section>

      {/* ── Featured grid ────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="container">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">
                Featured reading
              </p>
              <h2 className="display mt-2 text-3xl font-semibold tracking-tight text-ink">
                Start with the headline narrative.
              </h2>
            </div>
            <Link
              to="/library"
              className="hidden text-sm text-muted underline-offset-4 hover:text-ink hover:underline sm:inline"
            >
              See all {data.stats.totalDocuments} documents →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 2).map((doc, i) => (
              <div key={doc.slug} className="lg:col-span-2 lg:row-span-1">
                <DocumentTile doc={doc} variant="feature" delayIndex={i} />
              </div>
            ))}
            {featured.slice(2).map((doc, i) => (
              <DocumentTile
                key={doc.slug}
                doc={doc}
                variant="default"
                delayIndex={i + 2}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Category rails ───────────────────────────────────────────────── */}
      <section className="container space-y-16">
        {data.categories
          .filter((c) => c.count > 0)
          .map((category) => {
            const docs = (byCategory.get(category.id) ?? []).slice(0, 4);
            if (docs.length === 0) return null;
            return (
              <div key={category.id}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.28em] text-muted">
                      {category.name}
                    </p>
                    <h3 className="display mt-2 text-2xl font-semibold tracking-tight text-ink">
                      {category.description}
                    </h3>
                  </div>
                  <Link
                    to={`/library?category=${category.id}`}
                    className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    View {category.count} →
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {docs.map((doc, i) => (
                    <DocumentTile
                      key={doc.slug}
                      doc={doc}
                      variant="default"
                      delayIndex={i}
                    />
                  ))}
                </div>
              </div>
            );
          })}
      </section>
    </div>
  );
}

interface StatProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function Stat({ icon, value, label }: StatProps) {
  return (
    <div className="glass rounded-lg px-5 py-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.22em]">
          {label}
        </span>
      </div>
      <div className="display mt-2 text-2xl font-semibold text-ink">
        {value}
      </div>
    </div>
  );
}
