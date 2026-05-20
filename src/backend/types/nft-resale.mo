import Common "common";

module {
  public type NftListing = {
    tokenId : Nat;
    var seller : Principal;
    var priceUsdCents : Nat;
    var listedAt : Common.Timestamp;
    var isActive : Bool;
  };

  public type NftListingPublic = {
    tokenId : Nat;
    seller : Principal;
    priceUsdCents : Nat;
    listedAt : Common.Timestamp;
    isActive : Bool;
    plantId : ?Common.PlantId;
  };

  public type BuyListedNftResult = {
    success : Bool;
    message : Text;
  };
};
