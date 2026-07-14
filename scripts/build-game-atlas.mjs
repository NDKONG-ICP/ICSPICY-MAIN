#!/usr/bin/env node
/**
 * build-game-atlas.mjs
 *
 * Parameterized sprite atlas builder for IC SPICY games.
 *
 * Modes:
 *   flood-key  — edge-seeded BFS removes baked near-white backgrounds (Slicer)
 *   trim-only  — detect existing alpha; trim + resize only (Pepper Patch)
 *                NEVER re-key pre-keyed art (double-keying eats AA edges)
 *
 * Usage:
 *   node scripts/build-game-atlas.mjs --game slicer
 *   node scripts/build-game-atlas.mjs --game pepper-patch
 *   node scripts/build-game-atlas.mjs --in DIR --out DIR --mode trim-only [--name atlas]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MAX_DIM = 256;
const TOLERANCE = 18;
const PAD = 2;
const ATLAS_MAX_W = 1400;
const ALPHA_DETECT_THRESHOLD = 0.05; // ≥5% transparent → treat as pre-keyed

/** @typedef {'flood-key' | 'trim-only'} ProcessMode */

const SLICER_FILE_MAP = {
  chili_whole: { kind: "chili", half: "whole" },
  chili_left: { kind: "chili", half: "left" },
  chili_right: { kind: "chili", half: "right" },
  superhot_whole: { kind: "rare_chili", half: "whole" },
  superhot_left: { kind: "rare_chili", half: "left" },
  superhot_right: { kind: "rare_chili", half: "right" },
  onion_whole: { kind: "onion", half: "whole" },
  onion_left: { kind: "onion", half: "left" },
  onion_right: { kind: "onion", half: "right" },
  mango_whole: { kind: "mango", half: "whole" },
  mango_left: { kind: "mango", half: "left" },
  mango_right: { kind: "mango", half: "right" },
  garlic_whole: { kind: "garlic", half: "whole" },
  garlic_left: { kind: "garlic", half: "left" },
  garlic_right: { kind: "garlic", half: "right" },
  tomato_whole: { kind: "tomato", half: "whole" },
  tomato_left: { kind: "tomato", half: "left" },
  tomato_right: { kind: "tomato", half: "right" },
  lime_whole: { kind: "lime", half: "whole" },
  lime_left: { kind: "lime", half: "left" },
  lime_right: { kind: "lime", half: "right" },
};

const SLICER_ORDER = Object.keys(SLICER_FILE_MAP);

/** Current-game Pepper Patch sprites (v2 soil/weather/inputs included). */
const PEPPER_PATCH_ATLAS = [
  "stage_seedling",
  "stage_vegetative",
  "stage_flowering",
  "stage_wilted",
  "soil_empty",
  "soil_dry",
  "soil_moist",
  "soil_mulched",
  "fruiting_green",
  "fruiting_yellow",
  "fruiting_orange",
  "fruiting_red",
  "fruiting_superhot",
  "icon_water",
  "icon_feed",
  "icon_light",
  "icon_heatreserve",
  "icon_smallbatch",
  "fx_water",
  "fx_sparkle",
  "fx_harvest",
  "fx_microbes",
  "wx_rain",
  "wx_storm",
  "input_fpj",
  "input_ohn",
  "input_jlf",
  "input_calcium",
  "input_imo",
  "shed",
  "season_dial",
  "upgrade_sprinkler",
  "upgrade_growlight",
  "upgrade_compost",
  "plot_frame",
];

/** Opaque full-scene backgrounds — WebP only, never keyed, never atlas-packed. */
const PEPPER_PATCH_STANDALONE = ["bg_garden"];

const PEPPER_PATCH_HELD_V2 = [];

function parseArgs(argv) {
  const args = { game: null, in: null, out: null, mode: null, name: "atlas" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--game") args.game = argv[++i];
    else if (a === "--in") args.in = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--mode") args.mode = argv[++i];
    else if (a === "--name") args.name = argv[++i];
  }
  return args;
}

function resolveConfig(args) {
  if (args.game === "slicer") {
    return {
      game: "slicer",
      src: path.join(ROOT, "art-src", "slicer"),
      out: path.join(ROOT, "src", "frontend", "src", "games", "slicer", "assets"),
      mode: /** @type {ProcessMode} */ ("flood-key"),
      atlasName: "atlas",
      order: SLICER_ORDER,
      fileMap: SLICER_FILE_MAP,
      standalone: [],
      heldV2: [],
      preview: true,
      hitRadius: true,
    };
  }
  if (args.game === "pepper-patch") {
    return {
      game: "pepper-patch",
      src: path.join(ROOT, "art-src", "pepper-patch"),
      out: path.join(
        ROOT,
        "src",
        "frontend",
        "src",
        "games",
        "pepper-patch",
        "assets",
      ),
      mode: /** @type {ProcessMode} */ ("trim-only"),
      atlasName: "atlas",
      order: PEPPER_PATCH_ATLAS,
      fileMap: null,
      standalone: PEPPER_PATCH_STANDALONE,
      heldV2: PEPPER_PATCH_HELD_V2,
      preview: false,
      hitRadius: false,
    };
  }
  if (args.in && args.out && args.mode) {
    return {
      game: "custom",
      src: path.resolve(args.in),
      out: path.resolve(args.out),
      mode: /** @type {ProcessMode} */ (args.mode),
      atlasName: args.name || "atlas",
      order: null, // discover *.png minus standalone
      fileMap: null,
      standalone: [],
      heldV2: [],
      preview: false,
      hitRadius: false,
    };
  }
  console.error(
    "Usage: --game slicer|pepper-patch  OR  --in DIR --out DIR --mode flood-key|trim-only [--name atlas]",
  );
  process.exit(1);
}

function nearBg(r, g, b, br, bg, bb, tol) {
  return (
    Math.abs(r - br) <= tol &&
    Math.abs(g - bg) <= tol &&
    Math.abs(b - bb) <= tol
  );
}

function floodKey(rgba, width, height) {
  const data = Buffer.from(rgba);
  const n = width * height;
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  let br = 0,
    bg = 0,
    bb = 0;
  for (const i of corners) {
    br += data[i * 4];
    bg += data[i * 4 + 1];
    bb += data[i * 4 + 2];
  }
  br = Math.round(br / 4);
  bg = Math.round(bg / 4);
  bb = Math.round(bb / 4);

  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;

  const tryEnqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * 4;
    if (!nearBg(data[o], data[o + 1], data[o + 2], br, bg, bb, TOLERANCE))
      return;
    visited[i] = 1;
    queue[qt++] = i;
  };

  for (let x = 0; x < width; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  while (qh < qt) {
    const i = queue[qh++];
    const x = i % width;
    const y = (i / width) | 0;
    data[i * 4 + 3] = 0;
    tryEnqueue(x + 1, y);
    tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1);
    tryEnqueue(x, y - 1);
  }

  const removedRatio = qt / n;

  const feather = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (data[i * 4 + 3] === 0) continue;
      let adj = 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (data[(ny * width + nx) * 4 + 3] === 0) adj++;
      }
      if (adj > 0) feather[i] = adj;
    }
  }
  for (let i = 0; i < n; i++) {
    if (!feather[i]) continue;
    const a = data[i * 4 + 3];
    const factor = feather[i] >= 3 ? 0.35 : feather[i] === 2 ? 0.55 : 0.75;
    data[i * 4 + 3] = Math.max(0, Math.round(a * factor));
  }

  return { data, removedRatio, bg: [br, bg, bb] };
}

function measureAlpha(rgba) {
  let transparent = 0;
  const n = rgba.length / 4;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] < 128) transparent++;
  }
  return transparent / n;
}

async function processSprite(cfg, stem) {
  const file = path.join(cfg.src, `${stem}.png`);
  try {
    await fs.access(file);
  } catch {
    return { stem, ok: false, reason: "file missing" };
  }

  const { data: raw, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const existingAlpha = measureAlpha(raw);
  let work = raw;
  let removedRatio = 0;
  let bg = null;
  let modeUsed = cfg.mode;

  if (cfg.mode === "flood-key") {
    if (existingAlpha >= ALPHA_DETECT_THRESHOLD) {
      // Safety: already keyed — trim only (avoid double-key)
      modeUsed = "trim-only (auto: existing alpha)";
      removedRatio = existingAlpha;
    } else {
      const keyed = floodKey(raw, info.width, info.height);
      work = keyed.data;
      removedRatio = keyed.removedRatio;
      bg = keyed.bg;
      if (removedRatio > 0.85 || removedRatio < 0.2) {
        return {
          stem,
          ok: false,
          reason: `keying failed — removed ${(removedRatio * 100).toFixed(1)}% (need 20–85%)`,
          removedRatio,
          bg,
        };
      }
    }
  } else {
    // trim-only: require real alpha; never flood-fill
    if (existingAlpha < ALPHA_DETECT_THRESHOLD) {
      return {
        stem,
        ok: false,
        reason: `trim-only expected alpha ≥${ALPHA_DETECT_THRESHOLD * 100}%, got ${(existingAlpha * 100).toFixed(1)}% — refusing to flood-key`,
        removedRatio: existingAlpha,
      };
    }
    removedRatio = existingAlpha;
    modeUsed = "trim-only";
  }

  const trimmed = await sharp(work, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 4 })
    .toBuffer({ resolveWithObject: true });

  const tw = trimmed.info.width;
  const th = trimmed.info.height;
  const scale = Math.min(1, MAX_DIM / Math.max(tw, th));
  const rw = Math.max(1, Math.round(tw * scale));
  const rh = Math.max(1, Math.round(th * scale));

  const resized = await sharp(trimmed.data, {
    raw: { width: tw, height: th, channels: 4 },
  })
    .resize(rw, rh, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const fw = resized.info.width;
  const fh = resized.info.height;

  let preview = null;
  if (cfg.preview) {
    preview = await sharp({
      create: {
        width: fw,
        height: fh,
        channels: 4,
        background: { r: 120, g: 20, b: 20, alpha: 1 },
      },
    })
      .composite([
        {
          input: resized.data,
          raw: { width: fw, height: fh, channels: 4 },
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();
  }

  const meta = cfg.fileMap?.[stem] ?? null;
  return {
    stem,
    ok: true,
    kind: meta?.kind ?? stem,
    half: meta?.half ?? null,
    removedRatio,
    bg,
    modeUsed,
    width: fw,
    height: fh,
    buffer: resized.data,
    preview,
    hitRadius: cfg.hitRadius
      ? Math.max(18, Math.round((Math.max(fw, fh) / MAX_DIM) * 52 * 0.48))
      : null,
  };
}

async function encodeStandalone(cfg, stem) {
  const file = path.join(cfg.src, `${stem}.png`);
  const outPath = path.join(cfg.out, `${stem}.webp`);
  // Opaque scene background — resize for web, no keying, no atlas
  let buf = await sharp(file)
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toBuffer();
  for (const q of [70, 62, 54]) {
    if (buf.length <= 280 * 1024) break;
    buf = await sharp(file)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: q, effort: 6 })
      .toBuffer();
  }
  await fs.writeFile(outPath, buf);
  return { stem, path: outPath, bytes: buf.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = resolveConfig(args);

  await fs.mkdir(cfg.out, { recursive: true });
  const previewDir = path.join(cfg.src, ".preview");
  if (cfg.preview) await fs.mkdir(previewDir, { recursive: true });

  let order = cfg.order;
  if (!order) {
    const entries = await fs.readdir(cfg.src);
    order = entries
      .filter((f) => f.endsWith(".png") && !f.startsWith("."))
      .map((f) => f.replace(/\.png$/i, ""))
      .filter((s) => !cfg.standalone.includes(s))
      .sort();
  }

  // Fail fast if expected current-game sprites are missing
  const missing = [];
  for (const stem of order) {
    try {
      await fs.access(path.join(cfg.src, `${stem}.png`));
    } catch {
      missing.push(stem);
    }
  }
  for (const stem of cfg.standalone) {
    try {
      await fs.access(path.join(cfg.src, `${stem}.png`));
    } catch {
      missing.push(stem);
    }
  }
  if (missing.length) {
    console.error("STOP — missing expected sprites:", missing.join(", "));
    process.exit(1);
  }

  console.log(`Game: ${cfg.game}  mode: ${cfg.mode}  sprites: ${order.length}`);
  if (cfg.heldV2.length) {
    console.log(`Held for v2 (unused): ${cfg.heldV2.join(", ")}`);
  }

  const results = [];
  for (const stem of order) {
    process.stdout.write(`  ${cfg.mode} ${stem}… `);
    const r = await processSprite(cfg, stem);
    results.push(r);
    if (!r.ok) {
      console.log(`FAIL (${r.reason})`);
    } else {
      console.log(
        `OK alpha/removed=${(r.removedRatio * 100).toFixed(1)}% ${r.width}x${r.height} [${r.modeUsed}]`,
      );
      if (r.preview) {
        await fs.writeFile(path.join(previewDir, `${stem}.png`), r.preview);
      }
    }
  }

  const passing = results.filter((r) => r.ok);
  if (passing.length === 0) {
    console.error("No sprites passed — aborting.");
    process.exit(1);
  }

  const composites = [];
  const frames = {};
  let cursorX = PAD;
  let cursorY = PAD;
  let rowH = 0;
  let atlasW = PAD;
  let atlasH = PAD;

  for (const stem of order) {
    const r = results.find((x) => x.stem === stem);
    if (!r?.ok) continue;
    if (cursorX + r.width + PAD > ATLAS_MAX_W && cursorX > PAD) {
      cursorX = PAD;
      cursorY += rowH + PAD;
      rowH = 0;
    }
    const ox = cursorX;
    const oy = cursorY;
    composites.push({
      input: Buffer.from(r.buffer),
      raw: { width: r.width, height: r.height, channels: 4 },
      left: ox,
      top: oy,
    });
    const key =
      r.half != null ? `${r.kind}_${r.half}` : r.stem;
    frames[key] = {
      x: ox,
      y: oy,
      w: r.width,
      h: r.height,
      stem: r.stem,
      ...(r.half != null ? { kind: r.kind, half: r.half, hitRadius: r.hitRadius } : {}),
    };
    cursorX += r.width + PAD;
    rowH = Math.max(rowH, r.height);
    atlasW = Math.max(atlasW, cursorX);
    atlasH = Math.max(atlasH, cursorY + r.height + PAD);
  }

  async function encodeWebp(q, aq) {
    return sharp({
      create: {
        width: atlasW,
        height: atlasH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .webp({ quality: q, alphaQuality: aq, effort: 6 })
      .toBuffer();
  }

  let atlasBuf = await encodeWebp(70, 82);
  for (const [q, aq] of [
    [62, 78],
    [54, 72],
    [48, 68],
  ]) {
    if (atlasBuf.length <= 220 * 1024) break;
    atlasBuf = await encodeWebp(q, aq);
  }

  const atlasFile = `${cfg.atlasName}.webp`;
  const manifestFile = `${cfg.atlasName}.json`;
  const atlasPath = path.join(cfg.out, atlasFile);
  const manifestPath = path.join(cfg.out, manifestFile);
  await fs.writeFile(atlasPath, atlasBuf);

  const hitRadii = {};
  if (cfg.hitRadius) {
    for (const f of Object.values(frames)) {
      if (f.half === "whole") hitRadii[f.kind] = f.hitRadius;
    }
  }

  const standaloneResults = [];
  for (const stem of cfg.standalone) {
    process.stdout.write(`  standalone ${stem}… `);
    const s = await encodeStandalone(cfg, stem);
    standaloneResults.push(s);
    console.log(`OK ${(s.bytes / 1024).toFixed(1)} KB`);
  }

  const manifest = {
    version: 1,
    atlas: atlasFile,
    pack: "shelf",
    mode: cfg.mode,
    game: cfg.game,
    width: atlasW,
    height: atlasH,
    frames,
    ...(cfg.hitRadius ? { hitRadii } : {}),
    standalone: Object.fromEntries(
      standaloneResults.map((s) => [s.stem, `${s.stem}.webp`]),
    ),
    heldForV2: cfg.heldV2,
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  const kb = (atlasBuf.length / 1024).toFixed(1);
  console.log(`\nAtlas: ${atlasPath} (${kb} KB)`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Passing: ${passing.length}/${results.length}`);
  if (standaloneResults.length) {
    console.log(
      `Standalone: ${standaloneResults.map((s) => `${s.stem}=${(s.bytes / 1024).toFixed(1)}KB`).join(", ")}`,
    );
  }

  const report = {
    game: cfg.game,
    mode: cfg.mode,
    atlasBytes: atlasBuf.length,
    atlasKb: Number(kb),
    standalone: standaloneResults.map((s) => ({
      stem: s.stem,
      bytes: s.bytes,
    })),
    heldForV2: cfg.heldV2,
    passing: passing.map((r) => ({
      stem: r.stem,
      modeUsed: r.modeUsed,
      alphaPct: Number((r.removedRatio * 100).toFixed(1)),
      size: `${r.width}x${r.height}`,
    })),
    failed: results
      .filter((r) => !r.ok)
      .map((r) => ({ stem: r.stem, reason: r.reason })),
  };
  await fs.writeFile(
    path.join(cfg.out, `${cfg.atlasName}-build-report.json`),
    JSON.stringify(report, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
