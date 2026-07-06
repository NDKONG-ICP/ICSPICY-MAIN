/**
 * Deterministic KNF variety guide fallback — shared by the React app and
 * scripts/prerender-routes.mjs (build-time crawl HTML + HowTo schema).
 *
 * Mirrors the fallback in variety-guide-ai.ts; AI generation stays in TS,
 * this module is the single source for static guide content.
 */

export const GUIDE_SECTION_ORDER = [
  "overview",
  "soil_prep",
  "planting",
  "nutrition",
  "pest",
  "harvest",
];

export const DEFAULT_PRERENDER_CONDITIONS = {
  zone: "10a",
  soilType: "sandy",
  waterSource: "municipal",
  ph: null,
};

const SECTION_DEFAULTS = {
  overview: { title: "Overview", icon: "🌱" },
  soil_prep: { title: "Soil Preparation", icon: "🪱" },
  planting: { title: "Planting", icon: "🌰" },
  nutrition: { title: "Nutrition Schedule", icon: "🧪" },
  pest: { title: "Pest & Disease", icon: "🐛" },
  harvest: { title: "Harvest", icon: "🌶️" },
};

const RECIPE_TOKEN_RE = /\[recipe:(\d+)\]/g;

function findRecipe(recipes, keywords) {
  for (const kw of keywords) {
    const hit = recipes.find((r) =>
      r.title.toLowerCase().includes(kw.toLowerCase()),
    );
    if (hit) return hit;
  }
  return null;
}

function token(r) {
  return r ? ` [recipe:${r.id.toString()}]` : "";
}

/**
 * @param {object} variety
 * @param {bigint|number} variety.id
 * @param {string} variety.name
 * @param {string} variety.species
 * @param {number} variety.scovilleMax
 * @param {number|null} variety.daysToMaturity
 * @param {string} [variety.description]
 * @param {object} conditions
 * @param {string} conditions.zone
 * @param {string} conditions.soilType
 * @param {string} conditions.waterSource
 * @param {Array<{id: bigint|number, title: string, category?: string}>} recipes
 */
export function buildFallbackGuide(variety, conditions, recipes) {
  const imo = findRecipe(recipes, ["IMO", "indigenous micro"]);
  const lab = findRecipe(recipes, ["LAB", "lactic acid"]);
  const fpj = findRecipe(recipes, ["FPJ", "fermented plant juice"]);
  const ffj = findRecipe(recipes, ["FFJ", "fermented fruit juice"]);
  const ohn = findRecipe(recipes, ["OHN", "oriental herbal"]);
  const faa = findRecipe(recipes, ["FAA", "fish amino", "EAA"]);
  const wca = findRecipe(recipes, [
    "WCA",
    "water-soluble calcium",
    "calcium",
  ]);

  const scovilleMax = Number(variety.scovilleMax ?? 0);
  const isPepper = scovilleMax > 0;
  const chlorineNote =
    conditions.waterSource === "municipal"
      ? "\n\n**Municipal water note:** dechlorinate before applying LAB or IMO — let water sit uncovered for 24 hours or aerate vigorously, since chlorine kills the microbes you're introducing."
      : "";

  const refs = new Set();
  const collect = (content) => {
    for (const m of content.matchAll(RECIPE_TOKEN_RE)) refs.add(m[1]);
    return content;
  };

  const daysToMaturity =
    variety.daysToMaturity != null ? Number(variety.daysToMaturity) : null;

  const sections = [
    {
      id: "overview",
      title: "Overview",
      icon: "🌱",
      content: collect(
        `**${variety.name}** (*${variety.species}*) grown the regenerative way in Zone ${conditions.zone}.` +
          (daysToMaturity != null
            ? ` Expect roughly ${daysToMaturity} days to maturity.`
            : "") +
          (isPepper
            ? ` This is a heat crop (up to ${scovilleMax.toLocaleString()} SHU) — steady biology-first feeding produces the best pods and the least stress.`
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
        daysToMaturity != null
          ? `~${daysToMaturity} days after transplant`
          : null,
    },
  ];

  return {
    sections,
    recipeRefs: [...refs].map((s) => BigInt(s)),
    isFallback: true,
  };
}

/** Plain-text strip for JSON-LD HowTo steps. */
export function guideSectionPlainText(content) {
  return content
    .replace(RECIPE_TOKEN_RE, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}
