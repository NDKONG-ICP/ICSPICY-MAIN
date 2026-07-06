#!/usr/bin/env node
/**
 * generate-variety-descriptions.mjs — original 2-3 sentence variety intros via SpicyAI.
 * Idempotent; --force to regenerate. Caches in varietyIntros side-map.
 *
 * Usage: node scripts/generate-variety-descriptions.mjs --network ic [--force] [--limit N]
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const args = process.argv.slice(2);
let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];
const force = args.includes("--force");
const li = args.indexOf("--limit");
const limit = li !== -1 && args[li + 1] ? Number(args[li + 1]) : Infinity;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const changedFileIdx = args.indexOf("--changed-file");
const changedFile =
  changedFileIdx !== -1 && args[changedFileIdx + 1] && !args[changedFileIdx + 1].startsWith("--")
    ? args[changedFileIdx + 1]
    : null;

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();
const SPICY_AI = "pd5wn-sqaaa-aaaao-ba5ca-cai";

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
const VarietySource = IDL.Record({ vendorName: IDL.Text, url: IDL.Text });
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

const backendIDL = ({ IDL: I }) =>
  I.Service({
    listVarieties: I.Func([], [I.Vec(VarietyPublic)], ["query"]),
    listVarietyProvenance: I.Func([I.Nat, I.Nat], [I.Vec(VarietyProvenancePublic)], ["query"]),
    listVarietyIntros: I.Func([], [I.Vec(I.Tuple(I.Nat, I.Text))], ["query"]),
    setVarietyIntro: I.Func([I.Nat, I.Text], [I.Bool], []),
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildPrompt(v, prov) {
  const facts = [
    `Name: ${v.name}`,
    `Species: ${prov?.species?.[0] ?? v.species}`,
    prov?.heatClass?.[0] ? `Heat class: ${prov.heatClass[0]}` : null,
    Number(v.scovilleMax) > 0 ? `Scoville up to ${v.scovilleMax}` : null,
    prov?.origin?.[0] ? `Origin: ${prov.origin[0]}` : null,
    prov?.breeder?.[0] ? `Breeder: ${prov.breeder[0]}` : null,
    prov?.breederLocation?.[0] ? `Breeder location: ${prov.breederLocation[0]}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You write factual encyclopedia entries for the IC SPICY Pepperpedia — a permanent variety index for regenerative growers.

Write ONE original 2-3 sentence description (80-400 chars) for this pepper/plant variety. Respond with ONLY the paragraph text — no JSON, no markdown, no quotes.

Rules:
- Use ONLY the facts provided. Do not invent history, awards, or heat records.
- NO marketing superlatives (no "ultimate", "legendary", "world-famous", "must-grow").
- If a breeder is listed, include exactly one sentence crediting them (e.g. "An original Towns-End cultivar bred by William Townshend in South Florida.").
- Mention species and heat class naturally when known.
- Write in plain encyclopedic tone for gardeners.

Facts:
${facts}`;
}

function fallbackIntro(v, prov) {
  const species = prov?.species?.[0] ?? v.species;
  const heat = prov?.heatClass?.[0];
  const heatBit =
    heat != null
      ? ` classified as ${heat}`
      : Number(v.scovilleMax) > 0
        ? ` with heat up to ${Number(v.scovilleMax).toLocaleString()} SHU`
        : "";
  let intro = `${v.name} is a ${species} variety${heatBit}, indexed in the IC SPICY Pepperpedia for regenerative growers using Korean Natural Farming.`;
  if (prov?.breeder?.[0]) {
    const b = prov.breeder[0];
    if (b.includes("Towns-End")) {
      intro += " An original Towns-End cultivar bred by William Townshend in South Florida.";
    } else {
      intro += ` Bred by ${b.replace(/\([^)]*\)/g, "").trim()}.`;
    }
  } else if (prov?.origin?.[0]) {
    intro += ` Associated with ${prov.origin[0]}.`;
  }
  return intro.slice(0, 2000);
}

function validateIntro(text) {
  const t = text.trim();
  if (t.length < 60 || t.length > 2000) return null;
  if (/```|^\{|"\w+":/m.test(t)) return null;
  const banned = /\b(ultimate|legendary|world.?famous|must.?grow|best ever)\b/i;
  if (banned.test(t)) return null;
  return t;
}

async function loadChangedIds() {
  if (!changedFile) return null;
  const fp = path.isAbsolute(changedFile) ? changedFile : path.join(ROOT, changedFile);
  const data = JSON.parse(await fs.readFile(fp, "utf8"));
  return new Set((data.ids ?? []).map(String));
}

async function main() {
  console.log(`Generate variety descriptions — network: ${network}`);

  const identityName = execSync("dfx identity whoami").toString().trim();
  const pem = await fs.readFile(
    path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem"),
    "utf8",
  );
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();

  const backend = Actor.createActor(backendIDL, { agent, canisterId: BACKEND });
  const spicyAi = Actor.createActor(spicyAiIDL, { agent, canisterId: SPICY_AI });

  const varieties = await backend.listVarieties();
  const provMap = new Map();
  for (let off = 0n; ; off += 500n) {
    const page = await backend.listVarietyProvenance(off, 500n);
    for (const p of page) provMap.set(p.variety_id.toString(), p);
    if (page.length < 500) break;
  }
  const existingIntros = new Map(
    (await backend.listVarietyIntros()).map(([id, t]) => [id.toString(), t]),
  );
  const changedIds = await loadChangedIds();
  if (changedIds) console.log(`Changed-file filter: ${changedIds.size} variety IDs`);

  let done = 0;
  let aiOk = 0;
  let fellBack = 0;
  let skipped = 0;

  for (const v of varieties) {
    if (done >= limit) break;
    const id = v.id.toString();
    if (changedIds && !changedIds.has(id)) {
      skipped++;
      continue;
    }
    if (!force && !changedIds && existingIntros.has(id) && existingIntros.get(id).length > 0) {
      skipped++;
      continue;
    }
    const prov = provMap.get(id) ?? null;

    let intro = null;
    try {
      const res = await spicyAi.chatWithLlm({
        messages: [{ role: { user: null }, content: buildPrompt(v, prov) }],
      });
      if ("ok" in res) {
        intro = validateIntro(res.ok.response);
      }
    } catch {
      /* fallback */
    }

    if (intro) {
      aiOk++;
    } else {
      intro = fallbackIntro(v, prov);
      fellBack++;
    }

    await backend.setVarietyIntro(v.id, intro);
    done++;
    console.log(`  ✓ ${v.name} [${done}]`);
    await sleep(1200);
  }

  console.log(`\nDone: ${done} (${aiOk} AI, ${fellBack} fallback), ${skipped} skipped`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
