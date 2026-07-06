import Community "community";

module {
  /// One Top-8 friend slot, denormalized so the profile page renders in a
  /// single query round trip.
  public type Top8Entry = {
    principal_id : Principal;
    username : Text;
    avatar_key : ?Text;
  };

  /// Everything the /u/:principal page needs in one query.
  public type PublicProfileFull = {
    profile : Community.UserProfilePublic;
    banner_key : ?Text;
    wallpaper_key : ?Text;
    top8 : [Top8Entry];
    nft_count : Nat;
    is_pepperhead : Bool;
    is_raven : Bool;
    plants_growing : Nat;
  };
};
