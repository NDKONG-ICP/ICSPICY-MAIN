#!/usr/bin/env node
/**
 * dedupe-recipes.mjs — removes duplicate CookBook recipe records.
 *
 * The catalog was seeded twice at some point, leaving ~30 duplicate records
 * (e.g. 89 records / 58 unique slugs). This script:
 *   1. Lists ALL non-deleted recipes via listRecipesAdmin (includes unpublished)
 *   2. Groups them by slugified title
 *   3. Keeps the LOWEST id in each group
 *   4. Copies side-map data (videoUrl / intro / FAQs) from the doomed records
 *      to the keeper when the keeper lacks it
 *   5. Soft-deletes the rest via the admin deleteRecipe method
 *
 * Usage (admin identity, e.g. ic_deploy_plain, must be active):
 *   node scripts/dedupe-recipes.mjs --network ic --dry-run   # print plan only
 *   node scripts/dedupe-recipes.mjs --network ic             # execute
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
const dryRun = args.includes("--dry-run");

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();

// ── Candid ───────────────────────────────────────────────────────────────────
const RecipeSlim = IDL.Record({
  id: IDL.Nat,
  title: IDL.Text,
  slug: IDL.Text,
  is_published: IDL.Bool,
});
const FaqPair = IDL.Tuple(IDL.Text, IDL.Text);

const backendIDL = ({ IDL: I }) =>
  I.Service({
    listRecipesAdmin: I.Func([], [I.Vec(RecipeSlim)], ["query"]),
    deleteRecipe: I.Func([I.Nat], [I.Bool], []),
    listRecipeVideoUrls: I.Func([], [I.Vec(I.Tuple(I.Nat, I.Text))], ["query"]),
    listRecipeSeoContent: I.Func(
      [],
      [I.Vec(I.Tuple(I.Nat, I.Text, I.Vec(FaqPair)))],
      ["query"],
    ),
    setRecipeVideoUrl: I.Func([I.Nat, I.Opt(I.Text)], [I.Bool], []),
    setRecipeIntro: I.Func([I.Nat, I.Text], [I.Bool], []),
    setRecipeFaqs: I.Func([I.Nat, I.Vec(FaqPair)], [I.Bool], []),
  });

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log(
    `Recipe dedupe — network: ${network} (${host})${dryRun ? " [DRY RUN]" : ""}`,
  );

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

  const recipes = await backend.listRecipesAdmin();
  console.log(`Records (non-deleted, incl. unpublished): ${recipes.length}`);

  // Side maps (used to preserve data onto the keeper)
  const videoUrls = new Map(
    (await backend.listRecipeVideoUrls()).map(([id, u]) => [id.toString(), u]),
  );
  const seoContent = new Map(
    (await backend.listRecipeSeoContent()).map(([id, intro, faqs]) => [
      id.toString(),
      { intro, faqs },
    ]),
  );

  // Group by slugified title
  const groups = new Map();
  for (const r of recipes) {
    const key = slugify(r.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const dupGroups = [...groups.entries()].filter(([, rs]) => rs.length > 1);
  const uniqueCount = groups.size;
  console.log(
    `Groups: ${uniqueCount} unique titles, ${dupGroups.length} with duplicates\n`,
  );

  let deleted = 0;
  let copiedVideo = 0;
  let copiedIntro = 0;
  let copiedFaqs = 0;

  for (const [key, rs] of dupGroups) {
    rs.sort((a, b) => Number(a.id - b.id));
    const keeper = rs[0];
    const doomed = rs.slice(1);
    console.log(
      `— ${key}: keep id=${keeper.id} (${keeper.slug}), delete ${doomed
        .map((d) => `id=${d.id} (${d.slug})`)
        .join(", ")}`,
    );

    // Preserve side-map data on the keeper if it lacks it
    const keeperKey = keeper.id.toString();
    for (const d of doomed) {
      const dKey = d.id.toString();

      const dVideo = videoUrls.get(dKey);
      if (dVideo && !videoUrls.get(keeperKey)) {
        console.log(`    ↳ copy videoUrl from id=${d.id} → id=${keeper.id}`);
        if (!dryRun) await backend.setRecipeVideoUrl(keeper.id, [dVideo]);
        videoUrls.set(keeperKey, dVideo);
        copiedVideo++;
      }

      const dSeo = seoContent.get(dKey);
      const kSeo = seoContent.get(keeperKey) ?? { intro: "", faqs: [] };
      if (dSeo?.intro && !kSeo.intro) {
        console.log(`    ↳ copy intro from id=${d.id} → id=${keeper.id}`);
        if (!dryRun) await backend.setRecipeIntro(keeper.id, dSeo.intro);
        kSeo.intro = dSeo.intro;
        seoContent.set(keeperKey, kSeo);
        copiedIntro++;
      }
      if (dSeo && dSeo.faqs.length > 0 && kSeo.faqs.length === 0) {
        console.log(`    ↳ copy FAQs from id=${d.id} → id=${keeper.id}`);
        if (!dryRun) await backend.setRecipeFaqs(keeper.id, dSeo.faqs);
        kSeo.faqs = dSeo.faqs;
        seoContent.set(keeperKey, kSeo);
        copiedFaqs++;
      }
    }

    for (const d of doomed) {
      if (!dryRun) {
        const ok = await backend.deleteRecipe(d.id);
        if (!ok) {
          console.error(`    ✗ deleteRecipe(${d.id}) returned false`);
          continue;
        }
      }
      deleted++;
    }
  }

  const kept = recipes.length - deleted;
  console.log(
    `\n${dryRun ? "PLAN" : "DONE"}: ${kept} kept, ${deleted} ${dryRun ? "would be " : ""}deleted` +
      ` (side-map copies: ${copiedVideo} video, ${copiedIntro} intro, ${copiedFaqs} FAQ)`,
  );
}

main().catch((e) => {
  console.error("dedupe failed:", e);
  process.exit(1);
});
