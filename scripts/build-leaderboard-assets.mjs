#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "art-src/games");
const OUT = path.join(ROOT, "src/frontend/public/games");

const TARGETS = {
  "leaderboard-slicer": { quality: 72, maxWidth: 1080 },
  "leaderboard-pepper-patch": { quality: 72, maxWidth: 1080 },
  "leaderboard-crafter": { quality: 72, maxWidth: 1080 },
};

async function findSource(stem) {
  for (const ext of [".JPG", ".PNG", ".jpg", ".png", ".webp"]) {
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

for (const [stem, cfg] of Object.entries(TARGETS)) {
  const src = await findSource(stem);
  if (!src) {
    console.warn(`SKIP (missing): ${stem}`);
    continue;
  }
  const dest = path.join(OUT, `${stem}.webp`);
  const info = await sharp(src)
    .resize({ width: cfg.maxWidth, withoutEnlargement: true })
    .webp({ quality: cfg.quality, effort: 6 })
    .toFile(dest);
  console.log(
    `${stem}.webp  ${(info.size / 1024).toFixed(1)} KB  (${info.width}×${info.height})`,
  );
}
