/**
 * Custom profile wallpaper upload — ≤2 MB JPEG to uploads canister via backend.
 */
import type { ActorSubclass } from "@dfinity/agent";
import type { Backend } from "../backend";
import type { _SERVICE } from "../declarations/backend.did";
const MAX_WALLPAPER_BYTES = 2_000_000;
const MAX_W = 1920;
const QUALITY = 0.85;

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

async function compressWallpaperImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, MAX_W / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        },
        "image/jpeg",
        QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

export async function uploadWallpaper(
  actor: Backend | null,
  file: File,
): Promise<string> {
  const svc = rawService(actor);
  if (!svc) throw new Error("Backend actor not connected");
  const blob = await compressWallpaperImage(file);
  if (blob.size > MAX_WALLPAPER_BYTES) {
    throw new Error("Wallpaper exceeds 2 MB after compression.");
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return svc.storeProfileWallpaperFile(bytes);
}
