#!/usr/bin/env node
/**
 * Correct Egg Amino Acids (EAA) recipe id=90 — ingredients + steps only.
 * Does NOT touch slug, bonsaiVideoId, or other metadata.
 *
 * Usage: node scripts/fix-eaa-recipe-content.mjs --network ic
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const RECIPE_ID = 90n;
const network = process.argv.includes("--network")
  ? process.argv[process.argv.indexOf("--network") + 1]
  : "ic";
const canisterId = "ghxmp-xiaaa-aaaao-ba4sq-cai";

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
  category: IDL.Opt(
    IDL.Variant({
      KNF: IDL.Null,
      JADAM: IDL.Null,
      Composting: IDL.Null,
      PestControl: IDL.Null,
      SoilAmendment: IDL.Null,
      FermentedInputs: IDL.Null,
      MicrobialCultures: IDL.Null,
      PlantExtracts: IDL.Null,
      Other: IDL.Null,
    }),
  ),
  difficulty: IDL.Opt(
    IDL.Variant({
      Beginner: IDL.Null,
      Intermediate: IDL.Null,
      Advanced: IDL.Null,
    }),
  ),
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

const ingredients = [
  {
    name: "Whole eggs",
    amount: "10",
    notes: [],
    is_optional: false,
  },
  {
    name: "Fresh lemons",
    amount: "~24",
    notes: ["Fresh-squeezed juice — enough to fully submerge the eggs"],
    is_optional: false,
  },
  {
    name: "Jaggery or brown sugar",
    amount: "Equal weight to stage-1 fermented mass",
    notes: ["Added in stage 2 after the 15-day lemon ferment and blend"],
    is_optional: false,
  },
];

const steps = [
  {
    step_number: 1n,
    instruction:
      "Stage 1 — Lemon ferment: Submerge the whole eggs in fresh-squeezed lemon juice in a vessel with a breathable lid or airlock. If using a sealed jar, burp it regularly to release pressure.",
    duration: ["30 min"],
    image_key: [],
    tips: [
      "Do not hermetically seal without venting — fermentation builds pressure.",
    ],
  },
  {
    step_number: 2n,
    instruction:
      "Ferment 15 days. Maintain a breathable cover or airlock throughout; burp sealed jars regularly to release pressure.",
    duration: ["15 days"],
    image_key: [],
    tips: [],
  },
  {
    step_number: 3n,
    instruction: "After 15 days, blend the entire mass until smooth.",
    duration: ["20 min"],
    image_key: [],
    tips: [],
  },
  {
    step_number: 4n,
    instruction:
      "Stage 2 — Jaggery ferment: Weigh the blended mass. Add jaggery or brown sugar at equal weight to that mass.",
    duration: ["15 min"],
    image_key: [],
    tips: [],
  },
  {
    step_number: 5n,
    instruction: "Blend again until fully consistent.",
    duration: ["10 min"],
    image_key: [],
    tips: [],
  },
  {
    step_number: 6n,
    instruction:
      "Ferment another 15 days. Use a breathable lid or airlock; burp sealed jars regularly to release pressure.",
    duration: ["15 days"],
    image_key: [],
    tips: [
      "Maintain venting throughout stage 2 — sealed vessels must be burped.",
    ],
  },
  {
    step_number: 7n,
    instruction:
      "Finish: Strain solids through fine mesh before storage or use.",
    duration: ["30 min"],
    image_key: [],
    tips: [
      "Strained solids are excellent grit for vermicompost / worm bins, or as a light top dressing on plants.",
    ],
  },
];

const identity = Secp256k1KeyIdentity.fromPem(
  readFileSync(
    join(homedir(), ".config/dfx/identity/ic_deploy/identity.pem"),
    "utf8",
  ),
);
console.log(`Admin: ${identity.getPrincipal().toText()}`);

const agent = new HttpAgent({
  host: network === "ic" ? "https://icp-api.io" : "http://127.0.0.1:4943",
  identity,
});
if (network === "ic") await agent.fetchRootKey();

const actor = Actor.createActor(
  ({ IDL }) =>
    IDL.Service({
      updateRecipe: IDL.Func([UpdateRecipeInput], [IDL.Bool], []),
      getRecipeBySlug: IDL.Func(
        [IDL.Text],
        [
          IDL.Opt(
            IDL.Record({
              bonsaiVideoId: IDL.Opt(IDL.Text),
              slug: IDL.Text,
            }),
          ),
        ],
        ["query"],
      ),
    }),
  { agent, canisterId },
);

const ok = await actor.updateRecipe({
  id: RECIPE_ID,
  title: [],
  slug: [],
  category: [],
  difficulty: [],
  prep_time: [],
  fermentation_time: [],
  total_time: [],
  description: [],
  ingredients: [ingredients],
  steps: [steps],
  tips: [],
  safety_notes: [],
  application_rate: [],
  application_frequency: [],
  best_for: [],
  image_key: [],
  tags: [],
  related_recipe_ids: [],
  is_published: [],
  display_order: [],
});

if (!ok) {
  console.error("updateRecipe returned false");
  process.exit(1);
}

const check = await actor.getRecipeBySlug("egg-amino-acids-eaa");
console.log("Updated recipe 90. bonsaiVideoId preserved:", check[0]?.bonsaiVideoId);
console.log("Slug unchanged:", check[0]?.slug);
