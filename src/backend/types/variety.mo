import Common "common";

module {
  public type Variety = {
    id : Nat;
    var name : Text;
    var species : Text;
    var scovilleMin : Nat;
    var scovilleMax : Nat;
    var description : Text;
    var imageUrl : ?Text;
    var daysToGermination : ?Nat;
    var daysToMaturity : ?Nat;
    createdAt : Common.Timestamp;
  };

  public type VarietyPublic = {
    id : Nat;
    name : Text;
    species : Text;
    scovilleMin : Nat;
    scovilleMax : Nat;
    description : Text;
    imageUrl : ?Text;
    daysToGermination : ?Nat;
    daysToMaturity : ?Nat;
    createdAt : Common.Timestamp;
  };

  public type AddVarietyInput = {
    name : Text;
    species : Text;
    scovilleMin : Nat;
    scovilleMax : Nat;
    description : Text;
    imageUrl : ?Text;
    daysToGermination : ?Nat;
    daysToMaturity : ?Nat;
  };

  public type UpdateVarietyInput = {
    id : Nat;
    name : ?Text;
    species : ?Text;
    scovilleMin : ?Nat;
    scovilleMax : ?Nat;
    description : ?Text;
    imageUrl : ?Text;
    daysToGermination : ?Nat;
    daysToMaturity : ?Nat;
  };
};
