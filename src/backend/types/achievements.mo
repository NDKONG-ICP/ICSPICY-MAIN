// types/achievements.mo — Soulbound achievement badge records (token IDs 200_000+).

import Principal "mo:core/Principal";

module {
  public type BadgeSource = {
    #masterclass;
    #game;
  };

  public type BadgeRecord = {
    badgeType : Text;
    tier : Text;
    earnedAt : Int;
    owner : Principal;
    metadataJson : Text;
    source : BadgeSource;
  };

  public type BadgePublic = {
    tokenId : Nat;
    badgeType : Text;
    tier : Text;
    earnedAt : Int;
    owner : Principal;
    metadataJson : Text;
    source : BadgeSource;
  };
};
