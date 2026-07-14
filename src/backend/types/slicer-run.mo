// types/slicer-run.mo — validated slicer run submission types.

module {
  public type SliceLogEntry = {
    objectIndex : Nat;
    sliceTimeMs : Nat;
  };

  public type BadgeEarned = {
    badgeType : Text;
    tokenId : Nat;
    isNew : Bool;
  };

  public type SubmitRunOk = {
    score : Nat;
    bestCombo : Nat;
    tier : Text;
    rareChilisSliced : Nat;
    isNewBest : Bool;
    bestScore : Nat;
    badgesEarned : [BadgeEarned];
  };
};
