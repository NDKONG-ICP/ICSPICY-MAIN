import Map "mo:core/Map";
import Time "mo:core/Time";
import Common "../types/common";
import RecipeTypes "../types/recipes";

module {
  public type RecipeMap = Map.Map<Common.RecipeId, RecipeTypes.Recipe>;

  // ── Seed data ─────────────────────────────────────────────────────────────

  public func seedRecipes(
    recipes : RecipeMap,
    nextId : { var value : Nat },
  ) {
    // Idempotent: only seed when map is empty
    if (not recipes.isEmpty()) return;

    let now = Time.now();

    let seeds : [(Text, Text, Text, [Text], [Text], Text, [Text], Bool)] = [
      (
        "OHN",
        "Oriental Herbal Nutrient",
        "A fermented herbal extract made from aromatic and medicinal plants. OHN is a powerful immune booster and pest repellent for plants, stimulating growth and resilience through a rich blend of bioactive compounds, essential oils, and natural sugars.",
        [
          "Garlic – 3 parts (by weight)",
          "Ginger – 3 parts",
          "Angelica root (or licorice root) – 1 part",
          "Cinnamon bark – 1 part",
          "Brown sugar or unrefined cane sugar – equal weight to all herbs combined",
          "Makgeolli (rice wine) or diluted vodka – enough to submerge herbs",
        ],
        [
          "Chop or crush all herbs coarsely to increase surface area.",
          "Layer herbs in a jar, alternating with brown sugar at a 1:1 ratio (herbs to sugar by weight).",
          "Pour makgeolli or rice wine over the mixture until herbs are fully submerged.",
          "Cover with breathable cloth or loosely fitted lid. Do NOT seal airtight.",
          "Ferment at room temperature for 7–10 days, stirring daily.",
          "Strain out solids after 7–10 days. Store liquid in a cool dark place.",
          "Apply at 1:1000 dilution in water as a foliar spray or soil drench.",
        ],
        "Apply as foliar spray at 1:1000 dilution every 7–14 days. Excellent during seedling stage and when pest pressure is observed. Combine with FPJ for a full-spectrum growth tonic. Do not apply in direct sunlight.",
        ["immune booster", "pest repellent", "fermented", "aromatic", "KNF", "soil drench", "foliar"],
        true,
      ),
      (
        "FPJ",
        "Fermented Plant Juice",
        "A lactic acid fermentation of young, rapidly growing plant material. FPJ captures peak growth hormones, enzymes, and auxins from the plant, delivering them back to your crop as a powerful growth stimulant during the vegetative stage.",
        [
          "Young plant material (e.g., tips of comfrey, nettle, sweet potato vine, or any fast-growing plant) – 2 parts by weight",
          "Brown sugar – 1 part by weight (1:2 ratio sugar to plant material)",
        ],
        [
          "Collect young plant tips in the early morning before the dew dries.",
          "Gently bruise or cut material to increase juice extraction.",
          "Layer plant material in a ceramic or glass jar, alternating with brown sugar.",
          "Press down firmly and place a weight on top to keep material submerged.",
          "Cover with breathable cloth and secure with a rubber band.",
          "Let ferment at room temperature for 5–7 days, pressing and stirring gently daily.",
          "After fermentation, strain out plant material. Store liquid in a sealed glass jar in a cool dark place.",
          "Dilute 1:500–1:1000 in water for foliar application.",
        ],
        "Apply at 1:500 during seedling and vegetative growth. Use 1:1000 as a gentle maintenance spray. Best applied in early morning or late evening. Pairs well with OHN and LAB for a complete soil biology program.",
        ["growth stimulant", "vegetative", "hormones", "enzymes", "KNF", "foliar", "fermented"],
        true,
      ),
      (
        "FPE",
        "Fermented Plant Extract",
        "Similar to FPJ but uses a wider range of mature plant material including roots, stalks, and leaves. FPE provides a broader spectrum of minerals, secondary metabolites, and microbial communities, acting as a comprehensive plant tonic and soil amendment.",
        [
          "Mature plant material (roots, stalks, leaves, fruits) – 2 parts by weight",
          "Brown sugar – 1 part by weight",
          "Water – small amount if needed to moisten dry material",
        ],
        [
          "Collect diverse plant material including roots, stalks, leaves, and any fruit scraps.",
          "Chop coarsely and mix with brown sugar at a 2:1 ratio (plant material to sugar).",
          "Pack tightly into a clay pot or ceramic crock.",
          "Cover with breathable material and let ferment 10–14 days, stirring every 2–3 days.",
          "Strain and store in glass jars away from direct sunlight.",
          "Use within 6 months for best potency.",
        ],
        "Apply at 1:500 as a soil drench to boost microbial activity and mineral availability. Can be combined with compost teas. Use monthly as a plant tonic throughout the growing season.",
        ["plant tonic", "minerals", "microbes", "soil amendment", "KNF", "fermented"],
        false,
      ),
      (
        "WCA",
        "Water Soluble Calcium",
        "A calcium acetate solution made from eggshells and brown rice vinegar. WCA provides rapidly available calcium to correct deficiencies, strengthen cell walls, improve fruit quality, and support overall structural integrity of plants.",
        [
          "Eggshells – well dried, lightly roasted in a pan (do not burn)",
          "Brown rice vinegar (natural, unpasteurized) – 10 parts per 1 part eggshell by weight",
        ],
        [
          "Collect eggshells and allow to dry completely. Roast lightly in a dry pan over low heat until slightly tan — this removes membranes and impurities.",
          "Let roasted shells cool completely, then place in a wide-mouth glass jar.",
          "Pour brown rice vinegar over the shells at a 10:1 ratio (vinegar to shells by volume).",
          "Cover loosely — the reaction will produce CO2 bubbles. Do NOT seal tightly.",
          "Allow the reaction to continue for 5–7 days until bubbling subsides.",
          "Strain out remaining shell fragments. The liquid should be pale yellow-brown and slightly sweet.",
          "Store in a sealed glass jar in a cool dark place. Shelf-stable for up to 1 year.",
        ],
        "Apply at 1:1000 as a foliar spray when calcium deficiency symptoms appear (blossom end rot, tip burn, weak stems). Best used during fruiting and flowering. Avoid mixing directly with phosphorus-rich inputs.",
        ["calcium", "cell walls", "fruit quality", "mineral", "KNF", "foliar spray", "vinegar extract"],
        false,
      ),
      (
        "IMO2",
        "Indigenous Microorganisms Stage 2",
        "The second stage of IMO preparation where collected forest microorganisms (IMO1) are mixed with rice bran and brown sugar to multiply the microbial community. IMO2 is a dense, inoculant-rich substrate used to prepare IMO3 and ultimately soil amendments.",
        [
          "IMO1 (rice collected from forest, colonized with white mycelium) – 1 part by weight",
          "Rice bran (or wheat bran) – 1 part by weight",
          "Brown sugar – equal weight to IMO1",
          "Water – enough to achieve 60–65% moisture (squeeze test: a few drops from a clenched fist)",
        ],
        [
          "Prepare IMO1 first: place cooked rice in a wooden box in a forest for 5–7 days until covered with white mycelium.",
          "Mix IMO1 with equal parts rice bran and brown sugar.",
          "Add water gradually until the mixture reaches 60–65% moisture (it should hold shape when squeezed but not drip).",
          "Pack loosely into a wooden box or crate. Cover with breathable cloth.",
          "Allow to ferment at ambient temperature for 3–5 days, checking daily for heat and moisture.",
          "The mixture should smell sweet and earthy. Avoid strong ammonia odors (too wet or too warm).",
          "Once fermentation stabilizes (temperature drops), IMO2 is ready to use or store.",
        ],
        "Use IMO2 to inoculate compost piles, prepare IMO3, or as a soil amendment. Apply 1–2 kg per 10 sq meters of garden bed. Store in a burlap sack in a shaded, dry area and use within 2 weeks.",
        ["indigenous microorganisms", "soil biology", "fermentation", "compost inoculant", "KNF", "IMO"],
        false,
      ),
      (
        "LAB",
        "Lactic Acid Bacteria Serum",
        "A concentrated lactic acid bacteria serum derived from rice wash water and fresh milk. LAB suppresses harmful pathogens, breaks down organic matter, improves soil structure, and enhances nutrient uptake by creating a healthy, probiotic-rich root zone.",
        [
          "Rice wash water – first rinse of uncooked white or brown rice",
          "Fresh whole milk (non-homogenized preferred) – 10 parts per 1 part rice wash",
          "Optional: brown sugar or molasses for storage",
        ],
        [
          "Wash 1 cup of rice in 1 cup of water. Keep the milky wash water and discard (or cook) the rice.",
          "Pour rice wash water into a jar, cover with breathable cloth, and let sit at room temperature for 3–5 days until it smells sour (lactic fermentation).",
          "Once sour, mix 1 part rice wash LAB with 10 parts fresh milk in a large jar.",
          "Cover loosely and allow to separate over 5–7 days. The whey (yellowish liquid) will sink; the cream/curd will float to the top.",
          "Skim off the curd on top. The yellowish serum below is your LAB serum.",
          "To store long-term, add equal parts brown sugar or molasses as a preservative.",
          "Refrigerate or store in a cool dark place. Can last months with sugar added.",
        ],
        "Dilute 1:1000 in water for soil drench or foliar spray. Apply weekly during active growth. Excellent for suppressing fungal diseases, breaking down thatch, and improving compost. Combine with FPJ for a complete soil life boost.",
        ["lactic acid bacteria", "probiotic", "pathogen suppression", "soil health", "KNF", "fermented", "foliar"],
        true,
      ),
      (
        "AEM",
        "Activated Effective Microorganisms",
        "AEM is activated EM (Effective Microorganisms) — a commercially available or homemade culture of beneficial microbes including lactic acid bacteria, yeast, and phototrophic bacteria. Activation multiplies the colony count and enhances efficacy for soil and foliar applications.",
        [
          "EM-1 or homemade EM stock – 1 part",
          "Molasses or brown sugar – 1 part",
          "Non-chlorinated water – 20 parts",
          "Optional: sea salt (trace minerals) – 1 teaspoon per liter of final volume",
        ],
        [
          "Mix molasses/sugar into warm non-chlorinated water until fully dissolved.",
          "Add EM-1 stock to the sugar-water solution.",
          "Pour into a clean, sealable container. Leave 10–15% headspace.",
          "Seal tightly and ferment at 25–30°C (77–86°F) for 5–7 days.",
          "Burp the container daily for the first 2 days to release CO2, then reseal.",
          "AEM is ready when pH drops below 3.5 and the smell is sweet-sour.",
          "Transfer to smaller airtight bottles for storage. Use within 30 days of activation.",
        ],
        "Apply at 1:500–1:1000 dilution as soil drench or foliar spray. Use every 7–14 days throughout the growing season. Especially effective when integrated with organic mulch and compost for maximum microbial synergy.",
        ["effective microorganisms", "EM", "soil microbes", "activation", "KNF", "fermented", "probiotic"],
        false,
      ),
      (
        "FFA",
        "Fermented Fish Amino Acids",
        "A fermented fish-based nitrogen and amino acid source that provides rapidly available nutrition to plants and soil microbes. FFA is rich in free amino acids, proteins, and beneficial enzymes, making it an excellent nitrogen supplement during vegetative growth.",
        [
          "Fresh fish scraps (heads, guts, bones) or whole small fish – 2 parts by weight",
          "Brown sugar – 1 part by weight",
          "Optional: makgeolli or rice wine – small amount to inoculate fermentation",
        ],
        [
          "Collect fresh fish material. The fresher the better — avoid salt-preserved fish.",
          "Chop fish material into small pieces to maximize fermentation surface.",
          "Layer fish and brown sugar alternately in a clay pot or bucket at a 2:1 ratio (fish to sugar).",
          "Mix well, cover with breathable cloth, and press down with a weight to keep material submerged as liquid forms.",
          "Ferment at room temperature for 14–21 days, stirring every 2–3 days.",
          "The liquid will become dark brown and rich-smelling (strong but not rancid).",
          "Strain through fine mesh, pressing out as much liquid as possible from the solids.",
          "Store strained liquid in a sealed glass jar. Add a small amount of brown sugar to extend shelf life.",
        ],
        "Apply at 1:500–1:1000 as a soil drench during the vegetative stage when nitrogen is needed. Use sparingly during flowering and fruiting. Combine with WCA and OHN for a balanced macro-micronutrient program. Do not over-apply — excess nitrogen causes leggy growth.",
        ["fish amino acids", "nitrogen", "fermented", "protein", "KNF", "soil drench", "vegetative"],
        false,
      ),
    ];

    for ((abbrev, fullName, desc, ingredients, instructions, appNotes, tags, featured) in seeds.vals()) {
      let id = nextId.value;
      let recipe : RecipeTypes.Recipe = {
        id;
        name = abbrev;
        full_name = fullName;
        description = desc;
        ingredients;
        instructions;
        application_notes = appNotes;
        tags;
        photo_key = null;
        shop_link = null;
        shop_link_label = null;
        is_featured = featured;
        created_at = now;
        updated_at = now;
      };
      recipes.add(id, recipe);
      nextId.value += 1;
    };
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  public func createRecipe(
    recipes : RecipeMap,
    nextId : { var value : Nat },
    input : RecipeTypes.CreateRecipeInput,
  ) : RecipeTypes.Recipe {
    let now = Time.now();
    let id = nextId.value;
    let recipe : RecipeTypes.Recipe = {
      id;
      name = input.name;
      full_name = input.full_name;
      description = input.description;
      ingredients = input.ingredients;
      instructions = input.instructions;
      application_notes = input.application_notes;
      tags = input.tags;
      photo_key = input.photo_key;
      shop_link = input.shop_link;
      shop_link_label = input.shop_link_label;
      is_featured = input.is_featured;
      created_at = now;
      updated_at = now;
    };
    recipes.add(id, recipe);
    nextId.value += 1;
    recipe;
  };

  public func updateRecipe(
    recipes : RecipeMap,
    input : RecipeTypes.UpdateRecipeInput,
  ) : ?RecipeTypes.Recipe {
    switch (recipes.get(input.id)) {
      case null null;
      case (?existing) {
        let now = Time.now();
        let updated : RecipeTypes.Recipe = {
          id = existing.id;
          name = switch (input.name) { case (?v) v; case null existing.name };
          full_name = switch (input.full_name) { case (?v) v; case null existing.full_name };
          description = switch (input.description) { case (?v) v; case null existing.description };
          ingredients = switch (input.ingredients) { case (?v) v; case null existing.ingredients };
          instructions = switch (input.instructions) { case (?v) v; case null existing.instructions };
          application_notes = switch (input.application_notes) { case (?v) v; case null existing.application_notes };
          tags = switch (input.tags) { case (?v) v; case null existing.tags };
          photo_key = switch (input.photo_key) { case (?v) ?v; case null existing.photo_key };
          shop_link = switch (input.shop_link) { case (?v) ?v; case null existing.shop_link };
          shop_link_label = switch (input.shop_link_label) { case (?v) ?v; case null existing.shop_link_label };
          is_featured = switch (input.is_featured) { case (?v) v; case null existing.is_featured };
          created_at = existing.created_at;
          updated_at = now;
        };
        recipes.add(updated.id, updated);
        ?updated;
      };
    };
  };

  public func deleteRecipe(
    recipes : RecipeMap,
    id : Common.RecipeId,
  ) : Bool {
    if (recipes.containsKey(id)) {
      recipes.remove(id);
      true;
    } else {
      false;
    };
  };

  public func getRecipe(
    recipes : RecipeMap,
    id : Common.RecipeId,
  ) : ?RecipeTypes.Recipe {
    recipes.get(id);
  };

  public func listRecipes(
    recipes : RecipeMap,
  ) : [RecipeTypes.Recipe] {
    recipes.values().toArray();
  };

  public func toggleFeatured(
    recipes : RecipeMap,
    id : Common.RecipeId,
  ) : ?RecipeTypes.Recipe {
    switch (recipes.get(id)) {
      case null null;
      case (?existing) {
        let updated : RecipeTypes.Recipe = {
          id = existing.id;
          name = existing.name;
          full_name = existing.full_name;
          description = existing.description;
          ingredients = existing.ingredients;
          instructions = existing.instructions;
          application_notes = existing.application_notes;
          tags = existing.tags;
          photo_key = existing.photo_key;
          shop_link = existing.shop_link;
          shop_link_label = existing.shop_link_label;
          is_featured = not existing.is_featured;
          created_at = existing.created_at;
          updated_at = Time.now();
        };
        recipes.add(updated.id, updated);
        ?updated;
      };
    };
  };
};
