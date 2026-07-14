/**
 * Slicer sprite atlas loader — single WebP + JSON manifest.
 * Falls back to vector drawing when load fails (USE_VECTOR_FALLBACK).
 */
import type { IngredientKind } from "./constants";
import atlasUrl from "./assets/atlas.webp";
import manifest from "./assets/atlas.json";

export type SpriteHalf = "whole" | "left" | "right";

export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  hitRadius: number;
  kind: IngredientKind;
  half: SpriteHalf;
  stem: string;
}

export interface AtlasManifest {
  version: number;
  width: number;
  height: number;
  frames: Record<string, AtlasFrame>;
  hitRadii: Partial<Record<IngredientKind, number>>;
}

export type AtlasLoadState = "idle" | "loading" | "ready" | "error";

let image: HTMLImageElement | null = null;
let loadState: AtlasLoadState = "idle";
let loadPromise: Promise<boolean> | null = null;

/** Set true only when atlas fails — keeps vector paths as safety net. */
export let USE_VECTOR_FALLBACK = false;

export function getAtlasImage(): HTMLImageElement | null {
  return image;
}

export function getAtlasState(): AtlasLoadState {
  return loadState;
}

export function getManifest(): AtlasManifest {
  return manifest as AtlasManifest;
}

export function frameKey(kind: IngredientKind, half: SpriteHalf): string {
  return `${kind}_${half}`;
}

export function getFrame(
  kind: IngredientKind,
  half: SpriteHalf,
): AtlasFrame | null {
  const f = (manifest as AtlasManifest).frames[frameKey(kind, half)];
  return f ?? null;
}

export function hitRadiusFor(kind: IngredientKind): number {
  const r = (manifest as AtlasManifest).hitRadii[kind];
  return r ?? 25;
}

/** Display scale: atlas frame → on-canvas size (max edge ≈ 52px). */
export const SPRITE_DISPLAY_MAX = 52;

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
      USE_VECTOR_FALLBACK = false;
      resolve(true);
    };
    img.onerror = () => {
      image = null;
      loadState = "error";
      USE_VECTOR_FALLBACK = true;
      console.warn("[slicer] atlas load failed — using vector fallback");
      resolve(false);
    };
    img.src = atlasUrl;
  });
  return loadPromise;
}
