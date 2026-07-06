#!/usr/bin/env node
/**
 * scrape-superhotchiles.mjs — WooCommerce factual extraction via Product JSON-LD.
 * Respects robots.txt crawl-delay (10s). Resumable progress file.
 *
 * Usage: node scripts/scrape-superhotchiles.mjs [--resume]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractBreederFromText, hardcodedSource } from "./lib/provenance-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "vendor-superhotchiles.json");
const PROGRESS = path.join(ROOT, "data", ".superhotchiles-progress.json");
const UA = "ICSPICY-Pepperpedia/1.0 (research; https://www.icspicy.app)";
const DELAY_MS = 10_000; // robots.txt Crawl-delay: 10

const CATEGORY_SPECIES = {
  annuum: "Capsicum annuum",
  baccatum: "Capsicum baccatum",
  chinense: "Capsicum chinense",
  frutescens: "Capsicum frutescens",
  pubescens: "Capsicum pubescens",
  superhots: "Capsicum chinense",
  superhot: "Capsicum chinense",
  milds: "Capsicum annuum",
  mild: "Capsicum annuum",
  ajis: "Capsicum baccatum",
  crosses: null,
  native: null,
};

const NAME_BREEDER_PATTERNS = [
  { pattern: /\b(?:7\s*pot|7pot)\s+primo\b/i, breeder: "Troy Primeaux" },
  { pattern: /\bpeach\s+reaper\b/i, breeder: "Ed Currie" },
  { pattern: /\bcarolina\s+reaper\b/i, breeder: "Ed Currie" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function inferSpecies(categories) {
  const cats = categories.map((c) => c.toLowerCase());
  for (const [key, latin] of Object.entries(CATEGORY_SPECIES)) {
    if (cats.some((c) => c.includes(key))) return latin;
  }
  return null;
}

function inferHeatClass(categories, name) {
  const blob = `${categories.join(" ")} ${name}`.toLowerCase();
  if (catsIncludes(categories, "superhot") || /reaper|scorpion|7\s*pot|primo|ghost|moruga/.test(blob)) {
    return "superhot";
  }
  if (catsIncludes(categories, "hot") || /\bhot\b/.test(blob)) return "hot";
  if (catsIncludes(categories, "mild")) return "mild";
  if (catsIncludes(categories, "medium")) return "medium";
  return null;
}

function catsIncludes(categories, needle) {
  return categories.some((c) => c.toLowerCase().includes(needle));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
  });
  return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : "" };
}

async function discoverProductUrls() {
  const sitemapCandidates = [
    "https://www.superhotchiles.com/wp-sitemap-posts-product-1.xml",
    "https://www.superhotchiles.com/product-sitemap.xml",
    "https://www.superhotchiles.com/wp-sitemap.xml",
  ];
  const urls = new Set();
  for (const sm of sitemapCandidates) {
    const { ok, text } = await fetchText(sm);
    if (!ok) continue;
    for (const m of text.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1].trim();
      if (u.includes("/product/") || u.match(/\/shop\/[^/]+\/?$/)) urls.add(u);
    }
    if (urls.size > 0) break;
    // Index sitemap — follow child sitemaps
    for (const m of text.matchAll(/<loc>([^<]*product[^<]*)<\/loc>/gi)) {
      const child = m[1].trim();
      const childRes = await fetchText(child);
      if (childRes.ok) {
        for (const cm of childRes.text.matchAll(/<loc>([^<]+)<\/loc>/g)) {
          urls.add(cm[1].trim());
        }
      }
      await sleep(1000);
    }
  }
  return [...urls].filter((u) => /product|\/shop\//.test(u));
}

function parseJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    try {
      const parsed = JSON.parse(b[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
          return item;
        }
        if (item["@graph"]) {
          const prod = item["@graph"].find(
            (g) => g["@type"] === "Product" || g["@type"]?.includes?.("Product"),
          );
          if (prod) return prod;
        }
      }
    } catch {
      /* next block */
    }
  }
  return null;
}

function extractCategories(product, html) {
  const cats = [];
  if (product.category) {
    if (typeof product.category === "string") cats.push(product.category);
    else if (Array.isArray(product.category)) cats.push(...product.category.map(String));
  }
  for (const m of html.matchAll(/class="[^"]*product_cat-([^"\s]+)/g)) {
    cats.push(m[1].replace(/-/g, " "));
  }
  return cats;
}

function extractImageUrl(ld) {
  if (!ld?.image) return null;
  if (typeof ld.image === "string") return ld.image;
  if (Array.isArray(ld.image)) {
    const first = ld.image[0];
    if (typeof first === "string") return first;
    if (first?.url) return String(first.url);
  }
  if (typeof ld.image === "object" && ld.image.url) return String(ld.image.url);
  return null;
}

async function main() {
  const resume = process.argv.includes("--resume");
  const imagesOnly = process.argv.includes("--images-only");
  let progress = { done: {}, results: [] };
  if (resume) {
    try {
      progress = JSON.parse(await fs.readFile(PROGRESS, "utf8"));
    } catch {
      /* fresh */
    }
  }

  if (imagesOnly) {
    let results = [];
    try {
      results = JSON.parse(await fs.readFile(OUT, "utf8"));
    } catch {
      console.error(`No ${OUT} — run full scrape first`);
      process.exit(1);
    }
    let updated = 0;
    for (const row of results) {
      if (row.imageUrl) continue;
      const { ok, text } = await fetchText(row.sourceUrl);
      if (!ok) continue;
      const ld = parseJsonLd(text);
      const imageUrl = extractImageUrl(ld);
      if (imageUrl) {
        row.imageUrl = imageUrl;
        row.photoSourceUrl = row.sourceUrl;
        updated++;
        console.log(`  ✓ image ${row.name}`);
      }
      await sleep(2000);
    }
    await fs.writeFile(OUT, JSON.stringify(results, null, 2), "utf8");
    console.log(`✓ Super Hot Chiles images: ${updated} added → ${OUT}`);
    return;
  }

  console.log("Discovering product URLs…");
  const urls = await discoverProductUrls();
  console.log(`Found ${urls.length} product URLs`);

  const results = progress.results ?? [];
  const done = new Set(Object.keys(progress.done ?? {}));

  for (const url of urls) {
    if (done.has(url)) continue;
    const { ok, status, text } = await fetchText(url);
    if (!ok) {
      console.warn(`  skip ${url} (${status})`);
      done.add(url);
      continue;
    }
    const ld = parseJsonLd(text);
    if (!ld?.name) {
      console.warn(`  no JSON-LD: ${url}`);
      done.add(url);
      await fs.writeFile(PROGRESS, JSON.stringify({ done: Object.fromEntries([...done].map((u) => [u, true])), results }, null, 2));
      await sleep(DELAY_MS);
      continue;
    }
    const categories = extractCategories(ld, text);
    const name = String(ld.name).trim();
    const imageUrl = extractImageUrl(ld);
    const { breeder, breederLocation } = extractBreederFromText("", name, {
      namePatterns: NAME_BREEDER_PATTERNS,
    });
    results.push({
      name,
      species: inferSpecies(categories),
      heatClass: inferHeatClass(categories, name),
      scoville: null,
      origin: null,
      breeder,
      breederLocation,
      isOriginalCultivar: false,
      sources: [hardcodedSource("superhotchiles", url)],
      sourceUrl: url,
      imageUrl,
      photoSourceUrl: url,
      tags: categories,
      productType: categories[0] ?? null,
      vendor: "Super Hot Chiles",
    });
    done.add(url);
    console.log(`  ✓ ${name} [${results.length}/${urls.length}]`);
    await fs.writeFile(
      PROGRESS,
      JSON.stringify({ done: Object.fromEntries([...done].map((u) => [u, true])), results }, null, 2),
    );
    await sleep(DELAY_MS);
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(results, null, 2), "utf8");
  console.log(`✓ Super Hot Chiles: ${results.length} products → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
