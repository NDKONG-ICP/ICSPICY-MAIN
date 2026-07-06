import Principal "mo:core/Principal";

module {
  public type CoopSeat = {
    activatedAt : Int;
    growerName : ?Text;
    growerLocation : ?Text;
    licenseInfo : ?Text;
    revoked : Bool;
  };

  public type CoopSeatPublic = {
    activatedAt : Int;
    growerName : ?Text;
    growerLocation : ?Text;
    licenseInfo : ?Text;
    revoked : Bool;
  };

  public type CoopStatus = {
    tokenId : Nat;
    seat : CoopSeatPublic;
  };

  public type GrowerProvenanceMeta = {
    grower : Principal;
    growerName : Text;
    plantId : Nat;
    variety : Text;
    mintedAt : Int;
  };

  public type GrowerDirectoryEntry = {
    tokenId : Nat;
    growerName : Text;
    growerLocation : ?Text;
    memberSince : Int;
    plantCount : Nat;
    provenanceMinted : Nat;
    profilePrincipal : Principal;
  };

  public type PurchaseCoopSeatResult = {
    success : Bool;
    tokenId : ?Nat;
    message : Text;
  };

  public type MintGrowerProvenanceResult = {
    success : Bool;
    tokenId : ?Nat;
    message : Text;
  };
};
