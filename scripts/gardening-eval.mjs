#!/usr/bin/env node
// Gardening chatbot evaluation script.
// Tests whether the docs_backend RAG retrieval surfaces correct chunks for natural-farming queries.
// Run: node scripts/gardening-eval.mjs --network local
//       node scripts/gardening-eval.mjs --network ic
//
// Requires: node scripts/spicyai-seed.mjs to have run first.

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function arg(name) {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--" + name);
  return idx >= 0 ? args[idx + 1] : null;
}

const network = arg("network") ?? "local";
const identityPath =
  arg("identity-path") ??
  path.join(process.env.HOME, ".config", "dfx", "identity", "icspicy-backup", "identity.pem");

// Load canister ID from dfx canister id docs_backend.
import { execSync } from "child_process";
let canisterId;
try {
  canisterId = execSync(`dfx canister --network ${network} id docs_backend`)
    .toString()
    .trim();
} catch {
  console.error("Could not get docs_backend canister ID. Is dfx running?");
  process.exit(1);
}
console.log(`docs_backend canister: ${canisterId} (${network})`);

// Minimal IDL just for askSpicyAi.
import { IDL } from "@dfinity/candid";
const ChatRole = IDL.Variant({ user: IDL.Null, assistant: IDL.Null });
const ChatMessage = IDL.Record({ role: ChatRole, content: IDL.Text });
const ChatRequest = IDL.Record({ messages: IDL.Vec(ChatMessage) });
const ChatError = IDL.Variant({
  rateLimited: IDL.Record({ resetInSeconds: IDL.Nat }),
  blocked: IDL.Null,
  llmError: IDL.Text,
  noContent: IDL.Null,
});
const ChatResponse = IDL.Variant({
  ok: IDL.Record({
    response: IDL.Text,
    docsReferenced: IDL.Vec(IDL.Text),
  }),
  err: ChatError,
});

const idlFactory = ({ IDL }) =>
  IDL.Service({
    askSpicyAi: IDL.Func([ChatRequest], [ChatResponse], []),
    getChunkCount: IDL.Func([], [IDL.Nat], ["query"]),
  });

const pem = readFileSync(identityPath, "utf8");
const identity = Secp256k1KeyIdentity.fromPem(pem);
const host = network === "local" ? "http://127.0.0.1:4943" : "https://ic0.app";
const agent = await HttpAgent.create({
  identity,
  host,
  shouldFetchRootKey: network === "local",
});

const actor = Actor.createActor(idlFactory, { agent, canisterId });

// Check chunk count first.
const chunkCount = await actor.getChunkCount();
console.log(`\nChunk count: ${chunkCount.toString()}\n`);
if (Number(chunkCount) < 50) {
  console.warn(
    "⚠  Low chunk count. Has the seed run been completed with the new natural-farming documents?"
  );
}

// ── Eval questions ────────────────────────────────────────────────────────────
// Ground truth: check that response contains the expected keywords.
const EVAL = [
  {
    id: "lab-recipe",
    question: "How do I make LAB at home?",
    mustContain: ["rice", "milk", "lab"],
    shouldNotContain: ["not in my briefing"],
  },
  {
    id: "fpj-timing",
    question: "When should I stop using FPJ and switch to WCA?",
    mustContain: ["flower", "bud", "vegetative", "calcium"],
    shouldNotContain: ["I don't know"],
  },
  {
    id: "ber-prevention",
    question: "How do I prevent blossom-end rot on my peppers?",
    mustContain: ["calcium", "wca", "water"],
    shouldNotContain: ["I don't know"],
  },
  {
    id: "jadam-sulfur",
    question: "What is JADAM Sulfur and how does it work against fungal disease?",
    mustContain: ["sulfur", "fungicide", "potassium", "js"],
    shouldNotContain: ["I don't know"],
  },
  {
    id: "faa-dilution",
    question: "What is the correct FAA dilution ratio?",
    mustContain: ["1,000"],
    shouldNotContain: ["not in my briefing"],
  },
  {
    id: "imo-collection",
    question: "How do I collect IMO from the forest?",
    mustContain: ["rice", "box", "forest", "mold", "white"],
    shouldNotContain: ["I don't know"],
  },
  {
    id: "anthracnose-florida",
    question: "How do I treat anthracnose on my Florida pepper plants?",
    mustContain: ["anthracnose", "jadam", "sulfur", "jwa", "fungal"],
    shouldNotContain: ["I don't know"],
  },
  {
    id: "zone10a-planting",
    question: "When should I plant peppers in Zone 10a Florida?",
    mustContain: ["october", "november", "cool", "season"],
    shouldNotContain: ["I don't know"],
  },
  {
    id: "ohn-dilution",
    question: "What dilution do I use for OHN spray?",
    mustContain: ["1,000"],
    shouldNotContain: ["not in my briefing"],
  },
  {
    id: "jms-potato",
    question: "How do I make JADAM Microorganism Solution?",
    mustContain: ["jadam", "microorganism"],
    shouldNotContain: ["not in my briefing"],
  },
];

let passed = 0;
let failed = 0;

for (const test of EVAL) {
  process.stdout.write(`Testing [${test.id}]... `);

  let response;
  try {
    const result = await actor.askSpicyAi({
      messages: [{ role: { user: null }, content: test.question }],
    });
    if ("ok" in result) {
      response = result.ok.response.toLowerCase();
    } else {
      console.log(`❌ ERROR: ${JSON.stringify(result.err)}`);
      failed++;
      continue;
    }
  } catch (e) {
    console.log(`❌ EXCEPTION: ${e.message}`);
    failed++;
    continue;
  }

  const missingKeywords = test.mustContain.filter(
    (kw) => !response.includes(kw.toLowerCase())
  );
  const foundBadKeywords = (test.shouldNotContain ?? []).filter((kw) =>
    response.includes(kw.toLowerCase())
  );

  if (missingKeywords.length === 0 && foundBadKeywords.length === 0) {
    console.log(`✅ PASS`);
    passed++;
  } else {
    console.log(`❌ FAIL`);
    if (missingKeywords.length > 0) {
      console.log(`   Missing keywords: ${missingKeywords.join(", ")}`);
    }
    if (foundBadKeywords.length > 0) {
      console.log(`   Found bad phrases: ${foundBadKeywords.join(", ")}`);
    }
    console.log(`   Response preview: ${response.slice(0, 200)}...`);
    failed++;
  }
}

console.log(`\n── Results: ${passed} passed, ${failed} failed (${EVAL.length} total) ──`);

if (failed > 0) {
  console.log(
    "\n⚠  Some tests failed. Possible causes:\n" +
      "   1. Seed not yet run with new natural-farming docs (run spicyai-seed.mjs)\n" +
      "   2. Rate limit hit — wait and retry\n" +
      "   3. LLM not returning expected terms — consider tuning systemPromptExtra\n"
  );
  process.exit(1);
} else {
  console.log("\n✅ All gardening eval tests passed.\n");
}
