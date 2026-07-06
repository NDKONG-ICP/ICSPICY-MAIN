#!/usr/bin/env node
/**
 * fix-ohn-recipe.mjs — one-off content correction (2026-07).
 *
 * 1. Soft-deletes the duplicate OHN record (id 1, slug oriental-herbal-nutrient-1)
 * 2. Updates the surviving record (id 44, slug oriental-herbal-nutrient-ohn)
 *    with Chris Trump's 5-extraction OHN method
 * 3. Rewrites the recipe's SEO side-map intro + FAQs to match
 *
 * Run with the admin identity active (ic_deploy_plain):
 *   node scripts/fix-ohn-recipe.mjs --network ic
 */
import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const args = process.argv.slice(2);
let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];
const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();

const DUPLICATE_ID = 1n; // slug oriental-herbal-nutrient-1
const KEEP_ID = 44n; // slug oriental-herbal-nutrient-ohn

// ── Candid ───────────────────────────────────────────────────────────────────
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
const FaqPair = IDL.Tuple(IDL.Text, IDL.Text);

const backendIDL = ({ IDL: I }) =>
  I.Service({
    updateRecipe: I.Func([UpdateRecipeInput], [I.Bool], []),
    deleteRecipe: I.Func([I.Nat], [I.Bool], []),
    setRecipeIntro: I.Func([I.Nat, I.Text], [I.Bool], []),
    setRecipeFaqs: I.Func([I.Nat, I.Vec(FaqPair)], [I.Bool], []),
  });

// ── Corrected content (Chris Trump 5-extraction method) ─────────────────────
const ING = (name, amount, notes = null, is_optional = false) => ({
  name,
  amount,
  notes: notes ? [notes] : [],
  is_optional,
});
const STEP = (step_number, instruction, duration = null, tips = null) => ({
  step_number: BigInt(step_number),
  instruction,
  duration: duration ? [duration] : [],
  image_key: [],
  tips: tips ? [tips] : [],
});

const ingredients = [
  ING("Angelica root (dried)", "2 parts by weight"),
  ING("Licorice root (dried)", "1 part"),
  ING("Cinnamon bark (dried)", "1 part"),
  ING("Fresh ginger", "1 part"),
  ING("Fresh garlic", "1 part"),
  ING("Beer", "enough to cover dried ingredients", "For rehydration — a light lager works well"),
  ING("Brown sugar", "equal weight (fresh) / to 2/3 vessel (rehydrated)"),
  ING("Vodka", "as needed", "For stabilization and the five extractions"),
  ING("5 separate vessels", "1 per ingredient", "1-quart mason jars work well"),
];

const steps = [
  STEP(
    1,
    "Rehydrate: place the dried ingredients — angelica root, licorice root, and cinnamon bark — in separate jars and cover with beer to rehydrate. Let sit 24 hours.",
    "24 hours",
  ),
  STEP(
    2,
    "Begin fermentation: for the fresh ingredients (ginger, garlic), add an equal weight of brown sugar to each jar. For the rehydrated ingredients, add brown sugar until each vessel is 2/3 full. Ferment for one week.",
    "1 week",
  ),
  STEP(
    3,
    "Stabilization: top off each vessel with vodka to calm the ferment and begin stabilizing. Stir. Let sit for two weeks.",
    "2 weeks",
  ),
  STEP(
    4,
    "Extractions 1–4: strain all liquid from the ingredient, return the liquid to the halfway mark of the vessel, then top up with fresh vodka. Repeat this at 2-week intervals — four times total.",
    "8 weeks (4 × 2-week intervals)",
  ),
  STEP(
    5,
    "Final (5th) extraction: strain out all liquids from each ingredient into their own separate, labeled containers.",
    null,
  ),
  STEP(
    6,
    "Storage & use: keep each ingredient's extract separate until ready to use. Mix only what you need — combined OHN keeps about 6 months, while separated extracts store much longer.",
    null,
  ),
];

const tips = [
  "Best practice is to leave all finished extracts separated until you're ready to mix.",
  "Label each jar with the ingredient and extraction date.",
  "A light lager like Miller High Life works well for rehydration.",
];

const description =
  "A fermented and alcohol-extracted herbal tincture that boosts plant immunity and vigor. This follows Chris Trump's 5-extraction method — the gold standard for potent, shelf-stable OHN. Each ingredient is fermented and extracted separately, then combined at use time.";

const intro =
  "Oriental Herbal Nutrient is the plant-immunity cornerstone of Korean Natural Farming — a set of five herbal tinctures (angelica, licorice, cinnamon, ginger, and garlic) that are fermented, then alcohol-extracted five times over roughly three months. This guide follows Chris Trump's 5-extraction method: each ingredient is processed in its own vessel and kept separate until use, which maximizes potency and shelf life. A few drops diluted into your regular sprays strengthen plants against pests, disease, and stress.";

const faqs = [
  [
    "How do I use OHN once the extractions are finished?",
    "Combine equal parts of each ingredient's extract only when you're ready to spray, then dilute the blend to roughly 1:1000 (about 1 teaspoon per gallon of water) in foliar sprays or soil drenches, typically alongside FPJ and brown rice vinegar. Mixed OHN keeps about 6 months, so blend small batches.",
  ],
  [
    "Why keep the five extracts separated instead of mixing them?",
    "Separated, alcohol-stabilized extracts store for years, while a combined blend degrades in about 6 months. Keeping them apart also lets you adjust the blend — for example leaning on garlic and ginger during pest pressure. Label each jar with the ingredient and extraction date.",
  ],
  [
    "Why five extractions, and can I stop earlier?",
    "Each 2-week vodka extraction pulls more of the herbs' active compounds into the liquid, so the 5-extraction cycle produces a far more potent and consistent tincture than a single soak. You can use liquid from earlier pulls in a pinch, but completing all five is what makes this the gold-standard method.",
  ],
];

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const identityName = execSync("dfx identity whoami").toString().trim();
  const pem = await fs.readFile(
    path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem"),
    "utf8",
  );
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  console.log(`Identity: ${identityName} → ${identity.getPrincipal().toText()}`);

  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();
  const backend = Actor.createActor(backendIDL, { agent, canisterId: BACKEND });

  console.log(`Deleting duplicate OHN record id=${DUPLICATE_ID}…`);
  const deleted = await backend.deleteRecipe(DUPLICATE_ID);
  console.log(deleted ? "  ✓ deleted" : "  ⚠ delete returned false (already gone?)");

  console.log(`Updating OHN record id=${KEEP_ID} with 5-extraction method…`);
  const updated = await backend.updateRecipe({
    id: KEEP_ID,
    title: ["Oriental Herbal Nutrient (OHN)"],
    slug: [], // keep oriental-herbal-nutrient-ohn
    category: [{ KNF: null }],
    difficulty: [{ Advanced: null }],
    prep_time: ["24 hours rehydration"],
    fermentation_time: ["1 week ferment + ~12 weeks extractions"],
    total_time: ["~3 months (multi-week process)"],
    description: [description],
    ingredients: [ingredients],
    steps: [steps],
    tips: [tips],
    safety_notes: [],
    application_rate: ["Dilute mixed OHN ~1:1000 (about 1 tsp per gallon)"],
    application_frequency: ["With regular foliar sprays or drenches, per KNF schedule"],
    best_for: [],
    image_key: [],
    tags: [["KNF", "OHN", "tincture", "plant immunity", "Chris Trump", "fermentation"]],
    related_recipe_ids: [],
    is_published: [true],
    display_order: [],
  });
  console.log(updated ? "  ✓ updated" : "  ✗ update failed");
  if (!updated) process.exit(1);

  console.log("Rewriting SEO intro + FAQs…");
  const okIntro = await backend.setRecipeIntro(KEEP_ID, intro);
  const okFaqs = await backend.setRecipeFaqs(KEEP_ID, faqs);
  console.log(okIntro && okFaqs ? "  ✓ SEO content saved" : "  ✗ SEO save failed");

  console.log("\nDone. Final slug: /cookbook/oriental-herbal-nutrient-ohn");
}

main().catch((e) => {
  console.error("fix failed:", e);
  process.exit(1);
});
