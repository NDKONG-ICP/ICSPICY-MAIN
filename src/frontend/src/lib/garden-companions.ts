import type { CatalogPlant } from "./garden-plant-catalog";
import type { PlantPlacement } from "./garden-types";

export type CompanionSuggestion = {
  plant: CatalogPlant;
  reason: string;
  type: "companion" | "warning";
};

const REASONS: Record<string, string> = {
  basil: "Basil improves flavor and repels aphids.",
  marigold: "Marigolds deter nematodes near peppers.",
  onion: "Onions confuse pest insects.",
  fennel: "Fennel inhibits pepper growth — keep apart.",
  dill: "Dill attracts beneficial wasps.",
  nasturtium: "Nasturtium traps aphids away from peppers.",
  oregano: "Oregano provides ground-level pest confusion.",
  rosemary: "Rosemary repels cabbage moths and beetles.",
  mint: "Mint deters ants (plant in pots to contain).",
  lemongrass: "Lemongrass repels mosquitoes.",
  pigeon_pea: "Pigeon pea fixes nitrogen for heavy feeders.",
  moringa: "Moringa provides dappled shade for young peppers.",
};

function dist(a: PlantPlacement, b: PlantPlacement): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getCompanionSuggestions(
  catalogId: string,
  existingPlants: PlantPlacement[],
  newPlant: Pick<PlantPlacement, "x" | "y">,
  catalog: CatalogPlant[],
  spacing: number,
): CompanionSuggestion[] {
  const plant = catalog.find((p) => p.id === catalogId);
  if (!plant) return [];

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const suggestions: CompanionSuggestion[] = [];
  const placedIds = new Set(
    existingPlants.map((p) => p.catalogId).filter(Boolean) as string[],
  );

  for (const compId of plant.companions) {
    if (!placedIds.has(compId)) {
      const comp = byId.get(compId);
      if (comp) {
        suggestions.push({
          plant: comp,
          reason:
            REASONS[compId] ??
            `${comp.name} is a known companion for ${plant.name}.`,
          type: "companion",
        });
      }
    }
  }

  for (const antId of plant.antagonists) {
    const nearby = existingPlants.filter(
      (p) =>
        p.catalogId === antId &&
        dist(p, {
          ...newPlant,
          id: 0,
          varietyId: null,
          label: "",
          rotation: 0,
          scale: 1,
          color: "",
          icon: "",
        }) <
          spacing * 3,
    );
    if (nearby.length > 0) {
      const ant = byId.get(antId);
      if (ant) {
        suggestions.push({
          plant: ant,
          reason: REASONS[antId] ?? `Keep ${plant.name} away from ${ant.name}.`,
          type: "warning",
        });
      }
    }
  }

  return suggestions.slice(0, 5);
}

export function catalogIdFromPlacement(p: PlantPlacement): string | null {
  if (p.catalogId) return p.catalogId;
  if (p.label) {
    return p.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  return null;
}
