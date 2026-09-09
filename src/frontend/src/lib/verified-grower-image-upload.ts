import type { Backend } from "../backend";
import { requireBackendRaw } from "./backend-raw";
import { compressImage } from "../utils/imageUtils";

export const MAX_VERIFIED_GROWER_IMAGE_BYTES = 2 * 1024 * 1024;

export function buildVerifiedGrowerImagePath(slug: string): string {
  return `verified-growers/${slug}.jpg`;
}

/** Compress, upload to uploads canister, return storage path key. */
export async function uploadVerifiedGrowerImage(
  actor: Backend,
  slug: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }
  if (file.size > MAX_VERIFIED_GROWER_IMAGE_BYTES) {
    throw new Error("Image must be 2 MB or smaller");
  }
  const compressed = await compressImage(file);
  const data = new Uint8Array(await compressed.arrayBuffer());
  if (data.byteLength > MAX_VERIFIED_GROWER_IMAGE_BYTES) {
    throw new Error("Compressed image still too large");
  }
  const path = buildVerifiedGrowerImagePath(slug);
  const raw = requireBackendRaw(actor);
  await raw.adminStoreVerifiedGrowerImage(path, data, "image/jpeg");
  return path;
}
