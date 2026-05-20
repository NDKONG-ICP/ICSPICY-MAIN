import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Types "../types/variety";
import Common "../types/common";

module {
  public func addVariety(
    varieties : Map.Map<Nat, Types.Variety>,
    nextId : Nat,
    input : Types.AddVarietyInput,
  ) : Types.Variety {
    let variety : Types.Variety = {
      id = nextId;
      var name = input.name;
      var species = input.species;
      var scovilleMin = input.scovilleMin;
      var scovilleMax = input.scovilleMax;
      var description = input.description;
      var imageUrl = input.imageUrl;
      var daysToGermination = input.daysToGermination;
      var daysToMaturity = input.daysToMaturity;
      createdAt = Time.now();
    };
    varieties.add(nextId, variety);
    variety;
  };

  public func updateVariety(
    varieties : Map.Map<Nat, Types.Variety>,
    input : Types.UpdateVarietyInput,
  ) : Bool {
    switch (varieties.get(input.id)) {
      case (?v) {
        switch (input.name) { case (?n) { v.name := n }; case null {} };
        switch (input.species) { case (?s) { v.species := s }; case null {} };
        switch (input.scovilleMin) { case (?n) { v.scovilleMin := n }; case null {} };
        switch (input.scovilleMax) { case (?n) { v.scovilleMax := n }; case null {} };
        switch (input.description) { case (?d) { v.description := d }; case null {} };
        switch (input.imageUrl) { case (?u) { v.imageUrl := ?u }; case null {} };
        switch (input.daysToGermination) { case (?d) { v.daysToGermination := ?d }; case null {} };
        switch (input.daysToMaturity) { case (?d) { v.daysToMaturity := ?d }; case null {} };
        true;
      };
      case null false;
    };
  };

  public func removeVariety(
    varieties : Map.Map<Nat, Types.Variety>,
    plantVarietyIds : Map.Map<Common.PlantId, Nat>,
    id : Nat,
  ) : Bool {
    switch (varieties.get(id)) {
      case null false;
      case (?_) {
        let referenced = Iter.any(
          plantVarietyIds.values(),
          func(vid : Nat) : Bool { vid == id },
        );
        if (referenced) {
          Runtime.trap("Cannot remove variety: plants still reference it");
        };
        ignore varieties.delete(id);
        true;
      };
    };
  };

  public func toPublic(v : Types.Variety) : Types.VarietyPublic {
    {
      id = v.id;
      name = v.name;
      species = v.species;
      scovilleMin = v.scovilleMin;
      scovilleMax = v.scovilleMax;
      description = v.description;
      imageUrl = v.imageUrl;
      daysToGermination = v.daysToGermination;
      daysToMaturity = v.daysToMaturity;
      createdAt = v.createdAt;
    };
  };

  public func getVariety(
    varieties : Map.Map<Nat, Types.Variety>,
    id : Nat,
  ) : ?Types.VarietyPublic {
    switch (varieties.get(id)) {
      case (?v) ?toPublic(v);
      case null null;
    };
  };

  public func listVarieties(
    varieties : Map.Map<Nat, Types.Variety>,
  ) : [Types.VarietyPublic] {
    Iter.toArray(Iter.map(varieties.values(), toPublic));
  };

  public func searchVarieties(
    varieties : Map.Map<Nat, Types.Variety>,
    searchQuery : Text,
  ) : [Types.VarietyPublic] {
    if (Text.size(searchQuery) == 0) return listVarieties(varieties);
    Iter.toArray(
      Iter.map(
        Iter.filter(
          varieties.values(),
          func(v : Types.Variety) : Bool {
            Text.contains(v.name, #text searchQuery);
          },
        ),
        toPublic,
      ),
    );
  };
};
