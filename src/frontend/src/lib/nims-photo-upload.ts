import type { Backend } from "../backend";
import { compressImage } from "../utils/imageUtils";

export const MAX_NIMS_PHOTO_BYTES = 5 * 1024 * 1024;

export function buildNimsPhotoPath(plantId: bigint): string {
  return `nims-photos/${plantId.toString()}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
}

export function isNimsPhotoPath(path: string): boolean {
  return path.startsWith("nims-photos/");
}

/** Compress, upload to canister storedFiles, return storage path key. */
export async function uploadNimsPhoto(
  actor: Backend,
  plantId: bigint,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }
  if (file.size > MAX_NIMS_PHOTO_BYTES) {
    throw new Error("Image must be 5 MB or smaller");
  }
  const compressed = await compressImage(file);
  const data = new Uint8Array(await compressed.arrayBuffer());
  if (data.byteLength > MAX_NIMS_PHOTO_BYTES) {
    throw new Error("Compressed image still too large");
  }
  const path = buildNimsPhotoPath(plantId);
  await actor.storeNimsPhotoFile(path, data, "image/jpeg");
  return path;
}
