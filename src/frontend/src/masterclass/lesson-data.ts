/**
 * Build-time masterclass lesson catalog (from content/masterclass/*.md).
 * Regenerate: node scripts/build-masterclass-lessons.mjs
 */
import catalog from "./lessons.generated.json";

export type LessonSections = {
  core: string;
  deeperHeat: string;
  growItLive: string;
  furtherReading: string;
};

export type LessonRecord = {
  id: string;
  module: number;
  lesson: number;
  moduleId: string;
  sourcePath: string;
  title: string;
  displayTitle: string;
  outcome: string;
  cookbookSlugs: string[];
  pepperpediaVarietyIds: number[];
  quizId: string;
  gamePracticum: string;
  intro: string;
  sections: LessonSections;
};

export type LessonCatalog = {
  generatedAt: string;
  count: number;
  lessons: LessonRecord[];
};

const data = catalog as LessonCatalog;

export const LESSONS: LessonRecord[] = data.lessons;

const byId = new Map(LESSONS.map((l) => [l.id, l]));
const bySourcePath = new Map(LESSONS.map((l) => [l.sourcePath, l]));

export function getLessonById(id: string): LessonRecord | undefined {
  return byId.get(id);
}

export function getLessonBySourcePath(path: string): LessonRecord | undefined {
  return bySourcePath.get(path);
}

export function lessonsForModule(moduleNumber: number): LessonRecord[] {
  return LESSONS.filter((l) => l.module === moduleNumber);
}

export function lessonPath(lessonId: string): string {
  return `/masterclass/lesson/${lessonId}`;
}

export function quizPath(lessonId: string): string {
  return `/masterclass/quiz/${lessonId}`;
}

/** Map quiz explanationSlug (module dir + file stem) → lesson route. */
export function lessonPathFromExplanationSlug(slug: string): string {
  const lesson = getLessonBySourcePath(slug);
  if (lesson) return lessonPath(lesson.id);
  return `/masterclass`;
}

export function adjacentLessons(lessonId: string): {
  prev: LessonRecord | null;
  next: LessonRecord | null;
} {
  const idx = LESSONS.findIndex((l) => l.id === lessonId);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? LESSONS[idx - 1]! : null,
    next: idx < LESSONS.length - 1 ? LESSONS[idx + 1]! : null,
  };
}
