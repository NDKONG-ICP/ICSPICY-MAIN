#!/usr/bin/env node
/**
 * Seeds the backend CookBook with natural-farming recipes from
 * scripts/data/cookbook-recipes.json (Phase 8 natural-farming curriculum).
 *
 * Prerequisites:
 *   - dfx identity is an admin on the backend canister
 *   - `cd scripts && pnpm install` so @dfinity/* deps resolve
 *
 * Usage:
 *   node scripts/seed-cookbook.mjs
 *   DFX_NETWORK=ic node scripts/seed-cookbook.mjs
 *   node scripts/seed-cookbook.mjs --network ic --force
 *
 * Env:
 *   DFX_NETWORK   default: local (overridden by --network)
 *
 * Idempotency:
 *   Skips seeding when getRecipeCategories (public) shows any published recipes
 *   (sum of category counts > 0), unless --force is passed.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(__dirname, "data", "cookbook-recipes.json");

// ── Candid (matches src/backend/types/recipes.mo) ─────────────────────────────

const RecipeCategory = IDL.Variant({
  KNF: IDL.Null,
  JADAM: IDL.Null,
  Composting: IDL.Null,
  PestControl: IDL.Null,
  SoilAmendment: IDL.Null,
  FermentedInputs: IDL.Null,
  MicrobialCultures: IDL.Null,
  PlantExtracts: IDL.Null,
  Other: IDL.Null,
});

const Difficulty = IDL.Variant({
  Beginner: IDL.Null,
  Intermediate: IDL.Null,
  Advanced: IDL.Null,
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
  image_key: IDL.Opt(IDL.Text),
  tips: IDL.Opt(IDL.Text),
});

const CreateRecipeInput = IDL.Record({
  title: IDL.Text,
  slug: IDL.Text,
  category: RecipeCategory,
  difficulty: Difficulty,
  prep_time: IDL.Opt(IDL.Text),
  fermentation_time: IDL.Opt(IDL.Text),
  total_time: IDL.Opt(IDL.Text),
  description: IDL.Text,
  ingredients: IDL.Vec(Ingredient),
  steps: IDL.Vec(RecipeStep),
  tips: IDL.Vec(IDL.Text),
  safety_notes: IDL.Vec(IDL.Text),
  application_rate: IDL.Opt(IDL.Text),
  application_frequency: IDL.Opt(IDL.Text),
  best_for: IDL.Vec(IDL.Text),
  image_key: IDL.Opt(IDL.Text),
  tags: IDL.Vec(IDL.Text),
  related_recipe_ids: IDL.Vec(IDL.Nat),
  is_published: IDL.Bool,
  display_order: IDL.Nat,
});

const UpdateRecipeInput = IDL.Record({
  id: IDL.Nat,
  title: IDL.Opt(IDL.Text),
  slug: IDL.Opt(IDL.Text),
  category: IDL.Opt(RecipeCategory),
  difficulty: IDL.Opt(Difficulty),
  prep_time: IDL.Opt(IDL.Text),
  fermentation_time: IDL.Opt(IDL.Text),
  total_time: IDL.Opt(IDL.Text),
  description: IDL.Opt(IDL.Text),
  ingredients: IDL.Opt(IDL.Vec(Ingredient)),
  steps: IDL.Opt(IDL.Vec(RecipeStep)),
  tips: IDL.Opt(IDL.Vec(IDL.Text)),
  safety_notes: IDL.Opt(IDL.Vec(IDL.Text)),
  application_rate: IDL.Opt(IDL.Text),
  application_frequency: IDL.Opt(IDL.Text),
  best_for: IDL.Opt(IDL.Vec(IDL.Text)),
  image_key: IDL.Opt(IDL.Text),
  tags: IDL.Opt(IDL.Vec(IDL.Text)),
  related_recipe_ids: IDL.Opt(IDL.Vec(IDL.Nat)),
  is_published: IDL.Opt(IDL.Bool),
  display_order: IDL.Opt(IDL.Nat),
});

const backendIDL = ({ IDL: I }) =>
  I.Service({
    getRecipeCategories: I.Func([], [I.Vec(I.Tuple(RecipeCategory, I.Nat))], ["query"]),
    getRecipes: I.Func(
      [I.Opt(RecipeCategory), I.Opt(I.Text), I.Nat, I.Nat],
      [I.Vec(I.Record({}))],
      ["query"],
    ),
    createRecipe: I.Func([CreateRecipeInput], [I.Record({ recipe_id: I.Nat })], []),
    updateRecipe: I.Func([UpdateRecipeInput], [I.Bool], []),
  });

// ── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const force = args.includes("--force");
let network = process.env.DFX_NETWORK || "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";

const CATEGORY_LABELS = new Set([
  "KNF",
  "JADAM",
  "Composting",
  "PestControl",
  "SoilAmendment",
  "FermentedInputs",
  "MicrobialCultures",
  "PlantExtracts",
  "Other",
]);

const DIFFICULTY_LABELS = new Set(["Beginner", "Intermediate", "Advanced"]);

function categoryVariant(label) {
  const key = String(label);
  if (!CATEGORY_LABELS.has(key)) {
    throw new Error(`Unknown category: ${key}`);
  }
  return { [key]: null };
}

function difficultyVariant(label) {
  const key = String(label);
  if (!DIFFICULTY_LABELS.has(key)) {
    throw new Error(`Unknown difficulty: ${key}`);
  }
  return { [key]: null };
}

function toCreateInput(raw, relatedIds) {
  const steps = raw.steps.map((s) => ({
    step_number: BigInt(s.step_number),
    instruction: s.instruction,
    duration: s.duration != null ? [s.duration] : [],
    image_key: s.image_key != null ? [s.image_key] : [],
    tips: s.tips != null ? [s.tips] : [],
  }));

  return {
    title: raw.title,
    slug: raw.slug,
    category: categoryVariant(raw.category),
    difficulty: difficultyVariant(raw.difficulty),
    prep_time: raw.prep_time != null ? [raw.prep_time] : [],
    fermentation_time: raw.fermentation_time != null ? [raw.fermentation_time] : [],
    total_time: raw.total_time != null ? [raw.total_time] : [],
    description: raw.description,
    ingredients: raw.ingredients.map((i) => ({
      name: i.name,
      amount: i.amount,
      notes: i.notes != null ? [i.notes] : [],
      is_optional: Boolean(i.is_optional),
    })),
    steps,
    tips: raw.tips,
    safety_notes: raw.safety_notes,
    application_rate: raw.application_rate != null ? [raw.application_rate] : [],
    application_frequency: raw.application_frequency != null ? [raw.application_frequency] : [],
    best_for: raw.best_for,
    image_key: raw.image_key != null ? [raw.image_key] : [],
    tags: raw.tags,
    related_recipe_ids: relatedIds.map((n) => BigInt(n)),
    is_published: Boolean(raw.is_published),
    display_order: BigInt(raw.display_order),
  };
}

async function main() {
  console.log(`Cookbook seed — network: ${network} (${host})`);
  console.log(`Data file: ${DATA_PATH}`);
  console.log(`Force: ${force}`);

  let payload;
  try {
    const txt = await fs.readFile(DATA_PATH, "utf8");
    payload = JSON.parse(txt);
  } catch (e) {
    console.error(`Cannot read or parse ${DATA_PATH}`, e);
    process.exit(1);
  }

  const rawRecipes = payload.recipes;
  if (!Array.isArray(rawRecipes) || rawRecipes.length === 0) {
    console.error("cookbook-recipes.json: expected { recipes: [...] } with at least one item");
    process.exit(1);
  }

  // DFX identity
  let identityName;
  try {
    identityName = execSync("dfx identity whoami", { cwd: ROOT }).toString().trim();
  } catch {
    console.error("dfx not found or identity failed");
    process.exit(1);
  }
  const pemPath = path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem");
  const pem = await fs.readFile(pemPath, "utf8");
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  console.log(`Identity: ${identityName} → ${identity.getPrincipal().toText()}`);

  let canisterId;
  try {
    canisterId = execSync(`dfx canister --network ${network} id backend`, { cwd: ROOT }).toString().trim();
  } catch {
    console.error(`Cannot resolve backend canister id on ${network}`);
    process.exit(1);
  }
  console.log(`Backend canister: ${canisterId}`);

  const agent = new HttpAgent({ host, identity });
  if (isLocal) {
    try {
      await agent.fetchRootKey();
    } catch (e) {
      console.warn("fetchRootKey failed (is local replica running?)", e.message);
    }
  }

  const actor = Actor.createActor(backendIDL, {
    agent,
    canisterId,
  });

  // Idempotency: skip if any category already has published recipes
  let totalPublished = 0;
  try {
    const cats = await actor.getRecipeCategories();
    totalPublished = cats.reduce((a, [, n]) => a + Number(n), 0);
  } catch (e1) {
    console.warn(`getRecipeCategories failed (${e1.message || e1}); falling back to getRecipes`);
    try {
      const rows = await actor.getRecipes([], [], 0n, 10_000n);
      totalPublished = rows.length;
    } catch (e2) {
      console.error("getRecipes fallback failed:", e2.message || e2);
      process.exit(1);
    }
  }

  if (!force && totalPublished > 0) {
    console.log(
      `\nSkip: getRecipeCategories reports ${totalPublished} published recipe(s) across categories.`,
    );
    console.log("Re-run with --force to seed anyway.\n");
    process.exit(0);
  }
  if (force && totalPublished > 0) {
    console.log(`Note: --force — continuing despite ${totalPublished} existing recipe(s).\n`);
  }

  const sorted = [...rawRecipes].sort((a, b) => Number(a.display_order) - Number(b.display_order));
  const slugToId = new Map();
  const created = [];
  let failed = 0;

  console.log("\n── Creating recipes (related_recipe_ids deferred) ──\n");

  for (const r of sorted) {
    const input = toCreateInput(r, []);
    try {
      const out = await actor.createRecipe(input);
      const id = Number(out.recipe_id);
      slugToId.set(r.slug, id);
      created.push({ slug: r.slug, id, title: r.title });
      console.log(`✓ [${r.display_order}] ${r.slug} → id ${id}`);
    } catch (e) {
      failed += 1;
      console.error(`✗ [${r.display_order}] ${r.slug}: ${e.message || e}`);
    }
  }

  const withRelated = sorted.filter((r) => Array.isArray(r.related_slugs) && r.related_slugs.length > 0);

  if (withRelated.length > 0) {
    console.log("\n── Updating related_recipe_ids from slugs ──\n");
    for (const r of withRelated) {
      const id = slugToId.get(r.slug);
      if (id == null) continue;
      const relIds = [];
      for (const s of r.related_slugs) {
        const rid = slugToId.get(s);
        if (rid != null) relIds.push(BigInt(rid));
        else console.warn(`  ! ${r.slug}: related slug not found: ${s}`);
      }
      if (relIds.length === 0) continue;
      try {
        const ok = await actor.updateRecipe({
          id: BigInt(id),
          title: [],
          slug: [],
          category: [],
          difficulty: [],
          prep_time: [],
          fermentation_time: [],
          total_time: [],
          description: [],
          ingredients: [],
          steps: [],
          tips: [],
          safety_notes: [],
          application_rate: [],
          application_frequency: [],
          best_for: [],
          image_key: [],
          tags: [],
          related_recipe_ids: [relIds],
          is_published: [],
          display_order: [],
        });
        if (ok) console.log(`↳ related ids for ${r.slug}: ${relIds.join(", ")}`);
      } catch (e) {
        console.error(`✗ update related for ${r.slug}: ${e.message || e}`);
      }
    }
  }

  console.log("\n── Summary ──");
  console.log(`Succeeded: ${created.length}, failed: ${failed}, rows in file: ${sorted.length}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
