/**
 * Masterclass curriculum metadata — display names only; badge type IDs unchanged.
 */

export type MasterclassModule = {
  id: string;
  number: number;
  title: string;
  /** User-facing tier label — not the on-chain badge type id */
  tierDisplayName: string;
  badgeId: string;
  /** Server quiz bank wired (M1 only in Phase 2a) */
  quizLive: boolean;
  summary: string;
};

export const MASTERCLASS_MODULES: MasterclassModule[] = [
  {
    id: "module-01-soil-biology",
    number: 1,
    title: "Soil Biology Foundations",
    tierDisplayName: "Soil Keeper",
    badgeId: "masterclass-soil-biology",
    quizLive: true,
    summary:
      "Why IC SPICY grows soil first — the food web, fungi, reading your bed, and feeding biology.",
  },
  {
    id: "module-02-knf-jadam-inputs",
    number: 2,
    title: "KNF & JADAM Inputs",
    tierDisplayName: "Input Alchemist",
    badgeId: "masterclass-knf-inputs",
    quizLive: false,
    summary: "FPJ, OHN, JMS/JLF, and mineral inputs — CookBook-locked grower chemistry.",
  },
  {
    id: "module-03-regenerative-beds",
    number: 3,
    title: "Regenerative Bed Building",
    tierDisplayName: "Bed Builder",
    badgeId: "masterclass-bed-builder",
    quizLive: false,
    summary: "No-till, IMO ladder, compost, and mulch systems for living beds.",
  },
  {
    id: "module-04-rare-chili",
    number: 4,
    title: "Rare Chili Cultivation",
    tierDisplayName: "Chili Whisperer",
    badgeId: "masterclass-chili-cultivation",
    quizLive: false,
    summary:
      "Germinating superhots, genetics, vigor, flower-to-fruit, and peak-heat ripening.",
  },
  {
    id: "module-05-climate-seasons",
    number: 5,
    title: "Climate, Weather & Seasons",
    tierDisplayName: "Season Reader",
    badgeId: "masterclass-season-reader",
    quizLive: false,
    summary: "Moisture literacy, storms, Zone 10a seasonality, and overwintering.",
  },
  {
    id: "module-06-small-batch-provenance",
    number: 6,
    title: "Small-Batch Craft & Provenance",
    tierDisplayName: "Small-Batch Master",
    badgeId: "masterclass-small-batch",
    quizLive: false,
    summary: "Harvest handling, flavor balance, fermentation, and grower provenance.",
  },
];

/** Certified Grower — meta tier (display only; separate badge type). */
export const CERTIFIED_GROWER_TIER = "Certified Grower";

export function tierDisplayForBadgeId(badgeId: string): string | undefined {
  return MASTERCLASS_MODULES.find((m) => m.badgeId === badgeId)?.tierDisplayName;
}

/** M1 lessons with live server quizzes (subset of full catalog). */
export const M1_QUIZ_LESSON_IDS = ["m1-l1", "m1-l2", "m1-l3", "m1-l4"] as const;

export function moduleForLessonId(lessonId: string): MasterclassModule | undefined {
  const m = lessonId.match(/^m(\d+)-/);
  if (!m) return undefined;
  return MASTERCLASS_MODULES.find((mod) => mod.number === Number(m[1]));
}

export function hasLiveQuiz(lessonId: string): boolean {
  return (M1_QUIZ_LESSON_IDS as readonly string[]).includes(lessonId);
}
