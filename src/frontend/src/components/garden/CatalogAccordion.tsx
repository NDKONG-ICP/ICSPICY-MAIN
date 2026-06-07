import type { VarietyPublic } from "@/declarations/backend.did";
import {
  PLANT_CATEGORY_ORDER,
  STRUCTURE_CATEGORY_ORDER,
  plantCategoryLabel,
  structureCategoryLabel,
} from "@/lib/garden-catalog-groups";
import { metersToInches } from "@/lib/garden-geo";
import {
  type CatalogPlant,
  type CatalogStructure,
  PLANT_CATALOG,
  type PlantCategory,
  STRUCTURE_CATALOG,
  filterPlants,
  filterStructures,
} from "@/lib/garden-plant-catalog";
import type { PendingPlacement } from "@/lib/garden-types";
import { formatScoville, varietyColor, varietyIcon } from "@/lib/garden-utils";
import { cn } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-react";
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

type FilterChip = "all" | "peppers" | "trees" | "herbs" | "structures" | "decor";

const CHIPS: { id: FilterChip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "peppers", label: "Peppers" },
  { id: "trees", label: "Trees" },
  { id: "herbs", label: "Herbs" },
  { id: "structures", label: "Structures" },
  { id: "decor", label: "Decor" },
];

const TREE_CATS: PlantCategory[] = [
  "tropical_fruit",
  "citrus",
  "berry",
  "native_tree",
  "palm",
];
const HERB_CATS: PlantCategory[] = [
  "herb",
  "vegetable",
  "leafy_green",
  "root_crop",
  "vine",
  "native_shrub",
  "native_ground",
  "nitrogen_fixer",
  "pollinator",
  "cover_crop",
  "ornamental",
];

const CAT_COLOR: Partial<Record<PlantCategory, string>> = {
  pepper: "#ef4444",
  tropical_fruit: "#22c55e",
  citrus: "#eab308",
  berry: "#a855f7",
  herb: "#a3e635",
  palm: "#10b981",
  native_tree: "#22c55e",
  pollinator: "#f472b6",
};

type Section = {
  key: string;
  label: string;
  emoji: string;
  plants?: CatalogPlant[];
  structures?: CatalogStructure[];
  color?: string;
};

function pepperSubgroup(plants: CatalogPlant[], label: string, emoji: string, key: string, lo: number, hi: number): Section {
  return {
    key,
    label,
    emoji,
    color: "#ef4444",
    plants: plants
      .filter((p) => {
        const s = p.scovilleMax ?? 0;
        return s >= lo && s < hi;
      })
      .sort((a, b) => (b.scovilleMax ?? 0) - (a.scovilleMax ?? 0)),
  };
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
  const [chip, setChip] = useState<FilterChip>("all");
  const [openKey, setOpenKey] = useState<string | null>("superhot");

  const peppers = useMemo(
    () => PLANT_CATALOG.filter((p) => p.category === "pepper"),
    [],
  );

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    const showPeppers = chip === "all" || chip === "peppers";
    const showTrees = chip === "all" || chip === "trees";
    const showHerbs = chip === "all" || chip === "herbs";
    const showStructures = chip === "all" || chip === "structures" || chip === "decor";

    if (showPeppers) {
      out.push(
        pepperSubgroup(peppers, "Superhot Peppers", "🌶️", "superhot", 100_000, Number.POSITIVE_INFINITY),
        pepperSubgroup(peppers, "Hot Peppers", "🔥", "hot", 10_000, 100_000),
        pepperSubgroup(peppers, "Medium Peppers", "🌶", "medium", 1_000, 10_000),
        pepperSubgroup(peppers, "Mild & Sweet", "🫑", "mild", -1, 1_000),
      );
    }
    if (showTrees) {
      for (const { id, emoji } of PLANT_CATEGORY_ORDER) {
        if (!TREE_CATS.includes(id)) continue;
        const ps = filterPlants({ category: id });
        if (ps.length) out.push({ key: `cat-${id}`, label: plantCategoryLabel(id), emoji, plants: ps, color: CAT_COLOR[id] });
      }
    }
    if (showHerbs) {
      for (const { id, emoji } of PLANT_CATEGORY_ORDER) {
        if (!HERB_CATS.includes(id)) continue;
        const ps = filterPlants({ category: id });
        if (ps.length) out.push({ key: `cat-${id}`, label: plantCategoryLabel(id), emoji, plants: ps, color: CAT_COLOR[id] });
      }
    }
    if (showStructures) {
      for (const { id, emoji } of STRUCTURE_CATEGORY_ORDER) {
        if (chip === "decor" && id !== "decor") continue;
        const ss = STRUCTURE_CATALOG.filter((s) => s.category === id);
        if (ss.length) out.push({ key: `struct-${id}`, label: structureCategoryLabel(id), emoji, structures: ss, color: "#d4a843" });
      }
    }
    return out.filter((s) => (s.plants?.length ?? 0) + (s.structures?.length ?? 0) > 0);
  }, [chip, peppers]);

  const searchPlants = useMemo(
    () => (q.trim() ? filterPlants({ query: q }) : []),
    [q],
  );
  const searchStructures = useMemo(
    () => (q.trim() ? filterStructures({ query: q }) : []),
    [q],
  );

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

  const PlantCard = ({ p }: { p: CatalogPlant }) => {
    const inches = Math.round(metersToInches(p.spacing));
    const needsSpace = inches > 24;
    return (
      <button
        type="button"
        onClick={() => startPlant(p)}
        title={`${p.name} — ${p.latinName}`}
        className="group relative flex h-[78px] flex-col justify-between rounded-md border border-[color:var(--garden-border)] bg-[color:var(--garden-surface-raised)] p-2 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--garden-accent)]"
      >
        <span
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
          style={{ backgroundColor: CAT_COLOR[p.category] ?? p.color }}
        />
        <span className="text-lg leading-none">{p.iconEmoji}</span>
        <span className="garden-font-display line-clamp-2 text-[11px] font-bold leading-tight text-[color:var(--garden-text)]">
          {p.name}
        </span>
        <span
          className={cn(
            "garden-font-mono text-[9px]",
            needsSpace
              ? "text-[color:var(--garden-gold)]"
              : "text-[color:var(--garden-text-muted)]",
          )}
        >
          ↔ {inches}"
        </span>
      </button>
    );
  };

  const StructureCard = ({ s }: { s: CatalogStructure }) => (
    <button
      type="button"
      onClick={() => startStructure(s)}
      title={s.description}
      className="group relative flex h-[78px] flex-col justify-between rounded-md border border-[color:var(--garden-border)] bg-[color:var(--garden-surface-raised)] p-2 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--garden-gold)]"
    >
      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[color:var(--garden-gold)]" />
      <span className="text-lg leading-none">{s.iconEmoji}</span>
      <span className="garden-font-display line-clamp-2 text-[11px] font-bold leading-tight text-[color:var(--garden-text)]">
        {s.name}
      </span>
      <span className="garden-font-mono text-[9px] text-[color:var(--garden-text-muted)]">
        {s.defaultWidth}×{s.defaultDepth}m
      </span>
    </button>
  );

  const SearchBox = (
    <div className="relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-[color:var(--garden-text-muted)]" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${PLANT_CATALOG.length}+ plants…`}
        className="w-full rounded-md border border-[color:var(--garden-border)] bg-[color:var(--garden-surface)] py-2 pl-8 pr-2 text-sm text-[color:var(--garden-text)] outline-none focus:border-[color:var(--garden-accent)]"
      />
    </div>
  );

  // Compact (mobile horizontal strip) — keep simple.
  if (compact) {
    const items = q.trim()
      ? [...searchPlants, ...searchStructures]
      : PLANT_CATALOG.slice(0, 40);
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {items.map((it) =>
          "iconEmoji" in it && "spacing" in it ? (
            <div key={(it as CatalogPlant).id} className="w-24 shrink-0">
              <PlantCard p={it as CatalogPlant} />
            </div>
          ) : (
            <div key={(it as CatalogStructure).id} className="w-24 shrink-0">
              <StructureCard s={it as CatalogStructure} />
            </div>
          ),
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {SearchBox}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChip(c.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
              chip === c.id
                ? "border-[color:var(--garden-accent)] bg-[color:var(--garden-accent)]/15 text-[color:var(--garden-accent)]"
                : "border-[color:var(--garden-border)] text-[color:var(--garden-text-muted)] hover:text-[color:var(--garden-text)]",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* IC SPICY shop varieties */}
      {varieties.length > 0 && onIcPlant && !q.trim() && (
        <details className="rounded-lg border border-[color:var(--garden-border)] bg-[color:var(--garden-surface-raised)]">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-[color:var(--garden-text)]">
            🌶️ IC SPICY Shop ({varieties.length})
          </summary>
          <div className="max-h-40 space-y-1 overflow-auto px-2 pb-2">
            {varieties.slice(0, 30).map((v) => (
              <button
                key={v.id.toString()}
                type="button"
                onClick={() => onIcPlant(v)}
                className="w-full rounded-md border border-transparent p-2 text-left text-xs text-[color:var(--garden-text)] hover:border-[color:var(--garden-border)] hover:bg-white/5"
              >
                {v.name} · {formatScoville(v.scovilleMin, v.scovilleMax)}
              </button>
            ))}
          </div>
        </details>
      )}

      {/* Search results */}
      {q.trim() ? (
        <div className="grid grid-cols-2 gap-2">
          {searchPlants.map((p) => (
            <PlantCard key={p.id} p={p} />
          ))}
          {searchStructures.map((s) => (
            <StructureCard key={s.id} s={s} />
          ))}
          {searchPlants.length === 0 && searchStructures.length === 0 && (
            <p className="col-span-2 p-2 text-xs text-[color:var(--garden-text-muted)]">
              No matches for "{q}"
            </p>
          )}
        </div>
      ) : (
        sections.map((sec) => {
          const open = openKey === sec.key;
          const count =
            (sec.plants?.length ?? 0) + (sec.structures?.length ?? 0);
          return (
            <div
              key={sec.key}
              className="overflow-hidden rounded-lg border border-[color:var(--garden-border)]"
            >
              <button
                type="button"
                onClick={() => setOpenKey((k) => (k === sec.key ? null : sec.key))}
                className="flex w-full items-center justify-between bg-[color:var(--garden-surface-raised)] px-3 py-2 text-sm text-[color:var(--garden-text)] hover:bg-white/5"
              >
                <span className="garden-font-display font-semibold uppercase tracking-wide text-xs">
                  {sec.emoji} {sec.label} ({count})
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform text-[color:var(--garden-text-muted)]",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open && (
                <div className="grid max-h-72 grid-cols-2 gap-2 overflow-auto p-2">
                  {sec.plants?.map((p) => (
                    <PlantCard key={p.id} p={p} />
                  ))}
                  {sec.structures?.map((s) => (
                    <StructureCard key={s.id} s={s} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
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
