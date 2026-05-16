import {
  type DocumentStats as BundledStats,
  DOCUMENTS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATS,
  type DocumentCategory,
  type DocumentSummary,
  MANIFEST_VERSION,
} from "@/generated/documentCatalog";
import { MARKDOWN_BODIES } from "@/generated/documentMarkdown";
import {
  type CategoryWithCount,
  type DocumentRecord,
  type DocumentStats,
  fromCategoryWithCount,
  fromDocumentRecord,
  fromDocumentStats,
  getDocsBackendActor,
} from "./backend";

// The bundled catalog is always available — it's part of the Vite bundle.
// We treat the live canister as "preferred for freshness", but fall back to
// the bundle so the UI is fully usable when the backend isn't reachable yet.

const BUNDLED_DOCS: DocumentRecord[] = DOCUMENTS.map(toDocumentRecord);

const BUNDLED_CATEGORIES: CategoryWithCount[] = DOCUMENT_CATEGORIES.map(
  (c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    count: BUNDLED_DOCS.filter((d) => d.category === c.id).length,
  }),
);

const BUNDLED_STATS: DocumentStats = bundledStats(DOCUMENT_STATS);

function bundledStats(stats: BundledStats): DocumentStats {
  return {
    totalDocuments: stats.totalDocuments,
    totalCategories: stats.totalCategories,
    totalWords: stats.totalWords,
    totalPdfBytes: stats.totalPdfBytes,
    manifestVersion: MANIFEST_VERSION,
  };
}

function toDocumentRecord(d: DocumentSummary): DocumentRecord {
  return {
    slug: d.slug,
    title: d.title,
    subtitle: d.subtitle,
    audience: d.audience,
    summary: d.summary,
    collection: d.collection,
    category: d.category,
    pdfPath: d.pdfPath,
    markdownPath: d.markdownPath,
    tags: d.tags,
    featured: d.featured,
    sortOrder: d.sortOrder,
    wordCount: d.wordCount,
    readingMinutes: d.readingMinutes,
    pdfBytes: d.pdfBytes,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface CatalogSnapshot {
  documents: DocumentRecord[];
  categories: CategoryWithCount[];
  stats: DocumentStats;
  source: "canister" | "bundled";
}

export const BUNDLED_SNAPSHOT: CatalogSnapshot = {
  documents: BUNDLED_DOCS,
  categories: BUNDLED_CATEGORIES,
  stats: BUNDLED_STATS,
  source: "bundled",
};

export async function fetchCatalog(): Promise<CatalogSnapshot> {
  const actor = getDocsBackendActor();
  if (!actor) return BUNDLED_SNAPSHOT;

  try {
    const [docs, cats, stats] = await Promise.all([
      actor.listDocuments(),
      actor.listCategories(),
      actor.getDocumentStats(),
    ]);
    const documents = docs.map(fromDocumentRecord);
    const categories = cats.map(fromCategoryWithCount);
    return {
      documents: documents.length ? documents : BUNDLED_DOCS,
      categories: categories.length ? categories : BUNDLED_CATEGORIES,
      stats: fromDocumentStats(stats),
      source: documents.length ? "canister" : "bundled",
    };
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn(
        "[docs] Falling back to bundled catalog — canister unreachable.",
        err,
      );
    }
    return BUNDLED_SNAPSHOT;
  }
}

// ── Document content fetching ─────────────────────────────────────────────────

// Fetch the markdown body for a document.
// Priority: 1) canister (fresh), 2) bundled MARKDOWN_BODIES, 3) empty string.
export async function fetchDocumentMarkdown(slug: string): Promise<string> {
  const actor = getDocsBackendActor();
  if (actor) {
    try {
      const text = await actor.getDocumentMarkdown(slug);
      if (text.length > 0) return text;
    } catch {
      // Fall through to bundled
    }
  }

  // Look up bundled markdown by markdownPath key.
  const doc = BUNDLED_DOCS.find((d) => d.slug === slug);
  if (doc?.markdownPath && MARKDOWN_BODIES[doc.markdownPath]) {
    return MARKDOWN_BODIES[doc.markdownPath];
  }
  return "";
}

// Fetch PDF bytes from the canister and return a blob URL for display.
// Returns null if no PDF is available.
export async function fetchDocumentPdfUrl(
  slug: string,
): Promise<string | null> {
  const actor = getDocsBackendActor();
  if (!actor) return null;
  try {
    const bytes = await actor.getDocumentPdf(slug);
    if (!bytes || bytes.length === 0) return null;
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// Synchronous lookup is used by the detail page so first paint is instant.
export function lookupBundledDocument(slug: string): DocumentRecord | null {
  return BUNDLED_DOCS.find((d) => d.slug === slug) ?? null;
}

export function bundledCategoryById(id: string): DocumentCategory | undefined {
  return DOCUMENT_CATEGORIES.find((c) => c.id === id);
}
