import type { GameId } from "../config";

export const TITLE_ASSETS: Record<GameId, string> = {
  slicer: "/games/titles/title-slicer.webp",
  "pepper-patch": "/games/titles/title-pepper-patch.webp",
  crafter: "/games/titles/title-crafter.webp",
};

export const TITLE_COPY: Record<
  GameId,
  { title: string; tagline: string; leaderboardGame: GameId }
> = {
  slicer: {
    title: "ICSPICY SLICER",
    tagline: "Slice the Heat · Build Your Legend",
    leaderboardGame: "slicer",
  },
  "pepper-patch": {
    title: "PEPPER PATCH",
    tagline: "Grow Rare Heat · Harvest Your Legacy",
    leaderboardGame: "pepper-patch",
  },
  crafter: {
    title: "SMALL BATCH CRAFTER",
    tagline: "Blend the Fire · Bottle the Legend",
    leaderboardGame: "crafter",
  },
};

/** Drifting ember positions for title screens (%). */
export const TITLE_EMBERS = [
  { x: 18, y: 72, delay: 0 },
  { x: 42, y: 80, delay: 2.4 },
  { x: 68, y: 75, delay: 4.8 },
  { x: 82, y: 85, delay: 1.2 },
  { x: 55, y: 68, delay: 6.2 },
] as const;
