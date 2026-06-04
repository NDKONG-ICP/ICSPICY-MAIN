import { getPlantById } from "./garden-plant-catalog";
import { estimatePlantCost, estimateStructureCost } from "./garden-seasonal";
import type { GardenDesign, PlantPlacement } from "./garden-types";

export type CostLine = {
  label: string;
  qty: number;
  unitCents: number;
  catalogId?: string;
  isIcSpicyPepper?: boolean;
};

export type CostBreakdown = {
  plants: CostLine[];
  structures: CostLine[];
  soilCents: number;
  plantSubtotalCents: number;
  structureSubtotalCents: number;
  soilSubtotalCents: number;
  totalCents: number;
  yieldLbsMax: number;
  costPerLbYear1: number | null;
  costPerLbYear3: number | null;
};

function groupPlants(
  plants: PlantPlacement[],
): Map<string, { label: string; qty: number; catalogId?: string }> {
  const m = new Map<
    string,
    { label: string; qty: number; catalogId?: string }
  >();
  for (const p of plants) {
    const key = p.catalogId ?? p.label;
    const prev = m.get(key);
    if (prev) prev.qty += 1;
    else
      m.set(key, {
        label: p.label,
        qty: 1,
        catalogId: p.catalogId ?? undefined,
      });
  }
  return m;
}

export function calculateGardenCost(
  design: GardenDesign,
  yieldLbsMax = 0,
): CostBreakdown {
  const plantLines: CostLine[] = [];
  for (const [key, { label, qty, catalogId }] of groupPlants(design.plants)) {
    const unit = estimatePlantCost(catalogId, label) * 100;
    const cat = catalogId ? getPlantById(catalogId) : null;
    plantLines.push({
      label,
      qty,
      unitCents: unit,
      catalogId,
      isIcSpicyPepper: cat?.category === "pepper",
    });
  }

  const structMap = new Map<string, number>();
  for (const s of design.structures) {
    structMap.set(s.structureType, (structMap.get(s.structureType) ?? 0) + 1);
  }
  const structureLines: CostLine[] = [...structMap.entries()].map(
    ([id, qty]) => ({
      label: id.replace(/-/g, " "),
      qty,
      unitCents: estimateStructureCost(id) * 100,
    }),
  );

  const area = design.widthMeters * design.depthMeters;
  const soilCents = Math.round(area * 3 * 100); // ~$3/sqm compost/mulch estimate

  const plantSubtotalCents = plantLines.reduce(
    (s, l) => s + l.qty * l.unitCents,
    0,
  );
  const structureSubtotalCents = structureLines.reduce(
    (s, l) => s + l.qty * l.unitCents,
    0,
  );
  const totalCents = plantSubtotalCents + structureSubtotalCents + soilCents;

  return {
    plants: plantLines.sort(
      (a, b) => b.qty * b.unitCents - a.qty * a.unitCents,
    ),
    structures: structureLines,
    soilCents,
    plantSubtotalCents,
    structureSubtotalCents,
    soilSubtotalCents: soilCents,
    totalCents,
    yieldLbsMax,
    costPerLbYear1: yieldLbsMax > 0 ? totalCents / 100 / yieldLbsMax : null,
    costPerLbYear3: yieldLbsMax > 0 ? totalCents / 100 / yieldLbsMax / 3 : null,
  };
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
