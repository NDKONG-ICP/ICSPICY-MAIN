/**
 * variety-guide-ai — generates location-personalized regenerative growing
 * guides (KNF / Master Cho / Chris Trump / Matt Powers style) via the
 * SpicyAI canister, referencing REAL CookBook recipes with [recipe:ID]
 * tokens. Falls back to a deterministic KNF stage guide when AI fails.
 */
import { extractJsonFromLlmResponse } from "./garden-ai";
import {
  chatErrorToString,
  getSpicyAiActor,
  toSpicyAiMessage,
} from "./spicyai-idl";

// ── Types ────────────────────────────────────────────────────────────────────

export type GuideSectionDraft = {
  id: string;
  title: string;
  icon: string;
  content: string;
  timing: string | null;
};

export type GeneratedGuide = {
  sections: GuideSectionDraft[];
  recipeRefs: bigint[];
  /** True when the guide came from the static fallback, not the AI. */
  isFallback: boolean;
};

export type RecipeSummary = {
  id: bigint;
  title: string;
  category: string;
};

export type GuideVarietyInput = {
  varietyId: bigint;
  name: string;
  species: string;
  scovilleMax: number;
  daysToMaturity: number | null;
  description: string;
};

export type GuideConditions = {
  zone: string;
  soilType: "sandy" | "clay" | "loam" | "muck";
  waterSource: "municipal" | "well" | "rainwater";
  ph: number | null;
};

export const DEFAULT_CONDITIONS: GuideConditions = {
  zone: "10a",
  soilType: "sandy",
  waterSource: "municipal",
  ph: null,
};

const CONDITIONS_STORAGE_KEY = "nims-guide-conditions";

export function loadGuideConditions(): GuideConditions {
  try {
    const raw = localStorage.getItem(CONDITIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_CONDITIONS;
    const parsed = JSON.parse(raw) as Partial<GuideConditions>;
    return { ...DEFAULT_CONDITIONS, ...parsed };
  } catch {
    return DEFAULT_CONDITIONS;
  }
}

export function saveGuideConditions(c: GuideConditions): void {
  try {
    localStorage.setItem(CONDITIONS_STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/**
 * Cache key stored as the backend "zone" field.
 * Default guide: bare zone ("10a"). Personalized: "10a:sandy:municipal".
 */
export function guideCacheKey(
  conditions: GuideConditions,
  personalized: boolean,
): string {
  if (!personalized) return conditions.zone;
  return `${conditions.zone}:${conditions.soilType}:${conditions.waterSource}`;
}

// ── Section scaffolding ──────────────────────────────────────────────────────

export const GUIDE_SECTION_ORDER = [
  "overview",
  "soil_prep",
  "planting",
  "nutrition",
  "pest",
  "harvest",
] as const;

const SECTION_DEFAULTS: Record<string, { title: string; icon: string }> = {
  overview: { title: "Overview", icon: "🌱" },
  soil_prep: { title: "Soil Preparation", icon: "🪱" },
  planting: { title: "Planting", icon: "🌰" },
  nutrition: { title: "Nutrition Schedule", icon: "🧪" },
  pest: { title: "Pest & Disease", icon: "🐛" },
  harvest: { title: "Harvest", icon: "🌶️" },
};

// ── Prompt ───────────────────────────────────────────────────────────────────

const GUIDE_SYSTEM_PROMPT = `You are a regenerative agriculture expert trained in Korean Natural Farming (Master Cho Han-kyu), Chris Trump's KNF methods, and Matt Powers' regenerative soil science.

Generate a growing guide for the given plant variety, personalized to the grower's USDA zone and conditions.

Core principles you follow:
- Soil biology first: IMO (Indigenous Microorganisms) collection and application
- Nutritive cycle theory: match inputs to plant growth stage (Master Cho)
- FPJ (Fermented Plant Juice) for vegetative growth, FFJ (Fermented Fruit Juice) for fruiting
- OHN (Oriental Herbal Nutrient) for plant immunity
- LAB (Lactic Acid Bacteria) for soil and foliar health
- WCA (Water-soluble Calcium) during fruiting, WCP (Water-soluble Calcium Phosphate) for root development
- EAA/FAA (Fish Amino Acid) for nitrogen during vegetative stage
- No synthetic fertilizers or pesticides — biological solutions only
- Mulching, no-till, cover cropping where applicable

AVAILABLE RECIPES (reference these by ID with [recipe:ID] tokens — NEVER invent IDs):
{RECIPE_LIST}

Respond ONLY with valid JSON, no markdown fences, no prose:
{
  "sections": [
    { "id": "overview", "title": "Overview", "icon": "🌱", "content": "markdown...", "timing": null },
    { "id": "soil_prep", "title": "Soil Preparation", "icon": "🪱", "content": "... apply [recipe:12] before planting ...", "timing": "2-4 weeks before planting" },
    { "id": "planting", "title": "Planting", "icon": "🌰", "content": "...", "timing": "..." },
    { "id": "nutrition", "title": "Nutrition Schedule", "icon": "🧪", "content": "stage-by-stage KNF input schedule...", "timing": null },
    { "id": "pest", "title": "Pest & Disease", "icon": "🐛", "content": "...", "timing": null },
    { "id": "harvest", "title": "Harvest", "icon": "🌶️", "content": "...", "timing": "..." }
  ]
}`;

function recipeListSnippet(recipes: RecipeSummary[]): string {
  if (recipes.length === 0) return "(no recipes available)";
  return recipes
    .slice(0, 80)
    .map((r) => `${r.id.toString()}: ${r.title} (${r.category})`)
    .join("\n");
}

function buildUserPrompt(
  variety: GuideVarietyInput,
  conditions: GuideConditions,
): string {
  const lines = [
    `Variety: ${variety.name}`,
    `Species: ${variety.species}`,
  ];
  if (variety.scovilleMax > 0) {
    lines.push(`Scoville: up to ${variety.scovilleMax.toLocaleString()} SHU`);
  }
  if (variety.daysToMaturity != null) {
    lines.push(`Days to maturity: ~${variety.daysToMaturity}`);
  }
  if (variety.description) {
    lines.push(`Notes: ${variety.description.slice(0, 300)}`);
  }
  lines.push(`USDA zone: ${conditions.zone}`);
  lines.push(`Soil type: ${conditions.soilType}`);
  lines.push(`Water source: ${conditions.waterSource}`);
  if (conditions.ph != null) lines.push(`Known soil pH: ${conditions.ph}`);
  if (conditions.waterSource === "municipal") {
    lines.push(
      "Important: water source is municipal — note chlorine dechlorination (let water sit 24h or aerate) before LAB/IMO applications.",
    );
  }
  return lines.join("\n");
}

// ── Validation ───────────────────────────────────────────────────────────────

const RECIPE_TOKEN_RE = /\[recipe:(\d+)\]/g;

/**
 * Strip [recipe:ID] tokens that don't correspond to a real CookBook recipe,
 * and collect the valid referenced IDs.
 */
export function sanitizeRecipeTokens(
  content: string,
  validIds: Set<string>,
): { content: string; refs: bigint[] } {
  const refs = new Set<string>();
  const cleaned = content.replace(RECIPE_TOKEN_RE, (match, idStr: string) => {
    if (validIds.has(idStr)) {
      refs.add(idStr);
      return match;
    }
    return "";
  });
  return { content: cleaned, refs: [...refs].map((s) => BigInt(s)) };
}

type RawSection = {
  id?: unknown;
  title?: unknown;
  icon?: unknown;
  content?: unknown;
  timing?: unknown;
};

function validateSections(
  raw: unknown,
  validRecipeIds: Set<string>,
): { sections: GuideSectionDraft[]; recipeRefs: bigint[] } | null {
  const obj = raw as { sections?: unknown } | null;
  if (!obj || !Array.isArray(obj.sections) || obj.sections.length === 0) {
    return null;
  }
  const allRefs = new Set<string>();
  const seen = new Set<string>();
  const sections: GuideSectionDraft[] = [];

  for (const s of obj.sections as RawSection[]) {
    if (typeof s?.content !== "string" || s.content.trim().length < 20) {
      continue;
    }
    const id =
      typeof s.id === "string" && s.id.trim() ? s.id.trim().slice(0, 40) : "";
    const key = id || `section_${sections.length}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const defaults = SECTION_DEFAULTS[id] ?? {
      title: "Growing Notes",
      icon: "🌿",
    };
    const { content, refs } = sanitizeRecipeTokens(
      s.content.trim().slice(0, 12_000),
      validRecipeIds,
    );
    for (const r of refs) allRefs.add(r.toString());

    sections.push({
      id: key,
      title:
        typeof s.title === "string" && s.title.trim()
          ? s.title.trim().slice(0, 160)
          : defaults.title,
      icon:
        typeof s.icon === "string" && s.icon.trim()
          ? s.icon.trim().slice(0, 8)
          : defaults.icon,
      content,
      timing:
        typeof s.timing === "string" && s.timing.trim()
          ? s.timing.trim().slice(0, 120)
          : null,
    });
    if (sections.length >= 10) break;
  }

  if (sections.length < 3) return null;

  // Keep canonical ordering where possible; unknown ids trail.
  const orderIndex = (id: string) => {
    const i = (GUIDE_SECTION_ORDER as readonly string[]).indexOf(id);
    return i === -1 ? 99 : i;
  };
  sections.sort((a, b) => orderIndex(a.id) - orderIndex(b.id));

  return { sections, recipeRefs: [...allRefs].map((s) => BigInt(s)) };
}

// ── Fallback ─────────────────────────────────────────────────────────────────

/** Find a real recipe whose title matches any of the keywords. */
function findRecipe(
  recipes: RecipeSummary[],
  keywords: string[],
): RecipeSummary | null {
  for (const kw of keywords) {
    const hit = recipes.find((r) =>
      r.title.toLowerCase().includes(kw.toLowerCase()),
    );
    if (hit) return hit;
  }
  return null;
}

function token(r: RecipeSummary | null): string {
  return r ? ` [recipe:${r.id.toString()}]` : "";
}

/**
 * Deterministic KNF stage guide used when AI generation fails. References
 * real CookBook recipes found by name keywords — never invented IDs.
 */
export function buildFallbackGuide(
  variety: GuideVarietyInput,
  conditions: GuideConditions,
  recipes: RecipeSummary[],
): GeneratedGuide {
  const imo = findRecipe(recipes, ["IMO", "indigenous micro"]);
  const lab = findRecipe(recipes, ["LAB", "lactic acid"]);
  const fpj = findRecipe(recipes, ["FPJ", "fermented plant juice"]);
  const ffj = findRecipe(recipes, ["FFJ", "fermented fruit juice"]);
  const ohn = findRecipe(recipes, ["OHN", "oriental herbal"]);
  const faa = findRecipe(recipes, ["FAA", "fish amino", "EAA"]);
  const wca = findRecipe(recipes, ["WCA", "water-soluble calcium", "calcium"]);

  const isPepper = variety.scovilleMax > 0;
  const chlorineNote =
    conditions.waterSource === "municipal"
      ? "\n\n**Municipal water note:** dechlorinate before applying LAB or IMO — let water sit uncovered for 24 hours or aerate vigorously, since chlorine kills the microbes you're introducing."
      : "";

  const refs = new Set<string>();
  const collect = (content: string) => {
    for (const m of content.matchAll(RECIPE_TOKEN_RE)) refs.add(m[1]!);
    return content;
  };

  const sections: GuideSectionDraft[] = [
    {
      id: "overview",
      title: "Overview",
      icon: "🌱",
      content: collect(
        `**${variety.name}** (*${variety.species}*) grown the regenerative way in Zone ${conditions.zone}.` +
          (variety.daysToMaturity != null
            ? ` Expect roughly ${variety.daysToMaturity} days to maturity.`
            : "") +
          (isPepper
            ? ` This is a heat crop (up to ${variety.scovilleMax.toLocaleString()} SHU) — steady biology-first feeding produces the best pods and the least stress.`
            : "") +
          `\n\nThis guide follows Korean Natural Farming principles: build living soil first, then feed the plant *by growth stage* using fermented, farm-made inputs. No synthetic fertilizers or pesticides.`,
      ),
      timing: null,
    },
    {
      id: "soil_prep",
      title: "Soil Preparation",
      icon: "🪱",
      content: collect(
        `Start with the biology. Collect and culture Indigenous Microorganisms${token(imo)} and work finished IMO into the top few inches of your ${conditions.soilType} soil.` +
          (conditions.soilType === "sandy"
            ? " Sandy Florida soil drains fast and holds few nutrients — build organic matter aggressively: 2–3 inches of compost plus a thick carbon mulch (wood chips, leaves) to keep the microbe zone moist."
            : " Keep the soil covered with mulch and avoid tilling — the fungal networks you are building are the fertility.") +
          `\n\nInoculate the bed with LAB${token(lab)} diluted 1:1000 to accelerate decomposition and suppress pathogens.${chlorineNote}`,
      ),
      timing: "2–4 weeks before planting",
    },
    {
      id: "planting",
      title: "Planting",
      icon: "🌰",
      content: collect(
        (isPepper
          ? `Transplant after nights stay above 55°F. In Zone ${conditions.zone} that usually means late winter through spring — peppers can run as perennials in frost-free years.`
          : `Plant in your zone's appropriate window for this crop; in Zone ${conditions.zone} most warm-season crops go in after the last frost risk passes.`) +
          `\n\nWater in transplants with a seed-soak / rooting drench: LAB${token(lab)} 1:1000 plus OHN${token(ohn)} 1:1000. Mulch immediately — bare soil is a fertility leak.`,
      ),
      timing: `Spring, Zone ${conditions.zone}`,
    },
    {
      id: "nutrition",
      title: "Nutrition Schedule (KNF stages)",
      icon: "🧪",
      content: collect(
        `Match inputs to the growth stage (Master Cho's nutritive cycle):\n\n` +
          `- **Vegetative growth:** FPJ${token(fpj)} 1:500 foliar weekly + FAA${token(faa)} 1:1000 for nitrogen.\n` +
          `- **Transition / flowering:** ease off nitrogen; introduce WCA${token(wca)} 1:1000 to set strong flowers.\n` +
          `- **Fruiting:** switch to FFJ${token(ffj)} 1:500 and continue WCA${token(wca)} — calcium during fruiting prevents blossom-end issues.\n` +
          `- **All stages:** OHN${token(ohn)} 1:1000 every 7–10 days for immunity, LAB${token(lab)} 1:1000 as a soil drench monthly.${chlorineNote}`,
      ),
      timing: null,
    },
    {
      id: "pest",
      title: "Pest & Disease",
      icon: "🐛",
      content: collect(
        `Healthy biology is the first defense — most pest pressure signals a nutrition imbalance.\n\n` +
          `- Foliar LAB${token(lab)} + OHN${token(ohn)} weekly keeps leaf surfaces colonized by allies.\n` +
          `- Hand-pick hornworms and caterpillars at dusk.\n` +
          `- Aphids: blast with water, then follow with a LAB foliar; ladybugs arrive if you don't spray poisons.\n` +
          `- Fungal spots in humid Zone ${conditions.zone}: improve airflow, water at the base in the morning, apply LAB foliar.`,
      ),
      timing: null,
    },
    {
      id: "harvest",
      title: "Harvest",
      icon: isPepper ? "🌶️" : "🧺",
      content: collect(
        (isPepper
          ? `Harvest pods at full color for maximum heat and flavor — clip, don't pull. Regular picking pushes the plant to keep producing.`
          : `Harvest in the morning after dew dries, when sugars are highest. Regular picking extends production.`) +
          `\n\nSave seeds from your best performer and log them in the NIMS Seed Bank — local adaptation compounds season over season. Feed the plant a post-harvest LAB${token(lab)} drench to help it recover.`,
      ),
      timing:
        variety.daysToMaturity != null
          ? `~${variety.daysToMaturity} days after transplant`
          : null,
    },
  ];

  return {
    sections,
    recipeRefs: [...refs].map((s) => BigInt(s)),
    isFallback: true,
  };
}

// ── Generation ───────────────────────────────────────────────────────────────

export async function generateVarietyGuide(
  variety: GuideVarietyInput,
  conditions: GuideConditions,
  recipes: RecipeSummary[],
): Promise<GeneratedGuide> {
  const validIds = new Set(recipes.map((r) => r.id.toString()));
  const systemPrompt = GUIDE_SYSTEM_PROMPT.replace(
    "{RECIPE_LIST}",
    recipeListSnippet(recipes),
  );
  const userPrompt = buildUserPrompt(variety, conditions);

  const actor = getSpicyAiActor();
  if (actor) {
    try {
      const res = await actor.chatWithLlm({
        messages: [
          toSpicyAiMessage({
            role: "user",
            content: `${systemPrompt}\n\n${userPrompt}`,
          }),
        ],
      });
      if (res.ok?.response) {
        const parsed = extractJsonFromLlmResponse(res.ok.response);
        const validated = validateSections(parsed, validIds);
        if (validated) {
          return { ...validated, isFallback: false };
        }
        console.warn(
          "SpicyAI guide: response failed validation",
          res.ok.response.slice(0, 200),
        );
      }
      if (res.err) {
        console.warn("SpicyAI guide:", chatErrorToString(res.err));
      }
    } catch (e) {
      console.warn("SpicyAI guide call failed, using fallback", e);
    }
  }

  return buildFallbackGuide(variety, conditions, recipes);
}
