#!/usr/bin/env node
/**
 * scrape-townsend.mjs — factual extraction from Towns-End Shopify catalog.
 * Uses public products.json API only — never stores body_html prose.
 *
 * Usage: node scripts/scrape-townsend.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractBreederFromText, hardcodedSource } from "./lib/provenance-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "vendor-townsend.json");
const BASE = "https://towns-endchiliandspice.com/products.json";

const SPECIES_RE =
  /\bC\.?\s*(annuum|chinense|baccatum|frutescens|pubescens)\b/i;
const SCOVILLE_RE =
  /(\d[\d,]*)\s*(?:,\s*\d[\d,]*)?\s*(?:SHU|scoville)/i;
const ORIGIN_RE =
  /\b(?:from|origin(?:ated)?(?:\s+in)?|native\s+to)\s+([A-Z][A-Za-z\s,]{2,40})/i;

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(raw) {
  let name = raw.trim();
  const isTE = /\(\s*T-E\s*\)/i.test(name);
  name = name.replace(/\(\s*T-E\s*\)/gi, "").trim();
  name = name.replace(/\(\s*Pepper\s+Seeds\s*\)/gi, "").trim();
  name = name.replace(/\(\s*Pepper\s+Guru\s*\)/gi, "").trim();
  name = name.replace(/\s+\(\s*[^)]+\)\s*$/g, "").trim();
  name = name.replace(/\s{2,}/g, " ");
  return { name, isTE };
}

function detectSpecies(text, tags, productType) {
  const blob = `${text} ${tags.join(" ")} ${productType}`.toLowerCase();
  const m = blob.match(SPECIES_RE);
  if (m) return `Capsicum ${m[1].toLowerCase()}`;
  for (const sp of ["chinense", "annuum", "baccatum", "frutescens", "pubescens"]) {
    if (blob.includes(sp)) return `Capsicum ${sp}`;
  }
  return null;
}

function detectHeatClass(text, tags) {
  const blob = `${text} ${tags.join(" ")}`.toLowerCase();
  if (/super\s*hot|extremely\s+hot|ultra\s+hot/.test(blob)) return "superhot";
  if (/very\s+hot|extra\s+hot|hot!/.test(blob)) return "very hot";
  if (/\bhot\b/.test(blob)) return "hot";
  if (/medium|mild-medium/.test(blob)) return "medium";
  if (/mild|sweet|no heat/.test(blob)) return "mild";
  if (tags.some((t) => /very hot|super hot|extremely hot/i.test(t))) {
    return tags.find((t) => /hot/i.test(t))?.toLowerCase() ?? "hot";
  }
  return null;
}

function detectScoville(text) {
  const m = text.match(SCOVILLE_RE);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function detectOrigin(text) {
  const m = text.match(ORIGIN_RE);
  return m ? m[1].trim().replace(/\.$/, "") : null;
}

async function fetchPage(page) {
  const url = `${BASE}?limit=250&page=${page}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "ICSPICY-Pepperpedia/1.0 (research)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for page ${page}`);
  return res.json();
}

async function main() {
  const products = [];
  for (let page = 1; ; page++) {
    const data = await fetchPage(page);
    if (!data.products?.length) break;
    products.push(...data.products);
    if (data.products.length < 250) break;
  }

  const out = products.map((p) => {
    const plain = stripHtml(p.body_html ?? "");
    const tags = Array.isArray(p.tags) ? p.tags : [];
    const { name, isTE } = cleanTitle(p.title ?? "");
    const species = detectSpecies(plain, tags, p.product_type ?? "");
    const heatClass = detectHeatClass(plain, tags);
    const scoville = detectScoville(plain);
    const origin = detectOrigin(plain);

    const { breeder, breederLocation } = extractBreederFromText(plain, p.title ?? "");
    const productUrl = `https://towns-endchiliandspice.com/products/${p.handle}`;

    return {
      name,
      species,
      heatClass,
      scoville,
      origin,
      breeder,
      breederLocation,
      isOriginalCultivar: isTE,
      sources: [hardcodedSource("townsend", productUrl)],
      sourceUrl: productUrl,
      imageUrl: p.images?.[0]?.src ?? null,
      photoSourceUrl: `https://towns-endchiliandspice.com/products/${p.handle}`,
      tags,
      productType: p.product_type ?? null,
      vendor: p.vendor ?? "Towns-End Chili & Spice",
    };
  });

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log(`✓ Towns-End: ${out.length} products → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
