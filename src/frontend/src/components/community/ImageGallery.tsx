import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";
import { CommunityStoredPhoto } from "./CommunityStoredPhoto";

export function ImageGallery({
  paths,
  altPrefix = "Community image",
  className,
}: {
  paths: string[];
  altPrefix?: string;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: i * w, behavior: "smooth" });
    setIndex(i);
  }, []);

  if (!paths.length) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/20 overflow-hidden",
        className,
      )}
      data-ocid="community-image-gallery"
    >
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x"
        style={{ WebkitOverflowScrolling: "touch" }}
        onScroll={(e) => {
          const t = e.currentTarget;
          const w = t.clientWidth || 1;
          const i = Math.round(t.scrollLeft / w);
          if (i !== index && i >= 0 && i < paths.length) setIndex(i);
        }}
      >
        {paths.map((p, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: ordered carousel snapshots; duplicates are exceedingly rare at construction time.
            key={`${p}:${i}`}
            className="w-full shrink-0 snap-start flex items-center justify-center bg-black/40"
          >
            <CommunityStoredPhoto
              path={p}
              alt={`${altPrefix} ${i + 1}`}
              className="w-full max-h-80 object-contain"
              fallback={
                <div className="w-full aspect-video bg-muted animate-pulse" />
              }
            />
          </div>
        ))}
      </div>
      {paths.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2 bg-card/95 border-t border-border/60">
          {paths.map((_, i) => (
            <button
              key={`dot:${i}:${paths.length}`}
              type="button"
              aria-label={`Image ${i + 1}`}
              className={cn(
                "w-2 h-2 rounded-full transition-smooth",
                i === index
                  ? "bg-primary scale-110"
                  : "bg-muted-foreground/35 hover:bg-muted-foreground/60",
              )}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
