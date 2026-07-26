#!/usr/bin/env node
/**
 * Ensures "Egg Amino Acids" CookBook recipe exists and sets BonsaiTube video 31.
 *
 * Usage:
 *   node scripts/setup-eaa-bonsai-video.mjs --network ic
 */
import { execSync } from "node:child_process";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const network = process.argv.includes("--network")
  ? process.argv[process.argv.indexOf("--network") + 1]
  : "ic";
const canisterId = "ghxmp-xiaaa-aaaao-ba4sq-cai";
const slug = "egg-amino-acids-eaa";
const title = "Egg Amino Acids (EAA)";
const bonsaiVideoId = "31";

const identityPath = join(
  homedir(),
  ".config/dfx/identity/ic_deploy/identity.pem",
);
const identity = Secp256k1KeyIdentity.fromPem(readFileSync(identityPath, "utf8"));
const agent = new HttpAgent({
  host: network === "ic" ? "https://icp-api.io" : "http://127.0.0.1:4943",
  identity,
});
if (network === "ic") await agent.fetchRootKey();

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
const ResultUnit = IDL.Variant({ ok: IDL.Null, err: IDL.Text });

const idlFactory = ({ IDL }) =>
  IDL.Service({
    getRecipeBySlug: IDL.Func([IDL.Text], [IDL.Opt(IDL.Record({ id: IDL.Nat }))], ["query"]),
    createRecipe: IDL.Func(
      [CreateRecipeInput],
      [IDL.Record({ recipe_id: IDL.Nat })],
      [],
    ),
    setRecipeVideo: IDL.Func([IDL.Nat, IDL.Opt(IDL.Text)], [ResultUnit], []),
  });

const actor = Actor.createActor(idlFactory, { agent, canisterId });

let recipeId;
const existing = await actor.getRecipeBySlug(slug);
if (existing.length > 0) {
  recipeId = existing[0].id;
  console.log(`Found existing recipe id=${recipeId} slug=${slug}`);
} else {
  const out = await actor.createRecipe({
    title,
    slug,
    category: { KNF: null },
    difficulty: { Beginner: null },
    prep_time: [],
    fermentation_time: ["14–21 days"],
    total_time: ["3–4 weeks"],
    description:
      "Egg Amino Acids (EAA) ferment whole eggs under brown sugar to supply amino nitrogen for vegetative growth — the egg-based sibling to fish amino acids in the KNF toolbox.",
    ingredients: [
      {
        name: "Whole eggs",
        amount: "2 parts by weight",
        notes: [],
        is_optional: false,
      },
      {
        name: "Brown sugar",
        amount: "1 part by weight",
        notes: [],
        is_optional: false,
      },
    ],
    steps: [
      {
        step_number: 1n,
        instruction:
          "Crack eggs into a fermentation vessel; alternate layers with brown sugar and press to remove air pockets.",
        duration: [],
        image_key: [],
        tips: [],
      },
      {
        step_number: 2n,
        instruction:
          "Cover with breathable cloth; ferment 14–21 days until dark amber liquid forms with a savory (not putrid) aroma.",
        duration: ["14–21 days"],
        image_key: [],
        tips: [],
      },
      {
        step_number: 3n,
        instruction: "Strain, bottle, and store in a cool dark place. Dilute 1:500–1:1,000 for foliar or soil drench.",
        duration: [],
        image_key: [],
        tips: [],
      },
    ],
    tips: ["Apply during vegetative growth; rotate with microbial inputs."],
    safety_notes: ["Never seal a warming ferment jar airtight."],
    application_rate: ["1:500–1:1,000"],
    application_frequency: ["Every 10–14 days during leafy growth"],
    best_for: ["Vegetative nitrogen", "Amino acids"],
    image_key: [],
    tags: ["KNF", "EAA", "egg amino acids", "nitrogen"],
    related_recipe_ids: [],
    is_published: true,
    display_order: 2n,
  });
  recipeId = out.recipe_id;
  console.log(`Created recipe id=${recipeId} slug=${slug}`);
}

const setRes = await actor.setRecipeVideo(recipeId, [bonsaiVideoId]);
if ("err" in setRes) {
  console.error("setRecipeVideo failed:", setRes.err);
  process.exit(1);
}
console.log(`Set BonsaiTube video ${bonsaiVideoId} on recipe id=${recipeId}`);
console.log(`Public URL: https://www.icspicy.app/cookbook/${slug}`);
