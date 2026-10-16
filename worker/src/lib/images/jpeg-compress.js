/**
 * Compress Captain images for Crumbeatr Taggr blob limit (~450KB).
 * OWNER-PAID generation happens upstream; this step is local CPU only.
 */

import { createHash, randomBytes } from "crypto";
import sharp from "sharp";

export const CRUMBEATR_BLOB_MAX = 450_000;

/**
 * @param {Buffer} inputPngOrJpeg
 * @param {number} [maxBytes]
 * @returns {Promise<{ bytes: Buffer, mimeType: "image/jpeg", quality: number, width: number }>}
 */
export async function toJpegUnder(inputPngOrJpeg, maxBytes = CRUMBEATR_BLOB_MAX) {
  let width = 1024;
  let quality = 82;
  let bytes = null;

  for (let i = 0; i < 12; i++) {
    bytes = await sharp(inputPngOrJpeg)
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (bytes.length <= maxBytes) {
      return { bytes, mimeType: "image/jpeg", quality, width };
    }
    if (quality > 45) quality -= 8;
    else width = Math.max(512, Math.floor(width * 0.85));
  }

  bytes = await sharp(inputPngOrJpeg)
    .resize({ width: 512, height: 512, fit: "inside" })
    .jpeg({ quality: 40, mozjpeg: true })
    .toBuffer();
  if (bytes.length > maxBytes) {
    throw new Error(
      `JPEG still ${bytes.length} B after compress (limit ${maxBytes})`,
    );
  }
  return { bytes, mimeType: "image/jpeg", quality: 40, width: 512 };
}

/** Short Taggr blob id (< 9 chars). */
export function makeBlobId(seed = "") {
  const h = createHash("sha256")
    .update(String(seed))
    .update(randomBytes(4))
    .digest("hex");
  return h.slice(0, 8);
}
