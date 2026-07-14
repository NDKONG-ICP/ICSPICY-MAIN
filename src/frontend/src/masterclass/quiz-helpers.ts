/**
 * Masterclass quiz helpers — draw/shuffle, guest progress, SpicyAI tutoring.
 * Pass/fail for badges is ALWAYS server-side via submitQuizResult.
 */
import { lessonPathFromExplanationSlug } from "./lesson-data";

export type QuestionKind = { mc: null } | { sa: null };

export type QuestionPublic = {
  id: string;
  lessonId: string;
  kind: QuestionKind;
  prompt: string;
  choices: string[];
  explanationSlug: string;
  difficulty: bigint;
};

export type QuizPublic = {
  lessonId: string;
  moduleId: string;
  badgeId: string;
  quizVersion: bigint;
  drawCount: bigint;
  passCorrect: bigint;
  title: string;
  questions: QuestionPublic[];
};

export type LessonProgressLocal = {
  attempts: number;
  bestScorePct: number;
  passed: boolean;
  passedAt: number;
  quizVersion: number;
};

export type ProgressLocal = {
  version: number;
  lessons: Record<string, LessonProgressLocal>;
};

export const M1_LESSONS = [
  { id: "m1-l1", title: "1.1 The Soil Food Web" },
  { id: "m1-l2", title: "1.2 Fungi & Mycorrhizae" },
  { id: "m1-l3", title: "1.3 Reading Your Soil" },
  { id: "m1-l4", title: "1.4 Feeding the Biology" },
] as const;

export const GUEST_PROGRESS_KEY = "icspicy:masterclass-progress:v1";
export const EXPLAIN_CACHE_KEY = "icspicy:masterclass-explain:v1";

export function isMc(kind: QuestionKind): boolean {
  return "mc" in kind;
}

/** Fisher–Yates shuffle copy. */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/** Matches Motoko MasterclassLib.hashSeed / choicePermutation for server grading. */
export function hashSeed(s: string): number {
  let h = 5381n;
  for (const ch of s) {
    h = (h * 33n + BigInt(ch.codePointAt(0)!)) % 2_147_483_647n;
  }
  return Number(h);
}

function lcgNext(state: number): number {
  const s = BigInt(state);
  return Number((s * 1_103_515_245n + 12_345n) % 2_147_483_648n);
}

/** perm[displayIndex] = original bank index shown at that slot. */
export function choicePermutation(
  n: number,
  seed: string,
  questionId: string,
): number[] {
  const perm = Array.from({ length: n }, (_, i) => i);
  let state = hashSeed(`${seed}:${questionId}`);
  for (let i = n - 1; i > 0; i--) {
    state = lcgNext(state);
    const j = state % (i + 1);
    const tmp = perm[i]!;
    perm[i] = perm[j]!;
    perm[j] = tmp;
  }
  return perm;
}

export function shuffleMcChoices(
  choices: string[],
  seed: string,
  questionId: string,
): string[] {
  const perm = choicePermutation(choices.length, seed, questionId);
  return perm.map((origIdx) => choices[origIdx]!);
}

export function newAttemptSeed(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function drawQuestions(
  quiz: QuizPublic,
  attemptSeed: string,
): QuestionPublic[] {
  const n = Number(quiz.drawCount);
  const bank = shuffle(quiz.questions);
  return bank.slice(0, Math.min(n, bank.length)).map((q) => {
    if (!isMc(q.kind) || q.choices.length < 2) return q;
    return {
      ...q,
      choices: shuffleMcChoices(q.choices, attemptSeed, q.id),
    };
  });
}

export function buildAnswersPayload(
  drawn: QuestionPublic[],
  answers: Record<string, { choice?: number; text?: string }>,
  attemptSeed: string,
): string {
  const items = drawn.map((q) => {
    const a = answers[q.id] ?? {};
    if (isMc(q.kind)) {
      return { id: q.id, choice: a.choice ?? -1 };
    }
    return { id: q.id, text: a.text ?? "" };
  });
  return JSON.stringify({ seed: attemptSeed, answers: items });
}

/**
 * Client-side SA matcher (UX only) — mirrors server whole-word token rules.
 * Server re-grade is authoritative for pass/mint.
 */
export function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function countKeywordHits(answer: string, keywords: string[]): number {
  const tokens = tokenize(answer);
  let hits = 0;
  for (const kw of keywords) {
    const needle = tokenize(kw);
    if (needle.length === 0) continue;
    if (needle.length === 1) {
      if (tokens.includes(needle[0]!)) hits += 1;
    } else {
      for (let i = 0; i <= tokens.length - needle.length; i++) {
        if (needle.every((t, j) => tokens[i + j] === t)) {
          hits += 1;
          break;
        }
      }
    }
  }
  return hits;
}

export function loadGuestProgress(): ProgressLocal {
  try {
    const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
    if (!raw) return { version: 1, lessons: {} };
    return JSON.parse(raw) as ProgressLocal;
  } catch {
    return { version: 1, lessons: {} };
  }
}

export function saveGuestProgress(p: ProgressLocal) {
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(p));
}

export function parseProgressJson(json: string): ProgressLocal {
  try {
    const o = JSON.parse(json) as ProgressLocal;
    return { version: o.version ?? 1, lessons: o.lessons ?? {} };
  } catch {
    return { version: 1, lessons: {} };
  }
}

export function lessonDocPath(slug: string): string {
  return lessonPathFromExplanationSlug(slug);
}

export function getCachedExplanation(questionId: string): string | null {
  try {
    const raw = sessionStorage.getItem(EXPLAIN_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[questionId] ?? null;
  } catch {
    return null;
  }
}

export function setCachedExplanation(questionId: string, text: string) {
  try {
    const raw = sessionStorage.getItem(EXPLAIN_CACHE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[questionId] = text;
    sessionStorage.setItem(EXPLAIN_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function buildWhyPrompt(
  prompt: string,
  correctHint: string,
  explanationSlug: string,
): string {
  return [
    `You are tutoring an IC SPICY Masterclass learner.`,
    `Explain briefly why this is correct for the question below.`,
    `Ground your answer in the masterclass lesson "${explanationSlug}" (soil biology / regenerative chili growing).`,
    `Keep it under 120 words, plain grower English.`,
    ``,
    `Question: ${prompt}`,
    `Correct direction: ${correctHint}`,
  ].join("\n");
}
