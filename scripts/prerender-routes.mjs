#!/usr/bin/env node
/**
 * prerender-routes.mjs — SEO Phase 2 build-time prerendering.
 *
 * Runs AFTER `vite build` (wired into the frontend `build` script). For every
 * route in the manifest it takes dist/index.html as a template and writes
 * dist/{route}/index.html with:
 *   - route-specific <title>, meta description, canonical, OG/Twitter tags
 *   - the route's JSON-LD (same data the React Seo components use, imported
 *     from src/frontend/src/lib/seo-routes.mjs so meta never drifts)
 *   - a crawlable content block (<div id="prerendered" hidden>) with real
 *     semantic HTML — recipes get name/description/ingredients/steps/FAQs
 *   - per-recipe branded 1200×630 OG cards rendered to dist/og/{slug}.png
 *
 * Recipe data is fetched live from the mainnet backend via anonymous query
 * calls. Network failure never breaks the build — static routes are still
 * prerendered and the script exits 0.
 *
 * Deploy order: pnpm build (sitemap → vite → copy:env → THIS SCRIPT) → dfx
 * deploy --network ic frontend. The asset canister aliases
 * /cookbook/foo → /cookbook/foo/index.html and falls back to /index.html for
 * unknown routes, so SPA navigation is unaffected.
 */
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STATIC_ROUTE_SEO,
  SITE_ORIGIN,
  recipeSeoMeta,
  recipeBreadcrumbJsonLd,
  faqPageJsonLd,
  guideSeoMeta,
  guideBreadcrumbJsonLd,
  guideHowToJsonLd,
  itemListJsonLd,
  staticRouteSeo,
} from "../src/frontend/src/lib/seo-routes.mjs";
import {
  buildFallbackGuide,
  guideSectionPlainText,
  DEFAULT_PRERENDER_CONDITIONS,
} from "../src/frontend/src/lib/variety-guide-fallback.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "src", "frontend", "dist");
const BACKEND_CANISTER = "ghxmp-xiaaa-aaaao-ba4sq-cai";
const HOST = "https://icp-api.io";

// ── Candid (minimal — width subtyping decodes only declared fields) ─────────
const RecipeCategory = IDL.Variant({
  KNF: IDL.Null,
  Composting: IDL.Null,
  SoilAmendment: IDL.Null,
  FermentedInputs: IDL.Null,
  PestControl: IDL.Null,
  PlantExtracts: IDL.Null,
  MicrobialCultures: IDL.Null,
  JADAM: IDL.Null,
  Other: IDL.Null,
});
const Ingredient = IDL.Record({
  name: IDL.Text,
  amount: IDL.Text,
  notes: IDL.Opt(IDL.Text),
  is_optional: IDL.Bool,
});
const RecipeStep = IDL.Record({
  step_number: IDL.Nat,
  instruction: IDL.Text,
  duration: IDL.Opt(IDL.Text),
  tips: IDL.Opt(IDL.Text),
});
const RecipeFull = IDL.Record({
  id: IDL.Nat,
  title: IDL.Text,
  slug: IDL.Text,
  description: IDL.Text,
  category: RecipeCategory,
  prep_time: IDL.Opt(IDL.Text),
  total_time: IDL.Opt(IDL.Text),
  ingredients: IDL.Vec(Ingredient),
  steps: IDL.Vec(RecipeStep),
  tags: IDL.Vec(IDL.Text),
  created_at: IDL.Int,
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
const FaqPair = IDL.Tuple(IDL.Text, IDL.Text);

const VarietySource = IDL.Record({
  vendorName: IDL.Text,
  url: IDL.Text,
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

const prerenderIDL = ({ IDL }) =>
  IDL.Service({
    getRecipes: IDL.Func(
      [IDL.Opt(RecipeCategory), IDL.Opt(IDL.Text), IDL.Nat, IDL.Nat],
      [IDL.Vec(RecipeFull)],
      ["query"],
    ),
    listRecipeSeoContent: IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text, IDL.Vec(FaqPair)))],
      ["query"],
    ),
    listRecipeVideoUrls: IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text))],
      ["query"],
    ),
    listVarieties: IDL.Func([], [IDL.Vec(VarietyPublic)], ["query"]),
    listVarietyProvenance: IDL.Func(
      [IDL.Nat, IDL.Nat],
      [IDL.Vec(VarietyProvenancePublic)],
      ["query"],
    ),
    listVarietyIntros: IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text))],
      ["query"],
    ),
  });

const CATEGORY_LABEL = {
  KNF: "KNF",
  JADAM: "JADAM",
  Composting: "Composting",
  PestControl: "Pest Control",
  SoilAmendment: "Soil Amendment",
  FermentedInputs: "Fermented Inputs",
  MicrobialCultures: "Microbial Cultures",
  PlantExtracts: "Plant Extracts",
  Other: "Other",
};

function categoryLabel(cat) {
  const key = Object.keys(cat)[0];
  return CATEGORY_LABEL[key] ?? "Other";
}

// ── HTML helpers ─────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace the content="…" of a <meta name|property="key" …> tag. */
function setMeta(html, key, value) {
  const re = new RegExp(
    `(<meta\\s+(?:name|property)="${escRe(key)}"[\\s\\S]*?content=")[\\s\\S]*?(")`,
  );
  return html.replace(re, `$1${esc(value)}$2`);
}

function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
}

function setCanonical(html, url) {
  return html.replace(
    /(<link rel="canonical" href=")[\s\S]*?(" \/>|"\/>|">)/,
    `$1${esc(url)}$2`,
  );
}

function injectHead(html, fragment) {
  return html.replace("</head>", `${fragment}\n  </head>`);
}

function injectBeforeRoot(html, fragment) {
  return html.replace('<div id="root">', `${fragment}\n    <div id="root">`);
}

function jsonLdScript(obj) {
  if (!obj) return "";
  const payload = Array.isArray(obj) && obj.length === 1 ? obj[0] : obj;
  // Escape closing tags inside JSON to keep the script element intact.
  const json = JSON.stringify(payload).replaceAll("</", "<\\/");
  return `<script type="application/ld+json">${json}</script>`;
}

/** Build one prerendered page from the template. */
function buildPage(template, { title, description, canonicalPath, ogImage, ogImageSize, ogType, jsonLds, crawlHtml, noIndex = false }) {
  const url = `${SITE_ORIGIN}${canonicalPath}`;
  let html = template;
  html = setTitle(html, title);
  html = setMeta(html, "description", description);
  html = setMeta(html, "og:title", title);
  html = setMeta(html, "og:description", description);
  html = setMeta(html, "og:url", url);
  html = setMeta(html, "twitter:title", title);
  html = setMeta(html, "twitter:description", description);
  html = setCanonical(html, url);
  if (noIndex) {
    html = injectHead(html, '    <meta name="robots" content="noindex, nofollow" />');
  }
  if (ogType) html = setMeta(html, "og:type", ogType);
  if (ogImage) {
    html = setMeta(html, "og:image", ogImage);
    html = setMeta(html, "twitter:image", ogImage);
    if (ogImageSize) {
      html = setMeta(html, "og:image:width", String(ogImageSize[0]));
      html = setMeta(html, "og:image:height", String(ogImageSize[1]));
    }
  }
  const headBits = (jsonLds ?? [])
    .filter(Boolean)
    .map((j) => `    ${jsonLdScript(j)}`)
    .join("\n");
  if (headBits) html = injectHead(html, headBits);
  if (crawlHtml) {
    html = injectBeforeRoot(
      html,
      `<div id="prerendered" hidden>\n${crawlHtml}\n    </div>`,
    );
  }
  return html;
}

async function writeRoute(routePath, html) {
  const dir =
    routePath === "/" ? DIST : path.join(DIST, ...routePath.split("/").filter(Boolean));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
}

// ── OG card generation (sharp rasterizes an SVG) ────────────────────────────
function wrapTitle(title, maxChars = 22) {
  const words = title.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = `${line} ${w}`.trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines.slice(0, 4);
}

function ogCardSvg(title, category) {
  const lines = wrapTitle(title);
  const fontSize = lines.length > 2 ? 72 : 84;
  const lineHeight = fontSize * 1.15;
  const startY = 315 - ((lines.length - 1) * lineHeight) / 2;
  const titleSpans = lines
    .map(
      (l, i) =>
        `<text x="80" y="${Math.round(startY + i * lineHeight)}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="900" fill="#fafafa">${esc(l)}</text>`,
    )
    .join("\n  ");
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="70%" stop-color="#0c0a09"/>
      <stop offset="100%" stop-color="#1c0a0a"/>
    </linearGradient>
    <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#7f1d1d"/>
      <stop offset="55%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="8" fill="url(#flame)"/>
  <circle cx="1050" cy="500" r="260" fill="#ef4444" opacity="0.07"/>
  <circle cx="1120" cy="120" r="160" fill="#fbbf24" opacity="0.05"/>
  <text x="80" y="120" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#ef4444" letter-spacing="6">IC SPICY COOKBOOK</text>
  <text x="80" y="170" font-family="Georgia, serif" font-size="24" fill="#a1a1aa" letter-spacing="2">${esc(category.toUpperCase())} · KOREAN NATURAL FARMING</text>
  ${titleSpans}
  <text x="80" y="560" font-family="Georgia, serif" font-size="26" fill="#71717a">🌶 icspicy.app — regenerative growing, free recipes</text>
</svg>`;
}

async function generateOgCard(sharp, slug, title, category) {
  const svg = ogCardSvg(title, category);
  const out = path.join(DIST, "og", `${slug}.png`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
}

const SLICER_TIER_OG = [
  { slug: "mild", label: "Mild Batch", accent: "#fbbf24" },
  { slug: "craft", label: "Craft Batch", accent: "#f97316" },
  { slug: "reserve", label: "Reserve Batch", accent: "#ef4444" },
  { slug: "legendary", label: "Legendary", accent: "#dc2626" },
];

function slicerTierOgSvg(tierLabel, accent) {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="70%" stop-color="#0c0a09"/>
      <stop offset="100%" stop-color="#1c0a0a"/>
    </linearGradient>
    <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#7f1d1d"/>
      <stop offset="55%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="8" fill="url(#flame)"/>
  <circle cx="1050" cy="500" r="260" fill="${accent}" opacity="0.12"/>
  <text x="80" y="120" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#f97316" letter-spacing="6">ICSPICY SLICER</text>
  <text x="80" y="170" font-family="Georgia, serif" font-size="24" fill="#a1a1aa" letter-spacing="2">ARCADE · ON-CHAIN SCORES</text>
  <text x="80" y="320" font-family="Georgia, serif" font-size="96" font-weight="900" fill="#fafafa">${esc(tierLabel)}</text>
  <text x="80" y="400" font-family="Georgia, serif" font-size="36" fill="#d4d4d8">Verified SHU · Replay-validated on ICP</text>
  <text x="80" y="560" font-family="Georgia, serif" font-size="26" fill="#71717a">🌶 icspicy.app/games/slicer — bet you can't beat it</text>
</svg>`;
}

async function generateSlicerTierOgCards(sharp) {
  await fs.mkdir(path.join(DIST, "og", "slicer"), { recursive: true });
  for (const tier of SLICER_TIER_OG) {
    const svg = slicerTierOgSvg(tier.label, tier.accent);
    const out = path.join(DIST, "og", "slicer", `${tier.slug}.png`);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  }
}

function formatScoville(max) {
  if (max >= 1_000_000) return `${(max / 1_000_000).toFixed(1)}M`;
  if (max >= 1_000) return `${Math.round(max / 1_000)}K`;
  return String(max);
}

function guideOgCardSvg(name, scovilleMax) {
  const lines = wrapTitle(name, 20);
  const fontSize = lines.length > 2 ? 68 : 80;
  const lineHeight = fontSize * 1.12;
  const startY = 300 - ((lines.length - 1) * lineHeight) / 2;
  const titleSpans = lines
    .map(
      (l, i) =>
        `<text x="80" y="${Math.round(startY + i * lineHeight)}" font-family="Georgia, serif" font-size="${fontSize}" font-weight="900" fill="#fafafa">${esc(l)}</text>`,
    )
    .join("\n  ");
  const badge =
    scovilleMax > 0
      ? `${formatScoville(scovilleMax)} SHU · KNF Guide`
      : "KNF Regenerative Growing Guide";
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14532d"/>
      <stop offset="55%" stop-color="#0c0a09"/>
      <stop offset="100%" stop-color="#1c0a0a"/>
    </linearGradient>
    <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#7f1d1d"/>
      <stop offset="55%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="8" fill="url(#flame)"/>
  <text x="80" y="110" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#86efac" letter-spacing="5">IC SPICY GROWING GUIDE</text>
  <text x="80" y="160" font-family="Georgia, serif" font-size="22" fill="#a1a1aa" letter-spacing="2">${esc(badge.toUpperCase())}</text>
  ${titleSpans}
  <text x="80" y="560" font-family="Georgia, serif" font-size="26" fill="#71717a">🌶 icspicy.app — 387 KNF variety guides</text>
</svg>`;
}

async function generateGuideOgCard(sharp, varietyId, name, scovilleMax) {
  const svg = guideOgCardSvg(name, scovilleMax);
  const out = path.join(DIST, "og", `guide-${varietyId}.png`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
}

/** Simple bounded-concurrency worker pool. */
async function poolMap(items, fn, concurrency = 8) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

const RECIPE_TOKEN_RE = /\[recipe:(\d+)\]/g;

function formatGuideContentHtml(content, recipeById) {
  const placeholders = new Map();
  let n = 0;
  let s = content.replace(RECIPE_TOKEN_RE, (match, id) => {
    const r = recipeById.get(id);
    if (!r) return "";
    const key = `\x00R${n++}\x00`;
    placeholders.set(key, r);
    return key;
  });
  s = esc(s);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  for (const [key, r] of placeholders) {
    s = s.replace(
      key,
      `<a href="/cookbook/${encodeURIComponent(r.slug)}">${esc(r.title)}</a>`,
    );
  }
  return s
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function varietyToGuideInput(v) {
  return {
    id: v.id,
    name: v.name,
    species: v.species,
    scovilleMax: Number(v.scovilleMax),
    daysToMaturity:
      v.daysToMaturity.length === 1 ? Number(v.daysToMaturity[0]) : null,
    description: v.description ?? "",
  };
}

function guideCrawlHtml(variety, sections, recipeById) {
  const scoville = Number(variety.scovilleMax);
  const days =
    variety.daysToMaturity.length === 1
      ? Number(variety.daysToMaturity[0])
      : null;
  const stats = [`Species: ${esc(variety.species)}`];
  if (scoville > 0) stats.push(`Heat: up to ${scoville.toLocaleString()} SHU`);
  if (days != null) stats.push(`Days to maturity: ~${days}`);
  const statsHtml = stats.map((s) => `<li>${s}</li>`).join("\n");
  const sectionsHtml = sections
    .map((sec) => {
      const timing = sec.timing
        ? `<p><em>Timing: ${esc(sec.timing)}</em></p>`
        : "";
      return `      <section>
        <h2>${esc(sec.title)}</h2>
${timing}
        ${formatGuideContentHtml(sec.content, recipeById)}
      </section>`;
    })
    .join("\n");
  return `      <main>
      <h1>How to Grow ${esc(variety.name)}</h1>
      <ul>${statsHtml}</ul>
${sectionsHtml}
      </main>
      ${NAV_LINKS}`;
}

function guidesIndexCrawlHtml(varieties) {
  const sorted = [...varieties].sort((a, b) => a.name.localeCompare(b.name));
  const links = sorted
    .map(
      (v) =>
        `        <li><a href="/variety/${v.id.toString()}/guide">${esc(v.name)}</a></li>`,
    )
    .join("\n");
  return `      <main>
      <h1>387 Regenerative Growing Guides</h1>
      <p>KNF-powered growing guides for every variety in the NIMS catalog — soil prep, planting, nutrition, pest control, and harvest.</p>
      <ul>
${links}
      </ul>
      </main>
      ${NAV_LINKS}`;
}

function cookbookIndexCrawlHtml(recipes) {
  const links = recipes
    .map(
      (r) =>
        `        <li><a href="/cookbook/${encodeURIComponent(r.slug)}">${esc(r.title)}</a></li>`,
    )
    .join("\n");
  return `      <main>
      <h1>IC SPICY Natural Farming CookBook</h1>
      <p>Free Korean Natural Farming and JADAM recipes for regenerative growing.</p>
      <ul>
${links}
      </ul>
      </main>
      ${NAV_LINKS}`;
}

function buildRssFeed(recipes, seoContent) {
  const items = recipes
    .map((r) => {
      const label = categoryLabel(r.category);
      const extra = seoContent.get(r.id.toString());
      const intro = extra?.intro?.length > 0 ? extra.intro : r.description;
      const link = `${SITE_ORIGIN}/cookbook/${encodeURIComponent(r.slug)}`;
      return `    <item>
      <title>${esc(r.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${esc(intro.slice(0, 500))}</description>
      <category>${esc(label)}</category>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>IC SPICY CookBook — KNF &amp; JADAM Recipes</title>
    <link>${SITE_ORIGIN}/cookbook</link>
    <description>Free Korean Natural Farming and JADAM recipes from IC SPICY.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;
}

// ── Crawlable content blocks ────────────────────────────────────────────────
const NAV_LINKS = `<nav><ul>
      <li><a href="/">IC SPICY Home</a></li>
      <li><a href="/marketplace">Shop Pepper Plants</a></li>
      <li><a href="/cookbook">Natural Farming CookBook</a></li>
      <li><a href="/nims">NIMS Plant Tracker</a></li>
      <li><a href="/weather">Florida Weather Desk</a></li>
      <li><a href="/garden">3D Garden Designer</a></li>
    </ul></nav>`;

function staticCrawlHtml(entry) {
  const paragraphs = entry.crawlParagraphs
    .map((p) => `      <p>${esc(p)}</p>`)
    .join("\n");
  return `      <main>
      <h1>${esc(entry.title)}</h1>
${paragraphs}
      </main>
      ${NAV_LINKS}`;
}

function recipeCrawlHtml(recipe, intro, faqs) {
  const label = categoryLabel(recipe.category);
  const ingredients = recipe.ingredients
    .map((i) => `        <li>${esc(`${i.amount} ${i.name}`.trim())}</li>`)
    .join("\n");
  const steps = [...recipe.steps]
    .sort((a, b) => Number(a.step_number) - Number(b.step_number))
    .map((s) => `        <li>${esc(s.instruction)}</li>`)
    .join("\n");
  const faqHtml = faqs.length
    ? `      <h2>Common questions</h2>\n${faqs
        .map(
          ([q, a]) =>
            `      <h3>${esc(q)}</h3>\n      <p>${esc(a)}</p>`,
        )
        .join("\n")}`
    : "";
  return `      <main>
      <h1>${esc(recipe.title)} — ${esc(label)} Recipe</h1>
      <p>${esc(recipe.description)}</p>
${intro ? `      <p>${esc(intro)}</p>\n` : ""}      <h2>Ingredients</h2>
      <ul>
${ingredients}
      </ul>
      <h2>Steps</h2>
      <ol>
${steps}
      </ol>
${faqHtml}
      </main>
      ${NAV_LINKS}`;
}

function recipeJsonLdFor(recipe, videoUrl) {
  const label = categoryLabel(recipe.category);
  const sortedSteps = [...recipe.steps].sort(
    (a, b) => Number(a.step_number) - Number(b.step_number),
  );
  const ld = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    keywords: [...recipe.tags, "KNF", "natural farming", "regenerative"].join(", "),
    recipeCategory: label,
    recipeIngredient: recipe.ingredients.map((i) => `${i.amount} ${i.name}`.trim()),
    recipeInstructions: sortedSteps.map((s) => ({
      "@type": "HowToStep",
      position: Number(s.step_number),
      text: s.instruction,
    })),
    author: { "@type": "Organization", name: "IC SPICY" },
    image: `${SITE_ORIGIN}/og/${recipe.slug}.png`,
    url: `${SITE_ORIGIN}/cookbook/${encodeURIComponent(recipe.slug)}`,
  };
  if (recipe.created_at != null) {
    const ms = Number(recipe.created_at) / 1_000_000;
    if (Number.isFinite(ms) && ms > 0) {
      ld.datePublished = new Date(ms).toISOString().slice(0, 10);
    }
  }
  if (recipe.prep_time.length > 0) ld.prepTime = recipe.prep_time[0];
  if (recipe.total_time.length > 0) ld.totalTime = recipe.total_time[0];
  if (videoUrl) {
    const idMatch = videoUrl.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
    if (idMatch) {
      ld.video = {
        "@type": "VideoObject",
        name: `${recipe.title} tutorial`,
        description: recipe.description.slice(0, 200),
        thumbnailUrl: `https://i.ytimg.com/vi/${idMatch[1]}/hqdefault.jpg`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${idMatch[1]}`,
        contentUrl: `https://www.youtube.com/watch?v=${idMatch[1]}`,
      };
    }
  }
  return ld;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = performance.now();
  const template = await fs.readFile(path.join(DIST, "index.html"), "utf8");
  let staticCount = 0;
  let recipeCount = 0;
  let guideCount = 0;
  let ogCount = 0;

  // Skip hub routes — rewritten after live data fetch.
  const DEFERRED_STATIC = new Set(["/guides", "/cookbook"]);

  // 1. Static routes
  for (const entry of STATIC_ROUTE_SEO) {
    if (DEFERRED_STATIC.has(entry.path)) continue;
    const html = buildPage(template, {
      title: entry.title,
      description: entry.description,
      canonicalPath: entry.path,
      jsonLds: entry.path === "/" ? entry.jsonLd : [entry.jsonLd],
      crawlHtml: staticCrawlHtml(entry),
    });
    await writeRoute(entry.path, html);
    staticCount++;
  }

  // 404 page (soft-404 mitigation — asset canister still returns 200 for unknown paths)
  const notFoundHtml = buildPage(template, {
    title: "Page Not Found | IC SPICY",
    description: "This page doesn't exist on IC SPICY.",
    canonicalPath: "/404",
    noIndex: true,
    crawlHtml: `      <main>
      <h1>Page not found</h1>
      <p>This page doesn't exist on IC SPICY.</p>
      <nav><ul>
        <li><a href="/">Home</a></li>
        <li><a href="/guides">Growing Guides</a></li>
        <li><a href="/cookbook">CookBook</a></li>
      </ul></nav>
      </main>`,
  });
  await fs.writeFile(path.join(DIST, "404.html"), notFoundHtml, "utf8");
  staticCount++;

  // Slicer tier OG cards (static — share HTML references /og/slicer/{tier}.png)
  try {
    const sharp = (await import("sharp")).default;
    await generateSlicerTierOgCards(sharp);
    ogCount += SLICER_TIER_OG.length;
  } catch (e) {
    console.warn(`⚠ Slicer tier OG cards skipped (${e.message})`);
  }

  // 2. Recipes + variety guides (live backend fetch — never break the build)
  try {
    const agent = new HttpAgent({ host: HOST });
    const actor = Actor.createActor(prerenderIDL, {
      agent,
      canisterId: BACKEND_CANISTER,
    });

    const recipes = [];
    const seenSlugs = new Set();
    for (let offset = 0n; ; offset += 50n) {
      const page = await actor.getRecipes([], [], offset, 50n);
      for (const r of page) {
        // Backend data contains some duplicate slugs — keep first occurrence.
        if (!seenSlugs.has(r.slug)) {
          seenSlugs.add(r.slug);
          recipes.push(r);
        }
      }
      if (page.length < 50) break;
    }

    let seoContent = new Map();
    let videoUrls = new Map();
    try {
      const rows = await actor.listRecipeSeoContent();
      seoContent = new Map(
        rows.map(([id, intro, faqs]) => [id.toString(), { intro, faqs }]),
      );
      videoUrls = new Map(
        (await actor.listRecipeVideoUrls()).map(([id, u]) => [id.toString(), u]),
      );
    } catch {
      console.warn("⚠ SEO-content queries unavailable — prerendering without intros/FAQs.");
    }

    let sharp = null;
    try {
      sharp = (await import("sharp")).default;
      await fs.mkdir(path.join(DIST, "og"), { recursive: true });
    } catch {
      console.warn("⚠ sharp unavailable — skipping OG card generation.");
    }

    for (const recipe of recipes) {
      const meta = recipeSeoMeta(recipe);
      const label = categoryLabel(recipe.category);
      const extra = seoContent.get(recipe.id.toString());
      const intro = extra?.intro && extra.intro.length > 0 ? extra.intro : null;
      const faqs = extra?.faqs ?? [];
      const videoUrl = videoUrls.get(recipe.id.toString()) ?? null;

      let ogImage = null;
      if (sharp) {
        try {
          await generateOgCard(sharp, recipe.slug, recipe.title, label);
          ogImage = `${SITE_ORIGIN}/og/${recipe.slug}.png`;
          ogCount++;
        } catch (e) {
          console.warn(`⚠ OG card failed for ${recipe.slug}: ${e.message}`);
        }
      }

      const html = buildPage(template, {
        title: meta.title,
        description: meta.description,
        canonicalPath: meta.path,
        ogType: "article",
        ogImage,
        ogImageSize: ogImage ? [1200, 630] : null,
        jsonLds: [
          recipeJsonLdFor(recipe, videoUrl),
          recipeBreadcrumbJsonLd(recipe, label),
          faqPageJsonLd(faqs),
        ],
        crawlHtml: recipeCrawlHtml(recipe, intro, faqs),
      });
      await writeRoute(`/cookbook/${recipe.slug}`, html);
      recipeCount++;
    }

    // CookBook hub with ItemList
    const cookbookEntry = staticRouteSeo("/cookbook");
    const cookbookItems = recipes.map((r) => ({
      name: r.title,
      url: `${SITE_ORIGIN}/cookbook/${encodeURIComponent(r.slug)}`,
    }));
    await writeRoute(
      "/cookbook",
      buildPage(template, {
        title: cookbookEntry.title,
        description: cookbookEntry.description,
        canonicalPath: "/cookbook",
        jsonLds: [
          cookbookEntry.jsonLd,
          itemListJsonLd("IC SPICY CookBook Recipes", cookbookItems),
        ],
        crawlHtml: cookbookIndexCrawlHtml(recipes),
      }),
    );
    staticCount++;

    // RSS feed
    await fs.writeFile(
      path.join(DIST, "feed.xml"),
      buildRssFeed(recipes, seoContent),
      "utf8",
    );

    // 3. Variety guides
    const varieties = await actor.listVarieties();

    const provenanceById = new Map();
    try {
      for (let off = 0; ; off += 500) {
        const page = await actor.listVarietyProvenance(off, 500);
        for (const p of page) provenanceById.set(p.variety_id.toString(), p);
        if (page.length < 500) break;
      }
    } catch {
      console.warn("⚠ listVarietyProvenance unavailable — prerendering without provenance.");
    }

    const introById = new Map();
    try {
      for (const [id, intro] of await actor.listVarietyIntros()) {
        introById.set(id.toString(), intro);
      }
    } catch {
      console.warn("⚠ listVarietyIntros unavailable — prerendering without intros.");
    }

    const recipeSummaries = recipes.map((r) => ({
      id: r.id,
      title: r.title,
      category: categoryLabel(r.category),
    }));
    const recipeById = new Map(
      recipes.map((r) => [r.id.toString(), r]),
    );

    if (sharp) {
      await poolMap(
        varieties,
        async (v) => {
          try {
            await generateGuideOgCard(
              sharp,
              v.id.toString(),
              v.name,
              Number(v.scovilleMax),
            );
            ogCount++;
          } catch (e) {
            console.warn(`⚠ Guide OG failed for ${v.id}: ${e.message}`);
          }
        },
        8,
      );
    }

    await poolMap(
      varieties,
      async (v) => {
        const input = varietyToGuideInput(v);
        const guide = buildFallbackGuide(
          input,
          DEFAULT_PRERENDER_CONDITIONS,
          recipeSummaries,
        );
        const prov = provenanceById.get(v.id.toString()) ?? null;
        const intro = introById.get(v.id.toString()) ?? null;
        const seoExtras = { provenance: prov, intro };
        const meta = guideSeoMeta(input, seoExtras);
        const ogImage = `${SITE_ORIGIN}/og/guide-${v.id.toString()}.png`;
        const html = buildPage(template, {
          title: meta.title,
          description: meta.description,
          canonicalPath: meta.path,
          ogType: "article",
          ogImage,
          ogImageSize: [1200, 630],
          jsonLds: [
            guideHowToJsonLd(input, guide.sections, guideSectionPlainText, seoExtras),
            guideBreadcrumbJsonLd(input),
          ],
          crawlHtml: guideCrawlHtml(v, guide.sections, recipeById),
        });
        await writeRoute(`/variety/${v.id.toString()}/guide`, html);
      },
      12,
    );
    guideCount = varieties.length;

    // Guides hub with ItemList + crawlable links
    const guidesEntry = staticRouteSeo("/guides");
    const guideItems = [...varieties]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((v) => ({
        name: v.name,
        url: `${SITE_ORIGIN}/variety/${v.id.toString()}/guide`,
      }));
    await writeRoute(
      "/guides",
      buildPage(template, {
        title: guidesEntry.title,
        description: guidesEntry.description,
        canonicalPath: "/guides",
        jsonLds: [
          guidesEntry.jsonLd,
          itemListJsonLd("IC SPICY Growing Guides", guideItems),
        ],
        crawlHtml: guidesIndexCrawlHtml(varieties),
      }),
    );
    staticCount++;
  } catch (e) {
    console.warn(`⚠ Live-data prerender skipped (${e.message}) — static routes still written.`);
  }

  const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(
    `✓ prerendered ${staticCount} static + ${recipeCount} recipes + ${guideCount} guides (${ogCount} OG cards) in ${elapsed}s → dist/`,
  );
}

main().catch((e) => {
  console.error("prerender failed:", e.message);
  process.exit(0); // never break the build
});
