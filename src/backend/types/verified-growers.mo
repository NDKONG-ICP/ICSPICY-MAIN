module {
  public type VerifiedGrowerStat = {
    statLabel : Text;
    value : Text;
  };

  public type VerifiedGrower = {
    id : Text;
    name : Text;
    owners : Text;
    tagline : Text;
    description : Text;
    story : Text;
    url : Text;
    categories : [Text];
    stats : [VerifiedGrowerStat];
    imageKey : Text;
    growerOfTheMonth : ?Text;
    establishedYear : ?Nat;
    sortOrder : Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  public type VerifiedGrowerUpsert = {
    id : Text;
    name : Text;
    owners : Text;
    tagline : Text;
    description : Text;
    story : Text;
    url : Text;
    categories : [Text];
    stats : [VerifiedGrowerStat];
    imageKey : Text;
    growerOfTheMonth : ?Text;
    establishedYear : ?Nat;
    sortOrder : Nat;
  };
};
