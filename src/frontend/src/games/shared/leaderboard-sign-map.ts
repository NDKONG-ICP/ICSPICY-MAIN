import type { GameId } from "../config";

/** One slat row on the painted sign (% of image height). */
export type SignRowMap = {
  y: number;
  height: number;
  rotate: number;
};

export type SignBulbMap = { x: number; y: number; r: number };

export interface LeaderboardSignMap {
  src: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
  aspectRatio: number;
  rowsOnSign: 8;
  board: { top: number; bottom: number; left: number; right: number };
  columns: {
    rank: { left: number; width: number; align: "center" };
    name: { left: number; width: number; align: "left" };
    score: { left: number; width: number; align: "right" };
    dividerX: number;
  };
  rows: readonly SignRowMap[];
  bulbsLeft: readonly SignBulbMap[];
  bulbsRight: readonly SignBulbMap[];
  bulbChase: { stepSec: number; cycleSec: number };
  embers: readonly { x: number; y: number; delay: number }[];
  alt: string;
  emptyMessage: string;
}

const SLICER_SIGN: LeaderboardSignMap = {
  src: "/games/leaderboard-slicer.webp",
  intrinsicWidth: 784,
  intrinsicHeight: 1168,
  aspectRatio: 784 / 1168,
  rowsOnSign: 8,
  board: { top: 43.5, bottom: 9.5, left: 15, right: 15 },
  columns: {
    rank: { left: 17.0, width: 13.0, align: "center" },
    name: { left: 33.0, width: 33.0, align: "left" },
    score: { left: 68.0, width: 11.0, align: "right" },
    dividerX: 31.0,
  },
  rows: [
    { y: 47.2, height: 5.4, rotate: -0.12 },
    { y: 53.2, height: 5.4, rotate: 0.08 },
    { y: 59.2, height: 5.4, rotate: -0.1 },
    { y: 65.2, height: 5.4, rotate: 0.14 },
    { y: 71.2, height: 5.4, rotate: -0.08 },
    { y: 77.2, height: 5.4, rotate: 0.1 },
    { y: 83.2, height: 5.4, rotate: -0.12 },
    { y: 89.2, height: 5.4, rotate: 0.06 },
  ],
  bulbsLeft: [
    { x: 6.8, y: 23.0, r: 2.4 },
    { x: 6.9, y: 30.0, r: 2.3 },
    { x: 6.8, y: 37.0, r: 2.4 },
    { x: 6.9, y: 44.0, r: 2.3 },
    { x: 6.8, y: 51.0, r: 2.4 },
    { x: 6.9, y: 58.0, r: 2.3 },
    { x: 6.8, y: 65.0, r: 2.4 },
    { x: 6.9, y: 72.0, r: 2.3 },
    { x: 6.8, y: 79.0, r: 2.3 },
    { x: 6.9, y: 86.0, r: 2.2 },
  ],
  bulbsRight: [
    { x: 93.2, y: 23.0, r: 2.4 },
    { x: 93.1, y: 30.0, r: 2.3 },
    { x: 93.2, y: 37.0, r: 2.4 },
    { x: 93.1, y: 44.0, r: 2.3 },
    { x: 93.2, y: 51.0, r: 2.4 },
    { x: 93.1, y: 58.0, r: 2.3 },
    { x: 93.2, y: 65.0, r: 2.4 },
    { x: 93.1, y: 72.0, r: 2.3 },
    { x: 93.2, y: 79.0, r: 2.3 },
    { x: 93.1, y: 86.0, r: 2.2 },
  ],
  bulbChase: { stepSec: 1.0, cycleSec: 12 },
  embers: [
    { x: 22, y: 78, delay: 0 },
    { x: 48, y: 85, delay: 1.8 },
    { x: 71, y: 80, delay: 3.2 },
    { x: 35, y: 90, delay: 4.6 },
    { x: 58, y: 76, delay: 6.1 },
    { x: 82, y: 88, delay: 7.4 },
  ],
  alt: "Vintage state-fair ICSPICY Slicer chili eating contest scoreboard sign",
  emptyMessage: "No scores yet — claim the first slat!",
};

/**
 * Pepper Patch sign (1024×1536) — no sub-header under banner; slats start higher.
 * Tune with ?lbDebug=1 in dev.
 */
const PEPPER_PATCH_SIGN: LeaderboardSignMap = {
  src: "/games/leaderboard-pepper-patch.webp",
  intrinsicWidth: 1024,
  intrinsicHeight: 1536,
  aspectRatio: 1024 / 1536,
  rowsOnSign: 8,
  board: { top: 40.5, bottom: 9.5, left: 15, right: 15 },
  columns: {
    rank: { left: 17.2, width: 12.5, align: "center" },
    name: { left: 33.0, width: 33.0, align: "left" },
    score: { left: 68.0, width: 11.0, align: "right" },
    dividerX: 31.0,
  },
  rows: [
    { y: 43.8, height: 5.2, rotate: -0.1 },
    { y: 49.8, height: 5.2, rotate: 0.08 },
    { y: 55.8, height: 5.2, rotate: -0.12 },
    { y: 61.8, height: 5.2, rotate: 0.1 },
    { y: 67.8, height: 5.2, rotate: -0.08 },
    { y: 73.8, height: 5.2, rotate: 0.12 },
    { y: 79.8, height: 5.2, rotate: -0.1 },
    { y: 85.8, height: 5.2, rotate: 0.06 },
  ],
  bulbsLeft: [
    { x: 7.0, y: 22.5, r: 2.3 },
    { x: 7.1, y: 29.0, r: 2.2 },
    { x: 7.0, y: 35.5, r: 2.3 },
    { x: 7.1, y: 42.0, r: 2.2 },
    { x: 7.0, y: 48.5, r: 2.3 },
    { x: 7.1, y: 55.0, r: 2.2 },
    { x: 7.0, y: 61.5, r: 2.3 },
    { x: 7.1, y: 68.0, r: 2.2 },
    { x: 7.0, y: 74.5, r: 2.2 },
    { x: 7.1, y: 81.0, r: 2.1 },
  ],
  bulbsRight: [
    { x: 93.0, y: 22.5, r: 2.3 },
    { x: 92.9, y: 29.0, r: 2.2 },
    { x: 93.0, y: 35.5, r: 2.3 },
    { x: 92.9, y: 42.0, r: 2.2 },
    { x: 93.0, y: 48.5, r: 2.3 },
    { x: 92.9, y: 55.0, r: 2.2 },
    { x: 93.0, y: 61.5, r: 2.3 },
    { x: 92.9, y: 68.0, r: 2.2 },
    { x: 93.0, y: 74.5, r: 2.2 },
    { x: 92.9, y: 81.0, r: 2.1 },
  ],
  bulbChase: { stepSec: 1.0, cycleSec: 12 },
  embers: [
    { x: 24, y: 76, delay: 0 },
    { x: 50, y: 83, delay: 1.8 },
    { x: 72, y: 78, delay: 3.2 },
    { x: 38, y: 88, delay: 4.6 },
    { x: 60, y: 74, delay: 6.1 },
    { x: 84, y: 86, delay: 7.4 },
  ],
  alt: "Vintage state-fair ICSPICY Pepper Patch harvest champions scoreboard sign",
  emptyMessage: "No harvests yet — claim the first slat!",
};

export const LEADERBOARD_SIGN_BY_GAME: Record<GameId, LeaderboardSignMap> = {
  slicer: SLICER_SIGN,
  "pepper-patch": PEPPER_PATCH_SIGN,
  crafter: SLICER_SIGN,
};

export function getLeaderboardSignMap(gameId: GameId): LeaderboardSignMap {
  return LEADERBOARD_SIGN_BY_GAME[gameId];
}

/** @deprecated Use getLeaderboardSignMap(gameId) */
export const LEADERBOARD_SIGN_IMAGE = SLICER_SIGN;

/** @deprecated Use getLeaderboardSignMap(gameId).board */
export const LEADERBOARD_SIGN_BOARD = SLICER_SIGN.board;

/** @deprecated Use getLeaderboardSignMap(gameId).columns */
export const LEADERBOARD_SIGN_COLUMNS = SLICER_SIGN.columns;

/** @deprecated Use getLeaderboardSignMap(gameId).rows */
export const LEADERBOARD_SIGN_ROWS = SLICER_SIGN.rows;

/** @deprecated Use getLeaderboardSignMap(gameId).bulbsLeft */
export const LEADERBOARD_SIGN_BULBS_LEFT = SLICER_SIGN.bulbsLeft;

/** @deprecated Use getLeaderboardSignMap(gameId).bulbsRight */
export const LEADERBOARD_SIGN_BULBS_RIGHT = SLICER_SIGN.bulbsRight;

/** @deprecated Use getLeaderboardSignMap(gameId).bulbChase */
export const LEADERBOARD_SIGN_BULB_CHASE = SLICER_SIGN.bulbChase;

/** @deprecated Use getLeaderboardSignMap(gameId).embers */
export const LEADERBOARD_SIGN_EMBERS = SLICER_SIGN.embers;

/** Dev-only: `?lbDebug=1` draws alignment boxes over the photo. */
export function isLeaderboardSignDebug(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("lbDebug");
}
