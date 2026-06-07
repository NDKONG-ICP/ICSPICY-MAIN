import type { GeneratedLayout, GeneratedLayoutStructure } from "./garden-ai";
import {
  PLANT_CATALOG,
  getPlantById,
  getStructureById,
} from "./garden-plant-catalog";

type Pt = { catalogId: string; x: number; y: number; scale?: number };

function resolvePlant(...candidates: string[]): string | null {
  for (const id of candidates) {
    if (getPlantById(id)) return id;
  }
  const first = candidates[0];
  if (!first) return null;
  const hit = PLANT_CATALOG.find(
    (p) =>
      p.id.includes(first) ||
      p.name.toLowerCase().includes(first.replace(/-/g, " ")),
  );
  return hit?.id ?? null;
}

function resolveStructure(...candidates: string[]): string | null {
  for (const id of candidates) {
    if (getStructureById(id)) return id;
  }
  return null;
}

function placePlant(
  plants: Pt[],
  catalogId: string | null,
  x: number,
  y: number,
  scale = 1,
) {
  if (!catalogId || !getPlantById(catalogId)) return;
  plants.push({ catalogId, x, y, scale });
}

function placeStructure(
  structures: GeneratedLayoutStructure[],
  structureId: string | null,
  x: number,
  y: number,
  width?: number,
  depth?: number,
) {
  if (!structureId) return;
  const def = getStructureById(structureId);
  if (!def) return;
  structures.push({
    structureId,
    x,
    y,
    width: width ?? def.defaultWidth,
    depth: depth ?? def.defaultDepth,
  });
}

function placePerimeterTrees(
  plants: Pt[],
  w: number,
  d: number,
  ids: string[],
) {
  const resolved = ids
    .map((id) => resolvePlant(id))
    .filter(Boolean) as string[];
  if (resolved.length === 0) return;
  const margin = 1.5;
  const positions = [
    [margin, margin],
    [w - margin, margin],
    [margin, d - margin],
    [w - margin, d - margin],
    [w / 2, margin],
    [w / 2, d - margin],
  ] as const;
  positions.forEach(([x, y], i) => {
    placePlant(plants, resolved[i % resolved.length]!, x, y, 1.1);
  });
}

function placeUnderstory(plants: Pt[], w: number, d: number, ids: string[]) {
  const resolved = ids
    .map((id) => resolvePlant(id))
    .filter(Boolean) as string[];
  const cx = w * 0.5;
  const cy = d * 0.5;
  resolved.forEach((id, i) => {
    const angle = (i / resolved.length) * Math.PI * 2;
    const r = Math.min(w, d) * 0.22;
    placePlant(
      plants,
      id,
      cx + Math.cos(angle) * r,
      cy + Math.sin(angle) * r,
      0.95,
    );
  });
}

function fillBedWithPlants(
  plants: Pt[],
  bedX: number,
  bedY: number,
  bedW: number,
  bedD: number,
  ids: string[],
) {
  const resolved = ids
    .map((id) => resolvePlant(id))
    .filter(Boolean) as string[];
  if (resolved.length === 0) return;
  const cols = Math.ceil(Math.sqrt(resolved.length));
  const cellW = bedW / (cols + 1);
  const cellH = bedD / (Math.ceil(resolved.length / cols) + 1);
  resolved.forEach((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    placePlant(
      plants,
      id,
      bedX + cellW * (col + 1),
      bedY + cellH * (row + 1),
      0.9,
    );
  });
}

function generateExplanation(
  plants: Pt[],
  structures: GeneratedLayoutStructure[],
): string {
  const trees = plants.filter((p) => {
    const cat = getPlantById(p.catalogId);
    return (
      cat?.modelType === "large_tree" ||
      cat?.modelType === "small_tree" ||
      cat?.modelType === "palm"
    );
  }).length;
  const peppers = plants.filter(
    (p) => getPlantById(p.catalogId)?.category === "pepper",
  ).length;
  const parts: string[] = [];
  if (trees > 0)
    parts.push(`${trees} canopy/understory trees around the perimeter`);
  if (peppers > 0) parts.push(`${peppers} pepper varieties in raised beds`);
  if (structures.some((s) => s.structureId.includes("chicken")))
    parts.push("homestead infrastructure");
  if (structures.some((s) => s.structureId.includes("compost")))
    parts.push("compost zone");
  if (structures.some((s) => s.structureId.includes("path")))
    parts.push("access paths");
  return `Here's a suggested layout based on your description${parts.length ? `: ${parts.join(", ")}` : ""}. Tap any element to adjust.`;
}

/**
 * Layered food-forest generator. Produces a legitimately useful permaculture
 * layout in four stacked zones rather than scattering plants randomly.
 *
 * Coordinate convention matches GardenDesign: x = metres east of SW corner,
 * y = metres north of SW corner. "North edge" = high y.
 */
export function generateFoodForestFallback(
  gardenWidthM: number,
  gardenDepthM: number,
  prompt: string,
): Pt[] {
  const plants: Pt[] = [];
  const w = gardenWidthM;
  const d = gardenDepthM;

  const isPollinatorFocus = /pollinat|bee|butterfly|wildlife/i.test(prompt);
  const isSpicyFocus = /spicy|hot|pepper|chili|reaper|ghost|habanero/i.test(
    prompt,
  );

  // ── Zone 1 — Canopy layer: large fruit/nut trees along the north edge ──────
  // Spaced ~4 m apart so mature crowns interlock without crowding.
  const canopyIds = [
    resolvePlant("mango", "avocado"),
    resolvePlant("avocado", "jackfruit"),
    resolvePlant("jackfruit", "mamey-sapote"),
    resolvePlant("lychee", "longan"),
  ].filter(Boolean) as string[];
  if (w >= 6 && canopyIds.length > 0) {
    const canopyY = Math.max(1.5, d - 1.5);
    const canopyCount = Math.max(2, Math.min(4, Math.floor(w / 4)));
    const canopyGap = w / (canopyCount + 1);
    for (let i = 0; i < canopyCount; i++) {
      placePlant(
        plants,
        canopyIds[i % canopyIds.length]!,
        canopyGap * (i + 1),
        canopyY,
        1.25,
      );
    }
  }

  // ── Zone 2 — Sub-canopy: citrus + nitrogen fixers in a loose mid band ──────
  const subCanopyIds = [
    resolvePlant("navel-orange", "valencia-orange", "meyer-lemon"),
    resolvePlant("guava", "barbados-cherry"),
    resolvePlant("moringa"),
    resolvePlant("pigeon-pea"),
  ].filter(Boolean) as string[];
  if (d >= 6 && subCanopyIds.length > 0) {
    const bandY = d * 0.62;
    const count = Math.max(2, Math.min(5, Math.floor(w / 3)));
    const gap = w / (count + 1);
    for (let i = 0; i < count; i++) {
      placePlant(
        plants,
        subCanopyIds[i % subCanopyIds.length]!,
        gap * (i + 1),
        bandY,
        1.05,
      );
    }
  }

  // ── Zone 3 — Shrub/herb layer: pepper or veggie grid in the sunny centre ───
  const gridIds = (
    isSpicyFocus
      ? [
          "carolina-reaper",
          "ghost-pepper",
          "scotch-bonnet",
          "datil-pepper",
          "orange-habanero",
          "thai-bird-s-eye",
        ]
      : [
          "thai-basil",
          "datil-pepper",
          "turmeric",
          "lemongrass",
          "rosemary",
          "mint",
        ]
  )
    .map((id) => resolvePlant(id))
    .filter(Boolean) as string[];
  if (gridIds.length > 0) {
    const spacing = 0.75;
    const marginX = 1.2;
    const startY = 1.5;
    const endY = d * 0.5;
    const cols = Math.max(1, Math.floor((w - marginX * 2) / spacing));
    const rows = Math.max(1, Math.floor((endY - startY) / spacing));
    let g = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Skip a central walking row so the bed is reachable.
        if (r === Math.floor(rows / 2)) continue;
        placePlant(
          plants,
          gridIds[g % gridIds.length]!,
          marginX + c * spacing + (r % 2) * (spacing / 2),
          startY + r * spacing,
          0.9,
        );
        g++;
        if (plants.length > 120) break;
      }
      if (plants.length > 120) break;
    }
  }

  // ── Zone 4 — Living border: pest-deterrent ring of marigold + basil ────────
  const borderIds = [
    resolvePlant("marigold", "blanket-flower"),
    resolvePlant("thai-basil", "mint"),
    isPollinatorFocus ? resolvePlant("milkweed", "blanket-flower") : null,
  ].filter(Boolean) as string[];
  if (borderIds.length > 0) {
    const step = 1.0;
    let b = 0;
    const edge = 0.4;
    // bottom + top edges
    for (let x = edge; x <= w - edge; x += step) {
      placePlant(plants, borderIds[b++ % borderIds.length]!, x, edge, 0.8);
      placePlant(plants, borderIds[b++ % borderIds.length]!, x, d - edge, 0.8);
    }
    // left + right edges
    for (let y = edge + step; y <= d - edge - step; y += step) {
      placePlant(plants, borderIds[b++ % borderIds.length]!, edge, y, 0.8);
      placePlant(plants, borderIds[b++ % borderIds.length]!, w - edge, y, 0.8);
    }
  }

  return plants;
}

export function generateLayoutFallback(
  userPrompt: string,
  plotWidth: number,
  plotDepth: number,
  zone: string,
): GeneratedLayout {
  const q = userPrompt.toLowerCase();
  const w = plotWidth;
  const d = plotDepth;

  const wantsFoodForest = /food forest|guild|permaculture|layered|forest garden/i.test(
    q,
  );

  // Dedicated layered generator for food-forest / permaculture requests.
  if (wantsFoodForest) {
    const ffPlants = generateFoodForestFallback(w, d, userPrompt);
    const ffStructures: GeneratedLayoutStructure[] = [];
    placeStructure(ffStructures, resolveStructure("path-mulch"), 0.2, d * 0.5, w * 0.9, 0.6);
    placeStructure(ffStructures, resolveStructure("compost-bin-3bay"), w * 0.9, d * 0.12);
    placeStructure(ffStructures, resolveStructure("rain-barrel"), w * 0.08, d * 0.08);
    placeStructure(
      ffStructures,
      resolveStructure("drip-irrigation-zone"),
      w * 0.5,
      d * 0.3,
      w * 0.7,
      0.3,
    );
    return {
      name: "Layered Food Forest",
      widthMeters: w,
      depthMeters: d,
      plants: ffPlants.slice(0, 120),
      structures: ffStructures.slice(0, 20),
      explanation: `${generateExplanation(ffPlants, ffStructures)} Canopy fruit trees anchor the north edge, citrus + nitrogen fixers form the sub-canopy, a pepper/herb grid fills the sunny centre, and a marigold-and-basil border deters pests. (Zone ${zone} layered fallback.)`,
    };
  }

  const wantsPeppers =
    /pepper|hot|spicy|reaper|ghost|habanero|scotch|carolina/i.test(q);
  const wantsFruit =
    /fruit|mango|avocado|citrus|banana|food forest|forest/i.test(q);
  const wantsNative = /native|pollinator|butterfly|wildlife|wildflower/i.test(
    q,
  );
  const wantsHomestead = /homestead|chicken|coop|self.?suff/i.test(q);
  const wantsHerbs = /herb|medicinal|culinary|basil|spiral/i.test(q);
  const wantsOasis = /palm|oasis|pond|tropical oasis/i.test(q);

  const plants: Pt[] = [];
  const structures: GeneratedLayoutStructure[] = [];

  if (wantsFruit || wantsHomestead) {
    placePerimeterTrees(plants, w, d, [
      "mango",
      "avocado",
      "jackfruit",
      "citrus-orange",
    ]);
  }

  if (wantsFruit || wantsNative) {
    placeUnderstory(plants, w, d, [
      "moringa",
      "guava",
      "mangosteen",
      "pigeon-pea",
    ]);
  }

  if (wantsNative && !wantsFruit) {
    const natives = PLANT_CATALOG.filter(
      (p) =>
        p.category === "pollinator" ||
        p.category === "native_ground" ||
        p.category === "native_shrub",
    ).slice(0, 12);
    natives.forEach((p, i) => {
      const cols = 4;
      placePlant(
        plants,
        p.id,
        w * 0.15 + (i % cols) * (w * 0.18),
        d * 0.2 + Math.floor(i / cols) * (d * 0.15),
      );
    });
    placeStructure(
      structures,
      resolveStructure("rain-garden-swale"),
      w * 0.5,
      d * 0.85,
      w * 0.4,
      1.2,
    );
  }

  if (wantsPeppers || wantsHerbs || wantsHomestead) {
    const bedW = Math.min(w * 0.45, 4);
    const bedD = Math.min(d * 0.35, 2.4);
    const bedX = w * 0.28;
    const bedY = d * 0.32;
    placeStructure(
      structures,
      resolveStructure("raised-bed-4x2"),
      bedX,
      bedY,
      bedW,
      bedD,
    );
    const pepperIds = wantsPeppers
      ? [
          "carolina-reaper",
          "ghost-pepper",
          "scotch-bonnet",
          "thai-bird-s-eye",
          "habanero-orange",
        ]
      : ["thai-basil", "rosemary", "lemongrass", "turmeric", "mint"];
    fillBedWithPlants(plants, bedX, bedY, bedW, bedD, pepperIds);
    if (wantsPeppers) {
      placePlant(
        plants,
        resolvePlant("marigold-tagetes"),
        bedX + bedW + 0.4,
        bedY + 0.3,
      );
    }
  }

  if (wantsHerbs && !wantsPeppers) {
    placeStructure(
      structures,
      resolveStructure("herb-spiral"),
      w * 0.55,
      d * 0.45,
    );
  }

  if (wantsHomestead) {
    placeStructure(
      structures,
      resolveStructure("chicken-coop-4x3"),
      w * 0.78,
      d * 0.72,
    );
    placeStructure(
      structures,
      resolveStructure("raised-bed-4x2"),
      w * 0.15,
      d * 0.55,
      4,
      2,
    );
    fillBedWithPlants(
      plants,
      w * 0.15,
      d * 0.55,
      4,
      2,
      ["tomato-cherry", "squash-yellow", "cucumber", "basil-genovese"].map(
        (id) => resolvePlant(id) ?? "",
      ),
    );
  }

  if (wantsOasis) {
    placePerimeterTrees(plants, w, d, [
      "coconut-palm",
      "royal-palm",
      "banana",
      "bird-of-paradise",
    ]);
    placeStructure(
      structures,
      resolveStructure("pond-small"),
      w * 0.5,
      d * 0.5,
    );
  }

  placeStructure(
    structures,
    resolveStructure("rain-barrel"),
    w * 0.08,
    d * 0.08,
  );
  placeStructure(
    structures,
    resolveStructure("compost-bin-3bay"),
    w * 0.88,
    d * 0.1,
  );
  placeStructure(
    structures,
    resolveStructure("drip-irrigation-zone"),
    w * 0.5,
    d * 0.12,
    w * 0.6,
    0.3,
  );
  placeStructure(
    structures,
    resolveStructure("path-mulch"),
    0.2,
    d * 0.48,
    w * 0.85,
    0.6,
  );

  if (plants.length < 6) {
    const defaults = [
      ...PLANT_CATALOG.filter((p) => p.category === "pepper")
        .slice(0, 4)
        .map((p) => p.id),
      ...PLANT_CATALOG.filter((p) => p.category === "herb")
        .slice(0, 3)
        .map((p) => p.id),
    ];
    fillBedWithPlants(plants, w * 0.3, d * 0.3, w * 0.4, d * 0.35, defaults);
    if (structures.length < 3) {
      placeStructure(
        structures,
        resolveStructure("raised-bed-4x2"),
        w * 0.3,
        d * 0.3,
        4,
        2,
      );
    }
  }

  const name = wantsPeppers
    ? "Pepper Paradise Layout"
    : wantsFruit
      ? "Food Forest Layout"
      : wantsNative
        ? "Pollinator Garden Layout"
        : wantsHomestead
          ? "Homestead Layout"
          : "AI Garden Design";

  return {
    name,
    widthMeters: w,
    depthMeters: d,
    plants: plants.slice(0, 80),
    structures: structures.slice(0, 20),
    explanation: `${generateExplanation(plants, structures)} (Zone ${zone} fallback — SpicyAI returned non-JSON.)`,
  };
}
