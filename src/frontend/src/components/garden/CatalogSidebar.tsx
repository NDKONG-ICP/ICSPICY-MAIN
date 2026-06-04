import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VarietyPublic } from "@/declarations/backend.did";
import type {
  GardenDesign,
  LayerVisibility,
  PendingPlacement,
} from "@/lib/garden-types";
import { formatScoville, varietyColor, varietyIcon } from "@/lib/garden-utils";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CatalogAccordion } from "./CatalogAccordion";
import { LayersPanel } from "./LayersPanel";

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

  const icSpicyFiltered = varieties.filter((v) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      v.name.toLowerCase().includes(needle) ||
      v.species.toLowerCase().includes(needle)
    );
  });

  const inner = (
    <Tabs
      defaultValue="catalog"
      className="flex h-full flex-col"
      data-tour="catalog"
    >
      <div className="border-b border-white/10 p-3 space-y-2 bg-white/5">
        <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10">
          <TabsTrigger value="catalog" className="text-xs">
            Catalog
          </TabsTrigger>
          <TabsTrigger value="icspicy" className="text-xs">
            IC SPICY
          </TabsTrigger>
          <TabsTrigger value="layers" className="text-xs">
            Layers
          </TabsTrigger>
          <TabsTrigger value="designs" className="text-xs">
            Designs
          </TabsTrigger>
        </TabsList>
      </div>
      <ScrollArea className="flex-1 p-3">
        <TabsContent value="catalog" className="mt-0">
          <CatalogAccordion
            readOnly={readOnly}
            searchQuery={q}
            onSearchChange={setQ}
            onPending={(p) => {
              if (p) {
                onPending(p);
                onCloseSheet?.();
              } else onPending(null);
            }}
            varieties={varieties}
            onIcPlant={startIcPlant}
          />
        </TabsContent>
        <TabsContent value="icspicy" className="mt-0 space-y-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search IC SPICY varieties…"
            className="mb-2 bg-white/5 border-white/10"
          />
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
        <TabsContent value="layers" className="mt-0">
          {layers && onLayersChange && (
            <LayersPanel layers={layers} onChange={onLayersChange} />
          )}
        </TabsContent>
        <TabsContent value="designs" className="mt-0 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onNewDesign}
          >
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
