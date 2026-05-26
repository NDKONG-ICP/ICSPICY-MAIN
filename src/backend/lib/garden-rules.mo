import Array "mo:core/Array";
import Float "mo:core/Float";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import VarietyTypes "../types/variety";
import Types "../types/garden";

module {
  let CM_PER_M : Float = 100.0;

  func minSpacingMeters(scovilleMax : Nat) : Float {
    if (scovilleMax >= 500000) {
      0.55;
    } else if (scovilleMax >= 100000) {
      0.45;
    } else if (scovilleMax >= 10000) {
      0.38;
    } else {
      0.32;
    };
  };

  func scovilleForPlant(
    plant : Types.PlantPlacement,
    varieties : Map.Map<Nat, VarietyTypes.Variety>,
  ) : Nat {
    switch (plant.varietyId) {
      case null 100000;
      case (?vid) {
        switch (varieties.get(vid)) {
          case null 100000;
          case (?v) v.scovilleMax;
        };
      };
    };
  };

  func speciesForPlant(
    plant : Types.PlantPlacement,
    varieties : Map.Map<Nat, VarietyTypes.Variety>,
  ) : Text {
    switch (plant.varietyId) {
      case null plant.plantLabel;
      case (?vid) {
        switch (varieties.get(vid)) {
          case null plant.plantLabel;
          case (?v) v.species # " " # v.name;
        };
      };
    };
  };

  func lowerContains(haystack : Text, needle : Text) : Bool {
    Text.contains(haystack.toLower(), #text(needle.toLower()));
  };

  func isPepper(speciesText : Text) : Bool {
    lowerContains(speciesText, "capsicum") or lowerContains(speciesText, "pepper");
  };

  func isBasil(speciesText : Text) : Bool {
    lowerContains(speciesText, "basil") or lowerContains(speciesText, "ocimum");
  };

  func isFennel(speciesText : Text) : Bool {
    lowerContains(speciesText, "fennel") or lowerContains(speciesText, "foeniculum");
  };

  func isMarigold(speciesText : Text) : Bool {
    lowerContains(speciesText, "marigold") or lowerContains(speciesText, "tagetes");
  };

  func distance(a : Types.PlantPlacement, b : Types.PlantPlacement) : Float {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    Float.sqrt(dx * dx + dy * dy);
  };

  func requiredSpacing(a : Types.PlantPlacement, b : Types.PlantPlacement, varieties : Map.Map<Nat, VarietyTypes.Variety>) : Float {
    let sa = minSpacingMeters(scovilleForPlant(a, varieties));
    let sb = minSpacingMeters(scovilleForPlant(b, varieties));
    if (sa > sb) sa else sb;
  };

  func lbsPerPlant(scovilleMax : Nat) : (Float, Float) {
    if (scovilleMax >= 500000) {
      (0.15, 0.35);
    } else if (scovilleMax >= 100000) {
      (0.25, 0.55);
    } else if (scovilleMax >= 10000) {
      (0.35, 0.75);
    } else {
      (0.45, 1.0);
    };
  };

  public func validateInput(
    input : Types.GardenDesignInput,
    varieties : Map.Map<Nat, VarietyTypes.Variety>,
  ) : [Types.ValidationWarning] {
    var warnings : [Types.ValidationWarning] = [];
    let plants = input.plants;

    for (p in plants.vals()) {
      if (p.x < 0.0 or p.y < 0.0 or p.x > input.widthMeters or p.y > input.depthMeters) {
        warnings := Array.concat(warnings, [{
          code = "out_of_bounds";
          message = "Plant \"" # p.plantLabel # "\" is outside the plot boundary";
          severity = #Error;
          plantId = ?p.id;
          relatedPlantId = null;
        }]);
      };
    };

    var i : Nat = 0;
    while (i < plants.size()) {
      var j : Nat = i + 1;
      while (j < plants.size()) {
        let a = plants[i];
        let b = plants[j];
        let dist = distance(a, b);
        let req = requiredSpacing(a, b, varieties);
        if (dist < req and dist >= 0.0) {
          let cm = Float.toText(req * CM_PER_M);
          warnings := Array.concat(warnings, [{
            code = "spacing";
            message = "Plants too close (" # Float.toText(dist * CM_PER_M) # " cm) — need at least " # cm # " cm between \"" # a.plantLabel # "\" and \"" # b.plantLabel # "\"";
            severity = #Warning;
            plantId = ?a.id;
            relatedPlantId = ?b.id;
          }]);
        };

        let sa = speciesForPlant(a, varieties);
        let sb = speciesForPlant(b, varieties);
        if (isPepper(sa) and isFennel(sb) or isPepper(sb) and isFennel(sa)) {
          if (dist < 1.2) {
            warnings := Array.concat(warnings, [{
              code = "companion_bad";
              message = "Fennel inhibits peppers — keep fennel away from \"" # (if (isPepper(sa)) { a.plantLabel } else { b.plantLabel }) # "\"";
              severity = #Error;
              plantId = ?a.id;
              relatedPlantId = ?b.id;
            }]);
          };
        };
        if (isPepper(sa) and isBasil(sb) or isPepper(sb) and isBasil(sa)) {
          if (dist <= 0.9) {
            warnings := Array.concat(warnings, [{
              code = "companion_good";
              message = "Great companions! Basil near peppers can deter pests and boost flavor.";
              severity = #Info;
              plantId = ?a.id;
              relatedPlantId = ?b.id;
            }]);
          };
        };
        if (isPepper(sa) and isMarigold(sb) or isPepper(sb) and isMarigold(sa)) {
          if (dist <= 1.0) {
            warnings := Array.concat(warnings, [{
              code = "companion_good";
              message = "Marigolds near peppers help repel nematodes and aphids.";
              severity = #Info;
              plantId = ?a.id;
              relatedPlantId = ?b.id;
            }]);
          };
        };

        j += 1;
      };
      i += 1;
    };

    warnings;
  };

  public func calculateYield(
    input : Types.GardenDesignInput,
    varieties : Map.Map<Nat, VarietyTypes.Variety>,
  ) : Types.YieldEstimate {
    let plants = input.plants;
    if (plants.size() == 0) {
      return {
        totalPlantCount = 0;
        estimatedLbsMin = 0.0;
        estimatedLbsMax = 0.0;
        companionBonusPct = 0.0;
        spacingPenaltyPct = 0.0;
        notes = "Add plants to estimate yield.";
      };
    };

    var minLbs : Float = 0.0;
    var maxLbs : Float = 0.0;
    var spacingViolations : Nat = 0;
    var companionPairs : Nat = 0;
    var pairChecks : Nat = 0;

    for (p in plants.vals()) {
      let scov = scovilleForPlant(p, varieties);
      let (lo, hi) = lbsPerPlant(scov);
      minLbs += lo * p.scale;
      maxLbs += hi * p.scale;
    };

    var i : Nat = 0;
    while (i < plants.size()) {
      var j : Nat = i + 1;
      while (j < plants.size()) {
        pairChecks += 1;
        let a = plants[i];
        let b = plants[j];
        let dist = distance(a, b);
        let req = requiredSpacing(a, b, varieties);
        if (dist < req) { spacingViolations += 1 };
        let sa = speciesForPlant(a, varieties);
        let sb = speciesForPlant(b, varieties);
        if (
          (isPepper(sa) and isBasil(sb) or isPepper(sb) and isBasil(sa) or isPepper(sa) and isMarigold(sb) or isPepper(sb) and isMarigold(sa))
          and dist <= 1.0
        ) {
          companionPairs += 1;
        };
        j += 1;
      };
      i += 1;
    };

    let spacingPenaltyPct = if (pairChecks == 0) {
      0.0;
    } else {
      (Float.fromInt(spacingViolations) / Float.fromInt(pairChecks)) * 100.0;
    };
    let companionBonusPct = if (plants.size() <= 1) {
      0.0;
    } else {
      let raw = Float.fromInt(companionPairs) * 3.0;
      if (raw > 15.0) { 15.0 } else { raw };
    };

    let penaltyFactor = 1.0 - spacingPenaltyPct / 200.0;
    let bonusFactor = 1.0 + companionBonusPct / 100.0;
    let adjMin = minLbs * penaltyFactor * bonusFactor;
    let adjMax = maxLbs * penaltyFactor * bonusFactor;

    let notes = if (spacingViolations > 0) {
      "Tight spacing may reduce yield — consider thinning.";
    } else if (companionPairs > 0) {
      "Companion planting bonus applied.";
    } else {
      "Estimate assumes mature plants with good care.";
    };

    {
      totalPlantCount = plants.size();
      estimatedLbsMin = adjMin;
      estimatedLbsMax = adjMax;
      companionBonusPct;
      spacingPenaltyPct;
      notes;
    };
  };
};
