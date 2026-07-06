module {
  public type AdminUserRow = {
    principal_id : Principal;
    username : Text;
    avatar_key : ?Text;
    location : ?Text;
    created_at : Int;
    follower_count : Nat;
    nft_count : Nat;
    /// "free" | "member" | "pro" — derived from the RAVEN balance cache.
    raven_tier : Text;
    /// Latest post timestamp; null when the user has never posted.
    last_active : ?Int;
  };

  public type AdminUserPage = {
    rows : [AdminUserRow];
    total : Nat;
  };
};
