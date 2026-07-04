#!/usr/bin/env node
/**
 * generate-icons.mjs — builds favicon + PWA icons from the IC SPICY logo.
 *
 * Source: src/frontend/public/IconLogo.jpg (square, dark #161616 background)
 * Output (src/frontend/public/):
 *   favicon.ico            multi-size ICO (16/32/48, PNG-encoded entries)
 *   favicon-16x16.png, favicon-32x32.png
 *   apple-touch-icon.png   180×180 (iOS rounds corners itself — no padding)
 *   icon-192.png, icon-512.png
 *   icon-512-maskable.png  logo at ~70% centered on #161616 so Android's
 *                          maskable crop never clips the pepper
 *
 * Usage: node scripts/generate-icons.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "src", "frontend", "public");
const SRC = path.join(PUB, "IconLogo.jpg");
const BG = "#161616";

async function pngAt(size) {
  return sharp(SRC).resize(size, size, { fit: "cover" }).png().toBuffer();
}

/** Multi-size ICO with PNG-encoded images (supported by all modern browsers). */
function buildIco(entries) {
  // ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes each) + image data
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dirs = [];
  let offset = 6 + 16 * count;
  for (const { size, buf } of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, 1); // height
    dir.writeUInt8(0, 2); // palette
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // color planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(buf.length, 8); // image size
    dir.writeUInt32LE(offset, 12); // image offset
    dirs.push(dir);
    offset += buf.length;
  }
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.buf)]);
}

async function main() {
  const out = [];

  // Plain square resizes
  for (const [name, size] of [
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["apple-touch-icon.png", 180],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
  ]) {
    await fs.writeFile(path.join(PUB, name), await pngAt(size));
    out.push(`${name} (${size}×${size})`);
  }

  // Maskable: logo at ~70% centered on the brand background
  const inner = Math.round(512 * 0.7);
  const logo = await sharp(SRC).resize(inner, inner, { fit: "cover" }).png().toBuffer();
  const pad = Math.round((512 - inner) / 2);
  await fs.writeFile(
    path.join(PUB, "icon-512-maskable.png"),
    await sharp({
      create: { width: 512, height: 512, channels: 4, background: BG },
    })
      .composite([{ input: logo, top: pad, left: pad }])
      .png()
      .toBuffer(),
  );
  out.push("icon-512-maskable.png (512×512, 70% safe zone)");

  // Multi-size ICO
  const icoEntries = [];
  for (const size of [16, 32, 48]) {
    icoEntries.push({ size, buf: await pngAt(size) });
  }
  await fs.writeFile(path.join(PUB, "favicon.ico"), buildIco(icoEntries));
  out.push("favicon.ico (16+32+48 multi-size)");

  console.log(`✓ generated:\n  ${out.join("\n  ")}`);
}

main().catch((e) => {
  console.error("icon generation failed:", e);
  process.exit(1);
});
