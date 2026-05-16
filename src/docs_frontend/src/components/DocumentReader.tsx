import type { DocumentRecord } from "@/lib/backend";
import { cn, formatBytes } from "@/lib/utils";
import { Download, FileText, Maximize2, ScrollText } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { MarkdownView } from "./MarkdownView";

interface DocumentReaderProps {
  doc: DocumentRecord;
  body: string | null;
}

type View = "read" | "pdf";

export function DocumentReader({ doc, body }: DocumentReaderProps) {
  const [view, setView] = useState<View>(body ? "read" : "pdf");

  return (
    <div className="overflow-hidden rounded-xl border border-line/80 glass-elevated">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-bg/60 p-1">
          <ToolbarTab
            active={view === "read"}
            onClick={() => setView("read")}
            disabled={!body}
            icon={<ScrollText className="h-3.5 w-3.5" />}
            label="Read"
          />
          <ToolbarTab
            active={view === "pdf"}
            onClick={() => setView("pdf")}
            disabled={!doc.pdfPath}
            icon={<FileText className="h-3.5 w-3.5" />}
            label="PDF"
          />
        </div>
        <div className="flex items-center gap-2">
          {doc.pdfPath && (
            <a
              href={doc.pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-elevated/60 px-3 py-1 text-xs text-muted transition-colors hover:border-gold hover:text-ink"
            >
              <Maximize2 className="h-3 w-3" />
              Open in tab
            </a>
          )}
          {doc.pdfPath && (
            <a
              href={doc.pdfPath}
              download
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs text-bg transition-opacity hover:opacity-90"
            >
              <Download className="h-3 w-3" />
              Download {formatBytes(doc.pdfBytes)}
            </a>
          )}
        </div>
      </div>

      <div className="relative min-h-[60vh]">
        <AnimatePresence mode="wait">
          {view === "read" ? (
            <motion.div
              key="read"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="px-6 py-10 sm:px-12"
            >
              {body ? (
                <MarkdownView body={body} />
              ) : (
                <p className="text-sm text-muted">
                  Markdown body unavailable for this document.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="pdf"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-[80vh] w-full bg-bg/60"
            >
              {doc.pdfPath ? (
                <object
                  data={`${doc.pdfPath}#view=FitH&toolbar=1`}
                  type="application/pdf"
                  className="h-full w-full"
                >
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
                    Your browser does not support inline PDF viewing.{" "}
                    <a href={doc.pdfPath} className="ml-1 text-ember underline">
                      Open the PDF directly.
                    </a>
                  </div>
                </object>
              ) : (
                <p className="px-6 py-12 text-sm text-muted">
                  No PDF version is available for this document.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface ToolbarTabProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
}

function ToolbarTab({
  active,
  onClick,
  disabled,
  icon,
  label,
}: ToolbarTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-elevated text-ink shadow-soft"
          : "text-muted hover:text-ink",
        disabled && "opacity-40 hover:text-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
