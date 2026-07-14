#!/usr/bin/env node
/**
 * Verify MC correctIndex distribution in quiz JSON banks.
 * Fails if any index exceeds 40% share or any of 0–3 is missing (when mc >= 4).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(ROOT, "content/masterclass/quizzes");

async function main() {
  const files = (await fs.readdir(dir))
    .filter((f) => f.startsWith("quiz-") && f.endsWith(".json"))
    .sort();
  let failed = false;
  for (const f of files) {
    const bank = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
    const mc = bank.questions.filter((q) => q.type === "mc");
    const counts = [0, 0, 0, 0];
    for (const q of mc) {
      if (q.correctIndex < 0 || q.correctIndex > 3) {
        console.error(`${f}: invalid correctIndex ${q.correctIndex} on ${q.id}`);
        failed = true;
        continue;
      }
      const correct = q.choices[q.correctIndex];
      if (!correct || !q.choices.includes(correct)) {
        console.error(`${f}: correctIndex out of range on ${q.id}`);
        failed = true;
      }
      counts[q.correctIndex]++;
    }
    const max = Math.max(...counts, 0);
    const maxPct = mc.length ? (max / mc.length) * 100 : 0;
    const missing = counts.map((c, i) => (c === 0 ? i : null)).filter((x) => x !== null);
    console.log(
      `${f}: ${mc.length} MC — [${counts.join(",")}] max ${maxPct.toFixed(0)}%`,
    );
    if (maxPct > 40) {
      console.error(`  FAIL: max ${maxPct.toFixed(0)}% > 40%`);
      failed = true;
    }
    if (missing.length > 0 && mc.length >= 4) {
      console.error(`  FAIL: missing indices ${missing.join(",")}`);
      failed = true;
    }
  }
  if (files.length === 0) {
    console.error("No quiz banks found");
    process.exit(1);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
