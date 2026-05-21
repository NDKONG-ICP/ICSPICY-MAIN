import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import SeedBankLib "../lib/seed-bank";
import Common "../types/common";
import PlantTypes "../types/plants";
import VarietyTypes "../types/variety";
import SeedBankTypes "../types/seed-bank";

mixin (
  accessControlState : AccessControl.AccessControlState,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  plantOwners : Map.Map<Common.PlantId, Principal>,
  plantVarietyIds : Map.Map<Common.PlantId, Nat>,
  varieties : Map.Map<Nat, VarietyTypes.Variety>,
  seedLots : Map.Map<Nat, SeedBankTypes.SeedLot>,
  breedingCrosses : Map.Map<Nat, SeedBankTypes.BreedingCross>,
  seedVendors : Map.Map<Nat, SeedBankTypes.SeedVendor>,
  nextSeedLotId : { var value : Nat },
  nextBreedingCrossId : { var value : Nat },
  nextSeedVendorId : { var value : Nat },
) {
  func seedBankIsAdmin(p : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, p);
  };

  func isPlantOwner(caller : Principal, plantId : Common.PlantId) : Bool {
    if (seedBankIsAdmin(caller)) return true;
    switch (plantOwners.get(plantId)) {
      case (?owner) owner == caller;
      case null {
        switch (plants.get(plantId)) {
          case (?p) p.created_by == caller;
          case null false;
        };
      };
    };
  };

  func requireVariety(varietyId : Nat) {
    if (not SeedBankLib.varietyExists(varieties, varietyId)) {
      Runtime.trap("Variety not found");
    };
  };

  public shared ({ caller }) func addSeedLot(
    varietyId : Nat,
    source : SeedBankTypes.SeedSource,
    quantity : ?Nat,
    vendorId : ?Nat,
    notes : ?Text,
  ) : async Nat {
    AccessControl.requireAuthenticated(caller);
    requireVariety(varietyId);
    let id = nextSeedLotId.value;
    ignore SeedBankLib.addSeedLot(
      seedLots,
      id,
      caller,
      varietyId,
      source,
      quantity,
      vendorId,
      notes,
      null,
      null,
      null,
      null,
    );
    nextSeedLotId.value += 1;
    id;
  };

  public shared ({ caller }) func updateSeedLot(
    id : Nat,
    quantity : ?Nat,
    harvestDate : ?Common.Timestamp,
    generation : ?Text,
    germinationRate : ?Nat,
    notes : ?Text,
    isActive : ?Bool,
    vendorId : ?Nat,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    SeedBankLib.updateSeedLot(
      seedLots,
      caller,
      {
        id;
        quantity;
        harvestDate;
        generation;
        germinationRate;
        notes;
        isActive;
        vendorId;
      },
    );
  };

  public query ({ caller }) func getMySeedBank() : async [SeedBankTypes.SeedLotPublic] {
    AccessControl.requireAuthenticated(caller);
    SeedBankLib.listLotsForOwner(seedLots, caller);
  };

  public query ({ caller }) func getSeedLotsByVariety(varietyId : Nat) : async [SeedBankTypes.SeedLotPublic] {
    AccessControl.requireAuthenticated(caller);
    SeedBankLib.listLotsByVariety(seedLots, caller, varietyId);
  };

  public shared ({ caller }) func recordCross(
    name : Text,
    motherVarietyId : Nat,
    fatherVarietyId : Nat,
    motherPlantId : ?Common.PlantId,
    fatherPlantId : ?Common.PlantId,
    crossDate : ?Common.Timestamp,
    notes : ?Text,
    expectedTraits : ?Text,
    generation : ?Text,
  ) : async Nat {
    AccessControl.requireAuthenticated(caller);
    requireVariety(motherVarietyId);
    requireVariety(fatherVarietyId);
    let id = nextBreedingCrossId.value;
    let date = switch crossDate { case (?d) d; case null Time.now() };
    let gen = switch generation { case (?g) g; case null "F1" };
    ignore SeedBankLib.recordCross(
      breedingCrosses,
      id,
      caller,
      name,
      motherVarietyId,
      fatherVarietyId,
      motherPlantId,
      fatherPlantId,
      date,
      gen,
      notes,
      expectedTraits,
    );
    nextBreedingCrossId.value += 1;
    id;
  };

  public query ({ caller }) func getMyCrosses() : async [SeedBankTypes.BreedingCrossPublic] {
    AccessControl.requireAuthenticated(caller);
    SeedBankLib.listCrossesForOwner(breedingCrosses, caller);
  };

  public shared ({ caller }) func addVendor(
    name : Text,
    website : ?Text,
    notes : ?Text,
  ) : async Nat {
    AccessControl.requireAuthenticated(caller);
    let id = nextSeedVendorId.value;
    ignore SeedBankLib.addVendor(seedVendors, id, caller, name, website, notes);
    nextSeedVendorId.value += 1;
    id;
  };

  public query ({ caller }) func getMyVendors() : async [SeedBankTypes.SeedVendorPublic] {
    AccessControl.requireAuthenticated(caller);
    SeedBankLib.listVendorsForOwner(seedVendors, caller);
  };

  public query ({ caller }) func getSeedBankStats() : async SeedBankTypes.SeedBankStats {
    AccessControl.requireAuthenticated(caller);
    SeedBankLib.statsForOwner(seedLots, breedingCrosses, caller);
  };

  public shared ({ caller }) func harvestSeeds(
    plantId : Common.PlantId,
    quantity : ?Nat,
    notes : ?Text,
  ) : async Nat {
    AccessControl.requireAuthenticated(caller);
    if (not isPlantOwner(caller, plantId)) {
      Runtime.trap("Unauthorized: plant owner or admin only");
    };
    let varietyId = switch (plantVarietyIds.get(plantId)) {
      case (?vid) vid;
      case null Runtime.trap("Plant has no variety linked");
    };
    let id = nextSeedLotId.value;
    ignore SeedBankLib.addSeedLot(
      seedLots,
      id,
      caller,
      varietyId,
      #OwnHarvest,
      quantity,
      null,
      notes,
      ?Time.now(),
      ?plantId,
      null,
      null,
    );
    nextSeedLotId.value += 1;
    id;
  };
};
