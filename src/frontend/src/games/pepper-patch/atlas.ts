/**
 * Pepper Patch sprite atlas — single WebP + JSON manifest.
 * Falls back to SVG/emoji placeholders when load fails (USE_PLACEHOLDER_FALLBACK).
 */
import type { CSSProperties } from "react";
import atlasUrl from "./assets/atlas.webp";
import bgGardenUrl from "./assets/bg_garden.webp";
import manifest from "./assets/atlas.json";

export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  stem: string;
}

export interface AtlasManifest {
  version: number;
  width: number;
  height: number;
  frames: Record<string, AtlasFrame>;
  standalone?: Record<string, string>;
  heldForV2?: string[];
}

export type AtlasLoadState = "idle" | "loading" | "ready" | "error";

export type PodColor =
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "superhot";

export type GrowthSpriteKey =
  | "soil_empty"
  | "stage_seedling"
  | "stage_vegetative"
  | "stage_flowering"
  | "stage_wilted"
  | `fruiting_${PodColor}`;

let image: HTMLImageElement | null = null;
let loadState: AtlasLoadState = "idle";
let loadPromise: Promise<boolean> | null = null;

/** Set true only when atlas fails — keeps circle/emoji placeholders as safety net. */
export let USE_PLACEHOLDER_FALLBACK = false;

export const BG_GARDEN_URL = bgGardenUrl;
export const ATLAS_URL = atlasUrl;

export function getAtlasImage(): HTMLImageElement | null {
  return image;
}

export function getAtlasState(): AtlasLoadState {
  return loadState;
}

export function getManifest(): AtlasManifest {
  return manifest as AtlasManifest;
}

export function getFrame(stem: string): AtlasFrame | null {
  const f = (manifest as AtlasManifest).frames[stem];
  return f ?? null;
}

export function stageSpriteKey(
  stage: string,
  podColor: PodColor | null,
): GrowthSpriteKey | null {
  switch (stage) {
    case "empty":
      return "soil_empty";
    case "seedling":
      return "stage_seedling";
    case "vegetative":
      return "stage_vegetative";
    case "flowering":
      return "stage_flowering";
    case "wilted":
      return "stage_wilted";
    case "fruiting":
      return `fruiting_${podColor ?? "red"}`;
    default:
      return null;
  }
}

/** CSS sprite style for a frame scaled to fit maxEdge (preserving aspect). */
export function frameStyle(
  stem: string,
  maxEdge: number,
): CSSProperties | null {
  const f = getFrame(stem);
  if (!f) return null;
  const m = manifest as AtlasManifest;
  const scale = maxEdge / Math.max(f.w, f.h);
  const dw = Math.round(f.w * scale);
  const dh = Math.round(f.h * scale);
  return {
    width: dw,
    height: dh,
    backgroundImage: `url(${atlasUrl})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `${-Math.round(f.x * scale)}px ${-Math.round(f.y * scale)}px`,
    backgroundSize: `${Math.round(m.width * scale)}px ${Math.round(m.height * scale)}px`,
    imageRendering: "auto",
    flexShrink: 0,
  };
}

export function preloadAtlas(): Promise<boolean> {
  if (loadState === "ready" && image?.complete) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadState = "loading";
  loadPromise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      image = img;
      loadState = "ready";
      USE_PLACEHOLDER_FALLBACK = false;
      resolve(true);
    };
    img.onerror = () => {
      image = null;
      loadState = "error";
      USE_PLACEHOLDER_FALLBACK = true;
      console.warn("[pepper-patch] atlas load failed — using placeholder fallback");
      resolve(false);
    };
    img.src = atlasUrl;
  });
  return loadPromise;
}
