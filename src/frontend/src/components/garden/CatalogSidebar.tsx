import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GardenDesign, PendingPlacement } from "@/lib/garden-types";
import {
  formatScoville,
  STRUCTURE_PRESETS,
  varietyColor,
  varietyIcon,
} from "@/lib/garden-utils";
import type { VarietyPublic } from "@/declarations/backend.did";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  varieties: VarietyPublic[];
  myDesigns: GardenDesign[];
  readOnly?: boolean;
  mobileSheet?: boolean;
  onCloseSheet?: () => void;
  onPending: (p: PendingPlacement | null) => void;
  onLoadDesign: (d: GardenDesign) => void;
  onNewDesign: () => void;
};

export function CatalogSidebar({
  varieties,
  myDesigns,
  readOnly,
  mobileSheet,
  onCloseSheet,
  onPending,
  onLoadDesign,
  onNewDesign,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return varieties;
    return varieties.filter(
      (v) =>
        v.name.toLowerCase().includes(needle) ||
        v.species.toLowerCase().includes(needle),
    );
  }, [q, varieties]);

  const startPlantDrag = (v: VarietyPublic) => {
    if (readOnly) return;
    onPending({
      kind: "plant",
      varietyId: Number(v.id),
      label: v.name,
      color: varietyColor(Number(v.scovilleMax)),
      icon: varietyIcon(Number(v.scovilleMax)),
    });
    onCloseSheet?.();
  };

  const startStructure = (preset: (typeof STRUCTURE_PRESETS)[number]) => {
    if (readOnly) return;
    onPending({
      kind: "structure",
      structureType: preset.structureType,
      width: preset.width,
      depth: preset.depth,
      color: preset.color,
    });
    onCloseSheet?.();
  };

  const inner = (
    <Tabs defaultValue="plants" className="flex h-full flex-col">
      <div className="border-b border-border p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search catalog…"
            className="pl-8"
          />
        </div>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plants">Plants</TabsTrigger>
          <TabsTrigger value="structures">Structures</TabsTrigger>
          <TabsTrigger value="designs">My Designs</TabsTrigger>
        </TabsList>
      </div>
      <ScrollArea className="flex-1 p-3">
        <TabsContent value="plants" className="mt-0 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">
              Add varieties in NIMS first.
            </p>
          ) : (
            filtered.map((v) => (
              <button
                key={v.id.toString()}
                type="button"
                draggable={!readOnly}
                onDragStart={() => startPlantDrag(v)}
                onClick={() => startPlantDrag(v)}
                className="w-full rounded-lg border border-border bg-card/60 p-3 text-left hover:border-primary/40 transition-smooth cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{v.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatScoville(v.scovilleMin, v.scovilleMax)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{v.species}</p>
              </button>
            ))
          )}
        </TabsContent>
        <TabsContent value="structures" className="mt-0 grid grid-cols-1 gap-2">
          {STRUCTURE_PRESETS.map((s) => (
            <button
              key={s.structureType}
              type="button"
              draggable={!readOnly}
              onDragStart={() => startStructure(s)}
              onClick={() => startStructure(s)}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-3 text-left hover:border-primary/40"
            >
              <span className="text-xl">{s.emoji}</span>
              <div>
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">
                  {s.width}m × {s.depth}m
                </div>
              </div>
            </button>
          ))}
        </TabsContent>
        <TabsContent value="designs" className="mt-0 space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={onNewDesign}>
            <Plus className="h-4 w-4 mr-1" /> New Design
          </Button>
          {myDesigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved designs yet.</p>
          ) : (
            myDesigns.map((d) => (
              <button
                key={d.id ?? d.name}
                type="button"
                onClick={() => {
                  onLoadDesign(d);
                  onCloseSheet?.();
                }}
                className="w-full rounded-lg border border-border bg-card/60 p-3 text-left hover:border-primary/40"
              >
                <div className="font-medium text-sm">{d.name}</div>
                <div className="text-xs text-muted-foreground">
                  {d.plants.length} plants · {d.structures.length} structures
                  {d.isPublic ? " · public" : ""}
                </div>
              </button>
            ))
          )}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );

  if (mobileSheet) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] rounded-t-2xl border border-border bg-card shadow-lg sm:hidden">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
        {inner}
      </div>
    );
  }

  return (
    <aside className="hidden sm:flex w-72 shrink-0 flex-col border-r border-border bg-card/40">
      {inner}
    </aside>
  );
}
