#!/usr/bin/env node
/**
 * seed-recipe-seo.mjs — generates and caches per-recipe SEO content:
 *   - a unique 2–3 sentence intro paragraph
 *   - 3 "Common Questions" Q&As
 *
 * Generation goes through the SpicyAI canister (chatWithLlm). If the AI is
 * unavailable or returns garbage for a recipe, a deterministic fallback is
 * synthesized from the recipe's own fields so every page still gets unique
 * content. Results are stored in the backend side-maps (setRecipeIntro /
 * setRecipeFaqs) — admin-editable later via the CMS.
 *
 * Idempotent: recipes that already have BOTH an intro and FAQs are skipped.
 *
 * Prerequisites: active dfx identity is an admin with a plaintext Secp256k1
 * PEM (ic_deploy_plain). Backend must expose the SEO side-map methods.
 *
 * Usage:
 *   node scripts/seed-recipe-seo.mjs --network ic [--limit N] [--force]
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
const li = args.indexOf("--limit");
const limit = li !== -1 && args[li + 1] ? Number(args[li + 1]) : Infinity;
const force = args.includes("--force");

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND_CANISTER =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();
const SPICY_AI_CANISTER = "pd5wn-sqaaa-aaaao-ba5ca-cai";

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
const Ingredient = IDL.Record({ name: IDL.Text, amount: IDL.Text });
const RecipeSlim = IDL.Record({
  id: IDL.Nat,
  title: IDL.Text,
  slug: IDL.Text,
  description: IDL.Text,
  category: RecipeCategory,
  total_time: IDL.Opt(IDL.Text),
  ingredients: IDL.Vec(Ingredient),
  tags: IDL.Vec(IDL.Text),
});
const FaqPair = IDL.Tuple(IDL.Text, IDL.Text);

const backendIDL = ({ IDL: I }) =>
  I.Service({
    getRecipes: I.Func(
      [I.Opt(RecipeCategory), I.Opt(I.Text), I.Nat, I.Nat],
      [I.Vec(RecipeSlim)],
      ["query"],
    ),
    listRecipeSeoContent: I.Func(
      [],
      [I.Vec(I.Tuple(I.Nat, I.Text, I.Vec(FaqPair)))],
      ["query"],
    ),
    setRecipeIntro: I.Func([I.Nat, I.Text], [I.Bool], []),
    setRecipeFaqs: I.Func([I.Nat, I.Vec(FaqPair)], [I.Bool], []),
  });

const spicyAiIDL = ({ IDL: I }) => {
  const ChatMessage = I.Record({
    role: I.Variant({ user: I.Null, assistant: I.Null }),
    content: I.Text,
  });
  const ChatError = I.Variant({
    rateLimited: I.Record({ resetInSeconds: I.Nat }),
    blocked: I.Null,
    llmError: I.Text,
    noContent: I.Null,
    notEnabled: I.Null,
    notConfigured: I.Null,
    sessionNotFound: I.Null,
    sessionActive: I.Null,
  });
  return I.Service({
    chatWithLlm: I.Func(
      [I.Record({ messages: I.Vec(ChatMessage) })],
      [
        I.Variant({
          ok: I.Record({ response: I.Text, docsReferenced: I.Vec(I.Text) }),
          err: ChatError,
        }),
      ],
      [],
    ),
  });
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORY_LABEL = {
  KNF: "KNF",
  JADAM: "JADAM",
  Composting: "Composting",
  PestControl: "Pest Control",
  SoilAmendment: "Soil Amendment",
  FermentedInputs: "Fermented Inputs",
  MicrobialCultures: "Microbial Cultures",
  PlantExtracts: "Plant Extracts",
  Other: "Natural Farming",
};
const categoryLabel = (cat) => CATEGORY_LABEL[Object.keys(cat)[0]] ?? "Natural Farming";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Robust JSON extraction: direct parse → strip fences → first { to last }. */
function extractJson(text) {
  const attempts = [
    text,
    text.replace(/```(?:json)?/gi, "").trim(),
  ];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) attempts.push(text.slice(first, last + 1));
  for (const t of attempts) {
    try {
      return JSON.parse(t);
    } catch {
      /* next */
    }
  }
  return null;
}

function validateGenerated(parsed) {
  if (!parsed || typeof parsed.intro !== "string") return null;
  const intro = parsed.intro.trim();
  if (intro.length < 60 || intro.length > 1200) return null;
  const rawFaqs = Array.isArray(parsed.faqs) ? parsed.faqs : [];
  const faqs = rawFaqs
    .map((f) => [String(f?.q ?? "").trim(), String(f?.a ?? "").trim()])
    .filter(([q, a]) => q.length >= 8 && a.length >= 20 && q.length <= 300 && a.length <= 2000)
    .slice(0, 3);
  if (faqs.length < 3) return null;
  return { intro, faqs };
}

function buildPrompt(recipe) {
  const label = categoryLabel(recipe.category);
  const ingredientList = recipe.ingredients
    .slice(0, 8)
    .map((i) => `${i.amount} ${i.name}`.trim())
    .join("; ");
  const time = recipe.total_time.length > 0 ? recipe.total_time[0] : "varies";
  return `You are the head grower at IC SPICY, an FDACS-registered regenerative pepper nursery in Port Charlotte, Florida, practicing Korean Natural Farming (Master Cho) and JADAM methods.

Write SEO content for this recipe page. Respond ONLY with valid JSON, no markdown fences, in exactly this shape:
{"intro":"...","faqs":[{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]}

Rules:
- "intro": 2-3 sentences (60-500 chars) explaining what this input does for soil/plants, when a grower uses it, and why it matters in regenerative growing. Do not repeat the recipe title verbatim at the start. No hype words like "ultimate" or "amazing".
- "faqs": exactly 3 practical questions a home grower would Google about this recipe, each with a 2-4 sentence answer grounded in KNF/JADAM practice. Cover things like application rate/dilution, timing/growth stage, storage/shelf life, or common mistakes.

Recipe: ${recipe.title}
Category: ${label}
Description: ${recipe.description}
Key ingredients: ${ingredientList || "n/a"}
Total time: ${time}
Tags: ${recipe.tags.join(", ") || "n/a"}`;
}

/** Deterministic fallback built from the recipe's own fields. */
function fallbackContent(recipe) {
  const label = categoryLabel(recipe.category);
  const firstIngredient = recipe.ingredients[0]?.name ?? "simple farm ingredients";
  const time = recipe.total_time.length > 0 ? recipe.total_time[0] : null;
  const intro = `${recipe.description} This ${label} preparation is made with ${firstIngredient.toLowerCase()} and is a staple input in regenerative Korean Natural Farming — feeding soil biology instead of relying on synthetic fertilizers. It is one of 50+ free recipes we use daily at the IC SPICY nursery in Port Charlotte, Florida.`;
  const faqs = [
    [
      `How long does ${recipe.title} take to make?`,
      time
        ? `Plan for about ${time} from start to finish. Fermented and cultured inputs improve with proper timing, so follow the step schedule in the recipe rather than rushing stages.`
        : `Timing depends on temperature and humidity — follow the step-by-step schedule in the recipe above. Fermented and cultured inputs improve with proper timing, so avoid rushing stages.`,
    ],
    [
      `When should I apply a ${label} input like this?`,
      `Match the input to the plant's growth stage, per Master Cho's nutritive cycle theory: vegetative-stage plants favor growth inputs like FPJ and FAA, while flowering and fruiting plants favor WCA and FFJ. Apply early morning or late evening, and never in strong midday sun.`,
    ],
    [
      `Is this safe for organic or no-spray gardens?`,
      `Yes — like all IC SPICY CookBook recipes, this uses only biological and food-grade ingredients with zero synthetic fertilizers or pesticides. Always label your jars, use clean tools, and do a small test application before treating every plant.`,
    ],
  ];
  return { intro, faqs };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Recipe SEO seed — network: ${network} (${host})`);

  const identityName = execSync("dfx identity whoami").toString().trim();
  const pemPath = path.join(
    process.env.HOME,
    ".config",
    "dfx",
    "identity",
    identityName,
    "identity.pem",
  );
  const pem = await fs.readFile(pemPath, "utf8");
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  console.log(`Identity: ${identityName} → ${identity.getPrincipal().toText()}`);

  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();

  const backend = Actor.createActor(backendIDL, {
    agent,
    canisterId: BACKEND_CANISTER,
  });
  const spicyAi = Actor.createActor(spicyAiIDL, {
    agent,
    canisterId: SPICY_AI_CANISTER,
  });

  // Fetch all recipes
  const recipes = [];
  for (let offset = 0n; ; offset += 50n) {
    const page = await backend.getRecipes([], [], offset, 50n);
    recipes.push(...page);
    if (page.length < 50) break;
  }
  console.log(`Recipes: ${recipes.length}`);

  // Skip-set for idempotency
  const existing = new Map(
    (await backend.listRecipeSeoContent()).map(([id, intro, faqs]) => [
      id.toString(),
      { hasIntro: intro.length > 0, hasFaqs: faqs.length > 0 },
    ]),
  );

  let done = 0;
  let aiOk = 0;
  let fellBack = 0;
  let skipped = 0;

  for (const recipe of recipes) {
    if (done >= limit) break;
    const prior = existing.get(recipe.id.toString());
    if (!force && prior?.hasIntro && prior?.hasFaqs) {
      skipped++;
      continue;
    }

    let content = null;
    try {
      const res = await spicyAi.chatWithLlm({
        messages: [{ role: { user: null }, content: buildPrompt(recipe) }],
      });
      if ("ok" in res) {
        content = validateGenerated(extractJson(res.ok.response));
        if (!content) console.warn(`  ⚠ ${recipe.slug}: AI response failed validation`);
      } else {
        const errKey = Object.keys(res.err)[0];
        if (errKey === "rateLimited") {
          const wait = Number(res.err.rateLimited.resetInSeconds);
          console.warn(`  ⚠ rate-limited; waiting ${wait}s…`);
          await sleep(Math.min(wait, 120) * 1000);
          continue; // retry this recipe on next loop pass? simpler: fall through to fallback
        }
        console.warn(`  ⚠ ${recipe.slug}: AI error ${errKey}`);
      }
    } catch (e) {
      console.warn(`  ⚠ ${recipe.slug}: AI call threw (${e.message})`);
    }

    if (content) {
      aiOk++;
    } else {
      content = fallbackContent(recipe);
      fellBack++;
    }

    const okIntro = await backend.setRecipeIntro(recipe.id, content.intro);
    const okFaqs = await backend.setRecipeFaqs(recipe.id, content.faqs);
    if (!okIntro || !okFaqs) {
      console.error(`  ✗ ${recipe.slug}: backend rejected save`);
    } else {
      done++;
      console.log(
        `  ✓ ${recipe.slug} (${content === null ? "?" : aiOk > 0 && fellBack === 0 ? "ai" : "saved"}) [${done}]`,
      );
    }
    await sleep(1200); // stay under per-principal rate limits
  }

  console.log(
    `\nDone: ${done} written (${aiOk} AI, ${fellBack} fallback), ${skipped} already had content.`,
  );
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exit(1);
});
