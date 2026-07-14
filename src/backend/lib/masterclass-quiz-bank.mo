// lib/masterclass-quiz-bank.mo — Canister-side full banks (answer keys NEVER leave).
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

  func bankM1L1() : Bank {
    {
      lessonId = "m1-l1";
      moduleId = "module-01-soil-biology";
      badgeId = Types.BADGE_SOIL_BIOLOGY;
      quizVersion = 1;
      drawCount = 6;
      passCorrect = 5;
      title = "1.1 The Soil Food Web — Checkpoint";
      questions = [
        mc("m1-l1-q01", "m1-l1", "In the soil food web metaphor, who are the 'cooks' that break down organic matter first?", ["Bacteria and fungi", "Protozoa and nematodes", "Earthworms only", "The chili plant roots"], 0, M1_SLUG_1, 1),
        mc("m1-l1-q02", "m1-l1", "What do protozoa and bacterial-feeding nematodes mainly contribute in a living soil food web?", ["They fix atmospheric nitrogen directly into fruit", "They graze microbes and release plant-available nutrients", "They replace the need for any organic matter", "They sterilize the root zone against fungi"], 1, M1_SLUG_1, 1),
        mc("m1-l1-q03", "m1-l1", "Why does IC SPICY emphasize fermenting inputs like FPJ, LAB, and IMO?", ["To seed and feed the living soil workforce", "Fermentation is only for hot sauce flavor", "To raise EC as high as possible", "To kill all fungi before transplant"], 0, M1_SLUG_1, 2),
        mc("m1-l1-q04", "m1-l1", "What are root exudates in this lesson's framing?", ["Salt fertilizer runoff", "Sugars dripped from roots that keep beneficial microbes around", "A disease symptom on leaves", "Plastic mulch leachate"], 1, M1_SLUG_1, 2),
        mc("m1-l1-q05", "m1-l1", "What happens when you sterilize a bed with salt fertilizers, bare soil, or constant tillage?", ["You permanently lock in peak heat", "Mycorrhizae multiply automatically", "You fire the microbial workforce and plants look hungry even after you 'fed' them", "You no longer need mulch or compost"], 2, M1_SLUG_1, 1),
        mc("m1-l1-q06", "m1-l1", "Compost and mulch are described as what for the soil workforce?", ["Optional decoration", "A replacement for all water", "A way to raise SHU overnight", "Payroll — food and habitat for biology"], 3, M1_SLUG_1, 1),
        mc("m1-l1-q07", "m1-l1", "Which statement matches the lesson's core claim?", ["A chili plant eats compost directly like a pellet", "Soil biology only matters after fruit set", "A chili plant is only as good as the living community under its roots", "Sterile media always outyield living soil"], 2, M1_SLUG_1, 1),
        mc("m1-l1-q08", "m1-l1", "According to the trophic ladder in Deeper Heat, nutrient release to plants is often strongest at which step?", ["When grazers like protozoa consume microbial biomass", "When earthworms eat leaves directly", "When roots absorb plastic mulch residue", "When salt fertilizers bypass all biology"], 0, M1_SLUG_1, 2),
        mc("m1-l1-q09", "m1-l1", "According to this lesson, what should you ask instead of 'what does my Reaper want to eat?'", ["Which salt fertilizer has the highest N-P-K", "Who in the soil is still employed, and what are they eating?", "How to sterilize the bed for maximum SHU", "Whether hydroponic lettuce methods apply to all chilies"], 1, M1_SLUG_1, 2),
        mc("m1-l1-q10", "m1-l1", "Peppers (Capsicum) form which partnership that trades soil phosphorus and water for plant sugars?", ["Rhizobium nitrogen nodules only", "Hydroponic salt complexes", "No fungal partnerships at all", "Arbuscular mycorrhizal fungi"], 3, M1_SLUG_1, 2),
        sa("m1-l1-q11", "m1-l1", "Name two major microbial groups that act as the 'cooks' in the soil food web.", ["bacteria", "fungi", "fungal", "microbe", "microbes"], 2, M1_SLUG_1, 2),
        sa("m1-l1-q12", "m1-l1", "What plant-root payment keeps beneficial soil life nearby?", ["exudate", "exudates", "sugar", "sugars", "carbon"], 1, M1_SLUG_1, 2),
      ];
    };
  };

  func bankM1L2() : Bank {
    {
      lessonId = "m1-l2";
      moduleId = "module-01-soil-biology";
      badgeId = Types.BADGE_SOIL_BIOLOGY;
      quizVersion = 1;
      drawCount = 6;
      passCorrect = 5;
      title = "1.2 Fungi & Mycorrhizae — Checkpoint";
      questions = [
        mc("m1-l2-q01", "m1-l2", "What do arbuscular mycorrhizae mainly trade to the plant?", ["Only leaf nitrogen gas", "Soil minerals and drought insurance for plant sugars", "Sterile sand structure", "Instant fruit color"], 1, M1_SLUG_2, 1),
        mc("m1-l2-q02", "m1-l2", "Which nursery habit quietly damages the fungal network?", ["Fungal-dominant mulch", "Charged biochar", "Fresh compost tea used as a courier", "Tillage and excess soluble phosphorus"], 3, M1_SLUG_2, 1),
        mc("m1-l2-q03", "m1-l2", "Fruiting chilies in long-season beds generally do better when which side of the F:B spectrum is awake?", ["Purely sterile / no biology", "Only salt-N spikes", "Fungal-leaning root zone", "Constant rototilling"], 2, M1_SLUG_2, 1),
        mc("m1-l2-q04", "m1-l2", "Why does excess soluble phosphorus break the mycorrhizal partnership?", ["Phosphorus kills all fungi instantly", "The plant stops paying fungal 'rent' when phosphorus is cheap in the soil solution", "Mycorrhizae only work in hydroponics", "Soluble P forces fungi to eat wood chips"], 1, M1_SLUG_2, 2),
        mc("m1-l2-q05", "m1-l2", "In IC SPICY terms, what is IMO1's role compared to IMO4?", ["IMO1 is finished bed amendment; IMO4 is rice capture only", "IMO1 captures local microbes from leaf litter; IMO4 is finished soil amendment you blend into beds", "Both are identical catalog powders", "IMO4 replaces all need for mulch"], 1, M1_SLUG_2, 2),
        mc("m1-l2-q06", "m1-l2", "A Reaper sulks in July heat despite looking 'fed' on paper. What question does this lesson want you to ask first?", ["Whether the underground fungal network is still plugged in", "Whether SHU genetics failed", "Whether to double salt starter fertilizer", "Whether to rototill again for aeration"], 0, M1_SLUG_2, 2),
        mc("m1-l2-q07", "m1-l2", "Which management signal pushes a bed toward a more fungal-leaning root zone?", ["Bare soil with frequent till", "Daily rototilling between rows", "Woody mulch and undisturbed structure", "Leaving beds in long bare fallow with no cover"], 2, M1_SLUG_2, 1),
        mc("m1-l2-q08", "m1-l2", "What is wrong with aerated compost tea that lost oxygen or sat too long on a hot bench?", ["It is no longer a living courier — anaerobic or stale tea is not the workforce you brewed for", "It becomes too fungal to use", "It must be boiled before use", "It only works on hydroponic lettuce"], 0, M1_SLUG_2, 2),
        mc("m1-l2-q09", "m1-l2", "Empty biochar applied without charging is described as what?", ["Instant mycorrhizae in a bag", "A replacement for woody mulch", "Safe to mix raw into every seedling hole", "Thirsty carbon — pores need biology before they become microbial housing"], 3, M1_SLUG_2, 2),
        mc("m1-l2-q10", "m1-l2", "This lesson's framing of bacteria vs fungi is:", ["You need both; chilies should not be farmed as if fungi were optional decoration", "Bacteria bad, fungi good — choose one", "Fungi only matter in hydroponics", "Bacteria replace all fungal jobs in pepper beds"], 0, M1_SLUG_2, 1),
        sa("m1-l2-q11", "m1-l2", "Name the fungal partners that plug chili roots into the underground network.", ["mycorrhizae", "mycorrhiza", "arbuscular", "amf", "mycorrhizal"], 1, M1_SLUG_2, 2),
        sa("m1-l2-q12", "m1-l2", "Name one practice that reliably breaks the mycorrhizal partnership (from this lesson).", ["tillage", "till", "phosphorus", "phosphate", "soluble", "rototill", "disturbance", "bare", "fallow"], 1, M1_SLUG_2, 2),
      ];
    };
  };

  func bankM1L3() : Bank {
    {
      lessonId = "m1-l3";
      moduleId = "module-01-soil-biology";
      badgeId = Types.BADGE_SOIL_BIOLOGY;
      quizVersion = 1;
      drawCount = 6;
      passCorrect = 5;
      title = "1.3 Reading Your Soil — Checkpoint";
      questions = [
        mc("m1-l3-q01", "m1-l3", "What is a jar test mainly useful for at home?", ["A texture sketch to compare beds — not decimal-precision certification", "Certified particle-size lab replacement", "Measuring SHU of a dried pod", "Counting exact nematode species"], 0, M1_SLUG_3, 1),
        mc("m1-l3-q02", "m1-l3", "When is a lab soil test most worth the fee?", ["When home observations cannot explain a stubborn problem or you need mineral baselines", "After every watering", "Never — smell alone is always enough", "Only to decorate a social post"], 0, M1_SLUG_3, 1),
        mc("m1-l3-q03", "m1-l3", "A bed smells sour or like rotten eggs at field moisture. What does this lesson suggest?", ["Anaerobic pockets or putrefaction — investigate before you inoculate or dose", "Add more salt fertilizer to green it up", "Perfect aerobic biology — ignore it", "Time to rototill deeper immediately"], 0, M1_SLUG_3, 2),
        mc("m1-l3-q04", "m1-l3", "Most fertilizer mistakes in this lesson start as what?", ["Using too much compost tea", "Choosing the wrong pepper variety", "Waiting too long to harvest", "Observation failures — treating the plant symptom before reading the soil"], 3, M1_SLUG_3, 1),
        mc("m1-l3-q05", "m1-l3", "You observe a post-chemical, biology-flatlined bed. Which CookBook path matches the lesson's diagnosis table?", ["Revenge salt fertilizer dump to green it up fast", "Soil biology recovery program — phased carbon and gentle inoculum", "Skip observation and order DNA biology panel first", "Bare the soil through summer to 'sanitize' it"], 1, M1_SLUG_3, 2),
        mc("m1-l3-q06", "m1-l3", "Florida native sand vs a built compost-mulch bed should be read how?", ["As identical — one smell fits all", "Sand never needs observation", "Separately — they behave like different 'cuisine' even when both smell acceptable", "Built beds never need lab tests"], 2, M1_SLUG_3, 2),
        mc("m1-l3-q07", "m1-l3", "Crumb structure when you squeeze a handful at field moisture indicates what?", ["Only chemical fertilizer history", "Guaranteed 2,000,000 SHU genetics", "That a jar test is unnecessary forever", "Biology and organic matter doing soil architecture"], 3, M1_SLUG_3, 1),
        mc("m1-l3-q08", "m1-l3", "A bed smells sweet-earthy or forest-floor at field moisture. What does this lesson suggest?", ["Add more salt fertilizer immediately", "Usually aerobic and alive biology", "Time to rototill deeper", "Skip all observation — order a DNA panel first"], 1, M1_SLUG_3, 1),
        mc("m1-l3-q09", "m1-l3", "You want fungal-leaning litter and long carbon without a full tea brewer. Which tool fits?", ["Hot salt starter on bare sand", "Daily rototilling to aerate", "Leaf-mold understory path", "Expensive DNA panel before any field notes"], 2, M1_SLUG_3, 2),
        sa("m1-l3-q10", "m1-l3", "Name one simple at-home soil observation from this lesson (smell, structure, cover, jar, or life signs).", ["jar", "smell", "structure", "cover", "mulch", "crumb", "texture", "worm", "worms", "castings", "fungal", "hyphae", "observation"], 1, M1_SLUG_3, 1),
        sa("m1-l3-q11", "m1-l3", "In this lesson's chili-pot metaphor, what are you supposed to read before you dose?", ["soil", "bed", "pot", "observe", "observation", "baseline", "senses", "smell", "texture"], 1, M1_SLUG_3, 1),
        sa("m1-l3-q12", "m1-l3", "If a jar smells like a swamp and the surface is crusted bare, what should come first per the recovery guidance?", ["biology", "recovery", "structure", "carbon", "inoculum", "cover", "mulch", "organic"], 1, M1_SLUG_3, 2),
      ];
    };
  };

  func bankM1L4() : Bank {
    {
      lessonId = "m1-l4";
      moduleId = "module-01-soil-biology";
      badgeId = Types.BADGE_SOIL_BIOLOGY;
      quizVersion = 1;
      drawCount = 6;
      passCorrect = 5;
      title = "1.4 Feeding the Biology — Checkpoint";
      questions = [
        mc("m1-l4-q01", "m1-l4", "What does feeding the biology prioritize over bare beds?", ["Carbon and mulch strategies that pay the microbial workforce", "Leaving Florida sand uncovered all summer", "Daily salt fertilizer pulses only", "Removing all organic matter"], 0, M1_SLUG_4, 1),
        mc("m1-l4-q02", "m1-l4", "Sugar / molasses drenches should be used how?", ["As an unlimited daily flood on bare sand", "Instead of any water", "Restrained — a tip to existing biology, not a substitute for mulch and compost", "Only when beds have zero organic cover"], 2, M1_SLUG_4, 2),
        mc("m1-l4-q03", "m1-l4", "Bare beds in hot Zone 10a sun mainly do what to the microbial workforce?", ["Starve and stress them — you canceled payroll", "Pay them overtime", "Guarantee peak heat genetics", "Create permanent mycorrhizae"], 0, M1_SLUG_4, 1),
        mc("m1-l4-q04", "m1-l4", "Woody mulch on top vs raw wood chips mixed into the seedling root zone — which matches the lesson?", ["Mulch on top builds fungal housing; raw high-carbon material in the root zone can steal nitrogen from seedlings", "Mix raw chips into every planting hole for faster fungi", "Both are identical for peppers", "Wood chips should never touch pepper beds"], 0, M1_SLUG_4, 2),
        mc("m1-l4-q05", "m1-l4", "A grower's 'feeding program' is only bottles with no carbon on the surface. What does the lesson call that?", ["Elite regenerative practice", "Required for superhot genetics", "Better than any mulch", "Tipping ghosts — the workforce has no desk"], 3, M1_SLUG_4, 1),
        mc("m1-l4-q06", "m1-l4", "Which pairing does the lesson recommend for most growers starting payroll?", ["All five CookBook compost tools running tomorrow", "Molasses drench only — skip mulch", "One surface carbon habit (mulch) plus one bulk compost path that matches your labor", "Thermophilic windrow only — no surface cover"], 2, M1_SLUG_4, 2),
        mc("m1-l4-q07", "m1-l4", "Fresh manure / soft greens vs wood chips differ mainly in C:N tendency how?", ["Wood chips mineralize nitrogen fastest in the root zone", "Soft greens and manures tend lower C:N (faster mineralization); wood chips tend higher C:N (slower fungal build)", "C:N never affects pepper beds", "Only hydroponic salts matter for C:N"], 1, M1_SLUG_4, 2),
        mc("m1-l4-q08", "m1-l4", "You want a restrained sugar tip on a bed that already has organic cover. Which CookBook tool fits?", ["Unlimited molasses flood on naked sand", "Raw wood chips tilled into every seedling hole", "Skip carbon and use syrup instead of mulch", "Molasses–microbe field drench per CookBook — sparingly on existing biology"], 3, M1_SLUG_4, 2),
        mc("m1-l4-q09", "m1-l4", "Soil organic matter (SOM) in this lesson is framed as what?", ["Optional decoration for social posts", "The carbon bank that funds the workforce — build slow, destroy fast with tillage and bare soil", "Irrelevant in Florida sand", "Replaced entirely by bottled inputs in Module 2"], 1, M1_SLUG_4, 1),
        mc("m1-l4-q10", "m1-l4", "Bokashi pre-compost in the payroll toolkit is for what job?", ["Replacing all mulch in pepper rows", "Fermenting kitchen/farm scraps before they hit a pile wrong", "Sterilizing beds with heat", "Raising SHU overnight"], 1, M1_SLUG_4, 2),
        sa("m1-l4-q11", "m1-l4", "Name one carbon strategy that feeds soil life instead of leaving beds bare.", ["mulch", "compost", "carbon", "cover", "organic", "litter", "bokashi", "windrow", "biochar", "leaf"], 1, M1_SLUG_4, 1),
        sa("m1-l4-q12", "m1-l4", "In this lesson's metaphor, mulch and compost are payroll — what are bottled tonics like FPJ best described as?", ["tip", "bonus", "tool", "tools"], 1, M1_SLUG_4, 2),
      ];
    };
  };
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
