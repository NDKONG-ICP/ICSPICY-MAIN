import Common "common";
import Principal "mo:core/Principal";

module {
  public type PlantPlacement = {
    id : Nat;
    varietyId : ?Nat;
    plantLabel : Text;
    x : Float;
    y : Float;
    rotation : Float;
    scale : Float;
    color : Text;
    icon : Text;
  };

  public type StructurePlacement = {
    id : Nat;
    structureType : Text;
    x : Float;
    y : Float;
    width : Float;
    depth : Float;
    rotation : Float;
    color : Text;
  };

  public type GardenDesign = {
    id : Nat;
    owner : Principal;
    name : Text;
    description : ?Text;
    plants : [PlantPlacement];
    structures : [StructurePlacement];
    widthMeters : Float;
    depthMeters : Float;
    gridSizeMeters : Float;
    isPublic : Bool;
    nftTokenId : ?Nat;
    createdAt : Common.Timestamp;
    updatedAt : Common.Timestamp;
  };

  public type GardenDesignInput = {
    name : Text;
    description : ?Text;
    plants : [PlantPlacement];
    structures : [StructurePlacement];
    widthMeters : Float;
    depthMeters : Float;
    gridSizeMeters : Float;
    isPublic : Bool;
  };

  public type CreateGardenDesignResult = {
    designId : Nat;
  };

  public type MintDesignNftResult = {
    nftTokenId : Nat;
  };

  public type ValidationSeverity = {
    #Info;
    #Warning;
    #Error;
  };

  public type ValidationWarning = {
    code : Text;
    message : Text;
    severity : ValidationSeverity;
    plantId : ?Nat;
    relatedPlantId : ?Nat;
  };

  public type YieldEstimate = {
    totalPlantCount : Nat;
    estimatedLbsMin : Float;
    estimatedLbsMax : Float;
    companionBonusPct : Float;
    spacingPenaltyPct : Float;
    notes : Text;
  };
};
