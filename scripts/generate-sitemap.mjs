#!/usr/bin/env node
/**
 * generate-sitemap.mjs — regenerates src/frontend/public/sitemap.xml.
 *
 * Static routes + every published CookBook recipe URL + every variety
 * growing-guide URL, pulled live from the mainnet backend via anonymous
 * query calls (no identity needed).
 *
 * Usage:  node scripts/generate-sitemap.mjs
 * Exits 0 even on network failure (keeps the previous sitemap) so it is
 * safe to run as a build prestep.
 */
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src", "frontend", "public", "sitemap.xml");

const SITE = "https://www.icspicy.app";
const BACKEND_CANISTER = "ghxmp-xiaaa-aaaao-ba4sq-cai"; // mainnet backend
const HOST = "https://icp-api.io";

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/nims", priority: "0.9", changefreq: "weekly" },
  { path: "/cookbook", priority: "0.9", changefreq: "weekly" },
  { path: "/garden", priority: "0.9", changefreq: "monthly" },
  { path: "/marketplace", priority: "0.9", changefreq: "weekly" },
  { path: "/plants", priority: "0.7", changefreq: "weekly" },
  { path: "/dao", priority: "0.6", changefreq: "monthly" },
  { path: "/community", priority: "0.6", changefreq: "daily" },
  { path: "/tiers", priority: "0.6", changefreq: "monthly" },
  { path: "/schedule-builder", priority: "0.5", changefreq: "monthly" },
  { path: "/docs", priority: "0.5", changefreq: "monthly" },
];

// Minimal IDL — Candid width-subtyping lets us decode only the fields we need.
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
const RecipeSlim = IDL.Record({ slug: IDL.Text });
const VarietySlim = IDL.Record({ id: IDL.Nat });

const sitemapIDL = ({ IDL }) =>
  IDL.Service({
    getRecipes: IDL.Func(
      [IDL.Opt(RecipeCategory), IDL.Opt(IDL.Text), IDL.Nat, IDL.Nat],
      [IDL.Vec(RecipeSlim)],
      ["query"],
    ),
    listVarieties: IDL.Func([], [IDL.Vec(VarietySlim)], ["query"]),
  });

function xmlEscape(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function urlEntry(loc, { priority = "0.5", changefreq = "monthly" } = {}) {
  return [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

async function main() {
  const entries = STATIC_ROUTES.map((r) =>
    urlEntry(`${SITE}${r.path}`, r),
  );

  let recipeCount = 0;
  let varietyCount = 0;

  try {
    const agent = new HttpAgent({ host: HOST });
    const actor = Actor.createActor(sitemapIDL, {
      agent,
      canisterId: BACKEND_CANISTER,
    });

    // Recipes — page through in chunks of 100 (dedupe: data has repeat slugs)
    const seenSlugs = new Set();
    for (let offset = 0n; ; offset += 100n) {
      const page = await actor.getRecipes([], [], offset, 100n);
      for (const r of page) {
        if (seenSlugs.has(r.slug)) continue;
        seenSlugs.add(r.slug);
        entries.push(
          urlEntry(`${SITE}/cookbook/${encodeURIComponent(r.slug)}`, {
            priority: "0.8",
            changefreq: "monthly",
          }),
        );
        recipeCount++;
      }
      if (page.length < 100) break;
    }

    const varieties = await actor.listVarieties();
    for (const v of varieties) {
      entries.push(
        urlEntry(`${SITE}/variety/${v.id.toString()}/guide`, {
          priority: "0.6",
          changefreq: "monthly",
        }),
      );
      varietyCount++;
    }
  } catch (e) {
    console.warn(
      `⚠ Could not fetch dynamic URLs (${e.message}) — writing static routes only.`,
    );
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  await fs.writeFile(OUT, xml, "utf8");
  console.log(
    `✓ sitemap.xml written: ${STATIC_ROUTES.length} static + ${recipeCount} recipes + ${varietyCount} variety guides = ${STATIC_ROUTES.length + recipeCount + varietyCount} URLs`,
  );
}

main().catch((e) => {
  console.error("sitemap generation failed:", e.message);
  process.exit(0); // never break the build
});
