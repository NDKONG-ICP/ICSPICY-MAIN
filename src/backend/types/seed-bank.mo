import Common "common";
import Principal "mo:core/Principal";

module {
  public type SeedSource = {
    #OwnHarvest;
    #Vendor;
    #Trade;
    #Gift;
    #Cross;
  };

  public type SeedLot = {
    id : Nat;
    var varietyId : Nat;
    var source : SeedSource;
    var quantity : ?Nat;
    var acquiredDate : Common.Timestamp;
    var harvestDate : ?Common.Timestamp;
    var parentPlantId : ?Common.PlantId;
    var vendorId : ?Nat;
    var crossId : ?Nat;
    var generation : ?Text;
    var germinationRate : ?Nat;
    var notes : ?Text;
    var isActive : Bool;
    owner : Principal;
    createdAt : Common.Timestamp;
  };

  public type SeedLotPublic = {
    id : Nat;
    varietyId : Nat;
    source : SeedSource;
    quantity : ?Nat;
    acquiredDate : Common.Timestamp;
    harvestDate : ?Common.Timestamp;
    parentPlantId : ?Common.PlantId;
    vendorId : ?Nat;
    crossId : ?Nat;
    generation : ?Text;
    germinationRate : ?Nat;
    notes : ?Text;
    isActive : Bool;
    owner : Principal;
    createdAt : Common.Timestamp;
  };

  public type BreedingCross = {
    id : Nat;
    var name : Text;
    var motherVarietyId : Nat;
    var fatherVarietyId : Nat;
    var motherPlantId : ?Common.PlantId;
    var fatherPlantId : ?Common.PlantId;
    var crossDate : Common.Timestamp;
    var generation : Text;
    var seedLotId : ?Nat;
    var expectedTraits : ?Text;
    var observedTraits : ?Text;
    var notes : ?Text;
    var photos : [Text];
    owner : Principal;
    createdAt : Common.Timestamp;
  };

  public type BreedingCrossPublic = {
    id : Nat;
    name : Text;
    motherVarietyId : Nat;
    fatherVarietyId : Nat;
    motherPlantId : ?Common.PlantId;
    fatherPlantId : ?Common.PlantId;
    crossDate : Common.Timestamp;
    generation : Text;
    seedLotId : ?Nat;
    expectedTraits : ?Text;
    observedTraits : ?Text;
    notes : ?Text;
    photos : [Text];
    owner : Principal;
    createdAt : Common.Timestamp;
  };

  public type SeedVendor = {
    id : Nat;
    var name : Text;
    var website : ?Text;
    var notes : ?Text;
    owner : Principal;
    createdAt : Common.Timestamp;
  };

  public type SeedVendorPublic = {
    id : Nat;
    name : Text;
    website : ?Text;
    notes : ?Text;
    owner : Principal;
    createdAt : Common.Timestamp;
  };

  public type SeedBankStats = {
    totalLots : Nat;
    varietyCount : Nat;
    activeCrosses : Nat;
  };

  public type UpdateSeedLotInput = {
    id : Nat;
    quantity : ?Nat;
    harvestDate : ?Common.Timestamp;
    generation : ?Text;
    germinationRate : ?Nat;
    notes : ?Text;
    isActive : ?Bool;
    vendorId : ?Nat;
  };
};
