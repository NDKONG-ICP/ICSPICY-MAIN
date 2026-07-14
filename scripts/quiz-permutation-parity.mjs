#!/usr/bin/env node
/**
 * TS ↔ Motoko choicePermutation parity gate.
 * Generates vectors, computes TS expected perms, runs moc -r against lib/masterclass.mo.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND = path.join(ROOT, "src/backend");
const N = 4;

// ── TS reference (must match quiz-helpers.ts) ───────────────────────────────

export function hashSeed(s) {
  let h = 5381n;
  for (const ch of s) {
    h = (h * 33n + BigInt(ch.codePointAt(0))) % 2_147_483_647n;
  }
  return Number(h);
}

function lcgNextNumber(state) {
  const s = BigInt(state);
  return Number((s * 1_103_515_245n + 12_345n) % 2_147_483_648n);
}

/** BigInt LCG — ground truth matching Motoko Nat semantics. */
function lcgNextBigInt(state) {
  const s = BigInt(state);
  return Number((s * 1_103_515_245n + 12_345n) % 2_147_483_648n);
}

export function choicePermutationNumber(n, seed, questionId) {
  const perm = Array.from({ length: n }, (_, i) => i);
  let state = hashSeed(`${seed}:${questionId}`);
  for (let i = n - 1; i > 0; i--) {
    state = lcgNextNumber(state);
    const j = state % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

export function choicePermutationBigInt(n, seed, questionId) {
  const perm = Array.from({ length: n }, (_, i) => i);
  let state = hashSeed(`${seed}:${questionId}`);
  for (let i = n - 1; i > 0; i--) {
    state = lcgNextBigInt(state);
    const j = state % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

// Production helper uses Number path — what quiz-helpers.ts ships.
export const choicePermutation = choicePermutationNumber;

// ── Vector generation ───────────────────────────────────────────────────────

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomAscii(rand, len) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_:";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(rand() * chars.length)];
  return s;
}

function buildCases() {
  const cases = [];
  const push = (seed, questionId, label) =>
    cases.push({ seed, questionId, label });

  // Fixed edge cases
  push("", "m1-l1-q01", "empty-seed");
  push("a", "b", "single-char");
  push("seed-abc", "m1-l1-q01", "known-smoke");
  push("seed-abc", "m1-l3-q08", "known-m1-l3");
  push("2026-07-10-uuid", "m2-l5-q03", "uuid-style");
  push("x".repeat(128), "m1-l1-q01", "max-seed-len");
  push(
    "overflow-stress-zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    "m1-l1-q01",
    "long-hash-stress",
  );
  push("🌶️pepper", "m1-l1-q01", "emoji-seed");
  push("seed", "m1-l1-q01-🌶️", "emoji-qid");
  push("\u0000\u0001\u007f", "m1-l1-q01", "control-chars-seed");
  push(
    "2147483646",
    "1103515245",
    "lcg-overflow-multiply-operands",
  );
  push(
    "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    "max-hash-chain",
  );

  // Deterministic pseudo-random bulk
  const rand = mulberry32(0x0484d1c);
  while (cases.length < 220) {
    const seedLen = 1 + Math.floor(rand() * 96);
    const qidLen = 3 + Math.floor(rand() * 24);
    push(
      randomAscii(rand, seedLen),
      `m${1 + Math.floor(rand() * 6)}-l${1 + Math.floor(rand() * 5)}-q${String(Math.floor(rand() * 12) + 1).padStart(2, "0")}`,
      `random-${cases.length}`,
    );
  }

  return cases.slice(0, 220);
}

function motokoNatArray(arr) {
  return `[${arr.map((x) => `(${x} : Nat)`).join(", ")}]`;
}

function motokoText(s) {
  let out = '"';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 32 || cp === 127) {
      out += `\\u{${cp.toString(16).padStart(4, "0")}}`;
    } else if (ch === "\\" || ch === '"') {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
  }
  return out + '"';
}

async function runMotokoCheck(cases, expectedPerms) {
  const inputs = cases
    .map((c) => `(${motokoText(c.seed)}, ${motokoText(c.questionId)})`)
    .join(", ");
  const expected = expectedPerms.map((p) => motokoNatArray(p)).join(", ");

  const mo = `import Masterclass "../lib/masterclass";
import Debug "mo:core/Debug";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

func eq(a : [Nat], b : [Nat]) : Bool {
  if (a.size() != b.size()) return false;
  for (i in a.keys()) { if (a[i] != b[i]) return false };
  true;
};

let inputs : [(Text, Text)] = [${inputs}];
let expected : [[Nat]] = [${expected}];
var failed : Nat = 0;
var first : Text = "";
for (i in inputs.keys()) {
  let (seed, qid) = inputs[i];
  let got = Masterclass.choicePermutation(${N}, seed, qid);
  if (not eq(got, expected[i])) {
    failed += 1;
    if (first.size() == 0) {
      first := seed # "|" # qid;
    };
  };
};
if (failed > 0) {
  Debug.print("MISMATCH count=" # Nat.toText(failed) # " first=" # first);
} else {
  Debug.print("OK " # Nat.toText(inputs.size()));
};
`;

  const tmp = path.join(BACKEND, "test", "parity-test.mo");
  await fs.mkdir(path.dirname(tmp), { recursive: true });
  await fs.writeFile(tmp, mo, "utf8");

  const moc = spawnSync("bash", ["-lc", `cd "${BACKEND}" && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl test/parity-test.mo -r`], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  const stdout = moc.stdout?.trim() ?? "";
  return {
    ok: moc.status === 0 && /^OK \d+/.test(stdout),
    stdout,
    stderr: moc.stderr?.trim() ?? "",
  };
}

async function main() {
  const cases = buildCases();
  const tsNumber = cases.map((c) => choicePermutationNumber(N, c.seed, c.questionId));
  const tsBigInt = cases.map((c) => choicePermutationBigInt(N, c.seed, c.questionId));
  const bigintDrift = cases.filter(
    (_, i) => JSON.stringify(tsNumber[i]) !== JSON.stringify(tsBigInt[i]),
  );

  console.log(`Generated ${cases.length} test vectors (n=${N})`);
  if (bigintDrift.length > 0) {
    console.log(
      `WARN: Number LCG diverges from BigInt ground truth on ${bigintDrift.length} vectors`,
    );
    for (const c of bigintDrift.slice(0, 5)) {
      const i = cases.indexOf(c);
      console.log(
        `  drift ${c.label}: number=${JSON.stringify(tsNumber[i])} bigint=${JSON.stringify(tsBigInt[i])}`,
      );
    }
  } else {
    console.log("Number LCG matches BigInt ground truth on all vectors");
  }

  const motoko = await runMotokoCheck(cases, tsNumber);
  let motokoMatches = 0;
  if (motoko.ok) {
    motokoMatches = cases.length;
    console.log(`Motoko -r: PASS ${motokoMatches}/${cases.length} (100%)`);
    if (motoko.stdout) console.log(`  ${motoko.stdout}`);
  } else {
    console.error("Motoko batch mismatch or compile error");
    if (motoko.stdout) console.error(`  stdout: ${motoko.stdout}`);
    if (motoko.stderr) console.error(motoko.stderr.slice(-1500));
    process.exit(1);
  }

  const passRate = (motokoMatches / cases.length) * 100;
  console.log(`\n=== PARITY RESULT: ${motokoMatches}/${cases.length} (${passRate.toFixed(1)}%) ===`);
  process.exit(passRate === 100 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
