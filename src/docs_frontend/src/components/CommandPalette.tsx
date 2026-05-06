import { Command } from "cmdk";
import { ArrowRight, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DocumentRecord } from "@/lib/backend";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: DocumentRecord[];
}

export function CommandPalette({
  open,
  onOpenChange,
  documents,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmd = e.metaKey || e.ctrlKey;
      if (isCmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const grouped = useMemo(() => {
    const groups: Record<string, DocumentRecord[]> = {};
    for (const doc of documents) {
      const key = doc.category;
      groups[key] = groups[key] ?? [];
      groups[key].push(doc);
    }
    return groups;
  }, [documents]);

  const handleSelect = (slug: string) => {
    onOpenChange(false);
    navigate(`/library/${slug}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 -z-10 bg-bg/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-line/80 bg-elevated shadow-glass"
          >
            <Command label="Document search" className="flex flex-col">
              <div className="flex items-center gap-2 border-b border-line/60 px-4 py-3">
                <Search className="h-4 w-4 text-muted" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search the IC SPICY library…"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
                <kbd className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                  ESC
                </kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto py-2 scrollbar-thin">
                <Command.Empty className="px-4 py-8 text-center text-sm text-muted">
                  No documents match that search.
                </Command.Empty>
                {Object.entries(grouped).map(([categoryId, docs]) => (
                  <Command.Group
                    key={categoryId}
                    heading={categoryId.replace(/-/g, " ")}
                    className="px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-muted"
                  >
                    {docs.map((doc) => (
                      <Command.Item
                        key={doc.slug}
                        value={`${doc.title} ${doc.subtitle} ${doc.summary} ${doc.tags.join(" ")}`}
                        onSelect={() => handleSelect(doc.slug)}
                        className={cn(
                          "group mx-1 flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm",
                          "data-[selected=true]:bg-bg/60 data-[selected=true]:text-ink",
                          "text-ink/80",
                        )}
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-ink">
                            {doc.title}
                          </span>
                          {doc.subtitle && (
                            <span className="truncate text-xs text-muted">
                              {doc.subtitle}
                            </span>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted transition-transform group-data-[selected=true]:translate-x-0.5 group-data-[selected=true]:text-gold" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
