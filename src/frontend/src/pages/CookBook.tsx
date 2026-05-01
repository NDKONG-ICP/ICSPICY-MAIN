import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FlaskConical,
  Printer,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Recipe } from "../backend";
import { useListRecipes } from "../hooks/useBackend";

// ─── Static fallback KNF recipe data (shown when backend returns empty) ───────

const KNF_FALLBACK: Omit<Recipe, "id" | "created_at" | "updated_at">[] = [
  {
    name: "OHN",
    full_name: "Oriental Herbal Nutrient",
    description:
      "A fermented herbal elixir made from five medicinal plants. OHN revitalizes crops, boosts immunity, promotes robustness, and acts as a natural biostimulant. One of the most essential KNF inputs.",
    ingredients: [
      "2 parts Angelica root (Angelica acutiloba or A. sinensis) — dry",
      "1 part Licorice root (Glycyrrhiza glabra or G. uralensis) — dry",
      "1 part Cinnamon bark (Cinnamomum sp.) — dry",
      "1 part Fresh ginger root (Zingiber officinale)",
      "1 part Fresh garlic cloves (Allium sativum)",
      "Rice wine or Makgeolli (Korean rice wine) — for soaking dry herbs",
      "Raw brown sugar (1:1 by weight with each ingredient)",
      "Soju or vodka (30–35% alcohol) — for final preservation",
    ],
    instructions: [
      "Soak the three dry ingredients (angelica, licorice, cinnamon) in separate jars, filling to the 2/3 level with rice wine. Allow to soak for 2–3 days.",
      "After soaking, chop and crush the two wet ingredients (ginger and garlic) and place each in its own jar.",
      "Add raw brown sugar to each of the five jars equal to the weight of the ingredient inside. Mix well.",
      "Cover each jar with breathable cloth or Japanese paper. Leave to ferment at room temperature (23–25°C) for 4–5 days.",
      "After fermentation, fill the remaining 1/3 of each jar with Soju or vodka. Stir each jar with a clean stick.",
      "Seal the jars airtight. Shake each jar daily for 2 weeks.",
      "Strain the liquid from each jar. Combine strained liquids in a 2:1:1:1:1 ratio (angelica:licorice:cinnamon:ginger:garlic).",
      "Store in a cool, dark place (1–15°C). OHN can be stored for 2+ years.",
    ],
    application_notes:
      "Dilute 1:500–1:1000 in water. Apply as foliar spray, soil drench, or seed soak. Use throughout all growth stages weekly. Combine with FPJ at 500:1 for weak plants. For disease (soft rot, anthracnose), add WCA at 1:1000. Promotes plant heat retention, sterilizes, and revitalizes crops.",
    tags: ["KNF", "herbal", "immune-boost", "foliar", "soil-drench", "ferment"],
    is_featured: true,
    photo_key: undefined,
    shop_link: undefined,
    shop_link_label: undefined,
  },
  {
    name: "FPJ",
    full_name: "Fermented Plant Juice",
    description:
      "A concentrated liquid ferment of fast-growing plant meristems. FPJ captures the vital growth energy of actively growing plant tissue, delivering growth hormones, enzymes, and beneficial microorganisms directly to your crops.",
    ingredients: [
      "Fresh plant meristems / growing tips (harvest in early morning)",
      "Comfrey, nettles, alfalfa, sweet potato vine tips, or young pepper shoots",
      "Raw dry brown sugar (1:1 by weight — slightly less than plant weight)",
    ],
    instructions: [
      "Harvest plant meristems in early morning when growth energy is highest. Use healthy, fast-growing tips only.",
      "Weigh the plant material. Do NOT wash — natural microorganisms are needed.",
      "In a clean glass or ceramic jar, layer plant material alternately with raw brown sugar in small increments. Start with sugar on the bottom layer.",
      "Pack tightly, pressing down firmly. The sugar will draw fluid from plant cells through osmosis.",
      "Add a final cap of sugar on top. Cover with breathable cloth or Japanese paper. Do not use an airtight lid.",
      "Store at room temperature in a cool, dark place for 7–10 days. The liquid will begin to seep within 24–48 hours.",
      "Once fully fermented (liquid is amber, sweet-sour smell), strain out the plant material.",
      "Store in a jar with 1/3 airspace. Label with date, plant material, and growth stage. Store up to 2 years.",
    ],
    application_notes:
      "Dilute 1:500–1:1000 for foliar spray. Apply during vegetative and fruiting stages. Combine with OHN and WCA for a full KNF formula. Always taste and smell before use. A good FPJ smells sweet and fermented, not rotten.",
    tags: ["KNF", "ferment", "vegetative", "foliar", "growth", "enzymes"],
    is_featured: true,
    photo_key: undefined,
    shop_link: undefined,
    shop_link_label: undefined,
  },
  {
    name: "FPE",
    full_name: "Fermented Plant Extract",
    description:
      "Similar to FPJ but uses the whole above-ground plant rather than just meristems. FPE provides a broader nutrient spectrum including potassium, phosphorus, and trace minerals. Excellent for general fertility and crop health.",
    ingredients: [
      "Fresh whole plant material (leaves, stems, flowers — NOT roots)",
      "Comfrey, nettles, horsetail, yarrow, or other herb plants",
      "Raw brown sugar (1:1 by weight)",
      "Optional: 1–2 tablespoons apple cider vinegar to boost mineral extraction",
    ],
    instructions: [
      "Chop or crush fresh plant material to increase surface area. Do NOT use diseased material.",
      "Weigh the plant material and measure an equal weight of raw brown sugar.",
      "Layer plant material and sugar alternately in a clean glass jar. Press firmly to eliminate air pockets.",
      "Cover jar mouth with breathable cloth and secure with a rubber band. Allow to ferment for 7–14 days.",
      "If using ACV, add after 3–4 days once initial fermentation has started.",
      "After fermentation completes, strain and press the marc (solids) to extract maximum liquid.",
      "Transfer to storage jars. Label with date, plant material used, and ferment type.",
      "Store in a cool, dark place. Shake occasionally to remix settled solids.",
    ],
    application_notes:
      "Apply at 1:500 as foliar spray or soil drench. Particularly valuable for fruiting and flowering crops. Rich in potassium and phosphorus for brix development. Can be combined with OHN and FPJ for a complete KNF cocktail.",
    tags: ["KNF", "ferment", "foliar", "potassium", "phosphorus", "extract"],
    is_featured: false,
    photo_key: undefined,
    shop_link: undefined,
    shop_link_label: undefined,
  },
  {
    name: "WCA",
    full_name: "Water Soluble Calcium",
    description:
      "Produced by dissolving eggshells or clamshells in raw apple cider vinegar. WCA delivers bioavailable calcium that regulates cell wall structure, reduces blossom end rot, firms up soft tissues, and acts as a natural fungicide.",
    ingredients: [
      "Eggshells or clamshells (clean and dry — NOT oyster shells for best results)",
      "Raw, unpasteurized apple cider vinegar (with the 'mother')",
      "Glass jar with loose-fitting lid (fermentation produces CO₂ gas)",
    ],
    instructions: [
      "Bake eggshells or clamshells in an oven at 350°F (175°C) for 15 minutes to remove residual organics and create lime (calcium oxide).",
      "Allow to cool completely. Crush the shells into coarse pieces — do not grind to powder.",
      "Fill a glass jar 1/3 to 1/2 with crushed shells. Slowly pour raw apple cider vinegar over the shells.",
      "IMPORTANT: The reaction will bubble vigorously (CO₂ gas). Use a loose lid or cloth cover — never seal airtight or the jar may explode.",
      "Allow the reaction to complete over 3–7 days. The shells will dissolve and the liquid will turn yellowish-clear.",
      "When bubbling completely stops and shells are dissolved, the WCA is ready.",
      "Carefully strain the liquid. Label with the date. Store in a sealed container at room temperature.",
    ],
    application_notes:
      "Dilute 1:1000 in water for foliar spray or soil drench. Apply during fruiting stage to firm up produce and prevent blossom end rot. For fungal diseases (powdery mildew, downy mildew): combine WCA at 1:1000 with OHN at 1:1000 for a powerful natural fungicide spray.",
    tags: ["KNF", "calcium", "fungicide", "foliar", "fruiting", "cell-walls"],
    is_featured: false,
    photo_key: undefined,
    shop_link: undefined,
    shop_link_label: undefined,
  },
  {
    name: "IMO2",
    full_name: "Indigenous Microorganisms — Stage 2",
    description:
      "IMO2 is the second stage of the Indigenous Microorganisms process. Wild IMO1 culture collected from your forest floor is mixed with rice bran and brown sugar to create a large, active microbial colony rich in beneficial bacteria, fungi, and yeasts native to your specific ecosystem.",
    ingredients: [
      "IMO1 (wild-cultured rice with indigenous mycelium — collected from forest floor box)",
      "Rice bran (nuka) — sieved to remove lumps",
      "Raw brown sugar (equal weight to rice bran)",
      "Well water or non-chlorinated water (as needed for moisture)",
      "Large mixing container or clean wheelbarrow",
    ],
    instructions: [
      "Prepare IMO1 by scraping the white mycelium-covered rice from your collection box. Collect approximately 1 cup of IMO1 culture.",
      "Mix equal parts (by weight) of rice bran and raw brown sugar in a large container.",
      "Add the IMO1 culture to the rice bran and sugar mixture. Mix thoroughly by hand.",
      "Adjust moisture by sprinkling non-chlorinated water while mixing until the mixture holds a loose ball shape when squeezed but breaks apart easily.",
      "Transfer mixture to a large container (wooden box, clean plastic bin). Cover with burlap or breathable cloth.",
      "Store in a warm location (25–30°C). After 3–7 days, the mixture should warm up, smell sweet and fermented, and show visible mycelial growth (white threads).",
      "Once fully colonized with white mycelium, IMO2 is ready. It can be used immediately or stored dry.",
    ],
    application_notes:
      "IMO2 is mixed with soil amendments to create IMO3 and IMO4 or applied directly to soil at 100–500g per square meter. The indigenous microorganisms decompose organic matter, fix nitrogen, and build soil ecosystem health specific to your local environment.",
    tags: ["KNF", "microorganisms", "IMO", "soil", "mycology", "indigenous"],
    is_featured: true,
    photo_key: undefined,
    shop_link: undefined,
    shop_link_label: undefined,
  },
  {
    name: "LAB",
    full_name: "Lactic Acid Bacteria Serum",
    description:
      "LAB serum is a concentrated culture of lactic acid bacteria harvested from the ambient environment using rice wash water and milk. LAB decomposes organic matter, suppresses harmful pathogens, builds beneficial microbial populations, and improves soil and plant health.",
    ingredients: [
      "Rice wash water (the cloudy water from the first wash of raw rice)",
      "Raw, non-homogenized whole milk (or fresh milk with fat — organic preferred)",
      "Glass jar with loose lid",
      "Cheesecloth or fine strainer",
    ],
    instructions: [
      "Wash 1 cup of raw rice in a jar with 2 cups of water. Shake well for 2–3 minutes. The water should become milky white.",
      "Pour the rice wash water into a glass jar. Cover loosely with cloth. Store at room temperature (20–25°C) for 3–5 days.",
      "After 3–5 days, the rice wash water should smell slightly sour and have a thin layer of film on top. It now contains LAB culture.",
      "Strain the rice wash water and add it to 10 parts raw milk in a new jar (1 part rice water : 10 parts milk).",
      "Cover loosely with cloth. Store at room temperature for 5–7 days. The mixture will separate into white curds (casein) floating on top and a yellowish liquid (LAB serum) on the bottom.",
      "Remove the floating curds (compost them or feed to animals). The yellow liquid below is your LAB serum.",
      "Strain the LAB serum through cheesecloth. It is ready to use fresh, or add an equal weight of raw brown sugar to preserve it for up to 6 months.",
    ],
    application_notes:
      "Dilute 1:1000 for foliar spray or soil drench. The LAB serum can also be added to animal feed, compost piles, or EM (effective microorganism) blends. Particularly effective for breaking down organic matter quickly and suppressing pathogenic fungi. Safe to apply frequently.",
    tags: [
      "KNF",
      "LAB",
      "bacteria",
      "soil-health",
      "ferment",
      "pathogen-control",
    ],
    is_featured: false,
    photo_key: undefined,
    shop_link: undefined,
    shop_link_label: undefined,
  },
  {
    name: "AEM",
    full_name: "Activated Effective Microorganisms",
    description:
      "AEM (Activated EM) is an expanded, ready-to-use version of EM1 (commercial Effective Microorganism concentrate). Activation multiplies the microbial culture, making it more potent and cost-effective for large-scale farm application.",
    ingredients: [
      "EM1 (commercial Effective Microorganism concentrate — 1 cup / 250ml)",
      "Unsulfured blackstrap molasses (1 cup / 250ml)",
      "Non-chlorinated water (1 gallon / 4 liters)",
      "Clean sealed container (bucket or jug with tight lid)",
      "Thermometer (optional but recommended)",
    ],
    instructions: [
      "Warm 1 gallon of non-chlorinated water to approximately 25–35°C (not hot).",
      "Dissolve 1 cup of blackstrap molasses in the warm water. Stir until fully dissolved.",
      "Add 1 cup of EM1 concentrate to the molasses water. Stir gently to combine.",
      "Pour the mixture into a clean sealed container leaving 10–15% airspace. Seal the lid tightly.",
      "Store in a warm (25–35°C) dark location for 5–7 days. Check daily — loosen the lid briefly to release built-up CO₂ gas, then reseal.",
      "After 5–7 days, AEM should have a sweet-sour, slightly yeasty aroma. The pH should be below 3.5. Rotten or foul smell indicates failure — discard and restart.",
      "Once activated, AEM is stable. Store sealed at room temperature and use within 1 month.",
    ],
    application_notes:
      "Dilute 1:1000 for foliar spray. Dilute 1:500 for soil drench and compost activation. Apply weekly during crop production. AEM accelerates organic matter decomposition, suppresses pathogens, and promotes plant growth. Can be used to activate compost, treat waste, and clean farm equipment.",
    tags: [
      "KNF",
      "EM",
      "effective-microorganisms",
      "soil",
      "compost",
      "ferment",
    ],
    is_featured: false,
    photo_key: undefined,
    shop_link: undefined,
    shop_link_label: undefined,
  },
  {
    name: "FFA",
    full_name: "Fermented Fruit Acid",
    description:
      "Fermented Fruit Acid is made by fermenting fresh citrus or other acidic fruits to produce a complex blend of organic acids, sugars, enzymes, and beneficial microorganisms. FFA supports fruiting, enhances brix (sugar content), and improves flavor in harvested crops.",
    ingredients: [
      "Fresh ripe fruit — citrus (lemon, lime, orange), or pineapple, papaya, passion fruit",
      "Raw brown sugar (equal weight to fruit)",
      "Clean glass jar or ceramic crock",
    ],
    instructions: [
      "Use only fresh, ripe (not overripe or rotten) fruit. For citrus, include the peel — it contains essential oils and beneficial compounds.",
      "Chop fruit into small pieces (include skin/peel). Weigh the chopped fruit.",
      "Layer fruit and raw brown sugar alternately in a clean glass jar. Begin and end with a sugar layer.",
      "Press down firmly to remove air pockets and promote juice extraction through osmosis.",
      "Cover with breathable cloth tied with a rubber band. Store in a cool, dark location at room temperature.",
      "Ferment for 7–14 days. Stir gently every 2–3 days. The mixture will bubble as fermentation proceeds.",
      "When bubbling slows and the liquid is amber with a sweet-sour-fruity aroma, strain out the solids.",
      "Store the strained liquid in a sealed jar. Label with date and fruit used. Refrigerate or store cool for up to 6 months.",
    ],
    application_notes:
      "Dilute 1:500–1:1000 for foliar spray during fruiting and finishing stages. FFA enhances brix, improves flavor, and provides organic acids that regulate soil pH. Combine with WCA at transition to fruiting for robust cell structure and flavor development. Do not apply during the vegetative growth stage.",
    tags: ["KNF", "fruiting", "brix", "organic-acids", "citrus", "flavor"],
    is_featured: false,
    photo_key: undefined,
    shop_link: undefined,
    shop_link_label: undefined,
  },
];

// ─── Tag color mapping ────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  KNF: "bg-primary/20 text-primary border-primary/30",
  herbal: "bg-accent/20 text-accent-foreground border-accent/30",
  ferment: "bg-secondary text-secondary-foreground border-border",
  foliar: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  "soil-drench": "bg-chart-5/20 text-chart-5 border-chart-5/30",
  calcium: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  IMO: "bg-chart-2/20 text-accent-foreground border-chart-2/30",
  bacteria: "bg-primary/10 text-primary-foreground border-primary/20",
  EM: "bg-accent/10 text-accent-foreground border-accent/20",
};

function getTagClass(tag: string): string {
  return (
    TAG_COLORS[tag] ?? "bg-muted/50 text-muted-foreground border-border/50"
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function RecipeCardSkeleton() {
  return (
    <div className="recipe-card space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ─── Print overlay ────────────────────────────────────────────────────────────

function PrintCard({
  recipe,
}: { recipe: Recipe | ((typeof KNF_FALLBACK)[number] & { id?: bigint }) }) {
  return (
    <div
      id={`print-card-${recipe.name}`}
      className="hidden print:block print-recipe-card"
      style={{
        fontFamily: "Georgia, serif",
        background: "#fff",
        color: "#111",
        padding: "32px",
        maxWidth: "680px",
        margin: "0 auto",
        borderLeft: "6px solid #b91c1c",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "2px solid #111",
          paddingBottom: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: "#b91c1c",
                fontFamily: "Arial, sans-serif",
                fontWeight: 700,
              }}
            >
              IC SPICY Nursery — Port Charlotte, FL
            </div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "2px",
                color: "#666",
                fontFamily: "Arial, sans-serif",
                marginTop: "2px",
              }}
            >
              Natural Farming CookBook
            </div>
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#666",
              fontFamily: "Arial, sans-serif",
              textAlign: "right",
            }}
          >
            Printed: {new Date().toLocaleDateString()}
            <br />
            icspicy.farm
          </div>
        </div>
        <div style={{ marginTop: "12px" }}>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 900,
              color: "#b91c1c",
              lineHeight: 1,
              fontFamily: "Arial Black, sans-serif",
            }}
          >
            {recipe.name}
          </span>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#222",
              marginTop: "4px",
            }}
          >
            {recipe.full_name}
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: "12px",
          color: "#444",
          marginBottom: "20px",
          lineHeight: 1.6,
        }}
      >
        {recipe.description}
      </p>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.5fr",
          gap: "24px",
        }}
      >
        {/* Ingredients */}
        <div>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#b91c1c",
              marginBottom: "8px",
              fontFamily: "Arial, sans-serif",
            }}
          >
            Ingredients
          </div>
          <ul style={{ paddingLeft: "16px", margin: 0 }}>
            {recipe.ingredients.map((ing) => (
              <li
                key={ing.slice(0, 40)}
                style={{ fontSize: "11px", lineHeight: 1.7, color: "#222" }}
              >
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#b91c1c",
              marginBottom: "8px",
              fontFamily: "Arial, sans-serif",
            }}
          >
            Instructions
          </div>
          <ol style={{ paddingLeft: "16px", margin: 0 }}>
            {recipe.instructions.map((step) => (
              <li
                key={step.slice(0, 40)}
                style={{
                  fontSize: "11px",
                  lineHeight: 1.7,
                  color: "#222",
                  marginBottom: "6px",
                }}
              >
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Application notes */}
      {recipe.application_notes && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "#f9f0f0",
            borderLeft: "3px solid #b91c1c",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#b91c1c",
              marginBottom: "6px",
              fontFamily: "Arial, sans-serif",
            }}
          >
            Application Notes
          </div>
          <p
            style={{
              fontSize: "11px",
              color: "#333",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {recipe.application_notes}
          </p>
        </div>
      )}

      {/* Tags */}
      <div
        style={{
          marginTop: "16px",
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        {recipe.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: "9px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              padding: "2px 8px",
              border: "1px solid #b91c1c",
              color: "#b91c1c",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "24px",
          borderTop: "1px solid #ccc",
          paddingTop: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: "#999",
            fontFamily: "Arial, sans-serif",
          }}
        >
          © {new Date().getFullYear()} IC SPICY Nursery · icspicy.farm · Natural
          Farming Inputs
        </span>
        <span
          style={{
            fontSize: "9px",
            color: "#999",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Share: icspicy.farm/cookbook/{recipe.name.toLowerCase()}
        </span>
      </div>
    </div>
  );
}

// ─── Section accordion ────────────────────────────────────────────────────────

function Accordion({
  title,
  children,
  defaultOpen = false,
  ocid,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  ocid?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border/50 pt-3 mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left group"
        data-ocid={ocid}
        aria-expanded={open}
      >
        <span className="recipe-section-title group-hover:text-primary transition-colors">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── RecipeCard component ─────────────────────────────────────────────────────

type RecipeData = Recipe | ((typeof KNF_FALLBACK)[number] & { id?: bigint });

function RecipeCard({
  recipe,
  index,
  onPrint,
}: {
  recipe: RecipeData;
  index: number;
  onPrint: (name: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/cookbook/${recipe.name.toLowerCase()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!", { duration: 3000 });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const handlePrint = () => {
    onPrint(recipe.name);
    setTimeout(() => window.print(), 150);
  };

  return (
    <motion.article
      className="recipe-card group relative overflow-hidden"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      data-ocid={`recipe-card-${recipe.name.toLowerCase()}`}
      id={`card-${recipe.name.toLowerCase()}`}
    >
      {/* Featured badge */}
      {recipe.is_featured && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-0.5">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider">
            Featured
          </span>
        </div>
      )}

      {/* Card header */}
      <div className="flex items-start gap-4 mb-4">
        {recipe.photo_key ? (
          <img
            src={`/api/object-storage/${recipe.photo_key}`}
            alt={recipe.full_name}
            className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0 flex items-center justify-center">
            <span className="font-display font-black text-xl text-primary leading-none">
              {recipe.name.slice(0, 3)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="recipe-title">{recipe.name}</h3>
          <p className="recipe-subtitle">{recipe.full_name}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getTagClass(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
        {recipe.description}
      </p>

      {/* Accordion sections */}
      <Accordion
        title={`Ingredients (${recipe.ingredients.length})`}
        defaultOpen={false}
        ocid={`recipe-ingredients-toggle-${recipe.name.toLowerCase()}`}
      >
        <ul className="space-y-1.5">
          {recipe.ingredients.map((ing) => (
            <li key={ing.slice(0, 40)} className="recipe-ingredient flex gap-2">
              <span className="recipe-ingredient-highlight flex-shrink-0 select-none">
                ·
              </span>
              <span>{ing}</span>
            </li>
          ))}
        </ul>
      </Accordion>

      <Accordion
        title={`Instructions (${recipe.instructions.length} steps)`}
        defaultOpen={false}
        ocid={`recipe-instructions-toggle-${recipe.name.toLowerCase()}`}
      >
        <ol className="space-y-2 list-none">
          {recipe.instructions.map((step, stepIdx) => (
            <li key={step.slice(0, 40)} className="recipe-step flex gap-3">
              <span className="recipe-ingredient-highlight font-bold text-sm w-5 flex-shrink-0 text-right">
                {stepIdx + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Accordion>

      {recipe.application_notes && (
        <Accordion
          title="Application Notes"
          defaultOpen={false}
          ocid={`recipe-notes-toggle-${recipe.name.toLowerCase()}`}
        >
          <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
            <p className="text-sm text-foreground leading-relaxed">
              {recipe.application_notes}
            </p>
          </div>
        </Accordion>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-border/40">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-border hover:border-primary/50 flex-shrink-0"
          onClick={handlePrint}
          data-ocid={`recipe-print-btn-${recipe.name.toLowerCase()}`}
          aria-label={`Print ${recipe.name} recipe card`}
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Download
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-border hover:border-primary/50 flex-shrink-0"
          onClick={handleShare}
          data-ocid={`recipe-share-btn-${recipe.name.toLowerCase()}`}
          aria-label={`Share ${recipe.name} recipe link`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-chart-4" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied!" : "Share"}
        </Button>
        {recipe.shop_link && (
          <a
            href={recipe.shop_link}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid={`recipe-shop-btn-${recipe.name.toLowerCase()}`}
          >
            <Button
              size="sm"
              className="h-8 text-xs bg-primary/90 hover:bg-primary flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {recipe.shop_link_label ?? "View in Shop"}
            </Button>
          </a>
        )}
        {!recipe.shop_link && (
          <a
            href="/marketplace?category=GardenInputs"
            data-ocid={`recipe-shop-link-${recipe.name.toLowerCase()}`}
          >
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Garden Inputs Shop
            </Button>
          </a>
        )}
      </div>

      {/* Hidden print markup */}
      <PrintCard recipe={recipe} />
    </motion.article>
  );
}

// ─── All unique tags from data ────────────────────────────────────────────────

function getAllTags(recipes: RecipeData[]): string[] {
  const tagSet = new Set<string>();
  for (const r of recipes) {
    for (const t of r.tags) tagSet.add(t);
  }
  return Array.from(tagSet).sort();
}

// ─── Main CookBook page ───────────────────────────────────────────────────────

export default function CookBookPage() {
  const { data: backendRecipes, isLoading } = useListRecipes();
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [activePrintId, setActivePrintId] = useState<string | null>(null);
  void activePrintId;
  const searchRef = useRef<HTMLInputElement>(null);

  // Use backend recipes if available, fallback to static KNF data
  const allRecipes: RecipeData[] =
    backendRecipes && backendRecipes.length > 0
      ? backendRecipes
      : KNF_FALLBACK.map((r, i) => ({
          ...r,
          id: BigInt(i),
          created_at: BigInt(0),
          updated_at: BigInt(0),
        }));

  const featuredRecipes = allRecipes.filter((r) => r.is_featured);
  const allTags = getAllTags(allRecipes);

  // Filter logic
  const filteredRecipes = allRecipes.filter((recipe) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      recipe.name.toLowerCase().includes(q) ||
      recipe.full_name.toLowerCase().includes(q) ||
      recipe.description.toLowerCase().includes(q) ||
      recipe.tags.some((t) => t.toLowerCase().includes(q));
    const matchesTags =
      activeTags.size === 0 || recipe.tags.some((t) => activeTags.has(t));
    return matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  // Keyboard shortcut: / focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Print-only global styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-recipe-card { display: block !important; }
          @page { margin: 20mm; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <motion.div
          className="relative rounded-2xl overflow-hidden mb-12 mt-4"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src="/assets/generated/cookbook-hero.dim_1200x480.jpg"
            alt="IC SPICY Natural Farming CookBook"
            className="w-full h-56 sm:h-72 object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Natural Farming
              </span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-5xl text-foreground leading-none mb-3">
              IC SPICY <span className="text-fire">CookBook</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
              Time-tested KNF inputs from our regenerative farm kitchen —
              organically sourced, beautifully documented, ready to print and
              take to the greenhouse.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Badge
                variant="outline"
                className="text-xs border-primary/30 text-primary"
              >
                {allRecipes.length} Recipes
              </Badge>
              <Badge
                variant="outline"
                className="text-xs border-border text-muted-foreground"
              >
                Printable Cards
              </Badge>
              <Badge
                variant="outline"
                className="text-xs border-border text-muted-foreground"
              >
                Share Links
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* ── Featured recipes row ──────────────────────────────────────── */}
        {!isLoading && featuredRecipes.length > 0 && (
          <motion.section
            className="mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <h2 className="font-display font-bold text-lg text-foreground">
                Featured Recipes
              </h2>
              <div className="flex-1 h-px bg-border/40 ml-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredRecipes.map((recipe, i) => (
                <RecipeCard
                  key={
                    "id" in recipe
                      ? (recipe.id?.toString() ?? recipe.name)
                      : recipe.name
                  }
                  recipe={recipe}
                  index={i}
                  onPrint={setActivePrintId}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Search & filter ───────────────────────────────────────────── */}
        <motion.div
          className="mb-8 space-y-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipes… (press / to focus)"
                className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
                data-ocid="cookbook-search-input"
                aria-label="Search recipes"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tag filter chips */}
          {allTags.length > 0 && (
            <fieldset
              className="flex flex-wrap gap-2 border-0 p-0 m-0"
              aria-label="Filter by tag"
            >
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-smooth ${
                    activeTags.has(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                  data-ocid={`cookbook-tag-filter-${tag.replace(/[^a-z0-9]/g, "-")}`}
                  aria-pressed={activeTags.has(tag)}
                >
                  {tag}
                </button>
              ))}
              {activeTags.size > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTags(new Set())}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:text-foreground transition-smooth flex items-center gap-1"
                  data-ocid="cookbook-clear-filters-btn"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </fieldset>
          )}
        </motion.div>

        {/* ── Recipe grid ───────────────────────────────────────────────── */}
        <section aria-label="All recipes">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display font-bold text-lg text-foreground">
              {search || activeTags.size > 0 ? "Search Results" : "All Recipes"}
            </h2>
            <span className="text-xs text-muted-foreground ml-1">
              ({filteredRecipes.length}{" "}
              {filteredRecipes.length === 1 ? "recipe" : "recipes"})
            </span>
            <div className="flex-1 h-px bg-border/40 ml-2" />
          </div>

          {isLoading ? (
            <div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              aria-busy="true"
              aria-label="Loading recipes"
            >
              {["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"].map((k) => (
                <RecipeCardSkeleton key={k} />
              ))}
            </div>
          ) : filteredRecipes.length === 0 ? (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              data-ocid="cookbook-empty-state"
            >
              <div className="w-16 h-16 rounded-full bg-muted/30 border border-border flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-muted-foreground/50" />
              </div>
              {search || activeTags.size > 0 ? (
                <>
                  <p className="text-foreground font-medium mb-2">
                    No recipes match your search
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try a different search term or clear your filters.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setActiveTags(new Set());
                    }}
                    data-ocid="cookbook-clear-all-btn"
                  >
                    Clear All Filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-foreground font-medium mb-2">
                    No recipes yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Check back soon — new KNF recipes are being added.
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredRecipes.map((recipe, i) => (
                <RecipeCard
                  key={
                    "id" in recipe
                      ? (recipe.id?.toString() ?? recipe.name)
                      : recipe.name
                  }
                  recipe={recipe}
                  index={i}
                  onPrint={setActivePrintId}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Footer CTA ────────────────────────────────────────────────── */}
        <motion.div
          className="mt-20 rounded-2xl bg-card border border-border p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <FlaskConical className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-display font-bold text-xl text-foreground mb-2">
            Source Your KNF Inputs
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            We carry curated Garden Inputs — herbs, sugars, and materials for
            making your own natural farming ferments, all organically sourced.
          </p>
          <a href="/marketplace?category=GardenInputs">
            <Button
              className="bg-primary hover:bg-primary/90"
              data-ocid="cookbook-shop-cta-btn"
            >
              <ExternalLink className="w-4 h-4" />
              Shop Garden Inputs
            </Button>
          </a>
        </motion.div>
      </div>
    </>
  );
}
