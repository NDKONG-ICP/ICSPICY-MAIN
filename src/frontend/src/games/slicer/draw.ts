import type { IngredientKind } from "./constants";
import {
  SPRITE_DISPLAY_MAX,
  USE_VECTOR_FALLBACK,
  getAtlasImage,
  getFrame,
  type SpriteHalf,
} from "./atlas";

const INGREDIENT_COLORS: Record<
  IngredientKind,
  { main: string; accent: string; juice: string }
> = {
  lime: { main: "#4ade80", accent: "#166534", juice: "#86efac" },
  tomato: { main: "#ef4444", accent: "#991b1b", juice: "#fca5a5" },
  onion: { main: "#e9d5ff", accent: "#7e22ce", juice: "#f3e8ff" },
  garlic: { main: "#f8fafc", accent: "#cbd5e1", juice: "#e2e8f0" },
  mango: { main: "#fbbf24", accent: "#ea580c", juice: "#fde68a" },
  chili: { main: "#dc2626", accent: "#7f1d1d", juice: "#f87171" },
  rare_chili: { main: "#7c2d12", accent: "#4c0519", juice: "#fb7185" },
};

export function juiceColor(kind: IngredientKind): string {
  return INGREDIENT_COLORS[kind].juice;
}

/* ── Cached offscreen sprites (blade glow + ember ring) ─────────────── */

let bladeGlow: HTMLCanvasElement | null = null;
let emberRing: HTMLCanvasElement | null = null;
let fxReady = false;

/** Call once after atlas preload (or on first draw). */
export function initFxSprites(): void {
  if (fxReady) return;
  fxReady = true;

  // Soft orange glow blob — composited along blade trail (no shadowBlur).
  const bg = document.createElement("canvas");
  bg.width = 32;
  bg.height = 32;
  const bctx = bg.getContext("2d")!;
  const g = bctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.25, "rgba(251,146,60,0.85)");
  g.addColorStop(0.55, "rgba(249,115,22,0.35)");
  g.addColorStop(1, "rgba(249,115,22,0)");
  bctx.fillStyle = g;
  bctx.beginPath();
  bctx.arc(16, 16, 16, 0, Math.PI * 2);
  bctx.fill();
  bladeGlow = bg;

  // Superhot ember ring — cached radial gradient.
  const er = document.createElement("canvas");
  er.width = 96;
  er.height = 96;
  const ectx = er.getContext("2d")!;
  const eg = ectx.createRadialGradient(48, 48, 18, 48, 48, 46);
  eg.addColorStop(0, "rgba(251,146,60,0)");
  eg.addColorStop(0.45, "rgba(251,146,60,0.45)");
  eg.addColorStop(0.75, "rgba(239,68,68,0.25)");
  eg.addColorStop(1, "rgba(239,68,68,0)");
  ectx.fillStyle = eg;
  ectx.beginPath();
  ectx.arc(48, 48, 46, 0, Math.PI * 2);
  ectx.fill();
  emberRing = er;
}

export function drawEmberRing(
  ctx: CanvasRenderingContext2D,
  radius: number,
  alpha = 0.7,
): void {
  if (!emberRing) initFxSprites();
  if (!emberRing) return;
  const size = radius * 3.2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(emberRing, -size / 2, -size / 2, size, size);
  ctx.restore();
}

export function drawIngredient(
  ctx: CanvasRenderingContext2D,
  kind: IngredientKind,
  r: number,
  half: SpriteHalf,
): void {
  if (!USE_VECTOR_FALLBACK) {
    const img = getAtlasImage();
    const frame = getFrame(kind, half);
    if (img && frame) {
      const scale = SPRITE_DISPLAY_MAX / Math.max(frame.w, frame.h);
      const dw = frame.w * scale;
      const dh = frame.h * scale;
      // Scale so hit circle ≈ r (manifest hitRadius maps to display)
      const fit = (r * 2.1) / Math.max(dw, dh);
      const w = dw * fit;
      const h = dh * fit;
      ctx.drawImage(
        img,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        -w / 2,
        -h / 2,
        w,
        h,
      );
      return;
    }
  }
  drawIngredientVector(ctx, kind, r, half);
}

function drawHighlight(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.35, r * 0.22, r * 0.14, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Vector fallback — only used when atlas fails to load. */
function drawIngredientVector(
  ctx: CanvasRenderingContext2D,
  kind: IngredientKind,
  r: number,
  half: SpriteHalf,
): void {
  const c = INGREDIENT_COLORS[kind];
  ctx.save();
  if (half === "left") {
    ctx.scale(-1, 1);
    ctx.beginPath();
    ctx.rect(-r * 2, -r * 1.5, r * 2, r * 3);
    ctx.clip();
  } else if (half === "right") {
    ctx.beginPath();
    ctx.rect(-r * 2, -r * 1.5, r, r * 3);
    ctx.clip();
  }

  switch (kind) {
    case "lime":
      drawLime(ctx, r, c);
      break;
    case "tomato":
      drawTomato(ctx, r, c);
      break;
    case "onion":
      drawOnion(ctx, r, c);
      break;
    case "garlic":
      drawGarlic(ctx, r, c);
      break;
    case "mango":
      drawMango(ctx, r, c);
      break;
    case "chili":
    case "rare_chili":
      drawChili(ctx, r, c, kind === "rare_chili");
      break;
  }
  ctx.restore();
}

function drawLime(
  ctx: CanvasRenderingContext2D,
  r: number,
  c: { main: string; accent: string },
) {
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  g.addColorStop(0, "#86efac");
  g.addColorStop(0.6, c.main);
  g.addColorStop(1, c.accent);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  drawHighlight(ctx, r);
}

function drawTomato(
  ctx: CanvasRenderingContext2D,
  r: number,
  c: { main: string; accent: string },
) {
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.15, 0, 0, r);
  g.addColorStop(0, "#fca5a5");
  g.addColorStop(0.55, c.main);
  g.addColorStop(1, c.accent);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#15803d";
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.85);
  ctx.lineTo(0, -r * 1.1);
  ctx.lineTo(r * 0.35, -r * 0.85);
  ctx.closePath();
  ctx.fill();
  drawHighlight(ctx, r);
}

function drawOnion(
  ctx: CanvasRenderingContext2D,
  r: number,
  c: { main: string; accent: string },
) {
  for (let i = 4; i >= 0; i--) {
    const rr = r * (0.55 + i * 0.1);
    ctx.strokeStyle = i % 2 === 0 ? c.accent : c.main;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, rr, rr * 0.85, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGarlic(
  ctx: CanvasRenderingContext2D,
  r: number,
  c: { main: string; accent: string },
) {
  const g = ctx.createRadialGradient(0, r * 0.1, 0, 0, 0, r);
  g.addColorStop(0, "#fff");
  g.addColorStop(1, c.accent);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.85, r, 0, 0, Math.PI * 2);
  ctx.fill();
  drawHighlight(ctx, r);
}

function drawMango(
  ctx: CanvasRenderingContext2D,
  r: number,
  c: { main: string; accent: string },
) {
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, "#fde68a");
  g.addColorStop(0.45, c.main);
  g.addColorStop(1, c.accent);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 1.1, -r * 0.4, r * 0.9, r * 0.9, 0, r);
  ctx.bezierCurveTo(-r * 0.9, r * 0.9, -r * 1.1, -r * 0.4, 0, -r);
  ctx.fill();
  drawHighlight(ctx, r);
}

function drawChili(
  ctx: CanvasRenderingContext2D,
  r: number,
  c: { main: string; accent: string },
  rare: boolean,
) {
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, rare ? "#581c87" : c.accent);
  g.addColorStop(0.5, c.main);
  g.addColorStop(1, rare ? "#9f1239" : "#b91c1c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, r * 0.85);
  ctx.bezierCurveTo(-r * 0.9, r * 0.2, -r * 0.7, -r * 0.7, -r * 0.1, -r * 0.95);
  ctx.bezierCurveTo(r * 0.5, -r * 1.1, r * 0.85, -r * 0.3, r * 0.55, r * 0.5);
  ctx.bezierCurveTo(r * 0.35, r * 0.95, r * 0.1, r * 0.95, -r * 0.15, r * 0.85);
  ctx.fill();
  drawHighlight(ctx, r);
}

export interface SplatterDecal {
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
  rot: number;
}

export function drawSplatter(
  ctx: CanvasRenderingContext2D,
  d: SplatterDecal,
): void {
  ctx.save();
  ctx.globalAlpha = d.alpha;
  ctx.translate(d.x, d.y);
  ctx.rotate(d.rot);
  ctx.scale(d.scale, d.scale);
  ctx.fillStyle = d.color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const dist = 8 + (i % 3) * 4;
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * dist,
      Math.sin(a) * dist,
      4 + (i % 2) * 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Blade trail — composites cached glow sprites; no per-segment shadowBlur. */
export function drawBladeSegment(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  alpha: number,
): void {
  if (!bladeGlow) initFxSprites();
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Core white stroke (cheap, no blur)
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Glow sprites stamped along the segment
  if (bladeGlow) {
    const steps = Math.max(1, Math.ceil(len / 6));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      ctx.globalAlpha = alpha * 0.55;
      ctx.drawImage(bladeGlow, x - 10, y - 10, 20, 20);
    }
  }
  ctx.restore();
}

export function drawHeatRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
): void {
  if (!emberRing) initFxSprites();
  if (emberRing) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const size = r * 2;
    ctx.drawImage(emberRing, x - size / 2, y - size / 2, size, size);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r);
  g.addColorStop(0, "rgba(251,146,60,0)");
  g.addColorStop(0.6, "rgba(251,146,60,0.25)");
  g.addColorStop(1, "rgba(239,68,68,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface FrenzyOverlayParams {
  vignette: number;
  bloom: number;
  shimmer: number;
  focalX: number;
  focalY: number;
}

/** Screen-space post overlay — warm vignette, bloom pulse, heat shimmer. */
export function drawFrenzyCinematicOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cine: FrenzyOverlayParams,
): void {
  const { vignette, bloom, shimmer, focalX, focalY } = cine;
  if (vignette <= 0 && bloom <= 0 && shimmer <= 0) return;

  ctx.save();

  if (vignette > 0) {
    const vig = ctx.createRadialGradient(
      focalX,
      focalY,
      Math.min(w, h) * 0.12,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.72,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(0.55, `rgba(80,15,5,${0.12 * vignette})`);
    vig.addColorStop(1, `rgba(30,5,0,${0.55 * vignette})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  if (bloom > 0) {
    ctx.globalCompositeOperation = "screen";
    const pulse = bloom * (0.85 + Math.sin(performance.now() * 0.008) * 0.15);
    const bloomGrad = ctx.createRadialGradient(
      focalX,
      focalY,
      0,
      focalX,
      focalY,
      Math.min(w, h) * 0.38,
    );
    bloomGrad.addColorStop(0, `rgba(255,120,40,${0.22 * pulse})`);
    bloomGrad.addColorStop(0.45, `rgba(251,80,20,${0.1 * pulse})`);
    bloomGrad.addColorStop(1, "rgba(255,60,10,0)");
    ctx.fillStyle = bloomGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }

  if (shimmer > 0) {
    ctx.globalAlpha = shimmer * 0.35;
    ctx.globalCompositeOperation = "overlay";
    const shim = ctx.createLinearGradient(0, 0, w, h);
    shim.addColorStop(0, "rgba(255,180,80,0)");
    shim.addColorStop(0.48, "rgba(255,200,120,0.25)");
    shim.addColorStop(0.52, "rgba(255,140,60,0.2)");
    shim.addColorStop(1, "rgba(255,180,80,0)");
    ctx.fillStyle = shim;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
