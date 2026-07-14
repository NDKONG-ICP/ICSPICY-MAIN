#!/usr/bin/env node
/**
 * build-masterclass-lessons.mjs — bundle approved masterclass markdown into frontend JSON.
 *
 * Usage: node scripts/build-masterclass-lessons.mjs
 * Output: src/frontend/src/masterclass/lessons.generated.json
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MASTERCLASS_DIR = path.join(ROOT, "content", "masterclass");
const OUT = path.join(
  ROOT,
  "src/frontend/src/masterclass/lessons.generated.json",
);

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
      if (item) {
        const num = Number(item);
        meta[key].push(Number.isFinite(num) && String(num) === item ? num : item.replace(/^["']|["']$/g, ""));
      }
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
    else meta[key] = val.replace(/^["']|["']$/g, "").replace(/\s+#.*$/, "");
  }
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

function normalizeSectionKey(heading) {
  const h = heading.replace(/^🌶️\s*/, "").trim().toLowerCase();
  if (h === "core") return "core";
  if (h.includes("deeper heat")) return "deeperHeat";
  if (h.includes("grow it live")) return "growItLive";
  if (h.includes("further reading")) return "furtherReading";
  if (h.includes("quiz placeholder")) return null;
  return null;
}

function sanitizeDisplayText(text) {
  return text.replace(/Soil Steward/g, "Soil Keeper");
}

function parseSections(body) {
  const parts = body.split(/\n(?=## )/);
  let intro = "";
  const sections = {
    core: "",
    deeperHeat: "",
    growItLive: "",
    furtherReading: "",
  };

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^## (.+?)(?:\n|$)([\s\S]*)$/);
    if (!m) {
      intro = intro ? `${intro}\n\n${trimmed}` : trimmed;
      continue;
    }
    const key = normalizeSectionKey(m[1]);
    if (!key) continue;
    sections[key] = m[2].trim();
  }

  return { intro: intro.trim(), sections };
}

async function discoverLessons() {
  const lessons = [];
  const dirs = (await fs.readdir(MASTERCLASS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && d.name.startsWith("module-"))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const dir of dirs) {
    const modMatch = dir.name.match(/^module-(\d+)/);
    if (!modMatch) continue;
    const moduleNum = Number(modMatch[1]);
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
      const sourcePath = `${dir.name}/${stem}`;
      const { intro, sections } = parseSections(body);

      lessons.push({
        id: meta.id || `m${moduleNum}-l${lessonNum}`,
        module: moduleNum,
        lesson: lessonNum,
        moduleId: dir.name,
        sourcePath,
        title: meta.title || stem,
        displayTitle: `${moduleNum}.${lessonNum} ${meta.title || stem}`,
        outcome: sanitizeDisplayText(
          typeof meta.outcome === "string" ? meta.outcome : "",
        ),
        cookbookSlugs: Array.isArray(meta.cookbookSlugs) ? meta.cookbookSlugs : [],
        pepperpediaVarietyIds: Array.isArray(meta.pepperpediaVarietyIds)
          ? meta.pepperpediaVarietyIds.map(Number).filter(Number.isFinite)
          : [],
        quizId: meta.quizId || `quiz-m${moduleNum}-l${lessonNum}`,
        gamePracticum: sanitizeDisplayText(meta.gamePracticum || ""),
        intro: sanitizeDisplayText(intro.trim()),
        sections: {
          core: sanitizeDisplayText(sections.core),
          deeperHeat: sanitizeDisplayText(sections.deeperHeat),
          growItLive: sanitizeDisplayText(sections.growItLive),
          furtherReading: sanitizeDisplayText(sections.furtherReading),
        },
      });
    }
  }

  return lessons.sort((a, b) =>
    a.module !== b.module ? a.module - b.module : a.lesson - b.lesson,
  );
}

async function main() {
  const lessons = await discoverLessons();
  const payload = {
    generatedAt: new Date().toISOString(),
    count: lessons.length,
    lessons,
  };
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${lessons.length} lessons → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
