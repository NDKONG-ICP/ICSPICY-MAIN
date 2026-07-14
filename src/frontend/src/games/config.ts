/** ICSPICY Games catalog — single source for hub cards and routes. */

export type GameId = "slicer" | "pepper-patch" | "crafter";

export interface GameDefinition {
  id: GameId;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  route: string;
  /** When false, hub shows Coming Soon and Play is disabled. */
  available: boolean;
  flagship?: boolean;
  emoji: string;
}

export const GAMES: GameDefinition[] = [
  {
    id: "slicer",
    slug: "slicer",
    name: "ICSPICY Slicer",
    tagline: "Slice the Heat • Build Your Small-Batch Legend",
    description:
      "Mobile-first swipe-to-slice arcade action. Rack up Scoville points with perfect cuts, blazing combos, and frenzy bursts.",
    route: "/games/slicer",
    available: true,
    emoji: "🔪",
  },
  {
    id: "pepper-patch",
    slug: "pepper-patch",
    name: "ICSPICY Pepper Patch",
    tagline: "Grow Rare Heat • Harvest Your Legacy",
    description:
      "Flagship virtual pepper garden. Plant real ICSPICY varieties, care on timers, harvest SHU batches, and unlock rare heat.",
    route: "/games/pepper-patch",
    available: true,
    flagship: true,
    emoji: "🌶️",
  },
  {
    id: "crafter",
    slug: "crafter",
    name: "ICSPICY Small Batch Crafter",
    tagline: "Craft Your Perfect Small-Batch Legend",
    description:
      "Blend artisan heat in a bubbling sauce pot. Balance SHU, sweet-acid, and flavor harmony to bottle legendary small batches.",
    route: "/games/crafter",
    available: true,
    emoji: "🫙",
  },
];

export function gameById(id: GameId): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}

export function formatShu(score: bigint | number): string {
  const n = typeof score === "bigint" ? Number(score) : score;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
