#!/usr/bin/env node
/**
 * Optimize achievement badge art from art-src/badges/ → build/badges/*.webp
 * for upload to nft_assets at /badges/{badgeType}.webp
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "art-src/badges");
const OUT = path.join(ROOT, "build/badges");

/** badgeType → source stem (must exist under art-src/badges/) */
export const BADGE_TYPES = [
  "slicer-first-blood",
  "slicer-craft-batch",
  "slicer-reserve-batch",
  "slicer-legendary-batch",
  "slicer-frenzy-master",
  "slicer-reaper-hunter",
  "genesis",
  "founder",
];

const MAX_DIM = 512;
const MAX_BYTES = 80 * 1024;

async function findSource(stem) {
  for (const ext of [".JPG", ".jpg", ".PNG", ".png", ".webp"]) {
    const p = path.join(SRC, stem + ext);
    try {
      await fs.access(p);
      return p;
    } catch {
      /* next */
    }
  }
  return null;
}

async function encodeWebp(src, dest) {
  let quality = 82;
  let buf = await sharp(src)
    .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toBuffer();

  while (buf.byteLength > MAX_BYTES && quality > 50) {
    quality -= 6;
    buf = await sharp(src)
      .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toBuffer();
  }

  await fs.writeFile(dest, buf);
  const meta = await sharp(buf).metadata();
  return { bytes: buf.byteLength, width: meta.width ?? 0, height: meta.height ?? 0, quality };
}

await fs.mkdir(OUT, { recursive: true });

const missing = [];
const results = [];

for (const badgeType of BADGE_TYPES) {
  const src = await findSource(badgeType);
  if (!src) {
    missing.push(badgeType);
    continue;
  }
  const dest = path.join(OUT, `${badgeType}.webp`);
  const info = await encodeWebp(src, dest);
  results.push({ badgeType, ...info });
  console.log(
    `${badgeType}.webp  ${(info.bytes / 1024).toFixed(1)} KB  (${info.width}×${info.height}, q=${info.quality})`,
  );
}

if (missing.length > 0) {
  console.error("\nERROR: missing badge source files:");
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}

console.log(`\nBuilt ${results.length} badge assets → ${OUT}`);
