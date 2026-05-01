import Common "common";

module {
  // Rarity tier for RWA NFTs — determines holder discount percentage
  public type RarityTier = {
    #Common;    // 10% discount
    #Uncommon;  // 12% discount
    #Rare;      // 15% discount
  };

  // One-time claimable token linked to a specific plant NFT (printed on QR label)
  public type ClaimToken = {
    id : Common.ClaimTokenId;
    plant_id : Common.PlantId;
    created_at : Common.Timestamp;
    var redeemed_by : ?Principal;
    var redeemed_at : ?Common.Timestamp;
    rarity_tier : RarityTier;
    claim_data : Text; // JSON payload for the NFT claim (metadata snapshot)
  };

  // Immutable public view of a ClaimToken (safe to return over the wire)
  public type ClaimTokenPublic = {
    id : Common.ClaimTokenId;
    plant_id : Common.PlantId;
    created_at : Common.Timestamp;
    redeemed_by : ?Principal;
    redeemed_at : ?Common.Timestamp;
    rarity_tier : RarityTier;
    claim_data : Text;
  };

  // KNF application schedule entry — one row in a schedule card
  public type ScheduleEntry = {
    stage : Text;
    input_name : Text;
    dilution : Text;
    frequency : Text;
    timing : Text;
    notes : Text;
  };

  // A user-saved application schedule combining multiple KNF inputs by growth stage
  public type SavedSchedule = {
    id : Common.ScheduleId;
    owner : Principal;
    stage : Text;
    inputs : [Text]; // KNF input names (e.g. ["OHN", "FPJ"])
    created_at : Common.Timestamp;
    share_token : Text; // short opaque token for public share link
  };

  // Lifecycle upgrade event recorded each time a plant NFT is burned and re-minted
  public type LifecycleUpgradeEvent = {
    plant_id : Common.PlantId;
    old_nft_id : ?Text;
    new_nft_id : Text;
    old_stage : Text;
    new_stage : Text;
    upgraded_at : Common.Timestamp;
  };

  // Rarity tier helper — returns the integer discount percentage for a tier
  public func rarityDiscountPct(tier : RarityTier) : Nat {
    switch tier {
      case (#Common)   10;
      case (#Uncommon) 12;
      case (#Rare)     15;
    };
  };

  // Convert a Nat (10/12/15) to a RarityTier variant
  public func natToRarityTier(n : Nat) : RarityTier {
    if (n >= 15) #Rare
    else if (n >= 12) #Uncommon
    else #Common;
  };
};
