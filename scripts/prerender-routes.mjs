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
} from "../src/frontend/src/lib/seo-routes.mjs";

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
});
const FaqPair = IDL.Tuple(IDL.Text, IDL.Text);

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
function buildPage(template, { title, description, canonicalPath, ogImage, ogImageSize, ogType, jsonLds, crawlHtml }) {
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

// ── Crawlable content blocks ────────────────────────────────────────────────
const NAV_LINKS = `<nav><ul>
      <li><a href="/">IC SPICY Home</a></li>
      <li><a href="/marketplace">Shop Pepper Plants</a></li>
      <li><a href="/cookbook">Natural Farming CookBook</a></li>
      <li><a href="/nims">NIMS Plant Tracker</a></li>
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
  const template = await fs.readFile(path.join(DIST, "index.html"), "utf8");
  let staticCount = 0;
  let recipeCount = 0;
  let ogCount = 0;

  // 1. Static routes
  for (const entry of STATIC_ROUTE_SEO) {
    const html = buildPage(template, {
      title: entry.title,
      description: entry.description,
      canonicalPath: entry.path,
      jsonLds: entry.path === "/" ? [] : [entry.jsonLd], // "/" already has its JSON-LD in the template
      crawlHtml: staticCrawlHtml(entry),
    });
    await writeRoute(entry.path, html);
    staticCount++;
  }

  // 2. Recipes (live backend fetch — never break the build)
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
  } catch (e) {
    console.warn(`⚠ Recipe prerender skipped (${e.message}) — static routes still written.`);
  }

  console.log(
    `✓ prerendered ${staticCount} static routes + ${recipeCount} recipes (${ogCount} OG cards) → dist/`,
  );
}

main().catch((e) => {
  console.error("prerender failed:", e.message);
  process.exit(0); // never break the build
});
