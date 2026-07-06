/**
 * Profile banner upload — mirrors avatar-upload.ts but targets a wide
 * 1500×500 banner. Compressed client-side, stored on the uploads canister
 * via the backend (storeProfileBannerFile, ≤2 MB, rate-limited).
 */
import type { ActorSubclass } from "@dfinity/agent";
import type { Backend } from "../backend";
import type { _SERVICE } from "../declarations/backend.did";

const MAX_BANNER_BYTES = 2_000_000;
const BANNER_W = 1500;
const BANNER_H = 500;
const BANNER_QUALITY = 0.85;

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

export function isBannerPath(path: string): boolean {
  return path.startsWith("banners/");
}

/** Cover-crop the image to 1500×500 JPEG. */
export async function compressBannerImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const targetW = Math.min(BANNER_W, img.width);
      const scale = Math.max(targetW / img.width, (targetW / 3) / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = Math.round(targetW / 3); // 3:1 → 1500×500
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      // Center the scaled image (cover behavior)
      ctx.drawImage(
        img,
        Math.round((canvas.width - w) / 2),
        Math.round((canvas.height - h) / 2),
        w,
        h,
      );
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        },
        "image/jpeg",
        BANNER_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

/** Compress + upload; the backend also sets it as the caller's banner. */
export async function uploadBanner(
  actor: Backend | null,
  file: File,
): Promise<string> {
  const svc = rawService(actor);
  if (!svc) throw new Error("Backend actor not connected");
  const blob = await compressBannerImage(file);
  if (blob.size > MAX_BANNER_BYTES) {
    throw new Error("Banner exceeds 2 MB after compression.");
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return svc.storeProfileBannerFile(bytes);
}
