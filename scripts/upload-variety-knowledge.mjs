#!/usr/bin/env node
/**
 * upload-variety-knowledge.mjs — ingest Pepperpedia into docs_backend for SpicyAI RAG.
 *
 * One compact knowledge document per variety (slug: variety-{id}).
 * Idempotent via upsertDocument + uploadDocumentMarkdown.
 *
 * Usage:
 *   node scripts/upload-variety-knowledge.mjs --network ic [--full] [--limit N]
 *   node scripts/upload-variety-knowledge.mjs --network ic --verify-queries
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import {
  buildFallbackGuide,
  DEFAULT_PRERENDER_CONDITIONS,
  guideSectionPlainText,
} from "../src/frontend/src/lib/variety-guide-fallback.mjs";
import { cleanSources } from "./lib/provenance-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(ROOT, "data", ".variety-knowledge-manifest.json");

const args = process.argv.slice(2);
let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];
function arg(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return !v || v.startsWith("--") ? true : v;
}

const full = args.includes("--full");
const verifyQueries = args.includes("--verify-queries");
const changedFileArg = arg("changed-file");
const li = args.indexOf("--limit");
const limit = li !== -1 && args[li + 1] ? Number(args[li + 1]) : Infinity;

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();
const DOCS_BACKEND = execSync(`dfx canister --network ${network} id docs_backend`, {
  cwd: ROOT,
})
  .toString()
  .trim();
const SPICY_AI =
  network === "ic"
    ? "pd5wn-sqaaa-aaaao-ba5ca-cai"
    : execSync(`dfx canister --network ${network} id spicy_ai_canister`, { cwd: ROOT })
        .toString()
        .trim();

const RECIPE_TOKEN_RE = /\[recipe:\d+\]/g;

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
const GuideSection = IDL.Record({
  id: IDL.Text,
  title: IDL.Text,
  icon: IDL.Text,
  content: IDL.Text,
  timing: IDL.Opt(IDL.Text),
});
const VarietyGuide = IDL.Record({
  varietyId: IDL.Nat,
  zone: IDL.Text,
  generatedAt: IDL.Int,
  sections: IDL.Vec(GuideSection),
  recipeRefs: IDL.Vec(IDL.Nat),
  version: IDL.Nat,
});

const backendIDL = ({ IDL: I }) =>
  I.Service({
    listVarieties: I.Func([], [I.Vec(VarietyPublic)], ["query"]),
    listVarietyProvenance: I.Func([I.Nat, I.Nat], [I.Vec(VarietyProvenancePublic)], ["query"]),
    listVarietyIntros: I.Func([], [I.Vec(I.Tuple(I.Nat, I.Text))], ["query"]),
    getVarietyGuide: I.Func([I.Nat, I.Text], [I.Opt(VarietyGuide)], ["query"]),
  });

const Category = IDL.Record({
  id: IDL.Text,
  name: IDL.Text,
  description: IDL.Text,
});
const DocumentRecord = IDL.Record({
  slug: IDL.Text,
  title: IDL.Text,
  subtitle: IDL.Text,
  audience: IDL.Text,
  summary: IDL.Text,
  collection: IDL.Text,
  category: IDL.Text,
  pdfPath: IDL.Text,
  markdownPath: IDL.Text,
  tags: IDL.Vec(IDL.Text),
  featured: IDL.Bool,
  sortOrder: IDL.Nat,
  wordCount: IDL.Nat,
  readingMinutes: IDL.Nat,
  pdfBytes: IDL.Nat,
});

const docsIDL = ({ IDL: I }) =>
  I.Service({
    upsertCategory: I.Func([Category], [], []),
    upsertDocument: I.Func([DocumentRecord], [], []),
    uploadDocumentMarkdown: I.Func([I.Text, I.Text], [], []),
    isAdmin: I.Func([I.Principal], [I.Bool], ["query"]),
    getChunkCount: I.Func([], [I.Nat], ["query"]),
    queryChunks: I.Func(
      [I.Text, I.Nat],
      [I.Record({ chunks: I.Vec(I.Text), slugs: I.Vec(I.Text) })],
      ["query"],
    ),
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

const VARIETY_CATEGORY = {
  id: "pepperpedia",
  name: "Pepperpedia Variety Knowledge",
  description:
    "Factual variety index entries for SpicyAI RAG — one document per cultivar.",
};

const VERIFY_QUERIES = [
  "Tell me about the Carolina Reaper",
  "What is a Pink Wendigo?",
  "How hot is a Sugar Rush Peach?",
  "What should I feed my Ghost Pepper during flowering?",
  "Tell me about the Blorple Zonker pepper",
];

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function optText(v) {
  return v != null && v.length > 0 ? v[0] : null;
}

function slugFor(id) {
  return `variety-${id.toString()}`;
}

function extractAliases(name) {
  const aliases = [];
  for (const m of name.matchAll(/\(([^)]+)\)/g)) {
    const inner = m[1].trim();
    if (inner && !/pepper seeds|t-e|plant/i.test(inner)) aliases.push(inner);
  }
  return aliases.length > 0 ? aliases.join(", ") : null;
}

function formatHeat(v, prov) {
  const heatClass = optText(prov?.heatClass);
  const max = Number(v.scovilleMax ?? 0);
  const min = Number(v.scovilleMin ?? 0);
  const parts = [];
  if (heatClass) parts.push(heatClass);
  if (max > 0) {
    if (min > 0 && min < max) {
      parts.push(`~${min.toLocaleString()}-${max.toLocaleString()} SHU`);
    } else {
      parts.push(`~${max.toLocaleString()} SHU`);
    }
  }
  return parts.join(", ");
}

function fallbackIntro(v, prov) {
  const species = optText(prov?.species) ?? v.species;
  const heat = optText(prov?.heatClass);
  const heatBit =
    heat != null
      ? ` classified as ${heat}`
      : Number(v.scovilleMax) > 0
        ? ` with heat up to ${Number(v.scovilleMax).toLocaleString()} SHU`
        : "";
  let intro = `${v.name} is a ${species} variety${heatBit}, indexed in the IC SPICY Pepperpedia.`;
  const breeder = optText(prov?.breeder);
  if (breeder?.includes("Towns-End")) {
    intro += " An original Towns-End cultivar bred by William Townshend in South Florida.";
  } else if (breeder) {
    intro += ` Bred by ${breeder.replace(/\([^)]*\)/g, "").trim()}.`;
  } else if (optText(prov?.origin)) {
    intro += ` Associated with ${optText(prov.origin)}.`;
  }
  return intro;
}

function stripRag(text) {
  return text
    .replace(RECIPE_TOKEN_RE, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function condenseGrowingNotes(sections) {
  const order = ["soil_prep", "planting", "nutrition", "pest", "harvest"];
  const byId = new Map(sections.map((s) => [s.id, s]));
  const parts = [];
  for (const id of order) {
    const s = byId.get(id);
    if (!s) continue;
    const plain = stripRag(guideSectionPlainText(s.content));
    if (plain) parts.push(`${s.title}: ${plain.slice(0, 280)}`);
  }
  return parts.join(" ").slice(0, 1200);
}

function composeKnowledgeDoc(v, prov, intro, growingNotes) {
  const lines = [`VARIETY: ${v.name}`];
  const aliases = extractAliases(v.name);
  if (aliases) lines.push(`ALIASES: ${aliases}`);
  lines.push(`SPECIES: ${optText(prov?.species) ?? v.species}`);
  const heat = formatHeat(v, prov);
  if (heat) lines.push(`HEAT: ${heat}`);
  const breeder = optText(prov?.breeder);
  const breederLoc = optText(prov?.breederLocation);
  if (breeder) {
    lines.push(`BREEDER: ${breeder}${breederLoc ? `, ${breederLoc}` : ""}`);
  }
  const origin = optText(prov?.origin);
  if (origin) lines.push(`ORIGIN: ${origin}`);
  const days = optText(v.daysToMaturity);
  if (days != null) lines.push(`DAYS TO MATURITY: ~${days}`);
  lines.push(`DESCRIPTION: ${intro}`);
  lines.push(`GROWING NOTES: ${growingNotes}`);
  const vendors = [
    ...new Set(cleanSources(prov?.sources ?? []).map((s) => s.vendorName).filter(Boolean)),
  ];
  const vendorStr = vendors.length > 0 ? vendors.join(", ") : "IC SPICY catalog";
  lines.push(
    `IN-APP: Growing guide at /variety/${v.id.toString()}/guide · Track it in NIMS · Seeds via ${vendorStr}`,
  );
  return lines.join("\n");
}

function hashDoc(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

async function loadManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function saveManifest(manifest) {
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

async function poolMap(items, fn, concurrency = 2) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
}

async function withRetries(label, fn, attempts = 5) {
  for (let n = 1; n <= attempts; n++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e?.message ?? String(e);
      const retryable =
        msg.includes("out of cycles") ||
        msg.includes("IC0207") ||
        msg.includes("SysTransient");
      if (!retryable || n === attempts) throw e;
      const wait = Math.min(30_000, 2000 * n);
      console.warn(`  ⚠ ${label} retry ${n}/${attempts - 1} in ${wait / 1000}s…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function loadChangedIds() {
  if (!changedFileArg || changedFileArg === true) return null;
  const fp = path.isAbsolute(changedFileArg)
    ? changedFileArg
    : path.join(ROOT, changedFileArg);
  const data = JSON.parse(await fs.readFile(fp, "utf8"));
  return new Set((data.ids ?? []).map(String));
}

async function main() {
  console.log(`Upload variety knowledge — network: ${network}`);

  const identityName = execSync("dfx identity whoami", { cwd: ROOT }).toString().trim();
  let pem;
  try {
    pem = await fs.readFile(
      path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem"),
      "utf8",
    );
  } catch {
    pem = execSync(`dfx identity export ${identityName}`, { cwd: ROOT }).toString();
  }
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();

  const backend = Actor.createActor(backendIDL, { agent, canisterId: BACKEND });
  const docs = Actor.createActor(docsIDL, { agent, canisterId: DOCS_BACKEND });

  const isAdm = await docs.isAdmin(identity.getPrincipal());
  if (!isAdm) {
    console.error("❌ Current identity is not a docs_backend admin.");
    process.exit(1);
  }

  const chunksBefore = await docs.getChunkCount();
  console.log(`BM25 chunks before: ${chunksBefore}`);

  const varieties = await backend.listVarieties();
  const provMap = new Map();
  for (let off = 0n; ; off += 500n) {
    const page = await backend.listVarietyProvenance(off, 500n);
    for (const p of page) provMap.set(p.variety_id.toString(), p);
    if (page.length < 500) break;
  }
  const introMap = new Map(
    (await backend.listVarietyIntros()).map(([id, t]) => [id.toString(), t]),
  );

  const manifest = await loadManifest();
  const changedIds = await loadChangedIds();
  const tasks = [];
  for (const v of varieties) {
    if (tasks.length >= limit) break;
    const id = v.id.toString();
    if (changedIds && !changedIds.has(id)) continue;
    const prov = provMap.get(id) ?? null;
    const intro = introMap.get(id) ?? fallbackIntro(v, prov);

    let sections;
    try {
      const cached = await backend.getVarietyGuide(v.id, "10a");
      if (cached != null && cached.length > 0) {
        sections = cached[0].sections;
      }
    } catch {
      /* use fallback */
    }
    if (!sections) {
      const guide = buildFallbackGuide(
        {
          id: v.id,
          name: v.name,
          species: optText(prov?.species) ?? v.species,
          scovilleMax: Number(v.scovilleMax),
          daysToMaturity: optText(v.daysToMaturity) != null ? Number(optText(v.daysToMaturity)) : null,
        },
        DEFAULT_PRERENDER_CONDITIONS,
        [],
      );
      sections = guide.sections;
    }

    const growingNotes = condenseGrowingNotes(sections);
    const text = composeKnowledgeDoc(v, prov, intro, growingNotes);
    const h = hashDoc(text);
    const slug = slugFor(v.id);
    if (!full && !changedIds && manifest[slug] === h) continue;
    tasks.push({ v, prov, text, slug, h });
  }

  console.log(`Varieties in catalog: ${varieties.length}`);
  if (changedIds) console.log(`Changed-file filter: ${changedIds.size} variety IDs`);
  console.log(`To upload (changed/new): ${tasks.length}`);

  await withRetries("upsertCategory", () => docs.upsertCategory(VARIETY_CATEGORY));

  let uploaded = 0;
  await poolMap(
    tasks,
    async ({ v, prov, text, slug, h }) => {
      const words = wordCount(text);
      const doc = {
        slug,
        title: v.name,
        subtitle: optText(prov?.species) ?? v.species,
        audience: "SpicyAI and growers researching pepper varieties",
        summary: introMap.get(v.id.toString())?.slice(0, 200) ?? `${v.name} — Pepperpedia variety knowledge`,
        collection: "pepperpedia",
        category: "pepperpedia",
        pdfPath: "",
        markdownPath: `/documents/pepperpedia/${slug}.md`,
        tags: [
          v.name,
          optText(prov?.species) ?? v.species,
          optText(prov?.heatClass) ?? "",
          optText(prov?.breeder) ?? "",
          "variety",
          "pepperpedia",
          "pepper",
        ].filter(Boolean),
        featured: false,
        sortOrder: v.id,
        wordCount: BigInt(words),
        readingMinutes: BigInt(Math.max(1, Math.ceil(words / 200))),
        pdfBytes: 0n,
      };
      await withRetries(`upsert ${slug}`, async () => {
        await docs.upsertDocument(doc);
        await docs.uploadDocumentMarkdown(slug, text);
      });
      manifest[slug] = h;
      uploaded++;
      if (uploaded % 25 === 0) {
        await saveManifest(manifest);
        console.log(`  uploaded ${uploaded}/${tasks.length}…`);
      }
    },
    1,
  );

  await saveManifest(manifest);
  const chunksAfter = await docs.getChunkCount();
  console.log(`\n✅ Uploaded ${uploaded} variety knowledge documents`);
  console.log(`   BM25 chunks: ${chunksBefore} → ${chunksAfter} (+${Number(chunksAfter) - Number(chunksBefore)})`);
  console.log(
    "\nNote: re-run after vendor re-scrapes or new variety merges:\n  node scripts/upload-variety-knowledge.mjs --network ic",
  );

  if (verifyQueries) {
    console.log("\n── Retrieval + SpicyAI verification ──");
    const spicyAi = Actor.createActor(spicyAiIDL, { agent, canisterId: SPICY_AI });
    for (const q of VERIFY_QUERIES) {
      const { chunks, slugs } = await docs.queryChunks(q, 3n);
      console.log(`\nQ: ${q}`);
      console.log(`   BM25 slugs: ${[...new Set(slugs)].join(", ") || "(none)"}`);
      if (chunks[0]) console.log(`   Top chunk: ${chunks[0].slice(0, 160).replace(/\n/g, " ")}…`);
      try {
        const res = await spicyAi.chatWithLlm({
          messages: [{ role: { user: null }, content: q }],
        });
        if ("ok" in res) {
          console.log(`   SpicyAI: ${res.ok.response.slice(0, 500)}${res.ok.response.length > 500 ? "…" : ""}`);
        } else {
          console.log(`   SpicyAI error: ${JSON.stringify(res.err)}`);
        }
      } catch (e) {
        console.log(`   SpicyAI call failed: ${e.message?.slice(0, 120)}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
