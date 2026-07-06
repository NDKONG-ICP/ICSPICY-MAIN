/**
 * Profile page wallpapers — 8 branded CSS presets (zero storage) or custom
 * uploads (img:profile-wallpapers/… on-chain).
 */
import type { CSSProperties } from "react";

export const WALLPAPER_PRESET_PREFIX = "preset:";
export const WALLPAPER_IMG_PREFIX = "img:";

export type WallpaperPresetId =
  | "ember"
  | "soil"
  | "greenhouse"
  | "scoville"
  | "midnight"
  | "harvest"
  | "ghost"
  | "reaper";

export const WALLPAPER_PRESETS: ReadonlyArray<{
  id: WallpaperPresetId;
  name: string;
  style: CSSProperties;
  /** Canvas fill for share cards (matches preset look). */
  canvasFill: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ) => void;
}> = [
  {
    id: "ember",
    name: "Ember",
    style: {
      background:
        "radial-gradient(ellipse 120% 80% at 50% 0%, #991b1b 0%, #450a0a 45%, #1a0505 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, h * 0.3, w);
      g.addColorStop(0, "#991b1b");
      g.addColorStop(0.45, "#450a0a");
      g.addColorStop(1, "#1a0505");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "soil",
    name: "Soil",
    style: {
      background:
        "radial-gradient(circle at 20% 80%, #3d2914 0%, #1c1410 50%, #0d0a08 100%)",
      backgroundImage:
        "repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px)",
    },
    canvasFill: (ctx, w, h) => {
      ctx.fillStyle = "#1c1410";
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w * 0.2, h * 0.8, 0, w * 0.5, h * 0.5, w);
      g.addColorStop(0, "#3d2914");
      g.addColorStop(1, "#0d0a08");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    style: {
      background:
        "linear-gradient(160deg, #052e16 0%, #14532d 40%, #0a1f12 100%)",
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(134,239,172,0.04) 0px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, rgba(134,239,172,0.04) 0px, transparent 1px, transparent 24px)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#052e16");
      g.addColorStop(0.4, "#14532d");
      g.addColorStop(1, "#0a1f12");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "scoville",
    name: "Scoville",
    style: {
      background: "linear-gradient(135deg, #7f1d1d 0%, #ea580c 50%, #fbbf24 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#7f1d1d");
      g.addColorStop(0.5, "#ea580c");
      g.addColorStop(1, "#fbbf24");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "midnight",
    name: "Midnight Garden",
    style: {
      background: "#050505",
      backgroundImage:
        "radial-gradient(circle at 50% 50%, rgba(34,197,94,0.06) 1px, transparent 1px)",
      backgroundSize: "28px 28px",
    },
    canvasFill: (ctx, w, h) => {
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(34,197,94,0.08)";
      for (let y = 0; y < h; y += 28) {
        for (let x = 0; x < w; x += 28) {
          ctx.beginPath();
          ctx.arc(x + 14, y + 14, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  },
  {
    id: "harvest",
    name: "Harvest",
    style: {
      background:
        "linear-gradient(180deg, #78350f 0%, #d97706 35%, #451a03 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#78350f");
      g.addColorStop(0.35, "#d97706");
      g.addColorStop(1, "#451a03");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "ghost",
    name: "Ghost",
    style: {
      background:
        "linear-gradient(145deg, #1e1b4b 0%, #4c1d95 40%, #312e81 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1e1b4b");
      g.addColorStop(0.4, "#4c1d95");
      g.addColorStop(1, "#312e81");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "reaper",
    name: "Reaper",
    style: {
      background:
        "radial-gradient(ellipse at 50% 100%, #450a0a 0%, #1a0000 60%, #000000 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h * 0.4, h);
      g.addColorStop(0, "#450a0a");
      g.addColorStop(0.6, "#1a0000");
      g.addColorStop(1, "#000000");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
];

export function presetWallpaperValue(id: WallpaperPresetId): string {
  return `${WALLPAPER_PRESET_PREFIX}${id}`;
}

export function parseWallpaperKey(
  value: string | null | undefined,
): { kind: "preset"; id: WallpaperPresetId } | { kind: "image"; path: string } | null {
  if (!value) return null;
  if (value.startsWith(WALLPAPER_PRESET_PREFIX)) {
    const id = value.slice(WALLPAPER_PRESET_PREFIX.length) as WallpaperPresetId;
    if (WALLPAPER_PRESETS.some((p) => p.id === id)) {
      return { kind: "preset", id };
    }
    return null;
  }
  if (value.startsWith(WALLPAPER_IMG_PREFIX)) {
    return { kind: "image", path: value.slice(WALLPAPER_IMG_PREFIX.length) };
  }
  return null;
}

export function presetWallpaperStyle(
  id: WallpaperPresetId,
): CSSProperties | undefined {
  return WALLPAPER_PRESETS.find((p) => p.id === id)?.style;
}

export function presetCanvasFill(
  id: WallpaperPresetId,
): ((ctx: CanvasRenderingContext2D, w: number, h: number) => void) | undefined {
  return WALLPAPER_PRESETS.find((p) => p.id === id)?.canvasFill;
}
