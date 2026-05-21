import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/seed-bank";
import VarietyTypes "../types/variety";
import Common "../types/common";

module {
  public func seedLotToPublic(l : Types.SeedLot) : Types.SeedLotPublic {
    {
      id = l.id;
      varietyId = l.varietyId;
      source = l.source;
      quantity = l.quantity;
      acquiredDate = l.acquiredDate;
      harvestDate = l.harvestDate;
      parentPlantId = l.parentPlantId;
      vendorId = l.vendorId;
      crossId = l.crossId;
      generation = l.generation;
      germinationRate = l.germinationRate;
      notes = l.notes;
      isActive = l.isActive;
      owner = l.owner;
      createdAt = l.createdAt;
    };
  };

  public func crossToPublic(c : Types.BreedingCross) : Types.BreedingCrossPublic {
    {
      id = c.id;
      name = c.name;
      motherVarietyId = c.motherVarietyId;
      fatherVarietyId = c.fatherVarietyId;
      motherPlantId = c.motherPlantId;
      fatherPlantId = c.fatherPlantId;
      crossDate = c.crossDate;
      generation = c.generation;
      seedLotId = c.seedLotId;
      expectedTraits = c.expectedTraits;
      observedTraits = c.observedTraits;
      notes = c.notes;
      photos = c.photos;
      owner = c.owner;
      createdAt = c.createdAt;
    };
  };

  public func vendorToPublic(v : Types.SeedVendor) : Types.SeedVendorPublic {
    {
      id = v.id;
      name = v.name;
      website = v.website;
      notes = v.notes;
      owner = v.owner;
      createdAt = v.createdAt;
    };
  };

  public func addSeedLot(
    seedLots : Map.Map<Nat, Types.SeedLot>,
    nextId : Nat,
    owner : Principal,
    varietyId : Nat,
    source : Types.SeedSource,
    quantity : ?Nat,
    vendorId : ?Nat,
    notes : ?Text,
    harvestDate : ?Common.Timestamp,
    parentPlantId : ?Common.PlantId,
    generation : ?Text,
    crossId : ?Nat,
  ) : Nat {
    let lot : Types.SeedLot = {
      id = nextId;
      var varietyId = varietyId;
      var source = source;
      var quantity = quantity;
      var acquiredDate = Time.now();
      var harvestDate = harvestDate;
      var parentPlantId = parentPlantId;
      var vendorId = vendorId;
      var crossId = crossId;
      var generation = generation;
      var germinationRate = null;
      var notes = notes;
      var isActive = true;
      owner;
      createdAt = Time.now();
    };
    seedLots.add(nextId, lot);
    nextId;
  };

  public func updateSeedLot(
    seedLots : Map.Map<Nat, Types.SeedLot>,
    caller : Principal,
    input : Types.UpdateSeedLotInput,
  ) : Bool {
    switch (seedLots.get(input.id)) {
      case null false;
      case (?lot) {
        if (lot.owner != caller) {
          Runtime.trap("Unauthorized: seed lot owner only");
        };
        switch (input.quantity) { case (?q) { lot.quantity := ?q }; case null {} };
        switch (input.harvestDate) { case (?d) { lot.harvestDate := ?d }; case null {} };
        switch (input.generation) { case (?g) { lot.generation := ?g }; case null {} };
        switch (input.germinationRate) { case (?r) { lot.germinationRate := ?r }; case null {} };
        switch (input.notes) { case (?n) { lot.notes := ?n }; case null {} };
        switch (input.isActive) { case (?a) { lot.isActive := a }; case null {} };
        switch (input.vendorId) { case (?v) { lot.vendorId := ?v }; case null {} };
        true;
      };
    };
  };

  public func listLotsForOwner(
    seedLots : Map.Map<Nat, Types.SeedLot>,
    owner : Principal,
  ) : [Types.SeedLotPublic] {
    Iter.toArray(
      Iter.map(
        Iter.filter(
          seedLots.values(),
          func(l : Types.SeedLot) : Bool { l.owner == owner },
        ),
        seedLotToPublic,
      ),
    );
  };

  public func listLotsByVariety(
    seedLots : Map.Map<Nat, Types.SeedLot>,
    owner : Principal,
    varietyId : Nat,
  ) : [Types.SeedLotPublic] {
    Iter.toArray(
      Iter.map(
        Iter.filter(
          seedLots.values(),
          func(l : Types.SeedLot) : Bool {
            l.owner == owner and l.varietyId == varietyId;
          },
        ),
        seedLotToPublic,
      ),
    );
  };

  public func recordCross(
    crosses : Map.Map<Nat, Types.BreedingCross>,
    nextId : Nat,
    owner : Principal,
    name : Text,
    motherVarietyId : Nat,
    fatherVarietyId : Nat,
    motherPlantId : ?Common.PlantId,
    fatherPlantId : ?Common.PlantId,
    crossDate : Common.Timestamp,
    generation : Text,
    notes : ?Text,
    expectedTraits : ?Text,
  ) : Nat {
    let cross : Types.BreedingCross = {
      id = nextId;
      var name = name;
      var motherVarietyId = motherVarietyId;
      var fatherVarietyId = fatherVarietyId;
      var motherPlantId = motherPlantId;
      var fatherPlantId = fatherPlantId;
      var crossDate = crossDate;
      var generation = generation;
      var seedLotId = null;
      var expectedTraits = expectedTraits;
      var observedTraits = null;
      var notes = notes;
      var photos = [];
      owner;
      createdAt = Time.now();
    };
    crosses.add(nextId, cross);
    nextId;
  };

  public func listCrossesForOwner(
    crosses : Map.Map<Nat, Types.BreedingCross>,
    owner : Principal,
  ) : [Types.BreedingCrossPublic] {
    Iter.toArray(
      Iter.map(
        Iter.filter(
          crosses.values(),
          func(c : Types.BreedingCross) : Bool { c.owner == owner },
        ),
        crossToPublic,
      ),
    );
  };

  public func addVendor(
    vendors : Map.Map<Nat, Types.SeedVendor>,
    nextId : Nat,
    owner : Principal,
    name : Text,
    website : ?Text,
    notes : ?Text,
  ) : Nat {
    let vendor : Types.SeedVendor = {
      id = nextId;
      var name = name;
      var website = website;
      var notes = notes;
      owner;
      createdAt = Time.now();
    };
    vendors.add(nextId, vendor);
    nextId;
  };

  public func listVendorsForOwner(
    vendors : Map.Map<Nat, Types.SeedVendor>,
    owner : Principal,
  ) : [Types.SeedVendorPublic] {
    Iter.toArray(
      Iter.map(
        Iter.filter(
          vendors.values(),
          func(v : Types.SeedVendor) : Bool { v.owner == owner },
        ),
        vendorToPublic,
      ),
    );
  };

  public func linkCrossSeedLot(
    crosses : Map.Map<Nat, Types.BreedingCross>,
    crossId : Nat,
    seedLotId : Nat,
    owner : Principal,
  ) {
    switch (crosses.get(crossId)) {
      case null {};
      case (?cross) {
        if (cross.owner == owner) {
          cross.seedLotId := ?seedLotId;
        };
      };
    };
  };

  public func statsForOwner(
    seedLots : Map.Map<Nat, Types.SeedLot>,
    crosses : Map.Map<Nat, Types.BreedingCross>,
    owner : Principal,
  ) : Types.SeedBankStats {
    var totalLots : Nat = 0;
    var varietySet = Map.empty<Nat, Bool>();
    var activeCrosses : Nat = 0;

    for (lot in seedLots.values()) {
      if (lot.owner == owner) {
        totalLots += 1;
        ignore varietySet.add(lot.varietyId, true);
      };
    };

    for (cross in crosses.values()) {
      if (cross.owner == owner and cross.seedLotId == null) {
        activeCrosses += 1;
      };
    };

    {
      totalLots;
      varietyCount = varietySet.size();
      activeCrosses;
    };
  };

  public func varietyExists(
    varieties : Map.Map<Nat, VarietyTypes.Variety>,
    varietyId : Nat,
  ) : Bool {
    switch (varieties.get(varietyId)) {
      case null false;
      case (?_) true;
    };
  };
};
