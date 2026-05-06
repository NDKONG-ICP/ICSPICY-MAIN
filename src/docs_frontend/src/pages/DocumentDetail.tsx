import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  Download,
  ExternalLink,
  Hash,
  Tag,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DocumentReader } from "@/components/DocumentReader";
import { DocumentTile } from "@/components/DocumentTile";
import { MARKDOWN_BODIES } from "@/generated/documentMarkdown";
import { useCatalog } from "@/hooks/useCatalog";
import { lookupBundledDocument } from "@/lib/catalogQuery";
import { formatBytes, formatNumber, readingLabel } from "@/lib/utils";

export function DocumentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: catalog } = useCatalog();
  const [copied, setCopied] = useState(false);

  const doc = useMemo(() => {
    if (!slug) return null;
    if (catalog) {
      const found = catalog.documents.find((d) => d.slug === slug);
      if (found) return found;
    }
    return lookupBundledDocument(slug);
  }, [slug, catalog]);

  useEffect(() => {
    if (slug && catalog && !doc) {
      navigate("/library", { replace: true });
    }
  }, [slug, catalog, doc, navigate]);

  // Markdown body comes from the bundled file map first; if missing, fetch
  // the certified asset directly so future docs added without rebuild also
  // render in the reader.
  const { data: fetchedBody } = useQuery({
    queryKey: ["docs", "markdown", doc?.markdownPath ?? ""],
    queryFn: async () => {
      if (!doc?.markdownPath) return "";
      if (MARKDOWN_BODIES[doc.markdownPath])
        return MARKDOWN_BODIES[doc.markdownPath];
      const res = await fetch(doc.markdownPath);
      if (!res.ok) throw new Error(`Failed to load ${doc.markdownPath}`);
      const raw = await res.text();
      const sepIdx = raw.indexOf("\n---\n");
      return sepIdx >= 0 ? raw.slice(sepIdx + 5).trim() : raw;
    },
    enabled: !!doc,
    staleTime: Infinity,
  });

  if (!doc) return null;

  const body =
    (doc.markdownPath && MARKDOWN_BODIES[doc.markdownPath]) || fetchedBody;

  const related =
    catalog?.documents
      .filter((d) => d.category === doc.category && d.slug !== doc.slug)
      .slice(0, 3) ?? [];

  const handleCopy = async () => {
    try {
      const url = `${window.location.origin}/library/${doc.slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="pb-24">
      <section className="container pt-10 sm:pt-16">
        <Link
          to="/library"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.22em] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to library
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]"
        >
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="chip chip-active">
                {doc.category.replace(/-/g, " ")}
              </span>
              <span className="chip">{doc.collection}</span>
              {doc.featured && <span className="chip">Featured</span>}
            </div>

            <h1 className="display text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              {doc.title}
            </h1>
            {doc.subtitle && (
              <p className="mt-3 max-w-2xl text-pretty text-base text-ink/80">
                {doc.subtitle}
              </p>
            )}
            {doc.audience && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs italic text-muted">
                <Users className="h-3 w-3" /> {doc.audience}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3 w-3" />{" "}
                {readingLabel(doc.readingMinutes)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Hash className="h-3 w-3" />{" "}
                {formatNumber(doc.wordCount)} words
              </span>
              {doc.pdfBytes > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Download className="h-3 w-3" /> {formatBytes(doc.pdfBytes)}
                </span>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="glass-elevated rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">
                Quick actions
              </p>
              <div className="mt-3 space-y-2">
                {doc.pdfPath && (
                  <a
                    href={doc.pdfPath}
                    download
                    className="flex w-full items-center justify-between rounded-lg border border-line/70 bg-bg/40 px-3 py-2 text-sm text-ink transition-colors hover:border-gold"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Download className="h-3.5 w-3.5" /> Download PDF
                    </span>
                    <span className="text-xs text-muted">
                      {formatBytes(doc.pdfBytes)}
                    </span>
                  </a>
                )}
                <a
                  href={doc.markdownPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-between rounded-lg border border-line/70 bg-bg/40 px-3 py-2 text-sm text-ink transition-colors hover:border-gold"
                >
                  <span className="inline-flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5" /> Open Markdown
                  </span>
                  <span className="text-xs text-muted">.md</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex w-full items-center justify-between rounded-lg border border-line/70 bg-bg/40 px-3 py-2 text-sm text-ink transition-colors hover:border-gold"
                >
                  <span className="inline-flex items-center gap-2">
                    <Copy className="h-3.5 w-3.5" /> Copy share link
                  </span>
                  <span className="text-xs text-muted">
                    {copied ? "Copied!" : "URL"}
                  </span>
                </button>
              </div>
            </div>

            {doc.tags.length > 0 && (
              <div className="glass-elevated rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">
                  Tags
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-line/60 bg-bg/40 px-2.5 py-0.5 text-[11px] text-muted"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </motion.div>
      </section>

      {/* Reader */}
      <section className="container mt-12">
        <DocumentReader doc={doc} body={body ?? null} />
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="container mt-20">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">
            More from {doc.category.replace(/-/g, " ")}
          </p>
          <h2 className="display mt-2 text-2xl font-semibold tracking-tight text-ink">
            Continue reading.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((d, i) => (
              <DocumentTile
                key={d.slug}
                doc={d}
                variant="default"
                delayIndex={i}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
