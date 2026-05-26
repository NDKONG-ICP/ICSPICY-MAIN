import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Types "../types/garden";

module {
  let MAX_PLANTS : Nat = 500;
  let MAX_STRUCTURES : Nat = 100;
  let MAX_NAME_LEN : Nat = 120;
  let MIN_PLOT : Float = 2.0;
  let MAX_PLOT : Float = 100.0;

  public func validateInput(input : Types.GardenDesignInput) : () {
    if (Text.size(input.name) == 0 or Text.size(input.name) > MAX_NAME_LEN) {
      Runtime.trap("Design name must be 1–120 characters");
    };
    if (input.plants.size() > MAX_PLANTS) {
      Runtime.trap("Too many plants (max 500)");
    };
    if (input.structures.size() > MAX_STRUCTURES) {
      Runtime.trap("Too many structures (max 100)");
    };
    if (input.widthMeters < MIN_PLOT or input.widthMeters > MAX_PLOT) {
      Runtime.trap("Plot width must be between 2m and 100m");
    };
    if (input.depthMeters < MIN_PLOT or input.depthMeters > MAX_PLOT) {
      Runtime.trap("Plot depth must be between 2m and 100m");
    };
    if (input.gridSizeMeters <= 0.0 or input.gridSizeMeters > 5.0) {
      Runtime.trap("Grid size must be between 0 and 5 meters");
    };
  };

  public func create(
    designs : Map.Map<Nat, Types.GardenDesign>,
    nextId : { var value : Nat },
    owner : Principal,
    input : Types.GardenDesignInput,
    now : Int,
  ) : Types.CreateGardenDesignResult {
    validateInput(input);
    let id = nextId.value;
    nextId.value += 1;
    designs.add(id, {
      id;
      owner;
      name = input.name;
      description = input.description;
      plants = input.plants;
      structures = input.structures;
      widthMeters = input.widthMeters;
      depthMeters = input.depthMeters;
      gridSizeMeters = input.gridSizeMeters;
      isPublic = input.isPublic;
      nftTokenId = null;
      createdAt = now;
      updatedAt = now;
    });
    { designId = id };
  };

  public func update(
    designs : Map.Map<Nat, Types.GardenDesign>,
    owner : Principal,
    designId : Nat,
    input : Types.GardenDesignInput,
    now : Int,
  ) : Bool {
    validateInput(input);
    switch (designs.get(designId)) {
      case null false;
      case (?existing) {
        if (existing.owner != owner) {
          Runtime.trap("Unauthorized: not design owner");
        };
        ignore designs.delete(designId);
        designs.add(
          designId,
          {
            id = designId;
            owner = existing.owner;
            name = input.name;
            description = input.description;
            plants = input.plants;
            structures = input.structures;
            widthMeters = input.widthMeters;
            depthMeters = input.depthMeters;
            gridSizeMeters = input.gridSizeMeters;
            isPublic = input.isPublic;
            nftTokenId = existing.nftTokenId;
            createdAt = existing.createdAt;
            updatedAt = now;
          },
        );
        true;
      };
    };
  };

  public func deleteDesign(
    designs : Map.Map<Nat, Types.GardenDesign>,
    owner : Principal,
    designId : Nat,
  ) : Bool {
    switch (designs.get(designId)) {
      case null false;
      case (?existing) {
        if (existing.owner != owner) {
          Runtime.trap("Unauthorized: not design owner");
        };
        ignore designs.delete(designId);
        true;
      };
    };
  };

  public func get(
    designs : Map.Map<Nat, Types.GardenDesign>,
    designId : Nat,
  ) : ?Types.GardenDesign {
    designs.get(designId);
  };

  public func listForOwner(
    designs : Map.Map<Nat, Types.GardenDesign>,
    owner : Principal,
  ) : [Types.GardenDesign] {
    var out : [Types.GardenDesign] = [];
    for ((_, d) in designs.entries()) {
      if (d.owner == owner) {
        out := Array.concat(out, [d]);
      };
    };
    out;
  };

  public func listPublic(
    designs : Map.Map<Nat, Types.GardenDesign>,
    offset : Nat,
    limit : Nat,
  ) : [Types.GardenDesign] {
    var pubList : [Types.GardenDesign] = [];
    for ((_, d) in designs.entries()) {
      if (d.isPublic) {
        pubList := Array.concat(pubList, [d]);
      };
    };
    let cap = if (limit == 0) { 50 } else { limit };
    var i : Nat = 0;
    var skipped : Nat = 0;
    var out : [Types.GardenDesign] = [];
    while (i < pubList.size()) {
      if (skipped >= offset) {
        if (out.size() >= cap) {
          return out;
        };
        out := Array.concat(out, [pubList[i]]);
      } else {
        skipped += 1;
      };
      i += 1;
    };
    out;
  };
};
