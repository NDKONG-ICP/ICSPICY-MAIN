import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GardenDesign, LayerVisibility, PendingPlacement } from "@/lib/garden-types";
import {
  CATEGORY_LABELS,
  filterPlants,
  filterStructures,
  PLANT_CATALOG,
  STRUCTURE_CATALOG,
  STRUCTURE_CATEGORY_LABELS,
  type CatalogPlant,
  type PlantCategory,
  type StructureCategory,
} from "@/lib/garden-plant-catalog";
import { formatScoville, varietyColor, varietyIcon } from "@/lib/garden-utils";
import type { VarietyPublic } from "@/declarations/backend.did";
import { Plus, Search, Sun, CloudSun, Cloud } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  varieties: VarietyPublic[];
  myDesigns: GardenDesign[];
  readOnly?: boolean;
  mobileSheet?: boolean;
  onCloseSheet?: () => void;
  onPending: (p: PendingPlacement | null) => void;
  onLoadDesign: (d: GardenDesign) => void;
  onNewDesign: () => void;
  layers?: LayerVisibility;
  onLayersChange?: (l: LayerVisibility) => void;
};

const QUICK_FILTERS: { id: PlantCategory | "structures" | "all"; label: string; emoji: string }[] = [
  { id: "pepper", label: "Peppers", emoji: "🌶️" },
  { id: "tropical_fruit", label: "Fruit", emoji: "🌳" },
  { id: "citrus", label: "Citrus", emoji: "🍋" },
  { id: "herb", label: "Herbs", emoji: "🌿" },
  { id: "vegetable", label: "Veg", emoji: "🥬" },
  { id: "native_tree", label: "Native", emoji: "🌻" },
  { id: "pollinator", label: "Pollinators", emoji: "🦋" },
  { id: "structures", label: "Build", emoji: "🏗️" },
];

function SunIcon({ req }: { req: CatalogPlant["sunRequirement"] }) {
  if (req === "full") return <Sun className="h-3 w-3 text-amber-400" />;
  if (req === "partial") return <CloudSun className="h-3 w-3 text-sky-300" />;
  return <Cloud className="h-3 w-3 text-slate-400" />;
}

function WaterDots({ need }: { need: CatalogPlant["waterNeed"] }) {
  const n = need === "high" ? 3 : need === "medium" ? 2 : 1;
  return <span className="text-blue-400 text-[10px]">{"💧".repeat(n)}</span>;
}

export function CatalogSidebar({
  varieties,
  myDesigns,
  readOnly,
  mobileSheet,
  onCloseSheet,
  onPending,
  onLoadDesign,
  onNewDesign,
  layers,
  onLayersChange,
}: Props) {
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<PlantCategory | "structures" | "all">("all");
  const [sunFilter, setSunFilter] = useState<"all" | "full" | "partial" | "shade">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const icSpicyFiltered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return varieties;
    return varieties.filter(
      (v) =>
        v.name.toLowerCase().includes(needle) ||
        v.species.toLowerCase().includes(needle),
    );
  }, [q, varieties]);

  const catalogPlants = useMemo(
    () =>
      filterPlants({
        query: q,
        category: catFilter === "structures" || catFilter === "all" ? "all" : catFilter,
        sun: sunFilter,
      }),
    [q, catFilter, sunFilter],
  );

  const catalogStructures = useMemo(
    () => filterStructures({ query: q, category: catFilter === "structures" ? "all" : "all" }),
    [q, catFilter],
  );

  const startCatalogPlant = (p: CatalogPlant) => {
    if (readOnly) return;
    onPending({
      kind: "plant",
      catalogId: p.id,
      varietyId: null,
      label: p.name,
      color: p.color,
      icon: p.iconEmoji,
      scoville: p.scovilleMax,
      modelType: p.modelType,
    });
    onCloseSheet?.();
  };

  const startIcPlant = (v: VarietyPublic) => {
    if (readOnly) return;
    onPending({
      kind: "plant",
      varietyId: Number(v.id),
      label: v.name,
      color: varietyColor(Number(v.scovilleMax)),
      icon: varietyIcon(Number(v.scovilleMax)),
      scoville: Number(v.scovilleMax),
    });
    onCloseSheet?.();
  };

  const startStructure = (s: (typeof STRUCTURE_CATALOG)[number]) => {
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
    onCloseSheet?.();
  };

  const inner = (
    <Tabs defaultValue="catalog" className="flex h-full flex-col">
      <div className="border-b border-white/10 p-3 space-y-2 bg-white/5">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${PLANT_CATALOG.length}+ plants…`}
            className="pl-8 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCatFilter(f.id)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] border transition-all",
                catFilter === f.id
                  ? "border-primary bg-primary/20 text-primary shadow-[0_0_8px_rgba(249,115,22,0.25)]"
                  : "border-white/10 bg-white/5 hover:border-white/20",
              )}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>
        <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10">
          <TabsTrigger value="catalog" className="text-xs">Catalog</TabsTrigger>
          <TabsTrigger value="icspicy" className="text-xs">IC SPICY</TabsTrigger>
          <TabsTrigger value="layers" className="text-xs">Layers</TabsTrigger>
          <TabsTrigger value="designs" className="text-xs">Designs</TabsTrigger>
        </TabsList>
      </div>
      <ScrollArea className="flex-1 p-3">
        <TabsContent value="catalog" className="mt-0 space-y-2">
          {catFilter !== "structures" &&
            catalogPlants.slice(0, 120).map((p) => (
              <button
                key={p.id}
                type="button"
                draggable={!readOnly}
                onDragStart={() => startCatalogPlant(p)}
                onClick={() => startCatalogPlant(p)}
                onMouseEnter={() => setExpandedId(p.id)}
                onMouseLeave={() => setExpandedId((id) => (id === p.id ? null : id))}
                className="group w-full rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-primary/50 hover:bg-white/10 hover:shadow-[0_0_16px_rgba(249,115,22,0.12)] cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: `${p.color}33` }}
                  >
                    {p.iconEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm truncate group-hover:text-primary">{p.name}</span>
                      <SunIcon req={p.sunRequirement} />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic truncate">{p.latinName}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/10">
                        {CATEGORY_LABELS[p.category]?.split(" ")[0] ?? p.category}
                      </Badge>
                      {p.nativeFlorida && (
                        <Badge className="text-[9px] px-1 py-0 bg-green-900/40">Native</Badge>
                      )}
                      {p.edible && (
                        <Badge className="text-[9px] px-1 py-0 bg-amber-900/30">Edible</Badge>
                      )}
                      <WaterDots need={p.waterNeed} />
                      <span className="text-[9px] text-muted-foreground">📏 {p.spacing}m</span>
                    </div>
                    {expandedId === p.id && (
                      <p className="text-[10px] text-muted-foreground mt-2 leading-snug">{p.funFact}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          {catFilter === "structures" || catFilter === "all"
            ? catalogStructures.slice(0, 40).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => startStructure(s)}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left hover:border-primary/40"
                >
                  <span className="text-xl">{s.iconEmoji}</span>
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {STRUCTURE_CATEGORY_LABELS[s.category]} · {s.defaultWidth}×{s.defaultDepth}m
                    </div>
                  </div>
                </button>
              ))
            : null}
        </TabsContent>
        <TabsContent value="icspicy" className="mt-0 space-y-2">
          {icSpicyFiltered.map((v) => (
            <button
              key={v.id.toString()}
              type="button"
              onClick={() => startIcPlant(v)}
              className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-left hover:border-primary/40"
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium text-sm">{v.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {formatScoville(v.scovilleMin, v.scovilleMax)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{v.species}</p>
            </button>
          ))}
        </TabsContent>
        <TabsContent value="layers" className="mt-0 space-y-2">
          {layers &&
            onLayersChange &&
            (Object.keys(layers) as (keyof LayerVisibility)[]).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={(e) => onLayersChange({ ...layers, [key]: e.target.checked })}
                />
                {key}
              </label>
            ))}
        </TabsContent>
        <TabsContent value="designs" className="mt-0 space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={onNewDesign}>
            <Plus className="h-4 w-4 mr-1" /> New Design
          </Button>
          {myDesigns.map((d) => (
            <button
              key={d.id ?? d.name}
              type="button"
              onClick={() => {
                onLoadDesign(d);
                onCloseSheet?.();
              }}
              className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-left hover:border-primary/40"
            >
              <div className="font-medium text-sm">{d.name}</div>
              <div className="text-xs text-muted-foreground">
                {d.plants.length} plants · {d.structures.length} structures
              </div>
            </button>
          ))}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );

  if (mobileSheet) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] rounded-t-2xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl sm:hidden">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
        {inner}
      </div>
    );
  }

  return (
    <aside className="hidden sm:flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-white/5 backdrop-blur-xl">
      {inner}
    </aside>
  );
}
