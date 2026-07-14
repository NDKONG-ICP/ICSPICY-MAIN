/**
 * Effect tier for arcade leaderboard visuals.
 *
 * Uses arcade-specific thresholds — NOT garden 3D tiering. Safari/iOS omits
 * `navigator.deviceMemory`, which previously caused modern iPhones to land on
 * "low" (static, no bulb chase).
 */
export type ArcadeEffectsTier = "full" | "lite" | "static";

export interface ArcadeDeviceSignals {
  cores: number;
  memoryReported: number | undefined;
  memoryEffective: number;
  isMobile: boolean;
  tier: ArcadeEffectsTier;
}

export function detectArcadeDeviceSignals(): ArcadeDeviceSignals {
  if (typeof window === "undefined") {
    return {
      cores: 4,
      memoryReported: undefined,
      memoryEffective: 4,
      isMobile: false,
      tier: "lite",
    };
  }

  const cores = navigator.hardwareConcurrency || 2;
  const memoryReported = (navigator as { deviceMemory?: number }).deviceMemory;
  const isMobile =
    window.innerWidth < 768 ||
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // iOS Safari omits deviceMemory — infer from core count instead of defaulting to 2.
  const memoryEffective = memoryReported ?? (cores >= 4 ? 4 : 2);

  let tier: ArcadeEffectsTier;
  if (cores < 3) {
    tier = "static";
  } else if (!isMobile && cores >= 8 && memoryEffective >= 8) {
    tier = "full";
  } else if (cores >= 4) {
    // Modern phones (incl. iPhone) — full marquee chase.
    tier = "full";
  } else {
    tier = "lite";
  }

  return { cores, memoryReported, memoryEffective, isMobile, tier };
}

export function arcadeEffectsForDevice(
  signals: Pick<ArcadeDeviceSignals, "cores" | "isMobile" | "memoryEffective">,
): ArcadeEffectsTier {
  const { cores, isMobile, memoryEffective } = signals;
  if (cores < 3) return "static";
  if (!isMobile && cores >= 8 && memoryEffective >= 8) return "full";
  if (cores >= 4) return "full";
  return "lite";
}

export function getArcadeEffectsTier(): ArcadeEffectsTier {
  return detectArcadeDeviceSignals().tier;
}

/** Dev / `?lbTier=1` — log tier signals once per mount. */
export function logArcadeDeviceTier(): ArcadeDeviceSignals {
  const signals = detectArcadeDeviceSignals();
  const show =
    import.meta.env.DEV ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("lbTier"));
  if (show) {
    console.info("[arcade-lb] device tier", signals);
  }
  return signals;
}
