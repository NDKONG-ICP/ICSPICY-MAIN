import type { VarietyPublic } from "@/declarations/backend.did";
import type { PendingPlacement } from "@/lib/garden-types";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { CatalogAccordion } from "./CatalogAccordion";

type Props = {
  readOnly?: boolean;
  varieties: VarietyPublic[];
  onPending: (p: PendingPlacement | null) => void;
  onIcPlant: (v: VarietyPublic) => void;
  /** Optional controlled expanded state (e.g. opened from the 3D build hotbar). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const PEEK_PX = 88;

/**
 * Swipeable bottom sheet (mobile catalog). Peeks at 88px showing the search bar
 * + filter chips; drag the handle (or tap it) to expand to 60vh for the full
 * accordion. Auto-collapses to peek when a plant is selected for placement so
 * the canvas stays visible.
 */
export function MobileActionsSheet({
  readOnly,
  varieties,
  onPending,
  onIcPlant,
  open,
  onOpenChange,
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = open ?? internalExpanded;
  const setExpanded = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(expanded) : v;
    if (onOpenChange) onOpenChange(next);
    else setInternalExpanded(next);
  };
  const [dragY, setDragY] = useState<number | null>(null);
  const startY = useRef(0);
  const sheetH = useRef(0);

  useEffect(() => {
    sheetH.current = window.innerHeight * 0.6;
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0]!.clientY;
    setDragY(0);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragY === null) return;
    setDragY(e.touches[0]!.clientY - startY.current);
  };
  const onTouchEnd = () => {
    if (dragY === null) return;
    if (dragY < -40) setExpanded(true);
    else if (dragY > 40) setExpanded(false);
    setDragY(null);
  };

  const baseTranslate = expanded ? 0 : `calc(60vh - ${PEEK_PX}px)`;
  const transform =
    dragY !== null
      ? `translateY(calc(${expanded ? 0 : `60vh - ${PEEK_PX}px`} + ${dragY}px))`
      : `translateY(${typeof baseTranslate === "number" ? `${baseTranslate}px` : baseTranslate})`;

  return (
    <div
      className="garden-designer fixed inset-x-0 bottom-0 z-[60] h-[60vh] rounded-t-2xl border-t border-[color:var(--garden-border)] bg-[color:var(--garden-surface)] shadow-2xl sm:hidden"
      style={{
        transform,
        transition: dragY === null ? "transform 320ms cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}
    >
      <button
        type="button"
        aria-label={expanded ? "Collapse catalog" : "Expand catalog"}
        onClick={() => setExpanded((v) => !v)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex w-full justify-center py-2"
      >
        <span className="h-1 w-10 rounded-full bg-[#3a3a45]" />
      </button>
      <div
        className={cn(
          "h-[calc(60vh-32px)] overflow-y-auto px-3 pb-6",
          !expanded && "overflow-hidden",
        )}
      >
        <CatalogAccordion
          readOnly={readOnly}
          varieties={varieties}
          onIcPlant={onIcPlant}
          onPending={(p) => {
            onPending(p);
            if (p) setExpanded(false);
          }}
        />
      </div>
    </div>
  );
}
