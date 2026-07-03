/**
 * Device capability detection for the Garden Designer 3D scene.
 *
 * A tier is detected once per session from hardware signals (cores, memory,
 * WebGL max texture size). The FPS governor can downgrade the current tier at
 * runtime when sustained frame rate is poor; subscribers re-render with the
 * lighter settings.
 */
import { useSyncExternalStore } from "react";

export type DeviceTier = "low" | "mid" | "high";

export function detectDeviceTier(): DeviceTier {
  if (typeof window === "undefined") return "mid";
  const isMobile = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency || 2;
  const memory =
    (navigator as unknown as { deviceMemory?: number }).deviceMemory || 2;

  let maxTexture = 2048;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (gl) maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  } catch {
    /* keep conservative default */
  }

  if (!isMobile && cores >= 8 && memory >= 8 && maxTexture >= 8192)
    return "high";
  if (cores >= 4 && memory >= 4 && maxTexture >= 4096) return "mid";
  return "low";
}

export interface TierSettings {
  shadows: boolean;
  shadowMapSize: number;
  postProcessing: boolean;
  atmosphericParticles: boolean;
  windSway: boolean;
  maxPlantsBeforeInstancing: number;
  pixelRatio: number;
  satelliteTextureSize: number;
  antialiasing: boolean;
}

export function settingsForTier(tier: DeviceTier): TierSettings {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
  switch (tier) {
    case "high":
      return {
        shadows: true,
        shadowMapSize: 2048,
        postProcessing: true,
        atmosphericParticles: true,
        windSway: true,
        maxPlantsBeforeInstancing: 30,
        pixelRatio: Math.min(dpr, 2),
        satelliteTextureSize: 512,
        antialiasing: true,
      };
    case "mid":
      return {
        shadows: true,
        shadowMapSize: 1024,
        postProcessing: false,
        atmosphericParticles: false,
        windSway: true,
        maxPlantsBeforeInstancing: 20,
        pixelRatio: Math.min(dpr, 1.5),
        satelliteTextureSize: 512,
        antialiasing: true,
      };
    case "low":
      return {
        shadows: false,
        shadowMapSize: 512,
        postProcessing: false,
        atmosphericParticles: false,
        windSway: false,
        maxPlantsBeforeInstancing: 10,
        pixelRatio: 1,
        satelliteTextureSize: 256,
        antialiasing: false,
      };
  }
}

// ── Runtime tier store (supports FPS-based downgrade) ────────────────────────

let currentTier: DeviceTier | null = null;
const listeners = new Set<() => void>();

function ensureTier(): DeviceTier {
  if (currentTier === null) currentTier = detectDeviceTier();
  return currentTier;
}

export function getCurrentTier(): DeviceTier {
  return ensureTier();
}

export function getCurrentSettings(): TierSettings {
  return settingsForTier(ensureTier());
}

/** Non-reactive per-frame check (used inside useFrame loops). Cached. */
let windSwayCache: boolean | null = null;
export function isWindSwayEnabled(): boolean {
  if (windSwayCache === null)
    windSwayCache = settingsForTier(ensureTier()).windSway;
  return windSwayCache;
}

/**
 * Drop to the next lower tier (high → mid → low). Returns the new tier, or
 * null when already at the bottom.
 */
export function downgradeTier(): DeviceTier | null {
  const tier = ensureTier();
  const next: DeviceTier | null =
    tier === "high" ? "mid" : tier === "mid" ? "low" : null;
  if (next === null) return null;
  currentTier = next;
  windSwayCache = null;
  for (const cb of listeners) cb();
  return next;
}

export function subscribeTier(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Reactive hook — re-renders when the FPS governor downgrades the tier. */
export function useDeviceTier(): { tier: DeviceTier; settings: TierSettings } {
  const tier = useSyncExternalStore(
    subscribeTier,
    getCurrentTier,
    (): DeviceTier => "mid",
  );
  return { tier, settings: settingsForTier(tier) };
}
