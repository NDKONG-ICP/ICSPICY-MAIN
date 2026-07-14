#!/usr/bin/env node
/**
 * seed-masterclass.mjs — ADDITIVE ingest of masterclass lessons into docs_backend.
 *
 * Safety:
 *   - Uses ONLY upsertCategory + upsertDocument + uploadDocumentMarkdown
 *   - NEVER calls seedDocuments / seedCategories (those REPLACE entire collections)
 *   - NEVER deletes or clears the index
 *   - Slugs are mc-{module}-{lesson}-… and do not collide with variety-* / recipe keys
 *
 * Usage:
 *   DFX_WARNING=-mainnet_plaintext_identity \
 *     node scripts/seed-masterclass.mjs --network ic --module 1
 *   node scripts/seed-masterclass.mjs --network ic --module 1 --verify-query "what is the soil food web"
 *   node scripts/seed-masterclass.mjs --network ic --dry-run
 *
 * Requires: dfx identity must be a docs_backend admin (ic_deploy_plain).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { IDL } from "@dfinity/candid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MASTERCLASS_DIR = path.join(ROOT, "content", "masterclass");

const DOCS_BACKEND_IC = "pyyki-iiaaa-aaaao-ba5aq-cai";

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return !v || v.startsWith("--") ? true : v;
}

const network = arg("network") || "local";
const moduleFilter = arg("module") != null ? Number(arg("module")) : null;
const dryRun = args.includes("--dry-run");
const verifyQuery = arg("verify-query") || null;

if (moduleFilter != null && (!Number.isInteger(moduleFilter) || moduleFilter < 1 || moduleFilter > 6)) {
  console.error("❌  --module must be an integer 1–6");
  process.exit(1);
}

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";

const dfxEnv = {
  ...process.env,
  DFX_WARNING: "-mainnet_plaintext_identity",
};

function dfx(cmd) {
  return execSync(cmd, { cwd: ROOT, env: dfxEnv }).toString().trim();
}

const MASTERCLASS_CATEGORY = {
  id: "masterclass",
  name: "Masterclass",
  description:
    "IC SPICY grower masterclass — soil biology, KNF/JADAM inputs, regenerative beds, rare chili cultivation, climate, and small-batch craft.",
};

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

const idlFactory = ({ IDL: _IDL }) =>
  _IDL.Service({
    upsertCategory: _IDL.Func([Category], [], []),
    upsertDocument: _IDL.Func([DocumentRecord], [], []),
    uploadDocumentMarkdown: _IDL.Func([_IDL.Text, _IDL.Text], [], []),
    isAdmin: _IDL.Func([_IDL.Principal], [_IDL.Bool], ["query"]),
    getChunkCount: _IDL.Func([], [_IDL.Nat], ["query"]),
    getManifestVersion: _IDL.Func([], [_IDL.Text], ["query"]),
    getDocument: _IDL.Func([_IDL.Text], [_IDL.Opt(DocumentRecord)], ["query"]),
    listDocuments: _IDL.Func([], [_IDL.Vec(DocumentRecord)], ["query"]),
    listDocumentsByCollection: _IDL.Func(
      [_IDL.Text],
      [_IDL.Vec(DocumentRecord)],
      ["query"],
    ),
    queryChunks: _IDL.Func(
      [_IDL.Text, _IDL.Nat],
      [
        _IDL.Record({
          chunks: _IDL.Vec(_IDL.Text),
          slugs: _IDL.Vec(_IDL.Text),
        }),
      ],
      ["query"],
    ),
  });

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { meta: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const yaml = raw.slice(4, end).replace(/\r/g, "");
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const meta = {};
  let key = null;
  let listMode = false;
  for (const line of yaml.split("\n")) {
    if (/^\s+-\s+/.test(line) && key && listMode) {
      const item = line.replace(/^\s+-\s+/, "").replace(/\s+#.*$/, "").trim();
      if (!Array.isArray(meta[key])) meta[key] = [];
      if (item) meta[key].push(item.replace(/^["']|["']$/g, ""));
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    key = m[1];
    let val = m[2].trim();
    listMode = val === "" || val === ">" || val === "|";
    if (listMode) {
      meta[key] = val === ">" || val === "|" ? "" : [];
      continue;
    }
    if (val === "true") meta[key] = true;
    else if (val === "false") meta[key] = false;
    else if (/^\d+$/.test(val)) meta[key] = Number(val);
    else meta[key] = val.replace(/^["']|["']$/g, "");
  }
  // Fold multi-line `>` outcome into a single string if we captured empties poorly —
  // re-parse outcome block simply:
  const outcomeMatch = yaml.match(/^outcome:\s*>\s*\n((?:[ \t]+.+\n?)+)/m);
  if (outcomeMatch) {
    meta.outcome = outcomeMatch[1]
      .split("\n")
      .map((l) => l.replace(/^\s+/, ""))
      .join(" ")
      .trim();
  }
  return { meta, body };
}

function slugifyTitle(filenameStem) {
  // 01-the-soil-food-web → the-soil-food-web
  return filenameStem.replace(/^\d+-/, "");
}

function buildSlug(moduleNum, lessonNum, filenameStem) {
  const mod = String(moduleNum).padStart(2, "0");
  const les = String(lessonNum).padStart(2, "0");
  return `mc-${mod}-${les}-${slugifyTitle(filenameStem)}`;
}

async function discoverLessons() {
  const entries = [];
  const dirs = (await fs.readdir(MASTERCLASS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && d.name.startsWith("module-"))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const dir of dirs) {
    const modMatch = dir.name.match(/^module-(\d+)/);
    if (!modMatch) continue;
    const moduleNum = Number(modMatch[1]);
    if (moduleFilter != null && moduleNum !== moduleFilter) continue;

    const dirPath = path.join(MASTERCLASS_DIR, dir.name);
    const files = (await fs.readdir(dirPath))
      .filter((f) => /^\d+-.*\.md$/.test(f))
      .sort();

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const raw = await fs.readFile(filePath, "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const lessonNum = Number(meta.lesson ?? file.match(/^(\d+)/)?.[1]);
      const stem = file.replace(/\.md$/, "");
      const slug = buildSlug(moduleNum, lessonNum, stem);
      const title = meta.title || stem;
      const outcome = typeof meta.outcome === "string" ? meta.outcome : "";
      const quizId = meta.quizId || `quiz-m${moduleNum}-l${lessonNum}`;
      const tags = [
        "masterclass",
        `module-${moduleNum}`,
        slugifyTitle(stem),
        `quiz:${quizId.replace(/^quiz-/, "")}`,
      ];
      if (Array.isArray(meta.cookbookSlugs)) {
        for (const s of meta.cookbookSlugs.slice(0, 8)) tags.push(`cookbook:${s}`);
      }

      entries.push({
        slug,
        moduleNum,
        lessonNum,
        filePath,
        relPath: path.relative(ROOT, filePath),
        title,
        subtitle: `Module ${moduleNum} · Lesson ${lessonNum} · ${meta.badge || "Masterclass"}`,
        audience: "IC SPICY growers and SpicyAI tutoring",
        summary: outcome || `${title} — IC SPICY masterclass lesson.`,
        tags,
        body,
        sortOrder: moduleNum * 100 + lessonNum,
      });
    }
  }
  return entries;
}

async function main() {
  console.log("=== seed-masterclass (ADDITIVE ONLY) ===");
  console.log(`Network: ${network} (${host})`);
  console.log(`Module filter: ${moduleFilter ?? "ALL"}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(
    "API surface: upsertCategory + upsertDocument + uploadDocumentMarkdown (no seedDocuments / seedCategories)",
  );

  const lessons = await discoverLessons();
  if (lessons.length === 0) {
    console.error("❌  No lessons found for the given filter.");
    process.exit(1);
  }

  console.log(`\nLessons to ingest (${lessons.length}):`);
  for (const l of lessons) {
    console.log(`  ${l.slug}  ←  ${l.relPath}`);
  }

  if (dryRun) {
    console.log("\n✅  Dry run complete — no canister calls.");
    return;
  }

  const identityName = dfx("dfx identity whoami");
  const pemPath = path.join(
    process.env.HOME,
    ".config",
    "dfx",
    "identity",
    identityName,
    "identity.pem",
  );
  let pem;
  try {
    pem = await fs.readFile(pemPath, "utf8");
  } catch {
    pem = dfx(`dfx identity export ${identityName}`);
  }
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  console.log(`\nIdentity: ${identityName} (${identity.getPrincipal().toText()})`);

  const canisterId =
    network === "ic" ? DOCS_BACKEND_IC : dfx(`dfx canister --network ${network} id docs_backend`);
  console.log(`Canister: ${canisterId}`);

  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();
  const actor = Actor.createActor(idlFactory, { agent, canisterId });

  const isAdm = await actor.isAdmin(identity.getPrincipal());
  if (!isAdm) {
    console.error("❌  Current identity is not a docs_backend admin.");
    process.exit(1);
  }

  const docsBefore = await actor.listDocuments();
  const masterBefore = await actor.listDocumentsByCollection("masterclass");
  const chunksBefore = await actor.getChunkCount();
  console.log(`\nIndex before:`);
  console.log(`  total documents: ${docsBefore.length}`);
  console.log(`  masterclass collection: ${masterBefore.length}`);
  console.log(`  BM25 chunks: ${chunksBefore}`);

  console.log("\nUpserting masterclass category (additive upsertCategory)…");
  await actor.upsertCategory(MASTERCLASS_CATEGORY);

  const added = [];
  const errors = [];

  for (const entry of lessons) {
    const words = wordCount(entry.body);
    const readingMinutes = Math.max(1, Math.ceil(words / 200));
    const doc = {
      slug: entry.slug,
      title: entry.title,
      subtitle: entry.subtitle,
      audience: entry.audience,
      summary: entry.summary,
      collection: "masterclass",
      category: "masterclass",
      pdfPath: "",
      markdownPath: `/documents/masterclass/${path.basename(path.dirname(entry.filePath))}/${path.basename(entry.filePath)}`,
      tags: entry.tags,
      featured: entry.lessonNum === 1,
      sortOrder: BigInt(entry.sortOrder),
      wordCount: BigInt(words),
      readingMinutes: BigInt(readingMinutes),
      pdfBytes: BigInt(0),
    };

    try {
      console.log(`\nUploading ${entry.slug} (${words} words)…`);
      await actor.upsertDocument(doc);
      await actor.uploadDocumentMarkdown(entry.slug, entry.body);
      const stored = await actor.getDocument(entry.slug);
      if (!stored?.[0]) {
        throw new Error("metadata missing after upload");
      }
      console.log(`✓  ${entry.slug} indexed`);
      added.push(entry.slug);
    } catch (e) {
      console.error(`❌  ${entry.slug}: ${e?.message || e}`);
      errors.push({ slug: entry.slug, error: String(e?.message || e) });
    }
  }

  const docsAfter = await actor.listDocuments();
  const masterAfter = await actor.listDocumentsByCollection("masterclass");
  const chunksAfter = await actor.getChunkCount();
  const version = await actor.getManifestVersion();

  console.log(`\n=== Module ${moduleFilter ?? "ALL"} ingest report ===`);
  console.log(`Docs added this run: ${added.length} (${added.join(", ") || "none"})`);
  console.log(`Total documents: ${docsBefore.length} → ${docsAfter.length} (Δ ${docsAfter.length - docsBefore.length})`);
  console.log(
    `Masterclass collection: ${masterBefore.length} → ${masterAfter.length} (Δ ${masterAfter.length - masterBefore.length})`,
  );
  console.log(
    `BM25 chunks: ${chunksBefore} → ${chunksAfter} (Δ ${Number(chunksAfter) - Number(chunksBefore)})`,
  );
  console.log(`Manifest version: ${version}`);

  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log(`  ${e.slug}: ${e.error}`);
  }

  if (verifyQuery) {
    console.log(`\nBM25 retrieval test: "${verifyQuery}"`);
    const { chunks, slugs } = await actor.queryChunks(verifyQuery, BigInt(8));
    const uniqueSlugs = [...new Set(slugs)];
    console.log(`   Slugs returned: ${uniqueSlugs.join(", ") || "(none)"}`);
    console.log(`   Top chunk preview: ${(chunks[0] ?? "").slice(0, 160)}…`);
  }

  if (moduleFilter != null) {
    console.log(
      `\n⏹  STOPPING after module ${moduleFilter}. Do not ingest further modules until William confirms verification queries.`,
    );
  }

  if (errors.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
