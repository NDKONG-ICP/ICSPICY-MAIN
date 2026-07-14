#!/usr/bin/env node
/**
 * End-to-end graded-submit smoke for seeded MC shuffle.
 * Requires: local replica + backend deployed with masterclass quiz API.
 *
 * Usage: node scripts/quiz-graded-submit-smoke.mjs [--network local]
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND = execSync(`dfx canister --network ${network} id backend`, {
  cwd: ROOT,
  encoding: "utf8",
}).trim();

const ATTEMPT_SEED = "smoke-parity-e2e-2026-07-10";
const LESSON = "m1-l1";

const backendIDL = ({ IDL: I }) =>
  I.Service({
    _initializeAccessControl: I.Func([], [], []),
    gradeQuizCheckpoint: I.Func(
      [I.Text, I.Text],
      [
        I.Variant({
          ok: I.Record({
            correct: I.Nat,
            total: I.Nat,
            scorePct: I.Nat,
            passed: I.Bool,
            lessonPassed: I.Bool,
            moduleBadgeMinted: I.Opt(I.Nat),
            capstoneBadgeMinted: I.Opt(I.Nat),
            progressJson: I.Text,
            questionResults: I.Vec(
              I.Record({ id: I.Text, correct: I.Bool }),
            ),
            recorded: I.Bool,
          }),
          err: I.Text,
        }),
      ],
      ["query"],
    ),
    submitQuizResult: I.Func(
      [I.Text, I.Text],
      [
        I.Variant({
          ok: I.Record({
            correct: I.Nat,
            total: I.Nat,
            scorePct: I.Nat,
            passed: I.Bool,
            lessonPassed: I.Bool,
            moduleBadgeMinted: I.Opt(I.Nat),
            capstoneBadgeMinted: I.Opt(I.Nat),
            progressJson: I.Text,
            questionResults: I.Vec(
              I.Record({ id: I.Text, correct: I.Bool }),
            ),
            recorded: I.Bool,
          }),
          err: I.Text,
        }),
      ],
      [],
    ),
    getMyMasterclassProgress: I.Func([], [I.Text], ["query"]),
  });

function hashSeed(s) {
  let h = 5381n;
  for (const ch of s) {
    h = (h * 33n + BigInt(ch.codePointAt(0))) % 2_147_483_647n;
  }
  return Number(h);
}

function lcgNext(state) {
  const s = BigInt(state);
  return Number((s * 1_103_515_245n + 12_345n) % 2_147_483_648n);
}

function choicePermutation(n, seed, questionId) {
  const perm = Array.from({ length: n }, (_, i) => i);
  let state = hashSeed(`${seed}:${questionId}`);
  for (let i = n - 1; i > 0; i--) {
    state = lcgNext(state);
    const j = state % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

function displayIndexForCorrect(q, seed) {
  const perm = choicePermutation(q.choices.length, seed, q.id);
  return perm.indexOf(q.correctIndex);
}

function displayIndexWrong(q, seed) {
  const perm = choicePermutation(q.choices.length, seed, q.id);
  const correctDisplay = perm.indexOf(q.correctIndex);
  return (correctDisplay + 1) % q.choices.length;
}

function buildPayload(seed, drawn, pick) {
  return JSON.stringify({
    seed,
    answers: drawn.map((q, i) => ({
      id: q.id,
      choice: pick(q, i),
    })),
  });
}

async function loadIdentity() {
  const whoami = execSync("dfx identity whoami", { encoding: "utf8" }).trim();
  const pem = await fs.readFile(
    path.join(os.homedir(), ".config", "dfx", "identity", whoami, "identity.pem"),
    "utf8",
  );
  return Secp256k1KeyIdentity.fromPem(pem);
}

async function loadCanisterBank(lessonId) {
  const mo = await fs.readFile(
    path.join(ROOT, "src/backend/lib/masterclass-quiz-bank.mo"),
    "utf8",
  );
  const fn =
    lessonId === "m1-l1"
      ? "bankM1L1"
      : lessonId === "m1-l2"
        ? "bankM1L2"
        : lessonId === "m1-l3"
          ? "bankM1L3"
          : lessonId === "m1-l4"
            ? "bankM1L4"
            : null;
  if (!fn) throw new Error(`No canister bank parser for ${lessonId}`);
  const block = mo.match(new RegExp(`func ${fn}\\(\\)[\\s\\S]*?questions = \\[([\\s\\S]*?)\\];`))?.[1];
  if (!block) throw new Error(`Could not parse ${fn}()`);
  const questions = [];
  const mcRe = /mc\("([^"]+)", "([^"]+)", "[^"]*", (\[[^\]]*\]), (\d+),/g;
  let m;
  while ((m = mcRe.exec(block)) !== null) {
    const choices = JSON.parse(m[3].replace(/"/g, '"'));
    questions.push({
      id: m[1],
      lessonId: m[2],
      type: "mc",
      choices,
      correctIndex: Number(m[4]),
    });
  }
  return questions;
}

function show(v) {
  return JSON.stringify(v, (_, x) => (typeof x === "bigint" ? Number(x) : x));
}

async function main() {
  console.log(`Quiz graded-submit smoke (network=${network}, backend=${BACKEND})`);

  const bankPath = path.join(ROOT, "content/masterclass/quizzes", `quiz-${LESSON}.json`);
  const bankMeta = JSON.parse(await fs.readFile(bankPath, "utf8"));
  const mc = (await loadCanisterBank(LESSON)).slice(0, bankMeta.drawCount);
  if (mc.length < bankMeta.drawCount) {
    console.error(`Need ${bankMeta.drawCount} MC questions, found ${mc.length}`);
    process.exit(1);
  }

  const identity = await loadIdentity();
  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();
  const backend = Actor.createActor(backendIDL, { agent, canisterId: BACKEND });

  try {
    await backend._initializeAccessControl();
  } catch {
    /* idempotent */
  }

  let failed = 0;

  const correctJson = buildPayload(ATTEMPT_SEED, mc, (q) =>
    displayIndexForCorrect(q, ATTEMPT_SEED),
  );
  const correct = await backend.submitQuizResult(LESSON, correctJson);
  if ("ok" in correct && Number(correct.ok.correct) === 6 && Number(correct.ok.total) === 6) {
    console.log(`  ✓ PASS all-correct: ${correct.ok.correct}/${correct.ok.total}`);
  } else {
    console.log(`  ✗ FAIL all-correct: ${show(correct)}`);
    failed += 1;
  }

  const wrongJson = buildPayload(ATTEMPT_SEED, mc, (q) =>
    displayIndexWrong(q, ATTEMPT_SEED),
  );
  const wrong = await backend.submitQuizResult(LESSON, wrongJson);
  if ("ok" in wrong && Number(wrong.ok.correct) === 0 && Number(wrong.ok.total) === 6) {
    console.log(`  ✓ PASS all-wrong: ${wrong.ok.correct}/${wrong.ok.total}`);
  } else {
    console.log(`  ✗ FAIL all-wrong: ${show(wrong)}`);
    failed += 1;
  }

  const legacyJson = JSON.stringify(
    mc.map((q) => ({ id: q.id, choice: displayIndexForCorrect(q, ATTEMPT_SEED) })),
  );
  const legacy = await backend.submitQuizResult(LESSON, legacyJson);
  if ("err" in legacy && legacy.err.includes("Missing attempt seed")) {
    console.log(`  ✓ PASS legacy/no-seed rejected: ${legacy.err}`);
  } else {
    console.log(`  ✗ FAIL legacy/no-seed: expected rejection, got ${show(legacy)}`);
    failed += 1;
  }

  const emptySeedJson = buildPayload("", mc, (q) => displayIndexForCorrect(q, ""));
  const empty = await backend.submitQuizResult(LESSON, emptySeedJson);
  if ("err" in empty && empty.err.includes("Missing attempt seed")) {
    console.log(`  ✓ PASS empty-seed rejected: ${empty.err}`);
  } else {
    console.log(`  ✗ FAIL empty-seed: expected rejection, got ${show(empty)}`);
    failed += 1;
  }

  // Anonymous guest grading via query — grade only, no progress recorded
  const anonAgent = new HttpAgent({ host });
  if (isLocal) await anonAgent.fetchRootKey();
  const anonBackend = Actor.createActor(backendIDL, {
    agent: anonAgent,
    canisterId: BACKEND,
  });

  const mixedJson = buildPayload(ATTEMPT_SEED, mc, (q, i) =>
    i % 2 === 0
      ? displayIndexForCorrect(q, ATTEMPT_SEED)
      : displayIndexWrong(q, ATTEMPT_SEED),
  );
  const guest = await anonBackend.gradeQuizCheckpoint(LESSON, mixedJson);
  if (
    "ok" in guest &&
    Number(guest.ok.correct) === 3 &&
    Number(guest.ok.total) === 6 &&
    guest.ok.recorded === false &&
    guest.ok.questionResults.length === 6
  ) {
    console.log(
      `  ✓ PASS guest mixed grade: ${guest.ok.correct}/${guest.ok.total}, recorded=false`,
    );
  } else {
    console.log(`  ✗ FAIL guest mixed grade: ${show(guest)}`);
    failed += 1;
  }

  const guestProgress = await anonBackend.getMyMasterclassProgress();
  if (guestProgress.includes('"lessons":{}') || guestProgress.includes('"lessons": {}')) {
    console.log(`  ✓ PASS guest progress empty on-chain`);
  } else {
    console.log(`  ✗ FAIL guest progress should be empty: ${guestProgress.slice(0, 120)}`);
    failed += 1;
  }

  console.log(failed === 0 ? "\n=== SMOKE OK ===" : `\n=== SMOKE FAILED (${failed}) ===`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
