/**
 * Pepper Patch v2 — educational copy, cookbook + masterclass links.
 * ORIGINAL IC SPICY prose; practitioners credited in Field Notes only.
 */

export type MechanicId =
  | "soil_prep"
  | "soil_biology"
  | "soil_moisture"
  | "mulch"
  | "overwater"
  | "inputs_shed"
  | "phase_feeding"
  | "weather"
  | "season"
  | "storm";

export interface EduTip {
  id: MechanicId;
  title: string;
  body: string;
  cookbookSlug?: string;
  masterclassLessonId?: string;
}

export const EDU_TIPS: EduTip[] = [
  {
    id: "soil_prep",
    title: "Soil Prep First",
    body: "Chilies drink through living soil, not bottles. Layer compost, microbes, and mulch before you plant — that's the IC SPICY way.",
    masterclassLessonId: "m1-l1",
  },
  {
    id: "soil_biology",
    title: "Soil Biology Meter",
    body: "A fed workforce under the roots multiplies growth and peak SHU. Starve the bed and even 'fed' plants look hungry.",
    cookbookSlug: "aerated-compost-tea",
    masterclassLessonId: "m1-l4",
  },
  {
    id: "soil_moisture",
    title: "Soil Moisture",
    body: "Rain wets the bed; sun pulls moisture back. Moist soil is the sweet spot — soggy roots drown the microbes you just hired.",
    masterclassLessonId: "m5-l1",
  },
  {
    id: "mulch",
    title: "Mulch Shield",
    body: "Mulch keeps biology alive through storms and heat spikes — it's payroll insurance for the root zone.",
    cookbookSlug: "fungal-dominant-mulch",
    masterclassLessonId: "m3-l4",
  },
  {
    id: "overwater",
    title: "Easy on the Hose",
    body: "Watering an already-moist bed flushes air from the root zone and knocks back soil biology. Check moisture first.",
    masterclassLessonId: "m5-l1",
  },
  {
    id: "inputs_shed",
    title: "Inputs Shed",
    body: "Brew FPJ, OHN, and friends on short timers — fermented inputs seed the workforce you'll spray at care time.",
    cookbookSlug: "fermented-plant-juice-fpj",
    masterclassLessonId: "m2-l1",
  },
  {
    id: "phase_feeding",
    title: "Feed the Phase",
    body: "Leaves want nitrogen biology (FPJ); flowers and fruit want minerals (calcium). Right input, right window — that's peak heat.",
    masterclassLessonId: "m2-l4",
  },
  {
    id: "weather",
    title: "Patch Weather",
    body: "Rain refreshes moisture; storms pause tending. Plan care between weather windows like a real Florida grower.",
    masterclassLessonId: "m5-l2",
  },
  {
    id: "season",
    title: "Season Dial",
    body: "Seasons nudge growth pace — spring and summer push vigor; fall and winter reward patience and mulch.",
    masterclassLessonId: "m5-l3",
  },
  {
    id: "storm",
    title: "Storm Watch",
    body: "Storms lock the patch until they pass. Mulched beds hold biology; bare soil bleeds it — cover pays off here.",
    masterclassLessonId: "m5-l2",
  },
];

export const EDU_BY_ID = Object.fromEntries(EDU_TIPS.map((t) => [t.id, t])) as Record<
  MechanicId,
  EduTip
>;

export type SoilAmendmentId = "compost" | "imo" | "jms" | "mulch";
export type InputKind = "fpj" | "ohn" | "jms" | "calcium" | "imo";

export interface AmendmentDef {
  id: SoilAmendmentId;
  label: string;
  biologyBoost: number;
  cookbookSlug: string;
  blurb: string;
}

export const SOIL_AMENDMENTS: AmendmentDef[] = [
  {
    id: "compost",
    label: "Compost",
    biologyBoost: 12,
    cookbookSlug: "thermophilic-windrow",
    blurb: "Thermophilic compost feeds the decomposer crew that unlocks nutrients.",
  },
  {
    id: "imo",
    label: "IMO",
    biologyBoost: 18,
    cookbookSlug: "imo-stage-4-soil-amendment",
    blurb: "Indigenous microorganisms recruit local fungi and bacteria into your bed.",
  },
  {
    id: "jms",
    label: "JMS",
    biologyBoost: 14,
    cookbookSlug: "jadam-microorganism-solution-jms",
    blurb: "JADAM microbe solution jump-starts biology on tired sand.",
  },
  {
    id: "mulch",
    label: "Mulch",
    biologyBoost: 8,
    cookbookSlug: "fungal-dominant-mulch",
    blurb: "Woody mulch shields moisture and feeds fungi through hot afternoons.",
  },
];

export interface InputRecipeDef {
  kind: InputKind;
  label: string;
  brewMs: number;
  sprite: string;
  cookbookSlug: string;
  blurb: string;
  phases: ("vegetative" | "flowering" | "fruiting")[];
}

export const INPUT_RECIPES: InputRecipeDef[] = [
  {
    kind: "fpj",
    label: "FPJ",
    brewMs: 120_000,
    sprite: "input_fpj",
    cookbookSlug: "fermented-plant-juice-fpj",
    blurb: "Fermented plant juice — vegetative nitrogen biology in a bottle.",
    phases: ["vegetative"],
  },
  {
    kind: "ohn",
    label: "OHN",
    brewMs: 600_000,
    sprite: "input_ohn",
    cookbookSlug: "oriental-herbal-nutrient-ohn",
    blurb: "Oriental herbal nutrient — prestige tonic that steadies the whole patch.",
    phases: ["vegetative", "flowering", "fruiting"],
  },
  {
    kind: "jms",
    label: "JMS",
    brewMs: 180_000,
    sprite: "input_jlf",
    cookbookSlug: "jadam-microorganism-solution-jms",
    blurb: "JADAM microbe brew — great all-phase biology booster.",
    phases: ["vegetative", "flowering"],
  },
  {
    kind: "calcium",
    label: "Calcium",
    brewMs: 240_000,
    sprite: "input_calcium",
    cookbookSlug: "water-soluble-calcium-wca",
    blurb: "Water-soluble calcium for flowering and fruit set integrity.",
    phases: ["flowering", "fruiting"],
  },
  {
    kind: "imo",
    label: "IMO",
    brewMs: 300_000,
    sprite: "input_imo",
    cookbookSlug: "imo-stage-4-soil-amendment",
    blurb: "Finished IMO amendment — living soil food for any growth stage.",
    phases: ["vegetative", "flowering", "fruiting"],
  },
];

export const INPUT_BY_KIND = Object.fromEntries(
  INPUT_RECIPES.map((r) => [r.kind, r]),
) as Record<InputKind, InputRecipeDef>;

/** Casual-default prep gives OK biology without min-maxing. */
export const CASUAL_PREP_DEFAULTS: SoilAmendmentId[] = ["compost", "mulch"];

export const WEATHER_CYCLE_MS = 90_000;
export const SEASON_CYCLE_MS = 240_000;
export const SOIL_BIO_DECAY_PER_MIN = 0.15;
export const STORM_PAUSE_MS = 25_000;
