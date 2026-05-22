import type { PlantLifecycle } from "../declarations/backend.did";

export interface NimsAnalytics {
  totalPlants: number;
  totalVarieties: number;
  plantsByStage: { stage: string; count: number }[];
  plantsByVariety: { variety: string; count: number }[];
  plantsByContainer: { container: string; count: number }[];
  germinationRate: number;
  germinationByVariety: {
    variety: string;
    planted: number;
    germinated: number;
    rate: number;
  }[];
  dailyActivity: {
    date: string;
    waterings: number;
    feedings: number;
    photos: number;
    notes: number;
  }[];
  deathRate: number;
  plantsForSale: number;
  plantsSold: number;
  revenueCents: number;
}

function stageLabel(stage: PlantLifecycle["plant"]["stage"]): string {
  if ("Seed" in stage) return "Seed";
  if ("Seedling" in stage) return "Seedling";
  return "Mature";
}

function containerKey(
  cs: PlantLifecycle["plant"]["container_size"],
): string {
  if (!cs || cs.length === 0) return "Unknown";
  return Object.keys(cs[0]!)[0] ?? "Unknown";
}

function dayKey(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toISOString().slice(0, 10);
}

export function aggregateNimsAnalytics(
  plants: PlantLifecycle[],
): NimsAnalytics {
  const stageMap = new Map<string, number>();
  const varietyMap = new Map<string, number>();
  const containerMap = new Map<string, number>();
  const germByVariety = new Map<string, { planted: number; germinated: number }>();
  const activityMap = new Map<
    string,
    { waterings: number; feedings: number; photos: number; notes: number }
  >();

  let germinatedCount = 0;
  let plantsForSale = 0;
  let plantsSold = 0;
  let revenueCents = 0;

  for (const lc of plants) {
    const p = lc.plant;
    const stage = stageLabel(p.stage);
    stageMap.set(stage, (stageMap.get(stage) ?? 0) + 1);

    const variety = p.variety.trim() || "Unknown";
    varietyMap.set(variety, (varietyMap.get(variety) ?? 0) + 1);

    const container = containerKey(p.container_size);
    containerMap.set(container, (containerMap.get(container) ?? 0) + 1);

    const g = germByVariety.get(variety) ?? { planted: 0, germinated: 0 };
    g.planted += 1;
    if (p.germination_date.length === 1) {
      g.germinated += 1;
      germinatedCount += 1;
    }
    germByVariety.set(variety, g);

    if (p.for_sale) plantsForSale += 1;
    if (p.sold) {
      plantsSold += 1;
      if (lc.priceCents.length === 1) {
        revenueCents += Number(lc.priceCents[0]!);
      }
    }

    for (const w of lc.wateringLog) {
      const d = dayKey(w.timestamp);
      const row = activityMap.get(d) ?? {
        waterings: 0,
        feedings: 0,
        photos: 0,
        notes: 0,
      };
      row.waterings += 1;
      activityMap.set(d, row);
    }
    for (const f of lc.feedingLog) {
      const d = dayKey(f.date);
      const row = activityMap.get(d) ?? {
        waterings: 0,
        feedings: 0,
        photos: 0,
        notes: 0,
      };
      row.feedings += 1;
      activityMap.set(d, row);
    }
    for (const ph of lc.photos) {
      const d = dayKey(ph.timestamp);
      const row = activityMap.get(d) ?? {
        waterings: 0,
        feedings: 0,
        photos: 0,
        notes: 0,
      };
      row.photos += 1;
      activityMap.set(d, row);
    }
    for (const n of lc.notes) {
      const d = dayKey(n.timestamp);
      const row = activityMap.get(d) ?? {
        waterings: 0,
        feedings: 0,
        photos: 0,
        notes: 0,
      };
      row.notes += 1;
      activityMap.set(d, row);
    }
  }

  const today = new Date();
  const dailyActivity: NimsAnalytics["dailyActivity"] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = activityMap.get(key) ?? {
      waterings: 0,
      feedings: 0,
      photos: 0,
      notes: 0,
    };
    dailyActivity.push({ date: key, ...row });
  }

  const plantsByVariety = [...varietyMap.entries()]
    .map(([variety, count]) => ({ variety, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalPlants: plants.length,
    totalVarieties: varietyMap.size,
    plantsByStage: [...stageMap.entries()].map(([stage, count]) => ({
      stage,
      count,
    })),
    plantsByVariety,
    plantsByContainer: [...containerMap.entries()].map(
      ([container, count]) => ({ container, count }),
    ),
    germinationRate:
      plants.length === 0
        ? 0
        : Math.round((germinatedCount / plants.length) * 100),
    germinationByVariety: [...germByVariety.entries()]
      .map(([variety, v]) => ({
        variety,
        planted: v.planted,
        germinated: v.germinated,
        rate:
          v.planted === 0 ? 0 : Math.round((v.germinated / v.planted) * 100),
      }))
      .sort((a, b) => b.planted - a.planted)
      .slice(0, 10),
    dailyActivity,
    deathRate: 0,
    plantsForSale,
    plantsSold,
    revenueCents,
  };
}

export const NIMS_CHART_COLORS = {
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  amber: "#f59e0b",
  red: "#ef4444",
  gray: "#6b7280",
} as const;
