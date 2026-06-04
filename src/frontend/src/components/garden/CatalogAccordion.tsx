import type { VarietyPublic } from "@/declarations/backend.did";
import {
  PLANT_CATEGORY_ORDER,
  STRUCTURE_CATEGORY_ORDER,
  plantCategoryLabel,
  structureCategoryLabel,
} from "@/lib/garden-catalog-groups";
import {
  type CatalogPlant,
  type CatalogStructure,
  PLANT_CATALOG,
  type PlantCategory,
  STRUCTURE_CATALOG,
  type StructureCategory,
  filterPlants,
  filterStructures,
} from "@/lib/garden-plant-catalog";
import type { PendingPlacement } from "@/lib/garden-types";
import { formatScoville, varietyColor, varietyIcon } from "@/lib/garden-utils";
import { cn } from "@/lib/utils";
import { ChevronDown, Cloud, CloudSun, Search, Sun } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  readOnly?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onPending: (p: PendingPlacement | null) => void;
  compact?: boolean;
  varieties?: VarietyPublic[];
  onIcPlant?: (v: VarietyPublic) => void;
};

function SunIcon({ req }: { req: CatalogPlant["sunRequirement"] }) {
  if (req === "full") return <Sun className="h-3 w-3 text-amber-400" />;
  if (req === "partial") return <CloudSun className="h-3 w-3 text-sky-300" />;
  return <Cloud className="h-3 w-3 text-slate-400" />;
}

export function CatalogAccordion({
  readOnly,
  searchQuery: externalQ,
  onSearchChange,
  onPending,
  compact,
  varieties = [],
  onIcPlant,
}: Props) {
  const [internalQ, setInternalQ] = useState("");
  const q = externalQ ?? internalQ;
  const setQ = onSearchChange ?? setInternalQ;
  const [openKey, setOpenKey] = useState<string | null>("pepper");

  const searchPlants = useMemo(
    () => (q.trim() ? filterPlants({ query: q }) : []),
    [q],
  );
  const searchStructures = useMemo(
    () => (q.trim() ? filterStructures({ query: q }) : []),
    [q],
  );

  const plantCounts = useMemo(() => {
    const m = new Map<PlantCategory, number>();
    for (const p of PLANT_CATALOG)
      m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, []);

  const structureCounts = useMemo(() => {
    const m = new Map<StructureCategory, number>();
    for (const s of STRUCTURE_CATALOG)
      m.set(s.category, (m.get(s.category) ?? 0) + 1);
    return m;
  }, []);

  const startPlant = (p: CatalogPlant) => {
    if (readOnly) return;
    onPending({
      kind: "plant",
      catalogId: p.id,
      varietyId: null,
      label: p.name,
      color: p.color,
      icon: p.iconEmoji,
      scoville: p.scovilleMax,
    });
  };

  const startStructure = (s: CatalogStructure) => {
    if (readOnly) return;
    onPending({
      kind: "structure",
      structureType: s.id,
      structureId: s.id,
      label: s.name,
      width: s.defaultWidth,
      depth: s.defaultDepth,
      color: s.color,
    });
  };

  const toggle = (key: string) =>
    setOpenKey((prev) => (prev === key ? null : key));

  const renderPlantRow = (p: CatalogPlant) => (
    <button
      key={p.id}
      type="button"
      onClick={() => startPlant(p)}
      className={cn(
        "w-full rounded-md border border-white/10 bg-white/5 text-left transition-colors hover:border-primary/40 hover:bg-white/10",
        compact ? "p-2 flex items-center gap-2 shrink-0 w-28" : "p-2.5 mb-1",
      )}
    >
      {compact ? (
        <>
          <span className="text-xl">{p.iconEmoji}</span>
          <span className="text-[10px] font-medium line-clamp-2">{p.name}</span>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-lg">{p.iconEmoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{p.name}</span>
              <SunIcon req={p.sunRequirement} />
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {p.latinName}
            </p>
          </div>
        </div>
      )}
    </button>
  );

  const renderStructureRow = (s: CatalogStructure) => (
    <button
      key={s.id}
      type="button"
      onClick={() => startStructure(s)}
      className={cn(
        "w-full rounded-md border border-white/10 bg-white/5 text-left hover:border-primary/40",
        compact ? "p-2 flex flex-col items-center shrink-0 w-28" : "p-2.5 mb-1",
      )}
    >
      <span className="text-lg">{s.iconEmoji}</span>
      <span
        className={cn(
          "font-medium",
          compact ? "text-[10px] text-center line-clamp-2" : "text-sm",
        )}
      >
        {s.name}
      </span>
    </button>
  );

  if (q.trim()) {
    const items = (
      <div
        className={cn(
          compact ? "flex gap-2 overflow-x-auto pb-2" : "space-y-1",
        )}
      >
        {searchPlants.map(renderPlantRow)}
        {searchStructures.map(renderStructureRow)}
        {searchPlants.length === 0 && searchStructures.length === 0 && (
          <p className="text-xs text-muted-foreground p-2">
            No matches for "{q}"
          </p>
        )}
      </div>
    );
    return (
      <div className="space-y-2">
        {!compact && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search plants & structures…"
              className="w-full rounded-md border border-white/10 bg-white/5 pl-8 py-2 text-sm"
            />
          </div>
        )}
        {items}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {!compact && (
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${PLANT_CATALOG.length}+ plants…`}
            className="w-full rounded-md border border-white/10 bg-white/5 pl-8 py-2 text-sm"
          />
        </div>
      )}

      {varieties.length > 0 && onIcPlant && (
        <details className="rounded-lg border border-white/10 bg-white/5 mb-2">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            🌶️ IC SPICY Shop ({varieties.length})
          </summary>
          <div className="px-2 pb-2 space-y-1 max-h-40 overflow-auto">
            {varieties.slice(0, 30).map((v) => (
              <button
                key={v.id.toString()}
                type="button"
                onClick={() => onIcPlant(v)}
                className="w-full rounded-md p-2 text-left text-xs hover:bg-white/10 border border-transparent hover:border-white/10"
              >
                {v.name} · {formatScoville(v.scovilleMin, v.scovilleMax)}
              </button>
            ))}
          </div>
        </details>
      )}

      {PLANT_CATEGORY_ORDER.map(({ id, emoji }) => {
        const count = plantCounts.get(id) ?? 0;
        if (count === 0) return null;
        const key = `plant-${id}`;
        const open = openKey === key;
        const plants = filterPlants({ category: id });
        return (
          <div
            key={key}
            className="rounded-lg border border-white/10 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm bg-white/5 hover:bg-white/10"
            >
              <span>
                {emoji} {plantCategoryLabel(id)} ({count})
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
            {open && (
              <div
                className={cn(
                  "px-2 pb-2 max-h-64 overflow-auto",
                  compact && "flex gap-2 overflow-x-auto max-h-none",
                )}
              >
                {plants.map(renderPlantRow)}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-1 pt-2">
        Structures
      </p>

      {STRUCTURE_CATEGORY_ORDER.map(({ id, emoji }) => {
        const count = structureCounts.get(id) ?? 0;
        if (count === 0) return null;
        const key = `struct-${id}`;
        const open = openKey === key;
        const structs = STRUCTURE_CATALOG.filter((s) => s.category === id);
        return (
          <div
            key={key}
            className="rounded-lg border border-white/10 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm bg-white/5 hover:bg-white/10"
            >
              <span>
                {emoji} {structureCategoryLabel(id)} ({count})
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
            {open && (
              <div
                className={cn(
                  "px-2 pb-2 max-h-48 overflow-auto",
                  compact && "flex gap-2 overflow-x-auto",
                )}
              >
                {structs.map(renderStructureRow)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function startIcPlantPending(v: VarietyPublic): PendingPlacement {
  return {
    kind: "plant",
    varietyId: Number(v.id),
    label: v.name,
    color: varietyColor(Number(v.scovilleMax)),
    icon: varietyIcon(Number(v.scovilleMax)),
    scoville: Number(v.scovilleMax),
  };
}
