/**
 * Branded profile share card — 1080×1350 canvas (IG portrait), patterned
 * after VarietyGuideCard share cards.
 */
import {
  parseWallpaperKey,
  presetCanvasFill,
  type WallpaperPresetId,
} from "./profile-wallpapers";
import { uploadsUrl } from "./uploads-canister";
import { principalAvatarColor, principalInitials } from "./avatar-upload";

export type ProfileShareCardInput = {
  displayName: string;
  principalText: string;
  profileUrl: string;
  followerCount: number;
  plantsGrowing: number;
  isPepperhead: boolean;
  isRaven: boolean;
  avatarKey?: string;
  bannerKey?: string;
  wallpaperKey?: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  input: ProfileShareCardInput,
): Promise<void> {
  const parsed = parseWallpaperKey(input.wallpaperKey);
  if (parsed?.kind === "image") {
    try {
      const img = await loadImage(uploadsUrl(parsed.path));
      ctx.drawImage(img, 0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, w, h);
      return;
    } catch {
      /* fall through */
    }
  }
  if (parsed?.kind === "preset") {
    const fill = presetCanvasFill(parsed.id as WallpaperPresetId);
    if (fill) {
      fill(ctx, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, w, h);
      return;
    }
  }
  if (input.bannerKey) {
    try {
      const img = await loadImage(uploadsUrl(input.bannerKey));
      ctx.drawImage(img, 0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, w, h);
      return;
    } catch {
      /* fall through */
    }
  }
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#1c0a0a");
  g.addColorStop(0.5, "#450a0a");
  g.addColorStop(1, "#0a0202");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawAvatarFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  input: ProfileShareCardInput,
) {
  ctx.fillStyle = principalAvatarColor(input.principalText);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.round(r * 0.9)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    principalInitials(input.displayName, input.principalText),
    x,
    y,
  );
}

export async function renderProfileShareCard(
  input: ProfileShareCardInput,
): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  await drawBackdrop(ctx, W, H, input);

  const avatarR = 120;
  const avatarX = W / 2;
  const avatarY = 320;
  let drewAvatar = false;
  if (input.avatarKey) {
    try {
      const img = await loadImage(uploadsUrl(input.avatarKey));
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
      ctx.stroke();
      drewAvatar = true;
    } catch {
      /* fallback below */
    }
  }
  if (!drewAvatar) {
    drawAvatarFallback(ctx, avatarX, avatarY, avatarR, input);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "800 72px system-ui, sans-serif";
  const name =
    input.displayName.trim().length > 0
      ? input.displayName
      : `Grower ${input.principalText.slice(0, 8)}`;
  ctx.fillText(name.length > 22 ? `${name.slice(0, 20)}…` : name, W / 2, 520);

  ctx.font = "600 38px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  const badges: string[] = [];
  if (input.isPepperhead) badges.push("🌶️ PepperHead");
  if (input.isRaven) badges.push("🐦‍⬛ Raven");
  if (badges.length > 0) {
    ctx.fillText(badges.join("  ·  "), W / 2, 590);
  }

  ctx.font = "500 40px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(
    `${input.followerCount} followers  ·  ${input.plantsGrowing} plants growing`,
    W / 2,
    660,
  );

  ctx.font = "600 36px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("IC SPICY · Community Garden", W / 2, 740);

  try {
    const logo = await loadImage("/icon-192.png");
    ctx.drawImage(logo, 72, H - 200, 120, 120);
  } catch {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "700 40px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🌶️ IC SPICY", 72, H - 120);
  }

  try {
    const QRCode = (await import("qrcode")).default;
    const qr = await QRCode.toDataURL(input.profileUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#ffffff", light: "#00000000" },
    });
    const qrImg = await loadImage(qr);
    ctx.drawImage(qrImg, W - 272, H - 272, 200, 200);
  } catch {
    /* optional */
  }

  ctx.textAlign = "left";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("icspicy.app", 220, H - 108);

  return canvas.toDataURL("image/png");
}

export function downloadProfileShareCard(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
