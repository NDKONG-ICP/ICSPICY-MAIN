#!/usr/bin/env node
/**
 * Sync approved quiz JSON banks → src/backend/lib/masterclass-quiz-bank.mo
 * Usage: node scripts/sync-quiz-bank-to-motoko.mjs [m1-l1 m1-l2 ...]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src/backend/lib/masterclass-quiz-bank.mo");
const QUIZ_DIR = path.join(ROOT, "content/masterclass/quizzes");

const SLUG_CONST = {
  "m1-l1": "M1_SLUG_1",
  "m1-l2": "M1_SLUG_2",
  "m1-l3": "M1_SLUG_3",
  "m1-l4": "M1_SLUG_4",
};

const EXPLANATION_TO_SLUG = {
  "module-01-soil-biology/01-the-soil-food-web": "M1_SLUG_1",
  "module-01-soil-biology/02-fungi-and-mycorrhizae": "M1_SLUG_2",
  "module-01-soil-biology/03-reading-your-soil": "M1_SLUG_3",
  "module-01-soil-biology/04-feeding-the-biology": "M1_SLUG_4",
};

function escMotoko(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function mcLine(q) {
  const slug = EXPLANATION_TO_SLUG[q.explanationSlug] ?? SLUG_CONST[q.lessonId];
  const choices = `[${q.choices.map((c) => `"${escMotoko(c)}"`).join(", ")}]`;
  return `        mc("${escMotoko(q.id)}", "${escMotoko(q.lessonId)}", "${escMotoko(q.prompt)}", ${choices}, ${q.correctIndex}, ${slug}, ${q.difficulty}),`;
}

function saLine(q) {
  const slug = EXPLANATION_TO_SLUG[q.explanationSlug] ?? SLUG_CONST[q.lessonId];
  const kws = `[${q.acceptedKeywords.map((k) => `"${escMotoko(k)}"`).join(", ")}]`;
  return `        sa("${escMotoko(q.id)}", "${escMotoko(q.lessonId)}", "${escMotoko(q.prompt)}", ${kws}, ${q.minKeywords}, ${slug}, ${q.difficulty}),`;
}

function bankFnName(lessonId) {
  return `bank${lessonId.replace("m", "M").replace("-l", "L").toUpperCase()}`;
}

async function loadBank(lessonId) {
  const p = path.join(QUIZ_DIR, `quiz-${lessonId}.json`);
  return JSON.parse(await fs.readFile(p, "utf8"));
}

function renderBank(bank) {
  const fn = bankFnName(bank.lessonId);
  const lines = bank.questions.map((q) =>
    q.type === "mc" ? mcLine(q) : saLine(q),
  );
  return `  func ${fn}() : Bank {
    {
      lessonId = "${bank.lessonId}";
      moduleId = "${bank.moduleId}";
      badgeId = Types.BADGE_SOIL_BIOLOGY;
      quizVersion = ${bank.quizVersion};
      drawCount = ${bank.drawCount};
      passCorrect = ${bank.passCorrect};
      title = "${escMotoko(bank.title)}";
      questions = [
${lines.join("\n")}
      ];
    };
  };`;
}

const HEADER = `// lib/masterclass-quiz-bank.mo — Canister-side full banks (answer keys NEVER leave).
// AUTO-GENERATED from content/masterclass/quizzes/quiz-m1-l*.json — do not hand-edit banks.
// Regenerate: node scripts/sync-quiz-bank-to-motoko.mjs

import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Types "../types/masterclass";

module {
  public type Bank = {
    lessonId : Text;
    moduleId : Text;
    badgeId : Text;
    quizVersion : Nat;
    drawCount : Nat;
    passCorrect : Nat;
    title : Text;
    questions : [Types.QuestionFull];
  };

  func mc(
    id : Text,
    lessonId : Text,
    prompt : Text,
    choices : [Text],
    correctIndex : Nat,
    explanationSlug : Text,
    difficulty : Nat,
  ) : Types.QuestionFull {
    {
      id;
      lessonId;
      kind = #mc;
      prompt;
      choices;
      correctIndex;
      acceptedKeywords = [];
      minKeywords = 0;
      explanationSlug;
      difficulty;
    };
  };

  func sa(
    id : Text,
    lessonId : Text,
    prompt : Text,
    acceptedKeywords : [Text],
    minKeywords : Nat,
    explanationSlug : Text,
    difficulty : Nat,
  ) : Types.QuestionFull {
    {
      id;
      lessonId;
      kind = #sa;
      prompt;
      choices = [];
      correctIndex = 0;
      acceptedKeywords;
      minKeywords;
      explanationSlug;
      difficulty;
    };
  };

  let M1_SLUG_1 = "module-01-soil-biology/01-the-soil-food-web";
  let M1_SLUG_2 = "module-01-soil-biology/02-fungi-and-mycorrhizae";
  let M1_SLUG_3 = "module-01-soil-biology/03-reading-your-soil";
  let M1_SLUG_4 = "module-01-soil-biology/04-feeding-the-biology";

`;

const FOOTER = `
  public func getBank(lessonId : Text) : ?Bank {
    if (lessonId == "m1-l1") { ?bankM1L1() }
    else if (lessonId == "m1-l2") { ?bankM1L2() }
    else if (lessonId == "m1-l3") { ?bankM1L3() }
    else if (lessonId == "m1-l4") { ?bankM1L4() }
    else { null };
  };

  public func toPublic(bank : Bank) : Types.QuizPublic {
    {
      lessonId = bank.lessonId;
      moduleId = bank.moduleId;
      badgeId = bank.badgeId;
      quizVersion = bank.quizVersion;
      drawCount = bank.drawCount;
      passCorrect = bank.passCorrect;
      title = bank.title;
      questions = Array.map<Types.QuestionFull, Types.QuestionPublic>(
        bank.questions,
        func(q) {
          {
            id = q.id;
            lessonId = q.lessonId;
            kind = q.kind;
            prompt = q.prompt;
            choices = q.choices;
            explanationSlug = q.explanationSlug;
            difficulty = q.difficulty;
          };
        },
      );
    };
  };

  public func findQuestion(bank : Bank, id : Text) : ?Types.QuestionFull {
    Array.find<Types.QuestionFull>(bank.questions, func(q) { Text.equal(q.id, id) });
  };

  /// Lessons required to earn masterclass-soil-biology.
  public let M1_LESSON_IDS : [Text] = ["m1-l1", "m1-l2", "m1-l3", "m1-l4"];

  /// Locked module → badge map (permanent idempotency keys).
  public func badgeForModule(moduleId : Text) : ?Text {
    if (moduleId == "module-01-soil-biology") { ?Types.BADGE_SOIL_BIOLOGY }
    else if (moduleId == "module-02-knf-jadam-inputs") { ?Types.BADGE_KNF_INPUTS }
    else if (moduleId == "module-03-regenerative-beds") { ?Types.BADGE_BED_BUILDER }
    else if (moduleId == "module-04-rare-chili") { ?Types.BADGE_CHILI_CULTIVATION }
    else if (moduleId == "module-05-climate-seasons") { ?Types.BADGE_SEASON_READER }
    else if (moduleId == "module-06-small-batch-provenance") { ?Types.BADGE_SMALL_BATCH }
    else { null };
  };

  public let ALL_MODULE_BADGES : [Text] = [
    Types.BADGE_SOIL_BIOLOGY,
    Types.BADGE_KNF_INPUTS,
    Types.BADGE_BED_BUILDER,
    Types.BADGE_CHILI_CULTIVATION,
    Types.BADGE_SEASON_READER,
    Types.BADGE_SMALL_BATCH,
  ];
};
`;

async function main() {
  const lessons = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["m1-l1", "m1-l2", "m1-l3", "m1-l4"];
  const banks = await Promise.all(lessons.map(loadBank));
  const body = banks.map(renderBank).join("\n\n");
  await fs.writeFile(OUT, HEADER + body + FOOTER, "utf8");
  console.log(`Wrote ${OUT} (${lessons.join(", ")})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
