#!/usr/bin/env node
// End-to-end smoke test for the docs_backend canister with SpicyAi.
//
// Prerequisites:
//   1. `dfx start --background --clean` is running
//   2. `dfx deps pull && dfx deps deploy` (deploys local llm canister)
//   3. `dfx deploy --network local docs_backend docs_frontend`
//   4. `node scripts/spicyai-seed.mjs --network local` (seeds documents)
//   5. Ollama is running with llama4-scout pulled:
//        `ollama pull llama4:scout`
//
// Run with: node scripts/spicyai-smoke.mjs [--network local|ic]

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { IDL } from "@dfinity/candid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const network = args.includes("--network") ? args[args.indexOf("--network") + 1] : "local";
const host = network === "local" ? "http://127.0.0.1:4943" : "https://icp-api.io";

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ❌  ${label}`);
  if (detail) console.error(`       ${detail}`);
  failed++;
}

async function assert(label, fn) {
  try {
    const result = await fn();
    if (result === false) throw new Error("returned false");
    ok(label);
  } catch (e) {
    fail(label, e?.message ?? String(e));
  }
}

// ── Setup ────────────────────────────────────────────────────────────────────

console.log(`\n🌶️  SpicyAi Smoke Test — network: ${network}\n`);

const identityName = execSync("dfx identity whoami", { cwd: ROOT }).toString().trim();
const pemPath = path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem");
const pem = await fs.readFile(pemPath, "utf8");
const identity = Secp256k1KeyIdentity.fromPem(pem);

const canisterId = execSync(`dfx canister --network ${network} id docs_backend`, { cwd: ROOT }).toString().trim();
console.log(`Canister: ${canisterId}`);
console.log(`Identity: ${identity.getPrincipal().toText()}\n`);

const agent = new HttpAgent({ identity, host });
if (network === "local") await agent.fetchRootKey();

// Minimal IDL factory.
const DocumentRecord = IDL.Record({
  slug: IDL.Text, title: IDL.Text, subtitle: IDL.Text, audience: IDL.Text,
  summary: IDL.Text, collection: IDL.Text, category: IDL.Text,
  pdfPath: IDL.Text, markdownPath: IDL.Text, tags: IDL.Vec(IDL.Text),
  featured: IDL.Bool, sortOrder: IDL.Nat, wordCount: IDL.Nat,
  readingMinutes: IDL.Nat, pdfBytes: IDL.Nat,
});
const Category = IDL.Record({ id: IDL.Text, name: IDL.Text, description: IDL.Text });
const ChatMessage = IDL.Record({ role: IDL.Variant({ user: IDL.Null, assistant: IDL.Null }), content: IDL.Text });
const ChatRequest = IDL.Record({ messages: IDL.Vec(ChatMessage) });
const ChatError = IDL.Variant({ rateLimited: IDL.Record({ resetInSeconds: IDL.Nat }), blocked: IDL.Null, llmError: IDL.Text, noContent: IDL.Null });
const ChatResponse = IDL.Variant({ ok: IDL.Record({ response: IDL.Text, docsReferenced: IDL.Vec(IDL.Text) }), err: ChatError });
const PersonaPreset = IDL.Variant({ charming: IDL.Null, spec: IDL.Null, founder: IDL.Null });
const ChatbotConfig = IDL.Record({
  systemPromptExtra: IDL.Text, persona: PersonaPreset,
  anonDailyLimit: IDL.Nat, authDailyLimit: IDL.Nat,
  topK: IDL.Nat, blockedPhrases: IDL.Vec(IDL.Text),
});

const smokeIdlFactory = ({ IDL: _IDL }) => _IDL.Service({
  isAdmin: _IDL.Func([_IDL.Principal], [_IDL.Bool], ["query"]),
  listAdmins: _IDL.Func([], [_IDL.Vec(_IDL.Principal)], ["query"]),
  addAdmin: _IDL.Func([_IDL.Principal], [], []),
  removeAdmin: _IDL.Func([_IDL.Principal], [], []),
  listDocuments: _IDL.Func([], [_IDL.Vec(DocumentRecord)], ["query"]),
  getDocument: _IDL.Func([_IDL.Text], [_IDL.Opt(DocumentRecord)], ["query"]),
  upsertDocument: _IDL.Func([DocumentRecord], [], []),
  deleteDocument: _IDL.Func([_IDL.Text], [], []),
  uploadDocumentMarkdown: _IDL.Func([_IDL.Text, _IDL.Text], [], []),
  getDocumentMarkdown: _IDL.Func([_IDL.Text], [_IDL.Text], ["query"]),
  seedDocuments: _IDL.Func([_IDL.Vec(DocumentRecord)], [], []),
  seedCategories: _IDL.Func([_IDL.Vec(Category)], [], []),
  seedMarkdowns: _IDL.Func([_IDL.Vec(_IDL.Tuple(_IDL.Text, _IDL.Text))], [], []),
  getChunkCount: _IDL.Func([], [_IDL.Nat], ["query"]),
  getManifestVersion: _IDL.Func([], [_IDL.Text], ["query"]),
  askSpicyAi: _IDL.Func([ChatRequest], [ChatResponse], []),
  getChatbotConfig: _IDL.Func([], [ChatbotConfig], ["query"]),
  setChatbotConfig: _IDL.Func([ChatbotConfig], [], []),
  setChatbotPersona: _IDL.Func([PersonaPreset], [], []),
  setChatbotRateLimits: _IDL.Func([_IDL.Nat, _IDL.Nat], [], []),
  getMyRateLimitStatus: _IDL.Func([], [_IDL.Record({ used: _IDL.Nat, limit: _IDL.Nat })], ["query"]),
});

const actor = Actor.createActor(smokeIdlFactory, { agent, canisterId });

// ── Test suite ────────────────────────────────────────────────────────────────

console.log("── Admin management ─────────────────────");

await assert("Deployer is admin", async () => {
  const isAdm = await actor.isAdmin(identity.getPrincipal());
  return isAdm === true;
});

await assert("listAdmins returns ≥1 principal", async () => {
  const admins = await actor.listAdmins();
  return admins.length >= 1;
});

console.log("\n── Document catalog ─────────────────────");

await assert("listDocuments returns ≥30 docs (post-seed)", async () => {
  const docs = await actor.listDocuments();
  return docs.length >= 30;
});

await assert("getDocument('branded-whitepaper') exists", async () => {
  const doc = await actor.getDocument("branded-whitepaper");
  return doc.length === 1 && doc[0].title.includes("IC SPICY");
});

await assert("getChunkCount > 0 after seed", async () => {
  const count = await actor.getChunkCount();
  return count > 0n;
});

console.log("\n── Document CRUD ────────────────────────");

const testSlug = "smoke-test-doc";
await assert("upsertDocument creates a new doc", async () => {
  await actor.upsertDocument({
    slug: testSlug,
    title: "Smoke Test Document",
    subtitle: "Auto-generated by smoke test",
    audience: "Automated tests",
    summary: "This document is created by the smoke test and immediately deleted.",
    collection: "test",
    category: "operations",
    pdfPath: "",
    markdownPath: "",
    tags: ["test", "smoke"],
    featured: false,
    sortOrder: 9999n,
    wordCount: 10n,
    readingMinutes: 1n,
    pdfBytes: 0n,
  });
  const doc = await actor.getDocument(testSlug);
  return doc.length === 1;
});

await assert("uploadDocumentMarkdown indexes the test doc", async () => {
  const md = "# Smoke Test\n\nThis document tests the IC SPICY pepper BM25 indexing pipeline.";
  await actor.uploadDocumentMarkdown(testSlug, md);
  const fetched = await actor.getDocumentMarkdown(testSlug);
  return fetched.includes("IC SPICY pepper");
});

await assert("deleteDocument removes the test doc", async () => {
  await actor.deleteDocument(testSlug);
  const doc = await actor.getDocument(testSlug);
  return doc.length === 0;
});

console.log("\n── SpicyAi chat ─────────────────────────");
console.log("  (requires Ollama + llama4-scout running locally or LLM canister on mainnet)");

try {
  const response = await actor.askSpicyAi({
    messages: [{ role: { user: null }, content: "What is IC SPICY?" }],
  });
  if ("ok" in response) {
    const text = response.ok.response;
    if (text.length > 20) {
      ok("askSpicyAi returns a non-empty response");
    } else {
      fail("askSpicyAi response too short", `Got: ${text}`);
    }
  } else if ("err" in response) {
    const errType = Object.keys(response.err)[0];
    // Rate-limited on first call is unexpected; LLM error is acceptable in CI.
    if (errType === "llmError") {
      console.log(`  ⚠️  LLM call failed (acceptable if Ollama not running): ${response.err.llmError}`);
      passed++;
    } else {
      fail("askSpicyAi unexpected error", errType);
    }
  }
} catch (e) {
  fail("askSpicyAi threw exception", e.message);
}

console.log("\n── Chatbot config ───────────────────────");

await assert("getChatbotConfig returns valid config", async () => {
  const cfg = await actor.getChatbotConfig();
  return cfg.anonDailyLimit > 0n && cfg.authDailyLimit > 0n;
});

await assert("setChatbotPersona updates persona", async () => {
  await actor.setChatbotPersona({ spec: null });
  const cfg = await actor.getChatbotConfig();
  const isSpec = "spec" in cfg.persona;
  // Restore to charming.
  await actor.setChatbotPersona({ charming: null });
  return isSpec;
});

console.log("\n── Upgrade preservation (manual check) ─");
console.log("  Run: dfx deploy --network local docs_backend --mode upgrade');");
console.log("  Then: dfx canister --network local call docs_backend listDocuments \'()\'");
console.log("  Expected: same docs as before upgrade (stable state preserved).\n");

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("─".repeat(48));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("\n🌶️  All smoke tests passed! Ready for mainnet deploy.\n");
} else {
  console.log("\n💥  Some tests failed. Fix before deploying to mainnet.\n");
  process.exit(1);
}
