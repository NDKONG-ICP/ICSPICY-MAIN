import type { CatalogPlant } from "./garden-plant-catalog";
import type { PlantPlacement } from "./garden-types";

export type CompanionLink = {
  from: PlantPlacement;
  to: PlantPlacement;
  type: "companion" | "antagonist";
  reason: string;
};

export function getCompanionLinks(
  plants: PlantPlacement[],
  catalog: CatalogPlant[],
): CompanionLink[] {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const links: CompanionLink[] = [];
  const seen = new Set<string>();

  for (const a of plants) {
    if (!a.catalogId) continue;
    const catA = byId.get(a.catalogId);
    if (!catA) continue;
    for (const b of plants) {
      if (b.id === a.id || !b.catalogId) continue;
      const catB = byId.get(b.catalogId);
      if (!catB) continue;
      const key = [a.id, b.id].sort().join("-");
      if (seen.has(key)) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const maxD = Math.max(catA.spacing, catB.spacing) * 2;
      if (d > maxD) continue;
      if (catA.companions.includes(b.catalogId)) {
        seen.add(key);
        links.push({
          from: a,
          to: b,
          type: "companion",
          reason: `${catA.name} + ${catB.name}`,
        });
      } else if (catA.antagonists.includes(b.catalogId)) {
        seen.add(key);
        links.push({
          from: a,
          to: b,
          type: "antagonist",
          reason: `Keep ${catA.name} away from ${catB.name}`,
        });
      }
    }
  }
  return links;
}

export type PlantHalo = { plantId: number; kind: "good" | "bad" };

/** Gold halo = companion nearby + spacing ok; red = antagonist nearby or too close. */
export function getPlantPlacementHalos(
  plants: PlantPlacement[],
  catalog: CatalogPlant[],
): PlantHalo[] {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const halos: PlantHalo[] = [];

  for (const a of plants) {
    if (!a.catalogId) continue;
    const catA = byId.get(a.catalogId);
    if (!catA) continue;

    let bad = false;
    let good = false;

    for (const b of plants) {
      if (b.id === a.id || !b.catalogId) continue;
      const catB = byId.get(b.catalogId);
      if (!catB) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const minDist = Math.max(catA.spacing, catB.spacing) * 0.85;

      if (d < minDist) bad = true;
      if (catA.antagonists.includes(b.catalogId) && d < catA.spacing * 2)
        bad = true;
      if (catA.companions.includes(b.catalogId) && d < catA.spacing * 2)
        good = true;
    }

    if (bad) halos.push({ plantId: a.id, kind: "bad" });
    else if (good) halos.push({ plantId: a.id, kind: "good" });
  }
  return halos;
}
