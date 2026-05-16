import { logout } from "@/lib/auth";
import {
  type DocumentRecord,
  fromDocumentRecord,
  getAuthenticatedActor,
  toDocumentRecordCandid,
} from "@/lib/backend";
import type { DocsBackendActor } from "@/lib/idl";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; msg: string }
  | { type: "error"; msg: string };

function emptyDoc(): DocumentRecord {
  return {
    slug: "",
    title: "",
    subtitle: "",
    audience: "",
    summary: "",
    collection: "brand-pack",
    category: "vision",
    pdfPath: "",
    markdownPath: "",
    tags: [],
    featured: false,
    sortOrder: 100,
    wordCount: 0,
    readingMinutes: 1,
    pdfBytes: 0,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminDocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [drawerDoc, setDrawerDoc] = useState<DocumentRecord | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [markdownText, setMarkdownText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const actorRef = useRef<DocsBackendActor | null>(null);

  const getActor = useCallback(async () => {
    if (!actorRef.current) {
      actorRef.current = await getAuthenticatedActor();
    }
    return actorRef.current;
  }, []);

  const loadDocuments = useCallback(async () => {
    setStatus({ type: "loading" });
    try {
      const actor = await getActor();
      if (!actor) {
        navigate("/admin/login");
        return;
      }
      const docs = await actor.listDocuments();
      setDocuments(docs.map(fromDocumentRecord));
      setStatus({ type: "idle" });
    } catch (e) {
      setStatus({ type: "error", msg: String(e) });
    }
  }, [getActor, navigate]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const openCreate = () => {
    setDrawerDoc(emptyDoc());
    setMarkdownText("");
    setPdfFile(null);
    setDrawerMode("create");
  };

  const openEdit = (doc: DocumentRecord) => {
    setDrawerDoc({ ...doc });
    setMarkdownText("");
    setPdfFile(null);
    setDrawerMode("edit");
  };

  const closeDrawer = () => {
    setDrawerDoc(null);
    setPdfProgress(null);
  };

  const handleSave = async () => {
    if (!drawerDoc) return;
    const actor = await getActor();
    if (!actor) {
      navigate("/admin/login");
      return;
    }

    setStatus({ type: "loading" });
    try {
      // 1. Upsert metadata.
      await actor.upsertDocument(toDocumentRecordCandid(drawerDoc));

      // 2. Upload markdown if provided.
      if (markdownText.trim().length > 0) {
        await actor.uploadDocumentMarkdown(drawerDoc.slug, markdownText.trim());
      }

      // 3. Upload PDF if provided.
      if (pdfFile) {
        const bytes = [...new Uint8Array(await pdfFile.arrayBuffer())];
        setPdfProgress(50);
        await actor.uploadDocumentPdf(drawerDoc.slug, bytes);
        setPdfProgress(100);
      }

      closeDrawer();
      setStatus({ type: "success", msg: "Document saved." });
      setTimeout(() => setStatus({ type: "idle" }), 2500);
      loadDocuments();
    } catch (e) {
      setStatus({ type: "error", msg: String(e) });
      setPdfProgress(null);
    }
  };

  const handleDelete = async (slug: string) => {
    const actor = await getActor();
    if (!actor) return;
    setStatus({ type: "loading" });
    try {
      await actor.deleteDocument(slug);
      setDeleteConfirm(null);
      setStatus({ type: "success", msg: "Document deleted." });
      setTimeout(() => setStatus({ type: "idle" }), 2500);
      loadDocuments();
    } catch (e) {
      setStatus({ type: "error", msg: String(e) });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-bold text-ink">
            Document <span className="ember-text">Library</span>
          </h1>
          <p className="text-sm text-muted">
            {documents.length} documents in the canister
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/chatbot")}
            className="rounded-full border border-line/60 px-4 py-1.5 text-sm text-muted hover:text-ink transition-colors"
          >
            Chatbot Config
          </button>
          <button
            type="button"
            onClick={openCreate}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium",
              "bg-gradient-to-r from-ember to-gold text-bg shadow-ember hover:opacity-90",
            )}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            New Document
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-line/60 p-1.5 text-muted hover:text-ink transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status banner */}
      <AnimatePresence>
        {status.type !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm",
              status.type === "loading" && "bg-elevated/60 text-muted",
              status.type === "success" &&
                "bg-green-500/10 text-green-400 border border-green-500/20",
              status.type === "error" &&
                "bg-red-500/10 text-red-400 border border-red-500/20",
            )}
          >
            {status.type === "loading" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {status.type === "success" && <CheckCircle2 className="h-4 w-4" />}
            {status.type === "error" && <AlertCircle className="h-4 w-4" />}
            {status.type === "loading" ? "Working…" : status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document table */}
      <div className="rounded-2xl border border-line/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line/60 bg-elevated/30">
              <th className="px-4 py-3 text-left font-medium text-muted">
                Title
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted md:table-cell">
                Category
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted lg:table-cell">
                Words
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, i) => (
              <tr
                key={doc.slug}
                className={cn(
                  "border-b border-line/30 transition-colors hover:bg-elevated/20",
                  i === documents.length - 1 && "border-b-0",
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted" />
                    <div>
                      <p className="font-medium text-ink">{doc.title}</p>
                      <p className="text-xs text-muted">{doc.slug}</p>
                    </div>
                    {doc.featured && (
                      <span className="rounded-full bg-ember/15 px-2 py-0.5 text-[10px] font-medium text-ember">
                        Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">
                  {doc.category}
                </td>
                <td className="hidden px-4 py-3 text-muted lg:table-cell">
                  {doc.wordCount.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(doc)}
                      className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(doc.slug)}
                      className="rounded-lg p-1.5 text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && status.type !== "loading" && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted">
                  No documents yet. Run the seed script or add documents
                  manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border border-line/60 bg-elevated p-6 shadow-xl w-80"
            >
              <h3 className="font-semibold text-ink">Delete document?</h3>
              <p className="mt-1 text-sm text-muted">
                This will permanently remove{" "}
                <span className="text-ink">{deleteConfirm}</span> and its BM25
                index from the canister.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-xl border border-line/60 py-2 text-sm text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create / Edit drawer */}
      <AnimatePresence>
        {drawerDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-bg/60 backdrop-blur-sm"
            onClick={closeDrawer}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="h-full w-full max-w-lg overflow-y-auto border-l border-line/60 bg-bg shadow-2xl p-6"
            >
              {/* Drawer header */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-semibold text-ink">
                  {drawerMode === "create" ? "New Document" : "Edit Document"}
                </h2>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="text-muted hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Slug (read-only in edit mode) */}
                <Field label="Slug">
                  <input
                    type="text"
                    value={drawerDoc.slug}
                    onChange={(e) =>
                      setDrawerDoc({ ...drawerDoc, slug: e.target.value })
                    }
                    disabled={drawerMode === "edit"}
                    placeholder="e.g. branded-whitepaper"
                    className="input-field"
                  />
                </Field>

                <Field label="Title">
                  <input
                    type="text"
                    value={drawerDoc.title}
                    onChange={(e) =>
                      setDrawerDoc({ ...drawerDoc, title: e.target.value })
                    }
                    placeholder="Document title"
                    className="input-field"
                  />
                </Field>

                <Field label="Subtitle">
                  <input
                    type="text"
                    value={drawerDoc.subtitle}
                    onChange={(e) =>
                      setDrawerDoc({ ...drawerDoc, subtitle: e.target.value })
                    }
                    placeholder="One-line subtitle"
                    className="input-field"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <input
                      type="text"
                      value={drawerDoc.category}
                      onChange={(e) =>
                        setDrawerDoc({ ...drawerDoc, category: e.target.value })
                      }
                      className="input-field"
                    />
                  </Field>
                  <Field label="Sort Order">
                    <input
                      type="number"
                      value={drawerDoc.sortOrder}
                      onChange={(e) =>
                        setDrawerDoc({
                          ...drawerDoc,
                          sortOrder: Number(e.target.value),
                        })
                      }
                      className="input-field"
                    />
                  </Field>
                </div>

                <Field label="Tags (comma-separated)">
                  <input
                    type="text"
                    value={drawerDoc.tags.join(", ")}
                    onChange={(e) =>
                      setDrawerDoc({
                        ...drawerDoc,
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="peppers, icp, brand"
                    className="input-field"
                  />
                </Field>

                <Field label="Summary">
                  <textarea
                    value={drawerDoc.summary}
                    onChange={(e) =>
                      setDrawerDoc({ ...drawerDoc, summary: e.target.value })
                    }
                    rows={3}
                    placeholder="Short summary shown in the library card"
                    className="input-field resize-none"
                  />
                </Field>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={drawerDoc.featured}
                    onChange={(e) =>
                      setDrawerDoc({ ...drawerDoc, featured: e.target.checked })
                    }
                    className="h-4 w-4 accent-ember"
                  />
                  <label htmlFor="featured" className="text-sm text-ink">
                    Featured document
                  </label>
                </div>

                {/* Markdown upload */}
                <Field label="Markdown content (optional — rebuilds BM25 index)">
                  <textarea
                    value={markdownText}
                    onChange={(e) => setMarkdownText(e.target.value)}
                    rows={6}
                    placeholder="Paste markdown text here to update the document body and rebuild the SpicyAi search index…"
                    className="input-field resize-none font-mono text-xs"
                  />
                </Field>

                {/* PDF upload */}
                <Field label="PDF file (optional, ≤2 MB)">
                  <div className="flex items-center gap-3">
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line/60 px-4 py-2.5 text-sm",
                        "hover:border-ember/50 hover:text-ember transition-colors",
                        pdfFile && "border-ember/60 text-ember",
                      )}
                    >
                      <Upload className="h-4 w-4" />
                      {pdfFile ? pdfFile.name : "Choose PDF…"}
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) =>
                          setPdfFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    {pdfFile && (
                      <button
                        type="button"
                        onClick={() => setPdfFile(null)}
                        className="text-muted hover:text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {pdfProgress !== null && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/40">
                      <div
                        className="h-full bg-gradient-to-r from-ember to-gold rounded-full transition-all"
                        style={{ width: `${pdfProgress}%` }}
                      />
                    </div>
                  )}
                </Field>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="flex-1 rounded-xl border border-line/60 py-2.5 text-sm text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    !drawerDoc.slug ||
                    !drawerDoc.title ||
                    status.type === "loading"
                  }
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium",
                    "bg-gradient-to-r from-ember to-gold text-bg shadow-ember",
                    "hover:opacity-90 disabled:opacity-50 transition-opacity",
                  )}
                >
                  {status.type === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" strokeWidth={2.5} />
                  )}
                  Save Document
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
