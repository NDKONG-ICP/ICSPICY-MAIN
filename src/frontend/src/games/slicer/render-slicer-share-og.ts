/**
 * Client-side 1200×630 OG plaque render for Slicer share cards.
 */
import { ARCADE_ASSETS } from "@/games/shared/arcade-assets";
import { PRIZE_PLAQUE_MAP } from "@/games/shared/prize-plaque-map";
import { formatShareScore } from "./slicer-share-copy";

const OG_W = 1200;
const OG_H = 630;

const RYE_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Rye&display=swap";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function ensureRyeFont(): Promise<void> {
  if (typeof document === "undefined") return;
  if (!document.querySelector(`link[href*="family=Rye"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = RYE_FONT_URL;
    document.head.appendChild(link);
  }
  if ("fonts" in document) {
    try {
      await document.fonts.load('700 48px "Rye"');
      await document.fonts.ready;
    } catch {
      /* fall back to serif stack */
    }
  }
}

function drawGradientBg(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, OG_W, OG_H);
  g.addColorStop(0, "#1c0a0a");
  g.addColorStop(0.45, "#450a0a");
  g.addColorStop(1, "#0a0202");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, OG_W, OG_H);
  const ember = ctx.createRadialGradient(OG_W * 0.82, OG_H * 0.35, 0, OG_W * 0.82, OG_H * 0.35, OG_W * 0.45);
  ember.addColorStop(0, "rgba(234, 88, 12, 0.35)");
  ember.addColorStop(1, "rgba(234, 88, 12, 0)");
  ctx.fillStyle = ember;
  ctx.fillRect(0, 0, OG_W, OG_H);
}

export type SlicerShareOgInput = {
  score: number;
  username: string;
  tierLabel: string;
};

export async function renderSlicerShareOgPng(
  input: SlicerShareOgInput,
): Promise<Blob> {
  await ensureRyeFont();

  const canvas = document.createElement("canvas");
  canvas.width = OG_W;
  canvas.height = OG_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  drawGradientBg(ctx);

  ctx.fillStyle = "#f97316";
  ctx.font = '700 28px "Rye", Rockwell, Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ICSPICY SLICER", OG_W / 2, 28);

  const plaque = await loadImage(ARCADE_ASSETS.prizePlaque);
  const plaqueH = OG_H * 0.78;
  const plaqueW = plaqueH * PRIZE_PLAQUE_MAP.aspectRatio;
  const plaqueX = (OG_W - plaqueW) / 2;
  const plaqueY = OG_H * 0.1;
  ctx.drawImage(plaque, plaqueX, plaqueY, plaqueW, plaqueH);

  const panel = PRIZE_PLAQUE_MAP.panel;
  const panelX = plaqueX + (panel.left / 100) * plaqueW;
  const panelY = plaqueY + (panel.top / 100) * plaqueH;
  const panelW = (panel.width / 100) * plaqueW;
  const panelH = (panel.height / 100) * plaqueH;

  const scoreText = formatShareScore(input.score);
  const scoreFontPx = Math.round(Math.min(panelW * 0.22, panelH * 0.55, 132));
  ctx.fillStyle = "#3d2914";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${scoreFontPx}px "Rye", Rockwell, Georgia, serif`;
  ctx.fillText(scoreText, panelX + panelW / 2, panelY + panelH * 0.42);

  const shuFontPx = Math.round(scoreFontPx * 0.28);
  ctx.font = `700 ${shuFontPx}px "Rye", Rockwell, Georgia, serif`;
  ctx.fillText("SHU", panelX + panelW / 2, panelY + panelH * 0.72);

  const handle = input.username.startsWith("@")
    ? input.username
    : `@${input.username}`;
  ctx.fillStyle = "#fafafa";
  ctx.font = '700 36px "Rye", Rockwell, Georgia, serif';
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 8;
  ctx.fillText(handle, OG_W / 2, OG_H - 52);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#fdba74";
  ctx.font = '600 22px "Rye", Rockwell, Georgia, serif';
  ctx.fillText(input.tierLabel.toUpperCase(), OG_W / 2, OG_H - 18);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG encode failed"))),
      "image/png",
      0.92,
    );
  });
}
