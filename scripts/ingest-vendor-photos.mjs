#!/usr/bin/env node
/**
 * ingest-vendor-photos.mjs — download vendor product photos, burn watermark,
 * upload to uploads canister, set varietyProvenance photoKey/photoCredit.
 *
 * Never writes un-watermarked files to disk (temp buffers only).
 *
 * Usage:
 *   node scripts/ingest-vendor-photos.mjs --network ic [--execute] [--force]
 *   node scripts/ingest-vendor-photos.mjs --network ic --execute --vendor townsend
 *   node scripts/ingest-vendor-photos.mjs --network ic --execute --limit 5
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { AssetManager } from "@dfinity/assets";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import sharp from "sharp";
import {
  AUTHORIZED_VENDORS,
  cleanSources,
  expectedPhotoDomain,
  hardcodedSource,
  photoCreditMatchesPrimarySource,
  sanitizeBreeder,
} from "./lib/provenance-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function arg(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return !v || v.startsWith("--") ? true : v;
}

let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];
const dryRun = !args.includes("--execute");
const force = args.includes("--force");
const fillMismatched = args.includes("--fill-mismatched");
const vendorFilter = arg("vendor"); // townsend | superhotchiles | all
const limit = arg("limit") ? Number(arg("limit")) : Infinity;

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();
const UPLOADS =
  network === "ic"
    ? "r53pg-maaaa-aaaao-ba7na-cai"
    : execSync(`dfx canister --network ${network} id uploads`).toString().trim();

const DELAY_MS = 800;

const VENDOR_META = {
  "Super Hot Chiles": {
    ...AUTHORIZED_VENDORS["superhotchiles.com"],
    file: "vendor-superhotchiles.json",
    key: "superhotchiles",
  },
  "Towns-End Chili & Spice": {
    ...AUTHORIZED_VENDORS["towns-endchiliandspice.com"],
    file: "vendor-townsend.json",
    key: "townsend",
  },
};

const VarietySource = IDL.Record({ vendorName: IDL.Text, url: IDL.Text });
const VarietyProvenance = IDL.Record({
  breeder: IDL.Opt(IDL.Text),
  breederLocation: IDL.Opt(IDL.Text),
  origin: IDL.Opt(IDL.Text),
  species: IDL.Opt(IDL.Text),
  heatClass: IDL.Opt(IDL.Text),
  sources: IDL.Vec(VarietySource),
  photoKey: IDL.Opt(IDL.Text),
  photoCredit: IDL.Opt(IDL.Text),
});
const VarietyProvenancePublic = IDL.Record({
  variety_id: IDL.Nat,
  breeder: IDL.Opt(IDL.Text),
  breederLocation: IDL.Opt(IDL.Text),
  origin: IDL.Opt(IDL.Text),
  species: IDL.Opt(IDL.Text),
  heatClass: IDL.Opt(IDL.Text),
  sources: IDL.Vec(VarietySource),
  photoKey: IDL.Opt(IDL.Text),
  photoCredit: IDL.Opt(IDL.Text),
});
const VarietyPublic = IDL.Record({
  id: IDL.Nat,
  name: IDL.Text,
  species: IDL.Text,
  scovilleMin: IDL.Nat,
  scovilleMax: IDL.Nat,
  description: IDL.Text,
  imageUrl: IDL.Opt(IDL.Text),
  daysToGermination: IDL.Opt(IDL.Nat),
  daysToMaturity: IDL.Opt(IDL.Nat),
  createdAt: IDL.Int,
});

const backendIDL = ({ IDL: I }) =>
  I.Service({
    listVarieties: I.Func([], [I.Vec(VarietyPublic)], ["query"]),
    listVarietyProvenance: I.Func([I.Nat, I.Nat], [I.Vec(VarietyProvenancePublic)], ["query"]),
    getVarietyProvenance: I.Func([I.Nat], [I.Opt(VarietyProvenance)], ["query"]),
    setVarietyProvenance: I.Func([I.Nat, VarietyProvenance], [I.Bool], []),
  });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(pepper|peppers|seeds|seed|plants|plant|pods|pod|chile|chili|hot)\b/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function optText(v) {
  return v != null && String(v).trim() ? [String(v).trim()] : [];
}

function trunc(s, max) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max);
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function watermarkSvg(width, height, vendorName, domain) {
  const fontSize = Math.max(14, Math.round(width * 0.023));
  const pad = Math.round(fontSize * 0.6);
  const bandW = Math.min(width * 0.72, fontSize * 22);
  const bandH = fontSize * 2.8;
  const x0 = width - bandW;
  const y0 = height - bandH;
  const text = `📷 ${vendorName} · ${domain}`;
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(0,0,0,0.55)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.25)"/>
    </linearGradient>
  </defs>
  <polygon points="${x0},${height} ${width},${height} ${width},${y0}" fill="url(#scrim)"/>
  <text x="${width - pad}" y="${height - pad}" font-family="system-ui,sans-serif" font-size="${fontSize}" fill="#ffffff" fill-opacity="0.7" text-anchor="end">${escapeXml(text)}</text>
</svg>`,
  );
}

async function processImage(inputBuffer, vendorName, domain, maxWidth) {
  const { data, info } = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
      fit: "inside",
    })
    .toBuffer({ resolveWithObject: true });

  const overlay = watermarkSvg(info.width, info.height, vendorName, domain);
  return sharp(data)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .webp({ quality: 80 })
    .toBuffer();
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "ICSPICY-Pepperpedia/1.0 (licensed photo ingestion; https://www.icspicy.app)",
      Accept: "image/*,*/*",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.startsWith("image/") && !url.match(/\.(jpe?g|png|webp|gif)/i)) {
    throw new Error(`Not an image (${ct || "unknown"})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function assetKey(relativePath) {
  return relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
}

async function uploadAsset(assetManager, keyPath, bytes, existing) {
  const key = assetKey(keyPath);
  if (existing.has(key) && !force) return false;
  const parts = keyPath.split("/").filter(Boolean);
  const fileName = parts.pop();
  const dir = parts.length > 0 ? `/${parts.join("/")}` : "";
  await assetManager.store(new Uint8Array(bytes), {
    path: dir,
    fileName,
    contentType: "image/webp",
    headers: [["Cache-Control", "public, max-age=31536000, immutable"]],
  });
  existing.add(key);
  return true;
}

function buildProvenanceFromRow(row, meta, photoKey, photoCredit) {
  const productUrl = row.sourceUrl ?? row.photoSourceUrl ?? meta.shopUrl;
  const rawSources =
    row.sources?.length > 0
      ? row.sources
      : [hardcodedSource(meta.key, productUrl) ?? { vendorName: meta.vendorName, url: productUrl }];
  const sources = cleanSources(rawSources);
  return {
    breeder: optText(sanitizeBreeder(trunc(row.breeder, 200))),
    breederLocation: optText(
      trunc(
        row.breederLocation ??
          (row.breeder?.includes("South Florida") ? "South Florida, USA" : null),
        200,
      ),
    ),
    origin: optText(trunc(row.origin, 200)),
    species: optText(trunc(row.species, 120)),
    heatClass: optText(trunc(row.heatClass, 40)),
    sources,
    photoKey: optText(trunc(photoKey, 300)),
    photoCredit: optText(trunc(photoCredit, 300)),
  };
}

function mergeProvenance(existing, patch) {
  if (!existing) return patch;
  const mergedSources = cleanSources([
    ...(existing.sources ?? []),
    ...(patch.sources ?? []),
  ]);
  return {
    breeder: existing.breeder?.length ? existing.breeder : patch.breeder,
    breederLocation: existing.breederLocation?.length
      ? existing.breederLocation
      : patch.breederLocation,
    origin: existing.origin?.length ? existing.origin : patch.origin,
    species: existing.species?.length ? existing.species : patch.species,
    heatClass: existing.heatClass?.length ? existing.heatClass : patch.heatClass,
    sources: mergedSources.length > 0 ? mergedSources : patch.sources,
    photoKey: patch.photoKey?.length ? patch.photoKey : existing.photoKey,
    photoCredit: patch.photoCredit?.length ? patch.photoCredit : existing.photoCredit,
  };
}

async function loadVendorRows() {
  const rows = [];
  for (const [vendorName, meta] of Object.entries(VENDOR_META)) {
    if (
      vendorFilter &&
      vendorFilter !== "all" &&
      meta.key !== vendorFilter
    ) {
      continue;
    }
    const fp = path.join(ROOT, "data", meta.file);
    try {
      const data = JSON.parse(await fs.readFile(fp, "utf8"));
      for (const row of data) {
        if (!row.imageUrl) continue;
        rows.push({ ...row, vendorName, meta, catalogDomain: meta.domain });
      }
      console.log(`  ${vendorName}: ${data.filter((r) => r.imageUrl).length} with imageUrl`);
    } catch {
      console.warn(`  ⚠ missing ${fp}`);
    }
  }
  return rows;
}

async function main() {
  console.log(
    `ingest-vendor-photos — ${dryRun ? "DRY RUN" : "EXECUTE"} (${network})`,
  );

  const vendorRows = await loadVendorRows();
  console.log(`Rows with imageUrl: ${vendorRows.length}`);

  const identityName = execSync("dfx identity whoami").toString().trim();
  const pem = await fs.readFile(
    path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem"),
    "utf8",
  );
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();

  const backend = Actor.createActor(backendIDL, { agent, canisterId: BACKEND });
  const assetManager = new AssetManager({ canisterId: UPLOADS, agent });
  const existingAssets = new Set((await assetManager.list()).map((a) => a.key));

  const varieties = await backend.listVarieties();
  const nameToId = new Map(
    varieties.map((v) => [normalizeName(v.name), v.id]),
  );

  const byNorm = new Map();
  for (const row of vendorRows) {
    const key = normalizeName(row.name);
    if (!key) continue;
    if (!byNorm.has(key)) byNorm.set(key, []);
    byNorm.get(key).push(row);
  }

  let processed = 0;
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let replaced = 0;
  const samples = [];
  const perVendor = {};

  async function processOne(varietyId, row, reason) {
    const meta = row.meta;
    const photoKey = `variety-photos/${varietyId.toString()}.webp`;
    const thumbKey = `variety-photos/${varietyId.toString()}-thumb.webp`;

    processed++;

    if (dryRun) {
      console.log(`  [dry-run] ${row.name} → ${photoKey}${reason ? ` (${reason})` : ""}`);
      uploaded++;
      perVendor[row.vendorName] = (perVendor[row.vendorName] ?? 0) + 1;
      if (reason === "mismatch") replaced++;
      return;
    }

    try {
      const raw = await downloadImage(row.imageUrl);
      const display = await processImage(
        raw,
        meta.displayName,
        meta.domain,
        1200,
      );
      const thumb = await processImage(
        raw,
        meta.displayName,
        meta.domain,
        400,
      );

      await uploadAsset(assetManager, photoKey, display, existingAssets);
      await uploadAsset(assetManager, thumbKey, thumb, existingAssets);

      const existingProv = await backend.getVarietyProvenance(varietyId);
      const patch = buildProvenanceFromRow(
        row,
        meta,
        photoKey,
        meta.photoCredit,
      );
      const merged = mergeProvenance(existingProv?.[0], patch);
      await backend.setVarietyProvenance(varietyId, merged);

      uploaded++;
      if (reason === "mismatch") replaced++;
      perVendor[row.vendorName] = (perVendor[row.vendorName] ?? 0) + 1;
      if (samples.length < 3) {
        samples.push({
          variety: row.name,
          id: varietyId.toString(),
          url: `https://${UPLOADS}.raw.icp0.io/${photoKey}`,
        });
      }
      console.log(`  ✓ ${row.name} (#${varietyId})${reason ? ` [${reason}]` : ""}`);
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${row.name}: ${e.message?.slice(0, 100)}`);
    }

    await sleep(DELAY_MS);
  }

  if (fillMismatched) {
    console.log("Mode: --fill-mismatched (replace photos where credit ≠ primary source)");
    const provById = new Map();
    for (let off = 0n; ; off += 500n) {
      const page = await backend.listVarietyProvenance(off, 500n);
      for (const p of page) provById.set(p.variety_id.toString(), p);
      if (page.length < 500) break;
    }

    for (const [norm, rows] of byNorm) {
      if (processed >= limit) break;
      const varietyId = nameToId.get(norm);
      if (varietyId == null) {
        skipped++;
        continue;
      }
      const prov = provById.get(varietyId.toString());
      const photoKey = prov?.photoKey?.[0];
      if (!photoKey) {
        skipped++;
        continue;
      }
      const expectedDomain = expectedPhotoDomain(prov?.sources ?? []);
      if (!expectedDomain) {
        skipped++;
        continue;
      }
      const credit = prov?.photoCredit?.[0] ?? "";
      if (photoCreditMatchesPrimarySource(credit, prov?.sources ?? [])) {
        skipped++;
        continue;
      }

      const row = rows.find((r) => r.catalogDomain === expectedDomain);
      if (!row) {
        skipped++;
        continue;
      }

      await processOne(varietyId, row, "mismatch");
    }
  } else {
    for (const [norm, rows] of byNorm) {
      if (processed >= limit) break;
      const varietyId = nameToId.get(norm);
      if (varietyId == null) {
        skipped++;
        continue;
      }

      const row = rows[0];
      const meta = row.meta;
      const photoKey = `variety-photos/${varietyId.toString()}.webp`;
      const mainExists = existingAssets.has(assetKey(photoKey));

      if (mainExists && !force) {
        skipped++;
        continue;
      }

      await processOne(varietyId, row);
    }
  }

  console.log("\n── Summary ──");
  console.log(`Processed: ${processed}, Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);
  if (fillMismatched) console.log(`Photo vendor mismatches replaced: ${replaced}`);
  for (const [v, n] of Object.entries(perVendor)) {
    console.log(`  ${v}: ${n} photos`);
  }
  if (samples.length) {
    console.log("\nSample URLs:");
    for (const s of samples) {
      console.log(`  ${s.variety} (#${s.id}): ${s.url}`);
    }
  }
  if (dryRun) {
    console.log("\nRe-run with --execute to apply.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
