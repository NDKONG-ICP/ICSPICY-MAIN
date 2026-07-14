#!/usr/bin/env node
/**
 * Convert art-src/games/arcade/* to WebP in public/games/arcade/
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "art-src/games/arcade");
const OUT = path.join(ROOT, "src/frontend/public/games/arcade");

/** @type {Record<string, { quality: number; maxWidth?: number }>} */
const TARGETS = {
  "midway-bg": { quality: 72, maxWidth: 1600 },
  "booth-slicer": { quality: 62, maxWidth: 800 },
  "booth-pepper-patch": { quality: 75, maxWidth: 900 },
  "booth-crafter": { quality: 75, maxWidth: 900 },
  "ticket-stub": { quality: 72, maxWidth: 640 },
  "prize-plaque": { quality: 78, maxWidth: 784 },
  "wood-brass-texture": { quality: 68, maxWidth: 640 },
};

async function findSource(stem) {
  for (const ext of [".PNG", ".JPG", ".png", ".jpg", ".jpeg", ".webp"]) {
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

await fs.mkdir(OUT, { recursive: true });
const report = [];

for (const [stem, cfg] of Object.entries(TARGETS)) {
  const src = await findSource(stem);
  if (!src) {
    console.error(`MISSING: ${stem}`);
    process.exit(1);
  }
  let pipe = sharp(src);
  if (cfg.maxWidth) {
    pipe = pipe.resize({ width: cfg.maxWidth, withoutEnlargement: true });
  }
  const dest = path.join(OUT, `${stem}.webp`);
  const info = await pipe.webp({ quality: cfg.quality, effort: 6 }).toFile(dest);
  report.push({ stem, bytes: info.size, width: info.width, height: info.height });
}

console.log("Arcade WebP assets:");
for (const r of report) {
  console.log(`  ${r.stem}.webp  ${(r.bytes / 1024).toFixed(1)} KB  (${r.width}×${r.height})`);
}
