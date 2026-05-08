#!/usr/bin/env node
// Generates the docs showcase catalog from docs/brand-pack into:
//   - src/docs_frontend/src/generated/documentCatalog.ts   (bundled TS catalog)
//   - src/docs_frontend/src/generated/documentMarkdown.ts   (bundled markdown bodies)
//   - scripts/seed-payload.json                             (seed payload for spicyai-seed.mjs)
// And copies the source PDFs/MD files into:
//   - src/docs_frontend/public/documents/<collection>/...
//
// NOTE: Catalog.mo generation removed — docs_backend is now stateful.
// Run `node scripts/spicyai-seed.mjs` after `dfx deploy` to load documents into the canister.
//
// Run with: node scripts/generate-docs-catalog.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const BRAND_PACK_DIR = path.join(ROOT, "docs", "brand-pack");
const EXPANDED_DIR = path.join(BRAND_PACK_DIR, "expanded-library");
const NATURAL_FARMING_DIR = path.join(ROOT, "docs", "natural-farming");

const FRONTEND_PUBLIC_DOCS = path.join(
  ROOT,
  "src",
  "docs_frontend",
  "public",
  "documents",
);
const FRONTEND_GEN_DIR = path.join(
  ROOT,
  "src",
  "docs_frontend",
  "src",
  "generated",
);
const SCRIPTS_DIR = path.join(ROOT, "scripts");

// ── Curation ─────────────────────────────────────────────────────────────────
// Hand-tuned ordering, categories, featured flags, tags. Source of truth for
// presentation. Slugs are derived from filenames (without extension).

const CATEGORIES = [
  {
    id: "vision",
    name: "Vision",
    description:
      "The flagship narrative: whitepaper, roadmap, pitch, and the one-page brand thesis.",
  },
  {
    id: "investor",
    name: "Investor",
    description:
      "Investor memo, due-diligence index, strategic partner brief, and grant application materials.",
  },
  {
    id: "retail",
    name: "Retail & Wholesale",
    description:
      "Buyer sell sheets, wholesale line sheets, distributor decks, demo scripts, and retail launch planning.",
  },
  {
    id: "brand",
    name: "Brand & Product",
    description:
      "SKU concepts, packaging copy, brand voice, product naming, and chef-built recipe cards.",
  },
  {
    id: "marketing",
    name: "Marketing & Content",
    description:
      "Market analysis, marketing strategy, content calendar, scripts, threads, video, email, and press.",
  },
  {
    id: "community",
    name: "Community",
    description:
      "X Spaces hosting and community moderation playbooks for live rooms and member channels.",
  },
  {
    id: "token",
    name: "NFT & Token",
    description:
      "PepperHead membership, NFT collector guidance, and SPICY token utility explainers.",
  },
  {
    id: "operations",
    name: "Operations",
    description:
      "Founder operating plan, food-safety claims, mainnet launch checklist, and the risk register.",
  },
  {
    id: "natural-farming",
    name: "Natural Farming",
    description:
      "KNF and JADAM methods for soil biology, fermented inputs, and growing rare peppers using Korean Natural Farming and JADAM organic techniques.",
  },
];

// File-stem → curation entry. Stem = filename without extension, identical
// for the .md and .pdf pair.
const CURATION = {
  // ── Brand pack root ────────────────────────────────────────────────────────
  IC_SPICY_Branded_Whitepaper: {
    collection: "brand-pack",
    category: "vision",
    featured: true,
    sortOrder: 1,
    tags: ["whitepaper", "thesis", "rwa", "icp", "vision"],
  },
  IC_SPICY_Roadmap: {
    collection: "brand-pack",
    category: "vision",
    featured: true,
    sortOrder: 2,
    tags: ["roadmap", "phases", "execution"],
  },
  IC_SPICY_Pitch_Deck: {
    collection: "brand-pack",
    category: "vision",
    featured: true,
    sortOrder: 3,
    tags: ["pitch", "deck", "investor"],
  },
  IC_SPICY_Marketing_Strategy: {
    collection: "brand-pack",
    category: "marketing",
    featured: false,
    sortOrder: 10,
    tags: ["strategy", "marketing", "go-to-market"],
  },
  IC_SPICY_Market_Analysis: {
    collection: "brand-pack",
    category: "marketing",
    featured: false,
    sortOrder: 11,
    tags: ["market", "analysis", "category"],
  },
  IC_SPICY_Marketing_Scripts: {
    collection: "brand-pack",
    category: "marketing",
    featured: false,
    sortOrder: 12,
    tags: ["scripts", "social", "voice"],
  },
  IC_SPICY_X_Spaces_Script: {
    collection: "brand-pack",
    category: "community",
    featured: false,
    sortOrder: 20,
    tags: ["x-spaces", "live", "script"],
  },
  IC_SPICY_X_Spaces_Shilling_Scripts_Extended: {
    collection: "brand-pack",
    category: "community",
    featured: false,
    sortOrder: 21,
    tags: ["x-spaces", "shilling", "live", "extended"],
  },
  // ── Expanded library ───────────────────────────────────────────────────────
  "01_Executive_Summary": {
    collection: "expanded-library",
    category: "vision",
    featured: true,
    sortOrder: 4,
    tags: ["executive", "summary", "intro"],
  },
  "02_Investor_Memo": {
    collection: "expanded-library",
    category: "investor",
    featured: false,
    sortOrder: 30,
    tags: ["investor", "memo", "diligence"],
  },
  "03_Data_Room_Index": {
    collection: "expanded-library",
    category: "investor",
    featured: false,
    sortOrder: 31,
    tags: ["data-room", "diligence", "index"],
  },
  "04_Strategic_Partner_Brief": {
    collection: "expanded-library",
    category: "investor",
    featured: false,
    sortOrder: 32,
    tags: ["partners", "brief", "strategic"],
  },
  "05_Grant_Application_Packet": {
    collection: "expanded-library",
    category: "investor",
    featured: false,
    sortOrder: 33,
    tags: ["grants", "application", "agriculture"],
  },
  "06_Retail_Buyer_Sell_Sheet": {
    collection: "expanded-library",
    category: "retail",
    featured: false,
    sortOrder: 40,
    tags: ["retail", "sell-sheet", "buyer"],
  },
  "07_Wholesale_Line_Sheet": {
    collection: "expanded-library",
    category: "retail",
    featured: false,
    sortOrder: 41,
    tags: ["wholesale", "line-sheet"],
  },
  "08_Distributor_Pitch_Deck": {
    collection: "expanded-library",
    category: "retail",
    featured: false,
    sortOrder: 42,
    tags: ["distributor", "pitch", "wholesale"],
  },
  "09_Grocery_Demo_Script": {
    collection: "expanded-library",
    category: "retail",
    featured: false,
    sortOrder: 43,
    tags: ["grocery", "demo", "script"],
  },
  "10_Retail_Launch_Calendar": {
    collection: "expanded-library",
    category: "retail",
    featured: false,
    sortOrder: 44,
    tags: ["retail", "launch", "calendar"],
  },
  "11_SKU_Concept_Sheets": {
    collection: "expanded-library",
    category: "brand",
    featured: false,
    sortOrder: 50,
    tags: ["sku", "concepts", "product"],
  },
  "12_Packaging_Copy_Guide": {
    collection: "expanded-library",
    category: "brand",
    featured: false,
    sortOrder: 51,
    tags: ["packaging", "copy", "label"],
  },
  "13_Brand_Voice_Guide": {
    collection: "expanded-library",
    category: "brand",
    featured: true,
    sortOrder: 5,
    tags: ["voice", "tone", "brand"],
  },
  "14_Product_Naming_System": {
    collection: "expanded-library",
    category: "brand",
    featured: false,
    sortOrder: 52,
    tags: ["naming", "product", "system"],
  },
  "15_Recipe_Cards": {
    collection: "expanded-library",
    category: "brand",
    featured: false,
    sortOrder: 53,
    tags: ["recipes", "chef", "cards"],
  },
  "16_Thirty_Day_Content_Calendar": {
    collection: "expanded-library",
    category: "marketing",
    featured: false,
    sortOrder: 60,
    tags: ["content", "calendar", "30-day"],
  },
  "17_X_Thread_Bank": {
    collection: "expanded-library",
    category: "marketing",
    featured: false,
    sortOrder: 61,
    tags: ["threads", "x", "bank"],
  },
  "18_Short_Form_Video_Scripts": {
    collection: "expanded-library",
    category: "marketing",
    featured: false,
    sortOrder: 62,
    tags: ["video", "shortform", "scripts"],
  },
  "19_Email_Launch_Sequence": {
    collection: "expanded-library",
    category: "marketing",
    featured: false,
    sortOrder: 63,
    tags: ["email", "launch", "sequence"],
  },
  "20_Press_Kit": {
    collection: "expanded-library",
    category: "marketing",
    featured: false,
    sortOrder: 64,
    tags: ["press", "media", "kit"],
  },
  "21_Influencer_Chef_Outreach_Kit": {
    collection: "expanded-library",
    category: "marketing",
    featured: false,
    sortOrder: 65,
    tags: ["influencer", "chef", "outreach"],
  },
  "22_PepperHead_Membership_Guide": {
    collection: "expanded-library",
    category: "token",
    featured: true,
    sortOrder: 6,
    tags: ["pepperhead", "membership", "nft"],
  },
  "23_NFT_Collector_Guide": {
    collection: "expanded-library",
    category: "token",
    featured: true,
    sortOrder: 7,
    tags: ["nft", "collector", "icrc-7"],
  },
  "24_SPICY_Utility_Explainer": {
    collection: "expanded-library",
    category: "token",
    featured: true,
    sortOrder: 8,
    tags: ["spicy", "token", "utility"],
  },
  "25_X_Spaces_Host_Pack": {
    collection: "expanded-library",
    category: "community",
    featured: false,
    sortOrder: 22,
    tags: ["x-spaces", "host", "pack"],
  },
  "26_Community_Moderation_Guide": {
    collection: "expanded-library",
    category: "community",
    featured: false,
    sortOrder: 23,
    tags: ["community", "moderation", "guide"],
  },
  "27_Founder_Operating_Plan": {
    collection: "expanded-library",
    category: "operations",
    featured: false,
    sortOrder: 70,
    tags: ["founder", "operations", "plan"],
  },
  "28_Retail_Readiness_Checklist": {
    collection: "expanded-library",
    category: "operations",
    featured: false,
    sortOrder: 71,
    tags: ["retail", "readiness", "checklist"],
  },
  "29_Food_Safety_Claims_Checklist": {
    collection: "expanded-library",
    category: "operations",
    featured: false,
    sortOrder: 72,
    tags: ["food-safety", "claims", "checklist"],
  },
  "30_Mainnet_Launch_Checklist": {
    collection: "expanded-library",
    category: "operations",
    featured: false,
    sortOrder: 73,
    tags: ["mainnet", "launch", "checklist"],
  },
  "31_Risk_Register": {
    collection: "expanded-library",
    category: "operations",
    featured: false,
    sortOrder: 74,
    tags: ["risk", "register", "operations"],
  },
  // ── Natural Farming library ────────────────────────────────────────────────
  NF_01_KNF_Foundations: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: true,
    sortOrder: 80,
    tags: ["knf", "korean-natural-farming", "master-cho", "cgnf", "foundations", "inputs"],
  },
  NF_02_KNF_IMO: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 81,
    tags: ["knf", "imo", "indigenous-microorganisms", "soil", "bacteria", "fungi"],
  },
  NF_03_KNF_LAB: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 82,
    tags: ["knf", "lab", "lactic-acid-bacteria", "fermented", "probiotic"],
  },
  NF_04_KNF_FPJ_FFJ: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 83,
    tags: ["knf", "fpj", "ffj", "fermented-plant-juice", "fermented-fruit-juice", "vegetative"],
  },
  NF_05_KNF_FAA: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 84,
    tags: ["knf", "faa", "fish-amino-acid", "nitrogen", "fermented", "vegetative"],
  },
  NF_06_KNF_OHN: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 85,
    tags: ["knf", "ohn", "oriental-herbal-nutrient", "herbs", "ginger", "garlic", "cinnamon"],
  },
  NF_07_KNF_WCA_WCP: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 86,
    tags: ["knf", "wca", "wcp", "calcium", "phosphate", "blossom-end-rot", "eggshell"],
  },
  NF_08_KNF_Seawater_BRV: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 87,
    tags: ["knf", "seawater", "brv", "brown-rice-vinegar", "minerals", "brix", "anthracnose"],
  },
  NF_09_KNF_Application_Guide: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: true,
    sortOrder: 88,
    tags: ["knf", "application", "schedule", "spray", "growth-stages", "calendar"],
  },
  NF_10_JADAM_Foundations: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: true,
    sortOrder: 89,
    tags: ["jadam", "youngsang-cho", "organic", "ultra-low-cost", "foundations"],
  },
  NF_11_JADAM_JMS: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 90,
    tags: ["jadam", "jms", "microorganism-solution", "soil", "leaf-mold", "potato"],
  },
  NF_12_JADAM_JS_JHS_JWA: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 91,
    tags: ["jadam", "js", "jadam-sulfur", "jhs", "herbal-solution", "jwa", "wetting-agent", "fungicide", "pesticide"],
  },
  NF_13_Pepper_Growing_Zone10a: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: true,
    sortOrder: 92,
    tags: ["pepper", "capsicum", "florida", "zone-10a", "growing", "varieties", "chinense", "baccatum"],
  },
  NF_14_Natural_Farming_For_Peppers: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: true,
    sortOrder: 93,
    tags: ["pepper", "knf", "jadam", "protocol", "superhot", "florida", "blossom-end-rot", "anthracnose"],
  },
  NF_15_Soil_Biology_Regenerative: {
    collection: "natural-farming",
    category: "natural-farming",
    featured: false,
    sortOrder: 94,
    tags: ["soil", "biology", "regenerative", "food-web", "matt-powers", "mycorrhizal", "humus", "organic-matter"],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dst) {
  await ensureDir(path.dirname(dst));
  await fs.copyFile(src, dst);
}

function slugFromStem(stem) {
  return stem
    .replace(/^IC_SPICY_/i, "")
    .replace(/^\d+_/, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function approxReadingMinutes(words) {
  return Math.max(1, Math.round(words / 230));
}

function parseMarkdown(raw) {
  const lines = raw.split(/\r?\n/);
  let title = "";
  let subtitle = "";
  let audience = "";
  for (const line of lines) {
    if (!title) {
      const m = line.match(/^#\s+(.+)$/);
      if (m) {
        title = m[1].trim();
        continue;
      }
    } else if (!subtitle) {
      const m = line.match(/^\*\*(.+)\*\*\s*$/);
      if (m) {
        subtitle = m[1].trim();
        continue;
      }
    } else if (!audience) {
      const m = line.match(/^\*([^*].*)\*\s*$/);
      if (m) {
        audience = m[1].trim();
        continue;
      }
    }
    if (title && subtitle && audience) break;
  }

  const sepIdx = lines.findIndex((l) => l.trim() === "---");
  const body =
    sepIdx >= 0 ? lines.slice(sepIdx + 1).join("\n").trim() : raw.trim();

  // Pull first non-heading non-blockquote paragraph from the body for summary.
  let summary = "";
  const paragraphs = body.split(/\n{2,}/);
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith(">")) continue;
    if (trimmed.startsWith("---")) continue;
    summary = trimmed.replace(/\s+/g, " ");
    break;
  }
  if (summary.length > 320) {
    summary = `${summary.slice(0, 317).trimEnd()}…`;
  }

  const wordCount = body
    .replace(/[#>*_`\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    title,
    subtitle,
    audience,
    summary,
    body,
    wordCount,
  };
}

// ── Motoko escaping ──────────────────────────────────────────────────────────

function moEscape(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function moTextArray(arr) {
  if (arr.length === 0) return "[]";
  return `[${arr.map((s) => `"${moEscape(s)}"`).join(", ")}]`;
}

// ── TS escaping ──────────────────────────────────────────────────────────────

function tsString(s) {
  return JSON.stringify(s);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Generating docs catalog…");

  // Wipe and recreate output dirs.
  await fs.rm(FRONTEND_PUBLIC_DOCS, { recursive: true, force: true });
  await fs.rm(FRONTEND_GEN_DIR, { recursive: true, force: true });
  await ensureDir(FRONTEND_PUBLIC_DOCS);
  await ensureDir(FRONTEND_GEN_DIR);

  // Discover .md files in all source dirs.
  const candidates = [];
  for (const dir of [BRAND_PACK_DIR, EXPANDED_DIR, NATURAL_FARMING_DIR]) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".md")) continue;
      if (entry.name.toLowerCase() === "readme.md") continue;
      const stem = entry.name.replace(/\.md$/, "");
      candidates.push({ dir, stem });
    }
  }

  const documents = [];
  const markdownByPath = {};

  for (const { dir, stem } of candidates) {
    const curated = CURATION[stem];
    if (!curated) {
      console.warn(`[skip] No curation entry for stem: ${stem}`);
      continue;
    }
    const mdSrc = path.join(dir, `${stem}.md`);
    const pdfSrc = path.join(dir, `${stem}.pdf`);
    const [mdStat, pdfStat] = await Promise.all([
      fs.stat(mdSrc).catch(() => null),
      fs.stat(pdfSrc).catch(() => null),
    ]);
    if (!mdStat) {
      console.warn(`[skip] Missing markdown: ${mdSrc}`);
      continue;
    }

    const raw = await fs.readFile(mdSrc, "utf8");
    const parsed = parseMarkdown(raw);

    const slug = slugFromStem(stem);
    const collection = curated.collection;
    const baseDst = path.join(FRONTEND_PUBLIC_DOCS, collection);
    const mdDst = path.join(baseDst, `${stem}.md`);
    const pdfDst = path.join(baseDst, `${stem}.pdf`);

    // Note: MD/PDF files are no longer copied to public/ — they are served
    // from the docs_backend canister via getDocumentMarkdown/getDocumentPdf.
    // The markdownPath/pdfPath fields are kept for backward compatibility but
    // are not used for asset-canister serving anymore.
    const markdownPath = `/documents/${collection}/${stem}.md`;
    const pdfPath = pdfStat ? `/documents/${collection}/${stem}.pdf` : "";
    const pdfBytes = pdfStat ? Number(pdfStat.size) : 0;

    documents.push({
      slug,
      title: parsed.title || stem.replace(/_/g, " "),
      subtitle: parsed.subtitle,
      audience: parsed.audience,
      summary: parsed.summary,
      collection,
      category: curated.category,
      pdfPath,
      markdownPath,
      tags: curated.tags,
      featured: !!curated.featured,
      sortOrder: curated.sortOrder,
      wordCount: parsed.wordCount,
      readingMinutes: approxReadingMinutes(parsed.wordCount),
      pdfBytes,
    });

    markdownByPath[markdownPath] = parsed.body;
  }

  documents.sort((a, b) => a.sortOrder - b.sortOrder);

  // ── Frontend: documentCatalog.ts ───────────────────────────────────────────
  const tsCategories = CATEGORIES.map(
    (c) => `  ${JSON.stringify(c)},`,
  ).join("\n");

  const tsDocuments = documents
    .map((d) => {
      const lines = [
        `  {`,
        `    slug: ${tsString(d.slug)},`,
        `    title: ${tsString(d.title)},`,
        `    subtitle: ${tsString(d.subtitle)},`,
        `    audience: ${tsString(d.audience)},`,
        `    summary: ${tsString(d.summary)},`,
        `    collection: ${tsString(d.collection)},`,
        `    category: ${tsString(d.category)},`,
        `    pdfPath: ${tsString(d.pdfPath)},`,
        `    markdownPath: ${tsString(d.markdownPath)},`,
        `    tags: ${JSON.stringify(d.tags)},`,
        `    featured: ${d.featured},`,
        `    sortOrder: ${d.sortOrder},`,
        `    wordCount: ${d.wordCount},`,
        `    readingMinutes: ${d.readingMinutes},`,
        `    pdfBytes: ${d.pdfBytes},`,
        `  },`,
      ];
      return lines.join("\n");
    })
    .join("\n");

  const generatedAt = new Date().toISOString();
  const totalWords = documents.reduce((acc, d) => acc + d.wordCount, 0);
  const totalPdfBytes = documents.reduce((acc, d) => acc + d.pdfBytes, 0);

  const tsContent = `/* eslint-disable */
// AUTO-GENERATED by scripts/generate-docs-catalog.mjs — do not edit.
// Generated at ${generatedAt}.

export interface DocumentSummary {
  slug: string;
  title: string;
  subtitle: string;
  audience: string;
  summary: string;
  collection: string;
  category: string;
  pdfPath: string;
  markdownPath: string;
  tags: string[];
  featured: boolean;
  sortOrder: number;
  wordCount: number;
  readingMinutes: number;
  pdfBytes: number;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description: string;
}

export interface DocumentStats {
  totalDocuments: number;
  totalCategories: number;
  totalWords: number;
  totalPdfBytes: number;
}

export const MANIFEST_VERSION = ${tsString(generatedAt)};

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
${tsCategories}
];

export const DOCUMENTS: DocumentSummary[] = [
${tsDocuments}
];

export const DOCUMENT_STATS: DocumentStats = {
  totalDocuments: ${documents.length},
  totalCategories: ${CATEGORIES.length},
  totalWords: ${totalWords},
  totalPdfBytes: ${totalPdfBytes},
};
`;

  await fs.writeFile(
    path.join(FRONTEND_GEN_DIR, "documentCatalog.ts"),
    tsContent,
    "utf8",
  );

  // ── Frontend: documentMarkdown.ts (inline body strings for instant render)
  const mdEntries = Object.entries(markdownByPath)
    .map(
      ([k, v]) => `  ${tsString(k)}: ${tsString(v)},`,
    )
    .join("\n");

  const mdTs = `/* eslint-disable */
// AUTO-GENERATED by scripts/generate-docs-catalog.mjs — do not edit.

export const MARKDOWN_BODIES: Record<string, string> = {
${mdEntries}
};
`;
  await fs.writeFile(
    path.join(FRONTEND_GEN_DIR, "documentMarkdown.ts"),
    mdTs,
    "utf8",
  );

  // ── Seed payload: scripts/seed-payload.json ───────────────────────────────
  // Consumed by scripts/spicyai-seed.mjs to populate the stateful docs_backend.

  // Build markdowns array: [(slug, markdownText)] for seedMarkdowns() call.
  const markdownsForSeed = Object.entries(markdownByPath).map(([mdPath, body]) => {
    // Reverse-map markdownPath → slug.
    const doc = documents.find((d) => d.markdownPath === mdPath);
    return doc ? [doc.slug, body] : null;
  }).filter(Boolean);

  const seedPayload = {
    generatedAt,
    categories: CATEGORIES,
    documents,
    markdowns: markdownsForSeed,  // [[slug, markdownText], ...]
  };

  await fs.writeFile(
    path.join(SCRIPTS_DIR, "seed-payload.json"),
    JSON.stringify(seedPayload, null, 2),
    "utf8",
  );

  console.log(
    `✓ Generated ${documents.length} documents across ${CATEGORIES.length} categories.`,
  );
  console.log(`  Frontend TS:    ${FRONTEND_GEN_DIR}`);
  console.log(`  Seed payload:   ${path.join(SCRIPTS_DIR, "seed-payload.json")}`);
  console.log(`  Public assets:  ${FRONTEND_PUBLIC_DOCS}`);
  console.log(`\nNext step: run 'node scripts/spicyai-seed.mjs' after dfx deploy docs_backend`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
