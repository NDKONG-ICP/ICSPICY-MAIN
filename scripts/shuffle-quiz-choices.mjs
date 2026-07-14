#!/usr/bin/env node
/**
 * Rebalance MC correctIndex across 0–3 by shuffling choices arrays in quiz JSON banks.
 * Usage: node scripts/shuffle-quiz-choices.mjs [glob]
 * Default: content/masterclass/quizzes/quiz-*.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Round-robin targets shuffled per file for even spread. */
function targetSequence(mcCount) {
  const base = [0, 1, 2, 3];
  const seq = [];
  while (seq.length < mcCount) {
    for (const i of base) seq.push(i);
  }
  // Fisher–Yates on targets only (file-level, not security-critical)
  const a = seq.slice(0, mcCount);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rebalanceQuestion(q, targetIndex) {
  if (q.type !== "mc" || !Array.isArray(q.choices) || q.choices.length !== 4) {
    return q;
  }
  const ci = q.correctIndex;
  if (ci < 0 || ci > 3) return q;
  const correct = q.choices[ci];
  const others = q.choices.filter((_, i) => i !== ci);
  const newChoices = [];
  let oi = 0;
  for (let i = 0; i < 4; i++) {
    if (i === targetIndex) newChoices.push(correct);
    else newChoices.push(others[oi++]);
  }
  return { ...q, choices: newChoices, correctIndex: targetIndex };
}

function verifyDistribution(questions, file) {
  const mc = questions.filter((q) => q.type === "mc");
  const counts = [0, 0, 0, 0];
  for (const q of mc) counts[q.correctIndex] = (counts[q.correctIndex] ?? 0) + 1;
  const max = Math.max(...counts);
  const maxPct = mc.length ? (max / mc.length) * 100 : 0;
  const missing = counts.map((c, i) => (c === 0 ? i : null)).filter((x) => x !== null);
  if (maxPct > 40) {
    console.warn(`  WARN ${file}: index max ${maxPct.toFixed(0)}% > 40%`, counts);
  }
  if (missing.length > 0 && mc.length >= 4) {
    console.warn(`  WARN ${file}: missing indices`, missing, counts);
  }
  return { counts, maxPct, mc: mc.length };
}

async function processFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const bank = JSON.parse(raw);
  const mc = bank.questions.filter((q) => q.type === "mc");
  const targets = targetSequence(mc.length);
  let ti = 0;
  bank.questions = bank.questions.map((q) => {
    if (q.type !== "mc") return q;
    const t = targets[ti++];
    return rebalanceQuestion(q, t);
  });
  const stats = verifyDistribution(bank.questions, path.basename(filePath));
  await fs.writeFile(filePath, JSON.stringify(bank, null, 2) + "\n", "utf8");
  return stats;
}

async function main() {
  const pattern = process.argv[2] ?? "content/masterclass/quizzes/quiz-*.json";
  const dir = path.join(ROOT, "content/masterclass/quizzes");
  const files = (await fs.readdir(dir))
    .filter((f) => f.startsWith("quiz-") && f.endsWith(".json"))
    .map((f) => path.join(dir, f))
    .sort();

  if (files.length === 0) {
    console.error("No quiz JSON files found");
    process.exit(1);
  }

  console.log(`Shuffling ${files.length} quiz bank(s)…`);
  for (const f of files) {
    const s = await processFile(f);
    console.log(
      `  ${path.basename(f)}: ${s.mc} MC — correctIndex dist [${s.counts.join(",")}] max ${s.maxPct.toFixed(0)}%`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
