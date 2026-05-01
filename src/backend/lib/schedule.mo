import Common "../types/common";
import ClaimTypes "../types/claim";
import Map "mo:core/Map";
import Int "mo:core/Int";

module {

  // -----------------------------------------------------------------------
  // Hard-coded KNF schedule data table
  // Accurate dilutions:
  //   OHN  1:1000 | FPJ  1:500 | FPE  1:1000 | WCA  1:1000
  //   IMO2 direct or 1:10 | LAB 1:1000 | AEM  1:500 | FFA  1:500
  // Stages: germination, seedling, vegetative, flowering, fruiting, harvest_prep
  // -----------------------------------------------------------------------

  let scheduleTable : [(Text, Text, Text, Text, Text, Text)] = [
    // (stage, input, dilution, frequency, timing, notes)

    // --- GERMINATION ---
    ("germination", "OHN",  "1:1000", "Once per week",  "Seed soak before planting",        "Soak seeds 10 min in diluted OHN; boosts germination energy"),
    ("germination", "LAB",  "1:1000", "Once per week",  "Soil drench at planting",           "Apply to substrate to inoculate beneficial microbes"),
    ("germination", "IMO2", "1:10",   "At planting",    "Mix into top 2 cm of growing media","Use sparingly; activate soil microbiome from day one"),

    // --- SEEDLING ---
    ("seedling",    "OHN",  "1:1000", "Every 5–7 days", "Morning foliar or soil drench",     "Enhances early root and shoot development"),
    ("seedling",    "FPJ",  "1:500",  "Every 7 days",   "Morning foliar spray",              "Fermented plant juice provides growth hormones; use young plant material"),
    ("seedling",    "LAB",  "1:1000", "Every 7 days",   "Soil drench",                       "Lactic acid bacteria support root zone health"),
    ("seedling",    "IMO2", "1:10",   "Bi-weekly",      "Light soil surface broadcast",      "Builds living soil; apply away from direct stem contact"),
    ("seedling",    "WCA",  "1:1000", "As needed",      "Soil drench when signs of calcium deficiency", "Water-soluble calcium; promotes cell wall strength"),

    // --- VEGETATIVE ---
    ("vegetative",  "OHN",  "1:1000", "Every 5–7 days", "Foliar or soil drench AM",          "Keep immune system strong; rotate foliar and drench"),
    ("vegetative",  "FPJ",  "1:500",  "Every 7 days",   "Foliar spray, morning",             "High-nitrogen FPJ (comfrey, nettle) drives vegetative growth"),
    ("vegetative",  "FPE",  "1:1000", "Every 7 days",   "Soil drench",                       "Fermented plant extract supplies macro/micronutrients"),
    ("vegetative",  "LAB",  "1:1000", "Every 7 days",   "Soil drench",                       "Sustain microbial diversity through growth phase"),
    ("vegetative",  "IMO2", "1:10",   "Bi-weekly",      "Broadcast to root zone, water in",  "Top-dress for continuous mycorrhizal activity"),
    ("vegetative",  "AEM",  "1:500",  "Weekly",         "Soil drench or foliar",             "Activated EM supports beneficial microbial balance"),
    ("vegetative",  "WCA",  "1:1000", "Every 10 days",  "Soil drench or foliar",             "Calcium supports sturdy cell walls and lateral branching"),

    // --- FLOWERING ---
    ("flowering",   "OHN",  "1:1000", "Every 5–7 days", "Foliar early AM (pre-flower open)",  "Critical to prevent pest/disease during vulnerable stage"),
    ("flowering",   "FPJ",  "1:500",  "Every 7 days",   "Foliar AM (switch to fruiting FPJ)", "Use high-phosphorus source (banana pseudostem, fruit)"),
    ("flowering",   "FPE",  "1:1000", "Every 7 days",   "Soil drench",                        "Balanced nutrients support flower set"),
    ("flowering",   "WCA",  "1:1000", "Every 7 days",   "Foliar or drench",                   "Calcium essential for pollen viability and pod set"),
    ("flowering",   "FFA",  "1:500",  "Weekly",         "Soil drench",                        "Fish fertilizer provides P and K at flower stage"),
    ("flowering",   "AEM",  "1:500",  "Weekly",         "Soil drench",                        "EM supports hormone balance, reduces blossom drop"),

    // --- FRUITING ---
    ("fruiting",    "OHN",  "1:1000", "Every 7 days",   "Foliar or soil drench",              "Maintain plant vitality and pest resistance during fruit fill"),
    ("fruiting",    "FPJ",  "1:500",  "Every 7 days",   "Foliar AM",                          "Use high-sugar FPJ source (fruit scraps) to increase Brix"),
    ("fruiting",    "FPE",  "1:1000", "Every 7 days",   "Soil drench",                        "Sustain nutrient supply for fruit development"),
    ("fruiting",    "FFA",  "1:500",  "Every 7 days",   "Soil drench",                        "Fish fertilizer P/K supports fruit maturation"),
    ("fruiting",    "WCA",  "1:1000", "Every 10 days",  "Foliar or drench",                   "Prevents blossom-end rot; firms fruit walls"),
    ("fruiting",    "AEM",  "1:500",  "Weekly",         "Soil drench",                        "Microbial diversity supports nutrient uptake during heavy fruit load"),

    // --- HARVEST PREP ---
    ("harvest_prep","OHN",  "1:1000", "One final drench 7 days before harvest", "Soil drench", "Final pest and disease insurance; do not foliar within 3 days of harvest"),
    ("harvest_prep","FPJ",  "1:500",  "Last application 5 days before harvest", "Foliar AM",   "High-sugar source boosts Brix for maximum heat and flavor"),
    ("harvest_prep","WCA",  "1:1000", "7 days before harvest",                  "Soil drench", "Final calcium uptake firms skins and extends shelf life"),
    ("harvest_prep","FFA",  "1:500",  "10 days before harvest",                 "Soil drench", "Final P/K boost; cease at 7 days pre-harvest"),
  ];

  // Built-in KNF input schedule data (seed-to-harvest application guide)
  // Returns matching entries for the requested stage and input names
  public func getScheduleData(
    stage : Text,
    inputs : [Text],
  ) : [ClaimTypes.ScheduleEntry] {
    let stageLower = stage.toLower();
    let inputSet = inputs.map(func(i : Text) : Text { i.toUpper() });

    let results = scheduleTable.filter(
      func(row : (Text, Text, Text, Text, Text, Text)) : Bool {
        let (rowStage, rowInput, _, _, _, _) = row;
        rowStage == stageLower and inputSet.find(func(i : Text) : Bool { i == rowInput.toUpper() }) != null
      },
    );

    results.map<(Text, Text, Text, Text, Text, Text), ClaimTypes.ScheduleEntry>(func(row) {
      let (rowStage, rowInput, rowDilution, rowFreq, rowTiming, rowNotes) = row;
      {
        stage = rowStage;
        input_name = rowInput;
        dilution = rowDilution;
        frequency = rowFreq;
        timing = rowTiming;
        notes = rowNotes;
      }
    });
  };

  // Persist a saved schedule for a user; returns the new schedule id
  public func saveSchedule(
    savedSchedules : Map.Map<Common.ScheduleId, ClaimTypes.SavedSchedule>,
    shareIndex : Map.Map<Text, Common.ScheduleId>,
    owner : Principal,
    stage : Text,
    inputs : [Text],
    now : Common.Timestamp,
  ) : Common.ScheduleId {
    let count = savedSchedules.size();
    let schedule_id = "sched-" # owner.toText() # "-" # now.toText() # "-" # count.toText();
    // Build a short share token from schedule_id hash
    let share_token = "share-" # count.toText() # "-" # Int.rem(now, 99999).toText();

    let schedule : ClaimTypes.SavedSchedule = {
      id = schedule_id;
      owner = owner;
      stage = stage;
      inputs = inputs;
      created_at = now;
      share_token = share_token;
    };
    savedSchedules.add(schedule_id, schedule);
    shareIndex.add(share_token, schedule_id);
    schedule_id;
  };

  // List all saved schedules for a specific owner
  public func getMySchedules(
    savedSchedules : Map.Map<Common.ScheduleId, ClaimTypes.SavedSchedule>,
    owner : Principal,
  ) : [ClaimTypes.SavedSchedule] {
    savedSchedules.values()
      .filter(func(s : ClaimTypes.SavedSchedule) : Bool { s.owner == owner })
      .toArray();
  };

  // Fetch a saved schedule by its public share token
  public func getScheduleByShareToken(
    savedSchedules : Map.Map<Common.ScheduleId, ClaimTypes.SavedSchedule>,
    shareIndex : Map.Map<Text, Common.ScheduleId>,
    share_token : Text,
  ) : ?ClaimTypes.SavedSchedule {
    switch (shareIndex.get(share_token)) {
      case (?schedule_id) { savedSchedules.get(schedule_id) };
      case null { null };
    };
  };
};
