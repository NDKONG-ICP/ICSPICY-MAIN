/**
 * Post-process JPEG bytes into crisp pixel-art upscale (ICPixel-style previews).
 */

import sharp from "sharp";

/**
 * @param {Buffer|Uint8Array} jpegBytes
 * @param {{ grid?: number, scale?: number }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function pixelArtFromJpeg(jpegBytes, opts = {}) {
  const grid = opts.grid ?? 64;
  const scale = opts.scale ?? 16;
  const small = await sharp(Buffer.from(jpegBytes))
    .resize(grid, grid, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();
  return sharp(small)
    .resize(grid * scale, grid * scale, { kernel: sharp.kernel.nearest })
    .jpeg({ quality: 92 })
    .toBuffer();
}
